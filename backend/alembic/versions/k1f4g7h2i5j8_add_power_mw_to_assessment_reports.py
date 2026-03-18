"""Add power_mw column to assessment_reports.

Revision ID: k1f4g7h2i5j8
Revises: j9e3f6a2b1c5
Create Date: 2026-03-18 00:00:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "k1f4g7h2i5j8"
down_revision: str | None = "j9e3f6a2b1c5"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("assessment_reports", sa.Column("power_mw", sa.Float(), nullable=True))


def downgrade() -> None:
    op.drop_column("assessment_reports", "power_mw")
