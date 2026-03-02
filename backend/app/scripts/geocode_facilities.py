"""
Geocode all data-center facilities that have location_detail but no lat/lng.
Uses Nominatim (OpenStreetMap) — stdlib urllib only, no extra deps required.
Rate-limited to 1 req / 1.2 s per Nominatim usage policy.

Usage (standalone):
    python -m app.scripts.geocode_facilities          # geocode missing only
    python -m app.scripts.geocode_facilities --force  # re-geocode everything
"""

import asyncio
import json
import logging
import re
import sys
import urllib.parse
import urllib.request

from sqlalchemy import select, update

from app.db.session import async_session_factory
from app.domains.data_center_intelligence.models.data_center import DataCenterFacility

logger = logging.getLogger(__name__)

NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"
RATE_LIMIT_SECS = 1.2   # Nominatim max 1 req/sec; we use 1.2 s to be safe


def _clean_location(location_detail: str) -> str:
    """Strip 'Postal: XXXXX' noise and collapse whitespace."""
    cleaned = re.sub(r",?\s*Postal:\s*\d+", "", location_detail, flags=re.IGNORECASE)
    return re.sub(r"\s+", " ", cleaned).strip()


def _nominatim_search(query: str) -> tuple[float, float] | None:
    """Blocking Nominatim geocode.  Run via asyncio.to_thread to stay async-safe."""
    params = urllib.parse.urlencode({
        "q": query,
        "format": "json",
        "limit": 1,
        "countrycodes": "in",
        "accept-language": "en",
    })
    req = urllib.request.Request(
        f"{NOMINATIM_URL}?{params}",
        headers={"User-Agent": "MarketIntelli-GeocoderBot/1.0 (internal)"},
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            data: list[dict] = json.loads(resp.read())
            if data:
                return float(data[0]["lat"]), float(data[0]["lon"])
    except Exception as exc:
        logger.debug("Nominatim error for %r: %s", query, exc)
    return None


async def geocode_facilities(force: bool = False) -> dict[str, int]:
    """
    Geocode facilities with location_detail that are missing coordinates.

    Args:
        force: When True, re-geocode facilities that already have coordinates.

    Returns:
        dict with keys 'geocoded', 'failed', 'total'.
    """
    async with async_session_factory() as db:
        stmt = select(
            DataCenterFacility.id,
            DataCenterFacility.name,
            DataCenterFacility.city,
            DataCenterFacility.state,
            DataCenterFacility.location_detail,
        )
        if not force:
            stmt = stmt.where(DataCenterFacility.latitude.is_(None))
        stmt = stmt.where(DataCenterFacility.location_detail.isnot(None))

        rows = (await db.execute(stmt)).all()

    total = len(rows)
    if total == 0:
        logger.info("Geocoding: all facilities already have coordinates — nothing to do.")
        return {"geocoded": 0, "failed": 0, "total": 0}

    logger.info("Geocoding %d facilit%s via Nominatim (OSM) …", total, "y" if total == 1 else "ies")
    geocoded = 0
    failed = 0

    for idx, (fid, name, city, state, location_detail) in enumerate(rows, start=1):
        # Primary query: cleaned address + city + state + India
        cleaned = _clean_location(location_detail)
        primary_q = f"{cleaned}, {city}, {state}, India"
        fallback_q = f"{city}, {state}, India"

        result = await asyncio.to_thread(_nominatim_search, primary_q)
        await asyncio.sleep(RATE_LIMIT_SECS)

        if not result:
            result = await asyncio.to_thread(_nominatim_search, fallback_q)
            await asyncio.sleep(RATE_LIMIT_SECS)

        if result:
            lat, lng = result
            async with async_session_factory() as db:
                await db.execute(
                    update(DataCenterFacility)
                    .where(DataCenterFacility.id == fid)
                    .values(latitude=lat, longitude=lng)
                )
                await db.commit()
            geocoded += 1
            logger.info("[%d/%d] ✓ %s → %.5f, %.5f", idx, total, name, lat, lng)
        else:
            failed += 1
            logger.warning("[%d/%d] ✗ No result: %s (%s, %s)", idx, total, name, city, state)

    summary = {"geocoded": geocoded, "failed": failed, "total": total}
    logger.info("Geocoding done: %d geocoded, %d failed of %d.", geocoded, failed, total)
    return summary


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    force = "--force" in sys.argv
    asyncio.run(geocode_facilities(force=force))


if __name__ == "__main__":
    main()
