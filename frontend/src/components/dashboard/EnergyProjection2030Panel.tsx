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

/* -------------------------------------------------------------------------- */
/*  Types                                                                       */
/* -------------------------------------------------------------------------- */

type RowType = "historical" | "projected";

interface ProjectionDataPoint {
  year: string;
  type: RowType;
  totalDemandBU: number;
  reGenerationBU: number | null;
  reTargetBU: number | null;
  dcDemandBU: number | null;
  reCapacityGW: number | null;
}

interface TooltipEntry {
  dataKey: string;
  value: number;
  name: string;
  color: string;
}

interface ProjectionTooltipProps {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string;
}

/* -------------------------------------------------------------------------- */
/*  Data                                                                        */
/*  Sources: CEA National Electricity Plan 2022-2032, NITI Aayog Energy        */
/*  Security & Net Zero Report, MNRE monthly reports, CBRE India 2024          */
/* -------------------------------------------------------------------------- */

const PROJECTION_DATA: ProjectionDataPoint[] = [
  // Historical — full year actuals (FY22-23 to FY24-25)
  { year: "FY 22-23", type: "historical", totalDemandBU: 1513.5, reGenerationBU: 280,  reTargetBU: null, dcDemandBU: null, reCapacityGW: 168 },
  { year: "FY 23-24", type: "historical", totalDemandBU: 1626.1, reGenerationBU: 310,  reTargetBU: null, dcDemandBU: null, reCapacityGW: 190 },
  { year: "FY 24-25", type: "historical", totalDemandBU: 1694.0, reGenerationBU: 350,  reTargetBU: null, dcDemandBU: 70,   reCapacityGW: 205 },
  // Projected — NITI Aayog / CEA NEP targets
  { year: "FY 26-27", type: "projected",  totalDemandBU: 1855,   reGenerationBU: null, reTargetBU: 480,  dcDemandBU: 100,  reCapacityGW: 290 },
  { year: "FY 27-28", type: "projected",  totalDemandBU: 1975,   reGenerationBU: null, reTargetBU: 600,  dcDemandBU: 130,  reCapacityGW: 350 },
  { year: "FY 28-29", type: "projected",  totalDemandBU: 2100,   reGenerationBU: null, reTargetBU: 720,  dcDemandBU: 165,  reCapacityGW: 410 },
  { year: "FY 29-30", type: "projected",  totalDemandBU: 2250,   reGenerationBU: null, reTargetBU: 810,  dcDemandBU: 200,  reCapacityGW: 450 },
  { year: "FY 30-31", type: "projected",  totalDemandBU: 2500,   reGenerationBU: null, reTargetBU: 930,  dcDemandBU: 250,  reCapacityGW: 500 },
];

const KPI_CARDS = [
  { label: "2030 RE Capacity Target", value: "500 GW",   sub: "MNRE National Target",          accent: false },
  { label: "RE Generation by 2030",   value: "~930 BU",  sub: "37% of projected demand",       accent: false },
  { label: "Projected 2030 Demand",   value: "~2,500 BU", sub: "+47% vs FY 2022-23",           accent: true  },
  { label: "Data Center Power '30",   value: "~25 GW",   sub: "~250 BU — deficit opportunity", accent: true  },
] as const;

/* -------------------------------------------------------------------------- */
/*  Custom Tooltip                                                              */
/* -------------------------------------------------------------------------- */

function ProjectionTooltip({ active, payload, label }: ProjectionTooltipProps) {
  if (!active || !payload?.length) return null;
  const demand   = payload.find((p) => p.dataKey === "totalDemandBU");
  const reGen    = payload.find((p) => p.dataKey === "reGenerationBU");
  const reTarget = payload.find((p) => p.dataKey === "reTargetBU");
  const dc       = payload.find((p) => p.dataKey === "dcDemandBU");
  const cap      = payload.find((p) => p.dataKey === "reCapacityGW");

  return (
    <div className="egap-tooltip">
      <p className="egap-tooltip-label">{label}</p>
      {demand && (
        <p className="egap-tooltip-row">
          <span className="egap-tooltip-dot" style={{ background: "#3b82f6" }} />
          Total Demand: <strong>{demand.value.toLocaleString("en-IN")} BU</strong>
        </p>
      )}
      {(reGen ?? reTarget) && (
        <p className="egap-tooltip-row">
          <span className="egap-tooltip-dot" style={{ background: "#0f766e" }} />
          RE Generation: <strong>{((reGen?.value ?? reTarget?.value) ?? 0).toLocaleString("en-IN")} BU</strong>
          {reTarget && <span style={{ fontSize: "10px", color: "#9ca3af", marginLeft: 4 }}>(projected)</span>}
        </p>
      )}
      {dc && (
        <p className="egap-tooltip-row">
          <span className="egap-tooltip-dot" style={{ background: "#d97706" }} />
          DC Demand: <strong>{dc.value.toLocaleString("en-IN")} BU</strong>
        </p>
      )}
      {cap && (
        <p className="egap-tooltip-row">
          <span className="egap-tooltip-dot" style={{ background: "#8b5cf6" }} />
          RE Installed: <strong>{cap.value} GW</strong>
        </p>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Component                                                                   */
/* -------------------------------------------------------------------------- */

export default function EnergyProjection2030Panel() {
  const [collapsed, setCollapsed] = useState(false);
  const [tab, setTab]             = useState<"chart" | "table">("chart");

  return (
    <section className="egap-section">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div
        className="egap-header"
        onClick={() => setCollapsed((c) => !c)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === "Enter") setCollapsed((c) => !c); }}
        aria-expanded={!collapsed}
      >
        <div className="egap-header-left">
          <div className="egap-header-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                 width="20" height="20">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
          </div>
          <div>
            <h3 className="egap-title">India Energy Projection to 2030</h3>
            <p className="egap-subtitle">
              Demand forecast &amp; renewable energy trajectory — deficit fuelling RE opportunity
            </p>
          </div>
        </div>
        <div className="egap-header-right">
          <span className="egap-badge">Source: NITI Aayog · CEA NEP 2022-32 · MNRE</span>
          <button
            className="egap-collapse-btn"
            onClick={(e) => { e.stopPropagation(); setCollapsed((c) => !c); }}
            aria-label={collapsed ? "Expand panel" : "Collapse panel"}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                 width="16" height="16"
                 className={`egap-chevron${collapsed ? " egap-chevron--collapsed" : ""}`}>
              <polyline points="18 15 12 9 6 15" />
            </svg>
          </button>
        </div>
      </div>

      {/* ── Body ───────────────────────────────────────────────────────────── */}
      {!collapsed && (
        <div className="egap-body">

          {/* Callout */}
          <div className="egap-callout">
            <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
            <p>
              India's energy demand is projected to reach <strong>~2,500 BU by FY 2030-31</strong>,
              up 47% from 1,513 BU in FY 2022-23. The historical energy deficit — states that
              couldn't be supplied — is the direct opportunity for renewables to fill. India's{" "}
              <strong>500 GW RE target by 2030</strong> will generate ~930 BU annually (~37% of
              projected demand). Data centers are a key demand driver, growing from ~8 GW today
              to <strong>~25 GW by 2030</strong>, representing ~100 BU of incremental load that
              must be met by clean energy.
            </p>
          </div>

          {/* KPI Cards */}
          <div className="egap-kpi-row">
            {KPI_CARDS.map((k) => (
              <div
                key={k.label}
                className={`egap-kpi-card${k.accent ? " egap-kpi-card--accent" : ""}`}
              >
                <span className="egap-kpi-label">{k.label}</span>
                <span className="egap-kpi-value egap-kpi-value--green">{k.value}</span>
                <span className="egap-kpi-period">{k.sub}</span>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div className="egap-tabs">
            <button
              className={`egap-tab${tab === "chart" ? " egap-tab--active" : ""}`}
              onClick={() => setTab("chart")}
            >
              Projection Chart
            </button>
            <button
              className={`egap-tab${tab === "table" ? " egap-tab--active" : ""}`}
              onClick={() => setTab("table")}
            >
              Data Table
            </button>
          </div>

          {/* ── Chart Tab ────────────────────────────────────────────────── */}
          {tab === "chart" && (
            <div className="egap-charts-row" style={{ gridTemplateColumns: "1fr" }}>
              <div className="egap-chart-card">
                <h4 className="egap-chart-title">
                  Energy Demand vs RE Generation — Historical &amp; Projected to 2030
                </h4>
                <p className="egap-chart-desc">
                  Bars = RE generation/target (teal) · Orange = data center demand ·
                  Blue line = total demand trajectory · Purple dashed = RE installed capacity (GW, right axis) ·
                  <em> Lighter columns are projected years</em>
                </p>
                <ResponsiveContainer width="100%" height={340}>
                  <ComposedChart
                    data={PROJECTION_DATA}
                    margin={{ top: 8, right: 56, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis
                      dataKey="year"
                      tick={{ fontSize: 11, fill: "#64748b" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    {/* Left axis: BU */}
                    <YAxis
                      yAxisId="bu"
                      domain={[0, 3000]}
                      tick={{ fontSize: 11, fill: "#64748b" }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v: number) => `${v}`}
                      width={48}
                      label={{
                        value: "BU",
                        position: "insideTopLeft",
                        offset: -4,
                        style: { fontSize: 10, fill: "#94a3b8" },
                      }}
                    />
                    {/* Right axis: GW */}
                    <YAxis
                      yAxisId="gw"
                      orientation="right"
                      domain={[0, 600]}
                      tick={{ fontSize: 11, fill: "#8b5cf6" }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v: number) => `${v}`}
                      width={44}
                      label={{
                        value: "GW",
                        position: "insideTopRight",
                        offset: -4,
                        style: { fontSize: 10, fill: "#8b5cf6" },
                      }}
                    />
                    <Tooltip content={<ProjectionTooltip />} />
                    <Legend
                      iconType="circle"
                      iconSize={8}
                      wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                    />

                    {/* Historical RE generation (solid teal) */}
                    <Bar
                      yAxisId="bu"
                      dataKey="reGenerationBU"
                      name="RE Generation — Actual (BU)"
                      fill="#0f766e"
                      radius={[3, 3, 0, 0]}
                      maxBarSize={34}
                    />

                    {/* Projected RE target (lighter teal) */}
                    <Bar
                      yAxisId="bu"
                      dataKey="reTargetBU"
                      name="RE Generation — Projected (BU)"
                      fill="#5eead4"
                      radius={[3, 3, 0, 0]}
                      maxBarSize={34}
                    />

                    {/* Data center demand (amber) */}
                    <Bar
                      yAxisId="bu"
                      dataKey="dcDemandBU"
                      name="Data Center Demand (BU)"
                      fill="#d97706"
                      radius={[3, 3, 0, 0]}
                      maxBarSize={34}
                    />

                    {/* Total demand line (blue) */}
                    <Line
                      yAxisId="bu"
                      type="monotone"
                      dataKey="totalDemandBU"
                      name="Total Demand (BU)"
                      stroke="#3b82f6"
                      strokeWidth={2.5}
                      dot={{ r: 4, fill: "#3b82f6", strokeWidth: 0 }}
                      activeDot={{ r: 6 }}
                    />

                    {/* RE Installed Capacity (purple dashed, right axis) */}
                    <Line
                      yAxisId="gw"
                      type="monotone"
                      dataKey="reCapacityGW"
                      name="RE Installed Capacity (GW)"
                      stroke="#8b5cf6"
                      strokeWidth={2}
                      strokeDasharray="5 3"
                      dot={{ r: 3, fill: "#8b5cf6", strokeWidth: 0 }}
                      activeDot={{ r: 5 }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>

                <p style={{ fontSize: "11px", color: "#94a3b8", marginTop: "8px", lineHeight: 1.5 }}>
                  * FY 25-26 omitted (partial year data). Projected years (FY 26-27 onwards) use
                  CEA NEP 2022-32 demand forecasts and MNRE 500 GW RE targets. Data center demand
                  estimated at installed GW × 8,760h × 0.85 load factor. BU = Billion Units.
                </p>
              </div>
            </div>
          )}

          {/* ── Table Tab ────────────────────────────────────────────────── */}
          {tab === "table" && (
            <div className="egap-table-wrapper">
              <table className="egap-table">
                <thead>
                  <tr>
                    <th>Year</th>
                    <th>Type</th>
                    <th className="egap-num">Total Demand (BU)</th>
                    <th className="egap-num">RE Generation (BU)</th>
                    <th className="egap-num">DC Demand (BU)</th>
                    <th className="egap-num">RE Capacity (GW)</th>
                    <th className="egap-num">RE Share %</th>
                  </tr>
                </thead>
                <tbody>
                  {PROJECTION_DATA.map((row) => {
                    const reActual = row.reGenerationBU ?? row.reTargetBU ?? 0;
                    const rePct =
                      row.totalDemandBU > 0
                        ? ((reActual / row.totalDemandBU) * 100).toFixed(1)
                        : "—";
                    return (
                      <tr
                        key={row.year}
                        className={row.type === "projected" ? "ep30-projected-row" : ""}
                      >
                        <td>
                          {row.year}
                          {row.type === "projected" && (
                            <span className="egap-partial-badge" style={{ marginLeft: "6px" }}>
                              projected
                            </span>
                          )}
                        </td>
                        <td style={{ textTransform: "capitalize", color: "#64748b", fontSize: "12px" }}>
                          {row.type}
                        </td>
                        <td className="egap-num">
                          {row.totalDemandBU.toLocaleString("en-IN")}
                        </td>
                        <td className="egap-num" style={{ color: "#0f766e" }}>
                          {reActual.toLocaleString("en-IN")}
                          {row.type === "projected" && (
                            <span style={{ color: "#9ca3af", fontSize: "10px", marginLeft: 3 }}>*</span>
                          )}
                        </td>
                        <td className="egap-num egap-gap-cell">
                          {row.dcDemandBU != null ? row.dcDemandBU.toLocaleString("en-IN") : "—"}
                        </td>
                        <td className="egap-num" style={{ color: "#8b5cf6" }}>
                          {row.reCapacityGW ?? "—"}
                        </td>
                        <td className="egap-num">{rePct}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Source footer */}
          <div className="egap-source">
            <svg viewBox="0 0 20 20" fill="currentColor" width="13" height="13">
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              />
            </svg>
            Projections sourced from{" "}
            <a
              href="https://www.niti.gov.in/sites/default/files/2022-08/IEO_22.pdf"
              target="_blank"
              rel="noopener noreferrer"
            >
              NITI Aayog Energy Security &amp; Net Zero Report
            </a>{" "}
            and{" "}
            <a
              href="https://cea.nic.in/national-electricity-plan/"
              target="_blank"
              rel="noopener noreferrer"
            >
              CEA National Electricity Plan 2022-2032
            </a>
            . RE capacity from MNRE monthly reports. Data center power from CBRE / JLL India
            2024 industry estimates. BU = Billion Units. GW = Gigawatts. Projections are
            indicative.
          </div>
        </div>
      )}
    </section>
  );
}
