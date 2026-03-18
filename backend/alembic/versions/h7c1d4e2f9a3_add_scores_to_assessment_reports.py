"""Add solar/wind/water/overall scores and rating to assessment_reports table.

Revision ID: h7c1d4e2f9a3
Revises: g5b9c3d2e1a8
Create Date: 2026-03-18 00:00:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "h7c1d4e2f9a3"
down_revision: str | None = "g5b9c3d2e1a8"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("assessment_reports", sa.Column("solar_score", sa.Float(), nullable=True))
    op.add_column("assessment_reports", sa.Column("wind_score", sa.Float(), nullable=True))
    op.add_column("assessment_reports", sa.Column("water_score", sa.Float(), nullable=True))
    op.add_column("assessment_reports", sa.Column("overall_score", sa.Float(), nullable=True))
    op.add_column("assessment_reports", sa.Column("rating", sa.String(100), nullable=True))


def downgrade() -> None:
    op.drop_column("assessment_reports", "rating")
    op.drop_column("assessment_reports", "overall_score")
    op.drop_column("assessment_reports", "water_score")
    op.drop_column("assessment_reports", "wind_score")
    op.drop_column("assessment_reports", "solar_score")
