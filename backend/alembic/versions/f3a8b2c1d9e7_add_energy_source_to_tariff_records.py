"""Add energy_source column to tariff_records.

Revision ID: f3a8b2c1d9e7
Revises: a1b2c3d4e5f6
Create Date: 2026-03-17 00:00:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "f3a8b2c1d9e7"
down_revision: str | None = "a1b2c3d4e5f6"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "tariff_records",
        sa.Column("energy_source", sa.String(100), server_default="solar", nullable=False),
    )


def downgrade() -> None:
    op.drop_column("tariff_records", "energy_source")
