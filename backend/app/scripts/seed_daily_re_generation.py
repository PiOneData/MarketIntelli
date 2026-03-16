"""Seed daily_re_generation table from chart_data (1).csv.

CSV columns: Date (DD-MM-YYYY), Wind (MU), Solar (MU), Other (MU).
Run from the backend directory:
    python -m app.scripts.seed_daily_re_generation
"""

import csv
import logging
from datetime import date

from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import async_session_factory
from app.domains.power_market.models.power_market import DailyREGeneration

logger = logging.getLogger(__name__)

# Path relative to the project root (three levels up from this script)
import pathlib

CSV_PATH = pathlib.Path(__file__).parents[3] / "chart_data (1).csv"


def _parse_date(raw: str) -> date:
    """Parse DD-MM-YYYY into a date object."""
    day, month, year = raw.strip().split("-")
    return date(int(year), int(month), int(day))


async def seed(db: AsyncSession) -> None:
    rows: list[dict] = []
    with open(CSV_PATH, newline="", encoding="utf-8") as fh:
        reader = csv.DictReader(fh)
        for line in reader:
            raw_date = line["Date"].strip()
            if not raw_date:
                continue
            rows.append(
                {
                    "date": _parse_date(raw_date),
                    "wind_mu": float(line["Wind"]),
                    "solar_mu": float(line["Solar"]),
                    "other_mu": float(line["Other"]),
                }
            )

    if not rows:
        logger.warning("No rows found in CSV — nothing to seed")
        return

    # Upsert: insert new rows, skip dates that already exist
    stmt = insert(DailyREGeneration).values(rows).on_conflict_do_nothing(index_elements=["date"])
    await db.execute(stmt)
    await db.commit()
    logger.info("Upserted %d daily RE generation records from CSV", len(rows))


async def main() -> None:
    logging.basicConfig(level=logging.INFO)
    async with async_session_factory() as db:
        await seed(db)


if __name__ == "__main__":
    import asyncio

    asyncio.run(main())
