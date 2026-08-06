from __future__ import annotations

from datetime import datetime
from typing import Any

from geoalchemy2 import Geometry
from sqlalchemy import Boolean, Computed, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from geoops_api.db import Base

JsonDict = dict[str, Any]

# Columnas derivadas mantenidas por Postgres (GENERATED STORED). Se declaran con
# Computed para que el ORM las trate como read-only y nunca las inserte; la DDL
# real vive en la migración 0002. Ver ADR de geometría genérica.
_GEOMETRY_KIND_EXPR = (
    "CASE "
    "WHEN GeometryType(geometry) IN ('POINT', 'MULTIPOINT') THEN 'point' "
    "WHEN GeometryType(geometry) IN ('LINESTRING', 'MULTILINESTRING') THEN 'line' "
    "ELSE 'area' END"
)
_REPRESENTATIVE_POINT_EXPR = "ST_PointOnSurface(geometry)"


class Organization(Base):
    __tablename__ = "organizations"

    id: Mapped[str] = mapped_column(String(80), primary_key=True)
    name: Mapped[str] = mapped_column(String(200))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class Source(Base):
    __tablename__ = "sources"

    id: Mapped[str] = mapped_column(String(80), primary_key=True)
    name: Mapped[str] = mapped_column(String(200))
    kind: Mapped[str] = mapped_column(String(40))
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    criticality: Mapped[str] = mapped_column(String(40), default="normal")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class SourceRun(Base):
    __tablename__ = "source_runs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    source_id: Mapped[str] = mapped_column(String(80), ForeignKey("sources.id"))
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    status: Mapped[str] = mapped_column(String(20))
    records_downloaded: Mapped[int] = mapped_column(Integer, default=0)
    records_accepted: Mapped[int] = mapped_column(Integer, default=0)
    records_rejected: Mapped[int] = mapped_column(Integer, default=0)
    latest_observed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    raw_payload_count: Mapped[int] = mapped_column(Integer, default=0)
    error_type: Mapped[str | None] = mapped_column(String(120))
    error_message: Mapped[str | None] = mapped_column(Text)


class RawPayload(Base):
    __tablename__ = "raw_payloads"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    source_run_id: Mapped[str] = mapped_column(String(36), ForeignKey("source_runs.id"))
    source_id: Mapped[str] = mapped_column(String(80), ForeignKey("sources.id"))
    content_hash: Mapped[str] = mapped_column(String(64))
    media_type: Mapped[str] = mapped_column(String(120))
    storage_uri: Mapped[str] = mapped_column(Text)
    fetched_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    payload_metadata: Mapped[JsonDict] = mapped_column(JSONB, default=dict)


class Observation(Base):
    __tablename__ = "observations"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    source_id: Mapped[str] = mapped_column(String(80), ForeignKey("sources.id"))
    source_record_id: Mapped[str] = mapped_column(String(200))
    source_version: Mapped[str] = mapped_column(String(80))
    event_type: Mapped[str] = mapped_column(String(80))
    observed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    ingested_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    geometry: Mapped[Any] = mapped_column(Geometry("GEOMETRY", srid=4326))
    geometry_kind: Mapped[str] = mapped_column(String(10), Computed(_GEOMETRY_KIND_EXPR))
    representative_point: Mapped[Any] = mapped_column(
        Geometry("POINT", srid=4326), Computed(_REPRESENTATIVE_POINT_EXPR), nullable=True
    )
    precision_m: Mapped[float | None] = mapped_column(Float)
    confidence: Mapped[float | None] = mapped_column(Float)
    attributes: Mapped[JsonDict] = mapped_column(JSONB, default=dict)
    raw_payload_id: Mapped[str] = mapped_column(String(36), ForeignKey("raw_payloads.id"))


class Event(Base):
    __tablename__ = "events"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    event_type: Mapped[str] = mapped_column(String(80))
    subtype: Mapped[str | None] = mapped_column(String(80))
    title: Mapped[str] = mapped_column(String(240))
    summary: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str | None] = mapped_column(String(80))
    status_source_id: Mapped[str | None] = mapped_column(String(80), ForeignKey("sources.id"))
    severity: Mapped[str | None] = mapped_column(String(80))
    severity_source_id: Mapped[str | None] = mapped_column(String(80), ForeignKey("sources.id"))
    geometry: Mapped[Any] = mapped_column(Geometry("GEOMETRY", srid=4326))
    geometry_kind: Mapped[str] = mapped_column(String(10), Computed(_GEOMETRY_KIND_EXPR))
    representative_point: Mapped[Any] = mapped_column(
        Geometry("POINT", srid=4326), Computed(_REPRESENTATIVE_POINT_EXPR), nullable=True
    )
    precision_m: Mapped[float | None] = mapped_column(Float)
    confidence: Mapped[float | None] = mapped_column(Float)
    valid_from: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    valid_to: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    last_observed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    attributes: Mapped[JsonDict] = mapped_column(JSONB, default=dict)


class EventObservation(Base):
    __tablename__ = "event_observations"

    event_id: Mapped[str] = mapped_column(String(36), ForeignKey("events.id"), primary_key=True)
    observation_id: Mapped[str] = mapped_column(String(36), ForeignKey("observations.id"), primary_key=True)
    relation_type: Mapped[str] = mapped_column(String(40))
    score: Mapped[float | None] = mapped_column(Float)
    reconciliation_version: Mapped[str] = mapped_column(String(80))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class EventRevision(Base):
    __tablename__ = "event_revisions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    event_id: Mapped[str] = mapped_column(String(36), ForeignKey("events.id"))
    revision_number: Mapped[int] = mapped_column(Integer)
    changed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    changed_fields: Mapped[list[str]] = mapped_column(JSONB)
    previous_snapshot: Mapped[JsonDict] = mapped_column(JSONB)
    new_snapshot: Mapped[JsonDict] = mapped_column(JSONB)
    reason: Mapped[str] = mapped_column(String(160))
    source_observation_ids: Mapped[list[str]] = mapped_column(JSONB)


class Asset(Base):
    __tablename__ = "assets"

    organization_id: Mapped[str] = mapped_column(String(80), ForeignKey("organizations.id"))

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    name: Mapped[str] = mapped_column(String(200))
    asset_type: Mapped[str] = mapped_column(String(80))
    geometry: Mapped[Any] = mapped_column(Geometry("GEOMETRY", srid=4326))
    geometry_kind: Mapped[str] = mapped_column(String(10), Computed(_GEOMETRY_KIND_EXPR))
    representative_point: Mapped[Any] = mapped_column(
        Geometry("POINT", srid=4326), Computed(_REPRESENTATIVE_POINT_EXPR), nullable=True
    )
    criticality: Mapped[str] = mapped_column(String(40))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class Impact(Base):
    __tablename__ = "impacts"

    organization_id: Mapped[str] = mapped_column(String(80), ForeignKey("organizations.id"))

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    event_id: Mapped[str] = mapped_column(String(36), ForeignKey("events.id"))
    asset_id: Mapped[str] = mapped_column(String(36), ForeignKey("assets.id"))
    impact_type: Mapped[str] = mapped_column(String(40))
    distance_m: Mapped[float] = mapped_column(Float)
    intersects: Mapped[bool] = mapped_column(Boolean)
    score: Mapped[float] = mapped_column(Float)
    reasons: Mapped[list[str]] = mapped_column(JSONB)
    calculated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    calculation_version: Mapped[str] = mapped_column(String(80))


class AlertRule(Base):
    __tablename__ = "alert_rules"

    organization_id: Mapped[str] = mapped_column(String(80), ForeignKey("organizations.id"))

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    name: Mapped[str] = mapped_column(String(200))
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    event_type: Mapped[str] = mapped_column(String(80))
    asset_id: Mapped[str] = mapped_column(String(36), ForeignKey("assets.id"))
    distance_threshold_m: Mapped[float] = mapped_column(Float)
    cooldown_minutes: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class Alert(Base):
    __tablename__ = "alerts"

    organization_id: Mapped[str] = mapped_column(String(80), ForeignKey("organizations.id"))

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    rule_id: Mapped[str] = mapped_column(String(36), ForeignKey("alert_rules.id"))
    event_id: Mapped[str] = mapped_column(String(36), ForeignKey("events.id"))
    asset_id: Mapped[str] = mapped_column(String(36), ForeignKey("assets.id"))
    impact_id: Mapped[str] = mapped_column(String(36), ForeignKey("impacts.id"))
    status: Mapped[str] = mapped_column(String(40))
    message: Mapped[str] = mapped_column(Text)
    deduplication_key: Mapped[str] = mapped_column(String(240))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    acknowledged_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
