"""
Geocode data-center facilities that are missing lat/lng.

Two-phase approach:
  Phase 1 – fast_pass():  offline city-centroid lookup, no network calls.
            Resolves ~100 % of Indian DC facilities in < 1 second.
            Called synchronously at startup so coordinates are ready before
            the first API request is served.

  Phase 2 – nominatim_pass():  Nominatim (OSM) geocoding for any row still
            missing coordinates after Phase 1.  Rate-limited to 1 req / 1.2 s.
            Runs as a background asyncio task (non-blocking).

Standalone:
    python -m app.scripts.geocode_facilities          # both passes
    python -m app.scripts.geocode_facilities --force  # re-geocode everything
"""

import asyncio
import json
import logging
import sys
import urllib.parse
import urllib.request

from sqlalchemy import select, update

from app.db.session import async_session_factory
from app.domains.data_center_intelligence.models.data_center import DataCenterFacility

logger = logging.getLogger(__name__)

NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"
RATE_LIMIT_SECS = 1.2

# ---------------------------------------------------------------------------
# City centroid lookup — covers every city/area in the Indian DC dataset
# ---------------------------------------------------------------------------
CITY_COORDS: dict[str, tuple[float, float]] = {
    # Maharashtra
    "mumbai": (19.0760, 72.8777),
    "navi mumbai": (19.0330, 73.0297),
    "rabale": (19.0783, 73.0091),
    "airoli": (19.1565, 72.9976),
    "dighe": (19.1019, 73.0241),
    "chandivali": (19.1158, 72.9069),
    "vikhroli": (19.1064, 72.9323),
    "andheri": (19.1136, 72.8697),
    "andheri east": (19.1186, 72.8786),
    "powai": (19.1197, 72.9042),
    "thane": (19.2183, 72.9781),
    "panvel": (18.9894, 73.1175),
    "palava": (19.2219, 73.0631),
    "mahape": (19.0797, 73.0066),
    "bandra": (19.0544, 72.8402),
    "kurla": (19.0728, 72.8795),
    "pune": (18.5204, 73.8567),
    "pimpri": (18.6186, 73.7990),
    "pimpri-chinchwad": (18.6186, 73.7990),
    "hinjewadi": (18.5904, 73.7380),
    "kothrud": (18.5073, 73.8162),
    "nashik": (19.9975, 73.7898),
    "nagpur": (21.1458, 79.0882),
    # Madhya Pradesh
    "indore": (22.7196, 75.8577),
    "bhopal": (23.2599, 77.4126),
    # Karnataka
    "bengaluru": (12.9716, 77.5946),
    "bangalore": (12.9716, 77.5946),
    "banagalore": (12.9716, 77.5946),
    "whitefield": (12.9698, 77.7500),
    "electronic city": (12.8399, 77.6770),
    "marathahalli": (12.9591, 77.6972),
    "koramangala": (12.9279, 77.6271),
    # Telangana
    "hyderabad": (17.3850, 78.4867),
    "secunderabad": (17.4339, 78.4982),
    "gachibowli": (17.4401, 78.3489),
    "madhapur": (17.4504, 78.3893),
    "hitech city": (17.4504, 78.3893),
    "shahabad": (17.1199, 78.2736),
    "shabad": (17.1199, 78.2736),
    "kongar khurd b": (17.0974, 78.2847),
    "vailkunta tanda": (17.0880, 78.2880),
    "vavillakunta thanda": (17.0880, 78.2880),
    "chandenvelly": (17.5285, 78.5421),
    "chandanvelly": (17.5285, 78.5421),
    "mekaguda": (17.2500, 78.1500),
    "patancheru": (17.5280, 78.2647),
    "elkatta": (17.1000, 78.3500),
    "machanpalle": (17.1200, 78.2800),
    "shadnagar": (17.0652, 78.2129),
    "uppal": (17.4065, 78.5589),
    # Tamil Nadu
    "chennai": (13.0827, 80.2707),
    "ambattur": (13.1143, 80.1548),
    "siruseri": (12.7914, 80.2176),
    "kallikuppam": (13.1600, 79.9800),
    "oragadam": (12.7697, 80.0451),
    "coimbatore": (11.0168, 76.9558),
    "madurai": (9.9252, 78.1198),
    "pollachi": (10.6588, 77.0073),
    "sriperumbudur": (12.9678, 79.9461),
    "teynampet": (13.0454, 80.2516),
    "poonamallee": (13.0479, 80.0949),
    # Uttar Pradesh
    "noida": (28.5355, 77.3910),
    "ghaziabad": (28.6692, 77.4538),
    "lucknow": (26.8467, 80.9462),
    "greater noida": (28.4744, 77.5040),
    # Delhi / NCR
    "delhi": (28.7041, 77.1025),
    "new delhi": (28.6139, 77.2090),
    "faridabad": (28.4089, 77.3178),
    "gurgaon": (28.4595, 77.0266),
    "gurugram": (28.4595, 77.0266),
    "manesar": (28.3566, 76.9353),
    # West Bengal
    "kolkata": (22.5726, 88.3639),
    "new town": (22.6290, 88.4636),
    "berhampore": (24.1064, 88.2524),
    "uttarpara": (22.6648, 88.3539),
    "rajarhat": (22.6360, 88.4676),
    # Gujarat
    "ahmedabad": (23.0225, 72.5714),
    "gandhinagar": (23.2156, 72.6369),
    "surat": (21.1702, 72.8311),
    "vadodara": (22.3072, 73.1812),
    # Kerala
    "cochin": (9.9312, 76.2673),
    "ernakulam": (9.9816, 76.2999),
    "kochi": (9.9312, 76.2673),
    "trivandrum": (8.5241, 76.9366),
    "thiruvananthapuram": (8.5241, 76.9366),
    # Rajasthan
    "jaipur": (26.9124, 75.7873),
    "kukas": (27.0872, 75.7753),
    "jodhpur": (26.2389, 73.0243),
    # Odisha
    "bhubaneswar": (20.2961, 85.8245),
    # Punjab
    "ludhiana": (30.9010, 75.8573),
    "mohali": (30.7046, 76.7179),
    "chandigarh": (30.7333, 76.7794),
    "amritsar": (31.6340, 74.8723),
    # Tripura
    "agartala": (23.8315, 91.2868),
    # Bihar
    "patna": (25.5941, 85.1376),
    # Chhattisgarh
    "raipur": (21.2514, 81.6296),
    # Andhra Pradesh
    "visakhapatnam": (17.6868, 83.2185),
    "vijayawada": (16.5062, 80.6480),
    # Jammu & Kashmir
    "srinagar": (34.0837, 74.7973),
    "jammu": (32.7266, 74.8570),
    # Uttarakhand
    "dehradun": (30.3165, 78.0322),
    # Assam
    "guwahati": (26.1445, 91.7362),
    # Jharkhand
    "ranchi": (23.3441, 85.3096),
    # Haryana
    "rohtak": (28.8955, 76.6066),
}


def _city_lookup(city: str) -> tuple[float, float] | None:
    """Return centroid for a city string, or None if not found."""
    key = city.strip().lower()
    if key in CITY_COORDS:
        return CITY_COORDS[key]
    # Partial match — handles e.g. "Navi Mumbai" matching "mumbai"
    for k, v in CITY_COORDS.items():
        if key and k and (key in k or k in key):
            return v
    return None


def _nominatim_search(query: str) -> tuple[float, float] | None:
    """Blocking Nominatim call — run via asyncio.to_thread."""
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
    except Exception as exc:  # noqa: BLE001
        logger.debug("Nominatim error for %r: %s", query, exc)
    return None


async def _fetch_missing(force: bool) -> list[DataCenterFacility]:
    """Return facilities that need geocoding."""
    async with async_session_factory() as db:
        stmt = select(DataCenterFacility)
        if not force:
            stmt = stmt.where(DataCenterFacility.latitude.is_(None))
        return list((await db.execute(stmt)).scalars().all())


async def _save_coord(facility_id: object, lat: float, lng: float) -> None:
    async with async_session_factory() as db:
        await db.execute(
            update(DataCenterFacility)
            .where(DataCenterFacility.id == facility_id)
            .values(latitude=lat, longitude=lng)
        )
        await db.commit()


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

async def fast_pass(force: bool = False) -> dict[str, int]:
    """
    Phase 1 — offline city-centroid lookup.  No network calls, completes in < 1 s.
    Safe to await synchronously during application startup.
    """
    rows = await _fetch_missing(force)
    if not rows:
        logger.info("fast_pass: all facilities already have coordinates.")
        return {"resolved": 0, "skipped": 0, "total": 0}

    resolved = 0
    skipped = 0
    for f in rows:
        coords = _city_lookup(f.city)
        if coords:
            await _save_coord(f.id, coords[0], coords[1])
            resolved += 1
        else:
            skipped += 1

    logger.info("fast_pass: resolved=%d skipped=%d total=%d", resolved, skipped, len(rows))
    return {"resolved": resolved, "skipped": skipped, "total": len(rows)}


async def nominatim_pass(force: bool = False) -> dict[str, int]:
    """
    Phase 2 — Nominatim geocoding for rows still missing coordinates.
    Rate-limited to 1 req / 1.2 s.  Run as a background task.
    """
    rows = await _fetch_missing(force)
    if not rows:
        logger.info("nominatim_pass: nothing to geocode.")
        return {"geocoded": 0, "failed": 0, "total": 0}

    logger.info("nominatim_pass: geocoding %d facilities via Nominatim …", len(rows))
    geocoded = 0
    failed = 0

    for idx, f in enumerate(rows, 1):
        # Build primary query: full address + city + state
        loc = (f.location_detail or "").strip()
        import re
        loc = re.sub(r",?\s*Postal:\s*\d+", "", loc, flags=re.IGNORECASE).strip()
        primary = f"{loc}, {f.city}, {f.state}, India" if loc else f"{f.city}, {f.state}, India"
        fallback = f"{f.city}, {f.state}, India"

        coords = await asyncio.to_thread(_nominatim_search, primary)
        await asyncio.sleep(RATE_LIMIT_SECS)
        if not coords:
            coords = await asyncio.to_thread(_nominatim_search, fallback)
            await asyncio.sleep(RATE_LIMIT_SECS)

        if coords:
            await _save_coord(f.id, coords[0], coords[1])
            geocoded += 1
            logger.info("[%d/%d] ✓ %s → %.5f, %.5f", idx, len(rows), f.name, *coords)
        else:
            failed += 1
            logger.warning("[%d/%d] ✗ %s (%s, %s)", idx, len(rows), f.name, f.city, f.state)

    logger.info("nominatim_pass: geocoded=%d failed=%d", geocoded, failed)
    return {"geocoded": geocoded, "failed": failed, "total": len(rows)}


async def address_precise_pass(force: bool = True) -> dict[str, int]:
    """
    Phase 3 — Geocode using the full location_detail address via Nominatim.

    Unlike fast_pass (city centroids) this gives building-level precision.
    Unlike nominatim_pass (which skips rows that already have coordinates from
    fast_pass), this function targets facilities that have a location_detail
    address and upgrades their coordinates to precise building-level lat/lng.

    Args:
        force: If True (default), re-geocode even if coordinates already exist
               (overrides city-centroid coords). Set False to skip rows that
               already have any coordinate.

    Returns:
        Dict with geocoded / failed / skipped / total counts.
    """
    import re as _re

    async with async_session_factory() as db:
        stmt = select(DataCenterFacility).where(
            DataCenterFacility.location_detail.isnot(None),
            DataCenterFacility.location_detail != "",
        )
        if not force:
            stmt = stmt.where(DataCenterFacility.latitude.is_(None))
        rows = list((await db.execute(stmt)).scalars().all())

    if not rows:
        logger.info("address_precise_pass: nothing to geocode.")
        return {"geocoded": 0, "failed": 0, "skipped": 0, "total": 0}

    logger.info("address_precise_pass: geocoding %d facilities by address …", len(rows))
    geocoded = 0
    failed = 0
    skipped = 0

    for idx, f in enumerate(rows, 1):
        loc = (f.location_detail or "").strip()
        # Clean common noise that confuses Nominatim
        loc = _re.sub(r",?\s*Postal:\s*\d+", "", loc, flags=_re.IGNORECASE).strip()
        loc = _re.sub(r",\s*\d{6}\b", "", loc).strip()   # remove trailing 6-digit pincode

        if not loc:
            skipped += 1
            continue

        # Try progressively simpler queries until Nominatim returns a result
        queries = [
            f"{loc}, India",
            f"{loc}, {f.city}, {f.state}, India",
            f"{f.city}, {f.state}, India",
        ]

        coords = None
        for query in queries:
            coords = await asyncio.to_thread(_nominatim_search, query)
            await asyncio.sleep(RATE_LIMIT_SECS)
            if coords:
                break

        if coords:
            await _save_coord(f.id, coords[0], coords[1])
            geocoded += 1
            logger.info("[%d/%d] ✓ %s → %.5f, %.5f", idx, len(rows), f.name, *coords)
        else:
            failed += 1
            logger.warning("[%d/%d] ✗ %s (%s, %s)", idx, len(rows), f.name, f.city, f.state)

    logger.info(
        "address_precise_pass: geocoded=%d failed=%d skipped=%d total=%d",
        geocoded, failed, skipped, len(rows),
    )
    return {"geocoded": geocoded, "failed": failed, "skipped": skipped, "total": len(rows)}


async def geocode_facilities(force: bool = False) -> dict[str, int]:
    """Run both phases (fast then Nominatim).  Used by standalone CLI."""
    r1 = await fast_pass(force)
    r2 = await nominatim_pass(force)
    return {**r1, **r2}


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    force = "--force" in sys.argv
    asyncio.run(geocode_facilities(force=force))


if __name__ == "__main__":
    main()
