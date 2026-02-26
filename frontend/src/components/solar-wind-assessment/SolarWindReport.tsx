import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ComposedChart,
  Line,
  BarChart,
  Bar,
  Cell,
} from "recharts";
import {
  Wind,
  Sun,
  Cloud,
  Satellite,
  ArrowLeft,
  X,
  TrendingUp,
  Server,
  Globe,
  MapPin,
  Cpu,
  BookOpen,
  ShieldCheck,
  Zap,
} from "lucide-react";
import type { AnalysisResult, LiveWeatherData } from "../../api/solarWindAssessment";

// ── Types ────────────────────────────────────────────────────────────────────
interface DcProps {
  name?: string;
  company?: string;
  address?: string;
  city?: string;
  state?: string;
  postal?: string;
  plus_code?: string;
  tier?: string;
  power_mw?: string | number;
  whitespace?: string;
  market?: string;
  country?: string;
  url?: string;
  [key: string]: unknown;
}

interface Props {
  analysis: AnalysisResult;
  live: LiveWeatherData;
  lat: number;
  lng: number;
  datacenter: DcProps | null;
  onClose: () => void;
  onClearCache?: () => void;
}

type TabId = "datacenter" | "wind" | "solar" | "water";

// ── Helpers ──────────────────────────────────────────────────────────────────
const getCardinal = (angle: number): string => {
  const dirs = ["North", "North-East", "East", "South-East", "South", "South-West", "West", "North-West"];
  return dirs[Math.round(angle / 45) % 8] ?? "North";
};

const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// ── Custom Droplets icon (not in lucide-react) ────────────────────────────────
const Droplets = ({ size = 20, className = "" }: { size?: number; className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    className={className}>
    <path d="M7 16.3c2.2 0 4-1.8 4-4 0-3.3-4-6.3-4-6.3S3 9 3 12.3c0 2.2 1.8 4 4 4z" />
    <path d="M17 16.3c2.2 0 4-1.8 4-4 0-3.3-4-6.3-4-6.3s-4 3-4 6.3c0 2.2 1.8 4 4 4z" />
  </svg>
);

// ── GUIDE_ITEMS ──────────────────────────────────────────────────────────────
const GUIDE_ITEMS = [
  { icon: <Server size={20} className="text-violet-500" />, title: "Infrastructure Layer", desc: "Assesses physical datacenter assets: Tier ratings, power capacity (MW), and whitespace." },
  { icon: <Wind size={20} className="text-cyan-500" />, title: "Wind Resource Assessment", desc: "Uses GWA v3 & ERA5 data. Calculates Capacity Factors (CF) for IEC Class 1, 2, and 3 turbines at 100m." },
  { icon: <Sun size={20} className="text-amber-500" />, title: "Solar Viability", desc: "Extracts GHI, DNI, and DIF from Copernicus CAMS. Factors in terrain slope and AOD." },
  { icon: <Cloud size={20} className="text-blue-500" />, title: "Hydrology & Resilience", desc: "Analyzes Groundwater anomalies (GRACE), Soil Moisture (GLDAS), and Flood Risk (JRC)." },
  { icon: <ShieldCheck size={20} className="text-emerald-500" />, title: "Supply Index Logic", desc: "A weighted composite of 5 datasets. High scores = high resource abundance." },
];

// ── Main Component ───────────────────────────────────────────────────────────
export default function SolarWindReport({ analysis, live, lat, lng, datacenter, onClose, onClearCache }: Props) {
  // font-sans (Inter) is declared on the container; all children inherit it
  const [activeTab, setActiveTab] = useState<TabId>(datacenter ? "datacenter" : "wind");
  const [showGuide, setShowGuide] = useState(false);

  const windData = analysis.wind ?? {};
  const solarData = analysis.solar ?? {};
  const waterData = analysis.water ?? {};

  // Live hub values come pre-scaled in m/s from Open-Meteo
  const ws80  = live.wind_speed_80m;
  const ws120 = live.wind_speed_120m;
  const ws180 = live.wind_speed_180m;
  const wd80  = live.wind_direction_80m;
  const wd120 = live.wind_direction_120m;
  const wd180 = live.wind_direction_180m;

  // Extended accessors for nested backend fields (all optional)
  const wd = windData as Record<string, unknown>;
  const sd = solarData as Record<string, unknown>;
  const wtd = waterData as Record<string, unknown>;

  const get = (obj: Record<string, unknown>, ...keys: string[]): unknown => {
    let cur: unknown = obj;
    for (const k of keys) {
      if (cur === null || cur === undefined || typeof cur !== "object") return undefined;
      cur = (cur as Record<string, unknown>)[k];
    }
    return cur;
  };
  const num = (v: unknown, fallback = 0): number => (typeof v === "number" ? v : fallback);
  const str = (v: unknown, fallback = "—"): string => (v !== undefined && v !== null ? String(v) : fallback);

  // Monthly solar chart data
  const monthlyVals: number[] = Array.isArray(get(sd, "monthly", "values"))
    ? (get(sd, "monthly", "values") as number[])
    : Array.isArray(get(sd, "monthly")) ? (get(sd, "monthly") as number[]) : [];
  const monthlySolarData = monthlyVals.map((v, i) => ({ month: monthNames[i] ?? "", pvout: v }));

  // Vertical wind profile data
  const profileHeights = Array.isArray(get(wd, "profile", "heights")) ? (get(wd, "profile", "heights") as number[]) : [];
  const profileSpeeds  = Array.isArray(get(wd, "profile", "speeds"))  ? (get(wd, "profile", "speeds")  as number[]) : [];
  const profileDens    = Array.isArray(get(wd, "profile", "densities")) ? (get(wd, "profile", "densities") as number[]) : [];
  const profileAD      = Array.isArray(get(wd, "profile", "air_density")) ? (get(wd, "profile", "air_density") as number[]) : [];
  const profileData = profileHeights.map((h, i) => ({
    height: `${h}m`,
    speed:  profileSpeeds[i] ?? 0,
    power:  profileDens[i] ?? 0,
    ad:     profileAD[i] ?? 0,
  }));

  const shearExp = num(get(wd, "physics", "shear_alpha"), 0.143);

  // ── Solar extended fields (populated from GeoJSON or PVGIS fallback) ────────
  const atmosphericData  = (get(sd, "atmospheric")  ?? {}) as Record<string, unknown>;
  const solarTerrainData = (get(sd, "terrain")      ?? {}) as Record<string, unknown>;
  const validationData   = (get(sd, "validation")   ?? {}) as Record<string, unknown>;

  const cloudPct      = num(atmosphericData["cloud_pct"]);
  const clearDays     = num(atmosphericData["clear_days_yr"]);
  const cloudLabel    = str(atmosphericData["cloud_label"]);
  const aod           = num(atmosphericData["aod"]);
  const aodLabel      = str(atmosphericData["aod_label"]);
  const transmittance = num(atmosphericData["transmittance"]);

  const solarElevM     = num(solarTerrainData["elevation_m"]);
  const solarSlopeDeg  = num(solarTerrainData["slope_deg"]);
  const solarAspectDeg = num(solarTerrainData["aspect_deg"]);
  const optimalTilt    = num(get(sd, "core", "optimal_tilt"));
  const avgTemp        = num(get(sd, "core", "avg_temp"));

  const agreementPct = num(validationData["agreement_pct"]);
  const era5Diff     = num(validationData["era5_ghi_diff_pct"]);
  const era5GhiDay   = num(validationData["era5_ghi_day"]);
  const gsaGhiDay    = num(validationData["gsa_ghi_day"]);

  const monthlyBest      = str(get(sd, "monthly", "best_month"));
  const monthlyWorst     = str(get(sd, "monthly", "worst_month"));
  const monthlyBestVal   = num(get(sd, "monthly", "best_val"));
  const monthlyWorstVal  = num(get(sd, "monthly", "worst_val"));
  const monthlyStability = str(get(sd, "monthly", "stability"));

  // ── Water extended fields ─────────────────────────────────────────────────
  const precipData     = (get(wtd, "precipitation")      ?? {}) as Record<string, unknown>;
  const terraclimate   = (get(wtd, "terraclimate")       ?? {}) as Record<string, unknown>;
  const modisEtData    = (get(wtd, "modis_et")           ?? {}) as Record<string, unknown>;
  const soilMData      = (get(wtd, "soil_moisture")      ?? {}) as Record<string, unknown>;
  const ndwiData       = (get(wtd, "ndwi_landsat9")      ?? {}) as Record<string, unknown>;
  const surfaceWater   = (get(wtd, "surface_water")      ?? {}) as Record<string, unknown>;
  const gwGrace        = (get(wtd, "groundwater_grace")  ?? {}) as Record<string, unknown>;

  const precipDaily  = num(precipData["daily_mm"]);
  const precipAnnual = num(precipData["annual_mm"]);
  const precipPeriod = str(precipData["period"]);

  const tcSoilMm      = num(terraclimate["soil_moisture_mm"]);
  const tcEtMonth     = num(terraclimate["actual_et_mm_month"]);
  const tcEtAnnual    = num(terraclimate["actual_et_annual_mm"]);
  const tcRunoffMonth = num(terraclimate["runoff_mm_month"]);
  const tcPdsiLabel   = str(terraclimate["pdsi_label"]);

  const modisEtMonth  = num(modisEtData["et_monthly_est"]);
  const modisEtAnnual = num(modisEtData["et_annual_est_mm"]);

  const sm0_1   = num(soilMData["layer_0_10cm"] ?? soilMData["surface_0_1cm"]);
  const smRoot  = num(soilMData["root_zone"]);
  const sm1_3   = num(soilMData["shallow_1_3cm"]);
  const sm3_9   = num(soilMData["mid_3_9cm"]);
  const sm9_27  = num(soilMData["deep_9_27cm"]);

  const ndwiValue  = num(ndwiData["ndwi_value"]);
  const ndwiLabel  = str(ndwiData["ndwi_label"]);
  const ndwiPeriod = str(ndwiData["period"]);
  const ndwiScenes = num(ndwiData["scenes_used"]);

  const swOccurrence  = num(surfaceWater["occurrence_pct"]);
  const swFloodRisk   = str(surfaceWater["flood_risk"]);
  const swSeasonality = num(surfaceWater["seasonality_months"]);

  const gwTrend       = str(gwGrace["trend"]);
  const gwStatusLabel = str(gwGrace["status_label"]);

  const TABS: { id: TabId; icon: React.ReactNode; label: string }[] = [
    ...(datacenter ? [{ id: "datacenter" as TabId, icon: <Server size={13} />, label: "Data Center" }] : []),
    { id: "wind",  icon: <Wind size={13} />,  label: "Wind"      },
    { id: "solar", icon: <Sun size={13} />,   label: "Solar"     },
    { id: "water", icon: <Cloud size={13} />, label: "Hydrology" },
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="absolute inset-0 z-50 overflow-y-auto"
      style={{ background: "#f1f5f9", fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif", color: "#1e293b" }}>

      {/* ── HEADER ── */}
      <nav style={{ position: "sticky", top: 0, background: "#fff", borderBottom: "1px solid #e2e8f0", zIndex: 50, padding: "12px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{ padding: "8px", background: "#1e293b", color: "#fff" }}>
            <Satellite size={18} />
          </div>
          <div>
            <h1 style={{ fontWeight: 700, color: "#0f172a", fontSize: "14px", lineHeight: 1.3 }}>RE Potential Assessment</h1>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "2px" }}>
              <span style={{ fontSize: "11px", color: "#94a3b8", fontFamily: "monospace" }}>{lat.toFixed(4)}°N, {lng.toFixed(4)}°E</span>
              <span style={{ fontSize: "11px", color: "#64748b", fontWeight: 600 }}>· Site Intelligence</span>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", background: "#f1f5f9", border: "1px solid #e2e8f0", padding: "3px", flexWrap: "wrap", gap: "2px" }}>
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              style={{
                display: "flex", alignItems: "center", gap: "6px", padding: "7px 14px",
                fontWeight: 600, fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.04em",
                border: "none", cursor: "pointer", transition: "all 0.15s",
                background: activeTab === tab.id ? "#1e293b" : "transparent",
                color: activeTab === tab.id ? "#fff" : "#64748b",
                fontFamily: "inherit",
              }}>
              {tab.icon}{tab.label}
            </button>
          ))}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <button onClick={() => setShowGuide(!showGuide)}
            style={{ padding: "7px 12px", border: "1px solid #e2e8f0", display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", fontWeight: 600, cursor: "pointer", fontFamily: "inherit", background: showGuide ? "#1e293b" : "#fff", color: showGuide ? "#fff" : "#64748b" }}>
            <BookOpen size={13} />
            <span>Guide</span>
          </button>
          {onClearCache && (
            <button onClick={onClearCache} title="Clear cached analysis"
              style={{ padding: "7px 8px", background: "#fff", border: "1px solid #e2e8f0", cursor: "pointer", color: "#64748b", display: "flex", alignItems: "center" }}>
              <ArrowLeft size={15} />
            </button>
          )}
          <button onClick={onClose} style={{ padding: "7px 8px", background: "#fff", border: "1px solid #e2e8f0", cursor: "pointer", color: "#64748b", display: "flex", alignItems: "center" }}>
            <X size={17} />
          </button>
        </div>
      </nav>

      {/* ── INTELLIGENCE GUIDE PANEL ── */}
      <AnimatePresence>
        {showGuide && (
          <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}
            style={{ position: "fixed", top: "72px", right: "24px", width: "400px", background: "#fff", border: "1px solid #e2e8f0", boxShadow: "0 8px 32px rgba(0,0,0,0.12)", zIndex: 60, overflow: "hidden" }}>
            <div style={{ background: "#1e293b", padding: "20px 24px", color: "#fff" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <BookOpen size={16} />
                <div>
                  <h3 style={{ fontSize: "14px", fontWeight: 700 }}>Intelligence Logic</h3>
                  <p style={{ fontSize: "11px", color: "#94a3b8", marginTop: "2px" }}>How we assess site suitability</p>
                </div>
              </div>
            </div>
            <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: "20px", maxHeight: "60vh", overflowY: "auto" }}>
              {GUIDE_ITEMS.map((item, i) => (
                <div key={i} style={{ display: "flex", gap: "14px" }}>
                  <div style={{ flexShrink: 0, width: "36px", height: "36px", background: "#f8fafc", border: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {item.icon}
                  </div>
                  <div>
                    <h4 style={{ fontSize: "13px", fontWeight: 600, color: "#1e293b" }}>{item.title}</h4>
                    <p style={{ fontSize: "11px", color: "#64748b", lineHeight: 1.5, marginTop: "2px" }}>{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ padding: "12px 24px", background: "#f8fafc", borderTop: "1px solid #e2e8f0", display: "flex", justifyContent: "center" }}>
              <button onClick={() => setShowGuide(false)}
                style={{ padding: "7px 24px", background: "#1e293b", color: "#fff", border: "none", fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", cursor: "pointer", fontFamily: "inherit" }}>
                Close
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <main style={{ maxWidth: "1400px", margin: "0 auto", padding: "32px", display: "flex", flexDirection: "column", gap: "40px" }}>
        <AnimatePresence mode="wait">

          {/* ════ DATA CENTER TAB ════ */}
          {activeTab === "datacenter" && datacenter && (
            <motion.div key="datacenter" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} style={{ display: "flex", flexDirection: "column", gap: "24px" }}>

              {/* Satellite image */}
              <div style={{ position: "relative", overflow: "hidden", height: "200px", background: "#0f172a" }}>
                <img src={`https://services.arcgisonline.com/arcgis/rest/services/World_Imagery/MapServer/export?bbox=${lng - 0.005},${lat - 0.0025},${lng + 0.005},${lat + 0.0025}&bboxSR=4326&imageSR=4326&size=1000,400&format=jpg&f=image`}
                  alt={`Satellite view of ${datacenter.name}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
                  <div style={{ width: "12px", height: "12px", background: "#0f766e", border: "2px solid #fff", boxShadow: "0 0 10px rgba(15,118,110,0.8)" }} />
                </div>
                <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "linear-gradient(to top, rgba(0,0,0,0.6), transparent)", padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                  <div>
                    <div style={{ fontSize: "9px", fontWeight: 700, color: "rgba(255,255,255,0.6)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Satellite View</div>
                    <div style={{ fontSize: "14px", fontWeight: 700, color: "#fff" }}>{str(datacenter.name)}</div>
                  </div>
                  <div style={{ textAlign: "right", fontFamily: "monospace", fontSize: "10px", color: "rgba(255,255,255,0.6)" }}>
                    <div>{lat.toFixed(5)}°N</div>
                    <div>{lng.toFixed(5)}°E</div>
                  </div>
                </div>
              </div>

              {/* Profile header */}
              <div style={{ background: "#fff", border: "1px solid #e2e8f0", padding: "24px", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "24px", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                  <div style={{ width: "64px", height: "64px", background: "#1e293b", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Server size={32} style={{ color: "#fff" }} strokeWidth={1.5} />
                  </div>
                  <div>
                    <div style={{ fontSize: "10px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "4px" }}>Data Center Profile</div>
                    <h2 style={{ fontSize: "18px", fontWeight: 700, color: "#0f172a", lineHeight: 1.2 }}>{str(datacenter.name)}</h2>
                    <div style={{ fontSize: "13px", color: "#475569", marginTop: "4px" }}>{str(datacenter.company)}</div>
                    {datacenter.url && (
                      <a href={String(datacenter.url)} target="_blank" rel="noopener noreferrer"
                        style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "11px", fontWeight: 600, color: "#0f766e", textDecoration: "none", marginTop: "4px" }}>
                        <Globe size={11} />{String(datacenter.url).replace("https://", "")}
                      </a>
                    )}
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                  {[
                    { label: "Power", val: str(datacenter.power_mw, "—"), unit: "MW" },
                    { label: "Tier", val: str(datacenter.tier, "—"), unit: "" },
                    { label: "Whitespace", val: str(datacenter.whitespace, "—"), unit: "" },
                    { label: "Market", val: str(datacenter.market, "—"), unit: "" },
                  ].map(({ label, val, unit }) => (
                    <div key={label} style={{ background: "#f8fafc", border: "1px solid #e2e8f0", padding: "10px 12px" }}>
                      <div style={{ fontSize: "9px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "2px" }}>{label}</div>
                      <div style={{ fontSize: "13px", fontWeight: 700, color: "#1e293b" }}>{val}{unit ? ` ${unit}` : ""}</div>
                    </div>
                  ))}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <div style={{ fontSize: "10px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "4px" }}>Site Intelligence</div>
                  {(["wind", "solar", "water"] as TabId[]).map(id => (
                    <button key={id} onClick={() => setActiveTab(id)}
                      style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 14px", background: "#f8fafc", border: "1px solid #e2e8f0", fontSize: "11px", fontWeight: 600, color: "#334155", textTransform: "uppercase", letterSpacing: "0.04em", cursor: "pointer", fontFamily: "inherit" }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = "#1e293b"; e.currentTarget.style.color = "#fff"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "#f8fafc"; e.currentTarget.style.color = "#334155"; }}>
                      {id === "wind" && <Wind size={13} />}{id === "solar" && <Sun size={13} />}{id === "water" && <Cloud size={13} />}
                      {id === "water" ? "Hydrology" : id}
                    </button>
                  ))}
                </div>
              </div>

              {/* Location + Infrastructure */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                <div style={{ background: "#fff", border: "1px solid #e2e8f0", padding: "24px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
                    <MapPin size={15} style={{ color: "#475569" }} />
                    <h3 style={{ fontSize: "13px", fontWeight: 700, color: "#0f172a" }}>Physical Location</h3>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    <div style={{ padding: "10px 12px", background: "#f8fafc", border: "1px solid #e2e8f0" }}>
                      <div style={{ fontSize: "9px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "2px" }}>Street Address</div>
                      <div style={{ fontSize: "12px", fontWeight: 600, color: "#334155" }}>{str(datacenter.address)}</div>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
                      {[["City", datacenter.city], ["State", datacenter.state], ["Postal", datacenter.postal]].map(([l, v]) => (
                        <div key={String(l)} style={{ padding: "10px 8px", background: "#f8fafc", border: "1px solid #e2e8f0", textAlign: "center" }}>
                          <div style={{ fontSize: "9px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", marginBottom: "2px" }}>{String(l)}</div>
                          <div style={{ fontSize: "12px", fontWeight: 600, color: "#334155" }}>{str(v)}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{ padding: "10px 12px", background: "#1e293b" }}>
                      <div style={{ fontSize: "9px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "2px" }}>GPS Coordinates</div>
                      <div style={{ fontFamily: "monospace", fontSize: "12px", fontWeight: 700, color: "#5eead4" }}>{lat.toFixed(6)}°N, {lng.toFixed(6)}°E</div>
                    </div>
                  </div>
                </div>
                <div style={{ background: "#fff", border: "1px solid #e2e8f0", padding: "24px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
                    <Cpu size={15} style={{ color: "#475569" }} />
                    <h3 style={{ fontSize: "13px", fontWeight: 700, color: "#0f172a" }}>Infrastructure Specs</h3>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    {[
                      { label: "Tier Classification", val: str(datacenter.tier, "Not Specified") },
                      { label: "Power Capacity",      val: datacenter.power_mw ? `${String(datacenter.power_mw)} MW` : "Not Specified" },
                      { label: "Whitespace",          val: str(datacenter.whitespace, "Not Specified") },
                      { label: "Market",              val: str(datacenter.market,     "Not Specified") },
                      { label: "Country",             val: str(datacenter.country,    "India") },
                    ].map(({ label, val }) => (
                      <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", background: "#f8fafc", border: "1px solid #e2e8f0" }}>
                        <div style={{ fontSize: "11px", fontWeight: 600, color: "#64748b" }}>{label}</div>
                        <div style={{ fontSize: "12px", fontWeight: 700, color: "#1e293b" }}>{val}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* ════ WIND TAB ════ */}
          {activeTab === "wind" && (
            <motion.div key="wind" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} style={{ display: "flex", flexDirection: "column", gap: "24px" }}>

              {/* Hero banner */}
              <div style={{ background: "#fff", border: "1px solid #e2e8f0", display: "grid", gridTemplateColumns: "1fr 1fr 1fr" }}>

                {/* Score arc */}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "32px 24px", borderRight: "1px solid #e2e8f0" }}>
                  <div style={{ fontSize: "9px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.2em", marginBottom: "20px" }}>Wind Viability Index</div>
                  <div style={{ position: "relative", width: "160px", height: "160px" }}>
                    <svg viewBox="0 0 200 200" style={{ width: "100%", height: "100%", transform: "rotate(-90deg)" }}>
                      <circle cx="100" cy="100" r="80" fill="none" stroke="#f1f5f9" strokeWidth="14" strokeDasharray="400 502" strokeLinecap="round" />
                      <motion.circle cx="100" cy="100" r="80" fill="none" stroke="#1e293b" strokeWidth="14" strokeLinecap="round" strokeDasharray="502" strokeDashoffset="502"
                        animate={{ strokeDashoffset: 502 - (num(windData.score) / 100) * 400 }} transition={{ duration: 1.5, ease: "easeOut" }} />
                    </svg>
                    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                      <div style={{ fontSize: "40px", fontWeight: 800, color: "#0f172a", lineHeight: 1 }}>{str(windData.score)}</div>
                      <div style={{ fontSize: "9px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.1em", marginTop: "4px" }}>{str(get(wd, "resource", "label"))}</div>
                    </div>
                  </div>
                  <div style={{ marginTop: "10px", fontSize: "9px", color: "#94a3b8", fontWeight: 600 }}>/ 100 composite score</div>
                </div>

                {/* Grade + turbine icon */}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "32px 24px", borderRight: "1px solid #e2e8f0" }}>
                  <svg width="70" height="90" viewBox="0 0 100 120" style={{ marginBottom: "16px" }}>
                    <polygon points="48,120 52,120 53,60 47,60" fill="#cbd5e1" />
                    <circle cx="50" cy="58" r="5" fill="#94a3b8" />
                    <motion.g style={{ originX: "50px", originY: "58px" }} animate={{ rotate: 360 }} transition={{ duration: 4, repeat: Infinity, ease: "linear" }}>
                      <ellipse cx="50" cy="30" rx="3.5" ry="28" fill="#334155" opacity="0.9" />
                      <ellipse cx="50" cy="30" rx="3.5" ry="28" fill="#334155" opacity="0.9" transform="rotate(120 50 58)" />
                      <ellipse cx="50" cy="30" rx="3.5" ry="28" fill="#334155" opacity="0.9" transform="rotate(240 50 58)" />
                    </motion.g>
                  </svg>
                  <div style={{ fontSize: "9px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "6px" }}>Resource Grade</div>
                  <div style={{ fontSize: "64px", fontWeight: 800, color: "#0f172a", lineHeight: 1 }}>{str(get(wd, "resource", "grade"))}</div>
                  <div style={{ fontSize: "11px", color: "#64748b", fontWeight: 600, textTransform: "uppercase", marginTop: "8px", letterSpacing: "0.08em" }}>{str(get(wd, "resource", "label"))}</div>
                </div>

                {/* Key metrics */}
                <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", padding: "32px 24px", gap: "16px" }}>
                  <div style={{ fontSize: "9px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "4px" }}>Key Metrics · 100m AGL</div>
                  {[
                    { label: "Wind Speed",    value: `${str(get(wd, "resource", "wind_speed"))} m/s`,   bar: num(get(wd, "resource", "wind_speed")) / 15 },
                    { label: "Power Density", value: `${str(get(wd, "resource", "power_density"))} W/m²`, bar: num(get(wd, "resource", "power_density")) / 800 },
                    { label: "Air Density",   value: `${str(get(wd, "resource", "air_density"))} kg/m³`,  bar: num(get(wd, "resource", "air_density"), 1.0) / 1.3 },
                  ].map(({ label, value, bar }) => (
                    <div key={label}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "6px" }}>
                        <span style={{ fontSize: "10px", fontWeight: 600, color: "#64748b", textTransform: "uppercase" }}>{label}</span>
                        <span style={{ fontSize: "13px", fontWeight: 700, color: "#0f172a" }}>{value}</span>
                      </div>
                      <div style={{ height: "4px", background: "#f1f5f9", overflow: "hidden" }}>
                        <motion.div style={{ height: "100%", background: "#1e293b" }}
                          initial={{ width: 0 }} animate={{ width: `${Math.min(bar * 100, 100)}%` }}
                          transition={{ duration: 1.2, delay: 0.2 }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Live hub heights */}
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
                  <TrendingUp size={15} style={{ color: "#475569" }} />
                  <div>
                    <div style={{ fontSize: "13px", fontWeight: 700, color: "#0f172a" }}>Live Atmospheric Telemetry</div>
                    <div style={{ fontSize: "11px", color: "#94a3b8" }}>Open-Meteo · Real-time multi-height readings</div>
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
                  {[
                    { label: "High Hub",     height: "180m", speed: ws180.toFixed(2), dir: wd180 },
                    { label: "Primary Hub",  height: "120m", speed: ws120.toFixed(2), dir: wd120, main: true },
                    { label: "Standard Hub", height: "80m",  speed: ws80.toFixed(2),  dir: wd80  },
                  ].map(({ label, height, speed, dir, main }) => (
                    <div key={height} style={{ background: "#fff", border: main ? "2px solid #1e293b" : "1px solid #e2e8f0", padding: "20px" }}>
                      {main && <div style={{ fontSize: "9px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "8px" }}>Rated Hub</div>}
                      <div style={{ fontSize: "9px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.1em" }}>{label}</div>
                      <div style={{ fontSize: "11px", color: "#94a3b8", marginBottom: "12px" }}>{height} AGL</div>
                      <div style={{ fontSize: "48px", fontWeight: 800, color: "#0f172a", lineHeight: 1 }}>{speed}</div>
                      <div style={{ fontSize: "11px", color: "#94a3b8", marginBottom: "12px" }}>m/s</div>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <div style={{ position: "relative", width: "36px", height: "36px", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid #e2e8f0" }}>
                          <motion.div animate={{ rotate: dir }} transition={{ type: "spring", stiffness: 60 }}
                            style={{ width: "2px", height: "14px", background: "#1e293b", transformOrigin: "bottom center", position: "absolute", top: "4px", left: "calc(50% - 1px)" }} />
                          <div style={{ width: "5px", height: "5px", background: "#1e293b" }} />
                        </div>
                        <div>
                          <div style={{ fontSize: "9px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase" }}>Direction</div>
                          <div style={{ fontSize: "12px", fontWeight: 700, color: "#1e293b" }}>{getCardinal(dir)}</div>
                          <div style={{ fontSize: "10px", color: "#94a3b8" }}>{dir}°</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Vertical profile chart */}
              {profileData.length > 0 && (
                <div style={{ background: "#fff", border: "1px solid #e2e8f0", overflow: "hidden" }}>
                  <div style={{ padding: "20px 24px 8px" }}>
                    <div style={{ fontSize: "13px", fontWeight: 700, color: "#0f172a" }}>Vertical Wind Profile</div>
                    <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "2px" }}>GWA v3 · 10m–200m AGL</div>
                  </div>
                  <div style={{ padding: "0 16px 16px", height: "280px" }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={profileData} margin={{ top: 10, right: 50, left: 0, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="height" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: "#94a3b8" }} />
                        <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: "#94a3b8" }} width={40} />
                        <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: "#64748b" }} domain={[1.0, 1.3]} width={45} />
                        <Tooltip contentStyle={{ border: "1px solid #e2e8f0", padding: "12px", fontSize: 11 }} />
                        <Area yAxisId="left" type="monotone" dataKey="speed" name="Speed (m/s)" fill="#334155" fillOpacity={0.06} stroke="#334155" strokeWidth={2.5} />
                        <Line yAxisId="left" type="monotone" dataKey="power" name="Power (W/m²)" stroke="#475569" strokeWidth={2} strokeDasharray="4 2" dot={{ r: 4 }} />
                        <Line yAxisId="right" type="monotone" dataKey="ad" name="Air Density (kg/m³)" stroke="#94a3b8" strokeWidth={1.5} strokeDasharray="6 3" dot={{ r: 3 }} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", borderTop: "1px solid #e2e8f0" }}>
                    {[
                      { label: "Shear α", value: shearExp.toFixed(3), sub: "Hellmann exponent" },
                      { label: "Shear Ratio", value: str(get(wd, "physics", "shear_ratio")), sub: "ws100/ws10" },
                      { label: "RIX", value: str(get(wd, "feasibility", "rix")), sub: "Ruggedness τ" },
                      { label: "Elevation", value: `${str(get(wd, "feasibility", "elevation"))}m`, sub: `Slope ${str(get(wd, "feasibility", "slope"))}°` },
                    ].map((p, i) => (
                      <div key={p.label} style={{ padding: "16px", textAlign: "center", borderRight: i < 3 ? "1px solid #e2e8f0" : "none" }}>
                        <div style={{ fontSize: "10px", fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "4px" }}>{p.label}</div>
                        <div style={{ fontSize: "18px", fontWeight: 700, color: "#1e293b" }}>{p.value}</div>
                        <div style={{ fontSize: "10px", color: "#94a3b8", marginTop: "2px" }}>{p.sub}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* IEC Capacity Factors */}
              <div style={{ display: "grid", gridTemplateColumns: "3fr 2fr", gap: "16px" }}>
                <div style={{ background: "#fff", border: "1px solid #e2e8f0", padding: "24px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
                    <Zap size={14} style={{ color: "#475569" }} />
                    <div>
                      <div style={{ fontSize: "13px", fontWeight: 700, color: "#0f172a" }}>IEC Turbine Capacity Factors</div>
                      <div style={{ fontSize: "11px", color: "#94a3b8" }}>GWA v3 · site-specific CF per turbine class</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                    {[
                      { cls: "IEC Class 1", sub: "High Wind >7.5 m/s",      value: num(get(wd, "turbine", "cf_iec1")) },
                      { cls: "IEC Class 2", sub: "Medium Wind 6.5–7.5 m/s", value: num(get(wd, "turbine", "cf_iec2")) },
                      { cls: "IEC Class 3", sub: "Low Wind 5.0–6.5 m/s",    value: num(get(wd, "turbine", "cf_iec3")) },
                    ].map(({ cls, sub, value }) => (
                      <div key={cls}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "8px" }}>
                          <div>
                            <div style={{ fontSize: "11px", fontWeight: 700, color: "#1e293b", textTransform: "uppercase" }}>{cls}</div>
                            <div style={{ fontSize: "10px", color: "#94a3b8", marginTop: "2px" }}>{sub}</div>
                          </div>
                          <div style={{ fontSize: "24px", fontWeight: 800, color: "#1e293b" }}>{value > 0 ? `${(value * 100).toFixed(1)}%` : "—"}</div>
                        </div>
                        <div style={{ height: "6px", background: "#f1f5f9", overflow: "hidden" }}>
                          <motion.div style={{ height: "100%", background: "#1e293b" }}
                            initial={{ width: 0 }} animate={{ width: `${Math.min(value * 100, 100)}%` }}
                            transition={{ duration: 1.1, ease: "easeOut", delay: 0.15 }} />
                        </div>
                      </div>
                    ))}
                  </div>
                  <div style={{ marginTop: "20px", paddingTop: "16px", borderTop: "1px solid #e2e8f0", fontSize: "11px", color: "#64748b" }}>
                    <span style={{ fontWeight: 700, color: "#0f172a" }}>Recommended: </span>{str(get(wd, "turbine", "best_fit"))}
                  </div>
                </div>
                <div style={{ background: "#fff", border: "1px solid #e2e8f0", padding: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>
                  <div style={{ fontSize: "9px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em" }}>Site Feasibility</div>
                  <div>
                    <div style={{ fontSize: "11px", fontWeight: 600, color: "#64748b", marginBottom: "4px" }}>Elevation</div>
                    <div style={{ fontSize: "32px", fontWeight: 800, color: "#0f172a" }}>{str(get(wd, "terrain", "elevation"), "—")}</div>
                    <div style={{ fontSize: "12px", color: "#94a3b8" }}>metres</div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", borderTop: "1px solid #e2e8f0", paddingTop: "16px" }}>
                    {[
                      { label: "Status", val: str(get(wd, "feasibility", "status")) },
                      { label: "Slope",  val: `${str(get(wd, "feasibility", "slope"))}°` },
                      { label: "RIX",    val: str(get(wd, "feasibility", "rix")) },
                      { label: "Best Fit", val: str(get(wd, "turbine", "best_fit")).replace("IEC Class ", "C") },
                    ].map(({ label, val }) => (
                      <div key={label} style={{ padding: "10px", background: "#f8fafc", border: "1px solid #e2e8f0" }}>
                        <div style={{ fontSize: "9px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase" }}>{label}</div>
                        <div style={{ fontSize: "13px", fontWeight: 700, color: "#1e293b", marginTop: "2px" }}>{val}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* ════ SOLAR TAB ════ */}
          {activeTab === "solar" && (
            <motion.div key="solar" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} style={{ display: "flex", flexDirection: "column", gap: "24px" }}>

              {/* Hero banner */}
              <div style={{ background: "#fff", border: "1px solid #e2e8f0", display: "grid", gridTemplateColumns: "1fr 1fr 1fr" }}>

                {/* Score arc */}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "32px 24px", borderRight: "1px solid #e2e8f0" }}>
                  <div style={{ fontSize: "9px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.2em", marginBottom: "20px" }}>Solar Viability Index</div>
                  <div style={{ position: "relative", width: "160px", height: "160px" }}>
                    <svg viewBox="0 0 200 200" style={{ width: "100%", height: "100%", transform: "rotate(-90deg)" }}>
                      <circle cx="100" cy="100" r="80" fill="none" stroke="#f1f5f9" strokeWidth="14" strokeDasharray="400 502" strokeLinecap="round" />
                      <motion.circle cx="100" cy="100" r="80" fill="none" stroke="#1e293b" strokeWidth="14" strokeLinecap="round" strokeDasharray="502" strokeDashoffset="502"
                        animate={{ strokeDashoffset: 502 - (num(solarData.score) / 100) * 400 }}
                        transition={{ duration: 1.5, ease: "easeOut" }} />
                    </svg>
                    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                      <div style={{ fontSize: "40px", fontWeight: 800, color: "#0f172a", lineHeight: 1 }}>{str(solarData.score)}</div>
                      <div style={{ fontSize: "9px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.1em", marginTop: "4px" }}>{str(get(sd, "resource", "grade"))}</div>
                    </div>
                  </div>
                  <div style={{ marginTop: "10px", fontSize: "9px", color: "#94a3b8", fontWeight: 600 }}>/ 100 composite score</div>
                </div>

                {/* GHI + icon */}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "32px 24px", borderRight: "1px solid #e2e8f0" }}>
                  <motion.svg width="70" height="70" viewBox="0 0 100 100" style={{ marginBottom: "16px" }}
                    animate={{ rotate: 360 }} transition={{ duration: 20, repeat: Infinity, ease: "linear" }}>
                    {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map(angle => (
                      <line key={angle}
                        x1={50 + 30 * Math.cos(angle * Math.PI / 180)} y1={50 + 30 * Math.sin(angle * Math.PI / 180)}
                        x2={50 + 42 * Math.cos(angle * Math.PI / 180)} y2={50 + 42 * Math.sin(angle * Math.PI / 180)}
                        stroke="#94a3b8" strokeWidth="3" strokeLinecap="round" opacity="0.8" />
                    ))}
                    <circle cx="50" cy="50" r="22" fill="#475569" />
                    <circle cx="50" cy="50" r="16" fill="#64748b" />
                  </motion.svg>
                  <div style={{ fontSize: "9px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "6px" }}>GHI</div>
                  <div style={{ fontSize: "56px", fontWeight: 800, color: "#0f172a", lineHeight: 1 }}>
                    {str(get(sd, "resource", "ghi"))}
                  </div>
                  <div style={{ fontSize: "11px", color: "#94a3b8", fontWeight: 600, marginTop: "6px" }}>kWh / m² / year</div>
                </div>

                {/* Key metrics */}
                <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", padding: "32px 24px", gap: "16px" }}>
                  <div style={{ fontSize: "9px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "4px" }}>Key Metrics · GSA Long-term</div>
                  {[
                    { label: "GHI",   value: `${str(get(sd, "resource", "ghi"))} kWh/m²/yr`,   bar: num(get(sd, "resource", "ghi")) / 2500 },
                    { label: "DNI",   value: `${str(get(sd, "resource", "dni"))} kWh/m²/yr`,   bar: num(get(sd, "resource", "dni")) / 2500 },
                    { label: "PVOUT", value: `${str(get(sd, "resource", "pvout"))} kWh/kWp/yr`, bar: num(get(sd, "resource", "pvout")) / 2000 },
                    { label: "LTDI",  value: str(get(sd, "resource", "ltdi")),                  bar: num(get(sd, "resource", "ltdi")) },
                  ].map(({ label, value, bar }) => (
                    <div key={label}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "6px" }}>
                        <span style={{ fontSize: "10px", fontWeight: 600, color: "#64748b", textTransform: "uppercase" }}>{label}</span>
                        <span style={{ fontSize: "13px", fontWeight: 700, color: "#0f172a" }}>{value}</span>
                      </div>
                      <div style={{ height: "4px", background: "#f1f5f9", overflow: "hidden" }}>
                        <motion.div style={{ height: "100%", background: "#1e293b" }}
                          initial={{ width: 0 }} animate={{ width: `${Math.min(bar * 100, 100)}%` }}
                          transition={{ duration: 1.2, delay: 0.2 }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Monthly bar chart */}
              <div style={{ background: "#fff", border: "1px solid #e2e8f0", overflow: "hidden" }}>
                <div style={{ padding: "20px 24px 8px" }}>
                  <div style={{ fontSize: "13px", fontWeight: 700, color: "#0f172a" }}>Monthly Generation Profile</div>
                  <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "2px" }}>GSA Long-Term Climatology · kWh / kWp per month</div>
                </div>
                {monthlySolarData.length > 0 ? (
                  <div style={{ padding: "0 16px 16px", height: "220px" }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={monthlySolarData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: "#94a3b8" }} />
                        <YAxis hide />
                        <Tooltip contentStyle={{ border: "1px solid #e2e8f0", padding: "10px 14px", fontSize: 11 }} />
                        <Bar dataKey="pvout" name="PV Output">
                          {monthlySolarData.map((_, i) => <Cell key={i} fill={i % 2 === 0 ? "#334155" : "#64748b"} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div style={{ padding: "16px 24px", fontSize: "12px", color: "#94a3b8" }}>No monthly data available for this location.</div>
                )}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", borderTop: "1px solid #e2e8f0" }}>
                  {[
                    { label: "GHI",   value: str(get(sd, "resource", "ghi")),   unit: "kWh/m²/yr"  },
                    { label: "PVOUT", value: str(get(sd, "resource", "pvout")),  unit: "kWh/kWp/yr" },
                    { label: "DNI",   value: str(get(sd, "resource", "dni")),    unit: "kWh/m²/yr"  },
                    { label: "Grade", value: str(get(sd, "resource", "grade")),  unit: str(get(sd, "resource", "label")) },
                  ].map((p, i) => (
                    <div key={p.label} style={{ padding: "16px", textAlign: "center", borderRight: i < 3 ? "1px solid #e2e8f0" : "none" }}>
                      <div style={{ fontSize: "10px", fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "4px" }}>{p.label}</div>
                      <div style={{ fontSize: "18px", fontWeight: 700, color: "#1e293b" }}>{p.value}</div>
                      <div style={{ fontSize: "10px", color: "#94a3b8", marginTop: "2px" }}>{p.unit}</div>
                    </div>
                  ))}
                </div>
                {(monthlyBest !== "—" || monthlyWorst !== "—") && (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", borderTop: "1px solid #e2e8f0" }}>
                    {[
                      { lbl: "Best Month",  val: `${monthlyBest} · ${monthlyBestVal.toFixed(2)} kWh/m²` },
                      { lbl: "Worst Month", val: `${monthlyWorst} · ${monthlyWorstVal.toFixed(2)} kWh/m²` },
                      { lbl: "Stability",   val: monthlyStability },
                    ].map((item, i) => (
                      <div key={item.lbl} style={{ padding: "12px 16px", textAlign: "center", borderRight: i < 2 ? "1px solid #e2e8f0" : "none" }}>
                        <div style={{ fontSize: "9px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "4px" }}>{item.lbl}</div>
                        <div style={{ fontSize: "12px", fontWeight: 700, color: "#1e293b" }}>{item.val}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Sky Quality Index */}
              <div style={{ background: "#fff", border: "1px solid #e2e8f0", padding: "24px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
                  <Sun size={14} style={{ color: "#475569" }} />
                  <div>
                    <div style={{ fontSize: "13px", fontWeight: 700, color: "#0f172a" }}>Sky Quality Index</div>
                    <div style={{ fontSize: "11px", color: "#94a3b8" }}>Cloud cover · Aerosol · Atmospheric transmittance</div>
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px", marginBottom: "16px" }}>
                  {[
                    { label: "Cloud Cover",   value: cloudPct > 0 ? `${cloudPct.toFixed(1)}%` : "—",      sub: cloudLabel },
                    { label: "Clear Days/yr", value: clearDays > 0 ? String(Math.round(clearDays)) : "—",  sub: "annual clear-sky days" },
                    { label: "Transmittance", value: transmittance > 0 ? transmittance.toFixed(3) : "—",   sub: "atmospheric clarity" },
                    { label: "AOD",           value: aod > 0 ? aod.toFixed(4) : "—",                       sub: aodLabel },
                    { label: "Avg Temp",      value: avgTemp !== 0 ? `${avgTemp.toFixed(1)}°C` : "—",      sub: "site temperature" },
                    { label: "Sky Class",     value: cloudPct > 70 ? "Overcast" : cloudPct > 40 ? "Partly Cloudy" : cloudPct > 20 ? "Mostly Clear" : "Clear", sub: "daytime sky condition" },
                  ].map(({ label, value, sub }) => (
                    <div key={label} style={{ background: "#f8fafc", border: "1px solid #e2e8f0", padding: "12px" }}>
                      <div style={{ fontSize: "9px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "4px" }}>{label}</div>
                      <div style={{ fontSize: "18px", fontWeight: 700, color: "#1e293b" }}>{value}</div>
                      <div style={{ fontSize: "10px", color: "#94a3b8", marginTop: "2px" }}>{sub}</div>
                    </div>
                  ))}
                </div>
                {cloudPct > 0 && (
                  <div>
                    <div style={{ fontSize: "9px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "6px" }}>Cloud Cover</div>
                    <div style={{ height: "6px", background: "#f1f5f9", overflow: "hidden" }}>
                      <motion.div style={{ height: "100%", background: "#64748b" }}
                        initial={{ width: 0 }} animate={{ width: `${Math.min(cloudPct, 100)}%` }}
                        transition={{ duration: 1.1, ease: "easeOut" }} />
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", color: "#94a3b8", marginTop: "4px" }}>
                      <span>Clear sky</span><span>{cloudPct.toFixed(1)}% overcast</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Site Terrain + Data Validation */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                <div style={{ background: "#fff", border: "1px solid #e2e8f0", padding: "24px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
                    <Globe size={14} style={{ color: "#475569" }} />
                    <div>
                      <div style={{ fontSize: "13px", fontWeight: 700, color: "#0f172a" }}>Site Terrain</div>
                      <div style={{ fontSize: "11px", color: "#94a3b8" }}>Elevation · Slope · Aspect · Optimal tilt</div>
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                    {[
                      { label: "Elevation",    value: solarElevM > 0 ? `${solarElevM.toFixed(0)} m` : "—",       sub: "above mean sea level" },
                      { label: "Slope",        value: solarSlopeDeg > 0 ? `${solarSlopeDeg.toFixed(1)}°` : "—",  sub: "terrain incline" },
                      { label: "Aspect",       value: solarAspectDeg > 0 ? `${solarAspectDeg.toFixed(1)}°` : "—", sub: "surface direction" },
                      { label: "Optimal Tilt", value: optimalTilt > 0 ? `${optimalTilt.toFixed(1)}°` : "—",      sub: "for max annual yield" },
                    ].map(({ label, value, sub }) => (
                      <div key={label} style={{ background: "#f8fafc", border: "1px solid #e2e8f0", padding: "12px", textAlign: "center" }}>
                        <div style={{ fontSize: "9px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "4px" }}>{label}</div>
                        <div style={{ fontSize: "20px", fontWeight: 700, color: "#1e293b" }}>{value}</div>
                        <div style={{ fontSize: "10px", color: "#94a3b8", marginTop: "2px" }}>{sub}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ background: "#fff", border: "1px solid #e2e8f0", padding: "24px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
                    <ShieldCheck size={14} style={{ color: "#475569" }} />
                    <div>
                      <div style={{ fontSize: "13px", fontWeight: 700, color: "#0f172a" }}>Data Validation</div>
                      <div style={{ fontSize: "11px", color: "#94a3b8" }}>Cross-source agreement · ERA5 vs GSA</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "16px" }}>
                    {[
                      { label: "GSA GHI (daily)",  value: gsaGhiDay > 0 ? `${gsaGhiDay.toFixed(2)} kWh/m²/day` : "—" },
                      { label: "ERA5 GHI (daily)", value: era5GhiDay > 0 ? `${era5GhiDay.toFixed(2)} kWh/m²/day` : "—" },
                      { label: "ERA5 Deviation",   value: era5Diff > 0 ? `${era5Diff.toFixed(1)}%` : "—" },
                    ].map(({ label, value }) => (
                      <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", background: "#f8fafc", border: "1px solid #e2e8f0" }}>
                        <span style={{ fontSize: "11px", fontWeight: 600, color: "#64748b" }}>{label}</span>
                        <span style={{ fontSize: "12px", fontWeight: 700, color: "#1e293b" }}>{value}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", padding: "16px", textAlign: "center" }}>
                    <div style={{ fontSize: "9px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "6px" }}>Data Agreement</div>
                    <div style={{ fontSize: "36px", fontWeight: 800, color: "#1e293b" }}>
                      {agreementPct > 0 ? `${agreementPct.toFixed(1)}%` : "—"}
                    </div>
                    <div style={{ fontSize: "11px", color: "#64748b", marginTop: "4px" }}>
                      {agreementPct > 90 ? "Excellent cross-source agreement" : agreementPct > 80 ? "Good agreement" : "Moderate variance"}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* ════ WATER / HYDROLOGY TAB ════ */}
          {activeTab === "water" && (
            <motion.div key="water" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} style={{ display: "flex", flexDirection: "column", gap: "24px" }}>

              {/* Hero banner */}
              <div style={{ background: "#fff", border: "1px solid #e2e8f0", display: "grid", gridTemplateColumns: "1fr 1fr 1fr" }}>
                {/* Supply index */}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "32px 24px", borderRight: "1px solid #e2e8f0" }}>
                  <div style={{ fontSize: "9px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.2em", marginBottom: "20px" }}>Hydrology Index</div>
                  {(() => {
                    const score = num(waterData.composite_risk_score);
                    const pct = Math.min(score / 100, 1);
                    const r = 52; const circ = Math.PI * r;
                    const dash = pct * circ;
                    return (
                      <div style={{ position: "relative", width: "160px", height: "85px", display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
                        <svg viewBox="0 0 120 65" style={{ width: "100%" }}>
                          <path d="M10 60 A52 52 0 0 1 110 60" fill="none" stroke="#f1f5f9" strokeWidth="10" strokeLinecap="round" />
                          <motion.path d="M10 60 A52 52 0 0 1 110 60" fill="none" stroke="#1e293b" strokeWidth="10" strokeLinecap="round"
                            strokeDasharray={`${dash} ${circ}`}
                            initial={{ strokeDasharray: `0 ${circ}` }}
                            animate={{ strokeDasharray: `${dash} ${circ}` }}
                            transition={{ duration: 1.4, ease: "easeOut" }} />
                        </svg>
                        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", paddingBottom: "4px" }}>
                          <div style={{ fontSize: "32px", fontWeight: 800, color: "#0f172a", lineHeight: 1 }}>{score}</div>
                          <div style={{ fontSize: "9px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.1em", marginTop: "2px" }}>Supply Index</div>
                        </div>
                      </div>
                    );
                  })()}
                  <div style={{ marginTop: "16px", fontSize: "11px", fontWeight: 700, color: "#1e293b", border: "1px solid #e2e8f0", padding: "6px 16px", textAlign: "center" }}>
                    {str(waterData.interpretation)}
                  </div>
                </div>

                {/* Metric bars */}
                <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", padding: "32px 24px", gap: "16px", borderRight: "1px solid #e2e8f0" }}>
                  <div style={{ fontSize: "10px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.1em" }}>Hydrology Fingerprint</div>
                  {[
                    { label: "GRACE Anomaly", val: Math.abs(num(waterData.grace_anomaly)), max: 50, unit: "cm LWE" },
                    { label: "PDSI Index",    val: Math.abs(num(waterData.pdsi)),          max: 6,  unit: "index"  },
                  ].map(({ label, val, max, unit }) => (
                    <div key={label}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                        <span style={{ fontSize: "10px", fontWeight: 600, color: "#64748b", textTransform: "uppercase" }}>{label}</span>
                        <span style={{ fontSize: "12px", fontWeight: 700, color: "#1e293b" }}>{val.toFixed(2)} <span style={{ fontSize: "10px", color: "#94a3b8" }}>{unit}</span></span>
                      </div>
                      <div style={{ height: "4px", background: "#f1f5f9", overflow: "hidden" }}>
                        <motion.div style={{ height: "100%", background: "#1e293b" }}
                          initial={{ width: 0 }} animate={{ width: `${Math.min(val / max * 100, 100)}%` }}
                          transition={{ duration: 1, ease: "easeOut" }} />
                      </div>
                    </div>
                  ))}
                </div>

                {/* KPI tiles */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", padding: "24px" }}>
                  {[
                    { label: "GRACE", val: str(waterData.grace_anomaly), unit: "cm LWE" },
                    { label: "PDSI",  val: str(waterData.pdsi),          unit: "index"  },
                    { label: "Score", val: str(waterData.composite_risk_score), unit: "/100" },
                    { label: "Status", val: str(waterData.interpretation, "—").slice(0, 14), unit: "" },
                  ].map(({ label, val, unit }) => (
                    <div key={label} style={{ background: "#f8fafc", border: "1px solid #e2e8f0", padding: "12px" }}>
                      <div style={{ fontSize: "9px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "4px" }}>{label}</div>
                      <div style={{ fontSize: "15px", fontWeight: 700, color: "#1e293b" }}>{val}</div>
                      {unit && <div style={{ fontSize: "10px", color: "#94a3b8", marginTop: "2px" }}>{unit}</div>}
                    </div>
                  ))}
                </div>
              </div>

              {/* Summary metadata card */}
              <div style={{ background: "#fff", border: "1px solid #e2e8f0", padding: "24px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
                  <Droplets size={14} style={{ color: "#475569" }} />
                  <div>
                    <h2 style={{ fontSize: "13px", fontWeight: 700, color: "#0f172a" }}>Water Resource Summary</h2>
                    <p style={{ fontSize: "11px", color: "#94a3b8", marginTop: "2px" }}>NASA GRACE · GRIDMET PDSI</p>
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "10px" }}>
                  {[
                    { label: "GRACE Anomaly",  value: str(waterData.grace_anomaly), unit: "cm LWE" },
                    { label: "PDSI",           value: str(waterData.pdsi),          unit: "index"  },
                    { label: "Composite",      value: str(waterData.composite_risk_score), unit: "/100" },
                    { label: "Interpretation", value: str(waterData.interpretation, "No data").split(" ").slice(0, 2).join(" "), unit: "" },
                  ].map(({ label, value, unit }) => (
                    <div key={label} style={{ background: "#f8fafc", border: "1px solid #e2e8f0", padding: "14px" }}>
                      <div style={{ fontSize: "10px", fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "4px" }}>{label}</div>
                      <div style={{ fontSize: "20px", fontWeight: 700, color: "#1e293b" }}>{value}</div>
                      {unit && <div style={{ fontSize: "10px", color: "#94a3b8", marginTop: "2px" }}>{unit}</div>}
                    </div>
                  ))}
                </div>
              </div>

              {/* Climate Water Balance */}
              <div style={{ background: "#fff", border: "1px solid #e2e8f0", padding: "24px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
                  <Cloud size={14} style={{ color: "#475569" }} />
                  <div>
                    <h2 style={{ fontSize: "13px", fontWeight: 700, color: "#0f172a" }}>Climate Water Balance</h2>
                    <p style={{ fontSize: "11px", color: "#94a3b8", marginTop: "2px" }}>Precipitation · Runoff · PDSI drought index · {precipPeriod}</p>
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "10px", marginBottom: "16px" }}>
                  {[
                    { label: "Daily Precip",  value: precipDaily > 0 ? `${precipDaily.toFixed(2)} mm` : "—",       unit: "per day"       },
                    { label: "Annual Precip", value: precipAnnual > 0 ? `${precipAnnual.toFixed(0)} mm` : "—",      unit: "per year"      },
                    { label: "Runoff/Month",  value: tcRunoffMonth > 0 ? `${tcRunoffMonth.toFixed(1)} mm` : "—",    unit: "monthly mean"  },
                    { label: "PDSI Status",   value: tcPdsiLabel !== "—" ? tcPdsiLabel : (num(waterData.pdsi) < -2 ? "Drought" : num(waterData.pdsi) > 2 ? "Moist" : "Near Normal"), unit: "drought index" },
                  ].map(({ label, value, unit }) => (
                    <div key={label} style={{ background: "#f8fafc", border: "1px solid #e2e8f0", padding: "14px" }}>
                      <div style={{ fontSize: "9px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "4px" }}>{label}</div>
                      <div style={{ fontSize: "16px", fontWeight: 700, color: "#1e293b" }}>{value}</div>
                      <div style={{ fontSize: "10px", color: "#94a3b8", marginTop: "2px" }}>{unit}</div>
                    </div>
                  ))}
                </div>
                {(num(waterData.grace_anomaly) !== 0 || num(waterData.pdsi) !== 0) && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    {[
                      { label: "GRACE Groundwater Anomaly", val: Math.abs(num(waterData.grace_anomaly)), max: 50, unit: "cm LWE", note: gwStatusLabel },
                      { label: "PDSI Drought Index",        val: Math.abs(num(waterData.pdsi)), max: 6, unit: "index", note: tcPdsiLabel },
                    ].map(({ label, val, max, unit, note }) => (
                      <div key={label}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                          <span style={{ fontSize: "10px", fontWeight: 600, color: "#64748b", textTransform: "uppercase" }}>{label}</span>
                          <span style={{ fontSize: "12px", fontWeight: 700, color: "#1e293b" }}>{val.toFixed(2)} <span style={{ fontSize: "10px", color: "#94a3b8" }}>{unit}</span>{note !== "—" && <span style={{ fontSize: "10px", color: "#94a3b8" }}> · {note}</span>}</span>
                        </div>
                        <div style={{ height: "6px", background: "#f1f5f9", overflow: "hidden" }}>
                          <motion.div style={{ height: "100%", background: "#475569" }}
                            initial={{ width: 0 }} animate={{ width: `${Math.min(val / max * 100, 100)}%` }}
                            transition={{ duration: 1, ease: "easeOut" }} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Soil Moisture Profile */}
              <div style={{ background: "#fff", border: "1px solid #e2e8f0", padding: "24px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
                  <Droplets size={14} style={{ color: "#475569" }} />
                  <div>
                    <h2 style={{ fontSize: "13px", fontWeight: 700, color: "#0f172a" }}>Soil Moisture Profile</h2>
                    <p style={{ fontSize: "11px", color: "#94a3b8", marginTop: "2px" }}>Volumetric water content at depth layers · m³/m³</p>
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "10px", marginBottom: "12px" }}>
                  {[
                    { label: "0–1 cm",  val: sm0_1  },
                    { label: "1–3 cm",  val: sm1_3  },
                    { label: "3–9 cm",  val: sm3_9  },
                    { label: "9–27 cm", val: sm9_27 },
                  ].map(({ label, val }) => (
                    <div key={label} style={{ display: "flex", flexDirection: "column", alignItems: "center", background: "#f8fafc", border: "1px solid #e2e8f0", padding: "16px" }}>
                      <div style={{ fontSize: "9px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "10px" }}>{label} depth</div>
                      <div style={{ position: "relative", width: "64px", height: "64px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <svg viewBox="0 0 80 80" style={{ width: "100%", height: "100%", transform: "rotate(-90deg)" }}>
                          <circle cx="40" cy="40" r="30" fill="none" stroke="#e2e8f0" strokeWidth="8" />
                          <motion.circle cx="40" cy="40" r="30" fill="none" stroke="#334155" strokeWidth="8" strokeLinecap="round"
                            strokeDasharray="188.5"
                            initial={{ strokeDashoffset: 188.5 }}
                            animate={{ strokeDashoffset: 188.5 - Math.min(val, 0.6) / 0.6 * 188.5 }}
                            transition={{ duration: 1.2, ease: "easeOut" }} />
                        </svg>
                        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <span style={{ fontSize: "11px", fontWeight: 700, color: "#1e293b" }}>{val > 0 ? val.toFixed(3) : "—"}</span>
                        </div>
                      </div>
                      <div style={{ fontSize: "10px", color: "#94a3b8", marginTop: "8px" }}>m³/m³</div>
                    </div>
                  ))}
                </div>
                {(tcSoilMm > 0 || smRoot > 0) && (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginTop: "10px" }}>
                    <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", padding: "14px" }}>
                      <div style={{ fontSize: "9px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "4px" }}>TerraClimate Soil Moisture</div>
                      <div style={{ fontSize: "20px", fontWeight: 700, color: "#1e293b" }}>{tcSoilMm > 0 ? `${tcSoilMm.toFixed(0)} mm` : "—"}</div>
                      <div style={{ fontSize: "10px", color: "#94a3b8", marginTop: "2px" }}>column water equivalent</div>
                    </div>
                    <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", padding: "14px" }}>
                      <div style={{ fontSize: "9px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "4px" }}>Root Zone Storage</div>
                      <div style={{ fontSize: "20px", fontWeight: 700, color: "#1e293b" }}>{smRoot > 0 ? `${smRoot.toFixed(3)} m³/m³` : "—"}</div>
                      <div style={{ fontSize: "10px", color: "#94a3b8", marginTop: "2px" }}>plant-available water</div>
                    </div>
                  </div>
                )}
              </div>

              {/* Evapotranspiration */}
              <div style={{ background: "#fff", border: "1px solid #e2e8f0", padding: "24px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
                  <TrendingUp size={14} style={{ color: "#475569" }} />
                  <div>
                    <h2 style={{ fontSize: "13px", fontWeight: 700, color: "#0f172a" }}>Evapotranspiration</h2>
                    <p style={{ fontSize: "11px", color: "#94a3b8", marginTop: "2px" }}>TerraClimate actual ET · MODIS-ET · FAO Penman-Monteith ET₀</p>
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
                  {[
                    { label: "TC Actual ET/month", value: tcEtMonth > 0 ? `${tcEtMonth.toFixed(1)} mm` : "—",   sub: "TerraClimate" },
                    { label: "TC Annual ET",        value: tcEtAnnual > 0 ? `${tcEtAnnual.toFixed(0)} mm` : "—", sub: "TerraClimate annual" },
                    { label: "MODIS ET/month",      value: modisEtMonth > 0 ? `${modisEtMonth.toFixed(1)} mm` : "—", sub: "MODIS-ET estimate" },
                    { label: "MODIS Annual ET",     value: modisEtAnnual > 0 ? `${modisEtAnnual.toFixed(0)} mm` : "—", sub: "MODIS annual" },
                    { label: "ET₀ (Penman-M.)",     value: (tcEtMonth > 0 ? tcEtMonth : modisEtMonth) > 0 ? `${((tcEtMonth > 0 ? tcEtMonth : modisEtMonth) / 30).toFixed(2)} mm/day` : "—", sub: "reference ET₀" },
                    { label: "Water Demand",        value: tcEtAnnual > 1000 ? "High" : tcEtAnnual > 600 ? "Moderate" : tcEtAnnual > 0 ? "Low" : "—", sub: "relative classification" },
                  ].map(({ label, value, sub }) => (
                    <div key={label} style={{ background: "#f8fafc", border: "1px solid #e2e8f0", padding: "12px" }}>
                      <div style={{ fontSize: "9px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "4px" }}>{label}</div>
                      <div style={{ fontSize: "16px", fontWeight: 700, color: "#1e293b" }}>{value}</div>
                      <div style={{ fontSize: "10px", color: "#94a3b8", marginTop: "2px" }}>{sub}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* NDWI + Flood Zone */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                <div style={{ background: "#fff", border: "1px solid #e2e8f0", padding: "24px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
                    <Satellite size={14} style={{ color: "#475569" }} />
                    <div>
                      <h2 style={{ fontSize: "13px", fontWeight: 700, color: "#0f172a" }}>NDWI Index</h2>
                      <p style={{ fontSize: "11px", color: "#94a3b8", marginTop: "2px" }}>Normalised Difference Water Index · Landsat-9</p>
                    </div>
                  </div>
                  {ndwiValue !== 0 || ndwiLabel !== "—" ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div>
                          <div style={{ fontSize: "40px", fontWeight: 800, color: "#1e293b" }}>{ndwiValue.toFixed(4)}</div>
                          <div style={{ fontSize: "13px", fontWeight: 600, color: "#64748b", marginTop: "4px" }}>{ndwiLabel}</div>
                        </div>
                        <div style={{ textAlign: "right", fontSize: "11px", color: "#94a3b8" }}>
                          <div>Period: {ndwiPeriod}</div>
                          <div>{ndwiScenes > 0 ? `${ndwiScenes} scenes` : ""}</div>
                        </div>
                      </div>
                      <div>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", marginBottom: "6px" }}>
                          <span>Dry (-1)</span><span>Water (+1)</span>
                        </div>
                        <div style={{ position: "relative", height: "8px", background: "#f1f5f9", overflow: "hidden" }}>
                          <motion.div style={{ position: "absolute", top: 0, height: "100%", width: "8px", background: "#1e293b" }}
                            initial={{ left: "50%" }}
                            animate={{ left: `${((ndwiValue + 1) / 2) * 100}%` }}
                            transition={{ duration: 1.2, ease: "easeOut" }} />
                        </div>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "6px" }}>
                        {[["< -0.1", "Dry/Barren"], ["-0.1 to 0.2", "Moderate"], ["> 0.2", "Water/Moist"]].map(([range, label]) => (
                          <div key={range} style={{ background: "#f8fafc", border: "1px solid #e2e8f0", padding: "8px", textAlign: "center" }}>
                            <div style={{ fontSize: "10px", fontWeight: 700, color: "#1e293b" }}>{range}</div>
                            <div style={{ fontSize: "9px", color: "#94a3b8", marginTop: "2px" }}>{label}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px", textAlign: "center", gap: "8px" }}>
                      <Satellite size={24} style={{ color: "#cbd5e1" }} />
                      <div style={{ fontSize: "13px", fontWeight: 600, color: "#64748b" }}>NDWI data unavailable</div>
                      <div style={{ fontSize: "11px", color: "#94a3b8" }}>Configure Google Earth Engine for Landsat-9 NDWI analysis.</div>
                    </div>
                  )}
                </div>

                {/* Flood Zone Analysis */}
                <div style={{ background: "#fff", border: "1px solid #e2e8f0", padding: "24px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
                    <Droplets size={14} style={{ color: "#475569" }} />
                    <div>
                      <h2 style={{ fontSize: "13px", fontWeight: 700, color: "#0f172a" }}>Flood Zone Analysis</h2>
                      <p style={{ fontSize: "11px", color: "#94a3b8", marginTop: "2px" }}>JRC surface water · seasonality · flood risk</p>
                    </div>
                  </div>
                  {swOccurrence > 0 || swFloodRisk !== "—" ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                      <div style={{ padding: "12px 16px", background: "#f8fafc", border: "1px solid #e2e8f0" }}>
                        <div style={{ fontSize: "9px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "4px" }}>Flood Risk Classification</div>
                        <div style={{ fontSize: "18px", fontWeight: 700, color: "#1e293b" }}>{swFloodRisk !== "—" ? swFloodRisk : "Low Risk"}</div>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                        {[
                          { label: "Water Occurrence", val: swOccurrence > 0 ? `${swOccurrence.toFixed(1)}%` : "—", sub: "of time surface water present" },
                          { label: "Seasonality", val: swSeasonality > 0 ? `${swSeasonality.toFixed(1)} mo` : "—", sub: "months with water per year" },
                        ].map(({ label, val, sub }) => (
                          <div key={label} style={{ background: "#f8fafc", border: "1px solid #e2e8f0", padding: "12px" }}>
                            <div style={{ fontSize: "9px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "4px" }}>{label}</div>
                            <div style={{ fontSize: "20px", fontWeight: 700, color: "#1e293b" }}>{val}</div>
                            <div style={{ fontSize: "10px", color: "#94a3b8", marginTop: "2px" }}>{sub}</div>
                          </div>
                        ))}
                      </div>
                      {gwTrend !== "—" && (
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", background: "#f8fafc", border: "1px solid #e2e8f0" }}>
                          <div>
                            <div style={{ fontSize: "9px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", marginBottom: "2px" }}>Groundwater Trend</div>
                            <div style={{ fontSize: "13px", fontWeight: 700, color: "#1e293b" }}>{gwTrend}</div>
                          </div>
                          <div style={{ textAlign: "right" }}>
                            <div style={{ fontSize: "9px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", marginBottom: "2px" }}>Status</div>
                            <div style={{ fontSize: "13px", fontWeight: 700, color: "#1e293b" }}>{gwStatusLabel}</div>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px", textAlign: "center", gap: "8px" }}>
                      <Droplets size={24} style={{ color: "#cbd5e1" }} />
                      <div style={{ fontSize: "13px", fontWeight: 600, color: "#64748b" }}>Flood data unavailable</div>
                      <div style={{ fontSize: "11px", color: "#94a3b8" }}>Configure Google Earth Engine for JRC Global Surface Water analysis.</div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </main>
    </motion.div>
  );
}

