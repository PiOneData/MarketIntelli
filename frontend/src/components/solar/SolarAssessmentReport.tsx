import { useState, useEffect, useRef } from "react";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  ReferenceLine,
  Area,
  AreaChart,
} from "recharts";

export interface SiteData {
  location: string;
  coordinates: string;
  state: string;
  analysisPeriod: string;
  elevation: string;
  terrain: string;
  overallRating: string;
  irradiance: number; // kWh/m²/yr
  dailyAvg: number; // kWh/m²/day
  cloudCover: number; // %
  maxTemp: number; // °C
  avgTemp: number; // °C
  aod: number;
  meanWindSpeed: number; // m/s
  maxWindSpeed: number; // m/s
  annualRainfall: number; // mm
  humidity: number; // %
  degradationRate: number; // %/yr
  yieldConservative: number;
  yieldExpected: number;
  yieldOptimistic: number;
}

const DEFAULT_SITE: SiteData = {
  location: "Atmakur",
  coordinates: "14° 37' N, 79° 40' E",
  state: "Andhra Pradesh",
  analysisPeriod: "January 2023 – January 2025 (2 years)",
  elevation: "121m ASL",
  terrain: "Nearly flat (2.5° slope), south-facing orientation",
  overallRating: "HIGHLY SUITABLE",
  irradiance: 1916,
  dailyAvg: 5.25,
  cloudCover: 56,
  maxTemp: 46.3,
  avgTemp: 28.6,
  aod: 0.513,
  meanWindSpeed: 3.07,
  maxWindSpeed: 9.55,
  annualRainfall: 818,
  humidity: 63,
  degradationRate: 0.5,
  yieldConservative: 1650,
  yieldExpected: 1750,
  yieldOptimistic: 1850,
};

const SEASON_DATA = [
  { season: "Winter (Nov–Feb)", months: "Nov – Feb", performance: 97, irradiance: 72, temp: 20.3, label: "95–100%", color: "#2563eb", icon: "❄️", bg: "linear-gradient(135deg,#dbeafe,#bfdbfe)" },
  { season: "Summer (Mar–May)", months: "Mar – May", performance: 88, irradiance: 100, temp: 38.4, label: "85–92%", color: "#d97706", icon: "☀️", bg: "linear-gradient(135deg,#fef3c7,#fde68a)" },
  { season: "Monsoon (Jun–Sep)", months: "Jun – Sep", performance: 75, irradiance: 60, temp: 28, label: "70–80%", color: "#0f766e", icon: "🌧️", bg: "linear-gradient(135deg,#d1fae5,#a7f3d0)" },
  { season: "Post-Monsoon (Oct)", months: "October", performance: 92, irradiance: 85, temp: 24, label: "90–95%", color: "#7c3aed", icon: "🍂", bg: "linear-gradient(135deg,#ede9fe,#ddd6fe)" },
];

const DEGRADATION_DATA = Array.from({ length: 26 }, (_, i) => ({
  year: `Y${i}`,
  performance: parseFloat(Math.max(0, 100 - i * 0.5).toFixed(1)),
  lower: parseFloat(Math.max(0, 100 - i * 0.65).toFixed(1)),
  upper: parseFloat(Math.max(0, 100 - i * 0.35).toFixed(1)),
}));

const RADAR_DATA = [
  { metric: "Irradiance", value: 90 },
  { metric: "Temperature\nManagement", value: 65 },
  { metric: "Wind Safety", value: 95 },
  { metric: "Terrain", value: 88 },
  { metric: "Low Humidity\nRisk", value: 78 },
  { metric: "Low Soiling\nRisk", value: 62 },
];

const RISK_DATA = [
  {
    factor: "High temperature losses",
    severity: "Moderate",
    severityLevel: 2,
    mitigation: "Low-temp-coefficient modules, enhanced ventilation",
    color: "#f59e0b",
  },
  {
    factor: "Soiling from dust",
    severity: "Moderate-High",
    severityLevel: 3,
    mitigation: "Automated/scheduled cleaning, anti-soiling coatings",
    color: "#ef4444",
  },
  {
    factor: "Monsoon flooding",
    severity: "Low",
    severityLevel: 1,
    mitigation: "Proper site grading, elevated equipment pads",
    color: "#22c55e",
  },
  {
    factor: "Equipment overheating",
    severity: "Moderate",
    severityLevel: 2,
    mitigation: "Derating, active/passive cooling for inverters",
    color: "#f59e0b",
  },
  {
    factor: "PID degradation",
    severity: "Low",
    severityLevel: 1,
    mitigation: "Standard modules sufficient per site conditions",
    color: "#22c55e",
  },
  {
    factor: "Wind damage",
    severity: "Very Low",
    severityLevel: 0,
    mitigation: "Standard IEC 61215 adequate",
    color: "#16a34a",
  },
  {
    factor: "Hail damage",
    severity: "Low",
    severityLevel: 1,
    mitigation: "No hail days recorded; standard glass sufficient",
    color: "#22c55e",
  },
];

const YIELD_DATA = [
  { scenario: "Conservative", yield: 1650, fill: "#94a3b8" },
  { scenario: "Expected", yield: 1750, fill: "#0f766e" },
  { scenario: "Optimistic", yield: 1850, fill: "#f59e0b" },
];

const MONTH_DATA = [
  { month: "Jan", irradiance: 5.8, temp: 22, rainfall: 5 },
  { month: "Feb", irradiance: 6.2, temp: 25, rainfall: 8 },
  { month: "Mar", irradiance: 6.8, temp: 31, rainfall: 10 },
  { month: "Apr", irradiance: 6.5, temp: 36, rainfall: 15 },
  { month: "May", irradiance: 6.0, temp: 38, rainfall: 20 },
  { month: "Jun", irradiance: 4.8, temp: 31, rainfall: 120 },
  { month: "Jul", irradiance: 4.2, temp: 28, rainfall: 190 },
  { month: "Aug", irradiance: 4.5, temp: 28, rainfall: 180 },
  { month: "Sep", irradiance: 4.9, temp: 29, rainfall: 130 },
  { month: "Oct", irradiance: 5.5, temp: 27, rainfall: 60 },
  { month: "Nov", irradiance: 5.6, temp: 23, rainfall: 30 },
  { month: "Dec", irradiance: 5.4, temp: 20, rainfall: 5 },
];

const SEVERITY_COLORS: Record<number, string> = {
  0: "#16a34a",
  1: "#22c55e",
  2: "#f59e0b",
  3: "#ef4444",
  4: "#dc2626",
};

const SEVERITY_LABELS: Record<number, string> = {
  0: "Very Low",
  1: "Low",
  2: "Moderate",
  3: "Moderate-High",
  4: "High",
};

type ReportSection =
  | "executive"
  | "solar-resource"
  | "environmental"
  | "seasonal"
  | "degradation"
  | "system-design"
  | "risk"
  | "economic";

// ─── Animation hooks ──────────────────────────────────────────

function useCountUp(target: number, decimals = 0, duration = 1400): string {
  const [val, setVal] = useState(0);
  const raf = useRef<number>(0);
  useEffect(() => {
    setVal(0);
    if (target === 0) return;
    let t0: number | null = null;
    const step = (ts: number) => {
      if (!t0) t0 = ts;
      const p = Math.min((ts - t0) / duration, 1);
      setVal(target * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf.current = requestAnimationFrame(step);
      else setVal(target);
    };
    raf.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf.current);
  }, [target, duration]);
  return val.toFixed(decimals);
}

// ─── Animated SVG ring ────────────────────────────────────────

function AnimatedRing({ pct, color, label }: { pct: number; color: string; label: string }) {
  const [live, setLive] = useState(0);
  useEffect(() => {
    setLive(0);
    const t = setTimeout(() => setLive(pct), 220);
    return () => clearTimeout(t);
  }, [pct]);
  const r = 30, circ = 2 * Math.PI * r;
  return (
    <div className="sar-ring-wrap">
      <svg width="84" height="84" viewBox="0 0 84 84">
        <circle cx="42" cy="42" r={r} fill="none" stroke="#e5e7eb" strokeWidth="9" />
        <circle cx="42" cy="42" r={r} fill="none" stroke={color} strokeWidth="9"
          strokeDasharray={`${(live / 100) * circ} ${circ}`}
          strokeLinecap="round" transform="rotate(-90 42 42)"
          style={{ transition: "stroke-dasharray 1.6s cubic-bezier(0.34,1.3,0.64,1)" }} />
        <text x="42" y="38" textAnchor="middle" fontSize="14" fontWeight="800" fill={color}>{pct}%</text>
        <text x="42" y="51" textAnchor="middle" fontSize="9" fill="#9ca3af">capacity</text>
      </svg>
      <p className="sar-ring-label">{label}</p>
    </div>
  );
}

// ─── Animated progress bar ────────────────────────────────────

function AnimatedBar({ pct, color = "#0f766e", label, delay = 0 }: {
  pct: number; color?: string; label: string; delay?: number;
}) {
  const [w, setW] = useState(0);
  useEffect(() => {
    setW(0);
    const t = setTimeout(() => setW(pct), 320 + delay);
    return () => clearTimeout(t);
  }, [pct, delay]);
  return (
    <div className="sar-anim-bar-track">
      <div className="sar-anim-bar-fill" style={{
        width: `${w}%`,
        background: `linear-gradient(90deg,${color},${color}bb)`,
        transition: `width 1.4s cubic-bezier(0.34,1.1,0.64,1) ${delay}ms`,
      }}>
        <span className="sar-anim-bar-text">{label}</span>
      </div>
    </div>
  );
}

// ─── Animated severity bar ────────────────────────────────────

function AnimatedSeverityBar({ level, delay = 0 }: { level: number; delay?: number }) {
  const [filled, setFilled] = useState(-1);
  useEffect(() => {
    setFilled(-1);
    const t = setTimeout(() => setFilled(level), 150 + delay);
    return () => clearTimeout(t);
  }, [level, delay]);
  return (
    <div className="sar-severity-bar">
      {[0, 1, 2, 3, 4].map((i) => (
        <div key={i} className="sar-severity-segment" style={{
          background: i <= filled ? SEVERITY_COLORS[level] : "var(--color-gray-200,#e5e7eb)",
          transition: `background 0.22s ease ${i * 65}ms`,
          transform: i <= filled ? "scaleY(1.2)" : "scaleY(1)",
        }} />
      ))}
    </div>
  );
}

// ─── Animated yield number ────────────────────────────────────

function AnimatedYield({ target }: { target: number }) {
  const [v, setV] = useState(0);
  const raf = useRef<number>(0);
  useEffect(() => {
    setV(0);
    let t0: number | null = null;
    const id = setTimeout(() => {
      const step = (ts: number) => {
        if (!t0) t0 = ts;
        const p = Math.min((ts - t0) / 1500, 1);
        setV(Math.floor(target * (1 - Math.pow(1 - p, 3))));
        if (p < 1) raf.current = requestAnimationFrame(step);
        else setV(target);
      };
      raf.current = requestAnimationFrame(step);
    }, 250);
    return () => { clearTimeout(id); cancelAnimationFrame(raf.current); };
  }, [target]);
  return <span className="sar-yield-value">{v.toLocaleString()}</span>;
}

// ─── Suitability ring (header panel) ─────────────────────────

function SuitabilityRing() {
  const [live, setLive] = useState(0);
  useEffect(() => { const t = setTimeout(() => setLive(90), 300); return () => clearTimeout(t); }, []);
  const r = 42, circ = 2 * Math.PI * r;
  return (
    <svg width="110" height="110" viewBox="0 0 110 110">
      <circle cx="55" cy="55" r={r} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="10" />
      <circle cx="55" cy="55" r={r} fill="none" stroke="#fbbf24" strokeWidth="10"
        strokeDasharray={`${(live / 100) * circ} ${circ}`}
        strokeLinecap="round" transform="rotate(-90 55 55)"
        style={{ transition: "stroke-dasharray 1.8s cubic-bezier(0.34,1.2,0.64,1)" }} />
      <text x="55" y="48" textAnchor="middle" fontSize="10" fill="rgba(255,255,255,0.65)">HIGHLY</text>
      <text x="55" y="62" textAnchor="middle" fontSize="10" fontWeight="800" fill="#fbbf24">SUITABLE</text>
    </svg>
  );
}

// ─── Performance ratio bar ────────────────────────────────────

function PRBar() {
  const [w, setW] = useState(0);
  useEffect(() => { const t = setTimeout(() => setW(77.5), 400); return () => clearTimeout(t); }, []);
  return (
    <div>
      <div className="sar-pr-track">
        <div className="sar-pr-fill" style={{ width: `${w}%`, transition: "width 1.6s cubic-bezier(0.34,1.1,0.64,1)" }}>
          <span>75–80% PR · Industry-standard for inland India</span>
        </div>
      </div>
      <div className="sar-pr-markers"><span>0%</span><span>25%</span><span>50%</span><span>75%</span><span>100%</span></div>
    </div>
  );
}

interface Props {
  site?: SiteData;
  onClose?: () => void;
  onDownload?: () => void;
}

function SectionNav({
  active,
  onChange,
}: {
  active: ReportSection;
  onChange: (s: ReportSection) => void;
}) {
  const sections: { id: ReportSection; label: string; icon: string }[] = [
    { id: "executive", label: "Executive Summary", icon: "📋" },
    { id: "solar-resource", label: "Solar Resource", icon: "☀️" },
    { id: "environmental", label: "Environmental", icon: "🌡️" },
    { id: "seasonal", label: "Seasonal Performance", icon: "📅" },
    { id: "degradation", label: "Degradation & Longevity", icon: "📉" },
    { id: "system-design", label: "System Design", icon: "⚙️" },
    { id: "risk", label: "Risk Assessment", icon: "⚠️" },
    { id: "economic", label: "Economic Indicators", icon: "💰" },
  ];
  return (
    <nav className="sar-section-nav">
      {sections.map((s) => (
        <button
          key={s.id}
          className={`sar-section-btn${active === s.id ? " sar-section-btn--active" : ""}`}
          onClick={() => onChange(s.id)}
        >
          <span className="sar-section-icon">{s.icon}</span>
          <span>{s.label}</span>
        </button>
      ))}
    </nav>
  );
}

function MetricBadge({ value, label, unit, color, decimals = 0, index = 0 }: {
  value: string | number; label: string; unit?: string; color?: string; decimals?: number; index?: number;
}) {
  const isNum = typeof value === "number";
  const animated = useCountUp(isNum ? (value as number) : 0, decimals);
  return (
    <div className="sar-metric-badge" style={{ borderColor: color || "var(--color-primary)", animationDelay: `${index * 85}ms` }}>
      <span className="sar-metric-value" style={{ color: color || "var(--color-primary)" }}>
        {isNum ? animated : value}{unit}
      </span>
      <span className="sar-metric-label">{label}</span>
    </div>
  );
}

function SeverityBar({ level }: { level: number }) {
  return <AnimatedSeverityBar level={level} />;
}

export function SolarAssessmentReport({ site = DEFAULT_SITE, onClose, onDownload }: Props) {
  const [activeSection, setActiveSection] = useState<ReportSection>("executive");
  const [expandedRisk, setExpandedRisk] = useState<string | null>(null);
  const [sectionKey, setSectionKey] = useState(0);
  const [headerReady, setHeaderReady] = useState(false);

  useEffect(() => { const t = setTimeout(() => setHeaderReady(true), 80); return () => clearTimeout(t); }, []);

  function handleSectionChange(s: ReportSection) {
    setActiveSection(s);
    setSectionKey((k) => k + 1);
    setExpandedRisk(null);
  }

  const suitabilityColor =
    site.overallRating === "HIGHLY SUITABLE"
      ? "#16a34a"
      : site.overallRating === "SUITABLE"
      ? "#0f766e"
      : "#f59e0b";

  return (
    <div className="sar-root">
      {/* Report Header */}
      <div className="sar-header">
        {/* Animated background rays */}
        <div className="sar-header-rays" aria-hidden>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="sar-ray" style={{ transform: `rotate(${i * 45}deg)`, animationDelay: `${i * 0.18}s` }} />
          ))}
        </div>

        <div className="sar-header-inner">
          <div className="sar-header-brand">
            <div className={`sar-header-icon${headerReady ? " sar-icon-loaded" : ""}`}>☀️</div>
            <div>
              <h1 className="sar-header-title">Solar Site Analysis Report</h1>
              <p className="sar-header-subtitle">MarketIntelli · Geo Analytics · Solar Assessment</p>
            </div>
          </div>
          <div className="sar-header-actions">
            <div className="sar-rating-badge sar-rating-pulse">
              <span className="sar-rating-dot" />
              {site.overallRating}
            </div>
            {onDownload && (
              <button className="sar-action-btn" onClick={onDownload}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/>
                </svg>
                Download PDF
              </button>
            )}
            {onClose && (
              <button className="sar-close-btn" onClick={onClose} aria-label="Close report">✕</button>
            )}
          </div>
        </div>
      </div>

      {/* Site Meta Bar */}
      <div className="sar-meta-bar">
        <div className="sar-meta-item">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
          <span><strong>{site.location}</strong>, {site.state}</span>
        </div>
        <div className="sar-meta-sep">·</div>
        <div className="sar-meta-item">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>
          <span>{site.analysisPeriod}</span>
        </div>
        <div className="sar-meta-sep">·</div>
        <div className="sar-meta-item">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>
          <span>{site.coordinates}</span>
        </div>
        <div className="sar-meta-sep">·</div>
        <div className="sar-meta-item">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 3H5a2 2 0 00-2 2v3m18 0V5a2 2 0 00-2-2h-3m0 18h3a2 2 0 002-2v-3M3 16v3a2 2 0 002 2h3"/></svg>
          <span>{site.elevation} · {site.terrain}</span>
        </div>
        <div className="sar-meta-sep">·</div>
        <div className="sar-meta-item sar-data-quality">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
          <span>100% Data Completeness</span>
        </div>
      </div>

      {/* Main Layout */}
      <div className="sar-body">
        <SectionNav active={activeSection} onChange={handleSectionChange} />

        <div className="sar-content">
          {/* EXECUTIVE SUMMARY */}
          {activeSection === "executive" && (
            <div key={`exec-${sectionKey}`} className="sar-section">
              <h2 className="sar-section-title">Executive Summary</h2>
              <div className="sar-exec-summary">
                <p className="sar-exec-text">
                  This location demonstrates <strong>strong solar potential</strong> with very good irradiance
                  levels ({site.dailyAvg} kWh/m²/day) and optimal terrain characteristics. The site faces
                  typical inland peninsular challenges including high temperatures, seasonal monsoons, and
                  elevated dust levels, but these are manageable with appropriate system design.
                  Standard-grade equipment with bi-weekly cleaning protocols will perform well here.
                </p>
              </div>

              <div className="sar-kpi-grid">
                <MetricBadge value={site.dailyAvg} decimals={2} unit=" kWh/m²/day" label="Daily Avg Irradiance" color="#0f766e" index={0} />
                <MetricBadge value={site.irradiance} decimals={0} unit=" kWh/m²/yr" label="Annual GHI" color="#0d5f59" index={1} />
                <MetricBadge value={site.maxTemp} decimals={1} unit="°C" label="Peak Temperature" color="#ef4444" index={2} />
                <MetricBadge value={site.aod} decimals={3} label="Aerosol Optical Depth" color="#f59e0b" index={3} />
                <MetricBadge value={site.meanWindSpeed} decimals={2} unit=" m/s" label="Mean Wind Speed" color="#2563eb" index={4} />
                <MetricBadge value={site.annualRainfall} decimals={0} unit=" mm/yr" label="Annual Rainfall" color="#0891b2" index={5} />
                <MetricBadge value={site.humidity} decimals={0} unit="%" label="Mean Humidity" color="#7c3aed" index={6} />
                <MetricBadge value={`${site.degradationRate}%`} unit="/yr" label="Degradation Rate" color="#475569" index={7} />
              </div>

              <div className="sar-suitability-panel">
                <div className="sar-suitability-left">
                  <SuitabilityRing />
                  <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 11, marginTop: 6 }}>for commercial solar development</p>
                </div>
                <div className="sar-suitability-right">
                  <div className="sar-strengths">
                    <h4>Key Strengths</h4>
                    <ul>
                      <li>Outstanding solar resource (top 25% in India)</li>
                      <li>Ideal topography and south-facing orientation</li>
                      <li>Manageable environmental stressors</li>
                      <li>Standard equipment requirements (lower CAPEX)</li>
                      <li>Inland location eliminates corrosion concerns</li>
                      <li>Favorable PID conditions</li>
                    </ul>
                  </div>
                  <div className="sar-challenges">
                    <h4>Active Management Needed</h4>
                    <ul>
                      <li>Temperature-induced losses during summer peak</li>
                      <li>Dust accumulation — regular cleaning required</li>
                      <li>Monsoon drainage planning</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="sar-chart-card" style={{ marginTop: 16 }}>
                <h3 className="sar-chart-title">Site Performance Radar</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <RadarChart data={RADAR_DATA} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
                    <PolarGrid stroke="var(--color-gray-200,#e5e7eb)" />
                    <PolarAngleAxis dataKey="metric" tick={{ fontSize: 12, fill: "var(--color-gray-600,#4b5563)" }} />
                    <Radar name="Score" dataKey="value" stroke="#0f766e" fill="#0f766e" fillOpacity={0.3}
                      isAnimationActive animationDuration={1200} animationEasing="ease-out" />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* SOLAR RESOURCE */}
          {activeSection === "solar-resource" && (
            <div key={`sr-${sectionKey}`} className="sar-section">
              <h2 className="sar-section-title">Solar Resource Assessment</h2>

              <div className="sar-info-cards">
                <div className="sar-info-card sar-info-card--green">
                  <h4>Irradiance Category</h4>
                  <div className="sar-info-value">Very Good</div>
                  <p>1,916 kWh/m²/year GHI — top 25% in India</p>
                </div>
                <div className="sar-info-card sar-info-card--amber">
                  <h4>Cloud Cover</h4>
                  <div className="sar-info-value">56% mean / 66% median</div>
                  <p>Moderate atmospheric attenuation, typical for zone</p>
                </div>
                <div className="sar-info-card sar-info-card--blue">
                  <h4>Terrain Advantage</h4>
                  <div className="sar-info-value">South-Southeast 157°</div>
                  <p>Natural aspect eliminates grading/specialized mounting</p>
                </div>
              </div>

              <div className="sar-chart-card">
                <h3>Monthly Irradiance Profile (kWh/m²/day)</h3>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={MONTH_DATA} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-gray-100)" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis domain={[0, 8]} tick={{ fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{ fontSize: 12, borderRadius: 8 }}
                      formatter={(v: number) => [`${v} kWh/m²/day`, "Irradiance"]}
                    />
                    <Bar dataKey="irradiance" name="Irradiance" radius={[4, 4, 0, 0]}>
                      {MONTH_DATA.map((entry, idx) => (
                        <Cell
                          key={idx}
                          fill={
                            ["Jun", "Jul", "Aug", "Sep"].includes(entry.month)
                              ? "#94a3b8"
                              : entry.irradiance >= 6.5
                              ? "#f59e0b"
                              : "#0f766e"
                          }
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <div className="sar-chart-legend">
                  <span><span className="sar-legend-dot" style={{ background: "#f59e0b" }} />Peak summer irradiance</span>
                  <span><span className="sar-legend-dot" style={{ background: "#0f766e" }} />Normal months</span>
                  <span><span className="sar-legend-dot" style={{ background: "#94a3b8" }} />Monsoon months</span>
                </div>
              </div>

              <div className="sar-highlight-box">
                <strong>Key Strength:</strong> South-southeast aspect (157°) on nearly flat terrain creates
                optimal tilt conditions for year-round energy capture. The daily average of {site.dailyAvg} kWh/m²/day
                is comparable to India's best solar zones. Despite {site.cloudCover}% mean cloud cover, annual
                irradiance remains strong due to high sun angles and clear winter/summer months.
              </div>
            </div>
          )}

          {/* ENVIRONMENTAL */}
          {activeSection === "environmental" && (
            <div key={`env-${sectionKey}`} className="sar-section">
              <h2 className="sar-section-title">Environmental Challenges & Mitigation</h2>

              <div className="sar-env-grid">
                {/* Temperature */}
                <div className="sar-env-card" style={{ animationDelay: "0ms" }}>
                  <div className="sar-env-card-header" style={{ background: "linear-gradient(135deg, #fef3c7, #fde68a)" }}>
                    <span className="sar-env-icon">🌡️</span>
                    <h3>Temperature Management</h3>
                    <span className="sar-env-badge sar-env-badge--moderate">Moderate Risk</span>
                  </div>
                  <div className="sar-env-body">
                    <div className="sar-env-stat-row">
                      <div className="sar-env-stat">
                        <span className="sar-env-stat-val" style={{ color: "#ef4444" }}>{site.maxTemp}°C</span>
                        <span className="sar-env-stat-lbl">Absolute Max</span>
                      </div>
                      <div className="sar-env-stat">
                        <span className="sar-env-stat-val" style={{ color: "#f59e0b" }}>38</span>
                        <span className="sar-env-stat-lbl">Days &gt;40°C/yr</span>
                      </div>
                      <div className="sar-env-stat">
                        <span className="sar-env-stat-val" style={{ color: "#0f766e" }}>{site.avgTemp}°C</span>
                        <span className="sar-env-stat-lbl">Annual Avg</span>
                      </div>
                    </div>
                    <ul className="sar-env-list">
                      <li>~8.5% output loss during peak temperature periods (Mar–May)</li>
                      <li>Opt for modules with ≤ −0.35%/°C temperature coefficient</li>
                      <li>Minimum 150mm rear clearance for convective cooling</li>
                      <li>18°C seasonal swing (summer 38.4°C vs winter 20.3°C)</li>
                      <li>9.9°C daily thermal cycling — normal stress, no specialist materials</li>
                    </ul>
                  </div>
                </div>

                {/* Soiling */}
                <div className="sar-env-card" style={{ animationDelay: "80ms" }}>
                  <div className="sar-env-card-header" style={{ background: "linear-gradient(135deg, #fee2e2, #fecaca)" }}>
                    <span className="sar-env-icon">🌫️</span>
                    <h3>Soiling & Aerosol Loading</h3>
                    <span className="sar-env-badge sar-env-badge--high">Moderate-High Risk</span>
                  </div>
                  <div className="sar-env-body">
                    <div className="sar-env-stat-row">
                      <div className="sar-env-stat">
                        <span className="sar-env-stat-val" style={{ color: "#ef4444" }}>{site.aod}</span>
                        <span className="sar-env-stat-lbl">AOD Index</span>
                      </div>
                      <div className="sar-env-stat">
                        <span className="sar-env-stat-val" style={{ color: "#f59e0b" }}>108</span>
                        <span className="sar-env-stat-lbl">High-Dust Days/yr</span>
                      </div>
                      <div className="sar-env-stat">
                        <span className="sar-env-stat-val" style={{ color: "#dc2626" }}>2–4%</span>
                        <span className="sar-env-stat-lbl">Soiling Loss</span>
                      </div>
                    </div>
                    <ul className="sar-env-list">
                      <li>Agricultural dust, seasonal biomass burning, industrial emissions</li>
                      <li>Bi-weekly cleaning (minimum); weekly during Mar–May</li>
                      <li>Consider hydrophobic anti-soiling glass coatings</li>
                      <li>Automated dry-cleaning or manual wash schedules</li>
                      <li>Budget for water supply/storage for wet cleaning operations</li>
                    </ul>
                  </div>
                </div>

                {/* Precipitation */}
                <div className="sar-env-card" style={{ animationDelay: "160ms" }}>
                  <div className="sar-env-card-header" style={{ background: "linear-gradient(135deg, #dbeafe, #bfdbfe)" }}>
                    <span className="sar-env-icon">🌧️</span>
                    <h3>Precipitation Patterns</h3>
                    <span className="sar-env-badge sar-env-badge--low">Low Risk</span>
                  </div>
                  <div className="sar-env-body">
                    <div className="sar-env-stat-row">
                      <div className="sar-env-stat">
                        <span className="sar-env-stat-val" style={{ color: "#2563eb" }}>{site.annualRainfall}</span>
                        <span className="sar-env-stat-lbl">mm Annual</span>
                      </div>
                      <div className="sar-env-stat">
                        <span className="sar-env-stat-val" style={{ color: "#0891b2" }}>95%</span>
                        <span className="sar-env-stat-lbl">Jun–Sep Rainfall</span>
                      </div>
                      <div className="sar-env-stat">
                        <span className="sar-env-stat-val" style={{ color: "#0f766e" }}>128</span>
                        <span className="sar-env-stat-lbl">Max mm/Day</span>
                      </div>
                    </div>
                    <ul className="sar-env-list">
                      <li>Natural panel cleaning during monsoon reduces Q3-Q4 maintenance</li>
                      <li>Heavy events (up to 128mm/day, 2 events/yr) — robust drainage required</li>
                      <li>Only 46mm outside monsoon across 8 months — active cleaning needed</li>
                      <li>Design for 130mm+ events with adequate site grading</li>
                    </ul>
                  </div>
                </div>

                {/* Humidity & PID */}
                <div className="sar-env-card" style={{ animationDelay: "240ms" }}>
                  <div className="sar-env-card-header" style={{ background: "linear-gradient(135deg, #d1fae5, #a7f3d0)" }}>
                    <span className="sar-env-icon">💧</span>
                    <h3>Humidity & PID Risk</h3>
                    <span className="sar-env-badge sar-env-badge--low">Favorable</span>
                  </div>
                  <div className="sar-env-body">
                    <div className="sar-env-stat-row">
                      <div className="sar-env-stat">
                        <span className="sar-env-stat-val" style={{ color: "#0f766e" }}>{site.humidity}%</span>
                        <span className="sar-env-stat-lbl">Mean RH</span>
                      </div>
                      <div className="sar-env-stat">
                        <span className="sar-env-stat-val" style={{ color: "#64748b" }}>28–96%</span>
                        <span className="sar-env-stat-lbl">RH Range</span>
                      </div>
                      <div className="sar-env-stat">
                        <span className="sar-env-stat-val" style={{ color: "#16a34a" }}>✓ OK</span>
                        <span className="sar-env-stat-lbl">PID Status</span>
                      </div>
                    </div>
                    <ul className="sar-env-list">
                      <li>PID conditions confirmed favorable — no enhanced PID modules needed</li>
                      <li>Standard PV modules acceptable (cost savings opportunity)</li>
                      <li>Conventional inverter grounding schemes sufficient</li>
                    </ul>
                  </div>
                </div>

                {/* Wind */}
                <div className="sar-env-card" style={{ animationDelay: "320ms" }}>
                  <div className="sar-env-card-header" style={{ background: "linear-gradient(135deg, #ede9fe, #ddd6fe)" }}>
                    <span className="sar-env-icon">💨</span>
                    <h3>Wind & Structural</h3>
                    <span className="sar-env-badge sar-env-badge--verylow">Very Low Risk</span>
                  </div>
                  <div className="sar-env-body">
                    <div className="sar-env-stat-row">
                      <div className="sar-env-stat">
                        <span className="sar-env-stat-val" style={{ color: "#7c3aed" }}>{site.meanWindSpeed} m/s</span>
                        <span className="sar-env-stat-lbl">Mean Wind</span>
                      </div>
                      <div className="sar-env-stat">
                        <span className="sar-env-stat-val" style={{ color: "#6d28d9" }}>{site.maxWindSpeed} m/s</span>
                        <span className="sar-env-stat-lbl">Max Observed</span>
                      </div>
                      <div className="sar-env-stat">
                        <span className="sar-env-stat-val" style={{ color: "#16a34a" }}>0</span>
                        <span className="sar-env-stat-lbl">Days &gt;15 m/s</span>
                      </div>
                    </div>
                    <ul className="sar-env-list">
                      <li>Standard IEC 61215 certification adequate</li>
                      <li>No enhanced wind-loading requirements needed</li>
                      <li>Lower-cost fixed-tilt racking systems appropriate</li>
                      <li>Review cyclone tracks if within 100km coastal paths</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="sar-chart-card">
                <h3>Monthly Temperature & Rainfall Pattern</h3>
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={MONTH_DATA} margin={{ top: 10, right: 30, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-gray-100)" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis yAxisId="temp" domain={[0, 50]} tick={{ fontSize: 12 }} label={{ value: "°C", angle: -90, position: "insideLeft", style: { fontSize: 11 } }} />
                    <YAxis yAxisId="rain" orientation="right" domain={[0, 250]} tick={{ fontSize: 12 }} label={{ value: "mm", angle: 90, position: "insideRight", style: { fontSize: 11 } }} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                    <Legend />
                    <ReferenceLine yAxisId="temp" y={40} stroke="#ef4444" strokeDasharray="3 3" label={{ value: "40°C threshold", position: "right", fontSize: 10 }} />
                    <Line yAxisId="temp" type="monotone" dataKey="temp" name="Temp (°C)" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} />
                    <Line yAxisId="rain" type="monotone" dataKey="rainfall" name="Rainfall (mm)" stroke="#2563eb" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* SEASONAL */}
          {activeSection === "seasonal" && (
            <div key={`sea-${sectionKey}`} className="sar-section">
              <h2 className="sar-section-title">Seasonal Performance Modeling</h2>

              <div className="sar-seasonal-grid">
                {SEASON_DATA.map((s, i) => (
                  <div key={s.season} className="sar-season-card" style={{ animationDelay: `${i * 100}ms` }}>
                    <div className="sar-season-header" style={{ background: s.bg }}>
                      <span className="sar-season-icon">{s.icon}</span>
                      <div>
                        <h3 style={{ margin: 0, fontSize: 13, fontWeight: 700 }}>{s.season}</h3>
                        <p style={{ margin: 0, fontSize: 11, opacity: 0.7 }}>{s.months}</p>
                      </div>
                    </div>
                    <div className="sar-season-body">
                      <AnimatedRing pct={s.performance} color={s.color} label={`Expected: ${s.label}`} />
                      <div className="sar-season-stats">
                        <div className="sar-season-stat">
                          <span>Avg Temp</span>
                          <strong style={{ color: s.color }}>{s.temp}°C</strong>
                        </div>
                        <div className="sar-season-stat">
                          <span>Irradiance Index</span>
                          <strong style={{ color: s.color }}>{s.irradiance}%</strong>
                        </div>
                      </div>
                      <div className="sar-season-insights">
                        {s.season === "Winter (Nov–Feb)" && (
                          <>
                            <span className="sar-pro">✓ Low temperatures, minimal soiling, low cloud cover</span>
                            <span className="sar-con">− Slightly lower sun angles</span>
                          </>
                        )}
                        {s.season === "Summer (Mar–May)" && (
                          <>
                            <span className="sar-pro">✓ Maximum irradiance, long daylight hours</span>
                            <span className="sar-con">− Peak temps (38.4°C avg, 46.3°C max), high dust</span>
                          </>
                        )}
                        {s.season === "Monsoon (Jun–Sep)" && (
                          <>
                            <span className="sar-pro">✓ Natural panel cleaning, cooler temperatures</span>
                            <span className="sar-con">− 66%+ cloud cover, 818mm rainfall</span>
                          </>
                        )}
                        {s.season === "Post-Monsoon (Oct)" && (
                          <>
                            <span className="sar-pro">✓ Clean panels, moderate temps, improving weather</span>
                            <span className="sar-con">− Transitional period</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="sar-chart-card">
                <h3>Seasonal Performance Comparison</h3>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={SEASON_DATA} margin={{ top: 10, right: 20, left: 0, bottom: 30 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-gray-100)" />
                    <XAxis dataKey="season" tick={{ fontSize: 11 }} angle={-20} textAnchor="end" />
                    <YAxis domain={[60, 100]} tick={{ fontSize: 12 }} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} formatter={(v: number) => [`${v}%`, "Performance"]} />
                    <Bar dataKey="performance" name="Performance %" radius={[6, 6, 0, 0]}>
                      {SEASON_DATA.map((_, idx) => (
                        <Cell key={idx} fill={["#2563eb", "#f59e0b", "#0f766e", "#7c3aed"][idx]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="sar-cleaning-schedule">
                <h3>Recommended Cleaning Schedule</h3>
                <div className="sar-cleaning-grid">
                  <div className="sar-cleaning-period sar-cleaning-period--biweekly">
                    <h4>Bi-Weekly</h4>
                    <p>Jan–Feb, Oct–Dec</p>
                    <small>Off-peak, low dust periods</small>
                  </div>
                  <div className="sar-cleaning-period sar-cleaning-period--weekly">
                    <h4>Weekly</h4>
                    <p>March – May</p>
                    <small>Peak dust loading season</small>
                  </div>
                  <div className="sar-cleaning-period sar-cleaning-period--monthly">
                    <h4>Monthly Only</h4>
                    <p>June – September</p>
                    <small>Natural cleaning by monsoon</small>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* DEGRADATION */}
          {activeSection === "degradation" && (
            <div key={`deg-${sectionKey}`} className="sar-section">
              <h2 className="sar-section-title">Degradation & Longevity Outlook</h2>

              <div className="sar-degrad-summary">
                <div className="sar-degrad-main">
                  <span className="sar-degrad-rate">{site.degradationRate}%</span>
                  <span className="sar-degrad-label">Environmental Stress Index (per year)</span>
                  <span className="sar-degrad-desc">Conservative estimate — below industry average</span>
                </div>
                <div className="sar-degrad-projections">
                  <h4 style={{ margin: "0 0 12px", fontSize: 12, fontWeight: 700, color: "var(--color-gray-700,#374151)" }}>Long-term Capacity Projections</h4>
                  {[
                    { year: "Year 10", pct: 95, color: "#0f766e", delay: 0 },
                    { year: "Year 15", pct: 92.5, color: "#0891b2", delay: 120 },
                    { year: "Year 20", pct: 90, color: "#7c3aed", delay: 240 },
                    { year: "Year 25", pct: 87.5, color: "#f59e0b", delay: 360 },
                  ].map((p) => (
                    <div key={p.year} className="sar-proj-item">
                      <span className="sar-proj-year">{p.year}</span>
                      <AnimatedBar pct={p.pct} color={p.color} label={`~${p.pct}% capacity`} delay={p.delay} />
                    </div>
                  ))}
                </div>
              </div>

              <div className="sar-chart-card">
                <h3 className="sar-chart-title">25-Year Performance Trajectory</h3>
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={DEGRADATION_DATA} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                    <defs>
                      <linearGradient id="degGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0f766e" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#0f766e" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-gray-100,#f3f4f6)" />
                    <XAxis dataKey="year" tick={{ fontSize: 11 }} interval={4} />
                    <YAxis domain={[80, 102]} tick={{ fontSize: 12 }} tickFormatter={(v) => `${v}%`} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} formatter={(v: number) => [`${v}%`, "Performance"]} />
                    <ReferenceLine y={80} stroke="#ef4444" strokeDasharray="4 4" label={{ value: "80% floor", position: "right", fontSize: 10 }} />
                    <Area type="monotone" dataKey="upper" stroke="none" fill="#0f766e" fillOpacity={0.08} isAnimationActive animationDuration={1600} />
                    <Area type="monotone" dataKey="performance" name="Expected" stroke="#0f766e" strokeWidth={2.5} fill="url(#degGrad)" isAnimationActive animationDuration={1400} />
                    <Area type="monotone" dataKey="lower" stroke="#94a3b8" strokeWidth={1.5} strokeDasharray="4 3" fill="none" isAnimationActive animationDuration={1600} />
                  </AreaChart>
                </ResponsiveContainer>
                <div className="sar-chart-legend">
                  <span><span className="sar-legend-dot" style={{ background: "#0f766e" }} />Expected trajectory</span>
                  <span><span className="sar-legend-dot" style={{ background: "#94a3b8" }} />±0.15%/yr confidence band</span>
                  <span><span className="sar-legend-dot" style={{ background: "#ef4444" }} />80% performance floor</span>
                </div>
              </div>

              <div className="sar-degrad-breakdown">
                <h3>Degradation Factor Breakdown</h3>
                <table className="sar-table">
                  <thead>
                    <tr>
                      <th>Factor</th>
                      <th>Contribution (%/yr)</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Base UV & Thermal Degradation</td>
                      <td className="sar-num">0.50%</td>
                      <td><span className="sar-badge sar-badge--neutral">Normal</span></td>
                    </tr>
                    <tr>
                      <td>Temperature (annual avg 28.6°C)</td>
                      <td className="sar-num">+0.00%</td>
                      <td><span className="sar-badge sar-badge--good">Within Range</span></td>
                    </tr>
                    <tr>
                      <td>Humidity (favorable PID conditions)</td>
                      <td className="sar-num">+0.00%</td>
                      <td><span className="sar-badge sar-badge--good">Favorable</span></td>
                    </tr>
                    <tr>
                      <td>Thermal Cycling (9.9°C daily swing)</td>
                      <td className="sar-num">+0.00%</td>
                      <td><span className="sar-badge sar-badge--good">Standard Stress</span></td>
                    </tr>
                    <tr>
                      <td>Coastal Salt Corrosion</td>
                      <td className="sar-num">+0.00%</td>
                      <td><span className="sar-badge sar-badge--good">N/A (Inland)</span></td>
                    </tr>
                    <tr className="sar-table-total">
                      <td><strong>Total Environmental Stress Index</strong></td>
                      <td className="sar-num"><strong>0.50%/yr</strong></td>
                      <td><span className="sar-badge sar-badge--primary">Conservative</span></td>
                    </tr>
                  </tbody>
                </table>
                <p className="sar-table-note">
                  * Projections assume Tier-1 modules, proper installation per manufacturer specs, adherence to recommended cleaning schedules,
                  and regular preventive maintenance. Actual degradation may vary ±0.15%/year.
                </p>
              </div>
            </div>
          )}

          {/* SYSTEM DESIGN */}
          {activeSection === "system-design" && (
            <div key={`sd-${sectionKey}`} className="sar-section">
              <h2 className="sar-section-title">System Design Recommendations</h2>

              <div className="sar-design-grid">
                <div className="sar-design-card" style={{ animationDelay: "0ms" }}>
                  <div className="sar-design-icon">🔋</div>
                  <h3>Module Selection</h3>
                  <ol className="sar-design-list">
                    <li>Low temperature coefficient (≤ −0.35%/°C)</li>
                    <li>Anti-soiling glass coatings</li>
                    <li>Standard PID resistance (cost savings)</li>
                    <li>Robust junction boxes for high-temperature environments</li>
                  </ol>
                </div>
                <div className="sar-design-card" style={{ animationDelay: "100ms" }}>
                  <div className="sar-design-icon">🏗️</div>
                  <h3>Mounting & Racking</h3>
                  <ul className="sar-design-list">
                    <li>Tilt: <strong>15°</strong> (≈ latitude) for year-round optimum</li>
                    <li>Azimuth: <strong>180° south</strong> (leverages 157° natural aspect)</li>
                    <li>Row spacing for zero shading at 9am/3pm winter solstice</li>
                    <li>Ground clearance ≥ <strong>500mm</strong> (airflow + monsoon splash)</li>
                  </ul>
                </div>
                <div className="sar-design-card" style={{ animationDelay: "200ms" }}>
                  <div className="sar-design-icon">⚡</div>
                  <h3>Electrical Infrastructure</h3>
                  <ul className="sar-design-list">
                    <li>Inverter derating for 40°C+ ambient — ensure ventilation/cooling</li>
                    <li>Voc calculations with 46.3°C max in string config</li>
                    <li>DC cable sizing uprated <strong>+25%</strong> for high-temp resistance</li>
                  </ul>
                </div>
                <div className="sar-design-card" style={{ animationDelay: "300ms" }}>
                  <div className="sar-design-icon">🔧</div>
                  <h3>O&M Operations</h3>
                  <ul className="sar-design-list">
                    <li>Real-time soiling loss monitoring for optimal cleaning dispatch</li>
                    <li>Vegetation management during monsoon to prevent shading</li>
                    <li>Preventive maintenance cycles aligned with seasonal performance</li>
                    <li>Water supply/storage for wet cleaning operations</li>
                  </ul>
                </div>
              </div>

              <div className="sar-spec-table-wrap">
                <h3>Key Design Specifications</h3>
                <table className="sar-table">
                  <thead>
                    <tr><th>Parameter</th><th>Specification</th><th>Rationale</th></tr>
                  </thead>
                  <tbody>
                    <tr><td>Module tilt</td><td className="sar-num">15°</td><td>≈ Latitude, optimal year-round</td></tr>
                    <tr><td>Azimuth</td><td className="sar-num">180° (True South)</td><td>Natural 157° aspect advantageous</td></tr>
                    <tr><td>Ground clearance</td><td className="sar-num">≥ 500mm</td><td>Airflow + monsoon protection</td></tr>
                    <tr><td>Rear ventilation gap</td><td className="sar-num">≥ 150mm</td><td>Convective cooling during 40°C+ peaks</td></tr>
                    <tr><td>Temp coefficient</td><td className="sar-num">≤ −0.35%/°C</td><td>Minimize summer losses</td></tr>
                    <tr><td>DC cable uprating</td><td className="sar-num">+25%</td><td>Compensate high-temp resistance</td></tr>
                    <tr><td>Wind certification</td><td>IEC 61215</td><td>Standard adequate; IEC 61730 optional</td></tr>
                    <tr><td>PID protection</td><td>Standard</td><td>Favorable site conditions</td></tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* RISK ASSESSMENT */}
          {activeSection === "risk" && (
            <div key={`risk-${sectionKey}`} className="sar-section">
              <h2 className="sar-section-title">Risk Assessment & Mitigation</h2>

              <div className="sar-risk-overview">
                {[
                  { label: "Very Low", count: 1, color: "#16a34a", bg: "#dcfce7" },
                  { label: "Low", count: 3, color: "#22c55e", bg: "#f0fdf4" },
                  { label: "Moderate", count: 2, color: "#f59e0b", bg: "#fffbeb" },
                  { label: "Mod-High", count: 1, color: "#ef4444", bg: "#fef2f2" },
                  { label: "Critical", count: 0, color: "#9ca3af", bg: "#f9fafb" },
                ].map((r, i) => (
                  <div key={r.label} className="sar-risk-stat" style={{
                    background: r.bg, border: `1px solid ${r.color}33`, animationDelay: `${i * 70}ms`,
                  }}>
                    <span className="sar-risk-stat-value" style={{ color: r.color }}>{r.count}</span>
                    <span className="sar-risk-stat-label" style={{ color: r.color }}>{r.label}</span>
                  </div>
                ))}
              </div>

              <div className="sar-risk-list">
                {RISK_DATA.map((r, i) => (
                  <div
                    key={r.factor}
                    className={`sar-risk-item${expandedRisk === r.factor ? " sar-risk-item--expanded" : ""}`}
                    style={{ animationDelay: `${i * 60}ms` }}
                    onClick={() => setExpandedRisk(expandedRisk === r.factor ? null : r.factor)}
                  >
                    <div className="sar-risk-row">
                      <div className="sar-risk-left">
                        <span className="sar-risk-factor">{r.factor}</span>
                        <SeverityBar level={r.severityLevel} />
                      </div>
                      <div className="sar-risk-right">
                        <span
                          className="sar-risk-severity"
                          style={{ color: r.color, background: `${r.color}18`, borderColor: `${r.color}40` }}
                        >
                          {r.severity}
                        </span>
                        <svg
                          className={`sar-risk-chevron${expandedRisk === r.factor ? " sar-risk-chevron--open" : ""}`}
                          width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                        >
                          <polyline points="6 9 12 15 18 9"/>
                        </svg>
                      </div>
                    </div>
                    {expandedRisk === r.factor && (
                      <div className="sar-risk-mitigation">
                        <strong>Mitigation Strategy:</strong> {r.mitigation}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="sar-risk-chart-wrap">
                <h3>Risk Severity Distribution</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: "Very Low", value: 1, color: "#16a34a" },
                        { name: "Low", value: 3, color: "#22c55e" },
                        { name: "Moderate", value: 2, color: "#f59e0b" },
                        { name: "Moderate-High", value: 1, color: "#ef4444" },
                      ]}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                      labelLine={true}
                    >
                      {[
                        { name: "Very Low", value: 1, color: "#16a34a" },
                        { name: "Low", value: 3, color: "#22c55e" },
                        { name: "Moderate", value: 2, color: "#f59e0b" },
                        { name: "Moderate-High", value: 1, color: "#ef4444" },
                      ].map((entry, idx) => (
                        <Cell key={idx} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* ECONOMIC INDICATORS */}
          {activeSection === "economic" && (
            <div key={`eco-${sectionKey}`} className="sar-section">
              <h2 className="sar-section-title">Economic Performance Indicators</h2>

              <div className="sar-yield-cards">
                {[
                  { label: "Conservative", value: site.yieldConservative, desc: "Full loss accounting, worst-case O&M", gradient: "linear-gradient(135deg,#475569,#334155)", delay: 0 },
                  { label: "Expected", value: site.yieldExpected, desc: "Realistic scenario with standard O&M", gradient: "linear-gradient(135deg,#0f766e,#0d5f59)", delay: 110 },
                  { label: "Optimistic", value: site.yieldOptimistic, desc: "Best-case with excellent O&M execution", gradient: "linear-gradient(135deg,#d97706,#b45309)", delay: 220 },
                ].map((c) => (
                  <div key={c.label} className="sar-yield-card" style={{ background: c.gradient, animationDelay: `${c.delay}ms` }}>
                    <span className="sar-yield-label">{c.label}</span>
                    <AnimatedYield target={c.value} />
                    <span className="sar-yield-unit">kWh/kWp/year</span>
                    <p style={{ margin: "6px 0 0", fontSize: 10, opacity: 0.75 }}>{c.desc}</p>
                  </div>
                ))}
              </div>

              <div className="sar-chart-card">
                <h3>Annual Energy Yield Scenarios (kWh/kWp/yr)</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={YIELD_DATA} layout="vertical" margin={{ top: 5, right: 40, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-gray-100)" />
                    <XAxis type="number" domain={[1400, 2000]} tick={{ fontSize: 12 }} />
                    <YAxis type="category" dataKey="scenario" tick={{ fontSize: 13 }} width={100} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} formatter={(v: number) => [`${v.toLocaleString()} kWh/kWp`, "Yield"]} />
                    <Bar dataKey="yield" radius={[0, 6, 6, 0]} name="Yield">
                      {YIELD_DATA.map((entry, idx) => (
                        <Cell key={idx} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="sar-value-drivers">
                <h3>Key Value Drivers</h3>
                <div className="sar-value-grid">
                  <div className="sar-value-item">
                    <span className="sar-value-icon">☀️</span>
                    <div>
                      <strong>Excellent Baseline Irradiance</strong>
                      <p>1,916 kWh/m²/yr — top quartile in India</p>
                    </div>
                  </div>
                  <div className="sar-value-item">
                    <span className="sar-value-icon">🏔️</span>
                    <div>
                      <strong>Optimal Terrain</strong>
                      <p>Minimal civil work required — lower CAPEX</p>
                    </div>
                  </div>
                  <div className="sar-value-item">
                    <span className="sar-value-icon">🔩</span>
                    <div>
                      <strong>Standard Equipment</strong>
                      <p>No premium coastal/PID-resistant modules needed</p>
                    </div>
                  </div>
                  <div className="sar-value-item">
                    <span className="sar-value-icon">📊</span>
                    <div>
                      <strong>Predictable Seasonality</strong>
                      <p>Aids O&M planning and energy forecasting</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="sar-perf-ratio">
                <h3>Performance Ratio Assumptions</h3>
                <PRBar />
              </div>

              <div className="sar-conclusion-box">
                <h3>Bottom Line</h3>
                <p>
                  This site will deliver <strong>reliable, above-average solar performance</strong> with conventional
                  technology and disciplined O&M practices. The 2-year dataset provides high confidence in projections,
                  with <strong>100% data completeness</strong> across all metrics. Proceed with detailed engineering
                  design and financial modeling.
                </p>
                <div className="sar-data-quality-note">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
                  Data Quality Note: 100% completeness across all 8 environmental parameters over the full 2-year period
                  provides exceptional confidence, capturing full seasonal cycles and extreme weather events.
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Report Footer */}
      <div className="sar-footer">
        <span>MarketIntelli Solar Assessment · Generated {new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</span>
        <span>Data Completeness: 100% · Analysis Period: {site.analysisPeriod}</span>
        <span>Confidential — For authorized use only</span>
      </div>
    </div>
  );
}

export default SolarAssessmentReport;
