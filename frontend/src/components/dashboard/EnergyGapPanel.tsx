import { useState } from "react";
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface TooltipEntry {
  dataKey: string;
  value: number;
  name: string;
  color: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string;
}

/* -------------------------------------------------------------------------- */
/*  Data                                                                       */
/* -------------------------------------------------------------------------- */

/**
 * All India Power Supply Position — Energy & Peak
 * Source: PIB Press Release PRID 2223710 / Lok Sabha Q No. 87, 05.02.2026
 * Ministry of Power, Central Electricity Authority (CEA)
 */
const ENERGY_GAP_DATA = [
  {
    year: "FY 22-23",
    requirementBU: 1513.5,
    suppliedBU: 1505.9,
    gapBU: 7.6,
    deficitPct: 0.5,
    peakDemandMW: 215888,
    peakMetMW: 207231,
    peakDeficitMW: 8657,
    peakDeficitPct: 4.0,
    partial: false,
  },
  {
    year: "FY 23-24",
    requirementBU: 1626.1,
    suppliedBU: 1622.0,
    gapBU: 4.1,
    deficitPct: 0.3,
    peakDemandMW: 243271,
    peakMetMW: 239931,
    peakDeficitMW: 3340,
    peakDeficitPct: 1.4,
    partial: false,
  },
  {
    year: "FY 24-25",
    requirementBU: 1694.0,
    suppliedBU: 1692.4,
    gapBU: 1.6,
    deficitPct: 0.1,
    peakDemandMW: 249856,
    peakMetMW: 249854,
    peakDeficitMW: 2,
    peakDeficitPct: 0.0,
    partial: false,
  },
  {
    year: "FY 25-26*",
    requirementBU: 1285.9,
    suppliedBU: 1285.6,
    gapBU: 0.4,
    deficitPct: 0.0,
    peakDemandMW: 242773,
    peakMetMW: 242493,
    peakDeficitMW: 280,
    peakDeficitPct: 0.1,
    partial: true,
  },
];

const PIB_SOURCE_URL =
  "https://www.pib.gov.in/PressReleseDetailm.aspx?PRID=2223710&reg=3&lang=2";

/* -------------------------------------------------------------------------- */
/*  Custom Tooltips                                                            */
/* -------------------------------------------------------------------------- */

function EnergyTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  const req = payload.find((p) => p.dataKey === "requirementBU");
  const sup = payload.find((p) => p.dataKey === "suppliedBU");
  const gap = payload.find((p) => p.dataKey === "deficitPct");
  return (
    <div className="egap-tooltip">
      <p className="egap-tooltip-label">{label}</p>
      {req && (
        <p className="egap-tooltip-row">
          <span className="egap-tooltip-dot" style={{ background: "#0f766e" }} />
          Requirement: <strong>{req.value.toLocaleString("en-IN")} BU</strong>
        </p>
      )}
      {sup && (
        <p className="egap-tooltip-row">
          <span className="egap-tooltip-dot" style={{ background: "#14b8a6" }} />
          Supplied: <strong>{sup.value.toLocaleString("en-IN")} BU</strong>
        </p>
      )}
      {gap && (
        <p className="egap-tooltip-row">
          <span className="egap-tooltip-dot" style={{ background: "#d97706" }} />
          Deficit: <strong>{gap.value.toFixed(1)}%</strong>
        </p>
      )}
    </div>
  );
}

function PeakTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  const demand = payload.find((p) => p.dataKey === "peakDemandMW");
  const met = payload.find((p) => p.dataKey === "peakMetMW");
  const gap = payload.find((p) => p.dataKey === "peakDeficitPct");
  return (
    <div className="egap-tooltip">
      <p className="egap-tooltip-label">{label}</p>
      {demand && (
        <p className="egap-tooltip-row">
          <span className="egap-tooltip-dot" style={{ background: "#0f766e" }} />
          Peak Demand: <strong>{demand.value.toLocaleString("en-IN")} MW</strong>
        </p>
      )}
      {met && (
        <p className="egap-tooltip-row">
          <span className="egap-tooltip-dot" style={{ background: "#14b8a6" }} />
          Peak Met: <strong>{met.value.toLocaleString("en-IN")} MW</strong>
        </p>
      )}
      {gap && (
        <p className="egap-tooltip-row">
          <span className="egap-tooltip-dot" style={{ background: "#d97706" }} />
          Peak Deficit: <strong>{gap.value.toFixed(1)}%</strong>
        </p>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Component                                                                  */
/* -------------------------------------------------------------------------- */

export default function EnergyGapPanel() {
  const [collapsed, setCollapsed] = useState(false);

  // Latest full year (FY 24-25) for the KPI cards
  const latest = ENERGY_GAP_DATA[2]!;
  const prev = ENERGY_GAP_DATA[0]!;

  return (
    <section className="egap-section">
      {/* ── Header ── */}
      <div
        className="egap-header"
        onClick={() => setCollapsed((c) => !c)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && setCollapsed((c) => !c)}
        aria-expanded={!collapsed}
      >
        <div className="egap-header-left">
          <div className="egap-header-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
          </div>
          <div>
            <h3 className="egap-title">India's Energy Gap &amp; Supply Position</h3>
            <p className="egap-subtitle">
              Energy requirement vs supplied — the renewable opportunity for Refex Energy
            </p>
          </div>
        </div>
        <div className="egap-header-right">
          <span className="egap-badge">Source: PIB / Ministry of Power</span>
          <button
            className="egap-collapse-btn"
            onClick={(e) => { e.stopPropagation(); setCollapsed((c) => !c); }}
            aria-label={collapsed ? "Expand panel" : "Collapse panel"}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              width="16"
              height="16"
              className={`egap-chevron ${collapsed ? "egap-chevron--collapsed" : ""}`}
            >
              <polyline points="18 15 12 9 6 15" />
            </svg>
          </button>
        </div>
      </div>

      {/* ── Body (collapsible) ── */}
      {!collapsed && (
        <div className="egap-body">
          {/* ── Context callout ── */}
          <div className="egap-callout">
            <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
            <p>
              Despite rapid improvements, India still had an energy deficit of{" "}
              <strong>1,590 MU</strong> in FY 2024-25 — with peak demand meeting a negligible{" "}
              <strong>2 MW shortfall</strong>. The gap has narrowed from{" "}
              <strong>7,583 MU (0.5%)</strong> in FY 2022-23, largely driven by transmission{" "}
              and distribution (T&amp;D) constraints at the state level. Renewable capacity additions
              by companies like <strong>Refex Energy</strong> directly address this gap by
              decentralising generation and reducing system losses.
            </p>
          </div>

          {/* ── KPI Cards ── */}
          <div className="egap-kpi-row">
            <div className="egap-kpi-card">
              <span className="egap-kpi-label">Energy Requirement</span>
              <span className="egap-kpi-value">
                {latest.requirementBU.toLocaleString("en-IN")} BU
              </span>
              <span className="egap-kpi-period">FY 2024-25</span>
            </div>
            <div className="egap-kpi-card">
              <span className="egap-kpi-label">Energy Supplied</span>
              <span className="egap-kpi-value egap-kpi-value--green">
                {latest.suppliedBU.toLocaleString("en-IN")} BU
              </span>
              <span className="egap-kpi-period">FY 2024-25</span>
            </div>
            <div className="egap-kpi-card egap-kpi-card--accent">
              <span className="egap-kpi-label">Energy Gap (Not Supplied)</span>
              <span className="egap-kpi-value egap-kpi-value--warning">
                1,590 MU
              </span>
              <span className="egap-kpi-period">
                ↓ {((1 - latest.gapBU / prev.gapBU) * 100).toFixed(0)}% vs FY 2022-23
              </span>
            </div>
            <div className="egap-kpi-card egap-kpi-card--accent">
              <span className="egap-kpi-label">Peak Demand Deficit</span>
              <span className="egap-kpi-value egap-kpi-value--warning">
                2 MW
              </span>
              <span className="egap-kpi-period">
                ↓ from 8,657 MW in FY 2022-23
              </span>
            </div>
          </div>

          {/* ── Charts ── */}
          <div className="egap-charts-row">
            {/* Energy Chart */}
            <div className="egap-chart-card">
              <h4 className="egap-chart-title">Energy Requirement vs Supplied (BU)</h4>
              <p className="egap-chart-desc">
                Billion Units (MU ÷ 1,000) &nbsp;·&nbsp; Line = Deficit %
              </p>
              <ResponsiveContainer width="100%" height={260}>
                <ComposedChart data={ENERGY_GAP_DATA} margin={{ top: 8, right: 24, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis
                    dataKey="year"
                    tick={{ fontSize: 11, fill: "#64748b" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    yAxisId="bu"
                    domain={[1100, 1800]}
                    tick={{ fontSize: 11, fill: "#64748b" }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v: number) => `${v}`}
                    width={40}
                  />
                  <YAxis
                    yAxisId="pct"
                    orientation="right"
                    domain={[0, 6]}
                    tick={{ fontSize: 11, fill: "#d97706" }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v: number) => `${v}%`}
                    width={36}
                  />
                  <Tooltip content={<EnergyTooltip />} />
                  <Legend
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                  />
                  <Bar
                    yAxisId="bu"
                    dataKey="requirementBU"
                    name="Requirement (BU)"
                    fill="#0f766e"
                    radius={[3, 3, 0, 0]}
                    maxBarSize={36}
                  />
                  <Bar
                    yAxisId="bu"
                    dataKey="suppliedBU"
                    name="Supplied (BU)"
                    fill="#5eead4"
                    radius={[3, 3, 0, 0]}
                    maxBarSize={36}
                  />
                  <Line
                    yAxisId="pct"
                    type="monotone"
                    dataKey="deficitPct"
                    name="Deficit %"
                    stroke="#d97706"
                    strokeWidth={2}
                    dot={{ r: 4, fill: "#d97706", strokeWidth: 0 }}
                    activeDot={{ r: 6 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            {/* Peak Chart */}
            <div className="egap-chart-card">
              <h4 className="egap-chart-title">Peak Demand vs Peak Met (MW)</h4>
              <p className="egap-chart-desc">Megawatts &nbsp;·&nbsp; Line = Peak Deficit %</p>
              <ResponsiveContainer width="100%" height={260}>
                <ComposedChart data={ENERGY_GAP_DATA} margin={{ top: 8, right: 24, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis
                    dataKey="year"
                    tick={{ fontSize: 11, fill: "#64748b" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    yAxisId="mw"
                    domain={[150000, 270000]}
                    tick={{ fontSize: 11, fill: "#64748b" }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`}
                    width={40}
                  />
                  <YAxis
                    yAxisId="pct"
                    orientation="right"
                    domain={[0, 6]}
                    tick={{ fontSize: 11, fill: "#d97706" }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v: number) => `${v}%`}
                    width={36}
                  />
                  <Tooltip content={<PeakTooltip />} />
                  <Legend
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                  />
                  <Bar
                    yAxisId="mw"
                    dataKey="peakDemandMW"
                    name="Peak Demand (MW)"
                    fill="#0f766e"
                    radius={[3, 3, 0, 0]}
                    maxBarSize={36}
                  />
                  <Bar
                    yAxisId="mw"
                    dataKey="peakMetMW"
                    name="Peak Met (MW)"
                    fill="#5eead4"
                    radius={[3, 3, 0, 0]}
                    maxBarSize={36}
                  />
                  <Line
                    yAxisId="pct"
                    type="monotone"
                    dataKey="peakDeficitPct"
                    name="Peak Deficit %"
                    stroke="#d97706"
                    strokeWidth={2}
                    dot={{ r: 4, fill: "#d97706", strokeWidth: 0 }}
                    activeDot={{ r: 6 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* ── Trend table ── */}
          <div className="egap-table-wrapper">
            <table className="egap-table">
              <thead>
                <tr>
                  <th>Financial Year</th>
                  <th className="egap-num">Requirement (MU)</th>
                  <th className="egap-num">Supplied (MU)</th>
                  <th className="egap-num">Gap — Not Supplied (MU)</th>
                  <th className="egap-num">Deficit %</th>
                  <th className="egap-num">Peak Demand (MW)</th>
                  <th className="egap-num">Peak Met (MW)</th>
                  <th className="egap-num">Peak Deficit (MW)</th>
                  <th className="egap-num">Peak Deficit %</th>
                </tr>
              </thead>
              <tbody>
                {ENERGY_GAP_DATA.map((row) => (
                  <tr key={row.year} className={row.partial ? "egap-row--partial" : ""}>
                    <td>
                      {row.year}
                      {row.partial && (
                        <span className="egap-partial-badge">Apr–Dec</span>
                      )}
                    </td>
                    <td className="egap-num">{(row.requirementBU * 1000).toLocaleString("en-IN")}</td>
                    <td className="egap-num">{(row.suppliedBU * 1000).toLocaleString("en-IN")}</td>
                    <td className="egap-num egap-gap-cell">{(row.gapBU * 1000).toLocaleString("en-IN")}</td>
                    <td className="egap-num egap-pct-cell">−{row.deficitPct.toFixed(1)}%</td>
                    <td className="egap-num">{row.peakDemandMW.toLocaleString("en-IN")}</td>
                    <td className="egap-num">{row.peakMetMW.toLocaleString("en-IN")}</td>
                    <td className="egap-num egap-gap-cell">{row.peakDeficitMW.toLocaleString("en-IN")}</td>
                    <td className="egap-num egap-pct-cell">−{row.peakDeficitPct.toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ── Source footer ── */}
          <div className="egap-source">
            <svg viewBox="0 0 20 20" fill="currentColor" width="13" height="13">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            Data sourced from{" "}
            <a href={PIB_SOURCE_URL} target="_blank" rel="noopener noreferrer">
              PIB Press Release PRID 2223710
            </a>{" "}
            &amp; Lok Sabha Starred Question No. 87 (05.02.2026), Ministry of Power / CEA.{" "}
            *FY 2025-26 data is partial (April–December 2025). MU = Million Units; BU = Billion Units.
          </div>
        </div>
      )}
    </section>
  );
}
