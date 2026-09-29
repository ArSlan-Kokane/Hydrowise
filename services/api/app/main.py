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
    """Log the active adapter configuration on startup."""
    settings = get_settings()
    logger.info(
        "HydroWise API starting — env=%s  weather=%s  ml=%s",
        settings.hydrowise_env,
        "mock" if settings.use_mock_weather else f"live ({settings.weather_api_base_url})",
        "mock" if settings.use_mock_ml else f"sklearn ({settings.model_artifact_path})",
    )
    yield
    logger.info("HydroWise API shutting down")


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

    app.include_router(router)
    return app


app = create_app()
