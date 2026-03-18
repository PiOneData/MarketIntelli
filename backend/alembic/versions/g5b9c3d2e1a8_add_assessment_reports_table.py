"""Add assessment_reports table for persisted AI-generated environmental reports.

Revision ID: g5b9c3d2e1a8
Revises: f3a8b2c1d9e7
Create Date: 2026-03-17 00:00:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "g5b9c3d2e1a8"
down_revision: str | None = "f3a8b2c1d9e7"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "assessment_reports",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("asset_key", sa.String(100), nullable=False),
        sa.Column("asset_name", sa.String(500), nullable=False),
        sa.Column("asset_type", sa.String(50), nullable=False),
        sa.Column("city", sa.String(255), server_default="", nullable=False),
        sa.Column("state", sa.String(255), server_default="", nullable=False),
        sa.Column("lat", sa.Float(), server_default="0", nullable=False),
        sa.Column("lon", sa.Float(), server_default="0", nullable=False),
        sa.Column("markdown_content", sa.Text(), server_default="", nullable=False),
        sa.Column("html_content", sa.Text(), server_default="", nullable=False),
        sa.Column(
            "generated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("asset_key", name="uq_assessment_reports_asset_key"),
    )


def downgrade() -> None:
    op.drop_table("assessment_reports")
