import { useState } from "react";
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

const DC_CACHE_VERSION = "v1";
const getCacheKey = (dcId: string) => `dc_analysis_${DC_CACHE_VERSION}_${dcId}`;

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

  const fetchAnalysis = async (
    lat: number,
    lng: number,
    datacenter: DatacenterProps | null = null,
  ) => {
    // ── Check if analysis is pre-embedded in GeoJSON ──
    if (datacenter?.analysis) {
      try {
        const analysis =
          typeof datacenter.analysis === "string"
            ? (JSON.parse(datacenter.analysis) as AnalysisResult)
            : datacenter.analysis;

        setLoadingFromCache(true);
        setView("loading");

        const liveData = await getLiveWeather(lat, lng).catch(
          () => DEFAULT_LIVE_WEATHER,
        );

        setData({ analysis, live: liveData, lat, lng, datacenter });
        setView("report");
        setLoadingFromCache(false);
        return;
      } catch {
        // fall through
      }
    }

    // ── Check localStorage cache ──
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

    // ── Fresh API fetch ──
    setView("loading");
    setLoadingFromCache(false);
    setData((prev) => ({ ...prev, lat, lng, datacenter }));

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
  };

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
    <div className="w-full h-full relative" style={{ minHeight: "calc(100vh - 120px)" }}>
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
                  <div className="w-12 h-12 rounded-2xl bg-violet-100 border border-violet-200 flex items-center justify-center mb-4">
                    <Zap className="w-6 h-6 text-violet-500" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-800 uppercase tracking-tight">
                    Accessing Neural Cache
                  </h3>
                  <p className="text-slate-500 text-sm italic mt-1 text-center">
                    Syncing Live Weather &amp; Telemetry...
                  </p>
                  {data.datacenter && (
                    <div className="mt-3 text-[10px] font-black text-violet-500 uppercase tracking-widest">
                      {data.datacenter.name}
                    </div>
                  )}
                </>
              ) : (
                <>
                  <Loader2 className="w-10 h-10 text-violet-500 animate-spin mb-4" />
                  <h3 className="text-lg font-bold text-slate-800 uppercase tracking-tight">
                    {data.datacenter
                      ? "Analysing Data Center Site..."
                      : "Mapping Site Intelligence..."}
                  </h3>
                  <p className="text-slate-500 text-sm italic mt-1 text-center">
                    {data.datacenter
                      ? String(data.datacenter.name ?? "")
                      : `${data.lat.toFixed(4)}, ${data.lng.toFixed(4)}`}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-2">
                    {data.lat.toFixed(5)}°N · {data.lng.toFixed(5)}°E
                  </p>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* SERVER ICON indicator while loading (matches original design) */}
      {view === "loading" && !loadingFromCache && (
        <div className="absolute top-4 right-4 z-50">
          <Server className="w-5 h-5 text-violet-400 animate-pulse" />
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
