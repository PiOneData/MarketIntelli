"""
Airport Registry Routes
Serves India airport data from the bundled airports.json data file.
"""
import json
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, HTTPException, Query

router = APIRouter()

DATA_FILE = Path(__file__).parents[4] / "data" / "airports.json"

_airports_cache: list[dict] | None = None


def _load_airports() -> list[dict]:
    global _airports_cache
    if _airports_cache is None:
        with open(DATA_FILE, encoding="utf-8") as f:
            _airports_cache = json.load(f)
    return _airports_cache


@router.get("/airports")
def list_airports(
    state: Optional[str] = Query(None, description="Filter by state/UT"),
    type: Optional[str] = Query(None, description="Filter by airport type"),
    status: Optional[str] = Query(None, description="Filter by operational status"),
    green_only: bool = Query(False, description="Only return green airports"),
    search: Optional[str] = Query(None, description="Search by name, city, or IATA code"),
) -> dict:
    airports = _load_airports()
    filtered = airports

    if green_only:
        filtered = [a for a in filtered if a.get("is_green")]

    if state:
        filtered = [a for a in filtered if (a.get("State / UT") or "").lower() == state.lower()]

    if type:
        filtered = [a for a in filtered if (a.get("Type") or "").lower() == type.lower()]

    if status:
        filtered = [a for a in filtered if (a.get("Status") or "").lower() == status.lower()]

    if search:
        q = search.lower()
        filtered = [
            a for a in filtered
            if q in (a.get("Airport Name") or "").lower()
            or q in (a.get("City") or "").lower()
            or q in (a.get("IATA Code") or "").lower()
            or q in (a.get("State / UT") or "").lower()
        ]

    return {"airports": filtered, "total": len(filtered)}


@router.get("/airports/meta")
def get_airports_meta() -> dict:
    airports = _load_airports()
    states = sorted({a.get("State / UT") for a in airports if a.get("State / UT")})
    types = sorted({a.get("Type") for a in airports if a.get("Type")})
    statuses = sorted({a.get("Status") for a in airports if a.get("Status")})
    return {"states": states, "types": types, "statuses": statuses}


def _parse_mw(value: object) -> float:
    """Parse a MW value that may be prefixed with '~' or be N/A."""
    if value is None:
        return 0.0
    if isinstance(value, (int, float)):
        return float(value)
    s = str(value).replace(",", "").strip().lstrip("~").strip()
    if s in ("N/A", "NA", "n/a", ""):
        return 0.0
    try:
        return float(s)
    except ValueError:
        return 0.0


@router.get("/airports/power-stats")
def get_airports_power_stats() -> dict:
    """Aggregate power consumption and solar generation stats across all airports."""
    airports = _load_airports()
    total_power_mw = sum(_parse_mw(a.get("Power Consumption (MW)")) for a in airports)
    total_solar_mw = sum(_parse_mw(a.get("Solar Capacity Installed (MW)")) for a in airports)
    grid_power_mw = max(total_power_mw - total_solar_mw, 0.0)
    green_share_pct = (total_solar_mw / total_power_mw * 100) if total_power_mw > 0 else 0.0
    grid_share_pct = 100.0 - green_share_pct if total_power_mw > 0 else 0.0
    airports_with_power = sum(1 for a in airports if _parse_mw(a.get("Power Consumption (MW)")) > 0)
    airports_with_solar = sum(1 for a in airports if _parse_mw(a.get("Solar Capacity Installed (MW)")) > 0)
    return {
        "total_airports": len(airports),
        "airports_with_power_data": airports_with_power,
        "airports_with_solar_data": airports_with_solar,
        "total_power_mw": round(total_power_mw, 1),
        "total_solar_mw": round(total_solar_mw, 1),
        "grid_power_mw": round(grid_power_mw, 1),
        "green_share_pct": round(green_share_pct, 1),
        "grid_share_pct": round(grid_share_pct, 1),
        "source": "AAI / MoCA · airports.json",
    }


@router.get("/airports/{airport_id}")
def get_airport(airport_id: int) -> dict:
    airports = _load_airports()
    for a in airports:
        sno = a.get("S.No")
        if sno is not None and int(sno) == airport_id:
            return a
    raise HTTPException(status_code=404, detail="Airport not found")
