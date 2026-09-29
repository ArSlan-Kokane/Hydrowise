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
from dataclasses import dataclass
from datetime import datetime, timezone
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
# In-memory store (Phase 1 stub)                                               #
# --------------------------------------------------------------------------- #

class InMemoryTelemetryStore:
    """
    Non-persistent in-process ring buffer used during Phase 1.

    Readings are lost on restart.  Replace with a real TelemetryStore
    implementation when a persistence layer is chosen (Phase 4 per
    implementation-sequence.md).
    """

    def __init__(self, max_items: int = 1000) -> None:
        self._max = max_items
        self._store: list[SensorReading] = []

    async def save(self, reading: SensorReading) -> None:
        self._store.append(reading)
        if len(self._store) > self._max:
            self._store = self._store[-self._max :]
        logger.debug("TelemetryStore: saved reading from %s", reading.device_id)

    async def latest(self) -> SensorReading | None:
        return self._store[-1] if self._store else None

    async def history(self, limit: int = 24) -> list[SensorReading]:
        return list(reversed(self._store[-limit:]))


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
        """Return True when the device secret is valid or auth is disabled."""
        expected = self._settings.device_ingestion_secret
        if not expected:
            # Auth disabled in development — log a reminder
            logger.debug(
                "Device authentication is disabled.  "
                "Set DEVICE_INGESTION_SECRET to enable it."
            )
            return True
        return provided_secret == expected

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
                detail="Invalid or missing device secret.",
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

        await self._store.save(reading)
        return IngestionResult(status=IngestionStatus.ACCEPTED, reading=reading)


# --------------------------------------------------------------------------- #
# Singleton store (shared across requests within the same process)             #
# --------------------------------------------------------------------------- #

_store: InMemoryTelemetryStore | None = None


def get_telemetry_store() -> InMemoryTelemetryStore:
    """Return the process-scoped in-memory telemetry store."""
    global _store
    if _store is None:
        _store = InMemoryTelemetryStore()
    return _store
