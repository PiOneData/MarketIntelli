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

/* ── RBI Handbook 2024-25 · Table 146: Foreign Investment Inflows ─────────
   Columns: Gross Inflows (₹ Cr, USD Mn), Repatriation (₹ Cr, USD Mn),
   Direct Investment to India Net (₹ Cr, USD Mn), FDI by India (₹ Cr, USD Mn),
   Net FDI (₹ Cr, USD Mn), Net Portfolio (₹ Cr, USD Mn), Total (₹ Cr, USD Mn) */
const fdiData = [
  { year: "2003-04", grossFdiUsd: 4322,  repatUsd: 0,    netFdiUsd: 2388,  portfolioUsd: 11356, totalUsd: 13744 },
  { year: "2004-05", grossFdiUsd: 6052,  repatUsd: 65,   netFdiUsd: 3713,  portfolioUsd: 9287,  totalUsd: 13000 },
  { year: "2005-06", grossFdiUsd: 8962,  repatUsd: 61,   netFdiUsd: 3034,  portfolioUsd: 12494, totalUsd: 15528 },
  { year: "2006-07", grossFdiUsd: 22826, repatUsd: 87,   netFdiUsd: 7693,  portfolioUsd: 7060,  totalUsd: 14753 },
  { year: "2007-08", grossFdiUsd: 34844, repatUsd: 116,  netFdiUsd: 15893, portfolioUsd: 27433, totalUsd: 43326 },
  { year: "2008-09", grossFdiUsd: 41903, repatUsd: 166,  netFdiUsd: 22372, portfolioUsd: -14030, totalUsd: 8342 },
  { year: "2009-10", grossFdiUsd: 37746, repatUsd: 4637, netFdiUsd: 17966, portfolioUsd: 32396, totalUsd: 50362 },
  { year: "2010-11", grossFdiUsd: 36047, repatUsd: 7018, netFdiUsd: 11834, portfolioUsd: 30293, totalUsd: 42127 },
  { year: "2011-12", grossFdiUsd: 46552, repatUsd: 13599, netFdiUsd: 22061, portfolioUsd: 17170, totalUsd: 39231 },
  { year: "2012-13", grossFdiUsd: 34298, repatUsd: 7345, netFdiUsd: 19819, portfolioUsd: 26891, totalUsd: 46710 },
  { year: "2013-14", grossFdiUsd: 36047, repatUsd: 5284, netFdiUsd: 21564, portfolioUsd: 4822,  totalUsd: 26386 },
  { year: "2014-15", grossFdiUsd: 45147, repatUsd: 9864, netFdiUsd: 31251, portfolioUsd: 42205, totalUsd: 73456 },
  { year: "2015-16", grossFdiUsd: 55559, repatUsd: 10652, netFdiUsd: 36021, portfolioUsd: -4130, totalUsd: 31891 },
  { year: "2016-17", grossFdiUsd: 60220, repatUsd: 18005, netFdiUsd: 35612, portfolioUsd: 7612,  totalUsd: 43224 },
  { year: "2017-18", grossFdiUsd: 60974, repatUsd: 21544, netFdiUsd: 30286, portfolioUsd: 22115, totalUsd: 52401 },
  { year: "2018-19", grossFdiUsd: 62001, repatUsd: 18699, netFdiUsd: 30712, portfolioUsd: -618,  totalUsd: 30094 },
  { year: "2019-20", grossFdiUsd: 74390, repatUsd: 18384, netFdiUsd: 43013, portfolioUsd: 1403,  totalUsd: 44417 },
  { year: "2020-21", grossFdiUsd: 81973, repatUsd: 27046, netFdiUsd: 43955, portfolioUsd: 36137, totalUsd: 80092 },
  { year: "2021-22", grossFdiUsd: 84835, repatUsd: 28605, netFdiUsd: 38587, portfolioUsd: -16777, totalUsd: 21809 },
  { year: "2022-23", grossFdiUsd: 71355, repatUsd: 29349, netFdiUsd: 27986, portfolioUsd: -5152, totalUsd: 22834 },
  { year: "2023-24", grossFdiUsd: 71302, repatUsd: 44472, netFdiUsd: 10152, portfolioUsd: 44081, totalUsd: 54233 },
  { year: "2024-25", grossFdiUsd: 80615, repatUsd: 51486, netFdiUsd: 959,   portfolioUsd: 3564,  totalUsd: 4523,  provisional: true },
];

/* Recent 10 years for detail view */
const recentFdi = fdiData.slice(-10);

/* Also ₹ Crore data for recent years */
const recentFdiRupee = [
  { year: "2015-16", grossFdiCr: 364146, netFdiCr: 235782, portfolioCr: -27203, totalCr: 208579 },
  { year: "2016-17", grossFdiCr: 404057, netFdiCr: 238913, portfolioCr: 50482,  totalCr: 289394 },
  { year: "2017-18", grossFdiCr: 392944, netFdiCr: 195052, portfolioCr: 142632, totalCr: 337684 },
  { year: "2018-19", grossFdiCr: 433069, netFdiCr: 214036, portfolioCr: -1857,  totalCr: 212179 },
  { year: "2019-20", grossFdiCr: 527347, netFdiCr: 304820, portfolioCr: 7395,   totalCr: 312215 },
  { year: "2020-21", grossFdiCr: 607771, netFdiCr: 325382, portfolioCr: 266474, totalCr: 591856 },
  { year: "2021-22", grossFdiCr: 632047, netFdiCr: 287467, portfolioCr: -126539, totalCr: 160928 },
  { year: "2022-23", grossFdiCr: 571322, netFdiCr: 221884, portfolioCr: -36593, totalCr: 185291 },
  { year: "2023-24", grossFdiCr: 590396, netFdiCr: 84021,  portfolioCr: 364804, totalCr: 448825 },
  { year: "2024-25", grossFdiCr: 680929, netFdiCr: 7730,   portfolioCr: 27343,  totalCr: 35073, provisional: true },
];

const fmtNum = (n: number) => n.toLocaleString("en-IN");
const fmtUsd = (n: number) =>
  Math.abs(n) >= 1000 ? `$${(n / 1000).toFixed(1)}B` : `$${n}M`;
const fmtCr = (n: number) =>
  Math.abs(n) >= 100000 ? `₹${(n / 100000).toFixed(1)}L Cr` : `₹${(n / 1000).toFixed(1)}K Cr`;

type ActiveTab = "trend" | "recent" | "rupee";

export default function RBIFDITrendsPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("trend");

  const latest = fdiData[fdiData.length - 1];
  const prev = fdiData[fdiData.length - 2];
  const latestRupee = recentFdiRupee[recentFdiRupee.length - 1];

  return (
    <div className="pm-page">
      <div className="pm-header">
        <h2>FDI &amp; Foreign Capital Trends</h2>
        <p>
          RBI Handbook 2024-25 · Table 146 — Foreign Investment Inflows · 2003-04 to 2024-25 (P) ·
          Provisional data for 2024-25
        </p>
      </div>

      {/* KPI Cards */}
      <div className="pm-stats-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
        <div className="pm-stat-card">
          <span className="pm-stat-label">Gross FDI Inflow 2024-25 (P)</span>
          <span className="pm-stat-value">{fmtUsd(latest.grossFdiUsd)}</span>
          <span style={{ fontSize: "0.75rem", color: "#16a34a" }}>
            +{(((latest.grossFdiUsd - prev.grossFdiUsd) / prev.grossFdiUsd) * 100).toFixed(1)}% vs 2023-24
          </span>
        </div>
        <div className="pm-stat-card" style={{ borderTopColor: "#dc2626" }}>
          <span className="pm-stat-label">Net FDI 2024-25 (P)</span>
          <span className="pm-stat-value" style={{ color: latest.netFdiUsd < 1000 ? "#dc2626" : undefined }}>
            {fmtUsd(latest.netFdiUsd)}
          </span>
          <span style={{ fontSize: "0.75rem", color: "#dc2626" }}>
            Repatriation: {fmtUsd(latest.repatUsd)} — high repatriation pressure
          </span>
        </div>
        <div className="pm-stat-card pm-stat-card--accent">
          <span className="pm-stat-label">Gross FDI (₹ Crore) 2024-25</span>
          <span className="pm-stat-value">{fmtCr(latestRupee.grossFdiCr)}</span>
          <span style={{ fontSize: "0.75rem", color: "#64748b" }}>Provisional</span>
        </div>
        <div className="pm-stat-card">
          <span className="pm-stat-label">Portfolio Investment 2024-25</span>
          <span className="pm-stat-value" style={{ color: latest.portfolioUsd > 0 ? "#16a34a" : "#dc2626" }}>
            {fmtUsd(latest.portfolioUsd)}
          </span>
          <span style={{ fontSize: "0.75rem", color: "#64748b" }}>
            Total: {fmtUsd(latest.totalUsd)}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="pm-tabs">
        {(
          [
            { id: "trend", label: "Long-term FDI Trend (USD)" },
            { id: "recent", label: "Recent 10 Years Detail" },
            { id: "rupee", label: "₹ Crore View" },
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

      {/* Long-term trend */}
      {activeTab === "trend" && (
        <div className="pm-section">
          <h3>Gross FDI, Net FDI &amp; Portfolio Investment — Long-term Trend (USD Mn)</h3>
          <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "1.5rem", marginBottom: "1.5rem" }}>
            <ResponsiveContainer width="100%" height={400}>
              <ComposedChart data={fdiData} margin={{ top: 10, right: 20, left: 20, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="year" tick={{ fontSize: 10, angle: -45, textAnchor: "end" }} height={60} />
                <YAxis
                  tickFormatter={(v) => v >= 1000 ? `$${(v / 1000).toFixed(0)}B` : `$${v}M`}
                  tick={{ fontSize: 11 }}
                  label={{ value: "USD Million", angle: -90, position: "insideLeft", offset: -5, fontSize: 11 }}
                />
                <Tooltip
                  formatter={(v: number, n: string) => [
                    `$${fmtNum(v)} Mn`,
                    n,
                  ]}
                />
                <Legend />
                <Bar dataKey="grossFdiUsd" name="Gross FDI Inflow" fill="#0f766e" radius={[3, 3, 0, 0]} />
                <Line type="monotone" dataKey="netFdiUsd" name="Net FDI" stroke="#2563eb" strokeWidth={2.5} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="portfolioUsd" name="Net Portfolio" stroke="#d97706" strokeWidth={2} dot={{ r: 2 }} strokeDasharray="5 3" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <p style={{ fontSize: "0.8rem", color: "#94a3b8" }}>
            Source: RBI Handbook 2024-25 · Table 146 — Foreign Investment Inflows · 2024-25 data are provisional.
            Direct Investment data for 2006-07 include swap of shares of $3.1 Billion.
          </p>
        </div>
      )}

      {/* Recent 10 years detail */}
      {activeTab === "recent" && (
        <div className="pm-section">
          <h3>Foreign Investment — Recent 10 Years (USD Million)</h3>
          <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "1.5rem", marginBottom: "1.5rem" }}>
            <ResponsiveContainer width="100%" height={360}>
              <ComposedChart data={recentFdi} margin={{ top: 10, right: 20, left: 20, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                <YAxis
                  tickFormatter={(v) => `$${(v / 1000).toFixed(0)}B`}
                  tick={{ fontSize: 11 }}
                />
                <Tooltip formatter={(v: number, n: string) => [`$${fmtNum(v)} Mn`, n]} />
                <Legend />
                <Bar dataKey="grossFdiUsd" name="Gross FDI" fill="#0f766e" radius={[4, 4, 0, 0]} />
                <Bar dataKey="repatUsd" name="Repatriation" fill="#dc2626" radius={[4, 4, 0, 0]} />
                <Line type="monotone" dataKey="netFdiUsd" name="Net FDI" stroke="#2563eb" strokeWidth={2.5} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="portfolioUsd" name="Portfolio" stroke="#d97706" strokeWidth={2} dot={{ r: 3 }} strokeDasharray="5 3" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          <div className="pm-table-wrapper">
            <table className="pm-table">
              <thead>
                <tr>
                  <th>Year</th>
                  <th className="pm-num">Gross FDI (USD Mn)</th>
                  <th className="pm-num">Repatriation (USD Mn)</th>
                  <th className="pm-num">Net FDI (USD Mn)</th>
                  <th className="pm-num">Net Portfolio (USD Mn)</th>
                  <th className="pm-num">Total (USD Mn)</th>
                  <th className="pm-num">Repatriation %</th>
                </tr>
              </thead>
              <tbody>
                {recentFdi.map((r) => {
                  const repatPct = ((r.repatUsd / r.grossFdiUsd) * 100).toFixed(1);
                  return (
                    <tr key={r.year}>
                      <td>
                        <strong>{r.year}</strong>
                        {r.provisional && (
                          <span style={{ fontSize: "0.7rem", color: "#f59e0b", marginLeft: 4, fontWeight: 600 }}>P</span>
                        )}
                      </td>
                      <td className="pm-num">{fmtNum(r.grossFdiUsd)}</td>
                      <td className="pm-num" style={{ color: "#dc2626" }}>{fmtNum(r.repatUsd)}</td>
                      <td className="pm-num" style={{ color: r.netFdiUsd < 2000 ? "#dc2626" : "#0f766e", fontWeight: 600 }}>
                        {fmtNum(r.netFdiUsd)}
                      </td>
                      <td className="pm-num" style={{ color: r.portfolioUsd < 0 ? "#dc2626" : "#2563eb" }}>
                        {r.portfolioUsd < 0 ? `(${fmtNum(Math.abs(r.portfolioUsd))})` : fmtNum(r.portfolioUsd)}
                      </td>
                      <td className="pm-num" style={{ fontWeight: 700 }}>
                        {r.totalUsd < 0 ? `(${fmtNum(Math.abs(r.totalUsd))})` : fmtNum(r.totalUsd)}
                      </td>
                      <td className="pm-num" style={{ color: parseFloat(repatPct) > 50 ? "#dc2626" : "#d97706", fontWeight: 600 }}>
                        {repatPct}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p style={{ fontSize: "0.8rem", color: "#94a3b8", marginTop: "0.75rem" }}>
            P = Provisional · Source: RBI Handbook 2024-25 · Table 146 · Negative values in parentheses
          </p>
        </div>
      )}

      {/* Rupee view */}
      {activeTab === "rupee" && (
        <div className="pm-section">
          <h3>Foreign Investment Flows in ₹ Crore (2015-16 to 2024-25)</h3>
          <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "1.5rem", marginBottom: "1.5rem" }}>
            <ResponsiveContainer width="100%" height={380}>
              <ComposedChart data={recentFdiRupee} margin={{ top: 10, right: 20, left: 20, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                <YAxis
                  tickFormatter={(v) => `${(v / 100000).toFixed(0)}L`}
                  tick={{ fontSize: 11 }}
                  label={{ value: "₹ Crore (Lakh)", angle: -90, position: "insideLeft", offset: -5, fontSize: 10 }}
                />
                <Tooltip
                  formatter={(v: number, n: string) => [
                    v < 0 ? `(₹${fmtNum(Math.abs(v))} Cr)` : `₹${fmtNum(v)} Cr`,
                    n,
                  ]}
                />
                <Legend />
                <Bar dataKey="grossFdiCr" name="Gross FDI (₹ Cr)" fill="#0f766e" radius={[4, 4, 0, 0]} />
                <Line type="monotone" dataKey="netFdiCr" name="Net FDI (₹ Cr)" stroke="#2563eb" strokeWidth={2.5} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="portfolioCr" name="Portfolio (₹ Cr)" stroke="#d97706" strokeWidth={2} dot={{ r: 3 }} strokeDasharray="5 3" />
                <Line type="monotone" dataKey="totalCr" name="Total Flows (₹ Cr)" stroke="#334155" strokeWidth={2} dot={{ r: 3 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          <div className="pm-table-wrapper">
            <table className="pm-table">
              <thead>
                <tr>
                  <th>Year</th>
                  <th className="pm-num">Gross FDI (₹ Cr)</th>
                  <th className="pm-num">Net FDI (₹ Cr)</th>
                  <th className="pm-num">Portfolio (₹ Cr)</th>
                  <th className="pm-num">Total Flows (₹ Cr)</th>
                </tr>
              </thead>
              <tbody>
                {recentFdiRupee.map((r) => (
                  <tr key={r.year}>
                    <td>
                      <strong>{r.year}</strong>
                      {r.provisional && (
                        <span style={{ fontSize: "0.7rem", color: "#f59e0b", marginLeft: 4, fontWeight: 600 }}>P</span>
                      )}
                    </td>
                    <td className="pm-num">{fmtNum(r.grossFdiCr)}</td>
                    <td className="pm-num" style={{ color: r.netFdiCr < 10000 ? "#dc2626" : "#0f766e", fontWeight: 600 }}>
                      {r.netFdiCr < 0 ? `(${fmtNum(Math.abs(r.netFdiCr))})` : fmtNum(r.netFdiCr)}
                    </td>
                    <td className="pm-num" style={{ color: r.portfolioCr < 0 ? "#dc2626" : "#2563eb" }}>
                      {r.portfolioCr < 0 ? `(${fmtNum(Math.abs(r.portfolioCr))})` : fmtNum(r.portfolioCr)}
                    </td>
                    <td className="pm-num" style={{ fontWeight: 700, color: r.totalCr < 0 ? "#dc2626" : undefined }}>
                      {r.totalCr < 0 ? `(${fmtNum(Math.abs(r.totalCr))})` : fmtNum(r.totalCr)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p style={{ fontSize: "0.8rem", color: "#94a3b8", marginTop: "0.75rem" }}>
            P = Provisional · Negative values in parentheses indicate net outflows.
            Source: RBI Handbook 2024-25 · Table 146 — Foreign Investment Inflows
          </p>
        </div>
      )}

      {/* Insight card */}
      <div style={{
        marginTop: "2rem", padding: "1rem 1.25rem",
        background: "linear-gradient(135deg, #eff6ff, #dbeafe)",
        border: "1px solid #bfdbfe", borderRadius: 12,
        display: "flex", gap: "0.75rem", alignItems: "flex-start",
      }}>
        <span style={{ fontSize: "1.25rem" }}>📊</span>
        <div>
          <strong style={{ color: "#1e3a5f" }}>Investment Signal:</strong>
          <span style={{ color: "#1d4ed8", fontSize: "0.875rem", marginLeft: "0.5rem" }}>
            Gross FDI reached <strong>$80.6B</strong> in 2024-25 (P) — highest ever — but net FDI
            compressed to just <strong>$959M</strong> due to record repatriation of $51.5B (64% of gross).
            This signals both India's growing global investment appeal and increasing profit repatriation by MNCs.
            Portfolio flows remain volatile, turning negative in FY22, FY23 and now showing recovery.
          </span>
        </div>
      </div>
    </div>
  );
}
