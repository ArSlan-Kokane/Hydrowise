"""FastAPI entry point; domain routes are intentionally deferred."""

from fastapi import FastAPI


def create_app() -> FastAPI:
    """Create the future API application without registering product routes yet."""
    return FastAPI(title="HydroWise API", version="0.1.0")


app = create_app()
