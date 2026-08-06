"""GEO-CORE-001 · geometría genérica y aislamiento por organización.

Pruebas de integración contra API real. Escritas para fallar contra el estado
previo (geometría POINT, sin organization_id): insertar un evento poligonal
revienta contra la columna POINT y los endpoints no aíslan por organización.
"""

from __future__ import annotations

import asyncio

import httpx
import pytest
from geoalchemy2.shape import from_shape
from geoops_api.config import Settings
from geoops_api.db import create_session_factory
from geoops_api.main import create_app
from geoops_api.models import Event
from geoops_api.time import now_utc
from shapely.geometry import LineString, Polygon
from sqlalchemy import text

TEST_DB = "postgresql://geoops:geoops@localhost:5432/geoops_dev"

# Polígono pequeño en Castellón; línea que lo cruza.
POLY = Polygon([(-0.40, 39.88), (-0.36, 39.88), (-0.36, 39.92), (-0.40, 39.92), (-0.40, 39.88)])
LINE = LineString([(-0.42, 39.90), (-0.34, 39.90)])


def _clean() -> None:
    with create_session_factory()() as session:
        session.execute(
            text(
                "TRUNCATE alerts, alert_rules, impacts, assets, event_revisions, "
                "event_observations, events, observations, raw_payloads, source_runs, "
                "sources, organizations RESTART IDENTITY CASCADE"
            )
        )
        session.commit()


def _seed_polygon_event(event_id: str = "poly-1") -> None:
    now = now_utc()
    with create_session_factory()() as session:
        session.add(
            Event(
                id=event_id,
                event_type="wildfire",
                title="Incendio poligonal",
                geometry=from_shape(POLY, srid=4326),
                last_observed_at=now,
                created_at=now,
                updated_at=now,
            )
        )
        session.commit()


def _app(organization_id: str = "default"):  # type: ignore[no-untyped-def]
    return create_app(
        Settings(
            service_name="geoops-api-test",
            environment="test",
            database_url=TEST_DB,
            api_host="127.0.0.1",
            api_port=8000,
            organization_id=organization_id,
        )
    )


async def _request(app, method: str, path: str, json: dict | None = None) -> httpx.Response:  # type: ignore[no-untyped-def]
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        return await client.request(method, path, json=json)


def _get(app, path):  # type: ignore[no-untyped-def]
    return asyncio.run(_request(app, "GET", path))


# --- geometría genérica ---------------------------------------------------


@pytest.mark.integration
def test_polygon_event_is_stored_and_returned() -> None:
    _clean()
    _seed_polygon_event()
    body = _get(_app(), "/v1/events").json()
    assert body["features"], "no se devolvió el evento poligonal"
    geom = body["features"][0]["geometry"]
    assert geom["type"] in {"Polygon", "MultiPolygon"}


@pytest.mark.integration
def test_line_asset_impacts_polygon_event() -> None:
    _clean()
    _seed_polygon_event()
    app = _app()
    created = asyncio.run(
        _request(
            app,
            "POST",
            "/v1/assets",
            {"name": "Tramo lineal", "asset_type": "route", "geometry": LINE.__geo_interface__, "criticality": "high"},
        )
    )
    assert created.status_code == 201, created.text
    impacts = _get(app, "/v1/events/poly-1/impacts").json()
    assert impacts, "no se calculó impacto del activo lineal contra el evento poligonal"


# --- aislamiento por organización (uno por endpoint) ----------------------


def _seed_asset_for(org: str, name: str) -> str:
    app = _app(org)
    resp = asyncio.run(
        _request(app, "POST", "/v1/assets", {"name": name, "longitude": -0.37, "latitude": 39.9, "criticality": "high"})
    )
    assert resp.status_code == 201, resp.text
    return resp.json()["id"]


@pytest.mark.integration
def test_org_isolation_list_assets() -> None:
    _clean()
    _seed_asset_for("org-a", "Activo A")
    ids_b = [a["id"] for a in _get(_app("org-b"), "/v1/assets").json()]
    assert ids_b == [], "org-b ve activos de org-a"


@pytest.mark.integration
def test_org_isolation_get_asset() -> None:
    _clean()
    asset_a = _seed_asset_for("org-a", "Activo A")
    resp = _get(_app("org-b"), f"/v1/assets/{asset_a}")
    assert resp.status_code == 404, "org-b accede a un activo de org-a por id"


@pytest.mark.integration
def test_org_isolation_delete_asset() -> None:
    _clean()
    asset_a = _seed_asset_for("org-a", "Activo A")
    resp = asyncio.run(_request(_app("org-b"), "DELETE", f"/v1/assets/{asset_a}"))
    assert resp.status_code == 404, "org-b borra un activo de org-a"


@pytest.mark.integration
def test_org_isolation_summary() -> None:
    _clean()
    _seed_asset_for("org-a", "Activo A")
    summary_b = _get(_app("org-b"), "/v1/operations/summary").json()
    assert summary_b["assets_total"] == 0, "el summary de org-b cuenta activos de org-a"


@pytest.mark.integration
def test_org_isolation_alert_rules() -> None:
    _clean()
    asset_a = _seed_asset_for("org-a", "Activo A")
    app_a = _app("org-a")
    asyncio.run(
        _request(
            app_a,
            "POST",
            "/v1/alert-rules",
            {"name": "Regla A", "asset_id": asset_a, "distance_threshold_m": 1000},
        )
    )
    rules_b = _get(_app("org-b"), "/v1/alert-rules").json()
    assert rules_b == [], "org-b ve reglas de org-a"


@pytest.mark.integration
def test_org_isolation_alerts_and_impacts() -> None:
    _clean()
    _seed_polygon_event()
    asset_a = _seed_asset_for("org-a", "Activo A")
    app_a = _app("org-a")
    asyncio.run(
        _request(
            app_a,
            "POST",
            "/v1/alert-rules",
            {"name": "Regla A", "asset_id": asset_a, "distance_threshold_m": 100000},
        )
    )
    alerts_b = _get(_app("org-b"), "/v1/alerts").json()
    impacts_b = _get(_app("org-b"), "/v1/events/poly-1/impacts").json()
    assert alerts_b == [], "org-b ve alertas de org-a"
    assert impacts_b == [], "org-b ve impactos de org-a"
