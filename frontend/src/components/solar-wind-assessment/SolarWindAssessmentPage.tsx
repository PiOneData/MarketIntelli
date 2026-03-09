import { useState, useEffect, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, Server, Zap } from "lucide-react";
import {
  analyzeLocation,
  getLiveWeather,
  DEFAULT_LIVE_WEATHER,
  type AnalysisResult,
  type LiveWeatherData,
} from "../../api/solarWindAssessment";
import SolarWindMap from "./SolarWindMap";
import SolarWindReport from "./SolarWindReport";

type ViewMode = "map" | "loading" | "report";

interface DatacenterProps {
  id?: string;
  name?: string;
  company?: string;
  address?: string;
  tier?: string;
  analysis?: string | AnalysisResult;
  [key: string]: unknown;
}

interface AppData {
  analysis: AnalysisResult | null;
  live: LiveWeatherData | null;
  lat: number;
  lng: number;
  datacenter: DatacenterProps | null;
}

const DC_CACHE_VERSION = "v2";
const getCacheKey = (dcId: string) => `dc_analysis_${DC_CACHE_VERSION}_${dcId}`;

// ── GeoJSON → API schema normalizer ─────────────────────────────────────────
// The embedded analysis in datacenters.geojson uses different field names from
// the AssessmentService API response.  This bridges the gap so SolarWindReport
// always receives the format it expects regardless of the data source.
type R = Record<string, unknown>;

function normalizeGeoJsonAnalysis(raw: R): AnalysisResult {
  const w    = (raw.wind       ?? {}) as R;
  const s    = (raw.solar      ?? {}) as R;
  const wt   = (raw.water      ?? {}) as R;
  const suit = (raw.suitability ?? {}) as R;

  // ── WIND ──────────────────────────────────────────────────────────────────
  const wRes     = (w.resource         ?? {}) as R;
  const wTerrain = (w.terrain          ?? {}) as R;
  const wCF      = (w.capacity_factors ?? {}) as R;

  const rixVal   = (wTerrain.rix   ?? 0) as number;
  const slopeVal = (wTerrain.slope ?? 0) as number;

  const windNorm: R = {
    ...w,                            // preserves profile, physics, yield_est etc.
    score: (w.score ?? 0) as number,
    resource: {
      grade: (wRes.grade ?? "") as string,
      label: (wRes.label ?? "") as string,
      // GeoJSON: ws_100 / pd_100 / ad_100 — API: wind_speed / power_density / air_density
      wind_speed:    (wRes.wind_speed    ?? wRes.ws_100  ?? 0)     as number,
      power_density: (wRes.power_density ?? wRes.pd_100  ?? 0)     as number,
      air_density:   (wRes.air_density   ?? wRes.ad_100  ?? 1.225) as number,
    },
    // GeoJSON uses wind.terrain; API uses wind.feasibility
    feasibility: (w.feasibility as R) ?? {
      rix:       rixVal,
      slope:     slopeVal,
      elevation: (wTerrain.elevation ?? 0) as number,
      status:    rixVal < 0.5 && slopeVal < 20 ? "Feasible" : "Challenging",
    },
    // GeoJSON uses wind.capacity_factors; API uses wind.turbine
    turbine: (w.turbine as R) ?? {
      best_fit: (wCF.best_class ?? wCF.best_fit ?? "") as string,
      cf_iec1:  (wCF.cf_iec1 ?? 0) as number,
      cf_iec2:  (wCF.cf_iec2 ?? 0) as number,
      cf_iec3:  (wCF.cf_iec3 ?? 0) as number,
    },
  };

  // ── SOLAR ─────────────────────────────────────────────────────────────────
  const sRes  = (s.resource ?? {}) as R;
  const sCore = (s.core     ?? {}) as R;
  // GeoJSON stores GHI under solar.core.ghi_kwh_m2_year; API returns solar.resource.ghi
  const ghi = (sRes.ghi ?? sCore.ghi_kwh_m2_year ?? 0) as number;
  const sGrade = (sRes.grade as string) ??
    (ghi >= 2000 ? "A+" : ghi >= 1800 ? "A" : ghi >= 1600 ? "B" : ghi >= 1400 ? "C" : "D");
  const sLabel = (sRes.label as string) ??
    (ghi >= 2000 ? "World-class irradiance" :
     ghi >= 1800 ? "Excellent solar resource" :
     ghi >= 1600 ? "Good commercial viability" :
     ghi >= 1400 ? "Moderate resource" : "Marginal resource");

  const solarNorm: R = {
    ...s,                            // preserves monthly, terrain, atmospheric, etc.
    score: (s.score ?? 0) as number,
    resource: {
      grade: sGrade,
      label: sLabel,
      ghi,
      dni:   (sRes.dni   ?? sCore.dni   ?? 0) as number,
      dif:   (sRes.dif   ?? sCore.dif   ?? 0) as number,
      pvout: (sRes.pvout ?? sCore.pvout_kwh_kwp_year ?? 0) as number,
      ltdi:  (sRes.ltdi  ?? sCore.dif_fraction       ?? 0) as number,
    },
  };

  // ── WATER ─────────────────────────────────────────────────────────────────
  const wtGrace = (wt.groundwater_grace ?? {}) as R;
  const wtTerra = (wt.terraclimate      ?? {}) as R;

  const graceAnomaly   = (wt.grace_anomaly       ?? wtGrace.lwe_thickness_cm ?? 0) as number;
  const pdsi           = (wt.pdsi                ?? wtTerra.pdsi             ?? 0) as number;
  const compositeScore = (wt.composite_risk_score ?? 0) as number;
  const interpretation = (
    wt.interpretation ??
    wt.water_rating ??
    (compositeScore >= 60 ? "Good water availability" :
     compositeScore >= 30 ? "Moderate water availability" : "Water-stressed region")
  ) as string;

  const waterNorm: R = {
    ...wt,
    composite_risk_score: compositeScore,
    grace_anomaly:        graceAnomaly,
    pdsi,
    interpretation,
  };

  // ── SUITABILITY ───────────────────────────────────────────────────────────
  const windScore  = (w.score  ?? 0) as number;
  const solarScore = (s.score  ?? 0) as number;
  const storedScore = (suit.overall_score ?? 0) as number;
  const overallScore = storedScore > 0
    ? storedScore
    : Math.round(((solarScore * 0.35) + (windScore * 0.35) + (compositeScore * 0.30)) * 10) / 10;
  const rating = (suit.rating as string) ||
    (overallScore >= 75 ? "PREMIUM SITE" :
     overallScore >= 60 ? "OPTIMAL" :
     overallScore >= 45 ? "VIABLE" : "CHALLENGING");

  return {
    wind:  windNorm,
    solar: solarNorm,
    water: waterNorm,
    suitability: {
      overall_score: overallScore,
      rating,
      insights:   (suit.insights   ?? []) as string[],
      components: (suit.components ?? {
        solar: solarScore, wind: windScore, water: compositeScore,
      }) as { solar: number; wind: number; water: number },
    },
    location:  (raw.location  ?? { lat: 0, lon: 0 }) as AnalysisResult["location"],
    timestamp: (raw.timestamp ?? new Date().toISOString()) as string,
  } as unknown as AnalysisResult;
}

// ── dc_final_merged.geojson → API schema normalizer ──────────────────────────
// This dataset stores RE assessment directly on feature properties (no nested
// `analysis` field).  Field names and structure differ from the old schema.
// MapLibre GL serializes nested objects to JSON strings when querying features;
// this helper transparently parses them back.
function parseIfString(val: unknown): R {
  if (typeof val === "string") {
    try { return JSON.parse(val) as R; } catch { return {} as R; }
  }
  return (val ?? {}) as R;
}

function normalizeMergedDcProps(p: R): AnalysisResult {
  const sol  = parseIfString(p.solar);
  const wnd  = parseIfString(p.wind);
  const wat  = parseIfString(p.water);
  const loc  = parseIfString(p.local_analysis);

  // ── WIND ──────────────────────────────────────────────────────────────────
  // profile stored as { "10": {ws,pd,ad}, "50":…, "100":…, "150":…, "200":… }
  const rawProfile = (wnd.profile ?? {}) as R;
  const profileHeights: number[] = [];
  const profileSpeeds: number[]  = [];
  const profileDens: number[]    = [];
  const profileAd: number[]      = [];
  for (const h of ["10", "50", "100", "150", "200"]) {
    const row = (rawProfile[h] ?? {}) as R;
    if (Object.keys(row).length) {
      profileHeights.push(Number(h));
      profileSpeeds.push((row.ws ?? 0) as number);
      profileDens.push((row.pd ?? 0) as number);
      profileAd.push((row.ad ?? 1.225) as number);
    }
  }

  const windGrade = (wnd.grade ?? "D") as string;
  const windLabel = (wnd.grade_label ?? "") as string;
  const ws100     = (wnd.profile && (rawProfile["100"] as R)?.ws ? (rawProfile["100"] as R).ws : 0) as number;
  const pd100     = (wnd.pd100 ?? 0) as number;
  const rix       = (wnd.rix   ?? 0) as number;
  const slope     = (wnd.slope ?? 0) as number;
  const elev      = (wnd.elevation ?? 0) as number;
  const cf3       = (wnd.cf3  ?? 0) as number;

  const windNorm: R = {
    score: (p.wind_score ?? wnd.score ?? 0) as number,
    resource: {
      grade: windGrade,
      label: windLabel,
      wind_speed:    ws100,
      power_density: pd100,
      air_density:   (profileAd[2] ?? 1.225),
    },
    feasibility: {
      rix,
      slope,
      elevation: elev,
      status: rix < 0.5 && slope < 20 ? "Feasible" : "Challenging",
    },
    turbine: {
      best_fit: "IEC Class 3",
      cf_iec1:  cf3 * 0.6,
      cf_iec2:  cf3 * 0.8,
      cf_iec3:  cf3,
    },
    profile: { heights: profileHeights, speeds: profileSpeeds, densities: profileDens, air_density: profileAd },
    yield_est: { annual_mwh_2mw: (wnd.annual_mwh_2mw ?? 0) as number },
    physics: { shear_alpha: (wnd.shear_alpha ?? 0) as number },
  };

  // ── SOLAR ─────────────────────────────────────────────────────────────────
  const ghiAnnual  = (sol.ghi_annual  ?? (sol.ghi as number ?? 0) * 365) as number;
  const pvoutAnnual = (sol.pvout_annual ?? 0) as number;
  const solarScore  = (p.solar_score  ?? sol.score ?? 0) as number;
  const sGrade = ghiAnnual >= 2000 ? "A+" : ghiAnnual >= 1800 ? "A" : ghiAnnual >= 1600 ? "B" : ghiAnnual >= 1400 ? "C" : "D";
  const sLabel = ghiAnnual >= 2000 ? "World-class irradiance" :
    ghiAnnual >= 1800 ? "Excellent solar resource" :
    ghiAnnual >= 1600 ? "Good commercial viability" :
    ghiAnnual >= 1400 ? "Moderate resource" : "Marginal resource";

  // monthly: array of 12 values — wrap in the shape SolarWindReport expects
  const monthlyVals = (sol.monthly ?? []) as number[];
  const monthNames  = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const bestIdx     = monthlyVals.reduce((bi, v, i, a) => v > a[bi]! ? i : bi, 0);
  const worstIdx    = monthlyVals.reduce((bi, v, i, a) => v < a[bi]! ? i : bi, 0);

  const solarNorm: R = {
    score: solarScore,
    resource: {
      grade: sGrade,
      label: sLabel,
      ghi:   ghiAnnual,
      pvout: pvoutAnnual,
      dni:   0,
      dif:   0,
      ltdi:  0,
    },
    core: {
      ghi_kwh_m2_year:    ghiAnnual,
      pvout_kwh_kwp_year: pvoutAnnual,
      ghi_kwh_m2_day:     (sol.ghi ?? 0) as number,
      pvout_kwh_kwp_day:  (sol.pvout ?? 0) as number,
      optimal_tilt:       (sol.optimal_tilt ?? 0) as number,
      avg_temp:           (sol.avg_temp ?? 0) as number,
      dif_fraction:       0,
      temp_derate_pct:    0,
    },
    monthly: {
      values:     monthlyVals,
      best_month: monthNames[bestIdx] ?? "",
      best_val:   monthlyVals[bestIdx] ?? 0,
      worst_month: monthNames[worstIdx] ?? "",
      worst_val:  monthlyVals[worstIdx] ?? 0,
      range:      (monthlyVals[bestIdx] ?? 0) - (monthlyVals[worstIdx] ?? 0),
      stability:  (sol.seasonal_label ?? "") as string,
    },
    terrain: {
      elevation_m: (sol.elevation ?? 0) as number,
      slope_deg:   (sol.slope ?? 0) as number,
      aspect_deg:  (sol.aspect ?? 0) as number,
    },
    atmospheric: {
      aod:          (sol.aod ?? 0) as number,
      aod_label:    (sol.aod_label ?? "") as string,
      cloud_pct:    (sol.cloud_pct ?? 0) as number,
      cloud_label:  (sol.cloud_label ?? "") as string,
      clear_days_yr: Math.round(365 * (1 - (sol.cloud_pct as number ?? 0) / 100)),
      transmittance: 0,
    },
    validation: {
      era5_ghi_day:       (sol.era5_ghi ?? 0) as number,
      gsa_ghi_day:        (sol.ghi ?? 0) as number,
      agreement_pct:      (sol.era5_agreement ?? 0) as number,
      era5_ghi_diff_pct:  0,
    },
  };

  // ── WATER ─────────────────────────────────────────────────────────────────
  const waterScore = (p.water_score ?? wat.score ?? 0) as number;
  const pdsi       = (wat.pdsi  ?? 0) as number;
  const lwe        = (wat.lwe   ?? 0) as number;

  const waterNorm: R = {
    composite_risk_score: waterScore,
    grace_anomaly:        lwe,
    pdsi,
    interpretation: (p.water_rating ?? "") as string,
    precipitation: {
      daily_mm:  (wat.precip_daily  ?? 0) as number,
      annual_mm: (wat.precip_annual ?? 0) as number,
    },
    surface_water: {
      occurrence_pct: (wat.occurrence ?? 0) as number,
      flood_risk:     (wat.flood_risk ?? "") as string,
    },
    soil_moisture: {
      layer_0_10cm: (wat.soil_0_10  ?? 0) as number,
      root_zone:    (wat.root_zone  ?? 0) as number,
    },
    terraclimate: {
      pdsi,
      pdsi_label:           (wat.pdsi_label ?? "") as string,
      water_deficit_mm_month: (wat.deficit ?? 0) as number,
      deficit_label:         (wat.deficit_label ?? "") as string,
      runoff_mm_month:       (wat.runoff ?? 0) as number,
      actual_et_mm_month:    (wat.aet ?? 0) as number,
    },
    groundwater_grace: {
      lwe_thickness_cm: lwe,
      status_label:     (wat.grace_label ?? "") as string,
    },
    ndwi_landsat9: {
      ndwi_value: (wat.ndwi ?? 0) as number,
      ndwi_label: (wat.ndwi as number ?? 0) > 0.2 ? "Water-rich" : (wat.ndwi as number ?? 0) > 0 ? "Moist" : "Dry / Bare",
    },
    infrastructure: {
      name:      ((loc.powerhouse as R)?.name ?? "") as string,
      dist_km:   ((loc.powerhouse as R)?.dist_km ?? 0) as number,
      cap_mw:    ((loc.powerhouse as R)?.cap_mw ?? 0) as number,
      river:     ((loc.powerhouse as R)?.river ?? null) as string | null,
      energy_mu: ((loc.powerhouse as R)?.energy_mu ?? 0) as number,
    },
    local_analysis: loc,   // pass through for RX² panel consumption
  };

  // ── SUITABILITY ───────────────────────────────────────────────────────────
  const overallScore = (p.overall_score ?? 0) as number;
  const rating       = (p.overall_rating ?? (
    overallScore >= 75 ? "PREMIUM SITE" :
    overallScore >= 60 ? "OPTIMAL" :
    overallScore >= 45 ? "VIABLE" : "CHALLENGING"
  )) as string;

  return {
    wind:  windNorm,
    solar: solarNorm,
    water: waterNorm,
    suitability: {
      overall_score: overallScore,
      rating,
      insights: [],
      components: {
        solar: (p.solar_score ?? 0) as number,
        wind:  (p.wind_score  ?? 0) as number,
        water: waterScore,
      },
    },
    location:  { lat: (p.lat ?? 0) as number, lon: (p.lon ?? p.lng ?? 0) as number },
    timestamp: new Date().toISOString(),
  } as unknown as AnalysisResult;
}

export default function SolarWindAssessmentPage() {
  const [view, setView] = useState<ViewMode>("map");
  const [data, setData] = useState<AppData>({
    analysis: null,
    live: null,
    lat: 0,
    lng: 0,
    datacenter: null,
  });
  const [loadingFromCache, setLoadingFromCache] = useState(false);

  const fetchAnalysis = useCallback(async (
    lat: number,
    lng: number,
    datacenter: DatacenterProps | null = null,
  ) => {
    // ── Stage 1: embedded analysis ─────────────────────────────────────────
    // Sub-case A: dc_final_merged.geojson — assessment fields are flat on props
    //   (solar/wind/water at top level, no nested `analysis` object).
    // Sub-case B: legacy datacenters.geojson — analysis nested in `analysis` field.
    const dcR = datacenter as unknown as R;
    const hasMergedSchema = !!(dcR?.solar && dcR?.wind && !datacenter?.analysis);
    if (hasMergedSchema || datacenter?.analysis) {
      try {
        let analysis: AnalysisResult;
        if (hasMergedSchema) {
          analysis = normalizeMergedDcProps(dcR);
        } else {
          const rawAnalysis: R =
            typeof datacenter!.analysis === "string"
              ? (JSON.parse(datacenter!.analysis as string) as R)
              : (datacenter!.analysis as unknown as R);
          analysis = normalizeGeoJsonAnalysis(rawAnalysis);
        }

        setLoadingFromCache(true);
        setView("loading");

        const liveData = await getLiveWeather(lat, lng).catch(
          () => DEFAULT_LIVE_WEATHER,
        );

        // Normalise name/id fields so the loading overlay and report header work
        // regardless of which GeoJSON schema (legacy `name` or merged `dc_name`).
        const enrichedDc: DatacenterProps = {
          ...datacenter,
          name: (String(dcR?.dc_name ?? datacenter?.name ?? "")),
          id:   datacenter?.id ?? (dcR?.slno != null ? String(dcR.slno) : undefined),
        };

        setData({ analysis, live: liveData, lat, lng, datacenter: enrichedDc });
        setView("report");
        setLoadingFromCache(false);
        return;
      } catch {
        // normalisation failed — fall through to API
      }
    }

    // ── Stage 2: localStorage cache ────────────────────────────────────────
    if (datacenter?.id) {
      const cached = localStorage.getItem(getCacheKey(String(datacenter.id)));
      if (cached) {
        try {
          const { analysis, live } = JSON.parse(cached) as {
            analysis: AnalysisResult;
            live: LiveWeatherData;
          };
          setLoadingFromCache(true);
          setView("loading");
          await new Promise((r) => setTimeout(r, 300));
          setData({ analysis, live, lat, lng, datacenter });
          setView("report");
          setLoadingFromCache(false);
          return;
        } catch {
          localStorage.removeItem(getCacheKey(String(datacenter.id)));
        }
      }
    }

    // ── Stage 3: fresh API fetch ────────────────────────────────────────────
    setView("loading");
    setLoadingFromCache(false);
    setData((prev: AppData) => ({ ...prev, lat, lng, datacenter }));

    try {
      const [analysisResult, liveResult] = await Promise.allSettled([
        analyzeLocation(lat, lng),
        getLiveWeather(lat, lng),
      ]);

      const analysisData =
        analysisResult.status === "fulfilled" ? analysisResult.value : null;
      const liveData =
        liveResult.status === "fulfilled"
          ? liveResult.value
          : DEFAULT_LIVE_WEATHER;

      if (!analysisData) throw new Error("Analysis failed. Please try again.");

      if (datacenter?.id) {
        try {
          localStorage.setItem(
            getCacheKey(String(datacenter.id)),
            JSON.stringify({ analysis: analysisData, live: liveData, cachedAt: Date.now() }),
          );
        } catch {
          // storage full — ignore
        }
      }

      setData({ analysis: analysisData, live: liveData, lat, lng, datacenter });
      setView("report");
    } catch (err) {
      setView("map");
      const message = err instanceof Error ? err.message : "An unknown error occurred";
      alert("Error: " + message);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-trigger analysis when navigated from DataCenterMap with a pending DC
  useEffect(() => {
    const pending = sessionStorage.getItem("pending_dc_assessment");
    if (!pending) return;
    try {
      const { props, lat, lng } = JSON.parse(pending) as {
        props: DatacenterProps;
        lat: number;
        lng: number;
      };
      sessionStorage.removeItem("pending_dc_assessment");
      void fetchAnalysis(lat, lng, props);
    } catch {
      sessionStorage.removeItem("pending_dc_assessment");
    }
  }, [fetchAnalysis]);

  const handleDatacenterClick = (
    lat: number,
    lng: number,
    dcProps: DatacenterProps,
  ) => fetchAnalysis(lat, lng, dcProps);

  const handleClearCache = () => {
    if (data.datacenter?.id) {
      localStorage.removeItem(getCacheKey(String(data.datacenter.id)));
    }
  };

  return (
    <div className="w-full relative" style={{ height: "100%", minHeight: "calc(100vh - 100px)" }}>
      {/* MAP LAYER — always mounted so the map doesn't reload on report close */}
      <div
        className="w-full h-full absolute inset-0"
        style={{ visibility: view === "report" ? "hidden" : "visible" }}
      >
        <SolarWindMap
          onDatacenterClick={handleDatacenterClick}
          onLocationAnalyze={(lat, lng) => fetchAnalysis(lat, lng)}
        />
      </div>

      {/* LOADING OVERLAY */}
      <AnimatePresence>
        {view === "loading" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center"
          >
            <div className="bg-white p-8 rounded-2xl shadow-xl flex flex-col items-center border border-slate-100 max-w-sm w-full mx-4">
              {loadingFromCache ? (
                <>
                  <div className="w-12 h-12 rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-center mb-4">
                    <Zap className="w-6 h-6 text-teal-600" />
                  </div>
                  <h3 className="text-base font-semibold text-slate-800">
                    Loading from Cache
                  </h3>
                  <p className="text-slate-500 text-sm mt-1 text-center">
                    Syncing live weather &amp; telemetry…
                  </p>
                  {data.datacenter && (
                    <div className="mt-3 text-xs font-semibold text-teal-600 uppercase tracking-wide">
                      {data.datacenter.name}
                    </div>
                  )}
                </>
              ) : (
                <>
                  <Loader2 className="w-10 h-10 text-teal-600 animate-spin mb-4" />
                  <h3 className="text-base font-semibold text-slate-800">
                    {data.datacenter
                      ? "Analysing Data Center Site…"
                      : "Mapping RE Potential…"}
                  </h3>
                  <p className="text-slate-500 text-sm mt-1 text-center">
                    {data.datacenter
                      ? String(data.datacenter.name ?? "")
                      : `${data.lat.toFixed(4)}, ${data.lng.toFixed(4)}`}
                  </p>
                  <p className="text-xs text-slate-400 mt-2 font-mono">
                    {data.lat.toFixed(5)}°N · {data.lng.toFixed(5)}°E
                  </p>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {view === "loading" && !loadingFromCache && (
        <div className="absolute top-4 right-4 z-50">
          <Server className="w-5 h-5 text-teal-500 animate-pulse" />
        </div>
      )}

      {/* REPORT VIEW */}
      <AnimatePresence>
        {view === "report" && data.analysis && data.live && (
          <SolarWindReport
            key="report"
            analysis={data.analysis}
            live={data.live}
            lat={data.lat}
            lng={data.lng}
            datacenter={data.datacenter}
            onClose={() => setView("map")}
            onClearCache={data.datacenter?.id ? handleClearCache : undefined}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
