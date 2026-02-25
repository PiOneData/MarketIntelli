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

  const TABS: { id: TabId; icon: React.ReactNode; label: string; activeClass: string }[] = [
    ...(datacenter ? [{ id: "datacenter" as TabId, icon: <Server size={13} />, label: "Data Center", activeClass: "bg-teal-700 text-white shadow-sm" }] : []),
    { id: "wind",  icon: <Wind size={13} />,  label: "Wind",      activeClass: "bg-sky-600 text-white shadow-sm"    },
    { id: "solar", icon: <Sun size={13} />,   label: "Solar",     activeClass: "bg-amber-500 text-white shadow-sm"  },
    { id: "water", icon: <Cloud size={13} />, label: "Hydrology", activeClass: "bg-blue-600 text-white shadow-sm"   },
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="absolute inset-0 z-50 bg-[#f8fafc] overflow-y-auto font-sans text-slate-900"
      style={{ fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif" }}>

      {/* ── HEADER ── */}
      <nav className="sticky top-0 bg-white/90 backdrop-blur-md shadow-sm border-b border-slate-200 z-50 px-6 py-3 flex justify-between items-center flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-teal-700 rounded-xl text-white shadow-md">
            <Satellite size={20} />
          </div>
          <div>
            <h1 className="font-bold text-slate-800 text-base leading-tight">RE Potential Assessment</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-slate-400 font-mono">{lat.toFixed(4)}°N, {lng.toFixed(4)}°E</span>
              <span className="w-1 h-1 bg-slate-200 rounded-full" />
              <span className="text-xs text-teal-600 font-semibold">Site Intelligence</span>
            </div>
          </div>
        </div>

        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 flex-wrap gap-1">
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg font-semibold text-xs uppercase tracking-wide transition-all ${activeTab === tab.id ? tab.activeClass : "text-slate-400 hover:text-slate-600"}`}>
              {tab.icon}{tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button onClick={() => setShowGuide(!showGuide)}
            className={`px-3 py-2 rounded-xl transition-all border flex items-center gap-2 text-xs font-semibold ${showGuide ? "bg-teal-700 text-white border-teal-600 shadow" : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"}`}>
            <BookOpen size={14} />
            <span className="hidden md:block">Guide</span>
          </button>
          {onClearCache && (
            <button onClick={onClearCache} title="Clear cached analysis"
              className="p-2 bg-white text-slate-400 hover:text-amber-500 hover:bg-amber-50 rounded-xl transition-all border border-slate-200">
              <ArrowLeft size={16} />
            </button>
          )}
          <button onClick={onClose} className="p-2 bg-slate-50 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all border border-slate-200">
            <X size={18} />
          </button>
        </div>
      </nav>

      {/* ── INTELLIGENCE GUIDE PANEL ── */}
      <AnimatePresence>
        {showGuide && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className="fixed top-20 right-6 left-6 md:left-auto md:w-[420px] bg-white rounded-2xl shadow-2xl border border-slate-100 z-[60] overflow-hidden">
            <div className="bg-slate-900 p-6 text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-teal-500/20 rounded-full -translate-y-8 translate-x-8 blur-2xl" />
              <div className="flex items-center gap-3 relative z-10">
                <div className="p-2.5 bg-teal-700 rounded-xl"><BookOpen size={18} /></div>
                <div>
                  <h3 className="text-base font-bold">Intelligence Logic</h3>
                  <p className="text-xs text-teal-300 mt-0.5">How we assess site suitability</p>
                </div>
              </div>
            </div>
            <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
              {GUIDE_ITEMS.map((item, i) => (
                <div key={i} className="flex gap-4 group">
                  <div className="shrink-0 w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center border border-slate-100 group-hover:border-teal-100 group-hover:bg-teal-50 transition-colors">
                    {item.icon}
                  </div>
                  <div className="space-y-0.5">
                    <h4 className="text-sm font-semibold text-slate-800">{item.title}</h4>
                    <p className="text-xs text-slate-500 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-center">
              <button onClick={() => setShowGuide(false)}
                className="px-6 py-2 bg-slate-800 text-white text-xs font-semibold uppercase tracking-wide rounded-lg hover:bg-slate-700 transition-colors">
                Close
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="max-w-[1400px] mx-auto p-8 space-y-12">
        <AnimatePresence mode="wait">

          {/* ════ DATA CENTER TAB ════ */}
          {activeTab === "datacenter" && datacenter && (
            <motion.div key="datacenter" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-10">

              {/* Satellite image */}
              <div className="relative rounded-[3rem] overflow-hidden shadow-2xl h-56 bg-slate-900">
                <img src={`https://services.arcgisonline.com/arcgis/rest/services/World_Imagery/MapServer/export?bbox=${lng - 0.005},${lat - 0.0025},${lng + 0.005},${lat + 0.0025}&bboxSR=4326&imageSR=4326&size=1000,400&format=jpg&f=image`}
                  alt={`Satellite view of ${datacenter.name}`} className="w-full h-full object-cover" />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="relative">
                    <div className="w-4 h-4 rounded-full bg-violet-500 border-2 border-white shadow-xl ring-8 ring-violet-500/30" />
                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-px h-4 bg-white/80" />
                    <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 w-px h-4 bg-white/80" />
                    <div className="absolute top-1/2 -translate-y-1/2 -left-6 h-px w-4 bg-white/80" />
                    <div className="absolute top-1/2 -translate-y-1/2 -right-6 h-px w-4 bg-white/80" />
                  </div>
                </div>
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-5 flex justify-between items-end">
                  <div>
                    <div className="text-[9px] font-black text-violet-300 uppercase tracking-widest">Satellite View</div>
                    <div className="text-sm font-black text-white">{str(datacenter.name)}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-[10px] text-white/70">{lat.toFixed(5)}°N</div>
                    <div className="font-mono text-[10px] text-white/70">{lng.toFixed(5)}°E</div>
                  </div>
                </div>
              </div>

              {/* Hero banner */}
              <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-slate-900 via-teal-950 to-slate-900 p-8 shadow-xl">
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                  {[0, 1, 2].map(i => (
                    <motion.div key={i} className="absolute rounded-full border border-teal-500/20"
                      style={{ width: 300 + i * 200, height: 300 + i * 200, top: "50%", left: "65%", x: "-50%", y: "-50%" }}
                      animate={{ scale: [1, 1.12, 1], opacity: [0.25, 0.05, 0.25] }}
                      transition={{ duration: 3.5 + i, repeat: Infinity, delay: i * 0.9 }} />
                  ))}
                </div>
                <div className="relative z-10 grid grid-cols-1 lg:grid-cols-3 gap-8 items-center">
                  <div className="flex flex-col items-center gap-4">
                    <motion.div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-teal-600 to-teal-800 flex items-center justify-center shadow-xl"
                      animate={{ y: [0, -6, 0] }} transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}>
                      <Server size={44} className="text-white" strokeWidth={1.5} />
                    </motion.div>
                    <div className="inline-block px-3 py-1 rounded-full bg-teal-500/20 border border-teal-500/30 text-teal-300 text-xs font-semibold">
                      {str(datacenter.tier, "Unknown Tier")}
                    </div>
                  </div>
                  <div className="col-span-1 space-y-3">
                    <div className="text-xs font-semibold text-teal-400 uppercase tracking-wide">Data Center Profile</div>
                    <h2 className="text-2xl font-bold text-white leading-tight">{str(datacenter.name)}</h2>
                    <div className="text-teal-300 font-medium text-sm">{str(datacenter.company)}</div>
                    {datacenter.url && (
                      <a href={String(datacenter.url)} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-xs font-semibold text-teal-300 hover:text-white uppercase tracking-wide transition-colors">
                        <Globe size={12} />{String(datacenter.url).replace("https://", "")}
                      </a>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: "Power", val: str(datacenter.power_mw, "—"), unit: "MW", col: "from-teal-700 to-teal-800" },
                      { label: "Tier Design", val: str(datacenter.tier, "—"), unit: "", col: "from-slate-700 to-slate-800" },
                      { label: "Whitespace", val: str(datacenter.whitespace, "—"), unit: "", col: "from-slate-700 to-slate-800" },
                      { label: "Market", val: str(datacenter.market, "—"), unit: "", col: "from-teal-800 to-slate-900" },
                    ].map(({ label, val, unit, col }) => (
                      <div key={label} className={`bg-gradient-to-br ${col} p-4 rounded-xl shadow text-white relative overflow-hidden`}>
                        <div className="text-xs font-medium opacity-60 mb-1">{label}</div>
                        <div className="text-sm font-bold leading-tight">{val}</div>
                        {unit && <div className="text-xs opacity-50 mt-0.5">{unit}</div>}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Location + Infrastructure */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white border border-slate-100 rounded-2xl p-8 shadow-sm space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-teal-50 border border-teal-100 rounded-xl text-teal-600"><MapPin size={18} /></div>
                    <div>
                      <h3 className="text-base font-semibold text-slate-800">Physical Location</h3>
                      <p className="text-xs text-slate-400 mt-0.5">Address · Postal · Coordinates</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                      <div className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Street Address</div>
                      <div className="text-sm font-semibold text-slate-700">{str(datacenter.address)}</div>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      {[["City", datacenter.city], ["State", datacenter.state], ["Postal", datacenter.postal]].map(([l, v]) => (
                        <div key={String(l)} className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-center">
                          <div className="text-xs font-medium text-slate-400 uppercase mb-1">{String(l)}</div>
                          <div className="text-sm font-semibold text-slate-700">{str(v)}</div>
                        </div>
                      ))}
                    </div>
                    <div className="p-4 bg-slate-900 rounded-xl">
                      <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">GPS Coordinates</div>
                      <div className="font-mono text-sm font-bold text-teal-400">{lat.toFixed(6)}°N, {lng.toFixed(6)}°E</div>
                    </div>
                  </div>
                </div>
                <div className="bg-white border border-slate-100 rounded-2xl p-8 shadow-sm space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-600"><Cpu size={18} /></div>
                    <div>
                      <h3 className="text-base font-semibold text-slate-800">Infrastructure Specs</h3>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {[
                      { label: "Tier Classification", val: str(datacenter.tier, "Not Specified"), bg: "bg-teal-50", border: "border-teal-100", text: "text-teal-700" },
                      { label: "Power Capacity",      val: datacenter.power_mw ? `${String(datacenter.power_mw)} MW` : "Not Specified", bg: "bg-amber-50",  border: "border-amber-100",  text: "text-amber-700" },
                      { label: "Whitespace",          val: str(datacenter.whitespace, "Not Specified"), bg: "bg-emerald-50", border: "border-emerald-100", text: "text-emerald-700" },
                      { label: "Market",              val: str(datacenter.market,     "Not Specified"), bg: "bg-sky-50",     border: "border-sky-100",     text: "text-sky-700"    },
                      { label: "Country",             val: str(datacenter.country,    "India"),          bg: "bg-slate-50",   border: "border-slate-100",   text: "text-slate-700"   },
                    ].map(({ label, val, bg, border, text }) => (
                      <div key={label} className={`flex justify-between items-center p-4 ${bg} border ${border} rounded-xl`}>
                        <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</div>
                        <div className={`text-sm font-semibold ${text}`}>{val}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Switch tabs banner */}
              <div className="bg-gradient-to-r from-teal-700 to-teal-600 rounded-2xl p-6 flex items-center justify-between shadow-md flex-wrap gap-4">
                <div>
                  <div className="text-xs font-medium text-teal-200 mb-1">Site Intelligence Available</div>
                  <div className="text-white font-semibold text-base">View Wind, Solar &amp; Hydrology assessments</div>
                </div>
                <div className="flex gap-2">
                  {(["wind", "solar", "water"] as TabId[]).map(id => (
                    <button key={id} onClick={() => setActiveTab(id)}
                      className="flex items-center gap-2 px-4 py-2.5 bg-white/15 hover:bg-white/25 text-white rounded-lg text-xs font-semibold uppercase tracking-wide transition-all border border-white/20">
                      {id === "wind" && <Wind size={14} />}{id === "solar" && <Sun size={14} />}{id === "water" && <Cloud size={14} />}
                      {id}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* ════ WIND TAB ════ */}
          {activeTab === "wind" && (
            <motion.div key="wind" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-8">

              {/* Hero banner */}
              <div className="relative rounded-[3rem] overflow-hidden" style={{ background: "linear-gradient(135deg,#0f172a 0%,#1e293b 45%,#0c1a35 100%)" }}>
                <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full opacity-10" style={{ background: "radial-gradient(circle,#38bdf8 0%,transparent 70%)", filter: "blur(60px)" }} />
                <div className="relative z-10 grid grid-cols-1 lg:grid-cols-3">

                  {/* Score arc */}
                  <div className="flex flex-col items-center justify-center p-12 border-r border-white/5">
                    <div className="text-[9px] font-black text-cyan-400/70 uppercase tracking-[0.3em] mb-8">Wind Viability Index</div>
                    <div className="relative w-48 h-48">
                      <svg viewBox="0 0 200 200" className="w-full h-full -rotate-90">
                        <circle cx="100" cy="100" r="80" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="14" strokeDasharray="400 502" strokeLinecap="round" />
                        <motion.circle cx="100" cy="100" r="80" fill="none" stroke="url(#wArc)" strokeWidth="14" strokeLinecap="round" strokeDasharray="502" strokeDashoffset="502"
                          animate={{ strokeDashoffset: 502 - (num(windData.score) / 100) * 400 }} transition={{ duration: 1.5, ease: "easeOut" }} />
                        <defs><linearGradient id="wArc" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#38bdf8" /><stop offset="100%" stopColor="#818cf8" />
                        </linearGradient></defs>
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <div className="text-5xl font-black text-white tracking-tighter">{str(windData.score)}</div>
                        <div className="text-[9px] font-black text-cyan-400 uppercase tracking-widest mt-1">{str(get(wd, "resource", "label"))}</div>
                      </div>
                    </div>
                    <div className="mt-3 text-[8px] text-slate-500 font-bold">/ 100 composite score</div>
                  </div>

                  {/* Animated turbine */}
                  <div className="flex flex-col items-center justify-center p-12 border-r border-white/5">
                    <div className="relative mb-6">
                      <svg width="90" height="110" viewBox="0 0 100 120">
                        <polygon points="48,120 52,120 53,60 47,60" fill="#334155" />
                        <circle cx="50" cy="58" r="5" fill="#64748b" />
                        <motion.g style={{ originX: "50px", originY: "58px" }} animate={{ rotate: 360 }} transition={{ duration: 4, repeat: Infinity, ease: "linear" }}>
                          <ellipse cx="50" cy="30" rx="3.5" ry="28" fill="#38bdf8" opacity="0.9" />
                          <ellipse cx="50" cy="30" rx="3.5" ry="28" fill="#38bdf8" opacity="0.9" transform="rotate(120 50 58)" />
                          <ellipse cx="50" cy="30" rx="3.5" ry="28" fill="#38bdf8" opacity="0.9" transform="rotate(240 50 58)" />
                        </motion.g>
                      </svg>
                    </div>
                    <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Resource Grade</div>
                    <div className="text-8xl font-black tracking-tighter leading-none"
                      style={{ background: "linear-gradient(135deg,#38bdf8,#818cf8)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                      {str(get(wd, "resource", "grade"))}
                    </div>
                    <div className="text-[10px] text-slate-400 font-bold uppercase mt-3 tracking-[0.15em]">{str(get(wd, "resource", "label"))}</div>
                  </div>

                  {/* Key metrics */}
                  <div className="flex flex-col justify-center p-12 gap-5">
                    <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Key Metrics · 100m AGL</div>
                    {[
                      { label: "Wind Speed",    value: `${str(get(wd, "resource", "wind_speed"))} m/s`, color: "#38bdf8", bar: num(get(wd, "resource", "wind_speed")) / 15 },
                      { label: "Power Density", value: `${str(get(wd, "resource", "power_density"))} W/m²`, color: "#818cf8", bar: num(get(wd, "resource", "power_density")) / 800 },
                      { label: "Air Density",   value: `${str(get(wd, "resource", "air_density"))} kg/m³`, color: "#34d399", bar: num(get(wd, "resource", "air_density"), 1.0) / 1.3 },
                    ].map(({ label, value, color, bar }) => (
                      <div key={label}>
                        <div className="flex justify-between items-baseline mb-1.5">
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">{label}</span>
                          <span className="text-sm font-black text-white">{value}</span>
                        </div>
                        <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                          <motion.div className="h-full rounded-full" style={{ background: color }}
                            initial={{ width: 0 }} animate={{ width: `${Math.min(bar * 100, 100)}%` }}
                            transition={{ duration: 1.2, delay: 0.2 }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Live hub heights */}
              <div>
                <div className="flex items-center gap-3 mb-5">
                  <div className="p-2 rounded-xl bg-slate-900"><TrendingUp size={16} className="text-cyan-400" /></div>
                  <div>
                    <div className="text-sm font-black text-slate-800 uppercase tracking-wider">Live Atmospheric Telemetry</div>
                    <div className="text-[9px] text-slate-400 font-bold">Open-Meteo · Real-time multi-height readings</div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-5">
                  {[
                    { label: "High Hub",    height: "180m", speed: ws180.toFixed(2), dir: wd180, bg1: "#0f172a", bg2: "#1e3a5f", dot: "#38bdf8" },
                    { label: "Primary Hub", height: "120m", speed: ws120.toFixed(2), dir: wd120, bg1: "#1a1040", bg2: "#2d1b69", dot: "#818cf8", main: true },
                    { label: "Standard Hub",height: "80m",  speed: ws80.toFixed(2),  dir: wd80,  bg1: "#0d2426", bg2: "#164e4e", dot: "#34d399" },
                  ].map(({ label, height, speed, dir, bg1, bg2, dot, main }) => (
                    <div key={height} className={`relative rounded-[2.5rem] overflow-hidden ${main ? "ring-2 ring-indigo-400/40" : ""}`}
                      style={{ background: `linear-gradient(145deg,${bg1},${bg2})` }}>
                      {main && <div className="absolute top-4 right-4 text-[7px] font-black text-indigo-300 bg-indigo-500/20 px-2 py-1 rounded-full uppercase tracking-widest">Rated Hub</div>}
                      <div className="p-8">
                        <div className="text-[8px] font-black uppercase tracking-[0.25em] mb-1" style={{ color: dot }}>{label}</div>
                        <div className="text-[9px] font-bold text-white/40 mb-5">{height} AGL</div>
                        <div className="text-6xl font-black text-white tracking-tighter leading-none mb-1">{speed}</div>
                        <div className="text-[9px] font-bold text-white/40 mb-5">m/s</div>
                        <div className="flex items-center gap-4">
                          <div className="relative w-11 h-11 flex items-center justify-center">
                            <div className="absolute inset-0 rounded-full border border-white/10" />
                            <motion.div animate={{ rotate: dir }} transition={{ type: "spring", stiffness: 60 }}
                              className="w-0.5 h-4 rounded-full absolute top-1.5"
                              style={{ background: `linear-gradient(to bottom,${dot},transparent)`, transformOrigin: "bottom center", left: "calc(50% - 1px)" }} />
                            <div className="w-1.5 h-1.5 rounded-full" style={{ background: dot }} />
                          </div>
                          <div>
                            <div className="text-[8px] font-black text-white/30 uppercase">Direction</div>
                            <div className="text-xs font-black text-white">{getCardinal(dir)}</div>
                            <div className="text-[8px] text-white/30">{dir}°</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Vertical profile chart */}
              {profileData.length > 0 && (
                <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
                  <div className="px-8 pt-8 pb-3">
                    <div className="text-sm font-semibold text-slate-800">Vertical Wind Profile</div>
                    <div className="text-xs text-slate-400 mt-0.5">GWA v3 · 10m–200m AGL</div>
                  </div>
                  <div className="px-4 pb-4 h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={profileData} margin={{ top: 10, right: 50, left: 0, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="height" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: "#94a3b8" }} />
                        <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: "#94a3b8" }} width={40} />
                        <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: "#22d3ee" }} domain={[1.0, 1.3]} width={45} />
                        <Tooltip contentStyle={{ borderRadius: "16px", border: "none", padding: "16px", fontSize: 11 }} />
                        <Area yAxisId="left" type="monotone" dataKey="speed" name="Speed (m/s)" fill="#4f46e5" fillOpacity={0.07} stroke="#4f46e5" strokeWidth={3} />
                        <Line yAxisId="left" type="monotone" dataKey="power" name="Power (W/m²)" stroke="#f59e0b" strokeWidth={2.5} dot={{ r: 5 }} />
                        <Line yAxisId="right" type="monotone" dataKey="ad" name="Air Density (kg/m³)" stroke="#22d3ee" strokeWidth={2} strokeDasharray="6 3" dot={{ r: 3 }} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="grid grid-cols-4 border-t border-slate-100">
                    {[
                      { label: "Shear α", value: shearExp.toFixed(3), sub: "Hellmann exponent", color: "text-sky-600" },
                      { label: "Shear Ratio", value: str(get(wd, "physics", "shear_ratio")), sub: "ws100/ws10", color: "text-slate-600" },
                      { label: "RIX", value: str(get(wd, "feasibility", "rix")), sub: "Ruggedness τ", color: "text-amber-500" },
                      { label: "Elevation", value: `${str(get(wd, "feasibility", "elevation"))}m`, sub: `Slope ${str(get(wd, "feasibility", "slope"))}°`, color: "text-slate-700" },
                    ].map((p, i) => (
                      <div key={p.label} className={`px-6 py-5 text-center ${i < 3 ? "border-r border-slate-100" : ""}`}>
                        <div className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">{p.label}</div>
                        <div className={`text-xl font-bold ${p.color}`}>{p.value}</div>
                        <div className="text-xs text-slate-300 font-medium mt-1">{p.sub}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* IEC Capacity Factors */}
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                <div className="lg:col-span-3 bg-white border border-slate-100 rounded-2xl p-8 shadow-sm">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 rounded-xl bg-sky-50"><Zap size={15} className="text-sky-600" /></div>
                    <div>
                      <div className="text-sm font-semibold text-slate-800">IEC Turbine Capacity Factors</div>
                      <div className="text-xs text-slate-400">GWA v3 · site-specific CF per turbine class</div>
                    </div>
                  </div>
                  <div className="space-y-6">
                    {[
                      { cls: "IEC Class 1", sub: "High Wind >7.5 m/s",      value: num(get(wd, "turbine", "cf_iec1")), grad: "from-indigo-500 to-violet-500" },
                      { cls: "IEC Class 2", sub: "Medium Wind 6.5–7.5 m/s", value: num(get(wd, "turbine", "cf_iec2")), grad: "from-amber-400 to-orange-400"  },
                      { cls: "IEC Class 3", sub: "Low Wind 5.0–6.5 m/s",    value: num(get(wd, "turbine", "cf_iec3")), grad: "from-emerald-400 to-teal-400"  },
                    ].map(({ cls, sub, value, grad }) => (
                      <div key={cls}>
                        <div className="flex justify-between items-end mb-2.5">
                          <div>
                            <div className="text-[10px] font-black text-slate-700 uppercase tracking-wide">{cls}</div>
                            <div className="text-[8px] text-slate-400 font-bold mt-0.5">{sub}</div>
                          </div>
                          <div className="text-3xl font-black text-slate-700">{value > 0 ? `${(value * 100).toFixed(1)}%` : "—"}</div>
                        </div>
                        <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                          <motion.div className={`h-full rounded-full bg-gradient-to-r ${grad}`}
                            initial={{ width: 0 }} animate={{ width: `${Math.min(value * 100, 100)}%` }}
                            transition={{ duration: 1.1, ease: "easeOut", delay: 0.15 }} />
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-6 pt-5 border-t border-slate-100 text-xs text-slate-400 font-medium">
                    <span className="text-teal-600 font-semibold">Recommended: </span>{str(get(wd, "turbine", "best_fit"))}
                  </div>
                </div>
                <div className="lg:col-span-2 flex flex-col gap-5">
                  <div className="flex-1 relative rounded-[3rem] overflow-hidden flex flex-col justify-between p-10"
                    style={{ background: "linear-gradient(145deg,#0f172a 0%,#1e1b4b 60%,#0c1a35 100%)" }}>
                    <div className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-10"
                      style={{ background: "radial-gradient(circle,#818cf8 0%,transparent 70%)", filter: "blur(40px)" }} />
                    <div>
                      <div className="text-[8px] font-black text-indigo-400/70 uppercase tracking-[0.25em] mb-1">Annual Yield Estimate</div>
                      <div className="text-[8px] text-slate-500 font-bold mb-5">Best turbine class CF</div>
                      <div className="text-5xl font-black text-white tracking-tighter leading-none">
                        {str(get(wd, "terrain", "elevation"), "—")}
                      </div>
                      <div className="text-sm font-black text-indigo-300/60 mt-1">m elevation</div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 pt-5 border-t border-white/10">
                      <div>
                        <div className="text-[7px] text-slate-500 font-black uppercase">Status</div>
                        <div className="text-sm font-black text-white mt-0.5">{str(get(wd, "feasibility", "status"))}</div>
                      </div>
                      <div>
                        <div className="text-[7px] text-slate-500 font-black uppercase">Slope</div>
                        <div className="text-sm font-black text-white mt-0.5">{str(get(wd, "feasibility", "slope"))}°</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* ════ SOLAR TAB ════ */}
          {activeTab === "solar" && (
            <motion.div key="solar" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-8">

              {/* Hero banner */}
              <div className="relative rounded-[3rem] overflow-hidden" style={{ background: "linear-gradient(135deg,#1c0a00 0%,#3d1a00 40%,#1a0e00 100%)" }}>
                <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full opacity-20"
                  style={{ background: "radial-gradient(circle,#fb923c 0%,transparent 70%)", filter: "blur(80px)" }} />
                <div className="relative z-10 grid grid-cols-1 lg:grid-cols-3">

                  {/* Score arc */}
                  <div className="flex flex-col items-center justify-center p-12 border-r border-white/5">
                    <div className="text-[9px] font-black text-amber-400/70 uppercase tracking-[0.3em] mb-8">Solar Viability Index</div>
                    <div className="relative w-48 h-48">
                      <svg viewBox="0 0 200 200" className="w-full h-full -rotate-90">
                        <circle cx="100" cy="100" r="80" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="14" strokeDasharray="400 502" strokeLinecap="round" />
                        <motion.circle cx="100" cy="100" r="80" fill="none" stroke="url(#sArc)" strokeWidth="14" strokeLinecap="round" strokeDasharray="502" strokeDashoffset="502"
                          animate={{ strokeDashoffset: 502 - (num(solarData.score) / 100) * 400 }}
                          transition={{ duration: 1.5, ease: "easeOut" }} />
                        <defs><linearGradient id="sArc" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#fb923c" /><stop offset="100%" stopColor="#fbbf24" />
                        </linearGradient></defs>
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <div className="text-5xl font-black text-white tracking-tighter">{str(solarData.score)}</div>
                        <div className="text-[9px] font-black text-amber-400 uppercase tracking-widest mt-1">{str(get(sd, "resource", "grade"))}</div>
                      </div>
                    </div>
                  </div>

                  {/* Animated sun */}
                  <div className="flex flex-col items-center justify-center p-12 border-r border-white/5">
                    <motion.svg width="90" height="90" viewBox="0 0 100 100"
                      animate={{ rotate: 360 }} transition={{ duration: 20, repeat: Infinity, ease: "linear" }}>
                      {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map(angle => (
                        <line key={angle}
                          x1={50 + 30 * Math.cos(angle * Math.PI / 180)} y1={50 + 30 * Math.sin(angle * Math.PI / 180)}
                          x2={50 + 42 * Math.cos(angle * Math.PI / 180)} y2={50 + 42 * Math.sin(angle * Math.PI / 180)}
                          stroke="#fbbf24" strokeWidth="3" strokeLinecap="round" opacity="0.8" />
                      ))}
                      <circle cx="50" cy="50" r="22" fill="#fb923c" />
                      <circle cx="50" cy="50" r="16" fill="#fbbf24" />
                    </motion.svg>
                    <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2 mt-4">GHI</div>
                    <div className="text-7xl font-black tracking-tighter leading-none"
                      style={{ background: "linear-gradient(135deg,#fb923c,#fbbf24)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                      {str(get(sd, "resource", "ghi"))}
                    </div>
                    <div className="text-[10px] text-slate-400 font-bold uppercase mt-2 tracking-[0.15em]">kWh / m² / year</div>
                  </div>

                  {/* Key metrics */}
                  <div className="flex flex-col justify-center p-12 gap-5">
                    <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Key Metrics · GSA Long-term</div>
                    {[
                      { label: "GHI",    value: `${str(get(sd, "resource", "ghi"))} kWh/m²/yr`, color: "#fbbf24", bar: num(get(sd, "resource", "ghi")) / 2500 },
                      { label: "DNI",    value: `${str(get(sd, "resource", "dni"))} kWh/m²/yr`, color: "#fb923c", bar: num(get(sd, "resource", "dni")) / 2500 },
                      { label: "PVOUT",  value: `${str(get(sd, "resource", "pvout"))} kWh/kWp/yr`, color: "#f97316", bar: num(get(sd, "resource", "pvout")) / 2000 },
                      { label: "LTDI",   value: str(get(sd, "resource", "ltdi")), color: "#fdba74", bar: num(get(sd, "resource", "ltdi")) },
                    ].map(({ label, value, color, bar }) => (
                      <div key={label}>
                        <div className="flex justify-between items-baseline mb-1.5">
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">{label}</span>
                          <span className="text-sm font-black text-white">{value}</span>
                        </div>
                        <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                          <motion.div className="h-full rounded-full" style={{ background: color }}
                            initial={{ width: 0 }} animate={{ width: `${Math.min(bar * 100, 100)}%` }}
                            transition={{ duration: 1.2, delay: 0.2 }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Monthly bar chart */}
              {monthlySolarData.length > 0 && (
                <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
                  <div className="px-8 pt-8 pb-3">
                    <div className="text-sm font-semibold text-slate-800">Monthly Generation Profile</div>
                    <div className="text-xs text-slate-400 mt-0.5">GSA Long-Term Climatology · kWh / kWp per month</div>
                  </div>
                  <div className="px-4 pb-4 h-[240px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={monthlySolarData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 900, fill: "#94a3b8" }} />
                        <YAxis hide />
                        <Tooltip cursor={{ fill: "#fef3c7", radius: 8 }} contentStyle={{ borderRadius: "16px", border: "none", padding: "12px 16px", fontSize: 11 }} />
                        <Bar dataKey="pvout" name="PV Output" radius={[10, 10, 0, 0]}>
                          {monthlySolarData.map((_, i) => <Cell key={i} fill={`hsl(${38 - i},${82 + i}%,${52 + i * 1.5}%)`} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="grid grid-cols-4 border-t border-slate-100">
                    {[
                      { label: "GHI",   value: str(get(sd, "resource", "ghi")),   unit: "kWh/m²/yr",    color: "text-amber-500"  },
                      { label: "PVOUT", value: str(get(sd, "resource", "pvout")),  unit: "kWh/kWp/yr",   color: "text-orange-500" },
                      { label: "DNI",   value: str(get(sd, "resource", "dni")),    unit: "kWh/m²/yr",    color: "text-yellow-600" },
                      { label: "Grade", value: str(get(sd, "resource", "grade")),  unit: str(get(sd, "resource", "label")), color: "text-rose-500" },
                    ].map((p, i) => (
                      <div key={p.label} className={`px-6 py-5 text-center ${i < 3 ? "border-r border-slate-100" : ""}`}>
                        <div className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">{p.label}</div>
                        <div className={`text-xl font-bold ${p.color}`}>{p.value}</div>
                        <div className="text-xs text-slate-300 font-medium mt-1">{p.unit}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* ════ WATER / HYDROLOGY TAB ════ */}
          {activeTab === "water" && (
            <motion.div key="water" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-12">

              {/* Hero banner */}
              <div className="relative rounded-[3rem] overflow-hidden bg-gradient-to-br from-slate-900 via-blue-950 to-cyan-950 p-10 shadow-2xl">
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                  {[0, 1, 2].map(i => (
                    <motion.div key={i} className="absolute rounded-full border border-cyan-500/20"
                      style={{ width: 300 + i * 180, height: 300 + i * 180, top: "50%", left: "60%", x: "-50%", y: "-50%" }}
                      animate={{ scale: [1, 1.15, 1], opacity: [0.3, 0.05, 0.3] }}
                      transition={{ duration: 3 + i, repeat: Infinity, delay: i * 0.8 }} />
                  ))}
                </div>
                <div className="relative z-10 grid grid-cols-1 lg:grid-cols-3 gap-10 items-center">
                  {/* Supply index */}
                  <div className="flex flex-col items-center gap-6">
                    <div className="text-[9px] font-black text-sky-400/70 uppercase tracking-[0.3em] mb-2 text-center">Hydrology Index</div>
                    {(() => {
                      const score = num(waterData.composite_risk_score);
                      const pct = Math.min(score / 100, 1);
                      const r = 52; const circ = Math.PI * r;
                      const dash = pct * circ;
                      const col = score >= 60 ? "#22c55e" : score >= 40 ? "#f59e0b" : "#ef4444";
                      return (
                        <div className="relative w-44 h-24 flex items-end justify-center">
                          <svg viewBox="0 0 120 65" className="w-full">
                            <path d="M10 60 A52 52 0 0 1 110 60" fill="none" stroke="#1e3a5f" strokeWidth="10" strokeLinecap="round" />
                            <motion.path d="M10 60 A52 52 0 0 1 110 60" fill="none" stroke={col} strokeWidth="10" strokeLinecap="round"
                              strokeDasharray={`${dash} ${circ}`}
                              initial={{ strokeDasharray: `0 ${circ}` }}
                              animate={{ strokeDasharray: `${dash} ${circ}` }}
                              transition={{ duration: 1.4, ease: "easeOut" }} />
                          </svg>
                          <div className="absolute inset-0 flex flex-col items-center justify-end pb-1">
                            <div className="text-4xl font-black tracking-tighter leading-none" style={{ color: col }}>{score}</div>
                            <div className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mt-0.5">Supply Index</div>
                          </div>
                        </div>
                      );
                    })()}
                    <div className="text-[10px] font-black uppercase tracking-[0.2em] px-5 py-2 rounded-full border text-cyan-400 border-cyan-400/20 bg-cyan-400/10">
                      {str(waterData.interpretation)}
                    </div>
                  </div>

                  {/* Metric bars */}
                  <div className="space-y-5 col-span-1">
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Hydrology Fingerprint</div>
                    {[
                      { label: "GRACE Anomaly", val: Math.abs(num(waterData.grace_anomaly)), max: 50, unit: "cm LWE", col: "#34d399" },
                      { label: "PDSI Index",    val: Math.abs(num(waterData.pdsi)),         max: 6,  unit: "index",   col: "#818cf8" },
                    ].map(({ label, val, max, unit, col }) => (
                      <div key={label}>
                        <div className="flex justify-between items-center mb-1.5">
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{label}</span>
                          <span className="text-xs font-black" style={{ color: col }}>{val.toFixed(2)} <span className="text-slate-500 font-bold text-[9px]">{unit}</span></span>
                        </div>
                        <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                          <motion.div className="h-full rounded-full" style={{ background: col }}
                            initial={{ width: 0 }} animate={{ width: `${Math.min(val / max * 100, 100)}%` }}
                            transition={{ duration: 1, ease: "easeOut" }} />
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* KPI tiles */}
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { label: "GRACE", val: str(waterData.grace_anomaly), unit: "cm LWE", col: "from-cyan-600 to-blue-700" },
                      { label: "PDSI",  val: str(waterData.pdsi),          unit: "index",  col: "from-indigo-600 to-violet-700" },
                      { label: "Score", val: str(waterData.composite_risk_score), unit: "/100", col: "from-emerald-600 to-teal-700" },
                      { label: "Status", val: str(waterData.interpretation, "—").slice(0, 14), unit: "", col: "from-slate-600 to-slate-700" },
                    ].map(({ label, val, unit, col }) => (
                      <div key={label} className={`bg-gradient-to-br ${col} p-5 rounded-[1.5rem] shadow-xl text-white relative overflow-hidden`}>
                        <div className="absolute inset-0 bg-white/5" />
                        <div className="text-[8px] font-black uppercase tracking-widest opacity-70 mb-2">{label}</div>
                        <div className="text-base font-black leading-tight relative z-10">{val}</div>
                        {unit && <div className="text-[8px] font-bold opacity-60 mt-1">{unit}</div>}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Summary metadata card */}
              <div className="bg-white border border-slate-100 rounded-2xl p-8 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2.5 bg-blue-50 border border-blue-100 rounded-xl text-blue-500"><Droplets size={18} /></div>
                  <div>
                    <h2 className="text-base font-semibold text-slate-800">Water Resource Summary</h2>
                    <p className="text-xs text-slate-400 mt-0.5">NASA GRACE · GRIDMET PDSI</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: "GRACE Anomaly", value: str(waterData.grace_anomaly), unit: "cm LWE", color: "text-cyan-600", bg: "bg-cyan-50", border: "border-cyan-100" },
                    { label: "PDSI",          value: str(waterData.pdsi),          unit: "index",  color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-100" },
                    { label: "Composite",     value: str(waterData.composite_risk_score), unit: "/100", color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-100" },
                    { label: "Interpretation", value: str(waterData.interpretation, "No data").split(" ").slice(0, 2).join(" "), unit: "", color: "text-slate-700", bg: "bg-slate-50", border: "border-slate-100" },
                  ].map(({ label, value, unit, color, bg, border }) => (
                    <div key={label} className={`${bg} border ${border} rounded-xl p-5 flex flex-col gap-1.5`}>
                      <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">{label}</span>
                      <div className={`text-2xl font-bold ${color}`}>{value}</div>
                      {unit && <div className="text-xs font-medium text-slate-400">{unit}</div>}
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </main>
    </motion.div>
  );
}

