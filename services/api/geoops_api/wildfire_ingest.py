from __future__ import annotations

import hashlib
import json
import logging
import urllib.request
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Any
from uuid import uuid4

from geoalchemy2.shape import from_shape
from shapely.geometry import Point, shape
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from geoops_api.models import (
    Event,
    EventObservation,
    EventRevision,
    Observation,
    RawPayload,
    Source,
    SourceRun,
)
from geoops_api.time import now_utc, parse_utc

log = logging.getLogger(__name__)

SOURCE_ID = "wildfire-public"
RECONCILIATION_VERSION = "wildfire-upstream-id-v1"
SUPPORTED_SCHEMA_VERSION = 1
RAW_ROOT = Path("var/raw")

ARTIFACTS = {
    "manifest": "manifest.json",
    "incidents": "incidents.geojson",
    "sources": "sources.json",
}

RELEVANT_EVENT_FIELDS = [
    "geometry",
    "status",
    "status_source_id",
    "severity",
    "precision_m",
    "valid_from",
    "valid_to",
    "last_observed_at",
    "title",
    "summary",
]


class WildfireFeedError(ValueError):
    pass


@dataclass(frozen=True)
class IngestSummary:
    run_id: str
    status: str
    payloads: int
    observations_created: int
    observations_existing: int
    events_created: int
    events_updated: int
    revisions_created: int
    records_rejected: int

    def as_dict(self) -> dict[str, Any]:
        return {
            "run_id": self.run_id,
            "status": self.status,
            "payloads": self.payloads,
            "observations_created": self.observations_created,
            "observations_existing": self.observations_existing,
            "events_created": self.events_created,
            "events_updated": self.events_updated,
            "revisions_created": self.revisions_created,
            "records_rejected": self.records_rejected,
        }


def canonical_json(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def sha256_bytes(body: bytes) -> str:
    return hashlib.sha256(body).hexdigest()


def _read_fixture(path: Path) -> dict[str, bytes]:
    if not path.exists():
        raise WildfireFeedError(f"Fixture path does not exist: {path}")
    return {key: (path / filename).read_bytes() for key, filename in ARTIFACTS.items()}


def _read_base_url(base_url: str, timeout_seconds: int = 10) -> dict[str, bytes]:
    payloads: dict[str, bytes] = {}
    for key, filename in ARTIFACTS.items():
        url = f"{base_url.rstrip('/')}/{filename}"
        with urllib.request.urlopen(url, timeout=timeout_seconds) as response:
            payloads[key] = response.read()
    return payloads


def _json_payload(raw: bytes, name: str) -> Any:
    try:
        return json.loads(raw)
    except json.JSONDecodeError as exc:
        raise WildfireFeedError(f"{name} is not valid JSON") from exc


def _validate_feed(manifest: dict[str, Any], incidents: dict[str, Any], sources: dict[str, Any]) -> list[str]:
    errors: list[str] = []
    if manifest.get("schema_version") != SUPPORTED_SCHEMA_VERSION:
        errors.append("unsupported schema version")
    generated_at = parse_utc(manifest.get("generated_at"))
    if generated_at and generated_at > now_utc():
        errors.append("manifest generated_at is in the future")
    if incidents.get("type") != "FeatureCollection" or not isinstance(incidents.get("features"), list):
        errors.append("incidents.geojson is not a FeatureCollection")
    if not isinstance(sources.get("sources"), list):
        errors.append("sources.json has no sources array")

    ids: set[str] = set()
    features = incidents.get("features") or []
    for feature in features:
        props = feature.get("properties") or {}
        upstream_id = props.get("id")
        if not upstream_id:
            errors.append("feature without id")
            continue
        if upstream_id in ids:
            errors.append(f"duplicated incident id {upstream_id}")
        ids.add(str(upstream_id))

        precision = props.get("position_precision_m")
        if precision is not None and float(precision) <= 0:
            errors.append(f"incident {upstream_id} has non-positive precision")

        if props.get("status") is not None and not props.get("official_confirmed"):
            errors.append(f"incident {upstream_id} declares status without official confirmation")

        try:
            geom = shape(feature.get("geometry"))
        except Exception:
            errors.append(f"incident {upstream_id} has invalid geometry")
            continue
        if geom.is_empty or not geom.is_valid or geom.geom_type != "Point":
            errors.append(f"incident {upstream_id} geometry must be a valid Point")

    expected = manifest.get("counts", {}).get("incidents_total") or manifest.get("counts", {}).get("incidents")
    if expected is not None and int(expected) > 0 and len(features) == 0:
        errors.append("suspicious empty incidents collection")

    return errors


def _ensure_source(session: Session) -> None:
    source = session.get(Source, SOURCE_ID)
    if source is None:
        session.add(
            Source(
                id=SOURCE_ID,
                name="Wildfire public feed",
                kind="wildfire",
                enabled=True,
                criticality="high",
                created_at=now_utc(),
            )
        )


def _ensure_upstream_sources(session: Session, sources_payload: dict[str, Any]) -> None:
    for item in sources_payload.get("sources") or []:
        source_id = str(item.get("id") or "").strip()
        if not source_id or session.get(Source, source_id) is not None:
            continue
        session.add(
            Source(
                id=source_id,
                name=str(item.get("name") or source_id),
                kind=str(item.get("kind") or "external"),
                enabled=item.get("status") != "disabled",
                criticality="high" if item.get("critical") else "normal",
                created_at=now_utc(),
            )
        )


def _store_raw_payloads(session: Session, run_id: str, payloads: dict[str, bytes]) -> dict[str, RawPayload]:
    fetched_at = now_utc()
    date_part = fetched_at.date().isoformat()
    stored: dict[str, RawPayload] = {}
    for artifact, body in payloads.items():
        content_hash = sha256_bytes(body)
        target_dir = RAW_ROOT / f"source={SOURCE_ID}" / f"date={date_part}" / f"run={run_id}"
        target_dir.mkdir(parents=True, exist_ok=True)
        target = target_dir / f"{artifact}-{content_hash[:16]}.json"
        if not target.exists():
            target.write_bytes(body)

        raw = RawPayload(
            id=str(uuid4()),
            source_run_id=run_id,
            source_id=SOURCE_ID,
            content_hash=content_hash,
            media_type="application/json",
            storage_uri=str(target),
            fetched_at=fetched_at,
            payload_metadata={"artifact": artifact},
        )
        session.add(raw)
        stored[artifact] = raw
    session.flush()
    return stored


def _feature_version(feature: dict[str, Any]) -> str:
    return hashlib.sha256(canonical_json(feature).encode("utf-8")).hexdigest()[:32]


def _status_source(props: dict[str, Any]) -> str | None:
    if props.get("status") is None:
        return None
    confirmed_by = str(props.get("confirmed_by") or "").split(",")[0].strip()
    return confirmed_by or SOURCE_ID


def _observation_attrs(props: dict[str, Any], manifest: dict[str, Any]) -> dict[str, Any]:
    attrs = dict(props)
    attrs["upstream_incident_id"] = props.get("id")
    attrs["manifest_generated_at"] = manifest.get("generated_at")
    attrs["data_age_seconds"] = manifest.get("data_age_seconds")
    attrs["worst_data_age_seconds"] = manifest.get("worst_data_age_seconds")
    attrs["status_source_id"] = _status_source(props)
    return attrs


def _event_snapshot_from_observation(obs: Observation, point: Point) -> dict[str, Any]:
    attrs = obs.attributes
    observed_at = obs.observed_at
    municipality = attrs.get("municipio") or attrs.get("nucleo_cercano")
    title_place = f" cerca de {municipality}" if municipality else ""
    status_source_id = attrs.get("status_source_id")
    status = attrs.get("status")
    return {
        "event_type": "wildfire",
        "subtype": attrs.get("origin"),
        "title": f"Incendio{title_place}",
        "summary": attrs.get("detalle_oficial") or attrs.get("suelo_clase"),
        "status": status,
        "status_source_id": status_source_id if status else None,
        "severity": attrs.get("intensity"),
        "severity_source_id": SOURCE_ID if attrs.get("intensity") else None,
        "geometry": {"type": "Point", "coordinates": [point.x, point.y]},
        "precision_m": obs.precision_m,
        "confidence": obs.confidence,
        "valid_from": obs.observed_at,
        "valid_to": None,
        "last_observed_at": observed_at,
        "attributes": {
            "upstream_incident_id": attrs.get("upstream_incident_id"),
            "origin": attrs.get("origin"),
            "satellite_confirmed": attrs.get("satellite_confirmed"),
            "official_confirmed": attrs.get("official_confirmed"),
            "confirmed_by": attrs.get("confirmed_by"),
            "sensors": attrs.get("sensors"),
            "area_est_ha": attrs.get("area_est_ha"),
            "manifest_generated_at": attrs.get("manifest_generated_at"),
            "data_age_seconds": attrs.get("data_age_seconds"),
            "worst_data_age_seconds": attrs.get("worst_data_age_seconds"),
        },
    }


def _snapshot_event(event: Event) -> dict[str, Any]:
    return {
        "title": event.title,
        "summary": event.summary,
        "status": event.status,
        "status_source_id": event.status_source_id,
        "severity": event.severity,
        "severity_source_id": event.severity_source_id,
        "precision_m": event.precision_m,
        "valid_from": event.valid_from.isoformat() if event.valid_from else None,
        "valid_to": event.valid_to.isoformat() if event.valid_to else None,
        "last_observed_at": event.last_observed_at.isoformat() if event.last_observed_at else None,
        "attributes": event.attributes,
    }


def _changed_fields(event: Event, snapshot: dict[str, Any]) -> list[str]:
    current = _snapshot_event(event)
    changed: list[str] = []
    for field in RELEVANT_EVENT_FIELDS:
        if field == "geometry":
            continue
        new_value = snapshot.get(field)
        if isinstance(new_value, datetime):
            new_value = new_value.isoformat()
        if current.get(field) != new_value:
            changed.append(field)
    old_coords = event.attributes.get("geometry_coordinates")
    if old_coords != snapshot["geometry"]["coordinates"]:
        changed.append("geometry")
    return changed


def _find_event(session: Session, upstream_id: str) -> Event | None:
    return session.scalar(
        select(Event).where(Event.attributes["upstream_incident_id"].astext == upstream_id)
    )


def ingest_wildfire_public(
    session: Session,
    *,
    fixture: Path | None = None,
    base_url: str | None = None,
) -> IngestSummary:
    if bool(fixture) == bool(base_url):
        raise WildfireFeedError("Provide exactly one of fixture or base_url")

    run_id = str(uuid4())
    started_at = now_utc()
    _ensure_source(session)
    run = SourceRun(
        id=run_id,
        source_id=SOURCE_ID,
        started_at=started_at,
        finished_at=None,
        status="failed",
        records_downloaded=0,
        records_accepted=0,
        records_rejected=0,
        latest_observed_at=None,
        raw_payload_count=0,
        error_type=None,
        error_message=None,
    )
    session.add(run)
    session.flush()

    payloads = _read_fixture(fixture) if fixture else _read_base_url(str(base_url))
    raw_payloads = _store_raw_payloads(session, run_id, payloads)
    manifest = _json_payload(payloads["manifest"], "manifest.json")
    incidents = _json_payload(payloads["incidents"], "incidents.geojson")
    sources = _json_payload(payloads["sources"], "sources.json")
    errors = _validate_feed(manifest, incidents, sources)
    features: list[dict[str, Any]] = incidents.get("features") or []

    if errors:
        run.status = "failed"
        run.error_type = "validation"
        run.error_message = "; ".join(errors[:5])
        run.records_downloaded = len(features)
        run.records_rejected = len(features)
        run.raw_payload_count = len(raw_payloads)
        run.finished_at = now_utc()
        session.commit()
        raise WildfireFeedError(run.error_message)

    _ensure_upstream_sources(session, sources)

    observations_created = observations_existing = events_created = events_updated = revisions_created = 0
    latest_observed_at = None

    for feature in features:
        props = feature["properties"]
        upstream_id = str(props["id"])
        point = shape(feature["geometry"])
        assert isinstance(point, Point)
        version = _feature_version(feature)
        observed_at = parse_utc(props.get("last_detected") or props.get("first_detected"))
        latest_observed_at = max(latest_observed_at, observed_at) if latest_observed_at and observed_at else observed_at or latest_observed_at

        existing_observation = session.scalar(
            select(Observation).where(
                Observation.source_id == SOURCE_ID,
                Observation.source_record_id == upstream_id,
                Observation.source_version == version,
            )
        )
        if existing_observation:
            observations_existing += 1
            continue

        observation = Observation(
            id=str(uuid4()),
            source_id=SOURCE_ID,
            source_record_id=upstream_id,
            source_version=version,
            event_type="wildfire",
            observed_at=observed_at,
            published_at=parse_utc(manifest.get("generated_at")),
            ingested_at=now_utc(),
            geometry=from_shape(point, srid=4326),
            precision_m=float(props["position_precision_m"]),
            confidence=None,
            attributes=_observation_attrs(props, manifest),
            raw_payload_id=raw_payloads["incidents"].id,
        )
        session.add(observation)
        session.flush()
        observations_created += 1

        event_snapshot = _event_snapshot_from_observation(observation, point)
        event = _find_event(session, upstream_id)
        if event is None:
            event = Event(
                id=str(uuid4()),
                event_type="wildfire",
                subtype=event_snapshot["subtype"],
                title=event_snapshot["title"],
                summary=event_snapshot["summary"],
                status=event_snapshot["status"],
                status_source_id=event_snapshot["status_source_id"],
                severity=event_snapshot["severity"],
                severity_source_id=event_snapshot["severity_source_id"],
                geometry=from_shape(point, srid=4326),
                precision_m=event_snapshot["precision_m"],
                confidence=event_snapshot["confidence"],
                valid_from=event_snapshot["valid_from"],
                valid_to=event_snapshot["valid_to"],
                last_observed_at=event_snapshot["last_observed_at"],
                created_at=now_utc(),
                updated_at=now_utc(),
                attributes={**event_snapshot["attributes"], "geometry_coordinates": [point.x, point.y]},
            )
            session.add(event)
            session.flush()
            events_created += 1
        else:
            changed = _changed_fields(event, event_snapshot)
            if changed:
                previous = _snapshot_event(event)
                revision_number = (
                    session.scalar(
                        select(func.coalesce(func.max(EventRevision.revision_number), 0)).where(
                            EventRevision.event_id == event.id
                        )
                    )
                    or 0
                ) + 1
                event.subtype = event_snapshot["subtype"]
                event.title = event_snapshot["title"]
                event.summary = event_snapshot["summary"]
                event.status = event_snapshot["status"]
                event.status_source_id = event_snapshot["status_source_id"]
                event.severity = event_snapshot["severity"]
                event.severity_source_id = event_snapshot["severity_source_id"]
                event.geometry = from_shape(point, srid=4326)
                event.precision_m = event_snapshot["precision_m"]
                event.confidence = event_snapshot["confidence"]
                event.valid_from = event_snapshot["valid_from"]
                event.valid_to = event_snapshot["valid_to"]
                event.last_observed_at = event_snapshot["last_observed_at"]
                event.updated_at = now_utc()
                event.attributes = {**event_snapshot["attributes"], "geometry_coordinates": [point.x, point.y]}
                session.add(
                    EventRevision(
                        id=str(uuid4()),
                        event_id=event.id,
                        revision_number=revision_number,
                        changed_at=now_utc(),
                        changed_fields=changed,
                        previous_snapshot=previous,
                        new_snapshot=_snapshot_event(event),
                        reason="wildfire observation changed relevant event fields",
                        source_observation_ids=[observation.id],
                    )
                )
                events_updated += 1
                revisions_created += 1

        session.add(
            EventObservation(
                event_id=event.id,
                observation_id=observation.id,
                relation_type="supports",
                score=1.0,
                reconciliation_version=RECONCILIATION_VERSION,
                created_at=now_utc(),
            )
        )
        try:
            session.flush()
        except IntegrityError:
            session.rollback()
            raise

    run.status = "empty" if not features else "success"
    run.records_downloaded = len(features)
    run.records_accepted = observations_created + observations_existing
    run.records_rejected = 0
    run.latest_observed_at = latest_observed_at
    run.raw_payload_count = len(raw_payloads)
    run.finished_at = now_utc()
    session.commit()
    log.info("wildfire ingestion complete", extra={"run_id": run_id, "source_id": SOURCE_ID})

    return IngestSummary(
        run_id=run_id,
        status=run.status,
        payloads=len(raw_payloads),
        observations_created=observations_created,
        observations_existing=observations_existing,
        events_created=events_created,
        events_updated=events_updated,
        revisions_created=revisions_created,
        records_rejected=0,
    )
