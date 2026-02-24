from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel
import ee
import json
import os
import requests_cache
import pandas as pd
from retry_requests import retry
import openmeteo_requests
import requests
from assessment_service import AssessmentService
from datetime import datetime
import asyncio

# ============================================================
# APP INITIALIZATION & PATHS
# ============================================================
app = FastAPI(title="Wind Intelligence API")

from fastapi.staticfiles import StaticFiles

# Setup Paths relative to this file
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")
EE_KEY_PATH = os.path.join(DATA_DIR, "ee-dharanv2006-02c1bec957ad.json")
GEOJSON_PATH = os.path.join(DATA_DIR, "wind_solar_data.geojson")

# Standard CORSMiddleware - Recommended for most use cases
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Robust way to serve large GeoJSON: StaticFiles
app.mount("/data", StaticFiles(directory=DATA_DIR), name="data")

# Initialize Assessment Service
assessment_service = AssessmentService(DATA_DIR, EE_KEY_PATH)

# Earth Engine is initialized within AssessmentService

# ============================================================
# UTILITIES & LIVE WEATHER (Open-Meteo)
# ============================================================
cache_session = requests_cache.CachedSession('.cache', expire_after=3600)
retry_session = retry(cache_session, retries=5, backoff_factor=0.2)
openmeteo = openmeteo_requests.Client(session=retry_session)

class LocationRequest(BaseModel):
    lat: float
    lon: float


def get_live_forecast(lat, lon):
    url = "https://api.open-meteo.com/v1/forecast"
    params = {
        "latitude": lat, "longitude": lon,
        "hourly": [
            "wind_speed_80m", "wind_speed_120m", "wind_speed_180m", 
            "wind_direction_80m", "wind_direction_120m", "wind_direction_180m",
            "temperature_120m", "pressure_msl",
            "relative_humidity_2m", "precipitation", "cloud_cover", "visibility", "apparent_temperature"
        ],
        "timezone": "auto", "forecast_days": 1
    }
    print(f"📡 Fetching live weather for: {lat}, {lon}")
    try:
        responses = openmeteo.weather_api(url, params=params)
        if not responses:
            print("❌ No response from Open-Meteo")
            return None
        
        response = responses[0]
        hourly = response.Hourly()

        def get_val(var_index):
            try:
                var = hourly.Variables(var_index)
                if not var or var.ValuesAsNumpy().size == 0: return 0.0
                return float(var.ValuesAsNumpy()[0])
            except Exception as e:
                print(f"Error getting value {var_index}: {e}")
                return 0.0

        press_msl = get_val(7)
        temp_120 = get_val(6)
        
        # Air Density Calculation
        air_density = (press_msl * 100) / (287.05 * (temp_120 + 273.15)) if (temp_120 + 273.15) != 0 else 1.225

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
            "visibility": round(get_val(11) / 1000, 1), # KM
            "apparent_temp": round(get_val(12), 1)
        }
    except Exception as e:
        print(f"🛑 OpenMeteo Critical Error: {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()
        return None

# ============================================================
# WIND ANALYSIS LOGIC
# ============================================================
def analyze_wind_potential(data):
    ws = data.get('ws_100', 0)
    pd_val = data.get('pd_100', 0)
    ad_val = data.get('ad_100', 1.225)
    rix = data.get('ruggedness_index', 0)
    slope = data.get('slope', 0)
    elev = data.get('elevation', 0)

    # 1. Resource Grading (A-F) based on Power Density
    if pd_val >= 600: grade, grade_desc = "A+", "World-class resource"
    elif pd_val >= 400: grade, grade_desc = "A", "Outstanding potential"
    elif pd_val >= 300: grade, grade_desc = "B", "Commercial viability"
    elif pd_val >= 200: grade, grade_desc = "C", "Moderate resource"
    elif pd_val >= 100: grade, grade_desc = "D", "Marginal suitability"
    else: grade, grade_desc = "F", "Unsuitable"

    # 2. Contextual Insights
    insights = []
    if ad_val < 1.15:
        loss = round(((1.225 - ad_val) / 1.225) * 100, 1)
        insights.append(f"Low air density detected. Expect ~{loss}% energy loss compared to STP.")
    if rix > 0.3:
        insights.append("High terrain ruggedness (RIX > 0.3) suggests significant turbulence risk.")
    if slope > 15:
        insights.append("Steep terrain (>15°) may complicate turbine installation and access.")
    if not insights:
        insights.append("Stable site conditions with consistent laminar flow potential.")

    # 3. Best Fit Turbine recommendation
    cf1 = data.get('cf_iec1', 0)
    cf2 = data.get('cf_iec2', 0)
    cf3 = data.get('cf_iec3', 0)
    cfs = [cf1, cf2, cf3]
    best_idx = cfs.index(max(cfs)) if max(cfs) > 0 else 2
    turbine_recommendation = ["IEC Class 1 (High Wind)", "IEC Class 2 (Medium Wind)", "IEC Class 3 (Low Wind)"][best_idx]

    return {
        "metadata": {
            "source": "Global Wind Atlas v3 (GWA)",
            "provider": "Technical University of Denmark (DTU)",
            "methodology": "Downscaled ERA5 reanalysis via WRF models",
            "assets": {
                "wind_speed": "projects/sat-io/open-datasets/global_wind_atlas/wind-speed",
                "power_density": "projects/sat-io/open-datasets/global_wind_atlas/power-density",
                "air_density": "projects/sat-io/open-datasets/global_wind_atlas/air-density",
                "capacity_factors": "projects/sat-io/open-datasets/global_wind_atlas/capacity-factor",
                "ruggedness": "projects/sat-io/open-datasets/global_wind_atlas/ruggedness-index"
            }
        },
        "resource": {
            "grade": grade,
            "label": grade_desc,
            "wind_speed": round(ws, 2),
            "power_density": round(pd_val, 1),
            "air_density": round(ad_val, 3)
        },
        "feasibility": {
            "rix": round(rix, 2),
            "slope": round(slope, 1),
            "elevation": round(elev, 0),
            "status": "Feasible" if rix < 0.5 and slope < 20 else "Challenging"
        },
        "insights": insights,
        "turbine": {
            "best_fit": turbine_recommendation,
            "cf_iec1": round(cf1, 3),
            "cf_iec2": round(cf2, 3),
            "cf_iec3": round(cf3, 3)
        }
    }

def generate_site_insights(wind, solar, water):
    insights = []
    w_score = wind.get('score', 0)
    s_score = solar.get('score', 0)
    wt_score = water.get('composite_risk_score', 0)
    
    # ── Site Archetype ──
    if w_score > 60 and s_score > 60:
        insights.append("Prime Hybrid Site: Exceptional co-location potential for Wind & Solar.")
    elif w_score > 70:
        insights.append("Wind-Dominant: World-class wind resource detected; prioritize high-hub turbines.")
    elif s_score > 70:
        insights.append("Solar-Dominant: Optimal GHI and sky clarity; ideal for large-scale PV tracking.")

    # ── Water Context ──
    if wt_score < 30:
        insights.append("Critical Resource Sync: Severe water stress detected. Air-cooling or dry-cleaning systems recommended.")
    elif wt_score > 70:
        insights.append("Hydrological Buffer: Abundant surface/ground water resources available.")

    # ── Infrastructure ──
    infra = water.get('infrastructure')
    if infra and infra.get('dist_km', 100) < 10:
        insights.append(f"Grid Advantage: Proximity to {infra['name']} ({infra['dist_km']}km) reduces interconnection CAPEX.")

    # ── Geomorphology ──
    if wind.get('terrain', {}).get('slope', 0) > 15:
        insights.append("Logistical Note: Steep terrain identified. Civil works may require reinforced foundations.")
    
    return insights

# ============================================================
# API ENDPOINTS
# ============================================================

@app.post("/live-weather")
async def api_live_weather(loc: LocationRequest):
    res = get_live_forecast(loc.lat, loc.lon)
    if not res: raise HTTPException(status_code=500, detail="Live data fetch failed")
    return res

@app.post("/analyze")
async def api_analyze(loc: LocationRequest):
    try:
        # Run analysis tasks in parallel using asyncio
        # We use asyncio.to_thread because the assessment_service methods are synchronous
        wind_task = asyncio.to_thread(assessment_service.analyze_wind, loc.lat, loc.lon)
        solar_task = asyncio.to_thread(assessment_service.analyze_solar, loc.lat, loc.lon)
        water_task = asyncio.to_thread(assessment_service.analyze_water, loc.lat, loc.lon)

        # Gather results
        wind_data, solar_data, water_data = await asyncio.gather(
            wind_task, solar_task, water_task, return_exceptions=True
        )

        # Handle potential exceptions or None values
        wind_data = wind_data if not isinstance(wind_data, Exception) else {}
        solar_data = solar_data if not isinstance(solar_data, Exception) else {}
        water_data = water_data if not isinstance(water_data, Exception) else {}

        # ── Calculate Combined Site Suitability Score ──
        # Simple weighted logic: Solar (35%), Wind (35%), Water Stress (30%)
        # Water is inversed because higher composite_risk_score usually means more abundance/less risk in this app
        s_score = solar_data.get('score', 0) if solar_data else 0
        w_score = wind_data.get('score', 0) if wind_data else 0
        wt_score = water_data.get('composite_risk_score', 0) if water_data else 0
        
        # Hybrid Score (0-100)
        overall_score = round((s_score * 0.35) + (w_score * 0.35) + (wt_score * 0.30), 1)

        # Generate Hybrid Insights
        site_insights = generate_site_insights(wind_data, solar_data, water_data)

        # Determine overall rating
        if overall_score >= 75: rating = "PREMIUM SITE"
        elif overall_score >= 60: rating = "OPTIMAL"
        elif overall_score >= 45: rating = "VIABLE"
        else: rating = "CHALLENGING"

        return JSONResponse(content={
            "wind": wind_data,
            "solar": solar_data,
            "water": water_data,
            "suitability": {
                "overall_score": overall_score,
                "rating": rating,
                "insights": site_insights,
                "components": {
                    "solar": s_score,
                    "wind": w_score,
                    "water": wt_score
                }
            },
            "location": {"lat": loc.lat, "lon": loc.lon},
            "timestamp": datetime.now().isoformat()
        })
    except Exception as e:
        print(f"Combined Analytics Error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
