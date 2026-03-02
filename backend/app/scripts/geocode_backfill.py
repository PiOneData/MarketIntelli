"""
One-time geocoding backfill script.

Fetches all data_center_facilities rows where latitude IS NULL, runs the two-
phase geocoding pipeline (city-centroid → Nominatim), and logs failures.

Usage
-----
From the project root:
    python -m app.scripts.geocode_backfill              # geocode missing rows
    python -m app.scripts.geocode_backfill --force      # re-geocode all rows
    python -m app.scripts.geocode_backfill --phase1     # city-centroid only (fast, no network)
    python -m app.scripts.geocode_backfill --phase2     # Nominatim only

The script exits with code 0 on success or 1 if any facility could not be
geocoded (useful for CI checks).

Environment
-----------
Requires the same DATABASE_URL environment variable used by the FastAPI app.
Set it in backend/.env or export it before running.
"""

import asyncio
import logging
import sys

logger = logging.getLogger(__name__)


async def run_backfill(force: bool, phase1_only: bool, phase2_only: bool) -> int:
    """Execute the backfill.  Returns the number of failed facilities."""
    from app.scripts.geocode_facilities import fast_pass, nominatim_pass

    failed_total = 0

    if not phase2_only:
        logger.info("=== Phase 1: city-centroid lookup (offline, instant) ===")
        r1 = await fast_pass(force=force)
        logger.info(
            "Phase 1 complete — resolved=%d  skipped=%d  total=%d",
            r1["resolved"], r1["skipped"], r1["total"],
        )
        if r1["skipped"] > 0:
            logger.warning("  %d facilities not matched by city-centroid lookup.", r1["skipped"])

    if not phase1_only:
        logger.info("=== Phase 2: Nominatim geocoding (rate-limited, ~1 req/s) ===")
        logger.info("This may take several minutes for large datasets.")
        r2 = await nominatim_pass(force=force)
        logger.info(
            "Phase 2 complete — geocoded=%d  failed=%d  total=%d",
            r2["geocoded"], r2["failed"], r2["total"],
        )
        failed_total = r2["failed"]
        if failed_total > 0:
            logger.error(
                "  %d facilities could not be geocoded. "
                "Check logs above for details and consider manual lat/lon entry.",
                failed_total,
            )

    return failed_total


def main() -> None:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s  %(levelname)-8s  %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )

    args = sys.argv[1:]
    force = "--force" in args
    phase1_only = "--phase1" in args
    phase2_only = "--phase2" in args

    if phase1_only and phase2_only:
        logger.error("Cannot specify both --phase1 and --phase2")
        sys.exit(1)

    logger.info("Starting geocode backfill (force=%s)", force)

    failed = asyncio.run(run_backfill(force=force, phase1_only=phase1_only, phase2_only=phase2_only))

    if failed > 0:
        logger.warning("Backfill finished with %d unresolved facilities.", failed)
        sys.exit(1)
    else:
        logger.info("Backfill complete — all facilities geocoded successfully.")
        sys.exit(0)


if __name__ == "__main__":
    main()
