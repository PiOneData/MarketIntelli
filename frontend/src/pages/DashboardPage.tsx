import { Link } from "react-router-dom";
import { usePowerMarketOverview, useCapacitySummary } from "../hooks/usePowerMarket";
import EnergyGapPanel from "../components/dashboard/EnergyGapPanel";
import EnergyProjection2030Panel from "../components/dashboard/EnergyProjection2030Panel";
import IranConflictSection from "../components/dashboard/IranConflictSection";

// ── Power Generation Mix ─────────────────────────────────────────────────────
const GEN_MIX = [
  { label: "Thermal", pct: 59.8, color: "#64748b" },
  { label: "Solar", pct: 16.5, color: "#f59e0b" },
  { label: "Hydro", pct: 9.0, color: "#0ea5e9" },
  { label: "Wind", pct: 6.5, color: "#10b981" },
  { label: "Nuclear", pct: 2.8, color: "#8b5cf6" },
  { label: "Other", pct: 5.4, color: "#94a3b8" },
];

// ── RE Capacity static reference (CEA / MNRE Mar 2026) ──────────────────────
const RE_CAPACITY = [
  { label: "Solar", value: "86.4 GW", color: "#f59e0b", source: "MNRE/CEA" },
  { label: "Wind", value: "47.6 GW", color: "#10b981", source: "MNRE/CEA" },
  { label: "Large Hydro", value: "50.3 GW", color: "#0ea5e9", source: "CEA" },
  { label: "Storage", value: "4.2 GWh", color: "#8b5cf6", source: "MNRE/CEA" },
  { label: "Total RE+Hydro", value: "513 GW", color: "#0d7a6e", source: "CEA Mar 2026" },
];

// ── Module cards ─────────────────────────────────────────────────────────────
const MODULES = [
  {
    icon: "⚡",
    label: "Power Data",
    desc: "Installed capacity, generation mix, transmission, tariffs",
    to: "/power-data/overview",
    tag: "CEA · MNRE",
  },
  {
    icon: "☀️",
    label: "Solar Intelligence",
    desc: "Site assessment, GHI/DNI analysis, yield simulation",
    to: "/geo-analytics/assessment",
    tag: "Solargis · NREL",
  },
  {
    icon: "🌬️",
    label: "Wind Intelligence",
    desc: "Wind speed mapping, hub-height analysis, annual yield",
    to: "/geo-analytics/assessment",
    tag: "ERA5 · RLDC",
  },
  {
    icon: "📈",
    label: "Power Market",
    desc: "IEX DAM/RTM prices, REC trading, exchange data",
    to: "/finance/power-trading",
    tag: "IEX · PXIL · HPX",
  },
  {
    icon: "📋",
    label: "Policy & Regulation",
    desc: "CERC orders, MNRE policy updates, compliance alerts",
    to: "/policy/policy-repository",
    tag: "CERC · MNRE · PIB",
  },
  {
    icon: "🏗️",
    label: "Project Intelligence",
    desc: "Awarded projects, developer profiles, tender pipeline",
    to: "/projects/project-directory",
    tag: "SECI · NTPC · IREDA",
  },
];

// ── RX² Phase cards ──────────────────────────────────────────────────────────
const RX2_PHASES = [
  { code: "R", label: "Resource", desc: "GHI, wind speed, hydrology mapping via satellite & ERA5" },
  { code: "E", label: "Evaluation", desc: "Technical feasibility, yield simulation, capacity sizing" },
  { code: "W", label: "Wayleave", desc: "Land availability, grid proximity, substation capacity" },
  { code: "A", label: "Analysis", desc: "Financial modelling: LCOE, IRR, NPV, payback, tariff benchmarks" },
  { code: "R₂", label: "Regulatory", desc: "CERC/SERC approvals, PPA templates, RPO compliance" },
  { code: "D", label: "Deployment", desc: "EPC procurement, commissioning schedule, O&M framework" },
  { code: "²", label: "RX² Score", desc: "Composite viability index combining all six dimensions (0–100)" },
];

// ── Trust band sources ────────────────────────────────────────────────────────
const TRUST_SOURCES = [
  "CEA (Ministry of Power)",
  "IEX / PXIL / HPX",
  "REC Registry",
  "RLDC / SLDC",
  "Solargis",
  "MNRE / PIB",
  "NITI Aayog",
  "IEA / Bloomberg",
];

function DashboardPage() {
  const pmOverview = usePowerMarketOverview();
  const capacitySummary = useCapacitySummary();

  // Top 5 states from API (sorted by total installed)
  const top5States = capacitySummary.data
    ? [...capacitySummary.data]
        .sort((a, b) => b.total_installed_mw - a.total_installed_mw)
        .slice(0, 5)
    : null;

  const totalTop5 = top5States
    ? top5States.reduce((s, r) => s + r.total_installed_mw, 0)
    : null;

  return (
    <div className="dashboard-redesign">

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="hero">
        <div className="hero-inner wrap">
          <div className="hero-left">
            <div className="s-tag">India · Renewable Energy Intelligence</div>
            <h1 className="hero-h1">POWER DATA<br /><em>DECODED</em></h1>
            <p className="hero-p">
              Real-time market intelligence for India's clean energy transition —
              capacity, generation, policy, finance &amp; geopolitical risk, consolidated
              from CEA, MNRE, IEX, CERC, and Ministry of Power.
            </p>
            <div className="hero-ctas">
              <Link to="/projects/india-data-center-registry" className="btn-primary">
                Data Center Registry
              </Link>
              <Link to="/projects/airport-registry" className="btn-outline">
                Airport Registry
              </Link>
            </div>
          </div>

          <div className="hero-right">
            <div className="dash-card">
              {/* Exchange Prices */}
              <div className="dash-card-section">
                <div className="dash-card-label">Power Exchange Prices · IEX</div>
                {pmOverview.isLoading && (
                  <div className="dash-card-loading">Loading market data…</div>
                )}
                {pmOverview.isError && (
                  <div className="dash-card-error">⚠ Error fetching IEX market data</div>
                )}
                {pmOverview.data && (
                  <div className="exchange-strip">
                    <div className="ex-item">
                      <span className="ex-label">DAM MCP</span>
                      <span className="ex-val">
                        ₹{((pmOverview.data.avg_tariff_per_kwh ?? 0) * 1000 / 1000).toFixed(2)}/kWh
                      </span>
                    </div>
                    <div className="ex-item">
                      <span className="ex-label">Total Capacity</span>
                      <span className="ex-val">
                        {(pmOverview.data.total_capacity_mw / 1000).toFixed(0)} GW
                      </span>
                    </div>
                    <div className="ex-item">
                      <span className="ex-label">RE Share</span>
                      <span className="ex-val">
                        {pmOverview.data.renewable_percent?.toFixed(1) ?? "—"}%
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Top 5 States */}
              <div className="dash-card-section">
                <div className="dash-card-label">Top 5 States · RE Capacity (MW)</div>
                {capacitySummary.isLoading && (
                  <div className="dash-card-loading">Loading capacity data…</div>
                )}
                {capacitySummary.isError && (
                  <div className="dash-card-error">⚠ Error fetching capacity data</div>
                )}
                {top5States && (
                  <table className="p5-table">
                    <tbody>
                      {top5States.map((row) => (
                        <tr key={row.state + row.energy_source}>
                          <td className="p5-state">{row.state}</td>
                          <td className="p5-source">{row.energy_source}</td>
                          <td className="p5-mw">
                            {row.total_installed_mw.toLocaleString("en-IN")} MW
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
                {totalTop5 !== null && (
                  <div className="p5-summary">
                    Top 5 total: <strong>{(totalTop5 / 1000).toFixed(1)} GW</strong>
                    <span className="p5-source-note"> · Source: CEA / MNRE</span>
                  </div>
                )}
              </div>

              <div className="dash-card-footer">
                <Link to="/power-data/overview" className="dash-card-link">
                  Full Power Data →
                </Link>
                <span className="dash-card-updated">Mar 2026 · CEA/MNRE</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Hero Strip: DC & Airport ─────────────────────────────────────── */}
      <div className="hero-strip">
        <Link to="/projects/india-data-center-registry" className="hs-panel">
          <div className="hs-icon">🏢</div>
          <div className="hs-content">
            <div className="hs-label">India Data Centers</div>
            <div className="hs-stats">
              <span>Grid: 0.98 GW</span>
              <span>Green: 0.55 GW</span>
            </div>
            <div className="hs-meta">Source: MeitY / LSEG · Mar 2026</div>
          </div>
          <span className="hs-arrow">→</span>
        </Link>
        <Link to="/projects/airport-registry" className="hs-panel">
          <div className="hs-icon">✈️</div>
          <div className="hs-content">
            <div className="hs-label">India Airports</div>
            <div className="hs-stats">
              <span>Grid: 1.87 GW</span>
              <span>Green: 0.53 GW</span>
            </div>
            <div className="hs-meta">Source: AAI / MoCA · Mar 2026</div>
          </div>
          <span className="hs-arrow">→</span>
        </Link>
      </div>

      {/* ── RE Capacity Band ────────────────────────────────────────────── */}
      <section className="re-band">
        <div className="wrap">
          <div className="re-band-label">
            <span className="s-tag">India RE Installed Capacity · CEA / MNRE · Mar 2026</span>
          </div>
          <div className="re-band-grid">
            {RE_CAPACITY.map((item) => (
              <div className="re-band-item" key={item.label}>
                <span className="re-band-dot" style={{ background: item.color }} />
                <span className="re-band-val">{item.value}</span>
                <span className="re-band-name">{item.label}</span>
                <span className="re-band-src">{item.source}</span>
              </div>
            ))}
          </div>
          <div className="re-band-cta">
            <Link to="/power-data/renewable-capacity">View Renewable Capacity Data →</Link>
          </div>
        </div>
      </section>

      {/* ── Power Generation Mix ─────────────────────────────────────────── */}
      <section className="pgen-band">
        <div className="wrap">
          <h2 className="pgen-heading">India Power Generation Mix</h2>
          <p className="s-sub">FY 2024-25 · Source: CEA Monthly Generation Report</p>
          <div className="pgen-grid">
            {GEN_MIX.map((item) => (
              <div className="pgen-card" key={item.label}>
                <div
                  className="pgen-bar"
                  style={{
                    background: `linear-gradient(180deg, ${item.color}22 0%, ${item.color}44 100%)`,
                    borderTop: `3px solid ${item.color}`,
                  }}
                >
                  <span className="pgen-pct" style={{ color: item.color }}>
                    {item.pct}%
                  </span>
                </div>
                <div className="pgen-label">{item.label}</div>
              </div>
            ))}
          </div>
          <div className="pgen-stack">
            {GEN_MIX.map((item) => (
              <div
                key={item.label}
                className="pgen-stack-seg"
                style={{ width: `${item.pct}%`, background: item.color }}
                title={`${item.label}: ${item.pct}%`}
              />
            ))}
          </div>
          <div className="pgen-cta">
            <Link to="/power-data/power-generation">View Full Generation Data →</Link>
          </div>
        </div>
      </section>

      {/* ── Modules Grid ────────────────────────────────────────────────── */}
      <section className="modules-section">
        <div className="wrap">
          <div className="s-tag">Platform Modules</div>
          <h2>Intelligence, Across Every Dimension</h2>
          <p className="s-sub">
            Six interconnected data modules — from raw resource assessment to live market prices.
          </p>
          <div className="modules-grid">
            {MODULES.map((mod) => (
              <Link to={mod.to} className="mod" key={mod.label}>
                <div className="mod-icon">{mod.icon}</div>
                <div className="mod-label">{mod.label}</div>
                <div className="mod-desc">{mod.desc}</div>
                <div className="mod-tag">{mod.tag}</div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── RX² Framework ───────────────────────────────────────────────── */}
      <section className="rx2-section">
        <div className="wrap">
          <div className="rx2-inner">
            <div className="rx2-badge">RX² REWARDS Framework</div>
            <h2 className="rx2-h2">Structured Site Intelligence</h2>
            <p className="rx2-desc">
              REWARD² is a seven-phase evaluation methodology for renewable energy site
              assessment — combining satellite data, grid proximity, financial modelling,
              and regulatory compliance into a single composite score.
            </p>
            <div className="rx2-phases">
              {RX2_PHASES.map((phase) => (
                <div className="phase-card" key={phase.code}>
                  <div className="phase-code">{phase.code}</div>
                  <div className="phase-label">{phase.label}</div>
                  <div className="phase-desc">{phase.desc}</div>
                </div>
              ))}
            </div>
            <div className="rx2-cta">
              <Link to="/geo-analytics/assessment" className="btn-primary">
                Run Site Assessment →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Energy Gap Panel ─────────────────────────────────────────────── */}
      <EnergyGapPanel />

      {/* ── Energy Projection 2030 ───────────────────────────────────────── */}
      <EnergyProjection2030Panel />

      {/* ── Iran Conflict Section ────────────────────────────────────────── */}
      <IranConflictSection />

      {/* ── Trust / Data Sources ─────────────────────────────────────────── */}
      <section className="trust-section">
        <div className="wrap">
          <div className="trust-label">Data Sources &amp; Coverage</div>
          <div className="trust-band">
            {TRUST_SOURCES.map((src) => (
              <span className="tb" key={src}>{src}</span>
            ))}
          </div>
          <p className="trust-note">
            All data is sourced from official Indian government publications, regulatory
            filings, and internationally recognised market intelligence. No synthetic or
            AI-generated data. Analytics are informational only.
          </p>
        </div>
      </section>
    </div>
  );
}

export default DashboardPage;
