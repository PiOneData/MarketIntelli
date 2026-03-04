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

/* ── RBI Handbook 2024-25 · Table 3: GVA at Constant Prices (₹ Crore) ──── */
const gvaData = [
  { year: "2018-19", electricity: 294147, manufacturing: 2328992, construction: 1026789, totalGva: 12733798 },
  { year: "2019-20", electricity: 300798, manufacturing: 2259706, construction: 1043429, totalGva: 13236100 },
  { year: "2020-21", electricity: 288213, manufacturing: 2329160, construction: 995371, totalGva: 12687345 },
  { year: "2021-22", electricity: 317966, manufacturing: 2561033, construction: 1193532, totalGva: 13876840 },
  { year: "2022-23", electricity: 352331, manufacturing: 2516364, construction: 1302245, totalGva: 14878028 },
  { year: "2023-24", electricity: 382776, manufacturing: 2825935, construction: 1437788, totalGva: 16151477 },
  { year: "2024-25", electricity: 405296, manufacturing: 2953647, construction: 1572285, totalGva: 17187446 },
];

/* ── Table 31: Annual Production Indices (Base: 2011-12 = 100) ───────────── */
const productionIndices = [
  { year: "2019-20", electricity: 158.4, diesel: 133.7, petrol: 142.1, lpg: 134.3, transformers: 152.1 },
  { year: "2020-21", electricity: 157.6, diesel: 121.0, petrol: 131.7, lpg: 126.4, transformers: 98.5 },
  { year: "2021-22", electricity: 170.1, diesel: 129.5, petrol: 147.9, lpg: 128.2, transformers: 153.8 },
  { year: "2022-23", electricity: 185.2, diesel: 137.2, petrol: 157.0, lpg: 134.4, transformers: 166.9 },
  { year: "2023-24", electricity: 198.3, diesel: 140.0, petrol: 165.7, lpg: 133.9, transformers: 171.1 },
  { year: "2024-25", electricity: 208.6, diesel: 142.4, petrol: 178.1, lpg: 135.6, transformers: 266.6 },
];

/* ── Table 7: State Electricity, Gas & Water GVA (₹ Crore, Current Prices) ─ */
const stateElectricityGva = [
  { state: "Maharashtra",   y2122: 40894,  y2223: 33834,  y2324: 39452,  y2425: 42563 },
  { state: "Gujarat",       y2122: 32952,  y2223: 31026,  y2324: 38845,  y2425: null },
  { state: "Tamil Nadu",    y2122: 24892,  y2223: 31281,  y2324: 37496,  y2425: 45108 },
  { state: "Uttar Pradesh", y2122: 37509,  y2223: 38276,  y2324: 44292,  y2425: null },
  { state: "Andhra Pradesh",y2122: 17827,  y2223: 20767,  y2324: 24945,  y2425: 25882 },
  { state: "Rajasthan",     y2122: 23347,  y2223: 25792,  y2324: 28060,  y2425: 29801 },
  { state: "Karnataka",     y2122: 18138,  y2223: 20426,  y2324: 22386,  y2425: 24939 },
  { state: "Madhya Pradesh",y2122: 24403,  y2223: 26372,  y2324: 24822,  y2425: 26099 },
  { state: "Telangana",     y2122: 12159,  y2223: 14301,  y2324: 19231,  y2425: 20642 },
  { state: "West Bengal",   y2122: 17896,  y2223: 16625,  y2324: 17095,  y2425: 18647 },
  { state: "Odisha",        y2122: 12868,  y2223: 14761,  y2324: 18734,  y2425: 20209 },
  { state: "Chhattisgarh",  y2122: 18832,  y2223: 20773,  y2324: 21745,  y2425: 24964 },
  { state: "Haryana",       y2122: 12148,  y2223: 12659,  y2324: 13468,  y2425: 14436 },
  { state: "Punjab",        y2122: 12726,  y2223: 13671,  y2324: 14627,  y2425: 15241 },
  { state: "Delhi",         y2122: 16094,  y2223: 15101,  y2324: 19122,  y2425: null },
  { state: "Assam",         y2122: 5780,   y2223: 6452,   y2324: 7662,   y2425: 8825 },
  { state: "Uttarakhand",   y2122: 6110,   y2223: 5760,   y2324: 6631,   y2425: 7706 },
  { state: "Himachal Pradesh", y2122: 6385, y2223: 6874,  y2324: 7440,   y2425: 8256 },
  { state: "J&K",           y2122: 6218,   y2223: 6649,   y2324: 7136,   y2425: 7680 },
  { state: "Sikkim",        y2122: 5059,   y2223: 5791,   y2324: 7099,   y2425: null },
  { state: "Kerala",        y2122: 9235,   y2223: 8635,   y2324: 9853,   y2425: null },
  { state: "Bihar",         y2122: 6455,   y2223: 9876,   y2324: 11848,  y2425: null },
  { state: "Jharkhand",     y2122: 4919,   y2223: 4547,   y2324: 4943,   y2425: null },
  { state: "Arunachal Pradesh", y2122: 2601, y2223: 3200, y2324: 3738,   y2425: null },
];

const fmt = (n: number) =>
  n >= 100000
    ? `₹${(n / 100000).toFixed(1)}L Cr`
    : `₹${(n / 1000).toFixed(1)}K Cr`;

const fmtNum = (n: number) =>
  n.toLocaleString("en-IN");

const COLORS = {
  electricity: "#0f766e",
  manufacturing: "#2563eb",
  construction: "#d97706",
  diesel: "#7c3aed",
  petrol: "#dc2626",
  lpg: "#059669",
  transformers: "#f59e0b",
};

type ActiveTab = "gva" | "production" | "states";

export default function RBIEnergyDemandPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("gva");
  const [stateYear, setStateYear] = useState<"y2324" | "y2425">("y2324");

  const latestElec = gvaData[gvaData.length - 1].electricity;
  const prevElec = gvaData[gvaData.length - 2].electricity;
  const elecGrowth = (((latestElec - prevElec) / prevElec) * 100).toFixed(1);
  const latestIndex = productionIndices[productionIndices.length - 1].electricity;
  const latestGva = gvaData[gvaData.length - 1].totalGva;
  const elecShare = ((latestElec / latestGva) * 100).toFixed(2);

  const sortedStates = [...stateElectricityGva]
    .filter((s) => s[stateYear] !== null)
    .sort((a, b) => (b[stateYear] as number) - (a[stateYear] as number));

  return (
    <div className="pm-page">
      <div className="pm-header">
        <h2>National &amp; State Energy Demand Sizing</h2>
        <p>
          RBI Handbook of Statistics on the Indian Economy 2024-25 · Tables 3, 7, 8 &amp; 31 ·
          Base year 2011-12 · Values in ₹ Crore at Constant Prices unless noted
        </p>
      </div>

      {/* KPI Cards */}
      <div className="pm-stats-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
        <div className="pm-stat-card">
          <span className="pm-stat-label">Electricity GVA 2024-25</span>
          <span className="pm-stat-value">{fmt(latestElec)}</span>
          <span style={{ fontSize: "0.75rem", color: "#16a34a" }}>+{elecGrowth}% YoY</span>
        </div>
        <div className="pm-stat-card pm-stat-card--accent">
          <span className="pm-stat-label">Share in National GVA</span>
          <span className="pm-stat-value">{elecShare}%</span>
          <span style={{ fontSize: "0.75rem", color: "#64748b" }}>Electricity, Gas &amp; Water</span>
        </div>
        <div className="pm-stat-card">
          <span className="pm-stat-label">Production Index 2024-25</span>
          <span className="pm-stat-value">{latestIndex}</span>
          <span style={{ fontSize: "0.75rem", color: "#64748b" }}>Electricity (Base: 2011-12=100)</span>
        </div>
        <div className="pm-stat-card">
          <span className="pm-stat-label">Total National GVA 2024-25</span>
          <span className="pm-stat-value">{fmt(latestGva)}</span>
          <span style={{ fontSize: "0.75rem", color: "#64748b" }}>At Constant Prices</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="pm-tabs">
        {(
          [
            { id: "gva", label: "GVA Trend (Table 3)" },
            { id: "production", label: "Production Indices (Table 31)" },
            { id: "states", label: "State-wise Energy GVA (Tables 7 & 8)" },
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

      {/* GVA Trend */}
      {activeTab === "gva" && (
        <div className="pm-section">
          <h3>Electricity, Gas &amp; Water Supply vs Manufacturing &amp; Construction — GVA (₹ Crore)</h3>
          <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "1.5rem", marginBottom: "1.5rem" }}>
            <ResponsiveContainer width="100%" height={380}>
              <ComposedChart data={gvaData} margin={{ top: 10, right: 20, left: 20, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="year" tick={{ fontSize: 12 }} />
                <YAxis
                  yAxisId="left"
                  tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`}
                  tick={{ fontSize: 11 }}
                  label={{ value: "₹ Crore (000s)", angle: -90, position: "insideLeft", offset: -5, fontSize: 11 }}
                />
                <Tooltip
                  formatter={(value: number, name: string) => [
                    `₹${fmtNum(value)} Cr`,
                    name,
                  ]}
                />
                <Legend />
                <Bar yAxisId="left" dataKey="electricity" name="Electricity, Gas & Water" fill={COLORS.electricity} radius={[4, 4, 0, 0]} />
                <Bar yAxisId="left" dataKey="manufacturing" name="Manufacturing" fill={COLORS.manufacturing} radius={[4, 4, 0, 0]} />
                <Bar yAxisId="left" dataKey="construction" name="Construction" fill={COLORS.construction} radius={[4, 4, 0, 0]} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <p style={{ fontSize: "0.8rem", color: "#94a3b8" }}>
            Source: RBI Handbook 2024-25 · Table 3 — Components of GVA at Basic Prices · Constant Prices (Base: 2011-12)
          </p>

          {/* GVA table */}
          <div className="pm-table-wrapper" style={{ marginTop: "1.5rem" }}>
            <table className="pm-table">
              <thead>
                <tr>
                  <th>Year</th>
                  <th className="pm-num">Electricity, Gas & Water (₹ Cr)</th>
                  <th className="pm-num">YoY Growth</th>
                  <th className="pm-num">Manufacturing (₹ Cr)</th>
                  <th className="pm-num">Construction (₹ Cr)</th>
                  <th className="pm-num">Total GVA (₹ Cr)</th>
                  <th className="pm-num">Elec. Share (%)</th>
                </tr>
              </thead>
              <tbody>
                {gvaData.map((row, i) => {
                  const prev = i > 0 ? gvaData[i - 1].electricity : null;
                  const growth = prev ? (((row.electricity - prev) / prev) * 100).toFixed(1) : "—";
                  const share = ((row.electricity / row.totalGva) * 100).toFixed(2);
                  return (
                    <tr key={row.year}>
                      <td><strong>{row.year}</strong></td>
                      <td className="pm-num">{fmtNum(row.electricity)}</td>
                      <td className="pm-num" style={{ color: prev && row.electricity > prev ? "#16a34a" : "#dc2626" }}>
                        {growth !== "—" ? `${growth}%` : growth}
                      </td>
                      <td className="pm-num">{fmtNum(row.manufacturing)}</td>
                      <td className="pm-num">{fmtNum(row.construction)}</td>
                      <td className="pm-num">{fmtNum(row.totalGva)}</td>
                      <td className="pm-num">{share}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Production Indices */}
      {activeTab === "production" && (
        <div className="pm-section">
          <h3>Annual Production Indices — Energy Sector Items (Base: 2011-12 = 100)</h3>
          <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "1.5rem", marginBottom: "1.5rem" }}>
            <ResponsiveContainer width="100%" height={380}>
              <ComposedChart data={productionIndices} margin={{ top: 10, right: 20, left: 20, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="year" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 11 }} label={{ value: "Index (2011-12=100)", angle: -90, position: "insideLeft", offset: -5, fontSize: 11 }} />
                <Tooltip formatter={(v: number, n: string) => [`${v.toFixed(1)}`, n]} />
                <Legend />
                <Line type="monotone" dataKey="electricity" name="Electricity" stroke={COLORS.electricity} strokeWidth={2.5} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="diesel" name="Diesel" stroke={COLORS.diesel} strokeWidth={2} dot={{ r: 3 }} strokeDasharray="5 3" />
                <Line type="monotone" dataKey="petrol" name="Petrol/Motor Spirit" stroke={COLORS.petrol} strokeWidth={2} dot={{ r: 3 }} strokeDasharray="5 3" />
                <Line type="monotone" dataKey="lpg" name="LPG" stroke={COLORS.lpg} strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="transformers" name="Transformers (Small)" stroke={COLORS.transformers} strokeWidth={2} dot={{ r: 3 }} strokeDasharray="3 2" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          <div className="pm-table-wrapper">
            <table className="pm-table">
              <thead>
                <tr>
                  <th>Year</th>
                  <th className="pm-num">Electricity</th>
                  <th className="pm-num">Diesel</th>
                  <th className="pm-num">Petrol/Motor Spirit</th>
                  <th className="pm-num">LPG</th>
                  <th className="pm-num">Transformers (Small)</th>
                </tr>
              </thead>
              <tbody>
                {productionIndices.map((row) => (
                  <tr key={row.year}>
                    <td><strong>{row.year}</strong></td>
                    <td className="pm-num">{row.electricity.toFixed(1)}</td>
                    <td className="pm-num">{row.diesel.toFixed(1)}</td>
                    <td className="pm-num">{row.petrol.toFixed(1)}</td>
                    <td className="pm-num">{row.lpg.toFixed(1)}</td>
                    <td className="pm-num" style={{ color: row.transformers > 200 ? "#0f766e" : undefined, fontWeight: row.transformers > 200 ? 700 : undefined }}>
                      {row.transformers.toFixed(1)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p style={{ fontSize: "0.8rem", color: "#94a3b8", marginTop: "0.75rem" }}>
            Source: RBI Handbook 2024-25 · Table 31 — Annual Production Indices of Select Items (Base: 2011-12 = 100)
            · Note: Transformers index of 266.6 in 2024-25 indicates rapid capacity expansion in power infra equipment.
          </p>
        </div>
      )}

      {/* State-wise */}
      {activeTab === "states" && (
        <div className="pm-section">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
            <h3 style={{ marginBottom: 0 }}>State-wise Electricity, Gas &amp; Water GVA (₹ Crore, Current Prices)</h3>
            <div className="pm-filters" style={{ marginBottom: 0 }}>
              <label style={{ fontSize: "0.85rem", color: "#64748b" }}>Year:</label>
              <select value={stateYear} onChange={(e) => setStateYear(e.target.value as typeof stateYear)}>
                <option value="y2324">2023-24</option>
                <option value="y2425">2024-25 (Provisional)</option>
              </select>
            </div>
          </div>

          {/* Bar chart */}
          <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "1.5rem", marginBottom: "1.5rem" }}>
            <ResponsiveContainer width="100%" height={420}>
              <ComposedChart
                data={sortedStates.slice(0, 15).map((s) => ({ ...s, value: s[stateYear] }))}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 120, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="state" tick={{ fontSize: 11 }} width={120} />
                <Tooltip formatter={(v: number) => [`₹${fmtNum(v)} Cr`, "Electricity GVA"]} />
                <Bar dataKey="value" name="Electricity GVA" fill={COLORS.electricity} radius={[0, 4, 4, 0]} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          <div className="pm-table-wrapper">
            <table className="pm-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>State / UT</th>
                  <th className="pm-num">2021-22 (₹ Cr)</th>
                  <th className="pm-num">2022-23 (₹ Cr)</th>
                  <th className="pm-num">2023-24 (₹ Cr)</th>
                  <th className="pm-num">2024-25 (₹ Cr)</th>
                  <th className="pm-num">3-Yr CAGR</th>
                </tr>
              </thead>
              <tbody>
                {stateElectricityGva
                  .sort((a, b) => (b.y2324 ?? 0) - (a.y2324 ?? 0))
                  .map((s, i) => {
                    const cagr = s.y2324 && s.y2122
                      ? ((Math.pow(s.y2324 / s.y2122, 1 / 2) - 1) * 100).toFixed(1)
                      : "—";
                    return (
                      <tr key={s.state}>
                        <td style={{ color: "#94a3b8" }}>{i + 1}</td>
                        <td><strong>{s.state}</strong></td>
                        <td className="pm-num">{fmtNum(s.y2122)}</td>
                        <td className="pm-num">{fmtNum(s.y2223)}</td>
                        <td className="pm-num">{fmtNum(s.y2324)}</td>
                        <td className="pm-num">{s.y2425 ? fmtNum(s.y2425) : <span style={{ color: "#94a3b8" }}>Provisional</span>}</td>
                        <td className="pm-num" style={{ color: "#0f766e", fontWeight: 600 }}>{cagr !== "—" ? `${cagr}%` : cagr}</td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
          <p style={{ fontSize: "0.8rem", color: "#94a3b8", marginTop: "0.75rem" }}>
            Source: RBI Handbook 2024-25 · Tables 7 &amp; 8 — Net State Value Added by Economic Activity (Current &amp; Constant Prices)
            · Base: 2011-12 · Source: National Statistics Office (NSO)
          </p>
        </div>
      )}
    </div>
  );
}
