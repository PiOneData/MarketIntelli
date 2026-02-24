"""
Solar & Wind Assessment Routes
Provides analyze, live-weather, and static GeoJSON endpoints.
Optional dependencies (earthengine-api, openmeteo-requests, requests-cache,
retry-requests) are imported lazily so the backend starts cleanly even when
those packages haven't been installed yet.

Google Earth Engine credentials are loaded from the `google_service_credentials`
DB table (the active row).  If no DB credentials exist, the route falls back to
the legacy key file on disk.
"""
import asyncio
import logging
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.domains.geo_analytics.models.spatial import GoogleServiceCredential

logger = logging.getLogger(__name__)

router = APIRouter()

# ── Paths ──────────────────────────────────────────────────────────────────
# __file__ = backend/app/domains/solar_assessment/routes/solar_assessment.py
# parents[4] resolves to the backend/ root (or /app inside Docker)
BASE_DIR = Path(__file__).resolve().parents[4]
DATA_DIR = BASE_DIR / "data"
EE_KEY_PATH = DATA_DIR / "ee-dharanv2006-02c1bec957ad.json"
WIND_SOLAR_GEOJSON = DATA_DIR / "wind_solar_data.geojson"

# ── Lazy singletons ─────────────────────────────────────────────────────────
_assessment_service = None
_openmeteo_client = None


async def _fetch_db_credentials(db: AsyncSession) -> dict | None:
    """Fetch the active Google service account credentials row from DB."""
    try:
        result = await db.execute(
            select(GoogleServiceCredential).where(
                GoogleServiceCredential.is_active == True  # noqa: E712
            )
        )
        cred = result.scalar_one_or_none()
        if cred and cred.client_email and cred.private_key:
            return {
                "type": cred.credential_type,
                "project_id": cred.project_id,
                "private_key_id": cred.private_key_id,
                "private_key": cred.private_key,
                "client_email": cred.client_email,
                "client_id": cred.client_id,
                "auth_uri": cred.auth_uri,
                "token_uri": cred.token_uri,
                "auth_provider_x509_cert_url": cred.auth_provider_x509_cert_url,
                "client_x509_cert_url": cred.client_x509_cert_url,
            }
    except Exception as exc:
        logger.error(f"[EE] Failed to fetch credentials from DB: {exc}")
    return None


def _get_assessment_service(credentials_dict: dict | None = None):
    """Return (and lazily create) the AssessmentService singleton.

    If the current singleton is not yet EE-initialised, we re-create it so
    that newly added DB credentials are picked up without a restart.
    """
    global _assessment_service
    if _assessment_service is not None and _assessment_service._ee_initialized:
        return _assessment_service

    from app.domains.solar_assessment.services.assessment_service import (
        AssessmentService,
    )

    if credentials_dict:
        _assessment_service = AssessmentService(
            str(DATA_DIR),
            credentials_dict=credentials_dict,
        )
    else:
        _assessment_service = AssessmentService(
            str(DATA_DIR),
            ee_key_path=str(EE_KEY_PATH),
        )
    return _assessment_service


def _get_openmeteo():
    global _openmeteo_client
    if _openmeteo_client is None:
        try:
            import requests_cache
            from retry_requests import retry
            import openmeteo_requests

            cache_session = requests_cache.CachedSession(
                str(DATA_DIR / ".weather_cache"), expire_after=3600
            )
            retry_session = retry(cache_session, retries=5, backoff_factor=0.2)
            _openmeteo_client = openmeteo_requests.Client(session=retry_session)
        except ImportError as exc:
            raise HTTPException(
                status_code=503,
                detail=(
                    f"Live weather service is unavailable: {exc}. "
                    "Install openmeteo-requests, requests-cache, retry-requests."
                ),
            ) from exc
    return _openmeteo_client


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
    if result is None:
        raise HTTPException(status_code=500, detail="Live weather data fetch failed")
    return result


@router.post("/analyze")
async def api_analyze(
    loc: LocationRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Run a full wind / solar / water site analysis via Google Earth Engine.

    Credentials are fetched from the `google_service_credentials` DB table
    (active row).  Falls back to a key file on disk if no DB record exists.
    Returns HTTP 503 if no credentials are configured or if the
    earthengine-api package is not installed.
    """
    # Fetch DB credentials first; fall back to file-based init
    credentials_dict = await _fetch_db_credentials(db)

    try:
        service = _get_assessment_service(credentials_dict)
    except ImportError as exc:
        raise HTTPException(
            status_code=503,
            detail=f"Earth Engine package not installed: {exc}",
        ) from exc

    if not service._ee_initialized:
        raise HTTPException(
            status_code=503,
            detail=(
                "Google Earth Engine credentials are not configured. "
                "Insert a row into the google_service_credentials table "
                "(is_active = true) or upload a key file to "
                f"{EE_KEY_PATH} and restart."
            ),
        )

    try:
        result = await asyncio.to_thread(service.analyze, loc.lat, loc.lon)
        return result
    except Exception as exc:
        logger.error(f"[analyze] Error: {exc}")
        raise HTTPException(status_code=500, detail=str(exc)) from exc


# ── Live weather helper ──────────────────────────────────────────────────────

def _get_live_forecast(lat: float, lon: float) -> dict | None:
    try:
        client = _get_openmeteo()
    except HTTPException:
        return None

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
        responses = client.weather_api(url, params=params)
        if not responses:
            return None

        hourly = responses[0].Hourly()

        def get_val(idx: int) -> float:
            try:
                var = hourly.Variables(idx)
                if not var:
                    return 0.0
                arr = var.ValuesAsNumpy()
                return float(arr[0]) if arr.size > 0 else 0.0
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
    except Exception as exc:
        logger.error(f"[live-weather] OpenMeteo error: {type(exc).__name__}: {exc}")
        return None
