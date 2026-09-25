"""Phase 1 FastAPI surface: contract-shaped mock endpoints only."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .routes import router


def create_app() -> FastAPI:
    app = FastAPI(title="HydroWise API", version="0.1.0-phase1")
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.include_router(router)
    return app


app = create_app()
