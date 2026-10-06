"""Sensor telemetry ingestion layer.

Responsibilities
----------------
1. Accept raw SensorReading objects from the ESP32 telemetry endpoint.
2. Validate that the reading is fresh (captured_at is within the configured
   freshness window).
3. Optionally authenticate the source device via a shared secret header.

All persistence (writing to a time-series store, message queue, etc.) is
deferred and represented by the TelemetryStore protocol below.  The ingestion
layer does NOT make irrigation decisions.

Design note
-----------
IngestionResult is returned to the route handler rather than raising HTTP
exceptions inside this module.  This keeps business logic testable without
an ASGI test client.
"""

from __future__ import annotations

import logging
import os
import sqlite3
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from enum import Enum, auto
from typing import Protocol, runtime_checkable

from ..config import Settings
from ..models.schemas import SensorReading

logger = logging.getLogger(__name__)


# --------------------------------------------------------------------------- #
# Ingestion result                                                             #
# --------------------------------------------------------------------------- #

class IngestionStatus(Enum):
    ACCEPTED = auto()
    STALE_READING = auto()
    AUTHENTICATION_FAILED = auto()


@dataclass(frozen=True)
class IngestionResult:
    """Outcome of a single telemetry ingestion attempt."""

    status: IngestionStatus
    reading: SensorReading | None = None
    detail: str = ""

    @property
    def accepted(self) -> bool:
        return self.status is IngestionStatus.ACCEPTED


# --------------------------------------------------------------------------- #
# Telemetry store protocol (persistence, deferred)                             #
# --------------------------------------------------------------------------- #

@runtime_checkable
class TelemetryStore(Protocol):
    """
    Adapter contract for persisting sensor readings.

    The concrete implementation (time-series DB, in-memory buffer, message
    queue …) is intentionally not chosen yet.  The IngestionService depends
    only on this protocol, so any conforming class can be injected.
    """

    async def save(self, reading: SensorReading) -> None:
        """Persist a validated SensorReading."""
        ...

    async def latest(self) -> SensorReading | None:
        """Return the most recently persisted reading, or None."""
        ...

    async def history(self, limit: int = 24) -> list[SensorReading]:
        """Return the last *limit* readings, newest first."""
        ...


# --------------------------------------------------------------------------- #
# --------------------------------------------------------------------------- #
# SQLite telemetry store (Persistent)                                         #
# --------------------------------------------------------------------------- #

class SqliteTelemetryStore:
    """
    Persistent SQLite store for sensor readings.
    File path is resolved from settings.database_url / sqlite_db_path.
    """

    def __init__(self, db_path: str = "hydrowise.db") -> None:
        self._db_path = db_path
        self._ensure_dir()
        self.init_db()

    def _ensure_dir(self) -> None:
        dir_name = os.path.dirname(self._db_path)
        if dir_name:
            os.makedirs(dir_name, exist_ok=True)

    def _get_connection(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self._db_path, check_same_thread=False)
        conn.row_factory = sqlite3.Row
        return conn

    def init_db(self) -> None:
        """Create sensor_readings table and indexes if they do not exist."""
        with self._get_connection() as conn:
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS sensor_readings (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    device_id TEXT NOT NULL,
                    temperature_C REAL NOT NULL,
                    humidity_pct REAL NOT NULL,
                    soil_moisture_pct REAL NOT NULL,
                    captured_at TEXT NOT NULL,
                    received_at TEXT NOT NULL
                );
                """
            )
            conn.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_sensor_readings_captured_at
                ON sensor_readings(captured_at DESC);
                """
            )
            conn.commit()

    async def save(self, reading: SensorReading) -> None:
        cap_str = (
            reading.captured_at.isoformat()
            if reading.captured_at
            else datetime.now(timezone.utc).isoformat()
        )
        rec_str = (
            reading.received_at.isoformat()
            if reading.received_at
            else datetime.now(timezone.utc).isoformat()
        )
        with self._get_connection() as conn:
            conn.execute(
                """
                INSERT INTO sensor_readings (
                    device_id, temperature_C, humidity_pct, soil_moisture_pct, captured_at, received_at
                ) VALUES (?, ?, ?, ?, ?, ?);
                """,
                (
                    reading.device_id,
                    reading.temperature_C,
                    reading.humidity_percent,
                    reading.soil_moisture_percent,
                    cap_str,
                    rec_str,
                ),
            )
            conn.commit()
        logger.debug("SqliteTelemetryStore: persisted reading from %s", reading.device_id)

    async def latest(self) -> SensorReading | None:
        with self._get_connection() as conn:
            cursor = conn.execute(
                """
                SELECT id, device_id, temperature_C, humidity_pct, soil_moisture_pct, captured_at, received_at
                FROM sensor_readings
                ORDER BY id DESC
                LIMIT 1;
                """
            )
            row = cursor.fetchone()
            if row is None:
                return None
            return self._row_to_model(row)

    async def history(self, limit: int = 24) -> list[SensorReading]:
        with self._get_connection() as conn:
            cutoff = (datetime.now(timezone.utc) - timedelta(hours=24)).isoformat()
            cursor = conn.execute(
                """
                SELECT id, device_id, temperature_C, humidity_pct, soil_moisture_pct, captured_at, received_at
                FROM sensor_readings
                WHERE captured_at >= ?
                ORDER BY captured_at DESC
                LIMIT ?;
                """,
                (cutoff, limit),
            )
            rows = cursor.fetchall()
            if not rows:
                cursor = conn.execute(
                    """
                    SELECT id, device_id, temperature_C, humidity_pct, soil_moisture_pct, captured_at, received_at
                    FROM sensor_readings
                    ORDER BY id DESC
                    LIMIT ?;
                    """,
                    (limit,),
                )
                rows = cursor.fetchall()
            return [self._row_to_model(r) for r in rows]

    @staticmethod
    def _row_to_model(row: sqlite3.Row) -> SensorReading:
        rec_val = row["received_at"]
        return SensorReading(
            device_id=row["device_id"],
            temperature_C=row["temperature_C"],
            humidity_percent=row["humidity_pct"],
            soil_moisture_percent=row["soil_moisture_pct"],
            captured_at=datetime.fromisoformat(row["captured_at"]),
            received_at=datetime.fromisoformat(rec_val) if rec_val else None,
        )


# Backward-compatible alias
InMemoryTelemetryStore = SqliteTelemetryStore


# --------------------------------------------------------------------------- #
# Ingestion service                                                             #
# --------------------------------------------------------------------------- #

class IngestionService:
    """
    Validates and stores incoming ESP32 telemetry readings.

    Validation order:
    1. Device authentication (skipped when DEVICE_INGESTION_SECRET is empty).
    2. Freshness check (reading age must be ≤ sensor_freshness_seconds).
    3. Delegate persistence to the TelemetryStore.
    """

    def __init__(self, settings: Settings, store: TelemetryStore) -> None:
        self._settings = settings
        self._store = store

    def _authenticate(self, provided_secret: str | None) -> bool:
        """Return True when the device API key is valid or auth is disabled."""
        expected = self._settings.effective_device_api_key
        if not expected:
            logger.debug(
                "Device authentication is disabled. Set DEVICE_API_KEY to enable it."
            )
            return True
        return provided_secret is not None and provided_secret == expected

    def _is_fresh(self, reading: SensorReading) -> bool:
        """Return True when the reading is within the freshness window."""
        age_seconds = (
            datetime.now(timezone.utc) - reading.captured_at
        ).total_seconds()
        return age_seconds <= self._settings.sensor_freshness_seconds

    async def ingest(
        self,
        reading: SensorReading,
        device_secret: str | None = None,
    ) -> IngestionResult:
        """Validate and persist a telemetry reading."""

        if not self._authenticate(device_secret):
            logger.warning(
                "Rejected telemetry from %s: authentication failed",
                reading.device_id,
            )
            return IngestionResult(
                status=IngestionStatus.AUTHENTICATION_FAILED,
                detail="Invalid or missing device API key.",
            )

        if not self._is_fresh(reading):
            age = (datetime.now(timezone.utc) - reading.captured_at).total_seconds()
            logger.warning(
                "Rejected telemetry from %s: reading is %.0f s old "
                "(limit %d s)",
                reading.device_id,
                age,
                self._settings.sensor_freshness_seconds,
            )
            return IngestionResult(
                status=IngestionStatus.STALE_READING,
                detail=(
                    f"Reading is {age:.0f} s old; "
                    f"freshness limit is {self._settings.sensor_freshness_seconds} s."
                ),
            )

        # Server stamps received_at
        stamped_reading = reading.model_copy(update={"received_at": datetime.now(timezone.utc)})

        await self._store.save(stamped_reading)
        return IngestionResult(status=IngestionStatus.ACCEPTED, reading=stamped_reading)


# --------------------------------------------------------------------------- #
# Telemetry store singleton / dependency factory                              #
# --------------------------------------------------------------------------- #

_store_cache: dict[str, SqliteTelemetryStore] = {}


def get_telemetry_store(settings: Settings | None = None) -> TelemetryStore:
    """Return the process-scoped persistent SQLite telemetry store."""
    if settings is None:
        from ..config import get_settings
        settings = get_settings()
    db_path = settings.sqlite_db_path
    if db_path not in _store_cache:
        store = SqliteTelemetryStore(db_path=db_path)
        _store_cache[db_path] = store
    return _store_cache[db_path]

