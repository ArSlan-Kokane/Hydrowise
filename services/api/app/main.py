"""HydroWise API entry point — Phase 1.3.

Wiring changes from Phase 1.0
------------------------------
- Settings are loaded from environment / .env at startup via get_settings().
- CORS origins are driven by Settings.api_cors_origins (not hardcoded).
- Lifespan context logs the active adapter configuration on startup.
- The app factory is kept so tests can call create_app() with overridden deps.
"""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from typing import AsyncIterator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import get_settings
from .routes import router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(name)s  %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def _lifespan(app: FastAPI) -> AsyncIterator[None]:
    """Log the active adapter configuration on startup and initialize database."""
    settings = get_settings()
    from .ingestion.telemetry import get_telemetry_store

    store = get_telemetry_store(settings)
    if hasattr(store, "init_db"):
        if settings.use_postgres:
            # PostgreSQL has async init_db
            await store.init_db()
        else:
            # SQLite has sync init_db
            store.init_db()

    logger.info(
        "HydroWise API starting — env=%s  db=%s  weather=%s  ml=%s",
        settings.hydrowise_env,
        "postgresql" if settings.use_postgres else settings.sqlite_db_path,
        "mock" if settings.use_mock_weather else f"live ({settings.weather_api_base_url})",
        "mock" if settings.use_mock_ml else f"sklearn ({settings.model_artifact_path})",
    )
    yield
    logger.info("HydroWise API shutting down")

    # Close PostgreSQL connection pool if applicable
    if hasattr(store, "close"):
        await store.close()


def create_app() -> FastAPI:
    settings = get_settings()

    app = FastAPI(
        title="HydroWise API",
        version="0.1.0-phase1.3",
        description=(
            "Irrigation decision-support API.  "
            "All decisions are advisory only (RECOMMENDATION_ONLY) in Phase 1."
        ),
        lifespan=_lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.api_cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(router, prefix="/api/v1")
    app.include_router(router, prefix="/api")

    @app.get("/")
    def root():
        return {
            "name": "HydroWise API",
            "version": "0.1.0",
            "docs": "/docs",
            "health": "/api/health",
        }

    return app


app = create_app()
