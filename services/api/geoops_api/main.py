from __future__ import annotations

from typing import Any
from uuid import uuid4

import uvicorn
from fastapi import Depends, FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from geoops_api.config import Settings, get_settings
from geoops_api.db import get_session
from geoops_api.logging import configure_logging
from geoops_api.operations import (
    acknowledge_alert,
    create_alert_rule,
    create_asset,
    delete_asset,
    get_event_detail,
    list_alert_rules,
    list_alerts,
    list_assets,
    list_event_impacts,
    list_event_observations,
    list_event_revisions,
    list_events,
    list_source_health,
    list_source_runs,
    list_sources,
)
from geoops_api.readiness import check_postgis_ready

DB_SESSION = Depends(get_session)


def create_app(settings: Settings | None = None) -> FastAPI:
    active_settings = settings or get_settings()
    configure_logging(active_settings.service_name)

    app = FastAPI(
        title="GeoOps API",
        version="0.1.0",
        description="Bootstrap API for GeoOps operational health checks.",
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=active_settings.cors_origins,
        allow_credentials=False,
        allow_methods=["GET", "POST", "DELETE"],
        allow_headers=["*"],
    )

    @app.exception_handler(ValueError)
    async def value_error_handler(request: Request, exc: ValueError) -> JSONResponse:
        request_id = request.headers.get("x-request-id", str(uuid4()))
        return JSONResponse(
            status_code=400,
            content={
                "error": {
                    "code": "INVALID_REQUEST",
                    "message": str(exc),
                    "details": {},
                    "request_id": request_id,
                }
            },
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

    @app.get("/v1/events")
    def api_list_events(
        bbox: str | None = None,
        types: str | None = None,
        from_time: str | None = Query(default=None, alias="from"),
        to_time: str | None = Query(default=None, alias="to"),
        updated_after: str | None = None,
        limit: int = 100,
        cursor: str | None = None,
        session: Session = DB_SESSION,
    ) -> dict[str, Any]:
        return list_events(
            session,
            bbox=bbox,
            types=types,
            from_time=from_time,
            to_time=to_time,
            updated_after=updated_after,
            limit=limit,
            cursor=cursor,
        )

    @app.get("/v1/events/{event_id}")
    def api_event_detail(event_id: str, session: Session = DB_SESSION) -> dict[str, Any]:
        detail = get_event_detail(session, event_id)
        if detail is None:
            raise HTTPException(status_code=404, detail="event not found")
        return detail

    @app.get("/v1/events/{event_id}/observations")
    def api_event_observations(event_id: str, session: Session = DB_SESSION) -> list[dict[str, Any]]:
        return list_event_observations(session, event_id)

    @app.get("/v1/events/{event_id}/revisions")
    def api_event_revisions(event_id: str, session: Session = DB_SESSION) -> list[dict[str, Any]]:
        return list_event_revisions(session, event_id)

    @app.get("/v1/sources")
    def api_sources(session: Session = DB_SESSION) -> list[dict[str, Any]]:
        return list_sources(session)

    @app.get("/v1/sources/health")
    def api_sources_health(session: Session = DB_SESSION) -> list[dict[str, Any]]:
        return list_source_health(session)

    @app.get("/v1/source-runs")
    def api_source_runs(session: Session = DB_SESSION) -> list[dict[str, Any]]:
        return list_source_runs(session)

    @app.post("/v1/assets", status_code=201)
    async def api_create_asset(request: Request, session: Session = DB_SESSION) -> dict[str, Any]:
        return create_asset(session, await request.json())

    @app.get("/v1/assets")
    def api_assets(session: Session = DB_SESSION) -> list[dict[str, Any]]:
        return list_assets(session)

    @app.get("/v1/assets/{asset_id}")
    def api_asset(asset_id: str, session: Session = DB_SESSION) -> dict[str, Any]:
        for asset in list_assets(session):
            if asset["id"] == asset_id:
                return asset
        raise HTTPException(status_code=404, detail="asset not found")

    @app.delete("/v1/assets/{asset_id}", status_code=204)
    def api_delete_asset(asset_id: str, session: Session = DB_SESSION) -> None:
        delete_asset(session, asset_id)

    @app.get("/v1/events/{event_id}/impacts")
    def api_event_impacts(event_id: str, session: Session = DB_SESSION) -> list[dict[str, Any]]:
        return list_event_impacts(session, event_id)

    @app.post("/v1/alert-rules", status_code=201)
    async def api_create_alert_rule(request: Request, session: Session = DB_SESSION) -> dict[str, Any]:
        return create_alert_rule(session, await request.json())

    @app.get("/v1/alert-rules")
    def api_alert_rules(session: Session = DB_SESSION) -> list[dict[str, Any]]:
        return list_alert_rules(session)

    @app.get("/v1/alerts")
    def api_alerts(session: Session = DB_SESSION) -> list[dict[str, Any]]:
        return list_alerts(session)

    @app.post("/v1/alerts/{alert_id}/acknowledge")
    def api_acknowledge_alert(alert_id: str, session: Session = DB_SESSION) -> dict[str, Any]:
        alert = acknowledge_alert(session, alert_id)
        if alert is None:
            raise HTTPException(status_code=404, detail="alert not found")
        return alert

    return app


app = create_app()


def run() -> None:
    settings = get_settings()
    uvicorn.run("geoops_api.main:app", host=settings.api_host, port=settings.api_port)
