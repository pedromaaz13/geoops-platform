import asyncio
from pathlib import Path

import httpx
import pytest
from geoops_api.config import Settings
from geoops_api.db import create_session_factory
from geoops_api.main import create_app
from geoops_api.models import Event, EventRevision, Observation, RawPayload, SourceRun
from geoops_api.wildfire_ingest import WildfireFeedError, ingest_wildfire_public
from sqlalchemy import text

FIXTURE = Path("tests/fixtures/wildfire_public")


def _clean_database() -> None:
    session_factory = create_session_factory()
    with session_factory() as session:
        session.execute(
            text(
                "TRUNCATE alerts, alert_rules, impacts, assets, event_revisions, "
                "event_observations, events, observations, raw_payloads, source_runs, sources "
                "RESTART IDENTITY CASCADE"
            )
        )
        session.commit()


async def _request(method: str, path: str, json: dict | None = None) -> httpx.Response:
    app = create_app(
        Settings(
            service_name="geoops-api-test",
            environment="test",
            database_url="postgresql://geoops:geoops@localhost:5432/geoops_dev",
            api_host="127.0.0.1",
            api_port=8000,
        )
    )
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        return await client.request(method, path, json=json)


@pytest.mark.integration
def test_migration_created_core_tables() -> None:
    _clean_database()
    session_factory = create_session_factory()
    with session_factory() as session:
        tables = set(
            session.execute(
                text(
                    "select table_name from information_schema.tables "
                    "where table_schema = 'public'"
                )
            ).scalars()
        )

    assert {"sources", "observations", "events", "assets", "alerts"} <= tables


@pytest.mark.integration
def test_wildfire_ingestion_is_idempotent_and_preserves_raw() -> None:
    _clean_database()
    session_factory = create_session_factory()
    with session_factory() as session:
        first = ingest_wildfire_public(session, fixture=FIXTURE)
        second = ingest_wildfire_public(session, fixture=FIXTURE)

        assert first.events_created == 2
        assert first.observations_created == 2
        assert second.observations_existing == 2
        assert second.observations_created == 0
        assert session.query(RawPayload).count() == 6
        assert session.query(SourceRun).count() == 2
        assert session.query(Observation).count() == 2
        assert session.query(Event).count() == 2


@pytest.mark.integration
def test_wildfire_ingestion_rejects_status_without_source(tmp_path: Path) -> None:
    _clean_database()
    target = tmp_path / "bad"
    target.mkdir()
    for file_name in ("manifest.json", "sources.json", "incidents.geojson"):
        (target / file_name).write_text((FIXTURE / file_name).read_text(encoding="utf-8"), encoding="utf-8")
    incident_file = target / "incidents.geojson"
    payload = incident_file.read_text(encoding="utf-8").replace('"official_confirmed": true', '"official_confirmed": false', 1)
    incident_file.write_text(payload, encoding="utf-8")

    session_factory = create_session_factory()
    with (
        session_factory() as session,
        pytest.raises(WildfireFeedError, match="status without official"),
    ):
        ingest_wildfire_public(session, fixture=target)


@pytest.mark.integration
def test_api_asset_impact_rule_alert_and_acknowledge_flow() -> None:
    _clean_database()
    session_factory = create_session_factory()
    with session_factory() as session:
        ingest_wildfire_public(session, fixture=FIXTURE)

    events_response = asyncio.run(_request("GET", "/v1/events?bbox=-10,35,1,42&types=wildfire"))
    assert events_response.status_code == 200
    events = events_response.json()["features"]
    assert len(events) == 2
    event_id = events[0]["properties"]["id"]
    lon, lat = events[0]["geometry"]["coordinates"]

    detail_response = asyncio.run(_request("GET", f"/v1/events/{event_id}"))
    assert detail_response.status_code == 200
    assert detail_response.json()["properties"]["observations_count"] == 1

    observation_response = asyncio.run(_request("GET", f"/v1/events/{event_id}/observations"))
    assert observation_response.status_code == 200
    assert observation_response.json()[0]["observed_at"] is not None
    assert observation_response.json()[0]["ingested_at"] is not None

    asset_response = asyncio.run(
        _request(
            "POST",
            "/v1/assets",
            {
                "name": "Camping demo",
                "asset_type": "camping",
                "longitude": lon + 0.01,
                "latitude": lat + 0.01,
                "criticality": "high",
            },
        )
    )
    assert asset_response.status_code == 201
    asset_id = asset_response.json()["id"]

    impact_response = asyncio.run(_request("GET", f"/v1/events/{event_id}/impacts"))
    assert impact_response.status_code == 200
    assert impact_response.json()[0]["distance_m"] > 0

    rule_response = asyncio.run(
        _request(
            "POST",
            "/v1/alert-rules",
            {
                "name": "Wildfire near camping",
                "event_type": "wildfire",
                "asset_id": asset_id,
                "distance_threshold_m": 50000,
                "cooldown_minutes": 0,
            },
        )
    )
    assert rule_response.status_code == 201

    alerts_response = asyncio.run(_request("GET", "/v1/alerts"))
    assert alerts_response.status_code == 200
    alerts = alerts_response.json()
    assert len(alerts) == 1
    assert alerts[0]["status"] == "open"

    acknowledged = asyncio.run(_request("POST", f"/v1/alerts/{alerts[0]['id']}/acknowledge"))
    assert acknowledged.status_code == 200
    assert acknowledged.json()["status"] == "acknowledged"


@pytest.mark.integration
def test_relevant_change_creates_revision(tmp_path: Path) -> None:
    _clean_database()
    changed = tmp_path / "changed"
    changed.mkdir()
    for file_name in ("manifest.json", "sources.json", "incidents.geojson"):
        (changed / file_name).write_text((FIXTURE / file_name).read_text(encoding="utf-8"), encoding="utf-8")
    incident_file = changed / "incidents.geojson"
    payload = incident_file.read_text(encoding="utf-8").replace('"intensity": "alta"', '"intensity": "extrema"', 1)
    incident_file.write_text(payload, encoding="utf-8")

    session_factory = create_session_factory()
    with session_factory() as session:
        ingest_wildfire_public(session, fixture=FIXTURE)
        summary = ingest_wildfire_public(session, fixture=changed)

        assert summary.revisions_created == 1
        assert session.query(EventRevision).count() == 1
