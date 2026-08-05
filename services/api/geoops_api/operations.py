from __future__ import annotations

import json
from collections import Counter
from datetime import datetime, timedelta
from typing import Any, cast
from uuid import uuid4

from geoalchemy2.shape import from_shape
from shapely.geometry import Point
from sqlalchemy import ColumnElement, and_, delete, func, select
from sqlalchemy.orm import Session

from geoops_api.models import (
    Alert,
    AlertRule,
    Asset,
    Event,
    EventObservation,
    EventRevision,
    Impact,
    Observation,
    RawPayload,
    Source,
    SourceRun,
)
from geoops_api.time import iso_utc, now_utc, parse_utc

MAX_LIMIT = 200
CALCULATION_VERSION = "proximity-v1"
DEFAULT_TTL_SECONDS_BY_SOURCE = {
    "wildfire-public": 86_400,
}
STALE_STATUS_REASON = "data or download age exceeded ttl"


def _geometry_json(session: Session, geometry: Any) -> dict[str, Any]:
    geojson = session.scalar(select(func.ST_AsGeoJSON(geometry)))
    return cast(dict[str, Any], json.loads(str(geojson)))


def _event_feature(session: Session, event: Event) -> dict[str, Any]:
    sources = session.scalars(
        select(Observation.source_id)
        .join(EventObservation, EventObservation.observation_id == Observation.id)
        .where(EventObservation.event_id == event.id)
        .distinct()
    ).all()
    return {
        "type": "Feature",
        "geometry": _geometry_json(session, event.geometry),
        "properties": {
            "id": event.id,
            "type": event.event_type,
            "subtype": event.subtype,
            "title": event.title,
            "summary": event.summary,
            "status": event.status,
            "status_source_id": event.status_source_id,
            "severity": event.severity,
            "severity_source_id": event.severity_source_id,
            "precision_m": event.precision_m,
            "confidence": event.confidence,
            "valid_from": iso_utc(event.valid_from),
            "valid_to": iso_utc(event.valid_to),
            "last_observed_at": iso_utc(event.last_observed_at),
            "created_at": iso_utc(event.created_at),
            "updated_at": iso_utc(event.updated_at),
            "sources": sources,
            "attributes": event.attributes,
        },
    }


def list_events(
    session: Session,
    *,
    bbox: str | None,
    types: str | None,
    from_time: str | None,
    to_time: str | None,
    updated_after: str | None,
    status: str | None,
    sources: str | None,
    has_impact: bool | None,
    has_alert: bool | None,
    limit: int,
    cursor: str | None,
) -> dict[str, Any]:
    bounded_limit = min(max(limit, 1), MAX_LIMIT)
    stmt = select(Event)
    filters: list[ColumnElement[bool]] = []
    if bbox:
        parts = [float(part) for part in bbox.split(",")]
        if len(parts) != 4 or parts[0] >= parts[2] or parts[1] >= parts[3]:
            raise ValueError("bbox must be west,south,east,north")
        filters.append(
            cast(
                ColumnElement[bool],
                func.ST_Intersects(
                    Event.geometry,
                    func.ST_MakeEnvelope(parts[0], parts[1], parts[2], parts[3], 4326),
                ),
            )
        )
    if types:
        filters.append(Event.event_type.in_([part.strip() for part in types.split(",") if part.strip()]))
    if from_time:
        filters.append(Event.last_observed_at >= parse_utc(from_time))
    if to_time:
        filters.append(Event.last_observed_at <= parse_utc(to_time))
    if updated_after:
        filters.append(Event.updated_at > parse_utc(updated_after))
    if status:
        statuses = [part.strip() for part in status.split(",") if part.strip()]
        filters.append(Event.status.in_(statuses))
    if sources:
        source_ids = [part.strip() for part in sources.split(",") if part.strip()]
        filters.append(
            Event.id.in_(
                select(EventObservation.event_id)
                .join(Observation, Observation.id == EventObservation.observation_id)
                .where(Observation.source_id.in_(source_ids))
            )
        )
    if has_impact is not None:
        impact_subquery = select(Impact.event_id)
        filters.append(Event.id.in_(impact_subquery) if has_impact else Event.id.not_in(impact_subquery))
    if has_alert is not None:
        alert_subquery = select(Alert.event_id).where(Alert.status == "open")
        filters.append(Event.id.in_(alert_subquery) if has_alert else Event.id.not_in(alert_subquery))
    if cursor:
        filters.append(Event.id > cursor)
    if filters:
        stmt = stmt.where(and_(*filters))
    events = session.scalars(stmt.order_by(Event.id).limit(bounded_limit + 1)).all()
    next_cursor = events[-1].id if len(events) > bounded_limit else None
    events = events[:bounded_limit]
    return {
        "type": "FeatureCollection",
        "features": [_event_feature(session, event) for event in events],
        "meta": {
            "next_cursor": next_cursor,
            "generated_at": iso_utc(now_utc()),
            "partial": False,
        },
    }


def _latest_raw_json(session: Session, artifact: str) -> dict[str, Any] | None:
    raw = session.scalar(
        select(RawPayload)
        .where(RawPayload.payload_metadata["artifact"].astext == artifact)
        .order_by(RawPayload.fetched_at.desc())
    )
    if raw is None:
        return None
    try:
        with open(raw.storage_uri, encoding="utf-8") as file:
            payload = json.load(file)
    except OSError:
        return None
    return cast(dict[str, Any], payload)


def _age_seconds(value: Any) -> int | None:
    parsed = parse_utc(value) if isinstance(value, str) else value
    if parsed is None:
        return None
    return max(0, int((now_utc() - parsed).total_seconds()))


def _iso_from_age(reference: datetime | None, age_seconds: Any) -> str | None:
    if reference is None or age_seconds is None:
        return None
    return iso_utc(reference - timedelta(seconds=int(age_seconds)))


def _manifest_operational_state(session: Session) -> dict[str, Any]:
    manifest = _latest_raw_json(session, "manifest") or {}
    return {
        "generated_at": manifest.get("generated_at"),
        "pipeline_age_seconds": manifest.get("pipeline_age_seconds")
        if manifest.get("pipeline_age_seconds") is not None
        else _age_seconds(manifest.get("generated_at")),
        "data_age_seconds": manifest.get("data_age_seconds") or {},
        "worst_data_age_seconds": manifest.get("worst_data_age_seconds"),
        "counts": manifest.get("counts") or {},
        "frp_total_mw": manifest.get("frp_total_mw"),
        "degraded": bool(manifest.get("degraded")),
        "degraded_reason": manifest.get("degraded_reason"),
        "demo": bool(manifest.get("demo")),
        "demo_reason": manifest.get("demo_reason"),
    }


def operations_summary(session: Session) -> dict[str, Any]:
    events = session.scalars(select(Event)).all()
    open_alerts = session.scalars(select(Alert).where(Alert.status == "open")).all()
    impacted_event_ids = set(session.scalars(select(Impact.event_id)).all())
    sources = list_source_health(session)
    latest_observed = max((event.last_observed_at for event in events if event.last_observed_at), default=None)
    latest_updated = max((event.updated_at for event in events if event.updated_at), default=None)
    status_counts = Counter(event.status or "desconocido" for event in events)
    type_counts = Counter(event.event_type for event in events)
    source_counts = Counter(source_id for event in events for source_id in _event_feature(session, event)["properties"]["sources"])
    degraded_sources = [
        source["id"]
        for source in sources
        if source.get("freshness_status") in {"partial", "stale", "failed", "disabled"}
        or ((source.get("last_run") or {}).get("status") not in {None, "success", "empty"})
    ]
    return {
        "generated_at": iso_utc(now_utc()),
        "events_total": len(events),
        "events_by_status": dict(status_counts),
        "events_by_type": dict(type_counts),
        "events_by_source": dict(source_counts),
        "events_recent_24h": sum(
            1 for event in events if event.last_observed_at and (now_utc() - event.last_observed_at).total_seconds() <= 86_400
        ),
        "events_with_impact": len(impacted_event_ids),
        "open_alerts": len(open_alerts),
        "assets_total": session.scalar(select(func.count()).select_from(Asset)) or 0,
        "sources_total": len(sources),
        "sources_degraded": degraded_sources,
        "source_health": {
            "stale_sources": [source["id"] for source in sources if source.get("freshness_status") == "stale"],
            "failed_sources": [source["id"] for source in sources if source.get("freshness_status") == "failed"],
            "worst_data_age_seconds": max(
                (source["data_age_seconds"] for source in sources if source.get("data_age_seconds") is not None),
                default=None,
            ),
            "worst_download_age_seconds": max(
                (
                    source["download_age_seconds"]
                    for source in sources
                    if source.get("download_age_seconds") is not None
                ),
                default=None,
            ),
            "latest_success_at": max(
                (source["last_success_at"] for source in sources if source.get("last_success_at")),
                default=None,
            ),
        },
        "latest_observed_at": iso_utc(latest_observed),
        "latest_ingested_at": iso_utc(latest_updated),
        "manifest": _manifest_operational_state(session),
    }


def get_event_detail(session: Session, event_id: str) -> dict[str, Any] | None:
    event = session.get(Event, event_id)
    if event is None:
        return None
    feature = _event_feature(session, event)
    feature["properties"]["observations_count"] = session.scalar(
        select(func.count()).select_from(EventObservation).where(EventObservation.event_id == event_id)
    )
    feature["properties"]["revisions_count"] = session.scalar(
        select(func.count()).select_from(EventRevision).where(EventRevision.event_id == event_id)
    )
    feature["properties"]["impacts_count"] = session.scalar(
        select(func.count()).select_from(Impact).where(Impact.event_id == event_id)
    )
    return feature


def list_event_observations(session: Session, event_id: str) -> list[dict[str, Any]]:
    rows = session.execute(
        select(Observation, EventObservation)
        .join(EventObservation, EventObservation.observation_id == Observation.id)
        .where(EventObservation.event_id == event_id)
        .order_by(Observation.ingested_at)
    ).all()
    return [
        {
            "id": obs.id,
            "source_id": obs.source_id,
            "source_record_id": obs.source_record_id,
            "source_version": obs.source_version,
            "event_type": obs.event_type,
            "observed_at": iso_utc(obs.observed_at),
            "published_at": iso_utc(obs.published_at),
            "ingested_at": iso_utc(obs.ingested_at),
            "geometry": _geometry_json(session, obs.geometry),
            "precision_m": obs.precision_m,
            "confidence": obs.confidence,
            "attributes": obs.attributes,
            "relation_type": rel.relation_type,
            "reconciliation_version": rel.reconciliation_version,
        }
        for obs, rel in rows
    ]


def list_event_revisions(session: Session, event_id: str) -> list[dict[str, Any]]:
    revisions = session.scalars(
        select(EventRevision).where(EventRevision.event_id == event_id).order_by(EventRevision.revision_number)
    ).all()
    return [
        {
            "id": rev.id,
            "event_id": rev.event_id,
            "revision_number": rev.revision_number,
            "changed_at": iso_utc(rev.changed_at),
            "changed_fields": rev.changed_fields,
            "previous_snapshot": rev.previous_snapshot,
            "new_snapshot": rev.new_snapshot,
            "reason": rev.reason,
            "source_observation_ids": rev.source_observation_ids,
        }
        for rev in revisions
    ]


def event_timeline(session: Session, event_id: str) -> dict[str, Any] | None:
    if session.get(Event, event_id) is None:
        return None
    observations = list_event_observations(session, event_id)
    revisions = list_event_revisions(session, event_id)
    points = [
        {
            "kind": "observation",
            "timestamp": obs["observed_at"] or obs["ingested_at"],
            "source_id": obs["source_id"],
            "label": f"Observacion {obs['source_id']}",
            "precision_m": obs["precision_m"],
            "payload": obs,
        }
        for obs in observations
    ]
    points.extend(
        {
            "kind": "revision",
            "timestamp": rev["changed_at"],
            "source_id": None,
            "label": f"Revision {rev['revision_number']}",
            "changed_fields": rev["changed_fields"],
            "payload": rev,
        }
        for rev in revisions
    )
    points.sort(key=lambda item: str(item["timestamp"] or ""))
    return {
        "event_id": event_id,
        "generated_at": iso_utc(now_utc()),
        "points": points,
    }


def list_sources(session: Session) -> list[dict[str, Any]]:
    return [
        {
            "id": source.id,
            "name": source.name,
            "kind": source.kind,
            "enabled": source.enabled,
            "criticality": source.criticality,
            "created_at": iso_utc(source.created_at),
        }
        for source in session.scalars(select(Source).order_by(Source.id)).all()
    ]


def list_source_health(session: Session) -> list[dict[str, Any]]:
    sources = list_sources(session)
    source_payload = _latest_raw_json(session, "sources") or {}
    manifest = _manifest_operational_state(session)
    source_generated_at = parse_utc(source_payload.get("generated_at"))
    source_metadata = {str(item.get("id")): item for item in source_payload.get("sources") or []}
    runs_by_source: dict[str, SourceRun] = {}
    successful_runs_by_source: dict[str, SourceRun] = {}
    for run in session.scalars(select(SourceRun).order_by(SourceRun.source_id, SourceRun.started_at.desc())).all():
        runs_by_source.setdefault(run.source_id, run)
        if run.status == "success" and run.records_accepted > 0:
            successful_runs_by_source.setdefault(run.source_id, run)
    for source in sources:
        latest_run = runs_by_source.get(source["id"])
        latest_success_run = successful_runs_by_source.get(source["id"])
        metadata = source_metadata.get(str(source["id"]), {})
        metadata_status = metadata.get("status")
        run_status = latest_run.status if latest_run else ("disabled" if not source["enabled"] else "failed")
        ttl_seconds = metadata.get("ttl_seconds") or DEFAULT_TTL_SECONDS_BY_SOURCE.get(str(source["id"]))
        last_download_at = (
            iso_utc(latest_run.finished_at or latest_run.started_at)
            if latest_run
            else metadata.get("last_download_at") or metadata.get("last_success_at")
        )
        last_success_at = (
            iso_utc(latest_success_run.finished_at or latest_success_run.started_at)
            if latest_success_run
            else metadata.get("last_success_at")
        )
        latest_observed_at = (
            iso_utc(latest_success_run.latest_observed_at)
            if latest_success_run and latest_success_run.latest_observed_at
            else metadata.get("latest_observed_at")
            or metadata.get("latest_data_at")
            or _iso_from_age(source_generated_at, metadata.get("data_age_seconds"))
        )
        download_age_seconds = _age_seconds(last_download_at)
        data_age_seconds = _age_seconds(latest_observed_at)

        freshness_status = "disabled" if not source["enabled"] else run_status
        if metadata_status in {"ok", "success"} and latest_run is None:
            freshness_status = "success"
        elif metadata_status in {"stale", "error", "disabled"}:
            freshness_status = "failed" if metadata_status == "error" else metadata_status
        if latest_run and latest_run.records_rejected and latest_run.records_accepted:
            freshness_status = "partial"
        stale_reason = metadata.get("stale_reason")
        if (
            freshness_status in {"success", "empty"}
            and ttl_seconds is not None
            and (
                (data_age_seconds is not None and data_age_seconds > int(ttl_seconds))
                or (download_age_seconds is not None and download_age_seconds > int(ttl_seconds))
            )
        ):
            freshness_status = "stale"
            stale_reason = stale_reason or STALE_STATUS_REASON
        source["last_run"] = None if latest_run is None else {
            "id": latest_run.id,
            "status": latest_run.status,
            "started_at": iso_utc(latest_run.started_at),
            "finished_at": iso_utc(latest_run.finished_at),
            "records_downloaded": latest_run.records_downloaded,
            "records_accepted": latest_run.records_accepted,
            "records_rejected": latest_run.records_rejected,
            "latest_observed_at": iso_utc(latest_run.latest_observed_at),
            "error_type": latest_run.error_type,
            "error_message": latest_run.error_message,
        }
        source["region"] = metadata.get("region")
        source["organism"] = metadata.get("name") or source["name"]
        source["freshness_status"] = freshness_status
        source["last_download_at"] = last_download_at
        source["last_success_at"] = last_success_at
        source["latest_observed_at"] = latest_observed_at
        source["download_age_seconds"] = download_age_seconds
        source["data_age_seconds"] = data_age_seconds if data_age_seconds is not None else manifest["data_age_seconds"].get(source["id"])
        source["pipeline_age_seconds"] = manifest["pipeline_age_seconds"]
        source["ttl_seconds"] = ttl_seconds
        source["records"] = metadata.get("records") if metadata.get("records") is not None else (
            latest_success_run.records_accepted if latest_success_run else latest_run.records_accepted if latest_run else None
        )
        source["precision_m"] = metadata.get("precision_m")
        source["coverage"] = metadata.get("region")
        source["stale_reason"] = stale_reason
        source["error"] = metadata.get("error") or (latest_run.error_message if latest_run else None)
        source["consecutive_failures"] = metadata.get("consecutive_failures")
    return sources


def list_source_runs(session: Session) -> list[dict[str, Any]]:
    return [
        {
            "id": run.id,
            "source_id": run.source_id,
            "status": run.status,
            "started_at": iso_utc(run.started_at),
            "finished_at": iso_utc(run.finished_at),
            "records_downloaded": run.records_downloaded,
            "records_accepted": run.records_accepted,
            "records_rejected": run.records_rejected,
            "latest_observed_at": iso_utc(run.latest_observed_at),
        }
        for run in session.scalars(select(SourceRun).order_by(SourceRun.started_at.desc())).all()
    ]


def _asset_dict(session: Session, asset: Asset) -> dict[str, Any]:
    geom = _geometry_json(session, asset.geometry)
    lon, lat = geom["coordinates"]
    return {
        "id": asset.id,
        "name": asset.name,
        "asset_type": asset.asset_type,
        "longitude": lon,
        "latitude": lat,
        "criticality": asset.criticality,
        "created_at": iso_utc(asset.created_at),
        "updated_at": iso_utc(asset.updated_at),
    }


def create_asset(session: Session, payload: dict[str, Any]) -> dict[str, Any]:
    lon = float(payload["longitude"])
    lat = float(payload["latitude"])
    if not (-180 <= lon <= 180 and -90 <= lat <= 90):
        raise ValueError("longitude/latitude out of range")
    asset = Asset(
        id=str(uuid4()),
        name=str(payload["name"]),
        asset_type=str(payload.get("asset_type") or "site"),
        geometry=from_shape(Point(lon, lat), srid=4326),
        criticality=str(payload.get("criticality") or "normal"),
        created_at=now_utc(),
        updated_at=now_utc(),
    )
    session.add(asset)
    session.flush()
    recalculate_impacts(session)
    evaluate_alerts(session)
    session.commit()
    return _asset_dict(session, asset)


def list_assets(session: Session) -> list[dict[str, Any]]:
    return [_asset_dict(session, asset) for asset in session.scalars(select(Asset).order_by(Asset.name)).all()]


def delete_asset(session: Session, asset_id: str) -> None:
    session.execute(delete(Alert).where(Alert.asset_id == asset_id))
    session.execute(delete(AlertRule).where(AlertRule.asset_id == asset_id))
    session.execute(delete(Impact).where(Impact.asset_id == asset_id))
    session.execute(delete(Asset).where(Asset.id == asset_id))
    session.commit()


def recalculate_impacts(session: Session) -> int:
    events = session.scalars(select(Event)).all()
    assets = session.scalars(select(Asset)).all()
    changed = 0
    for event in events:
        for asset in assets:
            distance_m = float(
                session.scalar(
                    select(
                        func.ST_DistanceSphere(
                            event.geometry,
                            asset.geometry,
                        )
                    )
                )
                or 0
            )
            intersects = bool(session.scalar(select(func.ST_Intersects(event.geometry, asset.geometry))))
            score = max(0.0, 1.0 - min(distance_m, 100_000.0) / 100_000.0)
            impact = session.scalar(
                select(Impact).where(
                    Impact.event_id == event.id,
                    Impact.asset_id == asset.id,
                    Impact.calculation_version == CALCULATION_VERSION,
                )
            )
            reasons = [
                f"{event.title} está a {distance_m:.0f} m de {asset.name}",
                "Distancia calculada con ST_DistanceSphere sobre SRID 4326",
            ]
            if impact is None:
                impact = Impact(
                    id=str(uuid4()),
                    event_id=event.id,
                    asset_id=asset.id,
                    impact_type="proximity",
                    distance_m=distance_m,
                    intersects=intersects,
                    score=score,
                    reasons=reasons,
                    calculated_at=now_utc(),
                    calculation_version=CALCULATION_VERSION,
                )
                session.add(impact)
                changed += 1
            else:
                impact.distance_m = distance_m
                impact.intersects = intersects
                impact.score = score
                impact.reasons = reasons
                impact.calculated_at = now_utc()
    session.flush()
    return changed


def list_event_impacts(session: Session, event_id: str) -> list[dict[str, Any]]:
    rows = session.execute(
        select(Impact, Asset).join(Asset, Asset.id == Impact.asset_id).where(Impact.event_id == event_id)
    ).all()
    return [
        {
            "id": impact.id,
            "event_id": impact.event_id,
            "asset_id": impact.asset_id,
            "asset_name": asset.name,
            "impact_type": impact.impact_type,
            "distance_m": impact.distance_m,
            "intersects": impact.intersects,
            "score": impact.score,
            "reasons": impact.reasons,
            "calculated_at": iso_utc(impact.calculated_at),
            "calculation_version": impact.calculation_version,
        }
        for impact, asset in rows
    ]


def create_alert_rule(session: Session, payload: dict[str, Any]) -> dict[str, Any]:
    rule = AlertRule(
        id=str(uuid4()),
        name=str(payload["name"]),
        enabled=bool(payload.get("enabled", True)),
        event_type=str(payload.get("event_type") or "wildfire"),
        asset_id=str(payload["asset_id"]),
        distance_threshold_m=float(payload["distance_threshold_m"]),
        cooldown_minutes=int(payload.get("cooldown_minutes") or 0),
        created_at=now_utc(),
        updated_at=now_utc(),
    )
    session.add(rule)
    session.flush()
    evaluate_alerts(session)
    session.commit()
    return _rule_dict(rule)


def _rule_dict(rule: AlertRule) -> dict[str, Any]:
    return {
        "id": rule.id,
        "name": rule.name,
        "enabled": rule.enabled,
        "event_type": rule.event_type,
        "asset_id": rule.asset_id,
        "distance_threshold_m": rule.distance_threshold_m,
        "cooldown_minutes": rule.cooldown_minutes,
        "created_at": iso_utc(rule.created_at),
        "updated_at": iso_utc(rule.updated_at),
    }


def list_alert_rules(session: Session) -> list[dict[str, Any]]:
    return [_rule_dict(rule) for rule in session.scalars(select(AlertRule).order_by(AlertRule.created_at)).all()]


def evaluate_alerts(session: Session) -> int:
    created = 0
    rules = session.scalars(select(AlertRule).where(AlertRule.enabled.is_(True))).all()
    for rule in rules:
        rows = session.execute(
            select(Impact, Event, Asset)
            .join(Event, Event.id == Impact.event_id)
            .join(Asset, Asset.id == Impact.asset_id)
            .where(
                Impact.asset_id == rule.asset_id,
                Event.event_type == rule.event_type,
                Impact.distance_m <= rule.distance_threshold_m,
            )
        ).all()
        for impact, event, asset in rows:
            revision = session.scalar(
                select(func.coalesce(func.max(EventRevision.revision_number), 0)).where(EventRevision.event_id == event.id)
            ) or 0
            dedup = f"{rule.id}:{event.id}:{asset.id}:{revision}"
            existing = session.scalar(select(Alert).where(Alert.deduplication_key == dedup))
            if existing is not None:
                continue
            alert = Alert(
                id=str(uuid4()),
                rule_id=rule.id,
                event_id=event.id,
                asset_id=asset.id,
                impact_id=impact.id,
                status="open",
                message=(
                    f"{event.title} está a {impact.distance_m:.0f} m de {asset.name}; "
                    f"umbral {rule.distance_threshold_m:.0f} m; fuente {event.status_source_id or 'sin estado oficial'}"
                ),
                deduplication_key=dedup,
                created_at=now_utc(),
                acknowledged_at=None,
                resolved_at=None,
            )
            session.add(alert)
            session.flush()
            created += 1
    return created


def list_alerts(session: Session) -> list[dict[str, Any]]:
    rows = session.execute(
        select(Alert, Event, Asset, Impact)
        .join(Event, Event.id == Alert.event_id)
        .join(Asset, Asset.id == Alert.asset_id)
        .join(Impact, Impact.id == Alert.impact_id)
        .order_by(Alert.created_at.desc())
    ).all()
    return [
        {
            "id": alert.id,
            "rule_id": alert.rule_id,
            "event_id": alert.event_id,
            "event_title": event.title,
            "asset_id": alert.asset_id,
            "asset_name": asset.name,
            "impact_id": alert.impact_id,
            "distance_m": impact.distance_m,
            "status": alert.status,
            "message": alert.message,
            "deduplication_key": alert.deduplication_key,
            "created_at": iso_utc(alert.created_at),
            "acknowledged_at": iso_utc(alert.acknowledged_at),
            "resolved_at": iso_utc(alert.resolved_at),
        }
        for alert, event, asset, impact in rows
    ]


def acknowledge_alert(session: Session, alert_id: str) -> dict[str, Any] | None:
    alert = session.get(Alert, alert_id)
    if alert is None:
        return None
    alert.status = "acknowledged"
    alert.acknowledged_at = now_utc()
    session.commit()
    return next(item for item in list_alerts(session) if item["id"] == alert_id)
