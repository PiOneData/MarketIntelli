"""Add daily_briefs table for cached AI-generated daily market briefs.

Revision ID: i8d2e5f1c9b4
Revises: h7c1d4e2f9a3
Create Date: 2026-03-18 00:00:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "i8d2e5f1c9b4"
down_revision: str | None = "h7c1d4e2f9a3"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "daily_briefs",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("brief_date", sa.Date(), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column(
            "generated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("brief_date", name="uq_daily_briefs_brief_date"),
    )


def downgrade() -> None:
    op.drop_table("daily_briefs")
