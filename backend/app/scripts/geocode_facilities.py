"""
Geocode data-center facilities that are missing lat/lng.

Strategy (fast, no external API dependency):
  1. Precise match — load the 64 entries from frontend/public/datacenters.geojson
     and match each DB facility by normalised name.
  2. City centroid — look up city name in CITY_COORDS (covers all Indian cities
     in the DC dataset).  Multiple facilities in the same city share the centroid;
     sufficient for the registry-map marker view.
  3. Nominatim fallback — any facility not resolved by steps 1 or 2 is queued for
     a slow Nominatim (OSM) geocode call (1.2 s rate-limit); fires after steps 1+2
     so startup is never blocked by network calls.

Called from app/main.py lifespan as a background task.  Only rows with
latitude IS NULL are touched, so re-runs are idempotent.

Standalone:
    python -m app.scripts.geocode_facilities          # fill missing only
    python -m app.scripts.geocode_facilities --force  # re-geocode everything
"""

import asyncio
import json
import logging
import os
import re
import sys
import urllib.parse
import urllib.request

from sqlalchemy import select, update

from app.db.session import async_session_factory
from app.domains.data_center_intelligence.models.data_center import DataCenterFacility

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# City centroid lookup — covers all cities/areas in the Indian DC dataset
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
    "indore": (22.7196, 75.8577),
    "bhopal": (23.2599, 77.4126),
    "nagpur": (21.1458, 79.0882),
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

# Candidates for the static geojson (precise coords for 64 named entries)
_GEOJSON_CANDIDATES = [
    os.path.normpath(os.path.join(
        os.path.dirname(__file__), "..", "..", "..", "..", "frontend", "public", "datacenters.geojson"
    )),
    os.path.normpath(os.path.join(
        os.path.dirname(__file__), "..", "..", "..", "frontend", "public", "datacenters.geojson"
    )),
    "/app/frontend/public/datacenters.geojson",
]

NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"
RATE_LIMIT_SECS = 1.2


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _norm_name(name: str) -> str:
    """Normalise for fuzzy name comparison."""
    name = name.lower()
    name = re.sub(
        r"\b(data\s*cent(?:er|re)|pvt|ltd|private|limited|technologies|datacent(?:er|re)|"
        r"services|solutions|infrastructure|india|idc)\b",
        "", name,
    )
    name = re.sub(r"[^a-z0-9 ]", " ", name)
    return re.sub(r"\s+", " ", name).strip()


def _load_geojson_index() -> dict[str, tuple[float, float]]:
    """Return {normalised_name: (lat, lng)} from the static GeoJSON file."""
    for path in _GEOJSON_CANDIDATES:
        if os.path.exists(path):
            try:
                with open(path, encoding="utf-8") as fh:
                    gj = json.load(fh)
                index: dict[str, tuple[float, float]] = {}
                for feat in gj.get("features", []):
                    props = feat.get("properties") or {}
                    geom = feat.get("geometry") or {}
                    if geom.get("type") == "Point":
                        lng, lat = geom["coordinates"]
                        raw_name = str(props.get("name") or props.get("id") or "")
                        if raw_name:
                            index[_norm_name(raw_name)] = (lat, lng)
                logger.info("GeoJSON index: %d entries from %s", len(index), path)
                return index
            except Exception as exc:  # noqa: BLE001
                logger.warning("Could not load geojson at %s: %s", path, exc)
    logger.warning("Static datacenters.geojson not found; skipping precise-match step.")
    return {}


def _resolve_fast(
    name: str,
    city: str,
    geojson_index: dict[str, tuple[float, float]],
) -> tuple[float, float] | None:
    """Fast (no-network) coordinate resolution."""
    # 1. Precise geojson name match
    norm = _norm_name(name)
    if norm in geojson_index:
        return geojson_index[norm]
    for gj_norm, coords in geojson_index.items():
        if norm and gj_norm and (norm in gj_norm or gj_norm in norm):
            return coords

    # 2. Exact city lookup
    city_key = city.strip().lower()
    if city_key in CITY_COORDS:
        return CITY_COORDS[city_key]

    # 3. Partial city match (e.g. "Navi Mumbai" ↔ "Mumbai")
    for key, coords in CITY_COORDS.items():
        if city_key in key or key in city_key:
            return coords

    return None


def _nominatim_search(query: str) -> tuple[float, float] | None:
    """Blocking Nominatim call. Run via asyncio.to_thread."""
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


# ---------------------------------------------------------------------------
# Main entry point
# ---------------------------------------------------------------------------

async def geocode_facilities(force: bool = False) -> dict[str, int]:
    """
    Geocode facilities missing lat/lng.

    Pass 1: fast, no network (geojson name match + city centroid lookup).
    Pass 2: Nominatim fallback for any still-unresolved rows (rate-limited).

    Args:
        force: Re-geocode even facilities that already have coordinates.

    Returns:
        dict with keys 'precise', 'city', 'nominatim', 'failed', 'total'.
    """
    geojson_index = _load_geojson_index()

    async with async_session_factory() as db:
        stmt = select(DataCenterFacility)
        if not force:
            stmt = stmt.where(DataCenterFacility.latitude.is_(None))
        rows: list[DataCenterFacility] = list((await db.execute(stmt)).scalars().all())

    total = len(rows)
    if total == 0:
        logger.info("Geocoding: all facilities already have coordinates.")
        return {"precise": 0, "city": 0, "nominatim": 0, "failed": 0, "total": 0}

    logger.info("Geocoding %d facilit%s …", total, "y" if total == 1 else "ies")

    counts = {"precise": 0, "city": 0, "nominatim": 0, "failed": 0}
    nominatim_queue: list[DataCenterFacility] = []

    # Pass 1: fast resolution
    for facility in rows:
        coords = _resolve_fast(facility.name, facility.city, geojson_index)
        if coords:
            source = "precise" if _norm_name(facility.name) in geojson_index else "city"
            async with async_session_factory() as db:
                await db.execute(
                    update(DataCenterFacility)
                    .where(DataCenterFacility.id == facility.id)
                    .values(latitude=coords[0], longitude=coords[1])
                )
                await db.commit()
            counts[source] += 1
        else:
            nominatim_queue.append(facility)

    logger.info(
        "Pass 1 done — precise: %d, city-centroid: %d, queued for Nominatim: %d",
        counts["precise"], counts["city"], len(nominatim_queue),
    )

    # Pass 2: Nominatim fallback for anything still unresolved
    for idx, facility in enumerate(nominatim_queue, start=1):
        loc = facility.location_detail or ""
        loc_clean = re.sub(r",?\s*Postal:\s*\d+", "", loc, flags=re.IGNORECASE).strip()
        primary_q = f"{loc_clean}, {facility.city}, {facility.state}, India" if loc_clean else f"{facility.city}, {facility.state}, India"
        fallback_q = f"{facility.city}, {facility.state}, India"

        coords = await asyncio.to_thread(_nominatim_search, primary_q)
        await asyncio.sleep(RATE_LIMIT_SECS)
        if not coords:
            coords = await asyncio.to_thread(_nominatim_search, fallback_q)
            await asyncio.sleep(RATE_LIMIT_SECS)

        if coords:
            async with async_session_factory() as db:
                await db.execute(
                    update(DataCenterFacility)
                    .where(DataCenterFacility.id == facility.id)
                    .values(latitude=coords[0], longitude=coords[1])
                )
                await db.commit()
            counts["nominatim"] += 1
            logger.info("[Nominatim %d/%d] ✓ %s → %.5f, %.5f", idx, len(nominatim_queue), facility.name, *coords)
        else:
            counts["failed"] += 1
            logger.warning("[Nominatim %d/%d] ✗ %s (%s)", idx, len(nominatim_queue), facility.name, facility.city)

    counts["total"] = total
    logger.info(
        "Geocoding complete — precise: %d, city: %d, nominatim: %d, failed: %d / %d total",
        counts["precise"], counts["city"], counts["nominatim"], counts["failed"], total,
    )
    return counts


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    force = "--force" in sys.argv
    asyncio.run(geocode_facilities(force=force))


if __name__ == "__main__":
    main()
