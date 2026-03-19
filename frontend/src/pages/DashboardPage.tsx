import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useCapacitySummary, usePowerMarketOverview, useDailyREGeneration } from "../hooks/usePowerMarket";
import EnergyGapPanel from "../components/dashboard/EnergyGapPanel";
import EnergyProjection2030Panel from "../components/dashboard/EnergyProjection2030Panel";
import IranConflictSection from "../components/dashboard/IranConflictSection";
import apiClient from "../api/client";
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

// ── IEX market data ──────────────────────────────────────────────────────────
interface IEXData {
  iex_market_prices?: {
    dam_mcp_inr_per_mwh: number;
    rtm_mcp_inr_per_mwh: number;
    gtam_mcp_inr_per_mwh: number;
  };
  market_summary?: {
    rec?: { solar_cleared_price_inr?: number; non_solar_cleared_price_inr?: number };
    rtm?: { re_volume_mu?: number; re_share_percent?: number };
  };
  source?: string;
}
async function fetchIEXData(): Promise<IEXData> {
  const { data } = await apiClient.get("/finance/iex/re-market-data");
  return data;
}

// ── Static curated data (CEA / MNRE official Jan 2026) ───────────────────────
// Sources: MNRE Physical Progress Jan 2026, CEA Installed Capacity Report Sep 2025,
//          Wikipedia Wind/Solar power in India (Jan 2026), IESA 2025
const RE_ITEMS = [
  { cls: "solar",   icon: "☀️", num: "143.6", unit: "GW", name: "Solar",         note: "Utility + Rooftop · Rajasthan 38.7 GW · MNRE Feb 2026" },
  { cls: "wind",    icon: "💨", num: "55.1",   unit: "GW", name: "Wind",          note: "Onshore · TN · GJ · RJ zones · MNRE Feb 2026" },
  { cls: "hydro",   icon: "💧", num: "56.3",   unit: "GW", name: "Hydro",         note: "Large 51.2 GW + Small 5.2 GW · MNRE Feb 2026" },
  { cls: "storage", icon: "🔋", num: "4.75",   unit: "GW", name: "Storage",       note: "Pumped Hydro installed · 0.8 GWh BESS op. · IESA 2025" },
  { cls: "total",   icon: "⚡", num: "520",    unit: "GW", name: "Total Installed",note: "All sources · Feb 2026 · CEA / MoP" },
];

// Source: CEA / CREA India Power Sector Overview FY2024-25 · Vasudha Foundation FY25 report
// Total generation FY2024-25: 1,824 BU (CEA; +5% YoY vs 1,739 BU in FY2023-24)
const PGEN_CARDS = [
  { cls: "thermal", icon: "🏭", label: "Thermal", num: "1,363", unit: "BU", bar: 74.7, barCol: "#9e9e9e", share: "74.7%", note: "Coal · Gas · Lignite\nNTPC + State Gencos · CEA FY25" },
  { cls: "hydro",   icon: "💧", label: "Hydro",   num: "149",   unit: "BU", bar: 8.2,  barCol: "#0ea5e9", share: "8.2%",  note: "Large + Small Hydro\nNHPC · State Gencos · CEA FY25" },
  { cls: "solar",   icon: "☀️", label: "Solar",   num: "148",   unit: "BU", bar: 8.1,  barCol: "#f59e0b", share: "8.1%",  note: "Utility + Rooftop\n106 GW installed FY25 · CEA" },
  { cls: "wind",    icon: "💨", label: "Wind",    num: "80",    unit: "BU", bar: 4.4,  barCol: "#3b82f6", share: "4.4%",  note: "Onshore Installed\n50 GW capacity FY25 · CEA" },
  { cls: "nuclear", icon: "⚛️", label: "Nuclear", num: "57",    unit: "BU", bar: 3.1,  barCol: "#8b5cf6", share: "3.1%",  note: "NPCIL · 8.2 GW\nBaseload 24×7 · NPCIL FY25" },
  { cls: "other",   icon: "🔋", label: "Other RE",num: "27",    unit: "BU", bar: 1.5,  barCol: "#10b981", share: "1.5%",  note: "Biomass · SHP · Waste\nDistributed sources · CEA FY25" },
];


const MODULES = [
  { n: "01", ico: "⚡", title: "Power Data",              desc: "Real-time generation, injection and scheduling across conventional and RE sources, state-by-state and ISTS-level.", tags: ["SCADA","ISGS","State Gen","Demand"], to: "/power-data/overview" },
  { n: "02", ico: "☀️", title: "Solar & Wind Intelligence",desc: "Project-level solar and wind capacity tracking, Solargis TMY irradiance, CUF data, P50/P90 wind resource analytics, and developer pipeline.", tags: ["Capacity","PLF","GHI","P50/P90"], to: "/geo-analytics/assessment" },
  { n: "03", ico: "💹", title: "Finance & Investment",    desc: "IEX & PXIL spot prices, DAM/RTM volumes, Brent crude watch, REC trading, investment guidelines, FDI trends, and credit environment.", tags: ["IEX","DAM","REC","FDI"], to: "/finance/finance-intelligence" },
  { n: "04", ico: "📊", title: "Power Market",            desc: "Live power exchange data, congestion patterns, cross-border trading, and India electricity market analytics.", tags: ["IEX","PXIL","RTM","Congestion"], to: "/finance/power-trading" },
  { n: "05", ico: "📋", title: "Policy & Regulation",     desc: "State RPO compliance, CERC/SERC orders, tariff determinations, and grid code updates.", tags: ["RPO","Tariff","CERC","SERC"], to: "/policy/policy-repository" },
  { n: "06", ico: "🔍", title: "Project Intelligence",    desc: "End-to-end lifecycle from bid to COD across solar, wind, hybrid, and storage. 8,760hr BESS simulation.", tags: ["Pipeline","COD","HOMER","BESS"], to: "/projects/project-directory" },
];

const RX2_PHASES = [
  { letter: "R", name: "Reliability Stratification",       desc: "TIA-942 · UPS topology · IEEE 519 harmonic baseline",       grade: "A",  gradeClass: "A" },
  { letter: "E", name: "Rigorous Baseline Audit",          desc: "15-min AMI metering · PUE profiling · ISO 50001",           grade: "A",  gradeClass: "A" },
  { letter: "W", name: "Energy Resource Validation",       desc: "Solargis TMY · Wind P50/P90 CF gate · H₂ proximity",       grade: "A",  gradeClass: "A" },
  { letter: "A", name: "Load-Storage Simulation",          desc: "8,760hr BESS dispatch · LFP degradation · IEC 62619",       grade: "A",  gradeClass: "A" },
  { letter: "R", name: "Advanced Economic Modelling",      desc: "Bear/Base/Bull NPV · Monte Carlo · GHG Scope 2+3",         grade: "A",  gradeClass: "A" },
  { letter: "D", name: "Deployment & Commissioning",       desc: "IEEE 1547 · NFPA 855 · SLDC scheduling · DISCOM NOC",      grade: "B+", gradeClass: "B", warn: true },
  { letter: "²", name: "Operationalisation & Optimisation",desc: "Monthly EMS · BESS SOH · I-REC · BRSR/TCFD",               grade: "A",  gradeClass: "A" },
];

const TRUST_BADGES = [
  { ico: "⚡", strong: "IEX / PXIL / HPX", span: "Live Exchange Data",      url: "https://www.iexindia.com" },
  { ico: "🏛️", strong: "CEA · MNRE · PIB", span: "Official Govt. Sources",  url: "https://cea.nic.in" },
  { ico: "📡", strong: "RLDC / SLDC",      span: "Grid Operator Data",      url: "https://nrldc.in" },
  { ico: "🛰️", strong: "Solargis",         span: "TMY Irradiance",          url: "https://solargis.com" },
  { ico: "🌍", strong: "NITI Aayog",       span: "India Energy Data",       url: "https://www.niti.gov.in" },
  { ico: "📊", strong: "IEA / Bloomberg",  span: "Global Intelligence",     url: "https://www.iea.org" },
];

// ── News ticker items (static — from IEX public reports, PIB, CERC orders) ─
// Sources verified Jan–Feb 2026 from IEX Monthly Highlights, PIB, APTEL orders
const NEWS_ITEMS = [
  { cls: "sol", text: "IEX all-time high 13,050 MU in Jan 2026 — ↑19.6% YoY; RTM record 4,638 MU ↑52.8% YoY · IEX Jan 2026" },
  { cls: "pol", text: "APTEL upholds CERC market coupling order Feb 2026 — IEX appeal dismissed; unified clearing price to proceed" },
  { cls: "rec", text: "18.86 lakh RECs traded on IEX in Jan 2026 (↑15.2% YoY); REC floor price ₹2,100 from Apr 2026 · NLDC" },
  { cls: "win", text: "India adds record 37.9 GW solar + 6.3 GW wind in CY2025 — total RE installed 266.7 GW · MNRE Feb 2026" },
  { cls: "pol", text: "CERC proposes fixed 1.5 paise/unit exchange fee as market coupling replaces bilateral price discovery" },
];

// ── Top-5 states by total installed capacity (CEA Sep–Dec 2025 + MNRE Feb 2026) ──
// Total GW = all sources (thermal + RE + nuclear); solar/wind = RE-only breakdown
// Sources: CEA Installed Capacity Report Sep 2025 (GJ 63.8 GW, MH 54.5 GW, RJ 52.6 GW);
//          MNRE Physical Progress Feb 2026 (RJ 44.6 GW RE, GJ 44.9 GW RE, TN 27.8 GW RE);
//          JMK Research CY2025; MNRE State-wise Installed Capacity 28.02.2026
const TOP5_STATIC = [
  { rank: "01", name: "Gujarat",     totalGW: "66.0", solar: "27.5", wind: "15.2", re: "68%", reClass: "re-high", barW: "100%", barBg: "linear-gradient(90deg,#43a047 42%,#1e88e5 42% 65%,#9e9e9e 65%)" },
  { rank: "02", name: "Maharashtra", totalGW: "58.0", solar: "19.4", wind: "5.9",  re: "55%", reClass: "re-high", barW: "88%",  barBg: "linear-gradient(90deg,#43a047 33%,#1e88e5 33% 43%,#9e9e9e 43%)" },
  { rank: "03", name: "Rajasthan",   totalGW: "56.0", solar: "38.7", wind: "5.2",  re: "80%", reClass: "re-high", barW: "85%",  barBg: "linear-gradient(90deg,#43a047 69%,#1e88e5 69% 78%,#9e9e9e 78%)" },
  { rank: "04", name: "Tamil Nadu",  totalGW: "36.3", solar: "12.4", wind: "12.1", re: "77%", reClass: "re-high", barW: "55%",  barBg: "linear-gradient(90deg,#43a047 34%,#1e88e5 34% 67%,#9e9e9e 67%)" },
  { rank: "05", name: "Karnataka",   totalGW: "35.0", solar: "11.0", wind: "8.5",  re: "75%", reClass: "re-high", barW: "53%",  barBg: "linear-gradient(90deg,#43a047 31%,#1e88e5 31% 56%,#9e9e9e 56%)" },
];

// ── News cycler hook ─────────────────────────────────────────────────────────
function useNewsCycle(count: number, interval = 4000) {
  const [idx, setIdx] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    timerRef.current = setInterval(() => setIdx((i) => (i + 1) % count), interval);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [count, interval]);
  return idx;
}

export default function DashboardPage() {
  const iexQ   = useQuery({ queryKey: ["iex-dashboard"], queryFn: fetchIEXData });
  const pmQ    = usePowerMarketOverview();
  const capQ   = useCapacitySummary();
  const newsIdx = useNewsCycle(NEWS_ITEMS.length);
  const reGenQ = useDailyREGeneration();

  type RePreset = "7D" | "14D" | "1M" | "ALL";
  const [rePreset, setRePreset] = useState<RePreset>("ALL");
  const [reFrom, setReFrom] = useState<string>("");
  const [reTo, setReTo] = useState<string>("");
  const isCustomRange = reFrom !== "" || reTo !== "";

  const allREData = reGenQ.data ?? [];
  const maxDateStr = allREData.at(-1)?.date ?? "";
  const minDateStr = allREData[0]?.date ?? "";

  const filteredREData = allREData.filter((r) => {
    if (isCustomRange) {
      if (reFrom && r.date < reFrom) return false;
      if (reTo && r.date > reTo) return false;
      return true;
    }
    if (rePreset !== "ALL" && maxDateStr) {
      const days = rePreset === "7D" ? 7 : rePreset === "14D" ? 14 : 30;
      const cutoff = new Date(maxDateStr);
      cutoff.setDate(cutoff.getDate() - days + 1);
      return r.date >= cutoff.toISOString().slice(0, 10);
    }
    return true;
  });

  const dailyRETrend = filteredREData.map((r) => {
    const day = new Date(r.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
    return {
      day,
      solar: r.solar_mu,
      wind: r.wind_mu,
      other: r.other_mu,
      total: r.solar_mu + r.wind_mu + r.other_mu,
    };
  });

  const dam  = iexQ.data?.iex_market_prices?.dam_mcp_inr_per_mwh;
  const rtm  = iexQ.data?.iex_market_prices?.rtm_mcp_inr_per_mwh;
  const gtam = iexQ.data?.iex_market_prices?.gtam_mcp_inr_per_mwh;
  const recPrice = iexQ.data?.market_summary?.rec?.solar_cleared_price_inr;

  return (
    <div className="dashboard-redesign">

      {/* ═══ HERO ═══════════════════════════════════════════════════════════ */}
      <section className="hero">
        <div className="hero-inner">

          {/* LEFT COPY */}
          <div className="hero-left">
            <div className="hero-tag">
              <span className="htag-dot" />
              India's Renewable Energy Intelligence Platform
            </div>
            <h1>POWER DATA<br /><em>DECODED.</em></h1>
            <p className="hero-desc">
              Real-time market intelligence for India's clean energy transition —
              capacity, generation, policy, finance &amp; geopolitical risk, consolidated
              from CEA, MNRE, IEX, CERC, and Ministry of Power.
            </p>
            <div className="hero-ctas">
              <Link to="/projects/india-data-center-registry" className="cta-main">Data Center Registry</Link>
              <Link to="/geo-analytics/assessment" className="cta-sec">RE Site Assessment</Link>
            </div>
          </div>

          {/* RIGHT DASHBOARD CARD */}
          <div className="hero-visual">
            <div className="dash-card">
              <div className="dc-header">
                <span className="dc-title">INDIA RE MARKET · LIVE</span>
                <div className="dc-live"><span className="dc-live-dot" />LIVE</div>
              </div>
              <div className="dc-body" style={{ padding: 0 }}>

                {/* News feed */}
                <div className="news-feed-wrap">
                  <div className="news-feed-title">
                    <span>Latest Market Signals</span>
                    <span className="news-feed-time">IEX · CEA · MNRE</span>
                  </div>
                  <div className="news-feed">
                    {NEWS_ITEMS.map((n, i) => (
                      <div key={i} className={`news-item${i === newsIdx ? " active" : ""}`}>
                        <span className={`news-dot ${n.cls}`} />
                        <span className="news-text">{n.text}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Stat tiles — IEX live prices */}
                <div style={{ padding: "0 14px 10px" }}>
                  {iexQ.isError && (
                    <div className="data-error-state">⚠ Error fetching IEX market data</div>
                  )}
                  {iexQ.isLoading && (
                    <div className="data-loading-state">Loading IEX prices…</div>
                  )}
                  {iexQ.data && dam != null && (
                    <div className="stat-row">
                      <div className="stat-tile">
                        <div className="st-label">DAM MCP</div>
                        <div className="st-val">{(dam / 1000).toFixed(2)}<span className="st-unit"> ₹/kWh</span></div>
                        <div className="st-chg dn">↓13% YoY</div>
                      </div>
                      <div className="stat-tile">
                        <div className="st-label">RTM MCP</div>
                        <div className="st-val">{((rtm ?? 0) / 1000).toFixed(2)}<span className="st-unit"> ₹/kWh</span></div>
                        <div className="st-chg dn">↓16% YoY</div>
                      </div>
                      <div className="stat-tile">
                        <div className="st-label">G-DAM</div>
                        <div className="st-val">{((gtam ?? 0) / 1000).toFixed(2)}<span className="st-unit"> ₹/kWh</span></div>
                        <div className="st-chg dn">↓13% YoY</div>
                      </div>
                    </div>
                  )}

                  {/* Top 5 states RE capacity table */}
                  <div style={{ marginTop: 6 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "20px 1fr 42px 42px 42px 40px", gap: 4, padding: "4px 0", borderBottom: "1px solid var(--border)", marginBottom: 2 }}>
                      <span style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--faint)", textTransform: "uppercase", letterSpacing: ".08em" }}>#</span>
                      <span style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--faint)", textTransform: "uppercase", letterSpacing: ".08em" }}>State</span>
                      <span style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--faint)", textAlign: "center" }}>Total</span>
                      <span style={{ fontFamily: "var(--mono)", fontSize: 9, color: "#2e7d32", textAlign: "center" }}>Solar</span>
                      <span style={{ fontFamily: "var(--mono)", fontSize: 9, color: "#1565c0", textAlign: "center" }}>Wind</span>
                      <span style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--faint)", textAlign: "center" }}>RE%</span>
                    </div>
                    {TOP5_STATIC.map((row) => (
                      <div key={row.rank} className="p5-row">
                        <span className="p5-rank">{row.rank}</span>
                        <div className="p5-name-block">
                          <span className="p5-name">{row.name}</span>
                          <div className="p5-bar-wrap">
                            <div className="p5-bar" style={{ width: row.barW, background: row.barBg }} />
                          </div>
                        </div>
                        <span className="p5-total">{row.totalGW}</span>
                        <span className="p5-solar">{row.solar}</span>
                        <span className="p5-wind">{row.wind}</span>
                        <span className={`p5-re ${row.reClass}`}>{row.re}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--faint)", marginTop: 6, letterSpacing: ".06em" }}>
                    GW · CEA Sep 2025 + MNRE Feb 2026 · {capQ.isError ? "⚠ API error" : "MNRE"}
                  </div>
                </div>

                {/* Data rows — power market live */}
                <div className="data-rows" style={{ padding: "0 14px 14px" }}>
                  {pmQ.data && (
                    <>
                      <div className="drow">
                        <span className="dr-name">RE Installed Capacity</span>
                        <span className="dr-val">{(pmQ.data.total_installed_re_mw / 1000).toFixed(0)} GW</span>
                        <span className="dr-chg chg-up">Live</span>
                      </div>
                      <div className="drow">
                        <span className="dr-name">RE Share (of 520 GW)</span>
                        <span className="dr-val">{((pmQ.data.total_installed_re_mw / 520000) * 100).toFixed(1)}%</span>
                        <span className="dr-chg chg-up">CEA</span>
                      </div>
                    </>
                  )}
                  {pmQ.isError && (
                    <div className="drow">
                      <span className="dr-name" style={{ color: "var(--red)" }}>⚠ Error fetching power market data</span>
                    </div>
                  )}
                  <div className="drow">
                    <span className="dr-name">500 GW RE Target</span>
                    <span className="dr-val">2030</span>
                    <span className="dr-chg chg-up">MNRE</span>
                  </div>
                  <div className="drow">
                    <span className="dr-name">India Rank — Solar</span>
                    <span className="dr-val">#3 Global</span>
                    <span className="dr-chg chg-up">IEA 2025</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Hero strip ── */}
        <div className="hero-strip">
          <div className="hs-group">
            <div className="hs-group-header">
              <Link to="/projects/india-data-center-registry" className="hs-group-title" style={{ textDecoration: "none", color: "inherit" }}>
                🏢 India Data Centers
              </Link>
              <span className="hs-group-count">Registry · MeitY / LSEG</span>
            </div>
            <div className="hs-power-row">
              <div className="hs-power-card grid">
                <div className="hs-pc-type">⚡ Grid Power</div>
                <div className="hs-pc-num">1.17<em>GW</em></div>
                <div className="hs-pc-label">Thermal &amp; Hydro Supply<br />78% of DC Load</div>
              </div>
              <div className="hs-power-card green">
                <div className="hs-pc-type">☀️ Green Energy</div>
                <div className="hs-pc-num">0.33<em>GW</em></div>
                <div className="hs-pc-label">Solar + Wind Installed<br />22% of 1.50 GW Total</div>
              </div>
            </div>
          </div>
          <div className="hs-group">
            <div className="hs-group-header">
              <Link to="/projects/airport-registry" className="hs-group-title" style={{ textDecoration: "none", color: "inherit" }}>
                ✈️ India Airports
              </Link>
              <span className="hs-group-count">Registry · AAI / MoCA</span>
            </div>
            <div className="hs-power-row">
              <div className="hs-power-card grid">
                <div className="hs-pc-type">⚡ Grid Power</div>
                <div className="hs-pc-num">1.87<em>GW</em></div>
                <div className="hs-pc-label">DISCOM / ISTS Supply<br />78% of Airport Load</div>
              </div>
              <div className="hs-power-card green">
                <div className="hs-pc-type">☀️ Green Energy</div>
                <div className="hs-pc-num">0.53<em>GW</em></div>
                <div className="hs-pc-label">On-site Solar + PPAs<br />22% of 2.4 GW Total</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ RE CAPACITY BAND ═══════════════════════════════════════════════ */}
      <div className="re-band">
        <div className="re-band-inner">
          <div className="re-band-label">🌿 RE Capacity Monitored &nbsp;·&nbsp; 266.7 GW India Total · MNRE Feb 2026</div>
          <div className="re-band-items">
            <div className="re-band-track">
              {[...RE_ITEMS, ...RE_ITEMS].map((item, i) => (
                <React.Fragment key={`${i}-${item.name}`}>
                  {i > 0 && <div className="re-divider" />}
                  <div className={`re-item ${item.cls}`}>
                    <div className="re-item-icon">{item.icon}</div>
                    <div className="re-item-data">
                      <div className="re-item-num">{item.num} <span>{item.unit}</span></div>
                      <div className="re-item-name">{item.name}</div>
                      <div className="re-item-note">{item.note}</div>
                    </div>
                  </div>
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ═══ POWER MARKET METRICS BAND ══════════════════════════════════════ */}
      <div className="metrics-band">
        <div className="metrics-inner">
          <div className="mb-group">
            <div className="mb-group-header">
              <span className="mb-group-title">⚡ Power Market — Today</span>
              <span className="mb-group-sub">IEX · Unit Rates &amp; Demand · Mar 2026</span>
            </div>

            {/* IEX unit rates */}
            {iexQ.isError && (
              <div className="data-error-state">⚠ Error fetching IEX power market data — IEX India API</div>
            )}
            {iexQ.isLoading && (
              <div className="data-loading-state">Loading IEX market prices…</div>
            )}
            {iexQ.data && dam != null && (
              <>
                <div className="pm-rate-row">
                  <div className="pm-rate-card">
                    <div className="pm-rate-label">DAM · Day-Ahead</div>
                    <div className="pm-rate-val">₹{(dam / 1000).toFixed(2)}<span className="pm-rate-unit">/kWh</span></div>
                    <div className="pm-rate-chg dn">↓12.9% YoY</div>
                    <div className="pm-rate-note">IEX · Jan 2026 avg</div>
                  </div>
                  <div className="pm-rate-card">
                    <div className="pm-rate-label">RTM · Real-Time</div>
                    <div className="pm-rate-val">₹{((rtm ?? 0) / 1000).toFixed(2)}<span className="pm-rate-unit">/kWh</span></div>
                    <div className="pm-rate-chg dn">↓15.9% YoY</div>
                    <div className="pm-rate-note">IEX · Jan 2026 avg</div>
                  </div>
                  <div className="pm-rate-card">
                    <div className="pm-rate-label">G-DAM · Green</div>
                    <div className="pm-rate-val">₹{((gtam ?? 0) / 1000).toFixed(2)}<span className="pm-rate-unit">/kWh</span></div>
                    <div className="pm-rate-chg dn">↓12.5% YoY</div>
                    <div className="pm-rate-note">Green Day-Ahead · Jan 2026</div>
                  </div>
                  <div className="pm-rate-card">
                    <div className="pm-rate-label">REC · Renewable Cert.</div>
                    <div className="pm-rate-val">₹{(recPrice ?? 1850).toFixed(0)}<span className="pm-rate-unit">/REC</span></div>
                    <div className="pm-rate-chg up">↑Floor Apr 2026</div>
                    <div className="pm-rate-note">NLDC · Q2 FY26</div>
                  </div>
                </div>

                {/* Volume & demand */}
                <div className="pm-vol-divider">Volume &amp; Demand</div>
                <div className="pm-vol-row">
                  <div className="pm-vol-item">
                    <div className="pm-vol-num">13,050<span className="pm-vol-u"> MU</span></div>
                    <div className="pm-vol-label">IEX Total · Jan 2026</div>
                    <div className="pm-vol-tag up">↑19.6% YoY · All-time record</div>
                  </div>
                  <div className="pm-vol-item">
                    <div className="pm-vol-num">4,638<span className="pm-vol-u"> MU</span></div>
                    <div className="pm-vol-label">RTM Volume · Jan 2026</div>
                    <div className="pm-vol-tag up">↑52.8% YoY · Surge</div>
                  </div>
                  <div className="pm-vol-item">
                    <div className="pm-vol-num">242.8<span className="pm-vol-u"> GW</span></div>
                    <div className="pm-vol-label">Peak Demand · Apr–Dec FY26</div>
                    <div className="pm-vol-tag dn">↓2% YoY · Extended monsoon</div>
                  </div>
                  <div className="pm-vol-item">
                    <div className="pm-vol-num">142.7<span className="pm-vol-u"> BU</span></div>
                    <div className="pm-vol-label">Energy Consumed · Jan 2026</div>
                    <div className="pm-vol-tag up">↑3.8% YoY</div>
                  </div>
                </div>
              </>
            )}

            {/* Exchange share */}
            <div className="pm-exch-bar-wrap">
              <div className="pm-exch-label-row">Exchange Market Share</div>
              <div className="pm-exch-bar">
                <div className="pm-exch-seg" style={{ width: "85%", background: "#0d7a6e" }} title="IEX 85%" />
                <div className="pm-exch-seg" style={{ width: "10%", background: "#1565c0" }} title="PXIL 10%" />
                <div className="pm-exch-seg" style={{ width: "5%", background: "#f59e0b" }} title="HPX 5%" />
              </div>
              <div className="pm-exch-legend-row">
                <span style={{ color: "#0d7a6e", fontWeight: 700 }}>IEX 85%</span>
                <span style={{ color: "#1565c0" }}>PXIL 10%</span>
                <span style={{ color: "#f59e0b" }}>HPX 5%</span>
                <span className="pm-exch-src-note">Source: equentis.com / SharesCart FY26 · CERC market coupling Feb 2026</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ POWER GENERATION BAND ══════════════════════════════════════════ */}
<div className="pgen-band">
  <div className="pgen-inner">
    <div className="pgen-header">
      <div>
        <div className="pgen-eyebrow">India Power Mix · FY 2024–25 Actuals · CEA / CREA</div>
        <div className="pgen-title">CONSOLIDATED GENERATION <span className="t">BY SOURCE</span></div>
      </div>
      <div className="pgen-total-block">
        <span className="pgen-total-label">Total Generation</span>
        <span className="pgen-total-num">1,824 <span>BU</span></span>
        <span className="pgen-total-note">FY2024–25 · CEA / CREA</span>
      </div>
    </div>

    {/* ROW 1 — DAILY RE GENERATION TREND */}
    <div className="pgen-trends-panel">
      <div className="pgen-trends-header">
        <div>
          <div className="pgen-eyebrow" style={{ marginBottom: 4 }}>
            RE Generation Trends · Daily · MUs &nbsp;·&nbsp; Source:{" "}
            <a
              href="https://gen-re.cea.gov.in/"
              target="_blank"
              rel="noopener noreferrer"
              className="pgen-trends-src-link"
            >
              gen-re.cea.gov.in
            </a>{" "}
            · Central Electricity Authority
          </div>
          <div className="pgen-trends-title">
            DAILY RE GENERATION <span className="t">TREND</span>
          </div>
        </div>

        <a
          href="https://gen-re.cea.gov.in/"
          target="_blank"
          rel="noopener noreferrer"
          className="pgen-trends-link"
        >
          Live Data ↗
        </a>
      </div>

      {/* ── Date range filter bar ── */}
      <div className="re-filter-bar">
        <div className="re-filter-presets">
          {(["7D", "14D", "1M", "ALL"] as const).map((p) => (
            <button
              key={p}
              className={`re-filter-btn${!isCustomRange && rePreset === p ? " active" : ""}`}
              onClick={() => { setRePreset(p); setReFrom(""); setReTo(""); }}
            >
              {p}
            </button>
          ))}
        </div>
        <div className="re-filter-dates">
          <input
            type="date"
            className="re-date-input"
            value={reFrom}
            min={minDateStr}
            max={reTo || maxDateStr}
            onChange={(e) => { setReFrom(e.target.value); }}
          />
          <span className="re-filter-sep">→</span>
          <input
            type="date"
            className="re-date-input"
            value={reTo}
            min={reFrom || minDateStr}
            max={maxDateStr}
            onChange={(e) => { setReTo(e.target.value); }}
          />
          {isCustomRange && (
            <button
              className="re-filter-clear"
              title="Clear custom range"
              onClick={() => { setReFrom(""); setReTo(""); }}
            >
              ×
            </button>
          )}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={260}>
        <ComposedChart data={dailyRETrend} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e8e8e8" vertical={false} />

          <XAxis
            dataKey="day"
            tick={{ fontSize: 10, fontFamily: "var(--mono)", fill: "#8a8480" }}
            interval={filteredREData.length <= 10 ? 0 : filteredREData.length <= 21 ? 1 : 4}
            tickLine={false}
            axisLine={false}
          />

          <YAxis
            tick={{ fontSize: 10, fontFamily: "var(--mono)", fill: "#8a8480" }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => `${v}`}
          />

          <Tooltip
            contentStyle={{
              fontSize: 11,
              fontFamily: "var(--mono)",
              borderRadius: 6,
              border: "1px solid #e4e0da",
            }}
            formatter={(value, name) => [`${value} MU`, name]}
          />

          <Legend
            wrapperStyle={{
              fontSize: 10,
              fontFamily: "var(--mono)",
              paddingTop: 8,
            }}
            iconType="circle"
            iconSize={8}
          />

          <Area
            type="monotone"
            dataKey="total"
            name="Total RE"
            fill="#d6eeeb"
            stroke="#0d7a6e"
            strokeWidth={2}
            fillOpacity={0.5}
          />

          <Line type="monotone" dataKey="solar" name="Solar" stroke="#f59e0b" strokeWidth={1.5} dot={false} />
          <Line type="monotone" dataKey="wind" name="Wind" stroke="#3b82f6" strokeWidth={1.5} dot={false} />
          <Line type="monotone" dataKey="other" name="Other RE" stroke="#10b981" strokeWidth={1.5} dot={false} />
        </ComposedChart>
      </ResponsiveContainer>

    </div>

    {/* ROW 2 — CONSOLIDATED GENERATION BY SOURCE */}
    <div className="pgen-left">
      <div className="pgen-cards">
        {PGEN_CARDS.map((card) => (
          <div key={card.cls} className={`pgen-card ${card.cls}`}>
            <div className="pgen-card-top">
              <span className="pgen-icon">{card.icon}</span>
              <span className="pgen-card-label">{card.label}</span>
            </div>

            <div className="pgen-card-num">
              {card.num} <em>{card.unit}</em>
            </div>

            <div className="pgen-bar-wrap">
              <div
                className="pgen-bar"
                style={{
                  width: `${card.bar}%`,
                  background: card.barCol,
                }}
              />
            </div>

            <div className="pgen-card-share">{card.share}</div>

            <div className="pgen-card-note" style={{ whiteSpace: "pre-line" }}>
              {card.note}
            </div>
          </div>
        ))}
      </div>

      <div className="pgen-summary">
        <div className="pgen-summary-label">
          <span className="pgen-sl green">🌿 Renewable (incl. Hydro)</span>
          <span className="pgen-sl grey">🏭 Non-Renewable</span>
        </div>

        <div className="pgen-stacked-bar">
          <div className="psb-seg green" style={{ width: "22.2%" }} title="RE incl. Hydro 22.2%">
            <span className="psb-label">RE 22.2%</span>
          </div>

          <div className="psb-seg grey" style={{ width: "77.8%" }} title="Non-RE 77.8%">
            <span className="psb-label">Non-RE 77.8%</span>
          </div>
        </div>

        <div className="pgen-summary-note">
          Source: CEA FY2024–25 · CREA India Power Sector Overview FY25 · Vasudha Foundation FY25
        </div>
      </div>
    </div>
  </div>
</div>

      {/* ═══ MODULES ════════════════════════════════════════════════════════ */}
      <section className="modules-section" id="modules">
        <div className="wrap">
          <p className="s-tag">Platform Modules</p>
          <h2>SIX MODULES.<br /><span className="t">ONE PLATFORM.</span></h2>
          <p className="s-sub">Every layer of India's renewable energy ecosystem — structured, queryable, and actionable.</p>
          <div className="modules-grid">
            {MODULES.map((mod) => (
              <Link to={mod.to} key={mod.n} className="mod" style={{ textDecoration: "none", display: "block" }}>
                <div className="mod-n">Module {mod.n}</div>
                <span className="mod-ico">{mod.ico}</span>
                <div className="mod-title">{mod.title}</div>
                <p className="mod-desc">{mod.desc}</p>
                <div className="mod-tags">
                  {mod.tags.map((tag) => (
                    <span key={tag} className="mod-tag">{tag}</span>
                  ))}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ QUICK ASSESSMENT ════════════════════════════════════════════════ */}
      <section className="rx2-section" id="rx2">
        <div className="wrap">
          <div className="rx2-tiers" style={{ gridTemplateColumns: "1fr" }}>
            <Link to="/geo-analytics/assessment" className="rx2-tier rx2-tier--link">
              <div className="rx2-tier-label">Satellite Intelligence · Real-Time Assessment</div>
              <span className="rx2-tier-icon">🔍</span>
              <div className="rx2-tier-name">QUICK ASSESSMENT</div>
              <p className="rx2-tier-desc">Online assessment using geo-spatial data and market intelligence for Wind, Solar and Hydro resource potential. Indicative sizing and economics delivered within 24 hours.</p>
              <ul className="rx2-tier-features">
                <li>Geo-spatial resource mapping</li>
                <li>Indicative solar &amp; wind potential</li>
                <li>Preliminary BESS sizing</li>
                <li>Ballpark economics &amp; payback</li>
              </ul>
              <span className="rx2-tier-tag tag-quick">Geo-Spatial · Market Intelligence · Online</span>
              <span className="rx2-tier-cta">Open Assessment →</span>
            </Link>
          </div>
        </div>
      </section>

      {/* ═══ ENERGY GAP PANEL ════════════════════════════════════════════════ */}
      <EnergyGapPanel />

      {/* ═══ ENERGY PROJECTION 2030 ══════════════════════════════════════════ */}
      <EnergyProjection2030Panel />

      {/* ═══ IRAN CONFLICT SECTION ═══════════════════════════════════════════ */}
      <IranConflictSection />

      {/* ═══ TRUST BAND ══════════════════════════════════════════════════════ */}
      <div className="trust-section">
        <div className="wrap trust-inner">
          <div className="trust-pre">Data Sources</div>
          <div className="trust-badges">
            {TRUST_BADGES.map((b) => (
              <a key={b.strong} className="tb" href={b.url} target="_blank" rel="noopener noreferrer"
                style={{ textDecoration: "none", color: "inherit" }}>
                <span className="tb-ico">{b.ico}</span>
                <div className="tb-text">
                  <strong>{b.strong}</strong>
                  <span>{b.span}</span>
                </div>
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
