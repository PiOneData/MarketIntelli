"""Add gee_json_credentials table for full JSON key storage.

Revision ID: a1b2c3d4e5f6
Revises: de25face58fe
Create Date: 2026-02-25 00:00:00.000000

Stores a complete Google service-account JSON blob in JSONB so operators
can paste the raw key file directly into a single field rather than splitting
it across multiple columns (as in google_service_credentials).
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB

revision: str = "a1b2c3d4e5f6"
down_revision: str | None = "de25face58fe"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "gee_json_credentials",
        sa.Column(
            "id",
            sa.UUID(),
            nullable=False,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("credential_json", JSONB(), nullable=False),
        sa.Column(
            "is_active",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("true"),
        ),
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
    # Enforce a single active credential row
    op.execute(
        "CREATE UNIQUE INDEX IF NOT EXISTS idx_gee_json_creds_single_active "
        "ON gee_json_credentials (is_active) "
        "WHERE is_active = TRUE;"
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS idx_gee_json_creds_single_active;")
    op.drop_table("gee_json_credentials")
