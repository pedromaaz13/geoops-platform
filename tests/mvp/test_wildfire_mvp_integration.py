import asyncio
import json
from datetime import timedelta
from pathlib import Path

import httpx
import pytest
from geoops_api.config import Settings
from geoops_api.db import create_session_factory
from geoops_api.main import create_app
from geoops_api.models import (
    Event,
    EventObservation,
    EventRevision,
    Observation,
    RawPayload,
    SourceRun,
)
from geoops_api.time import now_utc
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


def _empty_wildfire_fixture(tmp_path: Path) -> Path:
    target = tmp_path / "empty-wildfire"
    target.mkdir()
    for file_name in ("manifest.json", "sources.json", "incidents.geojson"):
        (target / file_name).write_text((FIXTURE / file_name).read_text(encoding="utf-8"), encoding="utf-8")

    manifest_path = target / "manifest.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    manifest["counts"]["incidents_total"] = 0
    manifest["counts"]["incidents_satellite_confirmed"] = 0
    manifest["counts"]["incidents_official_only"] = 0
    manifest["counts"]["hotspots_24h"] = 0
    manifest["frp_total_mw"] = 0
    manifest_path.write_text(json.dumps(manifest), encoding="utf-8")

    incidents_path = target / "incidents.geojson"
    incidents = json.loads(incidents_path.read_text(encoding="utf-8"))
    incidents["features"] = []
    incidents_path.write_text(json.dumps(incidents), encoding="utf-8")
    return target


def _fixture_copy(tmp_path: Path, name: str) -> Path:
    target = tmp_path / name
    target.mkdir()
    for file_name in ("manifest.json", "sources.json", "incidents.geojson"):
        (target / file_name).write_text((FIXTURE / file_name).read_text(encoding="utf-8"), encoding="utf-8")
    return target


def _write_incidents(target: Path, features: list[dict]) -> None:
    manifest_path = target / "manifest.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    manifest["counts"]["incidents_total"] = len(features)
    manifest["counts"]["incidents_satellite_confirmed"] = sum(1 for feature in features if feature["properties"].get("satellite_confirmed"))
    manifest["counts"]["incidents_official_only"] = sum(
        1
        for feature in features
        if feature["properties"].get("official_confirmed") and not feature["properties"].get("satellite_confirmed")
    )
    manifest_path.write_text(json.dumps(manifest), encoding="utf-8")

    incidents_path = target / "incidents.geojson"
    incidents = json.loads(incidents_path.read_text(encoding="utf-8"))
    incidents["features"] = features
    incidents_path.write_text(json.dumps(incidents), encoding="utf-8")


def _near_satellite_and_official_features() -> list[dict]:
    incidents = json.loads((FIXTURE / "incidents.geojson").read_text(encoding="utf-8"))
    satellite = json.loads(json.dumps(incidents["features"][0]))
    official = json.loads(json.dumps(incidents["features"][1]))
    satellite["properties"].update(
        {
            "id": "satellite-merge-candidate",
            "origin": "satelite",
            "satellite_confirmed": True,
            "official_confirmed": False,
            "confirmed_by": "",
            "status": None,
            "status_origen": "satelite",
            "confidence": 0.62,
            "first_detected": "2026-08-04T20:00:00Z",
            "last_detected": "2026-08-04T20:00:00Z",
        }
    )
    satellite["geometry"]["coordinates"] = [-0.38212408090101124, 39.89875585769801]
    official["properties"].update(
        {
            "id": "official-merge-candidate",
            "origin": "oficial",
            "satellite_confirmed": False,
            "official_confirmed": True,
            "confirmed_by": "112cv",
            "status": "activo",
            "status_origen": "oficial",
            "n_hotspots": 0,
            "confidence": 0.84,
            "first_detected": "2026-08-04T20:30:00Z",
            "last_detected": "2026-08-04T20:30:00Z",
            "position_precision_m": 100.0,
        }
    )
    official["geometry"]["coordinates"] = [-0.3819240809010112, 39.89895585769801]
    return [satellite, official]


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
def test_empty_feed_is_allowed_without_previous_activity(tmp_path: Path) -> None:
    _clean_database()
    fixture = _empty_wildfire_fixture(tmp_path)
    session_factory = create_session_factory()
    with session_factory() as session:
        summary = ingest_wildfire_public(session, fixture=fixture)

        assert summary.status == "empty"
        assert session.query(Event).count() == 0
        assert session.query(Observation).count() == 0
        run = session.query(SourceRun).one()
        assert run.status == "empty"
        assert run.error_type is None


@pytest.mark.integration
def test_suspicious_empty_feed_after_recent_activity_is_rejected(tmp_path: Path) -> None:
    _clean_database()
    fixture = _empty_wildfire_fixture(tmp_path)
    session_factory = create_session_factory()
    with session_factory() as session:
        ingest_wildfire_public(session, fixture=FIXTURE)
        events_before = session.query(Event).count()
        observations_before = session.query(Observation).count()

        with pytest.raises(WildfireFeedError, match="empty feed after recent activity"):
            ingest_wildfire_public(session, fixture=fixture)

        assert session.query(Event).count() == events_before
        assert session.query(Observation).count() == observations_before
        assert session.query(RawPayload).count() == 6
        run = session.query(SourceRun).order_by(SourceRun.started_at.desc()).first()
        assert run is not None
        assert run.status == "failed"
        assert run.error_type == "suspicious_empty"
        assert run.error_message == "empty feed after recent activity; preserving previous state"
        assert run.raw_payload_count == 3

    summary_response = asyncio.run(_request("GET", "/v1/operations/summary"))
    assert summary_response.status_code == 200
    assert summary_response.json()["events_total"] == events_before


@pytest.mark.integration
def test_api_filters_wildfire_by_origin_sensor_and_confidence() -> None:
    _clean_database()
    session_factory = create_session_factory()
    with session_factory() as session:
        ingest_wildfire_public(session, fixture=FIXTURE)

    origin_response = asyncio.run(_request("GET", "/v1/events?types=wildfire&origins=satelite"))
    assert origin_response.status_code == 200
    origin_features = origin_response.json()["features"]
    assert len(origin_features) == 1
    assert origin_features[0]["properties"]["attributes"]["origin"] == "satelite"

    sensor_response = asyncio.run(_request("GET", "/v1/events?types=wildfire&sensors=VIIRS_NOAA20_NRT"))
    assert sensor_response.status_code == 200
    assert len(sensor_response.json()["features"]) == 2

    confidence_response = asyncio.run(_request("GET", "/v1/events?types=wildfire&min_confidence=0.7"))
    assert confidence_response.status_code == 200
    confidence_features = confidence_response.json()["features"]
    assert len(confidence_features) == 1
    assert confidence_features[0]["properties"]["confidence"] >= 0.7

    invalid_response = asyncio.run(_request("GET", "/v1/events?types=wildfire&min_confidence=2"))
    assert invalid_response.status_code == 400


@pytest.mark.integration
def test_source_health_reports_success_with_separate_fresh_ages() -> None:
    _clean_database()
    session_factory = create_session_factory()
    with session_factory() as session:
        ingest_wildfire_public(session, fixture=FIXTURE)
        fresh_observed_at = now_utc() - timedelta(hours=1)
        fresh_download_at = now_utc() - timedelta(minutes=5)
        run = session.query(SourceRun).one()
        run.latest_observed_at = fresh_observed_at
        run.started_at = fresh_download_at - timedelta(minutes=1)
        run.finished_at = fresh_download_at
        session.commit()

    response = asyncio.run(_request("GET", "/v1/sources/health"))
    assert response.status_code == 200
    wildfire = next(source for source in response.json() if source["id"] == "wildfire-public")
    assert wildfire["freshness_status"] == "success"
    assert wildfire["last_download_at"] is not None
    assert wildfire["last_success_at"] is not None
    assert wildfire["latest_observed_at"] is not None
    assert 0 < wildfire["download_age_seconds"] < wildfire["data_age_seconds"]
    assert wildfire["ttl_seconds"] == 86_400


@pytest.mark.integration
def test_source_health_marks_stale_when_data_age_exceeds_ttl() -> None:
    _clean_database()
    session_factory = create_session_factory()
    with session_factory() as session:
        ingest_wildfire_public(session, fixture=FIXTURE)
        stale_observed_at = now_utc() - timedelta(hours=49)
        recent_download_at = now_utc() - timedelta(minutes=10)
        run = session.query(SourceRun).one()
        run.latest_observed_at = stale_observed_at
        run.started_at = recent_download_at - timedelta(minutes=1)
        run.finished_at = recent_download_at
        session.commit()

    response = asyncio.run(_request("GET", "/v1/sources/health"))
    assert response.status_code == 200
    wildfire = next(source for source in response.json() if source["id"] == "wildfire-public")
    assert wildfire["freshness_status"] == "stale"
    assert wildfire["data_age_seconds"] > wildfire["ttl_seconds"]
    assert wildfire["download_age_seconds"] < wildfire["ttl_seconds"]
    assert wildfire["stale_reason"] == "data or download age exceeded ttl"

    summary_response = asyncio.run(_request("GET", "/v1/operations/summary"))
    assert summary_response.status_code == 200
    source_health = summary_response.json()["source_health"]
    assert "wildfire-public" in source_health["stale_sources"]
    assert source_health["worst_data_age_seconds"] >= wildfire["data_age_seconds"]
    assert source_health["worst_download_age_seconds"] >= wildfire["download_age_seconds"]


@pytest.mark.integration
def test_source_health_keeps_last_success_after_suspicious_empty_failure(tmp_path: Path) -> None:
    _clean_database()
    fixture = _empty_wildfire_fixture(tmp_path)
    session_factory = create_session_factory()
    with session_factory() as session:
        ingest_wildfire_public(session, fixture=FIXTURE)
        with pytest.raises(WildfireFeedError, match="empty feed after recent activity"):
            ingest_wildfire_public(session, fixture=fixture)

    response = asyncio.run(_request("GET", "/v1/sources/health"))
    assert response.status_code == 200
    wildfire = next(source for source in response.json() if source["id"] == "wildfire-public")
    assert wildfire["freshness_status"] == "failed"
    assert wildfire["last_run"]["status"] == "failed"
    assert wildfire["last_run"]["error_type"] == "suspicious_empty"
    assert wildfire["last_success_at"] is not None
    assert wildfire["latest_observed_at"] is not None
    assert wildfire["records"] == 2


@pytest.mark.integration
def test_old_previous_activity_does_not_block_empty_feed(tmp_path: Path) -> None:
    _clean_database()
    fixture = _empty_wildfire_fixture(tmp_path)
    session_factory = create_session_factory()
    with session_factory() as session:
        ingest_wildfire_public(session, fixture=FIXTURE)
        old_observed_at = now_utc() - timedelta(hours=96)
        for event in session.query(Event).all():
            event.last_observed_at = old_observed_at
        for run in session.query(SourceRun).all():
            run.latest_observed_at = old_observed_at
        session.commit()

        summary = ingest_wildfire_public(session, fixture=fixture)

        assert summary.status == "empty"
        run = session.query(SourceRun).order_by(SourceRun.started_at.desc()).first()
        assert run is not None
        assert run.status == "empty"
        assert run.error_type is None


@pytest.mark.integration
def test_wildfire_reconciles_official_and_satellite_observations_by_tolerance(tmp_path: Path) -> None:
    _clean_database()
    target = _fixture_copy(tmp_path, "merge")
    _write_incidents(target, _near_satellite_and_official_features())

    session_factory = create_session_factory()
    with session_factory() as session:
        summary = ingest_wildfire_public(session, fixture=target)

        assert summary.events_created == 1
        assert summary.events_updated == 1
        assert session.query(Event).count() == 1
        assert session.query(Observation).count() == 2
        assert session.query(EventObservation).count() == 2
        event = session.query(Event).one()
        assert event.subtype == "ambos"
        assert event.status == "activo"
        assert event.confidence == 0.84
        assert set(event.attributes["upstream_incident_ids"]) == {
            "satellite-merge-candidate",
            "official-merge-candidate",
        }
        assert set(event.attributes["origins"]) == {"satelite", "oficial"}


@pytest.mark.integration
def test_wildfire_reconciliation_keeps_observations_outside_window_separate(tmp_path: Path) -> None:
    _clean_database()
    target = _fixture_copy(tmp_path, "no-merge")
    features = _near_satellite_and_official_features()
    features[1]["properties"]["first_detected"] = "2026-08-05T08:30:00Z"
    features[1]["properties"]["last_detected"] = "2026-08-05T08:30:00Z"
    _write_incidents(target, features)

    session_factory = create_session_factory()
    with session_factory() as session:
        ingest_wildfire_public(session, fixture=target)

        assert session.query(Event).count() == 2
        assert session.query(Observation).count() == 2


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

    timeline_response = asyncio.run(_request("GET", f"/v1/events/{event_id}/timeline"))
    assert timeline_response.status_code == 200
    assert timeline_response.json()["points"][0]["kind"] == "observation"

    summary_response = asyncio.run(_request("GET", "/v1/operations/summary"))
    assert summary_response.status_code == 200
    summary = summary_response.json()
    assert summary["events_total"] == 2
    assert summary["manifest"]["demo"] is True
    assert summary["latest_observed_at"] is not None

    filtered_response = asyncio.run(_request("GET", "/v1/events?types=wildfire&sources=wildfire-public&status=activo"))
    assert filtered_response.status_code == 200
    assert len(filtered_response.json()["features"]) >= 1

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

    impact_filtered_response = asyncio.run(_request("GET", "/v1/events?types=wildfire&has_impact=true"))
    assert impact_filtered_response.status_code == 200
    assert len(impact_filtered_response.json()["features"]) >= 1


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
