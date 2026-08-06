"""Pydantic contract models for the GeoOps API.

These mirror the exact shapes produced by ``geoops_api.operations`` builders so
that FastAPI can declare ``response_model`` on every endpoint, publish a real
OpenAPI schema and let the frontend consume generated types instead of manual
ones. The builders keep returning plain dicts; these models validate and
document the responses. Datetime-like fields are ISO strings because the
builders serialize them through ``geoops_api.time.iso_utc``.
"""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel

JsonDict = dict[str, Any]


# --- Geometry -------------------------------------------------------------


class PointGeometry(BaseModel):
    type: str
    coordinates: tuple[float, float]


# --- Events ---------------------------------------------------------------


class EventProperties(BaseModel):
    id: str
    type: str
    subtype: str | None = None
    title: str
    summary: str | None = None
    status: str | None = None
    status_source_id: str | None = None
    severity: str | None = None
    severity_source_id: str | None = None
    precision_m: float | None = None
    confidence: float | None = None
    valid_from: str | None = None
    valid_to: str | None = None
    last_observed_at: str | None = None
    created_at: str | None = None
    updated_at: str | None = None
    sources: list[str]
    attributes: JsonDict


class EventDetailProperties(EventProperties):
    observations_count: int | None = None
    revisions_count: int | None = None
    impacts_count: int | None = None


class EventFeature(BaseModel):
    type: str
    geometry: PointGeometry
    properties: EventProperties


class EventDetailFeature(BaseModel):
    type: str
    geometry: PointGeometry
    properties: EventDetailProperties


class FeatureCollectionMeta(BaseModel):
    next_cursor: str | None = None
    generated_at: str | None = None
    partial: bool


class EventFeatureCollection(BaseModel):
    type: str
    features: list[EventFeature]
    meta: FeatureCollectionMeta


# --- Observations, revisions, timeline ------------------------------------


class Observation(BaseModel):
    id: str
    source_id: str
    source_record_id: str
    source_version: str
    event_type: str
    observed_at: str | None = None
    published_at: str | None = None
    ingested_at: str | None = None
    geometry: PointGeometry
    precision_m: float | None = None
    confidence: float | None = None
    attributes: JsonDict
    relation_type: str
    reconciliation_version: str


class Revision(BaseModel):
    id: str
    event_id: str
    revision_number: int
    changed_at: str | None = None
    changed_fields: list[str]
    previous_snapshot: JsonDict
    new_snapshot: JsonDict
    reason: str
    source_observation_ids: list[str]


class TimelinePoint(BaseModel):
    kind: str
    timestamp: str | None = None
    source_id: str | None = None
    label: str
    precision_m: float | None = None
    changed_fields: list[str] | None = None
    payload: JsonDict


class EventTimeline(BaseModel):
    event_id: str
    generated_at: str | None = None
    points: list[TimelinePoint]


# --- Operations summary ---------------------------------------------------


class SummarySourceHealth(BaseModel):
    stale_sources: list[str]
    failed_sources: list[str]
    worst_data_age_seconds: int | None = None
    worst_download_age_seconds: int | None = None
    latest_success_at: str | None = None


class ManifestState(BaseModel):
    generated_at: str | None = None
    pipeline_age_seconds: int | None = None
    data_age_seconds: dict[str, float]
    worst_data_age_seconds: int | None = None
    counts: dict[str, float]
    frp_total_mw: float | None = None
    degraded: bool
    degraded_reason: str | None = None
    demo: bool
    demo_reason: str | None = None


class OperationsSummary(BaseModel):
    generated_at: str | None = None
    events_total: int
    events_by_status: dict[str, int]
    events_by_type: dict[str, int]
    events_by_source: dict[str, int]
    events_recent_24h: int
    events_with_impact: int
    open_alerts: int
    assets_total: int
    sources_total: int
    sources_degraded: list[str]
    source_health: SummarySourceHealth
    latest_observed_at: str | None = None
    latest_ingested_at: str | None = None
    manifest: ManifestState


# --- Sources --------------------------------------------------------------


class Source(BaseModel):
    id: str
    name: str
    kind: str
    enabled: bool
    criticality: str
    created_at: str | None = None


class SourceLastRun(BaseModel):
    id: str
    status: str
    started_at: str | None = None
    finished_at: str | None = None
    records_downloaded: int
    records_accepted: int
    records_rejected: int
    latest_observed_at: str | None = None
    error_type: str | None = None
    error_message: str | None = None


class SourceHealth(Source):
    last_run: SourceLastRun | None = None
    region: str | None = None
    organism: str | None = None
    freshness_status: str
    last_download_at: str | None = None
    last_success_at: str | None = None
    latest_observed_at: str | None = None
    download_age_seconds: int | None = None
    data_age_seconds: int | None = None
    pipeline_age_seconds: int | None = None
    ttl_seconds: int | None = None
    records: int | None = None
    precision_m: float | None = None
    coverage: str | None = None
    stale_reason: str | None = None
    error: str | None = None
    consecutive_failures: int | None = None


class SourceRun(BaseModel):
    id: str
    source_id: str
    status: str
    started_at: str | None = None
    finished_at: str | None = None
    records_downloaded: int
    records_accepted: int
    records_rejected: int
    latest_observed_at: str | None = None


# --- Assets, impacts, rules, alerts ---------------------------------------


class Asset(BaseModel):
    id: str
    name: str
    asset_type: str
    longitude: float
    latitude: float
    criticality: str
    created_at: str | None = None
    updated_at: str | None = None


class Impact(BaseModel):
    id: str
    event_id: str
    asset_id: str
    asset_name: str
    impact_type: str
    distance_m: float
    intersects: bool
    score: float
    reasons: list[str]
    calculated_at: str | None = None
    calculation_version: str


class AlertRule(BaseModel):
    id: str
    name: str
    enabled: bool
    event_type: str
    asset_id: str
    distance_threshold_m: float
    cooldown_minutes: int
    created_at: str | None = None
    updated_at: str | None = None


class Alert(BaseModel):
    id: str
    rule_id: str
    event_id: str
    event_title: str
    asset_id: str
    asset_name: str
    impact_id: str
    distance_m: float
    status: str
    message: str
    deduplication_key: str
    created_at: str | None = None
    acknowledged_at: str | None = None
    resolved_at: str | None = None


# --- Health / readiness ---------------------------------------------------


class HealthStatus(BaseModel):
    status: str
    service: str
    environment: str


class ReadyStatus(BaseModel):
    status: str
    dependency: str
    postgis_version: str


# --- Request bodies -------------------------------------------------------


class AssetCreate(BaseModel):
    name: str
    longitude: float
    latitude: float
    asset_type: str = "site"
    criticality: str = "normal"


class AlertRuleCreate(BaseModel):
    name: str
    asset_id: str
    distance_threshold_m: float
    enabled: bool = True
    event_type: str = "wildfire"
    cooldown_minutes: int = 0


# --- Error envelope -------------------------------------------------------


class ErrorBody(BaseModel):
    code: str
    message: str
    details: JsonDict
    request_id: str


class ErrorResponse(BaseModel):
    error: ErrorBody
