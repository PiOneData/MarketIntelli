"""Add analysis_json column to assessment_reports for chart re-rendering.

Revision ID: j9e3f6a2b1c5
Revises: h7c1d4e2f9a3
Create Date: 2026-03-18 00:00:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "j9e3f6a2b1c5"
down_revision: str | None = "h7c1d4e2f9a3"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("assessment_reports", sa.Column("analysis_json", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("assessment_reports", "analysis_json")
