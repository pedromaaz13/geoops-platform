"""MVP core schema.

Revision ID: 0001_mvp_core
Revises:
Create Date: 2026-08-05
"""

from __future__ import annotations

import sqlalchemy as sa
from geoalchemy2 import Geometry
from sqlalchemy.dialects import postgresql

from alembic import op

revision = "0001_mvp_core"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS postgis")

    op.create_table(
        "sources",
        sa.Column("id", sa.String(length=80), primary_key=True),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("kind", sa.String(length=40), nullable=False),
        sa.Column("enabled", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("criticality", sa.String(length=40), nullable=False, server_default="normal"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    op.create_table(
        "source_runs",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("source_id", sa.String(length=80), sa.ForeignKey("sources.id"), nullable=False),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("finished_at", sa.DateTime(timezone=True)),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("records_downloaded", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("records_accepted", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("records_rejected", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("latest_observed_at", sa.DateTime(timezone=True)),
        sa.Column("raw_payload_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("error_type", sa.String(length=120)),
        sa.Column("error_message", sa.Text()),
    )

    op.create_table(
        "raw_payloads",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("source_run_id", sa.String(length=36), sa.ForeignKey("source_runs.id"), nullable=False),
        sa.Column("source_id", sa.String(length=80), sa.ForeignKey("sources.id"), nullable=False),
        sa.Column("content_hash", sa.String(length=64), nullable=False),
        sa.Column("media_type", sa.String(length=120), nullable=False),
        sa.Column("storage_uri", sa.Text(), nullable=False),
        sa.Column("fetched_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("payload_metadata", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb")),
    )
    op.create_index("ix_raw_payloads_content_hash", "raw_payloads", ["source_id", "content_hash"])

    op.create_table(
        "observations",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("source_id", sa.String(length=80), sa.ForeignKey("sources.id"), nullable=False),
        sa.Column("source_record_id", sa.String(length=200), nullable=False),
        sa.Column("source_version", sa.String(length=80), nullable=False),
        sa.Column("event_type", sa.String(length=80), nullable=False),
        sa.Column("observed_at", sa.DateTime(timezone=True)),
        sa.Column("published_at", sa.DateTime(timezone=True)),
        sa.Column("ingested_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("geometry", Geometry("POINT", srid=4326), nullable=False),
        sa.Column("precision_m", sa.Float()),
        sa.Column("confidence", sa.Float()),
        sa.Column("attributes", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("raw_payload_id", sa.String(length=36), sa.ForeignKey("raw_payloads.id"), nullable=False),
        sa.CheckConstraint("precision_m IS NULL OR precision_m > 0", name="ck_observations_precision_positive"),
        sa.CheckConstraint("confidence IS NULL OR (confidence >= 0 AND confidence <= 1)", name="ck_observations_confidence_range"),
    )
    op.create_index("ix_observations_geometry", "observations", ["geometry"], postgresql_using="gist")
    op.create_index("ux_observation_source_record_version", "observations", ["source_id", "source_record_id", "source_version"], unique=True)

    op.create_table(
        "events",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("event_type", sa.String(length=80), nullable=False),
        sa.Column("subtype", sa.String(length=80)),
        sa.Column("title", sa.String(length=240), nullable=False),
        sa.Column("summary", sa.Text()),
        sa.Column("status", sa.String(length=80)),
        sa.Column("status_source_id", sa.String(length=80), sa.ForeignKey("sources.id")),
        sa.Column("severity", sa.String(length=80)),
        sa.Column("severity_source_id", sa.String(length=80), sa.ForeignKey("sources.id")),
        sa.Column("geometry", Geometry("POINT", srid=4326), nullable=False),
        sa.Column("precision_m", sa.Float()),
        sa.Column("confidence", sa.Float()),
        sa.Column("valid_from", sa.DateTime(timezone=True)),
        sa.Column("valid_to", sa.DateTime(timezone=True)),
        sa.Column("last_observed_at", sa.DateTime(timezone=True)),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("attributes", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.CheckConstraint("precision_m IS NULL OR precision_m > 0", name="ck_events_precision_positive"),
    )
    op.create_index("ix_events_geometry", "events", ["geometry"], postgresql_using="gist")
    op.create_index("ix_events_type_updated", "events", ["event_type", sa.text("updated_at DESC")])

    op.create_table(
        "event_observations",
        sa.Column("event_id", sa.String(length=36), sa.ForeignKey("events.id"), primary_key=True),
        sa.Column("observation_id", sa.String(length=36), sa.ForeignKey("observations.id"), primary_key=True),
        sa.Column("relation_type", sa.String(length=40), nullable=False),
        sa.Column("score", sa.Float()),
        sa.Column("reconciliation_version", sa.String(length=80), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )

    op.create_table(
        "event_revisions",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("event_id", sa.String(length=36), sa.ForeignKey("events.id"), nullable=False),
        sa.Column("revision_number", sa.Integer(), nullable=False),
        sa.Column("changed_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("changed_fields", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("previous_snapshot", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("new_snapshot", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("reason", sa.String(length=160), nullable=False),
        sa.Column("source_observation_ids", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
    )
    op.create_index("ux_event_revisions_number", "event_revisions", ["event_id", "revision_number"], unique=True)

    op.create_table(
        "assets",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("asset_type", sa.String(length=80), nullable=False),
        sa.Column("geometry", Geometry("POINT", srid=4326), nullable=False),
        sa.Column("criticality", sa.String(length=40), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_assets_geometry", "assets", ["geometry"], postgresql_using="gist")

    op.create_table(
        "impacts",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("event_id", sa.String(length=36), sa.ForeignKey("events.id"), nullable=False),
        sa.Column("asset_id", sa.String(length=36), sa.ForeignKey("assets.id"), nullable=False),
        sa.Column("impact_type", sa.String(length=40), nullable=False),
        sa.Column("distance_m", sa.Float(), nullable=False),
        sa.Column("intersects", sa.Boolean(), nullable=False),
        sa.Column("score", sa.Float(), nullable=False),
        sa.Column("reasons", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("calculated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("calculation_version", sa.String(length=80), nullable=False),
    )
    op.create_index("ux_impacts_event_asset_version", "impacts", ["event_id", "asset_id", "calculation_version"], unique=True)

    op.create_table(
        "alert_rules",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("enabled", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("event_type", sa.String(length=80), nullable=False),
        sa.Column("asset_id", sa.String(length=36), sa.ForeignKey("assets.id"), nullable=False),
        sa.Column("distance_threshold_m", sa.Float(), nullable=False),
        sa.Column("cooldown_minutes", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint("distance_threshold_m > 0", name="ck_alert_rules_distance_positive"),
    )

    op.create_table(
        "alerts",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("rule_id", sa.String(length=36), sa.ForeignKey("alert_rules.id"), nullable=False),
        sa.Column("event_id", sa.String(length=36), sa.ForeignKey("events.id"), nullable=False),
        sa.Column("asset_id", sa.String(length=36), sa.ForeignKey("assets.id"), nullable=False),
        sa.Column("impact_id", sa.String(length=36), sa.ForeignKey("impacts.id"), nullable=False),
        sa.Column("status", sa.String(length=40), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("deduplication_key", sa.String(length=240), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("acknowledged_at", sa.DateTime(timezone=True)),
        sa.Column("resolved_at", sa.DateTime(timezone=True)),
    )
    op.create_index("ux_alerts_deduplication_key", "alerts", ["deduplication_key"], unique=True)


def downgrade() -> None:
    for table in [
        "alerts",
        "alert_rules",
        "impacts",
        "assets",
        "event_revisions",
        "event_observations",
        "events",
        "observations",
        "raw_payloads",
        "source_runs",
        "sources",
    ]:
        op.drop_table(table)
