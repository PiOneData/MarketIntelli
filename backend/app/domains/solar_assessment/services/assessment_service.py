"""
Solar & Wind Assessment Service
Adapted from SolarWindAssessment/backend/assessment_service.py
Uses Google Earth Engine to analyze wind/solar/water potential at a location.
"""
import ee
import json
import os
import math
import numpy as np
from datetime import datetime
from functools import lru_cache
import sqlite3
import hashlib
import logging

logger = logging.getLogger(__name__)

# ============================================================
# PERSISTENT CACHE MANAGER
# ============================================================
class DiskCache:
    def __init__(self, cache_db: str = "gee_cache.sqlite"):
        self.cache_db = cache_db
        self._init_db()

    def _init_db(self) -> None:
        with sqlite3.connect(self.cache_db) as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS cache (
                    key TEXT PRIMARY KEY,
                    value TEXT,
                    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            """)
            conn.commit()

    def _get_key(self, service: str, lat: float, lon: float) -> str:
        input_str = f"{service}_{round(lat, 4)}_{round(lon, 4)}"
        return hashlib.md5(input_str.encode()).hexdigest()

    def get(self, service: str, lat: float, lon: float):
        key = self._get_key(service, lat, lon)
        try:
            with sqlite3.connect(self.cache_db) as conn:
                cursor = conn.execute("SELECT value FROM cache WHERE key = ?", (key,))
                row = cursor.fetchone()
                if row:
                    return json.loads(row[0])
        except Exception as e:
            logger.warning(f"Cache Get Error: {e}")
        return None

    def set(self, service: str, lat: float, lon: float, value: object) -> None:
        key = self._get_key(service, lat, lon)
        try:
            with sqlite3.connect(self.cache_db) as conn:
                conn.execute(
                    "INSERT OR REPLACE INTO cache (key, value) VALUES (?, ?)",
                    (key, json.dumps(value))
                )
                conn.commit()
        except Exception as e:
            logger.warning(f"Cache Set Error: {e}")


# ============================================================
# ASSESSMENT SERVICE
# ============================================================
class AssessmentService:
    def __init__(self, data_dir: str, ee_key_path: str):
        self.data_dir = data_dir
        self.ee_key_path = ee_key_path
        self.cache = DiskCache(os.path.join(data_dir, "gee_cache.sqlite"))
        self._ee_initialized = False
        self._init_earth_engine()

    def _init_earth_engine(self) -> None:
        """Initialize Google Earth Engine with service account credentials."""
        if not os.path.exists(self.ee_key_path):
            logger.warning(
                f"[EE] Credential file not found at {self.ee_key_path}. "
                "Earth Engine analysis will be unavailable."
            )
            return
        try:
            credentials = ee.ServiceAccountCredentials(
                email=None,
                key_file=self.ee_key_path
            )
            ee.Initialize(credentials=credentials)
            self._ee_initialized = True
            logger.info("[EE] Earth Engine initialized successfully.")
        except Exception as e:
            logger.error(f"[EE] Initialization failed: {e}")

    def _require_ee(self) -> None:
        if not self._ee_initialized:
            raise RuntimeError(
                "Google Earth Engine credentials are not configured. "
                "Please upload a service account key file."
            )

    # ----------------------------------------------------------
    # WIND ANALYSIS
    # ----------------------------------------------------------
    def analyze_wind(self, lat: float, lon: float) -> dict:
        cached = self.cache.get("wind", lat, lon)
        if cached:
            return cached

        self._require_ee()

        try:
            point = ee.Geometry.Point([lon, lat])

            ws_img = ee.Image("projects/sat-io/open-datasets/global_wind_atlas/wind-speed").select("b1")
            pd_img = ee.Image("projects/sat-io/open-datasets/global_wind_atlas/power-density").select("b1")
            ad_img = ee.Image("projects/sat-io/open-datasets/global_wind_atlas/air-density").select("b1")
            rix_img = ee.Image("projects/sat-io/open-datasets/global_wind_atlas/ruggedness-index").select("b1")
            cf1_img = ee.Image("projects/sat-io/open-datasets/global_wind_atlas/capacity-factor").select("b1")
            cf2_img = ee.Image("projects/sat-io/open-datasets/global_wind_atlas/capacity-factor").select("b2")
            cf3_img = ee.Image("projects/sat-io/open-datasets/global_wind_atlas/capacity-factor").select("b3")
            srtm = ee.Image("USGS/SRTMGL1_003")
            slope_img = ee.Terrain.slope(srtm)
            elev_img = srtm.select("elevation")

            combined = ee.Image.cat([
                ws_img, pd_img, ad_img, rix_img, cf1_img, cf2_img, cf3_img,
                slope_img, elev_img
            ])
            values = combined.reduceRegion(
                reducer=ee.Reducer.mean(),
                geometry=point,
                scale=250
            ).getInfo()

            bands = list(values.keys())
            ws = values.get(bands[0], 0) or 0
            pd_val = values.get(bands[1], 0) or 0
            ad_val = values.get(bands[2], 1.225) or 1.225
            rix = values.get(bands[3], 0) or 0
            cf1 = values.get(bands[4], 0) or 0
            cf2 = values.get(bands[5], 0) or 0
            cf3 = values.get(bands[6], 0) or 0
            slope = values.get(bands[7], 0) or 0
            elev = values.get(bands[8], 0) or 0

            raw = {
                "ws_100": ws, "pd_100": pd_val, "ad_100": ad_val,
                "ruggedness_index": rix, "cf_iec1": cf1, "cf_iec2": cf2, "cf_iec3": cf3,
                "slope": slope, "elevation": elev
            }
            result = _analyze_wind_potential(raw)

            # Score
            if pd_val >= 600: score = 90
            elif pd_val >= 400: score = 75
            elif pd_val >= 300: score = 60
            elif pd_val >= 200: score = 45
            elif pd_val >= 100: score = 30
            else: score = 10
            result["score"] = score
            result["terrain"] = {"slope": slope, "elevation": elev}

            self.cache.set("wind", lat, lon, result)
            return result
        except Exception as e:
            logger.error(f"[Wind] Analysis error: {e}")
            raise

    # ----------------------------------------------------------
    # SOLAR ANALYSIS
    # ----------------------------------------------------------
    def analyze_solar(self, lat: float, lon: float) -> dict:
        cached = self.cache.get("solar", lat, lon)
        if cached:
            return cached

        self._require_ee()

        try:
            point = ee.Geometry.Point([lon, lat])

            ghi_img = ee.Image("projects/sat-io/open-datasets/global_solar_atlas/ghi").select("b1")
            dni_img = ee.Image("projects/sat-io/open-datasets/global_solar_atlas/dni").select("b1")
            dif_img = ee.Image("projects/sat-io/open-datasets/global_solar_atlas/dif").select("b1")
            pvout_img = ee.Image("projects/sat-io/open-datasets/global_solar_atlas/pvout").select("b1")
            ltdi_img = ee.Image("projects/sat-io/open-datasets/global_solar_atlas/ltdi").select("b1")

            combined = ee.Image.cat([ghi_img, dni_img, dif_img, pvout_img, ltdi_img])
            values = combined.reduceRegion(
                reducer=ee.Reducer.mean(),
                geometry=point,
                scale=1000
            ).getInfo()

            bands = list(values.keys())
            ghi = values.get(bands[0], 0) or 0
            dni = values.get(bands[1], 0) or 0
            dif = values.get(bands[2], 0) or 0
            pvout = values.get(bands[3], 0) or 0
            ltdi = values.get(bands[4], 0) or 0

            # Score
            if ghi >= 2000: score = 90
            elif ghi >= 1800: score = 75
            elif ghi >= 1600: score = 60
            elif ghi >= 1400: score = 45
            else: score = 25

            # Grade
            if ghi >= 2000: grade, grade_label = "A+", "World-class irradiance"
            elif ghi >= 1800: grade, grade_label = "A", "Excellent solar resource"
            elif ghi >= 1600: grade, grade_label = "B", "Good commercial viability"
            elif ghi >= 1400: grade, grade_label = "C", "Moderate resource"
            else: grade, grade_label = "D", "Marginal resource"

            result = {
                "score": score,
                "resource": {
                    "grade": grade,
                    "label": grade_label,
                    "ghi": round(ghi, 1),
                    "dni": round(dni, 1),
                    "dif": round(dif, 1),
                    "pvout": round(pvout, 1),
                    "ltdi": round(ltdi, 3),
                },
                "metadata": {
                    "source": "Global Solar Atlas v2.6",
                    "provider": "Solargis / World Bank Group",
                    "unit_ghi": "kWh/m²/year",
                    "unit_pvout": "kWh/kWp/year"
                }
            }
            self.cache.set("solar", lat, lon, result)
            return result
        except Exception as e:
            logger.error(f"[Solar] Analysis error: {e}")
            raise

    # ----------------------------------------------------------
    # WATER ANALYSIS
    # ----------------------------------------------------------
    def analyze_water(self, lat: float, lon: float) -> dict:
        cached = self.cache.get("water", lat, lon)
        if cached:
            return cached

        self._require_ee()

        try:
            point = ee.Geometry.Point([lon, lat])
            region = point.buffer(50000)

            # GRACE groundwater anomaly
            grace = (ee.ImageCollection("NASA/GRACE/MASS_GRIDS/LAND")
                     .filterDate("2002-01-01", "2017-01-01")
                     .select("lwe_thickness_jpl")
                     .mean())

            # PDSI drought index
            pdsi = (ee.ImageCollection("GRIDMET/DROUGHT")
                    .filterDate("2015-01-01", "2022-01-01")
                    .select("pdsi")
                    .mean())

            combined = ee.Image.cat([grace, pdsi])
            values = combined.reduceRegion(
                reducer=ee.Reducer.mean(),
                geometry=region,
                scale=5000
            ).getInfo()

            bands = list(values.keys())
            grace_val = values.get(bands[0], 0) or 0
            pdsi_val = values.get(bands[1], 0) or 0

            # Composite risk score (0-100, higher = more water available)
            grace_norm = max(0, min(100, (grace_val + 50) * 1.0))
            pdsi_norm = max(0, min(100, (pdsi_val + 6) / 12 * 100))
            composite = round((grace_norm * 0.5) + (pdsi_norm * 0.5), 1)

            result = {
                "composite_risk_score": composite,
                "grace_anomaly": round(grace_val, 2),
                "pdsi": round(pdsi_val, 2),
                "interpretation": (
                    "Water-stressed region" if composite < 30
                    else "Moderate water availability" if composite < 60
                    else "Good water availability"
                ),
                "metadata": {
                    "grace_source": "NASA GRACE Land (JPL mascon)",
                    "pdsi_source": "GRIDMET Drought (PDSI)",
                }
            }
            self.cache.set("water", lat, lon, result)
            return result
        except Exception as e:
            logger.error(f"[Water] Analysis error: {e}")
            raise

    # ----------------------------------------------------------
    # COMBINED ANALYSIS
    # ----------------------------------------------------------
    def analyze(self, lat: float, lon: float) -> dict:
        import asyncio
        import concurrent.futures

        with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
            wind_future = pool.submit(self.analyze_wind, lat, lon)
            solar_future = pool.submit(self.analyze_solar, lat, lon)
            water_future = pool.submit(self.analyze_water, lat, lon)

            wind_data = wind_future.result() if not wind_future.exception() else {}
            solar_data = solar_future.result() if not solar_future.exception() else {}
            water_data = water_future.result() if not water_future.exception() else {}

        s_score = solar_data.get("score", 0)
        w_score = wind_data.get("score", 0)
        wt_score = water_data.get("composite_risk_score", 0)
        overall_score = round((s_score * 0.35) + (w_score * 0.35) + (wt_score * 0.30), 1)

        if overall_score >= 75: rating = "PREMIUM SITE"
        elif overall_score >= 60: rating = "OPTIMAL"
        elif overall_score >= 45: rating = "VIABLE"
        else: rating = "CHALLENGING"

        site_insights = _generate_site_insights(wind_data, solar_data, water_data)

        return {
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
            "location": {"lat": lat, "lon": lon},
            "timestamp": datetime.now().isoformat()
        }


# ============================================================
# HELPER FUNCTIONS
# ============================================================
def _analyze_wind_potential(data: dict) -> dict:
    ws = data.get("ws_100", 0)
    pd_val = data.get("pd_100", 0)
    ad_val = data.get("ad_100", 1.225)
    rix = data.get("ruggedness_index", 0)
    slope = data.get("slope", 0)
    elev = data.get("elevation", 0)

    if pd_val >= 600: grade, grade_desc = "A+", "World-class resource"
    elif pd_val >= 400: grade, grade_desc = "A", "Outstanding potential"
    elif pd_val >= 300: grade, grade_desc = "B", "Commercial viability"
    elif pd_val >= 200: grade, grade_desc = "C", "Moderate resource"
    elif pd_val >= 100: grade, grade_desc = "D", "Marginal suitability"
    else: grade, grade_desc = "F", "Unsuitable"

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

    cf1 = data.get("cf_iec1", 0)
    cf2 = data.get("cf_iec2", 0)
    cf3 = data.get("cf_iec3", 0)
    cfs = [cf1, cf2, cf3]
    best_idx = cfs.index(max(cfs)) if max(cfs) > 0 else 2
    turbine_recommendation = [
        "IEC Class 1 (High Wind)", "IEC Class 2 (Medium Wind)", "IEC Class 3 (Low Wind)"
    ][best_idx]

    return {
        "metadata": {
            "source": "Global Wind Atlas v3 (GWA)",
            "provider": "Technical University of Denmark (DTU)",
            "methodology": "Downscaled ERA5 reanalysis via WRF models",
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


def _generate_site_insights(wind: dict, solar: dict, water: dict) -> list:
    insights = []
    w_score = wind.get("score", 0)
    s_score = solar.get("score", 0)
    wt_score = water.get("composite_risk_score", 0)

    if w_score > 60 and s_score > 60:
        insights.append("Prime Hybrid Site: Exceptional co-location potential for Wind & Solar.")
    elif w_score > 70:
        insights.append("Wind-Dominant: World-class wind resource detected; prioritize high-hub turbines.")
    elif s_score > 70:
        insights.append("Solar-Dominant: Optimal GHI and sky clarity; ideal for large-scale PV tracking.")

    if wt_score < 30:
        insights.append("Critical Resource Sync: Severe water stress detected. Air-cooling or dry-cleaning systems recommended.")
    elif wt_score > 70:
        insights.append("Hydrological Buffer: Abundant surface/ground water resources available.")

    if wind.get("terrain", {}).get("slope", 0) > 15:
        insights.append("Logistical Note: Steep terrain identified. Civil works may require reinforced foundations.")

    return insights
