"""
Solar & Wind Assessment Routes
Provides analyze, live-weather, and static GeoJSON endpoints.
"""
import asyncio
import os
import logging
from pathlib import Path

import requests_cache
from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel
from retry_requests import retry
import openmeteo_requests

from app.domains.solar_assessment.services.assessment_service import AssessmentService

logger = logging.getLogger(__name__)

router = APIRouter()

# ── Paths ──────────────────────────────────────────────────────────────────
BASE_DIR = Path(__file__).resolve().parents[4]  # backend/
DATA_DIR = BASE_DIR / "data"
EE_KEY_PATH = DATA_DIR / "ee-dharanv2006-02c1bec957ad.json"
WIND_SOLAR_GEOJSON = DATA_DIR / "wind_solar_data.geojson"

# ── Service singleton ───────────────────────────────────────────────────────
_assessment_service: AssessmentService | None = None


def get_assessment_service() -> AssessmentService:
    global _assessment_service
    if _assessment_service is None:
        _assessment_service = AssessmentService(str(DATA_DIR), str(EE_KEY_PATH))
    return _assessment_service


# ── Open-Meteo client (cached) ──────────────────────────────────────────────
_cache_session = requests_cache.CachedSession(
    str(DATA_DIR / ".weather_cache"), expire_after=3600
)
_retry_session = retry(_cache_session, retries=5, backoff_factor=0.2)
_openmeteo = openmeteo_requests.Client(session=_retry_session)


# ── Pydantic models ─────────────────────────────────────────────────────────
class LocationRequest(BaseModel):
    lat: float
    lon: float


# ── Endpoints ───────────────────────────────────────────────────────────────

@router.get("/data/wind-solar-data")
async def serve_wind_solar_geojson():
    """Serve the wind & solar GeoJSON data layer."""
    if not WIND_SOLAR_GEOJSON.exists():
        raise HTTPException(status_code=404, detail="wind_solar_data.geojson not found")
    return FileResponse(
        path=str(WIND_SOLAR_GEOJSON),
        media_type="application/geo+json",
        headers={"Cache-Control": "public, max-age=86400"},
    )


@router.post("/live-weather")
async def api_live_weather(loc: LocationRequest):
    """Fetch real-time atmospheric data at 80m / 120m / 180m hub heights."""
    result = await asyncio.to_thread(_get_live_forecast, loc.lat, loc.lon)
    if not result:
        raise HTTPException(status_code=500, detail="Live weather data fetch failed")
    return result


@router.post("/analyze")
async def api_analyze(loc: LocationRequest):
    """
    Run a full wind / solar / water site analysis.
    Returns HTTP 503 if Earth Engine credentials are not configured.
    """
    service = get_assessment_service()

    if not service._ee_initialized:
        raise HTTPException(
            status_code=503,
            detail=(
                "Google Earth Engine credentials are not configured on this server. "
                "Please upload the service account key file at "
                f"{EE_KEY_PATH} and restart the backend."
            ),
        )

    try:
        result = await asyncio.to_thread(service.analyze, loc.lat, loc.lon)
        return result
    except Exception as e:
        logger.error(f"[analyze] Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ── Live weather helper ──────────────────────────────────────────────────────

def _get_live_forecast(lat: float, lon: float) -> dict | None:
    url = "https://api.open-meteo.com/v1/forecast"
    params = {
        "latitude": lat,
        "longitude": lon,
        "hourly": [
            "wind_speed_80m", "wind_speed_120m", "wind_speed_180m",
            "wind_direction_80m", "wind_direction_120m", "wind_direction_180m",
            "temperature_120m", "pressure_msl",
            "relative_humidity_2m", "precipitation", "cloud_cover",
            "visibility", "apparent_temperature",
        ],
        "timezone": "auto",
        "forecast_days": 1,
    }
    try:
        responses = _openmeteo.weather_api(url, params=params)
        if not responses:
            return None

        hourly = responses[0].Hourly()

        def get_val(idx: int) -> float:
            try:
                var = hourly.Variables(idx)
                if not var or var.ValuesAsNumpy().size == 0:
                    return 0.0
                return float(var.ValuesAsNumpy()[0])
            except Exception:
                return 0.0

        press_msl = get_val(7)
        temp_120 = get_val(6)
        denom = temp_120 + 273.15
        air_density = (press_msl * 100) / (287.05 * denom) if denom != 0 else 1.225

        return {
            "wind_speed_80m": round(get_val(0), 2),
            "wind_speed_120m": round(get_val(1), 2),
            "wind_speed_180m": round(get_val(2), 2),
            "wind_direction_80m": round(get_val(3), 1),
            "wind_direction_120m": round(get_val(4), 1),
            "wind_direction_180m": round(get_val(5), 1),
            "temperature_120m": round(temp_120, 1),
            "air_density_120m": round(air_density, 3),
            "pressure_msl": round(press_msl, 1),
            "humidity": round(get_val(8), 0),
            "precipitation": round(get_val(9), 1),
            "cloud_cover": round(get_val(10), 0),
            "visibility": round(get_val(11) / 1000, 1),
            "apparent_temp": round(get_val(12), 1),
        }
    except Exception as e:
        logger.error(f"[live-weather] OpenMeteo error: {type(e).__name__}: {e}")
        return None
