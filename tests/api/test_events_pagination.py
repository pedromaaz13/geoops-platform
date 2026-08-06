"""GEO-FIX-001 · listado veraz de eventos (integración contra API real).

Verifica que /v1/events declara el truncamiento (partial + total_matched),
pagina con un cursor keyset estable sin duplicados ni huecos, ordena de forma
determinista y rechaza parámetros de query desconocidos. Escrita para fallar
contra la implementación previa (order by UUID, partial fijo, sin total_matched).
"""

from __future__ import annotations

import asyncio
from datetime import timedelta

import httpx
import pytest
from geoalchemy2.shape import from_shape
from geoops_api.config import Settings
from geoops_api.db import create_session_factory
from geoops_api.main import create_app
from geoops_api.models import Event
from geoops_api.time import now_utc
from shapely.geometry import Point
from sqlalchemy import text

TEST_DB = "postgresql://geoops:geoops@localhost:5432/geoops_dev"


def _clean_database() -> None:
    with create_session_factory()() as session:
        session.execute(
            text(
                "TRUNCATE alerts, alert_rules, impacts, assets, event_revisions, "
                "event_observations, events, observations, raw_payloads, source_runs, sources "
                "RESTART IDENTITY CASCADE"
            )
        )
        session.commit()


def _seed_events(count: int) -> set[str]:
    # last_observed_at descendente: evt-0000 es el más reciente, evt-(n-1) el más antiguo.
    now = now_utc()
    ids: set[str] = set()
    with create_session_factory()() as session:
        for index in range(count):
            event_id = f"evt-{index:04d}"
            ids.add(event_id)
            session.add(
                Event(
                    id=event_id,
                    event_type="wildfire",
                    title=f"Evento {index}",
                    geometry=from_shape(Point(-3.7 + index * 0.001, 40.4), srid=4326),
                    last_observed_at=now - timedelta(minutes=index),
                    created_at=now,
                    updated_at=now,
                )
            )
        session.commit()
    return ids


def _test_app():  # type: ignore[no-untyped-def]
    return create_app(
        Settings(
            service_name="geoops-api-test",
            environment="test",
            database_url=TEST_DB,
            api_host="127.0.0.1",
            api_port=8000,
        )
    )


async def _get(path: str, params: dict | None = None) -> httpx.Response:
    transport = httpx.ASGITransport(app=_test_app())
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        return await client.get(path, params=params)


@pytest.mark.integration
def test_listing_declares_truncation_and_paginates_without_gaps() -> None:
    _clean_database()
    all_ids = _seed_events(250)

    first = asyncio.run(_get("/v1/events", {"limit": 200}))
    assert first.status_code == 200
    body1 = first.json()
    assert body1["meta"]["total_matched"] == 250
    assert body1["meta"]["partial"] is True
    assert body1["meta"]["next_cursor"]
    ids1 = [f["properties"]["id"] for f in body1["features"]]
    assert len(ids1) == 200

    second = asyncio.run(_get("/v1/events", {"limit": 200, "cursor": body1["meta"]["next_cursor"]}))
    assert second.status_code == 200
    body2 = second.json()
    ids2 = [f["properties"]["id"] for f in body2["features"]]
    assert len(ids2) == 50
    assert body2["meta"]["partial"] is False
    assert body2["meta"]["total_matched"] == 250

    assert set(ids1).isdisjoint(ids2), "cursor devuelve eventos duplicados entre páginas"
    assert set(ids1) | set(ids2) == all_ids, "la paginación deja huecos"


@pytest.mark.integration
def test_order_is_deterministic_and_most_recent_first() -> None:
    _clean_database()
    _seed_events(250)
    call_a = [f["properties"]["id"] for f in asyncio.run(_get("/v1/events", {"limit": 200})).json()["features"]]
    call_b = [f["properties"]["id"] for f in asyncio.run(_get("/v1/events", {"limit": 200})).json()["features"]]
    assert call_a == call_b, "el orden no es determinista entre llamadas"
    assert call_a[0] == "evt-0000", "el más reciente no está primero"


@pytest.mark.integration
def test_unknown_query_param_is_rejected_with_400() -> None:
    _clean_database()
    response = asyncio.run(_get("/v1/events", {"from_time": "2026-08-01T00:00:00Z"}))
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "INVALID_REQUEST"
