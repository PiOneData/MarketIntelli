"""
RE Potential Assessment Routes
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
from app.domains.geo_analytics.models.spatial import (
    GeeJsonCredential,
    GoogleServiceCredential,
)

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
    """Fetch the active Google service account credentials from DB.

    Checks ``gee_json_credentials`` first (full JSON blob, easiest to insert).
    Falls back to the older ``google_service_credentials`` table that stores
    individual fields.
    """
    # ── 1. Try the JSON-blob table first ────────────────────────────────────
    try:
        json_result = await db.execute(
            select(GeeJsonCredential).where(
                GeeJsonCredential.is_active == True  # noqa: E712
            )
        )
        json_cred = json_result.scalar_one_or_none()
        if json_cred is not None and json_cred.credential_json:
            creds = dict(json_cred.credential_json)
            # Normalise escaped newlines in private_key if stored that way
            pk = creds.get("private_key", "")
            if isinstance(pk, str) and "\\n" in pk:
                creds["private_key"] = pk.replace("\\n", "\n")
            logger.info(
                f"[EE] Loaded JSON-blob credentials '{json_cred.name}' "
                f"for {creds.get('client_email', '?')}"
            )
            return creds
    except Exception as exc:
        logger.warning(f"[EE] Could not read gee_json_credentials: {exc}")

    # ── 2. Fall back to the legacy column-per-field table ───────────────────
    try:
        result = await db.execute(
            select(GoogleServiceCredential).where(
                GoogleServiceCredential.is_active == True  # noqa: E712
            )
        )
        cred = result.scalar_one_or_none()
        if cred is None:
            logger.warning("[EE] No active row found in google_service_credentials.")
            return None
        if not cred.client_email or not cred.private_key:
            logger.warning(
                "[EE] DB credential row found but client_email or private_key is empty."
            )
            return None

        # GCP service account JSON stores the RSA private key with '\n' escape
        # sequences (actual newlines).  If the value was inserted via a tool that
        # serialised the JSON twice, those newlines may have been stored as the
        # two-character literal string r'\n'.  Normalise them to real newlines so
        # the PEM block is valid when we pass it to the EE SDK.
        private_key: str = cred.private_key
        if "\\n" in private_key:
            private_key = private_key.replace("\\n", "\n")

        credentials_dict = {
            "type": cred.credential_type or "service_account",
            "project_id": cred.project_id,
            "private_key_id": cred.private_key_id,
            "private_key": private_key,
            "client_email": cred.client_email,
            "client_id": cred.client_id,
            "auth_uri": cred.auth_uri,
            "token_uri": cred.token_uri,
            "auth_provider_x509_cert_url": cred.auth_provider_x509_cert_url,
            "client_x509_cert_url": cred.client_x509_cert_url,
        }
        logger.info(
            f"[EE] Loaded legacy DB credentials for {cred.client_email} "
            f"(key_id={cred.private_key_id!r}, "
            f"key_starts={private_key[:40]!r})"
        )
        return credentials_dict
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


class GeeJsonCredentialCreate(BaseModel):
    name: str
    credential_json: dict


class GeeJsonCredentialRead(BaseModel):
    id: str
    name: str
    is_active: bool
    client_email: str = ""

    model_config = {"from_attributes": True}


# ── Endpoints ───────────────────────────────────────────────────────────────

# ── GEE JSON credential management ──────────────────────────────────────────

@router.get("/gee-credentials", response_model=list[GeeJsonCredentialRead])
async def list_gee_credentials(
    db: AsyncSession = Depends(get_db),
) -> list[GeeJsonCredentialRead]:
    """List all stored GEE JSON credential records (without the raw key data)."""
    result = await db.execute(select(GeeJsonCredential))
    rows = result.scalars().all()
    out = []
    for r in rows:
        cj = r.credential_json or {}
        out.append(
            GeeJsonCredentialRead(
                id=str(r.id),
                name=r.name,
                is_active=r.is_active,
                client_email=cj.get("client_email", ""),
            )
        )
    return out


@router.post("/gee-credentials", status_code=201)
async def create_gee_credential(
    data: GeeJsonCredentialCreate,
    db: AsyncSession = Depends(get_db),
) -> GeeJsonCredentialRead:
    """Store a new GEE service-account JSON credential.

    Paste the full contents of your downloaded JSON key file into
    ``credential_json``.  If ``is_active`` is True (the default) any existing
    active row is deactivated first so only one credential is active at a time.
    The global AssessmentService singleton is reset so it re-initialises with
    the new key on the next ``/analyze`` call.
    """
    # Deactivate any existing active rows
    from sqlalchemy import update as sa_update

    await db.execute(
        sa_update(GeeJsonCredential)
        .where(GeeJsonCredential.is_active == True)  # noqa: E712
        .values(is_active=False)
    )
    await db.flush()

    new_cred = GeeJsonCredential(
        name=data.name,
        credential_json=data.credential_json,
    )
    db.add(new_cred)
    await db.commit()
    await db.refresh(new_cred)

    # Force re-init of the assessment service singleton on next request
    global _assessment_service
    _assessment_service = None

    return GeeJsonCredentialRead(
        id=str(new_cred.id),
        name=new_cred.name,
        is_active=new_cred.is_active,
        client_email=data.credential_json.get("client_email", ""),
    )


@router.delete("/gee-credentials/{credential_id}", status_code=204)
async def delete_gee_credential(
    credential_id: str,
    db: AsyncSession = Depends(get_db),
) -> None:
    """Delete a stored GEE JSON credential."""
    import uuid as _uuid

    result = await db.execute(
        select(GeeJsonCredential).where(
            GeeJsonCredential.id == _uuid.UUID(credential_id)
        )
    )
    row = result.scalar_one_or_none()
    if row is None:
        raise HTTPException(status_code=404, detail="Credential not found")
    await db.delete(row)
    await db.commit()

    global _assessment_service
    _assessment_service = None


# ── Geocode ──────────────────────────────────────────────────────────────────

@router.get("/geocode")
async def geocode_address(
    address: str,
    city: str = "",
    state: str = "",
    country: str = "India",
):
    """
    Geocode a postal address using Nominatim (OpenStreetMap) — no API key required.
    Returns lat/lng for datacenters or any other address within India.
    Rate-limited by Nominatim policy: one request per second maximum.
    """
    result = await asyncio.to_thread(
        _nominatim_geocode, address, city, state, country
    )
    if result is None:
        raise HTTPException(
            status_code=404,
            detail="Address could not be geocoded. Try a more specific query.",
        )
    return result


def _nominatim_geocode(
    address: str, city: str, state: str, country: str
) -> dict | None:
    """Blocking Nominatim call — run inside asyncio.to_thread."""
    import json
    import urllib.parse
    import urllib.request

    query = ", ".join(filter(None, [address, city, state, country]))
    params = urllib.parse.urlencode(
        {"q": query, "format": "json", "limit": 1, "addressdetails": 1}
    )
    url = f"https://nominatim.openstreetmap.org/search?{params}"
    # Nominatim requires a descriptive User-Agent; anonymous requests are blocked
    headers = {"User-Agent": "MarketIntelli/1.0 (renewable-energy-intelligence)"}

    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode())
        if data:
            r = data[0]
            return {
                "lat": float(r["lat"]),
                "lng": float(r["lon"]),
                "display_name": r.get("display_name", ""),
                "source": "nominatim/openstreetmap",
                "type": r.get("type", ""),
                "importance": r.get("importance", 0),
            }
    except Exception as exc:
        logger.error(f"[geocode] Nominatim error: {type(exc).__name__}: {exc}")
    return None


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
    Run a full wind / solar / water site analysis.

    Tries Google Earth Engine first (GWA v3 + GSA data).  Falls back to
    Open-Meteo (real-time wind) + PVGIS (solar climatology) when EE is
    unavailable, so the report always returns useful data.
    """
    credentials_dict = await _fetch_db_credentials(db)

    ee_available = False
    service = None
    try:
        service = _get_assessment_service(credentials_dict)
        ee_available = service._ee_initialized
    except ImportError:
        logger.warning("[analyze] earthengine-api not installed — using free-API fallback.")

    if not ee_available:
        logger.info("[analyze] EE not available — computing from Open-Meteo + PVGIS.")
        result = await _analyze_fallback(loc.lat, loc.lon)
        return result

    # EE is available — run full analysis
    try:
        result = await asyncio.to_thread(service.analyze, loc.lat, loc.lon)  # type: ignore[union-attr]
        # Supplement any empty wind section with live-weather fallback
        if not result.get("wind") or not result["wind"].get("score"):
            live = await asyncio.to_thread(_get_live_forecast, loc.lat, loc.lon)
            if live:
                result["wind"] = _compute_wind_from_live_data(live)
        return result
    except Exception as exc:
        logger.error(f"[analyze] EE error: {exc} — falling back to free APIs.")
        result = await _analyze_fallback(loc.lat, loc.lon)
        return result


# ── Free-API fallback helpers ────────────────────────────────────────────────

async def _analyze_fallback(lat: float, lon: float) -> dict:
    """Best-effort analysis from Open-Meteo + PVGIS when EE is unavailable."""
    from datetime import datetime

    live_task  = asyncio.to_thread(_get_live_forecast, lat, lon)
    solar_task = asyncio.to_thread(_fetch_pvgis_solar, lat, lon)
    hydro_task = asyncio.to_thread(_fetch_open_meteo_hydrology, lat, lon)

    live, solar_data, hydro_data = await asyncio.gather(
        live_task, solar_task, hydro_task, return_exceptions=True
    )

    live        = live        if isinstance(live,       dict) else None
    solar_data  = solar_data  if isinstance(solar_data, dict) else None
    hydro_data  = hydro_data  if isinstance(hydro_data, dict) else None

    wind_data: dict = _compute_wind_from_live_data(live) if live else {}
    solar_res: dict = solar_data or {}
    water_res: dict = hydro_data or {}

    w_score = wind_data.get("score", 0)
    s_score = solar_res.get("score", 0)
    wt_score = water_res.get("composite_risk_score", 0)
    overall = round((w_score * 0.35) + (s_score * 0.35) + (wt_score * 0.30), 1)

    if overall >= 75: rating = "PREMIUM SITE"
    elif overall >= 60: rating = "OPTIMAL"
    elif overall >= 45: rating = "VIABLE"
    else: rating = "CHALLENGING"

    return {
        "wind":  wind_data,
        "solar": solar_res,
        "water": water_res,
        "suitability": {
            "overall_score": overall,
            "rating": rating,
            "insights": [
                "Analysis computed from real-time Open-Meteo & PVGIS data.",
                "Configure Google Earth Engine for full GWA v3 wind atlas precision.",
            ],
            "components": {"solar": s_score, "wind": w_score, "water": wt_score},
        },
        "location":  {"lat": lat, "lon": lon},
        "timestamp": datetime.now().isoformat(),
        "source":    "open-meteo+pvgis-fallback",
    }


def _compute_wind_from_live_data(live: dict) -> dict:
    """Derive a full wind analysis dict from Open-Meteo hub-height observations."""
    import math
    from app.domains.solar_assessment.services.assessment_service import (
        _analyze_wind_potential,
    )

    ws80  = float(live.get("wind_speed_80m",  0) or 0)
    ws120 = float(live.get("wind_speed_120m", 0) or 0)
    ws180 = float(live.get("wind_speed_180m", 0) or 0)
    ad    = float(live.get("air_density_120m", 1.225) or 1.225)

    # Interpolate at 100 m AGL (linear between 80 m and 120 m)
    ws100 = ws80 + (ws120 - ws80) * 0.5 if (ws80 > 0 or ws120 > 0) else 0.0

    pd_val = 0.5 * ad * (ws100 ** 3)  # W/m²

    # Hellmann wind-shear exponent (log-law)
    shear_alpha = 0.143
    shear_ratio = 0.0
    if ws80 > 0 and ws120 > 0:
        try:
            shear_alpha = math.log(ws120 / ws80) / math.log(120.0 / 80.0)
        except (ValueError, ZeroDivisionError):
            pass
    if ws80 > 0:
        shear_ratio = round(ws100 / ws80, 3)

    # Simplified empirical IEC capacity-factor estimates
    def _cf(ws: float, rated: float) -> float:
        if ws < 3.0 or ws > 25.0:
            return 0.0
        return min(0.48, ((ws - 3.0) / max(rated - 3.0, 1)) ** 2.5 * 0.48)

    cf1 = round(_cf(ws100, 13.5), 3)
    cf2 = round(_cf(ws100, 11.5), 3)
    cf3 = round(_cf(ws100,  9.5), 3)

    raw = {
        "ws_100": round(ws100, 2), "pd_100": round(pd_val, 1), "ad_100": round(ad, 3),
        "ruggedness_index": 0.0, "cf_iec1": cf1, "cf_iec2": cf2, "cf_iec3": cf3,
        "slope": 0.0, "elevation": 0.0,
    }
    result = _analyze_wind_potential(raw)

    if pd_val >= 600: score = 90
    elif pd_val >= 400: score = 75
    elif pd_val >= 300: score = 60
    elif pd_val >= 200: score = 45
    elif pd_val >= 100: score = 30
    else: score = 10

    result["score"]   = score
    result["terrain"] = {"slope": 0.0, "elevation": 0.0}
    result["metadata"] = {
        "source":      "Open-Meteo Real-Time Atmospheric Data",
        "provider":    "Open-Meteo (live fallback — configure Earth Engine for GWA v3)",
        "methodology": "Empirical power-law interpolation from hub-height observations",
    }
    result["profile"] = {
        "heights":     [80, 100, 120, 180],
        "speeds":      [ws80, round(ws100, 2), ws120, ws180],
        "densities":   [
            round(0.5 * ad * ws80  ** 3, 1),
            round(pd_val, 1),
            round(0.5 * ad * ws120 ** 3, 1),
            round(0.5 * ad * ws180 ** 3, 1),
        ],
        "air_density": [ad, ad, ad, ad],
    }
    result["physics"] = {
        "shear_alpha": round(shear_alpha, 3),
        "shear_ratio": shear_ratio,
    }
    cf_best = max(cf1, cf2, cf3)
    result["yield_est"] = {
        "annual_kwh_2mw": round(2000 * cf_best * 8760),
        "annual_mwh_2mw": round(2000 * cf_best * 8760 / 1000, 1),
    }
    return result


def _fetch_pvgis_solar(lat: float, lon: float) -> dict | None:
    """Fetch solar resource data from PVGIS 5.2 (EU JRC). No API key required."""
    import json, urllib.parse, urllib.request
    try:
        params = urllib.parse.urlencode({
            "lat": round(lat, 4), "lon": round(lon, 4),
            "peakpower": 1, "loss": 14, "outputformat": "json", "browser": 0,
        })
        url = f"https://re.jrc.ec.europa.eu/api/v5_2/PVcalc?{params}"
        req = urllib.request.Request(url, headers={"User-Agent": "MarketIntelli/1.0"})
        with urllib.request.urlopen(req, timeout=12) as resp:
            data = json.loads(resp.read().decode())

        totals  = data.get("outputs", {}).get("totals", {}).get("fixed", {})
        monthly_raw = data.get("outputs", {}).get("monthly", {}).get("fixed", [])

        ghi_y   = float(totals.get("H(i)_y", 0) or 0)
        pvout_y = float(totals.get("E_y",    0) or 0)
        if ghi_y == 0 and monthly_raw:
            ghi_y = sum(float(m.get("H(i)_m", 0) or 0) for m in monthly_raw)

        if ghi_y >= 2000: score = 90; grade = "A+"; label = "World-class irradiance"
        elif ghi_y >= 1800: score = 75; grade = "A";  label = "Excellent solar resource"
        elif ghi_y >= 1600: score = 60; grade = "B";  label = "Good commercial viability"
        elif ghi_y >= 1400: score = 45; grade = "C";  label = "Moderate resource"
        else:               score = 25; grade = "D";  label = "Marginal resource"

        monthly_vals = [float(m.get("H(i)_m", 0) or 0) for m in monthly_raw]

        # Estimate DNI ≈ 60–65 % of GHI for Indian subcontinent
        dni_est = round(ghi_y * 0.62, 1)
        dif_est = round(ghi_y - dni_est, 1)

        return {
            "score": score,
            "resource": {
                "grade": grade, "label": label,
                "ghi":   round(ghi_y, 1),
                "dni":   dni_est,
                "dif":   dif_est,
                "pvout": round(pvout_y, 1),
                "ltdi":  round(dif_est / ghi_y, 3) if ghi_y > 0 else 0,
            },
            "monthly": {"values": monthly_vals},
            "metadata": {
                "source":      "PVGIS 5.2",
                "provider":    "EU JRC / Copernicus SARAH-2",
                "unit_ghi":   "kWh/m²/year",
                "unit_pvout": "kWh/kWp/year",
            },
        }
    except Exception as exc:
        logger.warning(f"[PVGIS] Solar data fetch failed: {type(exc).__name__}: {exc}")
        return None


def _fetch_open_meteo_hydrology(lat: float, lon: float) -> dict | None:
    """Fetch soil moisture + ET data from Open-Meteo (no API key required)."""
    try:
        client = _get_openmeteo()
    except HTTPException:
        return None

    url = "https://api.open-meteo.com/v1/forecast"
    params = {
        "latitude": lat, "longitude": lon,
        "daily": [
            "et0_fao_evapotranspiration",
            "precipitation_sum",
            "rain_sum",
        ],
        "hourly": [
            "soil_moisture_0_to_1cm",
            "soil_moisture_1_to_3cm",
            "soil_moisture_3_to_9cm",
            "soil_moisture_9_to_27cm",
        ],
        "timezone": "auto",
        "forecast_days": 1,
    }
    try:
        responses = client.weather_api(url, params=params)
        if not responses:
            return None

        r = responses[0]
        daily  = r.Daily()
        hourly = r.Hourly()

        def daily_val(idx: int) -> float:
            try:
                arr = daily.Variables(idx).ValuesAsNumpy()
                return float(arr[0]) if arr.size > 0 else 0.0
            except Exception:
                return 0.0

        def hourly_val(idx: int) -> float:
            try:
                arr = hourly.Variables(idx).ValuesAsNumpy()
                return float(arr[0]) if arr.size > 0 else 0.0
            except Exception:
                return 0.0

        et0   = daily_val(0)
        precip = daily_val(1)

        sm0   = hourly_val(0)
        sm1   = hourly_val(1)
        sm3   = hourly_val(2)
        sm9   = hourly_val(3)

        # Composite water availability score (0–100)
        et_norm    = max(0, min(100, (1 - et0 / 10) * 100))
        precip_norm = max(0, min(100, precip / 20 * 100))
        composite  = round((et_norm * 0.4) + (precip_norm * 0.6), 1)

        interp = (
            "Water-stressed region" if composite < 30
            else "Moderate water availability" if composite < 60
            else "Good water availability"
        )

        return {
            "composite_risk_score": composite,
            "grace_anomaly": 0.0,
            "pdsi": 0.0,
            "interpretation": interp,
            "soil_moisture": {
                "layer_0_10cm": round(sm0, 3),
                "shallow_1_3cm": round(sm1, 3),
                "mid_3_9cm": round(sm3, 3),
                "deep_9_27cm": round(sm9, 3),
            },
            "terraclimate": {
                "actual_et_mm_month": round(et0 * 30, 1),
                "actual_et_annual_mm": round(et0 * 365, 1),
                "pdsi": 0.0,
                "pdsi_label": "No EE data",
                "soil_moisture_mm": round((sm0 + sm1 + sm3 + sm9) * 250, 1),
                "runoff_mm_month": 0.0,
                "runoff_annual_mm": 0.0,
            },
            "modis_et": {
                "et_kg_m2_8day": round(et0 * 8, 2),
                "et_monthly_est": round(et0 * 30, 1),
                "et_annual_est_mm": round(et0 * 365, 1),
            },
            "precipitation": {
                "daily_mm": round(precip, 2),
                "annual_mm": round(precip * 365, 1),
                "period": "Open-Meteo forecast",
            },
            "metadata": {
                "source":  "Open-Meteo",
                "provider": "Open-Meteo (live fallback — configure Earth Engine for GRACE/PDSI)",
            },
        }
    except Exception as exc:
        logger.error(f"[hydrology] Open-Meteo error: {type(exc).__name__}: {exc}")
        return None


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
