
import ee
import json
import os
import math
import pandas as pd
import geopandas as gpd
import numpy as np
from shapely.geometry import Point
from shapely.ops import transform
import pyproj
from datetime import datetime
from functools import lru_cache
import sqlite3
import hashlib

# ============================================================
# PERSISTENT CACHE MANAGER
# ============================================================
class DiskCache:
    def __init__(self, cache_db="gee_cache.sqlite"):
        self.cache_db = cache_db
        self._init_db()

    def _init_db(self):
        with sqlite3.connect(self.cache_db) as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS cache (
                    key TEXT PRIMARY KEY,
                    value TEXT,
                    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            """)
            conn.commit()

    def _get_key(self, service, lat, lon):
        # Round to 4 decimal places (~11m precision) for stable keys
        input_str = f"{service}_{round(lat, 4)}_{round(lon, 4)}"
        return hashlib.md5(input_str.encode()).hexdigest()

    def get(self, service, lat, lon):
        key = self._get_key(service, lat, lon)
        try:
            with sqlite3.connect(self.cache_db) as conn:
                cursor = conn.execute("SELECT value FROM cache WHERE key = ?", (key,))
                row = cursor.fetchone()
                if row:
                    return json.loads(row[0])
        except Exception as e:
            print(f"Cache Get Error: {e}")
        return None

    def set(self, service, lat, lon, value):
        key = self._get_key(service, lat, lon)
        try:
            with sqlite3.connect(self.cache_db) as conn:
                conn.execute(
                    "INSERT OR REPLACE INTO cache (key, value) VALUES (?, ?)",
                    (key, json.dumps(value))
                )
                conn.commit()
        except Exception as e:
            print(f"Cache Set Error: {e}")

# ============================================================
# CONSTANTS
# ============================================================
MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
GSA_BASE = 'projects/earthengine-legacy/assets/projects/sat-io/open-datasets/global_solar_atlas/'
GWA_BASE = 'projects/earthengine-legacy/assets/projects/sat-io/open-datasets/global_wind_atlas/'
HEIGHTS  = [10, 50, 100, 150, 200]


# ============================================================
# HELPER FUNCTIONS (from finalfull.py)
# ============================================================
def _clamp(v, lo, hi): return max(lo, min(hi, v))

def _norm(v, lo, hi):
    return 0.0 if hi == lo else _clamp((v - lo) / (hi - lo) * 100, 0, 100)

def _g(d, k, dec=4):
    v = d.get(k)
    return round(float(v), dec) if v is not None else 0.0

# --- Solar label helpers ---
def _aod_label(v):
    if v < 0.1:  return "Very Clean Air"
    if v < 0.2:  return "Clean — Minor Haze"
    if v < 0.4:  return "Moderate Aerosol/Haze"
    if v < 0.6:  return "High — Dust/Pollution"
    return              "Severe Pollution"

def _cloud_label(v):
    if v < 20:   return "Very Clear Skies"
    if v < 35:   return "Mostly Clear"
    if v < 50:   return "Partly Cloudy"
    if v < 65:   return "Mostly Cloudy"
    return              "Frequently Overcast"

def _seasonal_label(v):
    if v < 0.5:  return "Very Stable"
    if v < 1.0:  return "Stable — Minor seasonal variation"
    if v < 2.0:  return "Moderate — Monsoon impact"
    if v < 3.0:  return "High — Strong monsoon dip"
    return              "Extreme seasonality"

def _solar_rating(score):
    if score >= 85: return "WORLD-CLASS"
    if score >= 70: return "EXCELLENT"
    if score >= 55: return "GOOD"
    if score >= 40: return "MODERATE"
    if score >= 25: return "POOR"
    return                 "VERY POOR"

def _compute_solar_score(core, cloud_pct, aod, slope):
    s_ghi   = _norm(core.get('ghi_kwh_m2_day', 0),  3.0, 7.0) * 0.30
    s_pvout = _norm(core.get('pvout_kwh_kwp_day', 0), 2.5, 5.5) * 0.30
    s_cloud = _norm(100 - cloud_pct, 30, 100) * 0.20
    s_aod   = _norm(0.8 - aod, 0, 0.8) * 0.10
    s_slope = _norm(30 - slope, 0, 30) * 0.10
    return round(s_ghi + s_pvout + s_cloud + s_aod + s_slope, 1)

# --- Wind label helpers ---
def _wind_grade(pd_val):
    if pd_val >= 600: return "A+", "World-class resource"
    if pd_val >= 400: return "A",  "Outstanding potential"
    if pd_val >= 300: return "B",  "Commercial viability"
    if pd_val >= 200: return "C",  "Moderate resource"
    if pd_val >= 100: return "D",  "Marginal suitability"
    return "F",  "Unsuitable"

def _wind_rating(score):
    if score >= 75: return "EXCELLENT"
    if score >= 55: return "GOOD"
    if score >= 35: return "MODERATE"
    if score >= 15: return "POOR"
    return                 "VERY POOR"

def _compute_wind_score(pd100, rix, ws100, cf_best):
    pd_s  = _norm(pd100, 0, 600)
    ws_s  = _norm(ws100, 3.5, 12.0)
    cf_s  = _norm(cf_best, 0, 0.5)
    rix_s = _norm(0.5 - _clamp(rix, 0, 0.5), 0, 0.5)
    return round(pd_s * 0.40 + ws_s * 0.30 + cf_s * 0.20 + rix_s * 0.10, 1)

# --- Water label helpers ---
def _grace_label(v):
    if v >  10: return "Strong Surplus — Gaining"
    if v >   2: return "Moderate Surplus"
    if v >  -2: return "Near Baseline — Stable"
    if v > -10: return "Mild Depletion"
    if v > -25: return "Significant Depletion"
    if v > -50: return "Severe Depletion"
    return             "Critical Depletion"

def _flood_label(v):
    if v < 0.01: return "No Flood Risk"
    if v < 0.05: return "Very Low Flood Risk"
    if v < 0.15: return "Low-Moderate Flood Risk"
    return              "Flood-Prone Zone"

def _pdsi_label(v):
    if v >=  2.0: return "Moderately to Extremely Wet"
    if v >= -0.5: return "Near Normal"
    if v >= -2.0: return "Mild Drought"
    if v >= -3.0: return "Moderate Drought"
    if v >= -4.0: return "Severe Drought"
    return               "Extreme Drought"

def _deficit_label(v):
    if v <= 10:  return "Negligible Stress"
    if v <= 50:  return "Low Stress"
    if v <= 100: return "Moderate Stress"
    if v <= 200: return "High Stress"
    return              "Severe Water Stress"

def _water_rating(score):
    if score >= 75: return "ABUNDANT"
    if score >= 60: return "GOOD"
    if score >= 45: return "MODERATE"
    if score >= 30: return "SCARCE"
    return                 "CRITICAL"

def _compute_water_score(precip_daily, lwe, deficit, soil, occurrence):
    # Normalized 0-100 scores
    s_precip = _norm(precip_daily, 0.5, 5.0) * 0.25  # >5mm/day is excellent
    s_grace  = _norm(lwe, -25, 10) * 0.25           # -25cm is major depletion, +10cm is surplus
    s_deficit= _norm(200 - _clamp(deficit, 0, 200), 0, 180) * 0.20  # Lower deficit is better
    s_soil   = _norm(soil, 10, 250) * 0.15          # Root zone moisture
    s_sw     = _norm(occurrence, 0, 40) * 0.15      # Surface water presence (40% coverage is plenty)
    return round(s_precip + s_grace + s_deficit + s_soil + s_sw, 1)


# ============================================================
# ASSESSMENT SERVICE CLASS
# ============================================================
class AssessmentService:
    def __init__(self, data_dir, ee_key_path):
        self.data_dir = data_dir
        self.ee_key_path = ee_key_path
        self.cache = DiskCache(os.path.join(data_dir, "gee_cache.sqlite"))
        self.powerhouse_gdf = None
        self.groundwater_gdf = None
        self.ph_metric = None
        self.initialized = False
        self._initialize_gee()
        self._load_local_datasets()

    def _initialize_gee(self):
        try:
            if os.path.exists(self.ee_key_path):
                with open(self.ee_key_path, 'r') as f:
                    key_data = json.load(f)
                credentials = ee.ServiceAccountCredentials(
                    email=key_data['client_email'],
                    key_data=json.dumps(key_data)
                )
                ee.Initialize(credentials=credentials, project=key_data.get('project_id', 'ee-dharanv2006'))
                print("✅ AssessmentService: Earth Engine Initialized")
            else:
                print(f"⚠️ AssessmentService: EE key not found at {self.ee_key_path}")
                ee.Initialize()
        except Exception as e:
            print(f"❌ AssessmentService: EE Init Error: {e}")

    def _load_local_datasets(self):
        try:
            ph_path = os.path.join(self.data_dir, "powerhouse.geojson")
            if os.path.exists(ph_path):
                self.powerhouse_gdf = gpd.read_file(ph_path)
                def flip(geom): return transform(lambda x, y, z=None: (y, x), geom)
                self.powerhouse_gdf.geometry = self.powerhouse_gdf.geometry.map(flip)
                self.powerhouse_gdf.set_crs("EPSG:4326", allow_override=True, inplace=True)
                self.ph_metric = self.powerhouse_gdf.to_crs(epsg=3857)
                print("✅ AssessmentService: Powerhouse data loaded")

            gw_path = os.path.join(self.data_dir, "groundwater.geojson")
            if os.path.exists(gw_path):
                self.groundwater_gdf = gpd.read_file(gw_path)
                def flip(geom): return transform(lambda x, y, z=None: (y, x), geom)
                self.groundwater_gdf.geometry = self.groundwater_gdf.geometry.map(flip)
                self.groundwater_gdf.set_crs("EPSG:4326", allow_override=True, inplace=True)
                print("✅ AssessmentService: Groundwater admin data loaded")

            ws_path = os.path.join(self.data_dir, "wind_solar_data.geojson")
            if os.path.exists(ws_path):
                print("✅ AssessmentService: Wind/Solar marker data loaded")

            self.initialized = True
        except Exception as e:
            print(f"❌ AssessmentService: Data Load Error: {e}")

    def _sanitize(self, d):
        """Recursively convert NaN/Inf/numpy types to safe JSON-compatible types."""
        if isinstance(d, dict):
            return {k: self._sanitize(v) for k, v in d.items()}
        elif isinstance(d, list):
            return [self._sanitize(x) for x in d]
        elif isinstance(d, float) or isinstance(d, np.float64):
            if math.isnan(d) or math.isinf(d): return 0.0
            return float(d)
        elif isinstance(d, (np.int64, np.int32)):
            return int(d)
        return d

    # =========================================================================
    # SOLAR ASSESSMENT (ported from finalfull.py)
    # =========================================================================
    def analyze_solar(self, lat, lon):
        try:
            # 1. Try Persistent Disk Cache
            cached = self.cache.get("solar", lat, lon)
            if cached:
                print(f"⚡ [Cache Hit] Solar: ({lat}, {lon})")
                return cached

            # 2. Run Analysis
            res = self._solar_cached(round(lat, 4), round(lon, 4))
            sanitized = self._sanitize(res) if res else None

            # 3. Save to Cache
            if sanitized:
                self.cache.set("solar", lat, lon, sanitized)
            
            return sanitized
        except Exception as e:
            print(f"❌ Solar wrapper error: {e}")
            return None

    @lru_cache(maxsize=64)
    def _solar_cached(self, lat, lon):
        print(f"☀️ Solar Assessment → ({lat}, {lon})")
        point   = ee.Geometry.Point([lon, lat])
        buf_1km = point.buffer(1000)
        buf_5km = point.buffer(5000)

        # --- CALL 1: GSA Core + Monthly PVOUT ---
        try:
            core_img = (
                ee.Image(GSA_BASE + 'ghi_LTAy_AvgDailyTotals').rename('ghi')
                .addBands(ee.Image(GSA_BASE + 'gti_LTAy_AvgDailyTotals').rename('gti'))
                .addBands(ee.Image(GSA_BASE + 'dni_LTAy_AvgDailyTotals').rename('dni'))
                .addBands(ee.Image(GSA_BASE + 'dif_LTAy_AvgDailyTotals').rename('dif'))
                .addBands(ee.Image(GSA_BASE + 'pvout_LTAy_AvgDailyTotals').rename('pvout'))
                .addBands(ee.Image(GSA_BASE + 'opta_LTAy_AvgDailyTotals').rename('opta'))
                .addBands(ee.Image(GSA_BASE + 'temp_2m_agl').rename('temp'))
            )
            monthly_img = ee.ImageCollection(GSA_BASE + 'pvout_LTAm_AvgDailyTotals').toBands()

            raw = core_img.addBands(monthly_img).reduceRegion(
                reducer=ee.Reducer.mean(), geometry=point, scale=250, maxPixels=1e9, bestEffort=True
            ).getInfo()
            if not raw or raw.get('ghi') is None:
                raw = core_img.addBands(monthly_img).reduceRegion(
                    reducer=ee.Reducer.mean(), geometry=buf_1km, scale=250, maxPixels=1e9, bestEffort=True
                ).getInfo()

            ghi_v   = _g(raw, 'ghi')
            pvout_v = _g(raw, 'pvout')
            gti_v   = _g(raw, 'gti')
            opta_v  = _g(raw, 'opta', 1)
            temp_v  = _g(raw, 'temp', 2)
            dif_v   = _g(raw, 'dif')
            dif_frac = round(dif_v / ghi_v, 3) if ghi_v > 0 else 0
            temp_derate = round(max(0.0, (temp_v - 25) * 0.4), 2)

            core = {
                'ghi_kwh_m2_day':    ghi_v,
                'gti_kwh_m2_day':    gti_v,
                'pvout_kwh_kwp_day': pvout_v,
                'pvout_kwh_kwp_year': round(pvout_v * 365, 1),
                'ghi_kwh_m2_year':   round(ghi_v * 365, 1),
                'optimal_tilt':      opta_v,
                'avg_temp':          temp_v,
                'dif_fraction':      dif_frac,
                'temp_derate_pct':   temp_derate,
            }

            # Monthly PVOUT — multi-strategy key matching (from finalfull.py)
            core_keys = {'ghi', 'gti', 'dni', 'dif', 'pvout', 'opta', 'temp'}
            monthly_raw = {k: v for k, v in raw.items() if k not in core_keys}
            monthly_vals = []
            for i in range(1, 13):
                m_str = f"{i:02d}"
                candidates = [f"PVOUT_{m_str}_b1", f"{m_str}_b1", f"{m_str}_pvout", m_str, f"b{i}"]
                val = 0.0
                for c in candidates:
                    if c in raw and raw[c] is not None and float(raw[c] or 0) > 0:
                        val = raw[c]; break
                if val == 0.0:
                    for k in monthly_raw:
                        if k.startswith(m_str) and monthly_raw[k] and float(monthly_raw[k] or 0) > 0:
                            val = monthly_raw[k]; break
                monthly_vals.append(round(float(val or 0), 3))

            non_zero = [v for v in monthly_vals if v > 0]
            monthly_meta = {}
            if non_zero:
                best_i  = monthly_vals.index(max(monthly_vals))
                worst_i = monthly_vals.index(min(non_zero))
                s_range = round(max(monthly_vals) - min(non_zero), 3)
                monthly_meta = {
                    'best_month':  MONTHS[best_i],  'best_val':   max(monthly_vals),
                    'worst_month': MONTHS[worst_i], 'worst_val':  min(non_zero),
                    'range':       s_range,          'stability':  _seasonal_label(s_range),
                }

            gsa_ok = True
        except Exception as e:
            print(f"  ❌ GSA error: {e}")
            gsa_ok = False
            core = {}; monthly_vals = [0]*12; monthly_meta = {}
            ghi_v = 0; pvout_v = 0

        # --- CALL 2: SRTM Terrain ---
        try:
            terrain = ee.Terrain.products(ee.Image('USGS/SRTMGL1_003'))
            t_val = terrain.select(['elevation', 'slope', 'aspect']).reduceRegion(
                reducer=ee.Reducer.mean(), geometry=buf_5km, scale=100, maxPixels=1e9, bestEffort=True
            ).getInfo()
            elev_s  = _g(t_val, 'elevation', 1)
            slope_s = _g(t_val, 'slope', 3)
            asp_s   = _g(t_val, 'aspect', 1)
            terrain_data = {'elevation_m': elev_s, 'slope_deg': slope_s, 'aspect_deg': asp_s}
        except Exception as e:
            print(f"  ❌ Terrain error: {e}")
            terrain_data = {'elevation_m': 0, 'slope_deg': 0, 'aspect_deg': 0}
            slope_s = 0

        # --- CALL 3: MODIS AOD + Cloud ---
        try:
            AOD_BAND   = 'Aerosol_Optical_Depth_Land_Ocean_Mean_Mean'
            CLOUD_BAND = 'Cloud_Fraction_Mean_Mean'
            atm_val = (
                ee.ImageCollection('MODIS/061/MOD08_M3')
                .filterDate('2019-01-01', '2024-01-01').mean()
                .select([AOD_BAND, CLOUD_BAND])
                .reduceRegion(reducer=ee.Reducer.mean(), geometry=point, scale=111320, maxPixels=1e9, bestEffort=True)
                .getInfo()
            )
            aod = round(float(atm_val.get(AOD_BAND) or 0) * 0.001, 4)
            # MOD08_M3: raw ×10000 → divide by 10000 for fraction → ×100 for %
            raw_cloud = float(atm_val.get(CLOUD_BAND) or 0)
            cloud_frac = raw_cloud / 10000.0
            cloud_pct  = round(cloud_frac * 100.0, 2)
            transm     = round(math.exp(-aod * math.sqrt(2)), 4)
            atmos_data = {
                'aod':          aod,
                'aod_label':    _aod_label(aod),
                'transmittance': transm,
                'cloud_pct':    cloud_pct,
                'cloud_frac':   round(cloud_frac, 4),
                'clear_days_yr': int((1 - cloud_frac) * 365),
                'cloud_label':  _cloud_label(cloud_pct),
            }
        except Exception as e:
            print(f"  ❌ MODIS Atmos error: {e}")
            aod = 0; cloud_pct = 0
            atmos_data = {'aod': 0, 'cloud_pct': 0, 'clear_days_yr': 365}

        # --- CALL 4: ERA5-Land Cross-Validation ---
        try:
            SSR_BAND = 'surface_solar_radiation_downwards_sum'
            ssr_img = (
                ee.ImageCollection('ECMWF/ERA5_LAND/MONTHLY_AGGR')
                .filterDate('2019-01-01', '2024-01-01').mean().select(SSR_BAND)
            )
            era5_val = ssr_img.reduceRegion(
                reducer=ee.Reducer.mean(), geometry=point, scale=25000, maxPixels=1e9, bestEffort=True
            ).getInfo()
            if not era5_val or era5_val.get(SSR_BAND) is None:
                era5_val = ssr_img.reduceRegion(
                    reducer=ee.Reducer.mean(), geometry=buf_1km, scale=25000, maxPixels=1e9, bestEffort=True
                ).getInfo()
            ssr_raw = float(era5_val.get(SSR_BAND) or 0)
            # ERA5 SSR: J/m²/month → kWh/m²/day: ÷(3,600,000 × 30)
            ssr_day = round(ssr_raw / (3_600_000 * 30), 4)
            diff_pct = round(abs(ssr_day - ghi_v) / ghi_v * 100, 1) if ghi_v > 0 else 0
            validation = {
                'era5_ghi_day':    ssr_day,
                'gsa_ghi_day':     ghi_v,
                'agreement_pct':   round(100 - diff_pct, 1),
                'era5_ghi_diff_pct': diff_pct,
            }
        except Exception as e:
            print(f"  ❌ ERA5 error: {e}")
            validation = {'era5_ghi_diff_pct': 0, 'agreement_pct': 0}

        score = _compute_solar_score(core, cloud_pct, aod, terrain_data.get('slope_deg', 0))

        return {
            'core':       core,
            'monthly':    {'values': monthly_vals, **monthly_meta},
            'terrain':    terrain_data,
            'atmospheric': atmos_data,
            'validation': validation,
            'score':      score,
            'rating':     _solar_rating(score),
        }

    # =========================================================================
    # WIND ASSESSMENT (ported from finalfull.py)
    # =========================================================================
    def analyze_wind(self, lat, lon):
        try:
            # 1. Try Persistent Disk Cache
            cached = self.cache.get("wind", lat, lon)
            if cached:
                print(f"⚡ [Cache Hit] Wind: ({lat}, {lon})")
                return cached

            # 2. Run Analysis
            res = self._wind_cached(round(lat, 4), round(lon, 4))
            sanitized = self._sanitize(res) if res else None

            # 3. Save to Cache
            if sanitized:
                self.cache.set("wind", lat, lon, sanitized)

            return sanitized
        except Exception as e:
            print(f"❌ Wind wrapper error: {e}")
            return None

    @lru_cache(maxsize=64)
    def _wind_cached(self, lat, lon):
        print(f"🌬️ Wind Assessment → ({lat}, {lon})")
        point   = ee.Geometry.Point([lon, lat])
        buf_1km = point.buffer(1000)

        try:
            bands = [
                ee.Image('USGS/SRTMGL1_003').rename('elevation'),
                ee.Terrain.slope(ee.Image('USGS/SRTMGL1_003')).rename('slope'),
                ee.Image(GWA_BASE + 'ruggedness-index').rename('rix'),
                ee.ImageCollection(GWA_BASE + 'capacity-factor')
                  .filter(ee.Filter.stringEndsWith('system:index', 'IEC1')).mosaic().rename('cf1'),
                ee.ImageCollection(GWA_BASE + 'capacity-factor')
                  .filter(ee.Filter.stringEndsWith('system:index', 'IEC2')).mosaic().rename('cf2'),
                ee.ImageCollection(GWA_BASE + 'capacity-factor')
                  .filter(ee.Filter.stringEndsWith('system:index', 'IEC3')).mosaic().rename('cf3'),
            ]
            for h in HEIGHTS:
                bands.append(ee.ImageCollection(GWA_BASE + 'wind-speed')
                             .filter(ee.Filter.eq('height', h)).mosaic().rename(f'ws_{h}'))
                bands.append(ee.ImageCollection(GWA_BASE + 'power-density')
                             .filter(ee.Filter.eq('height', h)).mosaic().rename(f'pd_{h}'))
                bands.append(ee.ImageCollection(GWA_BASE + 'air-density')
                             .filter(ee.Filter.eq('height', h)).mosaic().rename(f'ad_{h}'))

            image = ee.Image.cat(bands)
            raw = image.reduceRegion(
                reducer=ee.Reducer.first(), geometry=point, scale=500, bestEffort=True
            ).getInfo()
            if not raw or raw.get('ws_100') is None:
                raw = image.reduceRegion(
                    reducer=ee.Reducer.mean(), geometry=buf_1km, scale=500, maxPixels=1e9, bestEffort=True
                ).getInfo()
            if not raw or raw.get('ws_100') is None:
                print("❌ No wind data at this location.")
                return None

            # Build full height profile
            profile = {}
            for h in HEIGHTS:
                profile[h] = {
                    'ws': _g(raw, f'ws_{h}', 3),
                    'pd': _g(raw, f'pd_{h}', 2),
                    'ad': _g(raw, f'ad_{h}', 4),
                }

            ws100 = profile[100]['ws']
            pd100 = profile[100]['pd']
            ad100 = profile[100]['ad']
            ws10  = profile[10]['ws']

            rix  = _g(raw, 'rix', 4)
            elev = _g(raw, 'elevation', 1)
            slope= _g(raw, 'slope', 2)
            cf1  = _g(raw, 'cf1', 4)
            cf2  = _g(raw, 'cf2', 4)
            cf3  = _g(raw, 'cf3', 4)

            # Hellmann shear exponent (correct formula from finalfull.py)
            shear_ratio = round(ws100 / ws10, 3) if ws10 > 0 else 0
            alpha = round(
                math.log(ws100 / ws10) / math.log(100 / 10)
                if ws10 > 0 and ws100 > 0 else 0.143, 3
            )

            cf_best = max(cf1, cf2, cf3)
            cf_best_i = [cf1, cf2, cf3].index(cf_best)
            turbine_labels = [
                "IEC Class 1 — High Wind (>7.5 m/s)",
                "IEC Class 2 — Medium Wind (6.5–7.5 m/s)",
                "IEC Class 3 — Low Wind (5.0–6.5 m/s)",
            ]
            ad_loss_pct = round(((1.225 - ad100) / 1.225) * 100, 2) if ad100 < 1.225 else 0.0
            annual_kwh_2mw = round(2000 * cf_best * 8760, 0)
            grade, grade_desc = _wind_grade(pd100)
            score  = _compute_wind_score(pd100, rix, ws100, cf_best)

            return {
                'resource': {
                    'grade':       grade,
                    'label':       grade_desc,
                    'ws_100':      ws100,
                    'pd_100':      pd100,
                    'ad_100':      ad100,
                    'ad_loss_pct': ad_loss_pct,
                },
                'profile': {
                    'heights':   HEIGHTS,
                    'speeds':    [profile[h]['ws'] for h in HEIGHTS],
                    'densities': [profile[h]['pd'] for h in HEIGHTS],
                    'air_density': [profile[h]['ad'] for h in HEIGHTS],
                },
                'capacity_factors': {
                    'cf_iec1':    cf1,
                    'cf_iec2':    cf2,
                    'cf_iec3':    cf3,
                    'cf_best':    cf_best,
                    'best_class': turbine_labels[cf_best_i],
                },
                'physics': {
                    'shear_alpha': alpha,
                    'shear_ratio': shear_ratio,
                    'air_density': ad100,
                },
                'terrain': {
                    'rix':       rix,
                    'elevation': elev,
                    'slope':     slope,
                },
                'yield_est': {
                    'annual_kwh_2mw': annual_kwh_2mw,
                    'annual_mwh_2mw': round(annual_kwh_2mw / 1000, 1),
                },
                'score':  score,
                'rating': _wind_rating(score),
            }
        except Exception as e:
            print(f"❌ Wind Analysis Error: {e}")
            return None

    # =========================================================================
    # WATER ASSESSMENT (ported from finalfull.py — 7 datasets)
    # =========================================================================
    def analyze_water(self, lat, lon):
        try:
            # 1. Try Persistent Disk Cache
            cached = self.cache.get("water", lat, lon)
            if cached:
                print(f"⚡ [Cache Hit] Water: ({lat}, {lon})")
                return cached

            # 2. Run Analysis
            res = self._water_cached(round(lat, 4), round(lon, 4))
            sanitized = self._sanitize(res) if res else None

            # 3. Save to Cache
            if sanitized:
                self.cache.set("water", lat, lon, sanitized)

            return sanitized
        except Exception as e:
            print(f"❌ Water wrapper error: {e}")
            return None

    @lru_cache(maxsize=64)
    def _water_cached(self, lat, lon):
        print(f"💧 Water Assessment → ({lat}, {lon})")
        point    = ee.Geometry.Point([lon, lat])
        buf_5km  = point.buffer(5000)
        buf_20km = point.buffer(20000)
        buf_50km = point.buffer(50000)
        result = {}

        # --- 1. CHIRPS Precipitation (20km buffer for reliability) ---
        try:
            chirps = ee.ImageCollection('UCSB-CHG/CHIRPS/DAILY') \
                       .filterDate('2019-01-01', '2024-01-01').mean().rename('precip')
            p_val = chirps.reduceRegion(
                reducer=ee.Reducer.mean(), geometry=buf_20km, scale=5500,
                maxPixels=1e9, bestEffort=True
            ).getInfo()
            precip_daily = round(float(p_val.get('precip', 0)), 4)
            result['precipitation'] = {
                'daily_mm':  precip_daily,
                'annual_mm': round(precip_daily * 365, 1),
                'period':    '2019–2024',
            }
            print(f"  ✅ CHIRPS: {precip_daily} mm/day")
        except Exception as e:
            result['precipitation'] = {'daily_mm': 0, 'annual_mm': 0}
            print(f"  ❌ CHIRPS: {e}")

        # --- 2. JRC Surface Water ---
        try:
            jrc = ee.Image('JRC/GSW1_4/GlobalSurfaceWater')
            occ_val = jrc.select('occurrence').reduceRegion(
                reducer=ee.Reducer.mean(), geometry=buf_20km, scale=100,
                maxPixels=1e13, bestEffort=True
            ).getInfo()
            flood_val = jrc.select(['seasonality', 'max_extent']).reduceRegion(
                reducer=ee.Reducer.mean(), geometry=buf_20km, scale=100,
                maxPixels=1e13, bestEffort=True
            ).getInfo()
            occurrence  = round(float(occ_val.get('occurrence', 0)), 2)
            seasonality = round(float(flood_val.get('seasonality', 0)), 3)
            max_extent  = round(float(flood_val.get('max_extent', 0)), 4)
            result['surface_water'] = {
                'occurrence_pct':     occurrence,
                'seasonality_months': seasonality,
                'max_extent_fraction': max_extent,
                'flood_risk':         _flood_label(max_extent),
            }
            print(f"  ✅ JRC: occurrence={occurrence}% flood={_flood_label(max_extent)}")
        except Exception as e:
            result['surface_water'] = {'occurrence_pct': 0, 'flood_risk': 'Unknown'}
            print(f"  ❌ JRC: {e}")

        # --- 3. GLDAS Soil Moisture ---
        try:
            gldas = ee.ImageCollection('NASA/GLDAS/V021/NOAH/G025/T3H') \
                      .filterDate('2020-01-01', '2024-01-01').mean()
            sm_val = gldas.select([
                'SoilMoi0_10cm_inst', 'SoilMoi10_40cm_inst',
                'SoilMoi40_100cm_inst', 'RootMoist_inst'
            ]).reduceRegion(
                reducer=ee.Reducer.mean(), geometry=buf_5km, scale=25000,
                maxPixels=1e9, bestEffort=True
            ).getInfo()
            s0  = round(float(sm_val.get('SoilMoi0_10cm_inst',   0)), 3)
            s10 = round(float(sm_val.get('SoilMoi10_40cm_inst',  0)), 3)
            s40 = round(float(sm_val.get('SoilMoi40_100cm_inst', 0)), 3)
            root= round(float(sm_val.get('RootMoist_inst',        0)), 3)
            result['soil_moisture'] = {
                'layer_0_10cm':   s0,
                'layer_10_40cm':  s10,
                'layer_40_100cm': s40,
                'root_zone':      root,
            }
            print(f"  ✅ GLDAS: top={s0} root={root} kg/m²")
        except Exception as e:
            result['soil_moisture'] = {'layer_0_10cm': 0, 'root_zone': 0}
            print(f"  ❌ GLDAS: {e}")

        # --- 4. TerraClimate (PDSI, Deficit, Runoff, ET) ---
        try:
            terra = ee.ImageCollection('IDAHO_EPSCOR/TERRACLIMATE') \
                      .filterDate('2019-01-01', '2024-01-01').mean()
            tc_val = terra.select(['pdsi', 'def', 'aet', 'soil', 'ro']).reduceRegion(
                reducer=ee.Reducer.mean(), geometry=buf_20km, scale=4000,
                maxPixels=1e9, bestEffort=True
            ).getInfo()
            # TerraClimate: pdsi ÷100, def/aet/soil/ro ×0.1 (stored ×10)
            pdsi    = round(float(tc_val.get('pdsi', 0)) / 100.0, 3)
            deficit = round(float(tc_val.get('def',  0)) * 0.1, 2)
            aet     = round(float(tc_val.get('aet',  0)) * 0.1, 2)
            soil_tc = round(float(tc_val.get('soil', 0)) * 0.1, 2)
            runoff  = round(float(tc_val.get('ro',   0)) * 0.1, 2)
            result['terraclimate'] = {
                'pdsi':                  pdsi,
                'pdsi_label':            _pdsi_label(pdsi),
                'water_deficit_mm_month': deficit,
                'deficit_label':         _deficit_label(deficit),
                'actual_et_mm_month':    aet,
                'actual_et_annual_mm':   round(aet * 12, 1),
                'soil_moisture_mm':      soil_tc,
                'runoff_mm_month':       runoff,
                'runoff_annual_mm':      round(runoff * 12, 1),
            }
            print(f"  ✅ TerraClimate: PDSI={pdsi} deficit={deficit}mm runoff={runoff}mm/mo")
        except Exception as e:
            result['terraclimate'] = {'pdsi': 0, 'water_deficit_mm_month': 0, 'runoff_mm_month': 0}
            print(f"  ❌ TerraClimate: {e}")

        # --- 5. MODIS ET ---
        try:
            modis_et = ee.ImageCollection('MODIS/061/MOD16A2') \
                         .filterDate('2020-01-01', '2024-01-01').mean()
            et_val = modis_et.select('ET').reduceRegion(
                reducer=ee.Reducer.mean(), geometry=buf_20km, scale=500,
                maxPixels=1e9, bestEffort=True
            ).getInfo()
            et_8day = round(float(et_val.get('ET', 0)) * 0.1, 3)
            result['modis_et'] = {
                'et_kg_m2_8day':   et_8day,
                'et_monthly_est':  round(et_8day * (30 / 8), 3),
                'et_annual_est_mm': round(et_8day * (365 / 8), 1),
            }
            print(f"  ✅ MODIS ET: {et_8day} kg/m²/8day")
        except Exception as e:
            result['modis_et'] = {'et_kg_m2_8day': 0, 'et_annual_est_mm': 0}
            print(f"  ❌ MODIS ET: {e}")

        # --- 6. GRACE Groundwater Anomaly (50km buffer) ---
        try:
            grace = ee.ImageCollection('NASA/GRACE/MASS_GRIDS_V04/MASCON') \
                      .filterDate('2019-01-01', '2024-01-01').mean()
            g_val = grace.select(['lwe_thickness', 'uncertainty']).reduceRegion(
                reducer=ee.Reducer.mean(), geometry=buf_50km, scale=55660,
                maxPixels=1e9, bestEffort=True
            ).getInfo()
            lwe    = round(float(g_val.get('lwe_thickness', 0)), 3)
            uncert = round(float(g_val.get('uncertainty',  0)), 3)
            result['groundwater_grace'] = {
                'lwe_thickness_cm': lwe,
                'uncertainty_cm':   uncert,
                'status_label':     _grace_label(lwe),
                'trend':            'Depletion' if lwe < 0 else 'Recharge/Stable',
            }
            print(f"  ✅ GRACE: LWE={lwe}cm ({_grace_label(lwe)})")
        except Exception as e:
            result['groundwater_grace'] = {'lwe_thickness_cm': 0, 'status_label': 'Unknown'}
            lwe = 0
            print(f"  ❌ GRACE: {e}")

        # --- 7. Landsat 9 NDWI ---
        try:
            ls9 = ee.ImageCollection('LANDSAT/LC09/C02/T1_L2') \
                    .filterDate('2022-01-01', '2024-12-31') \
                    .filterBounds(buf_5km) \
                    .filter(ee.Filter.lt('CLOUD_COVER', 30))
            scene_count = int(ls9.size().getInfo())
            if scene_count > 0:
                def add_ndwi(img):
                    green = img.select('SR_B3').multiply(0.0000275).add(-0.2)
                    nir   = img.select('SR_B5').multiply(0.0000275).add(-0.2)
                    ndwi  = green.subtract(nir).divide(green.add(nir)).rename('ndwi')
                    return ndwi
                ndwi_col = ls9.map(add_ndwi).mean()
                ndwi_val = ndwi_col.reduceRegion(
                    reducer=ee.Reducer.mean(), geometry=buf_5km, scale=100,
                    maxPixels=1e10, bestEffort=True
                ).getInfo()
                ndwi = round(float(ndwi_val.get('ndwi', 0)), 4)
            else:
                ndwi = 0.0

            if ndwi > 0.3:
                ndwi_label = "Water Body / High Moisture"
            elif ndwi > 0.0:
                ndwi_label = "Moist Soil / Vegetation"
            elif ndwi > -0.2:
                ndwi_label = "Dry Vegetation / Moderate Stress"
            else:
                ndwi_label = "Very Dry / Barren Surface"

            result['ndwi_landsat9'] = {
                'ndwi_value':  ndwi,
                'ndwi_label':  ndwi_label,
                'scenes_used': scene_count,
                'period':      '2022–2024',
            }
            print(f"  ✅ Landsat 9 NDWI: {ndwi} ({ndwi_label}) [{scene_count} scenes]")
        except Exception as e:
            result['ndwi_landsat9'] = {'ndwi_value': None, 'ndwi_label': 'Data unavailable', 'scenes_used': 0}
            print(f"  ❌ Landsat 9 NDWI: {e}")

        # --- 8. Local GeoJSON Assets (Powerhouse + Groundwater Admin) ---
        powerhouse = None
        if self.powerhouse_gdf is not None:
            try:
                from shapely.geometry import Point as SPoint
                point_gdf    = gpd.GeoDataFrame(geometry=[SPoint(lon, lat)], crs="EPSG:4326")
                point_metric = point_gdf.to_crs(epsg=3857)
                distances    = self.ph_metric.distance(point_metric.geometry[0])
                idx = distances.idxmin()
                ph  = self.powerhouse_gdf.iloc[idx]
                powerhouse = {
                    'name':      str(ph.get('Name_of_Powerhouse') or 'Unknown'),
                    'dist_km':   round(float(distances.min() / 1000), 2),
                    'cap_mw':    float(ph.get('Total_Installed_Capacity__MW_') or 0),
                    'river':     str(ph.get('river') or 'Unknown'),
                    'energy_mu': float(ph.get('Annual_Design_Energy__MU_') or 0),
                }
            except Exception as e:
                print(f"  ❌ Powerhouse lookup: {e}")

        gw_admin = None
        if self.groundwater_gdf is not None:
            try:
                from shapely.geometry import Point as SPoint
                match = self.groundwater_gdf[self.groundwater_gdf.contains(SPoint(lon, lat))]
                if not match.empty:
                    row = match.iloc[0]
                    gw_admin = {
                        'block':       str(row.get('BLOCK') or ''),
                        'cat':         str(row.get('CLASS') or ''),
                        'extract_pct': float(row.get('Stage_of_Ground_Water__Development____') or 0),
                        'avail':       float(row.get('Net_Annual_Ground_Water_Availability') or 0),
                        'usage':       float(row.get('Annual_Ground_Water_Draft_Total') or 0),
                    }
            except Exception as e:
                print(f"  ❌ Groundwater admin lookup: {e}")

        result['infrastructure'] = powerhouse
        result['admin']          = gw_admin

        # Composite score using corrected values
        precip_daily = result.get('precipitation', {}).get('daily_mm', 0)
        lwe_val      = result.get('groundwater_grace', {}).get('lwe_thickness_cm', 0)
        deficit_val  = result.get('terraclimate', {}).get('water_deficit_mm_month', 0)
        soil_val     = result.get('soil_moisture', {}).get('layer_0_10cm', 0)
        occ_val_2    = result.get('surface_water', {}).get('occurrence_pct', 0)
        result['composite_risk_score'] = _compute_water_score(
            precip_daily, lwe_val, deficit_val, soil_val, occ_val_2
        )
        result['water_rating'] = _water_rating(result['composite_risk_score'])

        return result
