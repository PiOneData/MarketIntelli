"""Add geocode_status and geocode_source columns to data_center_facilities.

Revision ID: a3f7c9e2d851
Revises: de25face58fe
Create Date: 2026-03-02 00:00:00.000000

Adds two tracking columns to data_center_facilities:
  * geocode_status  – result quality flag: 'ROOFTOP' | 'CITY_FALLBACK'
  * geocode_source  – which geocoder resolved the coordinate:
                      'city_centroid' | 'nominatim' | 'nominatim_city'

Uses PostgreSQL's ADD COLUMN IF NOT EXISTS so the migration is safe to run
against databases that already have these columns (e.g. created via create_all).
"""

from collections.abc import Sequence

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "a3f7c9e2d851"
down_revision: str | None = "de25face58fe"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # ADD COLUMN IF NOT EXISTS is idempotent — safe if create_all already ran.
    op.execute(
        """
        ALTER TABLE data_center_facilities
            ADD COLUMN IF NOT EXISTS geocode_status VARCHAR(20),
            ADD COLUMN IF NOT EXISTS geocode_source VARCHAR(50)
        """
    )


def downgrade() -> None:
    op.execute(
        """
        ALTER TABLE data_center_facilities
            DROP COLUMN IF EXISTS geocode_status,
            DROP COLUMN IF EXISTS geocode_source
        """
    )
