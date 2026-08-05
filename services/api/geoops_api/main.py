from __future__ import annotations

from typing import Any

import uvicorn
from fastapi import FastAPI, HTTPException

from geoops_api.config import Settings, get_settings
from geoops_api.logging import configure_logging
from geoops_api.readiness import check_postgis_ready


def create_app(settings: Settings | None = None) -> FastAPI:
    active_settings = settings or get_settings()
    configure_logging(active_settings.service_name)

    app = FastAPI(
        title="GeoOps API",
        version="0.1.0",
        description="Bootstrap API for GeoOps operational health checks.",
    )

    @app.get("/health")
    def health() -> dict[str, str]:
        return {
            "status": "ok",
            "service": active_settings.service_name,
            "environment": active_settings.environment,
        }

    @app.get("/ready")
    def ready() -> dict[str, Any]:
        try:
            postgis_version = check_postgis_ready(active_settings.database_url)
        except Exception as exc:
            raise HTTPException(
                status_code=503,
                detail={
                    "status": "not_ready",
                    "dependency": "postgis",
                    "reason": str(exc),
                },
            ) from exc

        return {
            "status": "ready",
            "dependency": "postgis",
            "postgis_version": postgis_version,
        }

    return app


app = create_app()


def run() -> None:
    settings = get_settings()
    uvicorn.run("geoops_api.main:app", host=settings.api_host, port=settings.api_port)
