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

/* ── RBI Handbook 2024-25 · Table 34: Central Sector Projects Status ─────── */
const years = [2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024];

const powerProjects = [
  { year: 2012, total: 101, ahead: 1, onSchedule: 49, delayed: 50, withoutDOC: 1 },
  { year: 2013, total: 101, ahead: 1, onSchedule: 44, delayed: 53, withoutDOC: 3 },
  { year: 2014, total: 96,  ahead: 2, onSchedule: 36, delayed: 44, withoutDOC: 14 },
  { year: 2015, total: 105, ahead: 1, onSchedule: 38, delayed: 63, withoutDOC: 3 },
  { year: 2016, total: 111, ahead: 1, onSchedule: 43, delayed: 64, withoutDOC: 3 },
  { year: 2017, total: 133, ahead: 4, onSchedule: 57, delayed: 57, withoutDOC: 15 },
  { year: 2018, total: 117, ahead: 1, onSchedule: 46, delayed: 62, withoutDOC: 8 },
  { year: 2019, total: 78,  ahead: 0, onSchedule: 20, delayed: 51, withoutDOC: 7 },
  { year: 2020, total: 69,  ahead: 0, onSchedule: 10, delayed: 47, withoutDOC: 12 },
  { year: 2021, total: 78,  ahead: 0, onSchedule: 8,  delayed: 51, withoutDOC: 19 },
  { year: 2022, total: 89,  ahead: 0, onSchedule: 21, delayed: 57, withoutDOC: 11 },
  { year: 2023, total: 78,  ahead: 0, onSchedule: 13, delayed: 54, withoutDOC: 11 },
  { year: 2024, total: 101, ahead: 2, onSchedule: 34, delayed: 52, withoutDOC: 13 },
];

/* ── Table 35: Cost Overrun of Delayed Power Sector Projects (₹ Crore) ───── */
const powerCostOverrun = [
  { year: 2012, projects: 50, origEst: 137766, nowAntici: 152267, overrun: 14501 },
  { year: 2013, projects: 53, origEst: 135656, nowAntici: 150492, overrun: 14836 },
  { year: 2014, projects: 44, origEst: 124490, nowAntici: 142172, overrun: 17682 },
  { year: 2015, projects: 63, origEst: 164942, nowAntici: 193266, overrun: 28324 },
  { year: 2016, projects: 64, origEst: 171622, nowAntici: 208830, overrun: 37208 },
  { year: 2017, projects: 57, origEst: 199226, nowAntici: 230151, overrun: 30925 },
  { year: 2018, projects: 62, origEst: 227593, nowAntici: 274184, overrun: 46591 },
  { year: 2019, projects: 51, origEst: 199221, nowAntici: 244605, overrun: 45384 },
  { year: 2020, projects: 47, origEst: 199760, nowAntici: 270014, overrun: 70254 },
  { year: 2021, projects: 51, origEst: 222574, nowAntici: 291234, overrun: 68660 },
  { year: 2022, projects: 27, origEst: 107459, nowAntici: 171791, overrun: 64332 },
  { year: 2023, projects: 22, origEst: 78351,  nowAntici: 134019, overrun: 55668 },
  { year: 2024, projects: 19, origEst: 71505,  nowAntici: 126381, overrun: 54876 },
];

/* ── Other Key Sectors for comparison (Table 34) ─────────────────────────── */
const sectorComparison2024 = [
  { sector: "Power",            total: 101, delayed: 52, onSchedule: 34, delayedPct: 51.5 },
  { sector: "Railways",         total: 249, delayed: 109, onSchedule: 55, delayedPct: 43.8 },
  { sector: "Surface Transport",total: 479, delayed: 272, onSchedule: 186, delayedPct: 56.8 },
  { sector: "Petroleum",        total: 107, delayed: 60, onSchedule: 43, delayedPct: 56.1 },
  { sector: "Coal",             total: 120, delayed: 48, onSchedule: 69, delayedPct: 40.0 },
  { sector: "Civil Aviation",   total: 35,  delayed: 18, onSchedule: 10, delayedPct: 51.4 },
];

/* ── Petroleum sector cost overrun for comparison (Table 35) ─────────────── */
const petroleumCostOverrun = [
  { year: 2012, overrun: 8200 },
  { year: 2013, overrun: 10100 },
  { year: 2014, overrun: 14265 },
  { year: 2015, overrun: 13102 },
  { year: 2016, overrun: 2004 },
  { year: 2017, overrun: 68 },
  { year: 2018, overrun: 3524 },
  { year: 2019, overrun: 4942 },
  { year: 2020, overrun: 11470 },
  { year: 2021, overrun: 6944 },
  { year: 2022, overrun: 24532 },
  { year: 2023, overrun: 22048 },
  { year: 2024, overrun: 64821 },
];

const combinedCostData = years.map((yr, i) => ({
  year: yr,
  powerOverrun: powerCostOverrun[i].overrun,
  petroleumOverrun: petroleumCostOverrun[i].overrun,
  powerOverrunPct: ((powerCostOverrun[i].overrun / powerCostOverrun[i].origEst) * 100).toFixed(1),
}));

const fmtNum = (n: number) => n.toLocaleString("en-IN");
const fmtCr = (n: number) =>
  n >= 100000 ? `₹${(n / 100000).toFixed(1)}L Cr` : `₹${(n / 1000).toFixed(1)}K Cr`;

type ActiveTab = "status" | "overrun" | "comparison";

export default function RBIInfraPipelinePage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("status");

  const latest = powerProjects[powerProjects.length - 1];
  const latestCost = powerCostOverrun[powerCostOverrun.length - 1];
  const delayedPct = ((latest.delayed / latest.total) * 100).toFixed(0);
  const overrunPct = ((latestCost.overrun / latestCost.origEst) * 100).toFixed(1);

  return (
    <div className="pm-page">
      <div className="pm-header">
        <h2>Infrastructure Pipeline &amp; Power Projects</h2>
        <p>
          RBI Handbook 2024-25 · Tables 34 &amp; 35 · Central Sector Projects ≥ ₹150 Cr ·
          Status as on End-March 2024
        </p>
      </div>

      {/* KPI Cards */}
      <div className="pm-stats-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
        <div className="pm-stat-card">
          <span className="pm-stat-label">Power Projects (2024)</span>
          <span className="pm-stat-value">{latest.total}</span>
          <span style={{ fontSize: "0.75rem", color: "#64748b" }}>Central sector projects tracked</span>
        </div>
        <div className="pm-stat-card" style={{ borderTopColor: "#dc2626" }}>
          <span className="pm-stat-label">Delayed Projects</span>
          <span className="pm-stat-value" style={{ color: "#dc2626" }}>{latest.delayed}</span>
          <span style={{ fontSize: "0.75rem", color: "#dc2626" }}>{delayedPct}% of total power projects</span>
        </div>
        <div className="pm-stat-card pm-stat-card--accent">
          <span className="pm-stat-label">Cost Overrun (Power 2024)</span>
          <span className="pm-stat-value">{fmtCr(latestCost.overrun)}</span>
          <span style={{ fontSize: "0.75rem", color: "#d97706" }}>{overrunPct}% above original estimate</span>
        </div>
        <div className="pm-stat-card">
          <span className="pm-stat-label">On Schedule (2024)</span>
          <span className="pm-stat-value" style={{ color: "#16a34a" }}>{latest.onSchedule}</span>
          <span style={{ fontSize: "0.75rem", color: "#16a34a" }}>Recovery from 8 in 2021</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="pm-tabs">
        {(
          [
            { id: "status", label: "Project Status Trend (Table 34)" },
            { id: "overrun", label: "Cost Overrun Analysis (Table 35)" },
            { id: "comparison", label: "Cross-Sector Comparison (2024)" },
          ] as { id: ActiveTab; label: string }[]
        ).map((t) => (
          <button
            key={t.id}
            className={`pm-tab${activeTab === t.id ? " pm-tab--active" : ""}`}
            onClick={() => setActiveTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Status trend */}
      {activeTab === "status" && (
        <div className="pm-section">
          <h3>Power Sector — Central Project Status (2012–2024)</h3>
          <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "1.5rem", marginBottom: "1.5rem" }}>
            <ResponsiveContainer width="100%" height={380}>
              <ComposedChart data={powerProjects} margin={{ top: 10, right: 20, left: 10, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="year" tick={{ fontSize: 12 }} />
                <YAxis yAxisId="left" label={{ value: "No. of Projects", angle: -90, position: "insideLeft", fontSize: 11 }} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Bar yAxisId="left" dataKey="onSchedule" name="On Schedule" stackId="a" fill="#16a34a" />
                <Bar yAxisId="left" dataKey="ahead" name="Ahead of Schedule" stackId="a" fill="#0f766e" />
                <Bar yAxisId="left" dataKey="delayed" name="Delayed" stackId="a" fill="#dc2626" />
                <Bar yAxisId="left" dataKey="withoutDOC" name="Without D.O.C." stackId="a" fill="#f59e0b" />
                <Line yAxisId="left" type="monotone" dataKey="total" name="Total Projects" stroke="#334155" strokeWidth={2} dot={{ r: 3 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          <div className="pm-table-wrapper">
            <table className="pm-table">
              <thead>
                <tr>
                  <th>Year</th>
                  <th className="pm-num">Total</th>
                  <th className="pm-num">Ahead</th>
                  <th className="pm-num">On Schedule</th>
                  <th className="pm-num">Delayed</th>
                  <th className="pm-num">Without D.O.C.</th>
                  <th className="pm-num">Delay Rate</th>
                </tr>
              </thead>
              <tbody>
                {powerProjects.map((r) => (
                  <tr key={r.year}>
                    <td><strong>{r.year}</strong></td>
                    <td className="pm-num">{r.total}</td>
                    <td className="pm-num" style={{ color: "#0f766e" }}>{r.ahead}</td>
                    <td className="pm-num" style={{ color: "#16a34a" }}>{r.onSchedule}</td>
                    <td className="pm-num" style={{ color: "#dc2626", fontWeight: 600 }}>{r.delayed}</td>
                    <td className="pm-num" style={{ color: "#d97706" }}>{r.withoutDOC}</td>
                    <td className="pm-num" style={{ color: r.delayed / r.total > 0.5 ? "#dc2626" : "#d97706", fontWeight: 600 }}>
                      {((r.delayed / r.total) * 100).toFixed(0)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p style={{ fontSize: "0.8rem", color: "#94a3b8", marginTop: "0.75rem" }}>
            Source: RBI Handbook 2024-25 · Table 34 — Implementation of Central Sector Projects Status (End-March)
            · D.O.C. = Date of Completion
          </p>
        </div>
      )}

      {/* Cost overrun */}
      {activeTab === "overrun" && (
        <div className="pm-section">
          <h3>Power &amp; Petroleum — Cost Overrun of Delayed Projects (₹ Crore)</h3>
          <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "1.5rem", marginBottom: "1.5rem" }}>
            <ResponsiveContainer width="100%" height={380}>
              <ComposedChart data={combinedCostData} margin={{ top: 10, right: 30, left: 20, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="year" tick={{ fontSize: 12 }} />
                <YAxis
                  yAxisId="left"
                  tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`}
                  tick={{ fontSize: 11 }}
                  label={{ value: "₹ Crore (000s)", angle: -90, position: "insideLeft", offset: -5, fontSize: 11 }}
                />
                <Tooltip
                  formatter={(v: number, n: string) => [`₹${fmtNum(v)} Cr`, n]}
                />
                <Legend />
                <Bar yAxisId="left" dataKey="powerOverrun" name="Power Sector Overrun" fill="#0f766e" radius={[4, 4, 0, 0]} />
                <Bar yAxisId="left" dataKey="petroleumOverrun" name="Petroleum Sector Overrun" fill="#d97706" radius={[4, 4, 0, 0]} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          <div className="pm-table-wrapper">
            <table className="pm-table">
              <thead>
                <tr>
                  <th>Year</th>
                  <th className="pm-num">Delayed Projects</th>
                  <th className="pm-num">Original Estimate (₹ Cr)</th>
                  <th className="pm-num">Now Anticipated (₹ Cr)</th>
                  <th className="pm-num">Cost Overrun (₹ Cr)</th>
                  <th className="pm-num">Overrun %</th>
                </tr>
              </thead>
              <tbody>
                {powerCostOverrun.map((r) => {
                  const pct = ((r.overrun / r.origEst) * 100).toFixed(1);
                  return (
                    <tr key={r.year}>
                      <td><strong>{r.year}</strong></td>
                      <td className="pm-num">{r.projects}</td>
                      <td className="pm-num">{fmtNum(r.origEst)}</td>
                      <td className="pm-num">{fmtNum(r.nowAntici)}</td>
                      <td className="pm-num" style={{ color: "#dc2626", fontWeight: 600 }}>{fmtNum(r.overrun)}</td>
                      <td className="pm-num" style={{ color: parseFloat(pct) > 30 ? "#dc2626" : "#d97706", fontWeight: 600 }}>
                        {pct}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p style={{ fontSize: "0.8rem", color: "#94a3b8", marginTop: "0.75rem" }}>
            Source: RBI Handbook 2024-25 · Table 35 — Sector-wise Cost Overrun of Delayed Central Sector Projects (End-March)
          </p>
        </div>
      )}

      {/* Cross-sector comparison */}
      {activeTab === "comparison" && (
        <div className="pm-section">
          <h3>Cross-Sector Infrastructure Project Status — End-March 2024</h3>
          <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "1.5rem", marginBottom: "1.5rem" }}>
            <ResponsiveContainer width="100%" height={320}>
              <ComposedChart
                data={sectorComparison2024}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 130, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="sector" tick={{ fontSize: 12 }} width={130} />
                <Tooltip />
                <Legend />
                <Bar dataKey="onSchedule" name="On Schedule" stackId="a" fill="#16a34a" />
                <Bar dataKey="delayed" name="Delayed" stackId="a" fill="#dc2626" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          <div className="pm-table-wrapper">
            <table className="pm-table">
              <thead>
                <tr>
                  <th>Sector</th>
                  <th className="pm-num">Total Projects</th>
                  <th className="pm-num">On Schedule</th>
                  <th className="pm-num">Delayed</th>
                  <th className="pm-num">Delay Rate</th>
                  <th className="pm-num">Risk Rating</th>
                </tr>
              </thead>
              <tbody>
                {sectorComparison2024
                  .sort((a, b) => b.delayedPct - a.delayedPct)
                  .map((s) => {
                    const risk =
                      s.delayedPct >= 55 ? { label: "High", color: "#dc2626" } :
                      s.delayedPct >= 45 ? { label: "Medium", color: "#d97706" } :
                                           { label: "Lower", color: "#16a34a" };
                    return (
                      <tr key={s.sector}>
                        <td><strong>{s.sector}</strong></td>
                        <td className="pm-num">{s.total}</td>
                        <td className="pm-num" style={{ color: "#16a34a" }}>{s.onSchedule}</td>
                        <td className="pm-num" style={{ color: "#dc2626", fontWeight: 600 }}>{s.delayed}</td>
                        <td className="pm-num" style={{ color: risk.color, fontWeight: 600 }}>{s.delayedPct.toFixed(1)}%</td>
                        <td>
                          <span style={{
                            display: "inline-block", padding: "2px 10px", borderRadius: 99,
                            background: risk.color + "20", color: risk.color,
                            fontSize: "0.75rem", fontWeight: 700,
                          }}>{risk.label}</span>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
          <p style={{ fontSize: "0.8rem", color: "#94a3b8", marginTop: "0.75rem" }}>
            Source: RBI Handbook 2024-25 · Table 34 — Central Sector Projects Status (End-March 2024)
            · Surface Transport includes Road Transport + Shipping &amp; Ports
          </p>
        </div>
      )}
    </div>
  );
}
