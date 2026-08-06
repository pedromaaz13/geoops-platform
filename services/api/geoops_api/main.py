from __future__ import annotations

from typing import Any
from uuid import uuid4

import uvicorn
from fastapi import Depends, FastAPI, HTTPException, Query, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from geoops_api import schemas
from geoops_api.config import Settings, get_settings
from geoops_api.db import get_session
from geoops_api.logging import configure_logging
from geoops_api.operations import (
    acknowledge_alert,
    create_alert_rule,
    create_asset,
    delete_asset,
    event_timeline,
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
    operations_summary,
)
from geoops_api.readiness import check_postgis_ready

DB_SESSION = Depends(get_session)

# Nombres públicos de query aceptados por GET /v1/events (incluye los alias
# `from`/`to`). Cualquier otro se rechaza con 400 en vez de ignorarse.
EVENTS_QUERY_PARAMS = frozenset(
    {
        "bbox",
        "types",
        "from",
        "to",
        "updated_after",
        "status",
        "sources",
        "origins",
        "sensors",
        "min_confidence",
        "has_impact",
        "has_alert",
        "limit",
        "cursor",
    }
)


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

    @app.exception_handler(RequestValidationError)
    async def validation_error_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
        request_id = request.headers.get("x-request-id", str(uuid4()))
        # Map each pydantic error to its concrete field so clients see what failed
        # instead of a generic INVALID_REQUEST. Keeps the existing 400 envelope.
        details: dict[str, str] = {}
        for error in exc.errors():
            location = [str(part) for part in error["loc"] if part not in ("body", "query", "path")]
            field = ".".join(location) or "request"
            details[field] = error["msg"]
        return JSONResponse(
            status_code=400,
            content={
                "error": {
                    "code": "INVALID_REQUEST",
                    "message": "request validation failed",
                    "details": details,
                    "request_id": request_id,
                }
            },
        )

    @app.get("/health", response_model=schemas.HealthStatus)
    def health() -> dict[str, str]:
        return {
            "status": "ok",
            "service": active_settings.service_name,
            "environment": active_settings.environment,
        }

    @app.get("/ready", response_model=schemas.ReadyStatus)
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

    @app.get("/v1/events", response_model=schemas.EventFeatureCollection)
    def api_list_events(
        request: Request,
        bbox: str | None = None,
        types: str | None = None,
        from_time: str | None = Query(default=None, alias="from"),
        to_time: str | None = Query(default=None, alias="to"),
        updated_after: str | None = None,
        status: str | None = None,
        sources: str | None = None,
        origins: str | None = None,
        sensors: str | None = None,
        min_confidence: float | None = None,
        has_impact: bool | None = None,
        has_alert: bool | None = None,
        limit: int = 100,
        cursor: str | None = None,
        session: Session = DB_SESSION,
    ) -> dict[str, Any]:
        # Rechazar params desconocidos en vez de ignorarlos: un cliente que use
        # `from_time` en lugar de `from` debe enterarse, no recibir un filtro mudo.
        unknown = [key for key in request.query_params if key not in EVENTS_QUERY_PARAMS]
        if unknown:
            raise ValueError(f"unknown query parameters: {', '.join(sorted(set(unknown)))}")
        return list_events(
            session,
            bbox=bbox,
            types=types,
            from_time=from_time,
            to_time=to_time,
            updated_after=updated_after,
            status=status,
            sources=sources,
            origins=origins,
            sensors=sensors,
            min_confidence=min_confidence,
            has_impact=has_impact,
            has_alert=has_alert,
            limit=limit,
            cursor=cursor,
        )

    @app.get("/v1/operations/summary", response_model=schemas.OperationsSummary)
    def api_operations_summary(session: Session = DB_SESSION) -> dict[str, Any]:
        return operations_summary(session)

    @app.get("/v1/events/{event_id}", response_model=schemas.EventDetailFeature)
    def api_event_detail(event_id: str, session: Session = DB_SESSION) -> dict[str, Any]:
        detail = get_event_detail(session, event_id)
        if detail is None:
            raise HTTPException(status_code=404, detail="event not found")
        return detail

    @app.get("/v1/events/{event_id}/observations", response_model=list[schemas.Observation])
    def api_event_observations(event_id: str, session: Session = DB_SESSION) -> list[dict[str, Any]]:
        return list_event_observations(session, event_id)

    @app.get("/v1/events/{event_id}/revisions", response_model=list[schemas.Revision])
    def api_event_revisions(event_id: str, session: Session = DB_SESSION) -> list[dict[str, Any]]:
        return list_event_revisions(session, event_id)

    @app.get("/v1/events/{event_id}/timeline", response_model=schemas.EventTimeline)
    def api_event_timeline(event_id: str, session: Session = DB_SESSION) -> dict[str, Any]:
        timeline = event_timeline(session, event_id)
        if timeline is None:
            raise HTTPException(status_code=404, detail="event not found")
        return timeline

    @app.get("/v1/sources", response_model=list[schemas.Source])
    def api_sources(session: Session = DB_SESSION) -> list[dict[str, Any]]:
        return list_sources(session)

    @app.get("/v1/sources/health", response_model=list[schemas.SourceHealth])
    def api_sources_health(session: Session = DB_SESSION) -> list[dict[str, Any]]:
        return list_source_health(session)

    @app.get("/v1/source-runs", response_model=list[schemas.SourceRun])
    def api_source_runs(session: Session = DB_SESSION) -> list[dict[str, Any]]:
        return list_source_runs(session)

    @app.post("/v1/assets", status_code=201, response_model=schemas.Asset)
    def api_create_asset(payload: schemas.AssetCreate, session: Session = DB_SESSION) -> dict[str, Any]:
        return create_asset(session, payload.model_dump())

    @app.get("/v1/assets", response_model=list[schemas.Asset])
    def api_assets(session: Session = DB_SESSION) -> list[dict[str, Any]]:
        return list_assets(session)

    @app.get("/v1/assets/{asset_id}", response_model=schemas.Asset)
    def api_asset(asset_id: str, session: Session = DB_SESSION) -> dict[str, Any]:
        for asset in list_assets(session):
            if asset["id"] == asset_id:
                return asset
        raise HTTPException(status_code=404, detail="asset not found")

    @app.delete("/v1/assets/{asset_id}", status_code=204)
    def api_delete_asset(asset_id: str, session: Session = DB_SESSION) -> None:
        delete_asset(session, asset_id)

    @app.get("/v1/events/{event_id}/impacts", response_model=list[schemas.Impact])
    def api_event_impacts(event_id: str, session: Session = DB_SESSION) -> list[dict[str, Any]]:
        return list_event_impacts(session, event_id)

    @app.post("/v1/alert-rules", status_code=201, response_model=schemas.AlertRule)
    def api_create_alert_rule(payload: schemas.AlertRuleCreate, session: Session = DB_SESSION) -> dict[str, Any]:
        return create_alert_rule(session, payload.model_dump())

    @app.get("/v1/alert-rules", response_model=list[schemas.AlertRule])
    def api_alert_rules(session: Session = DB_SESSION) -> list[dict[str, Any]]:
        return list_alert_rules(session)

    @app.get("/v1/alerts", response_model=list[schemas.Alert])
    def api_alerts(session: Session = DB_SESSION) -> list[dict[str, Any]]:
        return list_alerts(session)

    @app.post("/v1/alerts/{alert_id}/acknowledge", response_model=schemas.Alert)
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
