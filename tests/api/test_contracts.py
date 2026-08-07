"""Contract tests for GEO-FIX-003.

They guard the typed API contract: every data endpoint declares a
``response_model``, the committed ``openapi.json`` matches what the app produces
(drift guard, mirrored by ``make openapi-check``), and invalid request bodies
return the concrete field that failed inside the existing 400 error envelope.
"""

from __future__ import annotations

import asyncio
import json
from pathlib import Path

import httpx
from fastapi.routing import APIRoute
from geoops_api.config import Settings
from geoops_api.db import get_session
from geoops_api.main import app, create_app

REPO_ROOT = Path(__file__).resolve().parents[2]
OPENAPI_PATH = REPO_ROOT / "openapi.json"


def _test_app():  # type: ignore[no-untyped-def]
    application = create_app(
        Settings(
            service_name="geoops-api-test",
            environment="test",
            database_url="postgresql://unused:unused@localhost:5432/unused",
            api_host="127.0.0.1",
            api_port=8000,
        )
    )
    # Body validation runs before the handler, so a dummy session keeps these
    # tests DB-free while still exercising the request models.
    application.dependency_overrides[get_session] = lambda: None
    return application


async def _post(app_instance, path: str, payload: dict) -> httpx.Response:  # type: ignore[no-untyped-def]
    transport = httpx.ASGITransport(app=app_instance)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        return await client.post(path, json=payload)


def test_every_data_route_declares_a_response_model() -> None:
    missing: list[str] = []
    for route in app.routes:
        if not isinstance(route, APIRoute):
            continue
        # The 204 asset delete legitimately returns no body.
        if "DELETE" in route.methods:
            continue
        if route.response_model is None:
            missing.append(f"{sorted(route.methods)} {route.path}")
    assert not missing, f"endpoints without response_model: {missing}"


def test_committed_openapi_matches_app() -> None:
    expected = json.dumps(app.openapi(), indent=2, sort_keys=True) + "\n"
    actual = OPENAPI_PATH.read_text(encoding="utf-8")
    assert actual == expected, "openapi.json is stale; run `make openapi` and commit"


def test_asset_body_without_geometry_or_coordinates_is_rejected() -> None:
    # Desde GEO-CORE-001 el activo acepta geometry GeoJSON o longitude/latitude;
    # no aportar ninguna de las dos es un 400 de negocio.
    response = asyncio.run(_post(_test_app(), "/v1/assets", {"name": "x"}))
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "INVALID_REQUEST"


def test_invalid_alert_rule_body_names_the_missing_field() -> None:
    response = asyncio.run(_post(_test_app(), "/v1/alert-rules", {"name": "x"}))
    assert response.status_code == 400
    body = response.json()["error"]
    assert body["code"] == "INVALID_REQUEST"
    assert "asset_id" in body["details"]
