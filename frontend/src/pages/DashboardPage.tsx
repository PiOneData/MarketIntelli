import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useCapacitySummary, usePowerMarketOverview } from "../hooks/usePowerMarket";
import EnergyGapPanel from "../components/dashboard/EnergyGapPanel";
import EnergyProjection2030Panel from "../components/dashboard/EnergyProjection2030Panel";
import IranConflictSection from "../components/dashboard/IranConflictSection";
import apiClient from "../api/client";

// ── IEX market data ──────────────────────────────────────────────────────────
interface IEXData {
  iex_market_prices: {
    dam_mcp_inr_per_mwh: number;
    rtm_mcp_inr_per_mwh: number;
    gtam_mcp_inr_per_mwh: number;
  };
  market_summary: {
    rec: { price: number };
    rtm: { volume_mu: number; re_share_pct: number };
  };
  source?: string;
}
async function fetchIEXData(): Promise<IEXData> {
  const { data } = await apiClient.get("/finance/iex/re-market-data");
  return data;
}

// ── Static curated data (CEA / MNRE official Mar 2026) ───────────────────────
const RE_ITEMS = [
  { cls: "solar",   icon: "☀️", num: "86.4", unit: "GW", name: "Solar",         note: "Utility + Rooftop · Rajasthan 32.4 GW" },
  { cls: "wind",    icon: "💨", num: "47.6", unit: "GW", name: "Wind",          note: "Onshore · TN · GJ · AP zones" },
  { cls: "hydro",   icon: "💧", num: "50.3", unit: "GW", name: "Hydro",         note: "Large + Small · NHPC + State" },
  { cls: "storage", icon: "🔋", num: "4.2",  unit: "GWh",name: "Storage",       note: "BESS · Pumped Hydro pipeline" },
  { cls: "total",   icon: "⚡", num: "513",  unit: "GW", name: "Total Installed",note: "All sources · Mar 2026 · CEA" },
];

const PGEN_CARDS = [
  { cls: "thermal", icon: "🏭", label: "Thermal", num: "1,038", unit: "BU", bar: 59.8, barCol: "#9e9e9e", share: "59.8%", note: "Coal · Gas · Lignite\nNTPC + State Gencos" },
  { cls: "solar",   icon: "☀️", label: "Solar",   num: "287",   unit: "BU", bar: 65,   barCol: "#f59e0b", share: "16.5%", note: "Utility + Rooftop\n86.4 GW installed" },
  { cls: "hydro",   icon: "💧", label: "Hydro",   num: "156",   unit: "BU", bar: 35,   barCol: "#0ea5e9", share: "9.0%",  note: "Large + Small Hydro\nNHPC · State Gencos" },
  { cls: "wind",    icon: "💨", label: "Wind",    num: "113",   unit: "BU", bar: 26,   barCol: "#3b82f6", share: "6.5%",  note: "Onshore Installed\n47.6 GW capacity" },
  { cls: "nuclear", icon: "⚛️", label: "Nuclear", num: "48",    unit: "BU", bar: 11,   barCol: "#8b5cf6", share: "2.8%",  note: "NPCIL · 8.2 GW\nBaseload 24×7" },
  { cls: "other",   icon: "🔋", label: "Other RE",num: "94",    unit: "BU", bar: 22,   barCol: "#10b981", share: "5.4%",  note: "Biomass · SHP · Waste\nDistributed sources" },
];

const MODULES = [
  { n: "01", ico: "⚡", title: "Power Data",         desc: "Real-time generation, injection and scheduling across conventional and RE sources, state-by-state and ISTS-level.", tags: ["SCADA","ISGS","State Gen","Demand"], to: "/power-data/overview" },
  { n: "02", ico: "☀️", title: "Solar Intelligence", desc: "Project-level solar capacity tracking, Solargis TMY irradiance, PLF trends, and developer pipeline.", tags: ["Capacity","PLF","GHI","Pipeline"], to: "/geo-analytics/assessment" },
  { n: "03", ico: "💨", title: "Wind Intelligence",  desc: "Wind resource analytics, CUF data, zone-wise generation patterns, and auction tracking with P50/P90.", tags: ["CUF","P50/P90","Zones","Auctions"], to: "/geo-analytics/assessment" },
  { n: "04", ico: "📊", title: "Power Market",       desc: "IEX & PXIL spot prices, DAM/RTM volumes, congestion patterns, REC trading and participant data.", tags: ["IEX","DAM","RTM","REC"], to: "/finance/power-trading" },
  { n: "05", ico: "📋", title: "Policy & Regulation",desc: "State RPO compliance, CERC/SERC orders, tariff determinations, and grid code updates.", tags: ["RPO","Tariff","CERC","SERC"], to: "/policy/policy-repository" },
  { n: "06", ico: "🔍", title: "Project Intelligence",desc: "End-to-end lifecycle from bid to COD across solar, wind, hybrid, and storage. 8,760hr BESS simulation.", tags: ["Pipeline","COD","HOMER","BESS"], to: "/projects/project-directory" },
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
  { ico: "⚡", strong: "IEX / PXIL / HPX", span: "Live Exchange Data" },
  { ico: "🏛️", strong: "CEA · MNRE · PIB", span: "Official Govt. Sources" },
  { ico: "📡", strong: "RLDC / SLDC",      span: "Grid Operator Data" },
  { ico: "🛰️", strong: "Solargis",         span: "TMY Irradiance" },
  { ico: "🌍", strong: "NITI Aayog",       span: "India Energy Data" },
  { ico: "📊", strong: "IEA / Bloomberg",  span: "Global Intelligence" },
];

// ── News ticker items (static — from IEX public reports) ───────────────────
const NEWS_ITEMS = [
  { cls: "sol", text: "IEX records all-time high 13,050 MU in Jan 2026 — up 20% YoY; DAM at ₹3.82/kWh ↓13%" },
  { cls: "pol", text: "Market coupling launched Jan 2026 — IEX, PXIL & HPX unified clearing price under CERC" },
  { cls: "rec", text: "44.22 lakh RECs traded on IEX in Q2 FY26; REC floor price ₹2,100 from Apr 2026 · NLDC" },
  { cls: "win", text: "IEX RTM hits 3,913 MU record in Sep 2025 — 39% YoY surge; G-DAM up 259% in Aug 2024" },
  { cls: "pol", text: "CERC proposes fixed 1.5 paise/unit exchange fee as market coupling replaces price discovery" },
];

// ── Top-5 states (CEA Dec 2025 — used as fallback if API returns no data) ──
const TOP5_STATIC = [
  { rank: "01", name: "Maharashtra", totalGW: "73.4", solar: "22.1", wind: "12.3", re: "47%", reClass: "re-high", barStyle: "width:100%;background:linear-gradient(90deg,#43a047 30%,#1e88e5 30% 46%,#9e9e9e 46%)" },
  { rank: "02", name: "Rajasthan",   totalGW: "64.8", solar: "32.4", wind: "3.1",  re: "55%", reClass: "re-high", barStyle: "width:88%;background:linear-gradient(90deg,#43a047 55%,#1e88e5 55% 60%,#9e9e9e 60%)" },
  { rank: "03", name: "Gujarat",     totalGW: "57.2", solar: "18.2", wind: "10.8", re: "51%", reClass: "re-high", barStyle: "width:78%;background:linear-gradient(90deg,#43a047 38%,#1e88e5 38% 55%,#9e9e9e 55%)" },
  { rank: "04", name: "Tamil Nadu",  totalGW: "47.1", solar: "8.4",  wind: "12.1", re: "54%", reClass: "re-high", barStyle: "width:64%;background:linear-gradient(90deg,#43a047 20%,#1e88e5 20% 55%,#9e9e9e 55%)" },
  { rank: "05", name: "Karnataka",   totalGW: "42.2", solar: "17.8", wind: "4.8",  re: "53%", reClass: "re-high", barStyle: "width:57%;background:linear-gradient(90deg,#43a047 48%,#1e88e5 48% 60%,#9e9e9e 60%)" },
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

  const dam  = iexQ.data?.iex_market_prices.dam_mcp_inr_per_mwh;
  const rtm  = iexQ.data?.iex_market_prices.rtm_mcp_inr_per_mwh;
  const gtam = iexQ.data?.iex_market_prices.gtam_mcp_inr_per_mwh;

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
                  {iexQ.data && (
                    <div className="stat-row">
                      <div className="stat-tile">
                        <div className="st-label">DAM MCP</div>
                        <div className="st-val">{(dam! / 1000).toFixed(2)}<span className="st-unit"> ₹/kWh</span></div>
                        <div className="st-chg dn">↓13% YoY</div>
                      </div>
                      <div className="stat-tile">
                        <div className="st-label">RTM MCP</div>
                        <div className="st-val">{(rtm! / 1000).toFixed(2)}<span className="st-unit"> ₹/kWh</span></div>
                        <div className="st-chg dn">↓16% YoY</div>
                      </div>
                      <div className="stat-tile">
                        <div className="st-label">G-DAM</div>
                        <div className="st-val">{(gtam! / 1000).toFixed(2)}<span className="st-unit"> ₹/kWh</span></div>
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
                            <div className="p5-bar" style={{ ...(Object.fromEntries(row.barStyle.split(";").filter(Boolean).map(s => { const [k,v] = s.split(":"); return [k.trim().replace(/-([a-z])/g, (_,c: string) => c.toUpperCase()), v.trim()]; }))) }} />
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
                    GW · CEA Dec 2025 · {capQ.isError ? "⚠ API error" : "MNRE"}
                  </div>
                </div>

                {/* Data rows — power market live */}
                <div className="data-rows" style={{ padding: "0 14px 14px" }}>
                  {pmQ.data && (
                    <>
                      <div className="drow">
                        <span className="dr-name">Total Installed Capacity</span>
                        <span className="dr-val">{(pmQ.data.total_capacity_mw / 1000).toFixed(0)} GW</span>
                        <span className="dr-chg chg-up">Live</span>
                      </div>
                      <div className="drow">
                        <span className="dr-name">RE Share</span>
                        <span className="dr-val">{pmQ.data.renewable_percent?.toFixed(1) ?? "—"}%</span>
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
                <div className="hs-pc-num">0.98<em>GW</em></div>
                <div className="hs-pc-label">Thermal &amp; Hydro Supply<br />64% of DC Load</div>
              </div>
              <div className="hs-power-card green">
                <div className="hs-pc-type">☀️ Green Energy</div>
                <div className="hs-pc-num">0.55<em>GW</em></div>
                <div className="hs-pc-label">Solar + Wind Installed<br />36% of 1.53 GW Total</div>
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
          <div className="re-band-label">🌿 RE Capacity Monitored &nbsp;·&nbsp; &gt;189 GW India Total</div>
          <div className="re-band-items">
            {RE_ITEMS.map((item, i) => (
              <>
                {i > 0 && <div key={`div-${i}`} className="re-divider" />}
                <div key={item.name} className={`re-item ${item.cls}`}>
                  <div className="re-item-icon">{item.icon}</div>
                  <div className="re-item-data">
                    <div className="re-item-num">{item.num} <span>{item.unit}</span></div>
                    <div className="re-item-name">{item.name}</div>
                    <div className="re-item-note">{item.note}</div>
                  </div>
                </div>
              </>
            ))}
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
            {iexQ.data && (
              <>
                <div className="pm-rate-row">
                  <div className="pm-rate-card">
                    <div className="pm-rate-label">DAM · Day-Ahead</div>
                    <div className="pm-rate-val">₹{(dam! / 1000).toFixed(2)}<span className="pm-rate-unit">/kWh</span></div>
                    <div className="pm-rate-chg dn">↓12.9% YoY</div>
                    <div className="pm-rate-note">IEX · Jan 2026 avg</div>
                  </div>
                  <div className="pm-rate-card">
                    <div className="pm-rate-label">RTM · Real-Time</div>
                    <div className="pm-rate-val">₹{(rtm! / 1000).toFixed(2)}<span className="pm-rate-unit">/kWh</span></div>
                    <div className="pm-rate-chg dn">↓15.9% YoY</div>
                    <div className="pm-rate-note">IEX · Jan 2026 avg</div>
                  </div>
                  <div className="pm-rate-card">
                    <div className="pm-rate-label">G-DAM · Green</div>
                    <div className="pm-rate-val">₹{(gtam! / 1000).toFixed(2)}<span className="pm-rate-unit">/kWh</span></div>
                    <div className="pm-rate-chg dn">↓12.5% YoY</div>
                    <div className="pm-rate-note">Green Day-Ahead · Jan 2026</div>
                  </div>
                  <div className="pm-rate-card">
                    <div className="pm-rate-label">REC · Renewable Cert.</div>
                    <div className="pm-rate-val">₹{iexQ.data.market_summary.rec.price.toFixed(0)}<span className="pm-rate-unit">/REC</span></div>
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
                <div className="pm-exch-seg" style={{ width: "90%", background: "#0d7a6e" }} title="IEX 90%" />
                <div className="pm-exch-seg" style={{ width: "6%", background: "#1565c0" }} title="PXIL 6%" />
                <div className="pm-exch-seg" style={{ width: "4%", background: "#f59e0b" }} title="HPX 4%" />
              </div>
              <div className="pm-exch-legend-row">
                <span style={{ color: "#0d7a6e", fontWeight: 700 }}>IEX 90%</span>
                <span style={{ color: "#1565c0" }}>PXIL 6%</span>
                <span style={{ color: "#f59e0b" }}>HPX 4%</span>
                <span className="pm-exch-src-note">Source: IEX Jan 2026 · CEA FY26</span>
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
              <div className="pgen-eyebrow">India Power Mix · FY 2025 Actuals</div>
              <div className="pgen-title">CONSOLIDATED GENERATION <span className="t">BY SOURCE</span></div>
            </div>
            <div className="pgen-total-block">
              <span className="pgen-total-label">Total Generation</span>
              <span className="pgen-total-num">1,736 <span>BU</span></span>
              <span className="pgen-total-note">FY2024–25 · CEA</span>
            </div>
          </div>

          <div className="pgen-cards">
            {PGEN_CARDS.map((card) => (
              <div key={card.cls} className={`pgen-card ${card.cls}`}>
                <div className="pgen-card-top">
                  <span className="pgen-icon">{card.icon}</span>
                  <span className="pgen-card-label">{card.label}</span>
                </div>
                <div className="pgen-card-num">{card.num} <em>{card.unit}</em></div>
                <div className="pgen-bar-wrap">
                  <div className="pgen-bar" style={{ width: `${card.bar}%`, background: card.barCol }} />
                </div>
                <div className="pgen-card-share">{card.share}</div>
                <div className="pgen-card-note" style={{ whiteSpace: "pre-line" }}>{card.note}</div>
              </div>
            ))}
          </div>

          <div className="pgen-summary">
            <div className="pgen-summary-label">
              <span className="pgen-sl green">🌿 Renewable (incl. Hydro)</span>
              <span className="pgen-sl grey">🏭 Non-Renewable</span>
            </div>
            <div className="pgen-stacked-bar">
              <div className="psb-seg green" style={{ width: "40.2%" }} title="RE incl. Hydro 40.2%">
                <span className="psb-label">RE 40.2%</span>
              </div>
              <div className="psb-seg grey" style={{ width: "59.8%" }} title="Non-RE 59.8%">
                <span className="psb-label">Non-RE 59.8%</span>
              </div>
            </div>
            <div className="pgen-summary-note">Source: CEA Annual Report FY2024–25 · IEX Market Data · MNRE</div>
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

      {/* ═══ RX² FRAMEWORK ══════════════════════════════════════════════════ */}
      <section className="rx2-section" id="rx2">
        <div className="wrap">
          <div className="rx2-hero">
            <div className="rx2-badge">RX² · REWARDS Framework · Smart Energy Assessment</div>
            <h2>RX² <span className="t">REWARDS</span><br />FRAMEWORK.</h2>
            <p className="rx2-full">Rigorous Power Assessment &amp; Renewable Energy Transition — An Innovative Framework for Smart Energy Transition</p>
            <p className="rx2-desc">A structured, standards-backed methodology to assess, size, simulate and deploy renewable energy systems for power-critical infrastructure. Two tiers deliver actionable intelligence at every stage of decision-making.</p>
          </div>

          <div className="rx2-tiers">
            <div className="rx2-tier">
              <div className="rx2-tier-label">Tier 1 · 24-Hour Turnaround</div>
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
            </div>
            <div className="rx2-tier featured">
              <div className="rx2-tier-label">Tier 2 · Full 8-Phase Study</div>
              <span className="rx2-tier-icon">⚡</span>
              <div className="rx2-tier-name">DETAILED ASSESSMENT</div>
              <p className="rx2-tier-desc">Specialised deep study: 8-phase REWARD² workbook, 8,760-hour dispatch simulation, 3-scenario NPV modelling, GHG Protocol carbon audit, and full IEEE/IEC standards verification.</p>
              <ul className="rx2-tier-features">
                <li>8,760-hour HOMER Pro simulation</li>
                <li>Solargis TMY + P50/P90 wind gate</li>
                <li>Bear / Base / Bull NPV scenarios</li>
                <li>ISO 50001 · BRSR · TCFD reporting</li>
              </ul>
              <span className="rx2-tier-tag tag-detail">HOMER Pro · Solargis · ISO 50001 · BRSR</span>
            </div>
          </div>

          <div className="rx2-phases-wrap">
            <div className="rx2-phase-title">REWARD² — 7 Assessment Phases</div>
            <div className="rx2-phase-grid">
              {RX2_PHASES.map((phase, i) => (
                <div key={i} className={`phase-card${phase.warn ? " warn" : ""}`}>
                  <span className="phase-card-letter">{phase.letter}</span>
                  <div className="phase-card-name">{phase.name}</div>
                  <div className="phase-card-desc">{phase.desc}</div>
                  <span className={`phase-card-grade ${phase.gradeClass}`}>{phase.grade}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rx2-cta-row">
            <Link to="/geo-analytics/assessment" className="rx2-btn">Access RX² Framework →</Link>
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
              <div key={b.strong} className="tb">
                <span className="tb-ico">{b.ico}</span>
                <div className="tb-text">
                  <strong>{b.strong}</strong>
                  <span>{b.span}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
