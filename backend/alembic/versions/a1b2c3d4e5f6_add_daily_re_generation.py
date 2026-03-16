"""Add daily_re_generation table.

Revision ID: a1b2c3d4e5f6
Revises: de25face58fe
Create Date: 2026-03-16 00:00:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "a1b2c3d4e5f6"
down_revision: str | None = "de25face58fe"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "daily_re_generation",
        sa.Column("id", sa.UUID(), nullable=False, server_default=sa.text("gen_random_uuid()")),
        sa.Column("date", sa.Date(), nullable=False),
        sa.Column("wind_mu", sa.Float(), nullable=False),
        sa.Column("solar_mu", sa.Float(), nullable=False),
        sa.Column("other_mu", sa.Float(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("date"),
    )
    op.create_index("ix_daily_re_generation_date", "daily_re_generation", ["date"])


def downgrade() -> None:
    op.drop_index("ix_daily_re_generation_date", table_name="daily_re_generation")
    op.drop_table("daily_re_generation")
