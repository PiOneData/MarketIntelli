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

/* ── RBI Handbook 2024-25 · Table 45: Sectoral Deployment of Non-Food Bank Credit ─ */
const sectoralCredit = [
  { year: "2020-21", agriculture: 1329618, industry: 2940571, services: 2764831, personal: 3009013, total: 10888255, renewable: 1688 },
  { year: "2021-22", agriculture: 1496484, industry: 3181100, services: 3112541, personal: 3466075, total: 11836304, renewable: 3845 },
  { year: "2022-23", agriculture: 1726410, industry: 3366406, services: 3718805, personal: 4182767, total: 13655330, renewable: 4620 },
  { year: "2023-24", agriculture: 2071251, industry: 3652804, services: 4592227, personal: 5331290, total: 16411581, renewable: 5991 },
  { year: "2024-25", agriculture: 2287071, industry: 3937149, services: 5161462, personal: 5952299, total: 18207404, renewable: 10325 },
];

/* ── Table 46: Industry-wise Bank Credit (March, ₹ Crore) ───────────────── */
const infraCreditBreakdown = [
  { year: "2020-21", power: 571028, telecom: 114961, roads: 234088, airports: 8573, ports: 10153, railways: 12471, otherInfra: 160400, totalInfra: 1111675 },
  { year: "2021-22", power: 610650, telecom: 127368, roads: 282166, airports: 7366, ports: 8603, railways: 10526, otherInfra: 165969, totalInfra: 1212648 },
  { year: "2022-23", power: 620231, telecom: 108262, roads: 300210, airports: 9593, ports: 7983, railways: 10175, otherInfra: 166652, totalInfra: 1223105 },
  { year: "2023-24", power: 644042, telecom: 138192, roads: 318072, airports: 7280, ports: 6681, railways: 13062, otherInfra: 176767, totalInfra: 1304096 },
  { year: "2024-25", power: 682953, telecom: 118940, roads: 311219, airports: 9156, ports: 5916, railways: 13595, otherInfra: 181052, totalInfra: 1322831 },
];

/* ── Table 167 & 168: Monthly Bank Credit (Jul–Dec 2024, ₹ Crore) ─────────── */
const monthlyCredit = [
  { month: "Jul-24", totalNonFood: 16786602, industry: 3724547, infra: 1301135, power: 636926, roads: 327581, telecom: 129614, services: 4623910, renewable: 7075 },
  { month: "Aug-24", totalNonFood: 16920802, industry: 3756194, infra: 1306202, power: 638639, roads: 328001, telecom: 132305, services: 4643586, renewable: 6844 },
  { month: "Sep-24", totalNonFood: 17105445, industry: 3801604, infra: 1299854, power: 641606, roads: 325928, telecom: 124047, services: 4736957, renewable: 6778 },
  { month: "Oct-24", totalNonFood: 17219596, industry: 3774252, infra: 1298577, power: 646057, roads: 325803, telecom: 121495, services: 4784938, renewable: 7122 },
  { month: "Nov-24", totalNonFood: 17457917, industry: 3813094, infra: 1312607, power: 651955, roads: 333166, telecom: 122704, services: 4853884, renewable: 7458 },
  { month: "Dec-24", totalNonFood: 17686734, industry: 3854429, infra: 1314369, power: 656191, roads: 325833, telecom: 124624, services: 4962520, renewable: 8034 },
];

const fmtNum = (n: number) => n.toLocaleString("en-IN");
const fmtCr = (n: number) =>
  n >= 100000 ? `₹${(n / 100000).toFixed(2)}L Cr` : `₹${(n / 1000).toFixed(1)}K Cr`;

type ActiveTab = "sectoral" | "infrastructure" | "monthly" | "renewable";

const COLORS = {
  power: "#0f766e",
  roads: "#2563eb",
  telecom: "#7c3aed",
  airports: "#f59e0b",
  ports: "#059669",
  railways: "#dc2626",
  otherInfra: "#94a3b8",
  renewable: "#16a34a",
  agriculture: "#84cc16",
  industry: "#0284c7",
  services: "#a21caf",
  personal: "#ea580c",
};

export default function RBICreditEnvironmentPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("sectoral");

  const latest = sectoralCredit[sectoralCredit.length - 1];
  const latestInfra = infraCreditBreakdown[infraCreditBreakdown.length - 1];
  const prevInfra = infraCreditBreakdown[infraCreditBreakdown.length - 2];
  const powerGrowth = (((latestInfra.power - prevInfra.power) / prevInfra.power) * 100).toFixed(1);
  const renewableGrowth = (((latest.renewable - sectoralCredit[0].renewable) / sectoralCredit[0].renewable) * 100).toFixed(0);
  const latestMonthly = monthlyCredit[monthlyCredit.length - 1];

  return (
    <div className="pm-page">
      <div className="pm-header">
        <h2>Credit &amp; Financing Environment</h2>
        <p>
          RBI Handbook 2024-25 · Tables 45, 46, 167 &amp; 168 ·
          Non-Food Gross Bank Credit Outstanding · Scheduled Commercial Banks
        </p>
      </div>

      {/* KPI Cards */}
      <div className="pm-stats-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
        <div className="pm-stat-card">
          <span className="pm-stat-label">Total Non-Food Credit 2024-25</span>
          <span className="pm-stat-value">{fmtCr(latest.total)}</span>
          <span style={{ fontSize: "0.75rem", color: "#16a34a" }}>
            +{(((latest.total - sectoralCredit[sectoralCredit.length - 2].total) / sectoralCredit[sectoralCredit.length - 2].total) * 100).toFixed(1)}% YoY
          </span>
        </div>
        <div className="pm-stat-card pm-stat-card--accent">
          <span className="pm-stat-label">Infrastructure Credit 2024-25</span>
          <span className="pm-stat-value">{fmtCr(latestInfra.totalInfra)}</span>
          <span style={{ fontSize: "0.75rem", color: "#64748b" }}>Power + Roads + Telecom + Others</span>
        </div>
        <div className="pm-stat-card" style={{ borderTopColor: "#0f766e" }}>
          <span className="pm-stat-label">Power Sector Credit 2024-25</span>
          <span className="pm-stat-value">{fmtCr(latestInfra.power)}</span>
          <span style={{ fontSize: "0.75rem", color: "#0f766e" }}>+{powerGrowth}% vs 2023-24</span>
        </div>
        <div className="pm-stat-card" style={{ borderTopColor: "#16a34a" }}>
          <span className="pm-stat-label">Renewable Energy Credit 2024-25</span>
          <span className="pm-stat-value">{fmtCr(latest.renewable)}</span>
          <span style={{ fontSize: "0.75rem", color: "#16a34a" }}>+{renewableGrowth}% since 2020-21</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="pm-tabs">
        {(
          [
            { id: "sectoral", label: "Sectoral Credit (Table 45)" },
            { id: "infrastructure", label: "Infrastructure Breakdown (Table 46)" },
            { id: "renewable", label: "Renewable Energy Credit" },
            { id: "monthly", label: "Monthly Data (Tables 167 & 168)" },
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

      {/* Sectoral Credit */}
      {activeTab === "sectoral" && (
        <div className="pm-section">
          <h3>Sectoral Deployment of Non-Food Gross Bank Credit (₹ Crore)</h3>
          <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "1.5rem", marginBottom: "1.5rem" }}>
            <ResponsiveContainer width="100%" height={380}>
              <ComposedChart data={sectoralCredit} margin={{ top: 10, right: 20, left: 20, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="year" tick={{ fontSize: 12 }} />
                <YAxis
                  yAxisId="left"
                  tickFormatter={(v) => `${(v / 100000).toFixed(1)}L`}
                  tick={{ fontSize: 11 }}
                  label={{ value: "₹ Crore (Lakh)", angle: -90, position: "insideLeft", offset: -5, fontSize: 10 }}
                />
                <Tooltip formatter={(v: number, n: string) => [fmtCr(v), n]} />
                <Legend />
                <Bar yAxisId="left" dataKey="agriculture" name="Agriculture" stackId="s" fill={COLORS.agriculture} />
                <Bar yAxisId="left" dataKey="industry" name="Industry" stackId="s" fill={COLORS.industry} />
                <Bar yAxisId="left" dataKey="services" name="Services" stackId="s" fill={COLORS.services} />
                <Bar yAxisId="left" dataKey="personal" name="Personal Loans" stackId="s" fill={COLORS.personal} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          <div className="pm-table-wrapper">
            <table className="pm-table">
              <thead>
                <tr>
                  <th>Year</th>
                  <th className="pm-num">Agriculture (₹ Cr)</th>
                  <th className="pm-num">Industry (₹ Cr)</th>
                  <th className="pm-num">Services (₹ Cr)</th>
                  <th className="pm-num">Personal (₹ Cr)</th>
                  <th className="pm-num">Total (₹ Cr)</th>
                  <th className="pm-num">Renewable Energy (₹ Cr)</th>
                </tr>
              </thead>
              <tbody>
                {sectoralCredit.map((r, i) => {
                  const prev = i > 0 ? sectoralCredit[i - 1] : null;
                  return (
                    <tr key={r.year}>
                      <td><strong>{r.year}</strong></td>
                      <td className="pm-num">{fmtNum(r.agriculture)}</td>
                      <td className="pm-num">{fmtNum(r.industry)}</td>
                      <td className="pm-num">{fmtNum(r.services)}</td>
                      <td className="pm-num">{fmtNum(r.personal)}</td>
                      <td className="pm-num" style={{ fontWeight: 700 }}>{fmtNum(r.total)}</td>
                      <td className="pm-num" style={{ color: "#16a34a", fontWeight: 600 }}>
                        {fmtNum(r.renewable)}
                        {prev && (
                          <span style={{ fontSize: "0.7rem", marginLeft: 4 }}>
                            (+{(((r.renewable - prev.renewable) / prev.renewable) * 100).toFixed(0)}%)
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p style={{ fontSize: "0.8rem", color: "#94a3b8", marginTop: "0.75rem" }}>
            Source: RBI Handbook 2024-25 · Table 45 — Sectoral Deployment of Non-Food Gross Bank Credit
            · Outstanding as on last reporting Friday in March
          </p>
        </div>
      )}

      {/* Infrastructure breakdown */}
      {activeTab === "infrastructure" && (
        <div className="pm-section">
          <h3>Industry-wise Infrastructure Credit Breakdown (₹ Crore)</h3>
          <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "1.5rem", marginBottom: "1.5rem" }}>
            <ResponsiveContainer width="100%" height={380}>
              <ComposedChart data={infraCreditBreakdown} margin={{ top: 10, right: 20, left: 20, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="year" tick={{ fontSize: 12 }} />
                <YAxis
                  yAxisId="left"
                  tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`}
                  tick={{ fontSize: 11 }}
                  label={{ value: "₹ Crore (000s)", angle: -90, position: "insideLeft", offset: -5, fontSize: 10 }}
                />
                <Tooltip formatter={(v: number, n: string) => [`₹${fmtNum(v)} Cr`, n]} />
                <Legend />
                <Bar yAxisId="left" dataKey="power" name="Power" stackId="i" fill={COLORS.power} />
                <Bar yAxisId="left" dataKey="roads" name="Roads" stackId="i" fill={COLORS.roads} />
                <Bar yAxisId="left" dataKey="telecom" name="Telecom" stackId="i" fill={COLORS.telecom} />
                <Bar yAxisId="left" dataKey="railways" name="Railways" stackId="i" fill={COLORS.railways} />
                <Bar yAxisId="left" dataKey="airports" name="Airports" stackId="i" fill={COLORS.airports} />
                <Bar yAxisId="left" dataKey="ports" name="Ports" stackId="i" fill={COLORS.ports} />
                <Bar yAxisId="left" dataKey="otherInfra" name="Other Infra" stackId="i" fill={COLORS.otherInfra} />
                <Line yAxisId="left" type="monotone" dataKey="totalInfra" name="Total Infra" stroke="#0f172a" strokeWidth={2} dot={{ r: 4 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          <div className="pm-table-wrapper">
            <table className="pm-table">
              <thead>
                <tr>
                  <th>Year</th>
                  <th className="pm-num">Power (₹ Cr)</th>
                  <th className="pm-num">Telecom (₹ Cr)</th>
                  <th className="pm-num">Roads (₹ Cr)</th>
                  <th className="pm-num">Airports (₹ Cr)</th>
                  <th className="pm-num">Ports (₹ Cr)</th>
                  <th className="pm-num">Railways (₹ Cr)</th>
                  <th className="pm-num">Other (₹ Cr)</th>
                  <th className="pm-num">Total Infra (₹ Cr)</th>
                </tr>
              </thead>
              <tbody>
                {infraCreditBreakdown.map((r) => (
                  <tr key={r.year}>
                    <td><strong>{r.year}</strong></td>
                    <td className="pm-num" style={{ color: COLORS.power, fontWeight: 600 }}>{fmtNum(r.power)}</td>
                    <td className="pm-num">{fmtNum(r.telecom)}</td>
                    <td className="pm-num">{fmtNum(r.roads)}</td>
                    <td className="pm-num">{fmtNum(r.airports)}</td>
                    <td className="pm-num">{fmtNum(r.ports)}</td>
                    <td className="pm-num">{fmtNum(r.railways)}</td>
                    <td className="pm-num">{fmtNum(r.otherInfra)}</td>
                    <td className="pm-num" style={{ fontWeight: 700 }}>{fmtNum(r.totalInfra)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p style={{ fontSize: "0.8rem", color: "#94a3b8", marginTop: "0.75rem" }}>
            Source: RBI Handbook 2024-25 · Table 46 — Industry-wise Deployment of Gross Bank Credit
            · Railways = Private/non-Indian Railways only
          </p>
        </div>
      )}

      {/* Renewable Energy Credit */}
      {activeTab === "renewable" && (
        <div className="pm-section">
          <h3>Renewable Energy Priority Sector Credit Trend (₹ Crore)</h3>
          <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "1.5rem", marginBottom: "1.5rem" }}>
            <ResponsiveContainer width="100%" height={320}>
              <ComposedChart data={sectoralCredit} margin={{ top: 10, right: 20, left: 10, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="year" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 11 }} label={{ value: "₹ Crore", angle: -90, position: "insideLeft", offset: -5, fontSize: 11 }} />
                <Tooltip formatter={(v: number) => [`₹${fmtNum(v)} Cr`, "Renewable Energy Credit"]} />
                <Bar dataKey="renewable" name="RE Priority Sector Credit" fill={COLORS.renewable} radius={[6, 6, 0, 0]} />
                <Line type="monotone" dataKey="renewable" stroke="#0f766e" strokeWidth={2.5} dot={{ r: 5, fill: "#0f766e" }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Monthly RE credit */}
          <h3 style={{ marginTop: "1.5rem" }}>Monthly Renewable Energy Credit — Jul to Dec 2024</h3>
          <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "1.5rem", marginBottom: "1.5rem" }}>
            <ResponsiveContainer width="100%" height={260}>
              <ComposedChart data={monthlyCredit} margin={{ top: 10, right: 20, left: 10, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 11 }} label={{ value: "₹ Crore", angle: -90, position: "insideLeft", offset: -5, fontSize: 11 }} />
                <Tooltip formatter={(v: number) => [`₹${fmtNum(v)} Cr`, "RE Credit"]} />
                <Bar dataKey="renewable" name="RE Credit (Monthly)" fill={COLORS.renewable} radius={[4, 4, 0, 0]} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          <div className="pm-table-wrapper">
            <table className="pm-table">
              <thead>
                <tr>
                  <th>Period</th>
                  <th className="pm-num">RE Credit (₹ Cr)</th>
                  <th className="pm-num">Power Sector Credit (₹ Cr)</th>
                  <th className="pm-num">Total Infra Credit (₹ Cr)</th>
                  <th className="pm-num">RE as % of Power</th>
                </tr>
              </thead>
              <tbody>
                {sectoralCredit.map((r, i) => (
                  <tr key={r.year}>
                    <td><strong>{r.year}</strong></td>
                    <td className="pm-num" style={{ color: COLORS.renewable, fontWeight: 600 }}>{fmtNum(r.renewable)}</td>
                    <td className="pm-num">{fmtNum(infraCreditBreakdown[i].power)}</td>
                    <td className="pm-num">{fmtNum(infraCreditBreakdown[i].totalInfra)}</td>
                    <td className="pm-num" style={{ color: "#0f766e", fontWeight: 600 }}>
                      {((r.renewable / infraCreditBreakdown[i].power) * 100).toFixed(2)}%
                    </td>
                  </tr>
                ))}
                <tr style={{ borderTop: "2px solid #e2e8f0" }}>
                  <td colSpan={5} style={{ color: "#64748b", fontSize: "0.8rem", padding: "0.5rem 1rem" }}>
                    Monthly (Jul–Dec 2024) — Table 167 Priority Sector data:
                  </td>
                </tr>
                {monthlyCredit.map((r) => (
                  <tr key={r.month} style={{ background: "#f8fafc" }}>
                    <td><strong>{r.month}</strong></td>
                    <td className="pm-num" style={{ color: COLORS.renewable, fontWeight: 600 }}>{fmtNum(r.renewable)}</td>
                    <td className="pm-num">{fmtNum(r.power)}</td>
                    <td className="pm-num">{fmtNum(r.infra)}</td>
                    <td className="pm-num" style={{ color: "#0f766e" }}>
                      {((r.renewable / r.power) * 100).toFixed(2)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p style={{ fontSize: "0.8rem", color: "#94a3b8", marginTop: "0.75rem" }}>
            Source: RBI Handbook 2024-25 · Tables 45 &amp; 167 (Priority Sector — Renewable Energy)
          </p>
        </div>
      )}

      {/* Monthly data */}
      {activeTab === "monthly" && (
        <div className="pm-section">
          <h3>Monthly Credit Flow — Infrastructure &amp; Industry (Jul–Dec 2024)</h3>
          <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "1.5rem", marginBottom: "1.5rem" }}>
            <ResponsiveContainer width="100%" height={380}>
              <ComposedChart data={monthlyCredit} margin={{ top: 10, right: 20, left: 20, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis
                  yAxisId="left"
                  tickFormatter={(v) => `${(v / 100000).toFixed(1)}L`}
                  tick={{ fontSize: 11 }}
                  label={{ value: "₹ Crore (Lakh)", angle: -90, position: "insideLeft", offset: -5, fontSize: 10 }}
                />
                <Tooltip formatter={(v: number, n: string) => [fmtCr(v), n]} />
                <Legend />
                <Bar yAxisId="left" dataKey="power" name="Power" fill={COLORS.power} />
                <Bar yAxisId="left" dataKey="roads" name="Roads" fill={COLORS.roads} />
                <Bar yAxisId="left" dataKey="telecom" name="Telecom" fill={COLORS.telecom} />
                <Line yAxisId="left" type="monotone" dataKey="infra" name="Total Infra" stroke="#0f172a" strokeWidth={2} dot={{ r: 4 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          <div className="pm-table-wrapper">
            <table className="pm-table">
              <thead>
                <tr>
                  <th>Month</th>
                  <th className="pm-num">Total Non-Food (₹ Cr)</th>
                  <th className="pm-num">Industry (₹ Cr)</th>
                  <th className="pm-num">Services (₹ Cr)</th>
                  <th className="pm-num">Total Infra (₹ Cr)</th>
                  <th className="pm-num">Power (₹ Cr)</th>
                  <th className="pm-num">Roads (₹ Cr)</th>
                  <th className="pm-num">Telecom (₹ Cr)</th>
                  <th className="pm-num">RE (₹ Cr)</th>
                </tr>
              </thead>
              <tbody>
                {monthlyCredit.map((r, i) => {
                  const prev = i > 0 ? monthlyCredit[i - 1] : null;
                  return (
                    <tr key={r.month}>
                      <td><strong>{r.month}</strong></td>
                      <td className="pm-num">{fmtNum(r.totalNonFood)}</td>
                      <td className="pm-num">{fmtNum(r.industry)}</td>
                      <td className="pm-num">{fmtNum(r.services)}</td>
                      <td className="pm-num" style={{ fontWeight: 700 }}>{fmtNum(r.infra)}</td>
                      <td className="pm-num" style={{ color: COLORS.power, fontWeight: 600 }}>{fmtNum(r.power)}</td>
                      <td className="pm-num">{fmtNum(r.roads)}</td>
                      <td className="pm-num">{fmtNum(r.telecom)}</td>
                      <td className="pm-num" style={{ color: COLORS.renewable }}>
                        {fmtNum(r.renewable)}
                        {prev && r.renewable > prev.renewable && (
                          <span style={{ fontSize: "0.7rem", color: "#16a34a", marginLeft: 4 }}>▲</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p style={{ fontSize: "0.8rem", color: "#94a3b8", marginTop: "0.75rem" }}>
            Source: RBI Handbook 2024-25 · Tables 167 &amp; 168 — Deployment of Bank Credit by Major Sectors &amp; Industry-wise
            · Data as on last reporting Friday of the respective month
          </p>
        </div>
      )}

      {/* Insight banner */}
      <div style={{
        marginTop: "2rem", padding: "1rem 1.25rem",
        background: "linear-gradient(135deg, #f0fdf4, #dcfce7)",
        border: "1px solid #bbf7d0", borderRadius: 12,
        display: "flex", gap: "0.75rem", alignItems: "flex-start",
      }}>
        <span style={{ fontSize: "1.25rem" }}>💡</span>
        <div>
          <strong style={{ color: "#14532d" }}>Key Signal:</strong>
          <span style={{ color: "#166534", fontSize: "0.875rem", marginLeft: "0.5rem" }}>
            Renewable Energy priority sector credit grew <strong>511%</strong> from ₹{fmtNum(sectoralCredit[0].renewable)} Cr (2020-21) to
            ₹{fmtNum(latest.renewable)} Cr (2024-25), with Dec-2024 monthly figure at ₹{fmtNum(latestMonthly.renewable)} Cr.
            Power sector credit crossed ₹{fmtCr(latestInfra.power)} — the largest single infrastructure lending category.
          </span>
        </div>
      </div>
    </div>
  );
}
