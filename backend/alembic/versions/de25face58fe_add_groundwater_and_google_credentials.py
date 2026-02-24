"""Add groundwater_resources and google_service_credentials tables.

Revision ID: de25face58fe
Revises:
Create Date: 2026-02-24 00:00:00.000000

These two tables support the Assessment tab (SolarWindAssessment integration)
under Geo Analytics in the MarketIntelli frontend:

  * groundwater_resources       – CGWB block-level groundwater assessment zones
                                  loaded from groundwater.geojson
  * google_service_credentials  – Google Cloud service-account credentials used
                                  by the Assessment / SolarWindAssessment features

Refer to backend/app/scripts/groundwater_init.sql for the full DDL and the
commented INSERT templates that show how to populate both tables.
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from geoalchemy2 import Geometry

# revision identifiers, used by Alembic.
revision: str = "de25face58fe"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # ------------------------------------------------------------------
    # groundwater_resources
    # ------------------------------------------------------------------
    op.create_table(
        "groundwater_resources",
        sa.Column("id", sa.UUID(), nullable=False, server_default=sa.text("gen_random_uuid()")),
        sa.Column("gml_id", sa.String(255), nullable=False, server_default=""),
        sa.Column("objectid", sa.Integer(), nullable=True),
        sa.Column("block", sa.String(255), nullable=False, server_default=""),
        sa.Column("tehsil", sa.String(255), nullable=False, server_default=""),
        sa.Column("district", sa.String(255), nullable=False, server_default=""),
        sa.Column("gwr_2011_2", sa.Float(), nullable=True),
        sa.Column("code", sa.Float(), nullable=True),
        sa.Column("classification", sa.String(100), nullable=False, server_default=""),
        sa.Column("net_annual_gw_availability", sa.Float(), nullable=True),
        sa.Column("annual_gw_draft_irrigation", sa.Float(), nullable=True),
        sa.Column("stage_of_gw_development", sa.Float(), nullable=True),
        sa.Column("annual_gw_draft_domestic_industrial", sa.Float(), nullable=True),
        sa.Column("annual_gw_draft_total", sa.Float(), nullable=True),
        sa.Column("annual_replenishable_gw_total", sa.Float(), nullable=True),
        sa.Column("state_name", sa.String(255), nullable=False, server_default=""),
        sa.Column("natural_discharge_non_monsoon", sa.Float(), nullable=True),
        sa.Column("st_area_shape", sa.Float(), nullable=True),
        sa.Column("st_length_shape", sa.Float(), nullable=True),
        sa.Column(
            "geometry",
            Geometry(geometry_type="MULTIPOLYGON", srid=4326),
            nullable=True,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "idx_groundwater_state_name",
        "groundwater_resources",
        ["state_name"],
    )
    op.create_index(
        "idx_groundwater_classification",
        "groundwater_resources",
        ["classification"],
    )
    op.create_index(
        "idx_groundwater_district",
        "groundwater_resources",
        ["district"],
    )
    # Spatial index – GiST
    op.execute(
        "CREATE INDEX IF NOT EXISTS idx_groundwater_geometry "
        "ON groundwater_resources USING GIST (geometry);"
    )

    # ------------------------------------------------------------------
    # google_service_credentials
    # ------------------------------------------------------------------
    op.create_table(
        "google_service_credentials",
        sa.Column("id", sa.UUID(), nullable=False, server_default=sa.text("gen_random_uuid()")),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("credential_type", sa.String(50), nullable=False, server_default="service_account"),
        sa.Column("project_id", sa.String(255), nullable=False, server_default=""),
        sa.Column("private_key_id", sa.String(255), nullable=False, server_default=""),
        # RSA private key in PEM format – ENCRYPT AT REST IN PRODUCTION
        sa.Column("private_key", sa.Text(), nullable=False, server_default=""),
        sa.Column("client_email", sa.String(255), nullable=False, server_default=""),
        sa.Column("client_id", sa.String(255), nullable=False, server_default=""),
        sa.Column(
            "auth_uri",
            sa.String(500),
            nullable=False,
            server_default="https://accounts.google.com/o/oauth2/auth",
        ),
        sa.Column(
            "token_uri",
            sa.String(500),
            nullable=False,
            server_default="https://oauth2.googleapis.com/token",
        ),
        sa.Column(
            "auth_provider_x509_cert_url",
            sa.String(500),
            nullable=False,
            server_default="https://www.googleapis.com/oauth2/v1/certs",
        ),
        sa.Column("client_x509_cert_url", sa.String(500), nullable=False, server_default=""),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    # Enforce one active credential at a time
    op.execute(
        "CREATE UNIQUE INDEX IF NOT EXISTS idx_google_creds_single_active "
        "ON google_service_credentials (is_active) "
        "WHERE is_active = TRUE;"
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS idx_google_creds_single_active;")
    op.drop_table("google_service_credentials")

    op.execute("DROP INDEX IF EXISTS idx_groundwater_geometry;")
    op.drop_index("idx_groundwater_district", table_name="groundwater_resources")
    op.drop_index("idx_groundwater_classification", table_name="groundwater_resources")
    op.drop_index("idx_groundwater_state_name", table_name="groundwater_resources")
    op.drop_table("groundwater_resources")
