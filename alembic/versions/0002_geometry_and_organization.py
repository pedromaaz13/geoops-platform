"""Generic geometry + Organization.

Revision ID: 0002_geometry_and_organization
Revises: 0001_mvp_core
Create Date: 2026-08-07

Convierte la geometría de events/observations/assets de POINT a GEOMETRY(4326)
para poder representar zonas y líneas, con invariante de SRID y dos columnas
derivadas mantenidas por Postgres (GENERATED STORED): geometry_kind y
representative_point. Introduce organizations y organization_id NOT NULL en las
tablas con dueño, con backfill a una organización por defecto.
"""

from __future__ import annotations

import os

import sqlalchemy as sa

from alembic import op

revision = "0002_geometry_and_organization"
down_revision = "0001_mvp_core"
branch_labels = None
depends_on = None

GEOMETRY_TABLES = ("events", "observations", "assets")
OWNED_TABLES = ("assets", "alert_rules", "alerts", "impacts")

# Mapea el tipo PostGIS a la clasificación de producto (point|line|area).
GEOMETRY_KIND_EXPR = (
    "CASE "
    "WHEN GeometryType(geometry) IN ('POINT', 'MULTIPOINT') THEN 'point' "
    "WHEN GeometryType(geometry) IN ('LINESTRING', 'MULTILINESTRING') THEN 'line' "
    "ELSE 'area' END"
)


def _default_org() -> str:
    return os.getenv("GEOOPS_ORGANIZATION_ID", "default")


def upgrade() -> None:
    # btree_gist permite indexar (organization_id text, geometry) en un solo GiST.
    op.execute("CREATE EXTENSION IF NOT EXISTS btree_gist")

    for table in GEOMETRY_TABLES:
        op.execute(
            f"ALTER TABLE {table} ALTER COLUMN geometry TYPE geometry(Geometry, 4326) "
            f"USING ST_Force2D(geometry)"
        )
        op.execute(f"ALTER TABLE {table} ADD CONSTRAINT ck_{table}_srid CHECK (ST_SRID(geometry) = 4326)")
        op.execute(
            f"ALTER TABLE {table} ADD COLUMN geometry_kind text "
            f"GENERATED ALWAYS AS ({GEOMETRY_KIND_EXPR}) STORED"
        )
        op.execute(
            f"ALTER TABLE {table} ADD COLUMN representative_point geometry(Point, 4326) "
            f"GENERATED ALWAYS AS (ST_PointOnSurface(geometry)) STORED"
        )
        op.execute(
            f"CREATE INDEX ix_{table}_representative_point ON {table} USING gist (representative_point)"
        )

    op.create_table(
        "organizations",
        sa.Column("id", sa.String(80), primary_key=True),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )
    default_org = _default_org()
    op.execute(
        sa.text(
            "INSERT INTO organizations (id, name, created_at) "
            "VALUES (:id, :name, now()) ON CONFLICT (id) DO NOTHING"
        ).bindparams(id=default_org, name="Default organization")
    )

    for table in OWNED_TABLES:
        op.add_column(table, sa.Column("organization_id", sa.String(80), nullable=True))
        op.execute(sa.text(f"UPDATE {table} SET organization_id = :id").bindparams(id=default_org))
        op.alter_column(table, "organization_id", nullable=False)
        op.create_foreign_key(
            f"fk_{table}_organization", table, "organizations", ["organization_id"], ["id"]
        )

    op.execute("CREATE INDEX ix_assets_org_geometry ON assets USING gist (organization_id, geometry)")


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_assets_org_geometry")
    for table in OWNED_TABLES:
        op.drop_constraint(f"fk_{table}_organization", table, type_="foreignkey")
        op.drop_column(table, "organization_id")
    op.drop_table("organizations")

    for table in GEOMETRY_TABLES:
        op.execute(f"DROP INDEX IF EXISTS ix_{table}_representative_point")
        op.execute(f"ALTER TABLE {table} DROP COLUMN representative_point")
        op.execute(f"ALTER TABLE {table} DROP COLUMN geometry_kind")
        op.execute(f"ALTER TABLE {table} DROP CONSTRAINT ck_{table}_srid")
        # Reversible solo si toda la geometría es puntual (caso make demo).
        op.execute(
            f"ALTER TABLE {table} ALTER COLUMN geometry TYPE geometry(Point, 4326) "
            f"USING ST_Force2D(geometry)"
        )
