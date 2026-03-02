import { useState, Fragment } from "react";
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
  Cell,
} from "recharts";

/* -------------------------------------------------------------------------- */
/*  Types                                                                       */
/* -------------------------------------------------------------------------- */

type YearKey = "fy2223" | "fy2324" | "fy2425" | "fy2526";
type RegionKey = "North" | "West" | "South" | "East" | "NE";

interface YearData {
  req: number;
  sup: number;
  gap: number;
  pct: number;
}

interface StateRow {
  state: string;
  region: RegionKey;
  fy2223: YearData;
  fy2324: YearData;
  fy2425: YearData;
  fy2526: YearData;
}

interface StateChartEntry {
  state: string;
  region: RegionKey;
  req: number;
  sup: number;
  gap: number;
  pct: number;
}

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

interface StateTooltipPayload extends TooltipEntry {
  payload: StateChartEntry;
}

interface StateTooltipProps {
  active?: boolean;
  payload?: StateTooltipPayload[];
  label?: string;
}

/* -------------------------------------------------------------------------- */
/*  Constants                                                                   */
/* -------------------------------------------------------------------------- */

const YEAR_LABELS: Record<YearKey, string> = {
  fy2223: "FY 2022-23",
  fy2324: "FY 2023-24",
  fy2425: "FY 2024-25",
  fy2526: "FY 2025-26*",
};

const REGION_LABELS: Record<RegionKey, string> = {
  North: "Northern Region",
  West:  "Western Region",
  South: "Southern Region",
  East:  "Eastern Region",
  NE:    "North-Eastern Region",
};

const REGION_ORDER: RegionKey[] = ["North", "West", "South", "East", "NE"];

function getBarColor(pct: number): string {
  if (pct >= 5) return "#dc2626";
  if (pct >= 2) return "#f97316";
  if (pct >= 1) return "#d97706";
  return "#0f766e";
}

/* -------------------------------------------------------------------------- */
/*  National Data                                                               */
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
/*  State-wise Data  (Annexure-II, PIB PRID 2223710)                           */
/*  Figures in MU (Million Units)                                               */
/* -------------------------------------------------------------------------- */

const STATE_GAP_DATA: StateRow[] = [
  // Northern Region
  { state: "Chandigarh",        region: "North", fy2223: { req:   1788, sup:   1788, gap:    0, pct: 0.0 }, fy2324: { req:   1789, sup:   1789, gap:    0, pct: 0.0 }, fy2425: { req:   1952, sup:   1952, gap:    0, pct: 0.0 }, fy2526: { req:   1509, sup:   1509, gap:    1, pct: 0.0 } },
  { state: "Delhi",             region: "North", fy2223: { req:  35143, sup:  35133, gap:   10, pct: 0.0 }, fy2324: { req:  35501, sup:  35496, gap:    5, pct: 0.0 }, fy2425: { req:  38255, sup:  38243, gap:   12, pct: 0.0 }, fy2526: { req:  31006, sup:  30999, gap:    7, pct: 0.0 } },
  { state: "Haryana",           region: "North", fy2223: { req:  61451, sup:  60945, gap:  506, pct: 0.8 }, fy2324: { req:  63983, sup:  63636, gap:  348, pct: 0.5 }, fy2425: { req:  70149, sup:  70120, gap:   30, pct: 0.0 }, fy2526: { req:  55932, sup:  55867, gap:   65, pct: 0.1 } },
  { state: "Himachal Pradesh",  region: "North", fy2223: { req:  12649, sup:  12542, gap:  107, pct: 0.8 }, fy2324: { req:  12805, sup:  12767, gap:   38, pct: 0.3 }, fy2425: { req:  13566, sup:  13526, gap:   40, pct: 0.3 }, fy2526: { req:  10329, sup:  10294, gap:   36, pct: 0.3 } },
  { state: "Jammu & Kashmir",   region: "North", fy2223: { req:  19639, sup:  19322, gap:  317, pct: 1.6 }, fy2324: { req:  20040, sup:  19763, gap:  277, pct: 1.4 }, fy2425: { req:  20374, sup:  20283, gap:   90, pct: 0.4 }, fy2526: { req:  14874, sup:  14862, gap:   12, pct: 0.1 } },
  { state: "Punjab",            region: "North", fy2223: { req:  69522, sup:  69220, gap:  302, pct: 0.4 }, fy2324: { req:  69533, sup:  69528, gap:    5, pct: 0.0 }, fy2425: { req:  77423, sup:  77423, gap:    0, pct: 0.0 }, fy2526: { req:  60827, sup:  60786, gap:   41, pct: 0.1 } },
  { state: "Rajasthan",         region: "North", fy2223: { req: 101801, sup: 100057, gap: 1745, pct: 1.7 }, fy2324: { req: 107422, sup: 106806, gap:  616, pct: 0.6 }, fy2425: { req: 113833, sup: 113529, gap:  304, pct: 0.3 }, fy2526: { req:  82763, sup:  82763, gap:    0, pct: 0.0 } },
  { state: "Uttar Pradesh",     region: "North", fy2223: { req: 144251, sup: 143050, gap: 1201, pct: 0.8 }, fy2324: { req: 148791, sup: 148287, gap:  504, pct: 0.3 }, fy2425: { req: 165090, sup: 164786, gap:  304, pct: 0.2 }, fy2526: { req: 129329, sup: 129304, gap:   26, pct: 0.0 } },
  { state: "Uttarakhand",       region: "North", fy2223: { req:  15647, sup:  15386, gap:  261, pct: 1.7 }, fy2324: { req:  15644, sup:  15532, gap:  112, pct: 0.7 }, fy2425: { req:  16770, sup:  16727, gap:   43, pct: 0.3 }, fy2526: { req:  12630, sup:  12582, gap:   49, pct: 0.4 } },
  // Western Region
  { state: "Chhattisgarh",      region: "West",  fy2223: { req:  37446, sup:  37374, gap:   72, pct: 0.2 }, fy2324: { req:  39930, sup:  39872, gap:   58, pct: 0.1 }, fy2425: { req:  43208, sup:  43180, gap:   28, pct: 0.1 }, fy2526: { req:  31502, sup:  31494, gap:    8, pct: 0.0 } },
  { state: "Gujarat",           region: "West",  fy2223: { req: 139043, sup: 138999, gap:   44, pct: 0.0 }, fy2324: { req: 145768, sup: 145740, gap:   28, pct: 0.0 }, fy2425: { req: 151878, sup: 151875, gap:    3, pct: 0.0 }, fy2526: { req: 117364, sup: 117364, gap:    0, pct: 0.0 } },
  { state: "Madhya Pradesh",    region: "West",  fy2223: { req:  92683, sup:  92325, gap:  358, pct: 0.4 }, fy2324: { req:  99301, sup:  99150, gap:  151, pct: 0.2 }, fy2425: { req: 104445, sup: 104312, gap:  133, pct: 0.1 }, fy2526: { req:  75081, sup:  75073, gap:    8, pct: 0.0 } },
  { state: "Maharashtra",       region: "West",  fy2223: { req: 187309, sup: 187197, gap:  111, pct: 0.1 }, fy2324: { req: 207108, sup: 206931, gap:  176, pct: 0.1 }, fy2425: { req: 201816, sup: 201757, gap:   59, pct: 0.0 }, fy2526: { req: 148848, sup: 148839, gap:    9, pct: 0.0 } },
  { state: "D&NH & Daman",      region: "West",  fy2223: { req:  10018, sup:  10018, gap:    0, pct: 0.0 }, fy2324: { req:  10164, sup:  10164, gap:    0, pct: 0.0 }, fy2425: { req:  10852, sup:  10852, gap:    0, pct: 0.0 }, fy2526: { req:   8439, sup:   8439, gap:    0, pct: 0.0 } },
  { state: "Goa",               region: "West",  fy2223: { req:   4669, sup:   4669, gap:    0, pct: 0.0 }, fy2324: { req:   5111, sup:   5111, gap:    0, pct: 0.0 }, fy2425: { req:   5411, sup:   5411, gap:    0, pct: 0.0 }, fy2526: { req:   4086, sup:   4086, gap:    0, pct: 0.0 } },
  // Southern Region
  { state: "Andhra Pradesh",    region: "South", fy2223: { req:  72302, sup:  71893, gap:  410, pct: 0.6 }, fy2324: { req:  80209, sup:  80151, gap:   57, pct: 0.1 }, fy2425: { req:  79028, sup:  79025, gap:    3, pct: 0.0 }, fy2526: { req:  59543, sup:  59537, gap:    6, pct: 0.0 } },
  { state: "Telangana",         region: "South", fy2223: { req:  77832, sup:  77799, gap:   34, pct: 0.0 }, fy2324: { req:  84623, sup:  84613, gap:    9, pct: 0.0 }, fy2425: { req:  88262, sup:  88258, gap:    4, pct: 0.0 }, fy2526: { req:  61062, sup:  61055, gap:    7, pct: 0.0 } },
  { state: "Karnataka",         region: "South", fy2223: { req:  75688, sup:  75663, gap:   26, pct: 0.0 }, fy2324: { req:  94088, sup:  93934, gap:  154, pct: 0.2 }, fy2425: { req:  92450, sup:  92446, gap:    4, pct: 0.0 }, fy2526: { req:  67547, sup:  67538, gap:    9, pct: 0.0 } },
  { state: "Kerala",            region: "South", fy2223: { req:  27747, sup:  27726, gap:   21, pct: 0.1 }, fy2324: { req:  30943, sup:  30938, gap:    5, pct: 0.0 }, fy2425: { req:  31624, sup:  31616, gap:    8, pct: 0.0 }, fy2526: { req:  22949, sup:  22946, gap:    2, pct: 0.0 } },
  { state: "Tamil Nadu",        region: "South", fy2223: { req: 114798, sup: 114722, gap:   77, pct: 0.1 }, fy2324: { req: 126163, sup: 126151, gap:   12, pct: 0.0 }, fy2425: { req: 130413, sup: 130408, gap:    5, pct: 0.0 }, fy2526: { req:  99901, sup:  99892, gap:   10, pct: 0.0 } },
  { state: "Puducherry",        region: "South", fy2223: { req:   3051, sup:   3050, gap:    1, pct: 0.0 }, fy2324: { req:   3456, sup:   3455, gap:    1, pct: 0.0 }, fy2425: { req:   3549, sup:   3549, gap:    0, pct: 0.0 }, fy2526: { req:   2691, sup:   2688, gap:    3, pct: 0.1 } },
  { state: "Lakshadweep",       region: "South", fy2223: { req:     64, sup:     64, gap:    0, pct: 0.0 }, fy2324: { req:     64, sup:     64, gap:    0, pct: 0.0 }, fy2425: { req:     68, sup:     68, gap:    0, pct: 0.0 }, fy2526: { req:     54, sup:     54, gap:    0, pct: 0.0 } },
  // Eastern Region
  { state: "Bihar",             region: "East",  fy2223: { req:  39545, sup:  38762, gap:  783, pct: 2.0 }, fy2324: { req:  41514, sup:  40918, gap:  596, pct: 1.4 }, fy2425: { req:  44393, sup:  44217, gap:  176, pct: 0.4 }, fy2526: { req:  37294, sup:  37280, gap:   13, pct: 0.0 } },
  { state: "DVC",               region: "East",  fy2223: { req:  26339, sup:  26330, gap:    9, pct: 0.0 }, fy2324: { req:  26560, sup:  26552, gap:    8, pct: 0.0 }, fy2425: { req:  25891, sup:  25888, gap:    3, pct: 0.0 }, fy2526: { req:  18595, sup:  18592, gap:    3, pct: 0.0 } },
  { state: "Jharkhand",         region: "East",  fy2223: { req:  13278, sup:  12288, gap:  990, pct: 7.5 }, fy2324: { req:  14408, sup:  13858, gap:  550, pct: 3.8 }, fy2425: { req:  15203, sup:  15126, gap:   77, pct: 0.5 }, fy2526: { req:  11735, sup:  11731, gap:    5, pct: 0.0 } },
  { state: "Odisha",            region: "East",  fy2223: { req:  42631, sup:  42584, gap:   47, pct: 0.1 }, fy2324: { req:  41358, sup:  41333, gap:   25, pct: 0.1 }, fy2425: { req:  42882, sup:  42858, gap:   24, pct: 0.1 }, fy2526: { req:  34064, sup:  34059, gap:    5, pct: 0.0 } },
  { state: "West Bengal",       region: "East",  fy2223: { req:  60348, sup:  60274, gap:   74, pct: 0.1 }, fy2324: { req:  67576, sup:  67490, gap:   86, pct: 0.1 }, fy2425: { req:  71180, sup:  71085, gap:   95, pct: 0.1 }, fy2526: { req:  56878, sup:  56846, gap:   32, pct: 0.1 } },
  { state: "Sikkim",            region: "East",  fy2223: { req:    587, sup:    587, gap:    0, pct: 0.0 }, fy2324: { req:    544, sup:    543, gap:    0, pct: 0.0 }, fy2425: { req:    574, sup:    574, gap:    0, pct: 0.0 }, fy2526: { req:    382, sup:    382, gap:    0, pct: 0.0 } },
  { state: "Andaman & Nicobar", region: "East",  fy2223: { req:    348, sup:    348, gap:    0, pct: 0.0 }, fy2324: { req:    386, sup:    374, gap:   12, pct: 3.2 }, fy2425: { req:    425, sup:    413, gap:   12, pct: 2.9 }, fy2526: { req:    318, sup:    301, gap:   17, pct: 5.5 } },
  // North-Eastern Region
  { state: "Arunachal Pradesh", region: "NE",    fy2223: { req:    915, sup:    892, gap:   24, pct: 2.6 }, fy2324: { req:   1014, sup:   1014, gap:    0, pct: 0.0 }, fy2425: { req:   1050, sup:   1050, gap:    0, pct: 0.0 }, fy2526: { req:    909, sup:    909, gap:    0, pct: 0.0 } },
  { state: "Assam",             region: "NE",    fy2223: { req:  11465, sup:  11465, gap:    0, pct: 0.0 }, fy2324: { req:  12445, sup:  12341, gap:  104, pct: 0.8 }, fy2425: { req:  12843, sup:  12837, gap:    6, pct: 0.0 }, fy2526: { req:  10973, sup:  10973, gap:    1, pct: 0.0 } },
  { state: "Manipur",           region: "NE",    fy2223: { req:   1014, sup:   1014, gap:    0, pct: 0.0 }, fy2324: { req:   1023, sup:   1008, gap:   15, pct: 1.5 }, fy2425: { req:   1079, sup:   1068, gap:   10, pct: 0.9 }, fy2526: { req:    863, sup:    861, gap:    3, pct: 0.3 } },
  { state: "Meghalaya",         region: "NE",    fy2223: { req:   2237, sup:   2237, gap:    0, pct: 0.0 }, fy2324: { req:   2236, sup:   2066, gap:  170, pct: 7.6 }, fy2425: { req:   2046, sup:   2046, gap:    0, pct: 0.0 }, fy2526: { req:   1542, sup:   1542, gap:    0, pct: 0.0 } },
  { state: "Mizoram",           region: "NE",    fy2223: { req:    645, sup:    645, gap:    0, pct: 0.0 }, fy2324: { req:    684, sup:    684, gap:    0, pct: 0.0 }, fy2425: { req:    709, sup:    709, gap:    0, pct: 0.0 }, fy2526: { req:    559, sup:    559, gap:    0, pct: 0.0 } },
  { state: "Nagaland",          region: "NE",    fy2223: { req:    926, sup:    873, gap:   54, pct: 5.8 }, fy2324: { req:    921, sup:    921, gap:    0, pct: 0.0 }, fy2425: { req:    938, sup:    938, gap:    0, pct: 0.0 }, fy2526: { req:    772, sup:    772, gap:    0, pct: 0.0 } },
  { state: "Tripura",           region: "NE",    fy2223: { req:   1547, sup:   1547, gap:    0, pct: 0.0 }, fy2324: { req:   1691, sup:   1691, gap:    0, pct: 0.0 }, fy2425: { req:   1939, sup:   1939, gap:    0, pct: 0.0 }, fy2526: { req:   1523, sup:   1523, gap:    0, pct: 0.0 } },
];

/* -------------------------------------------------------------------------- */
/*  Custom Tooltips                                                             */
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

function StateTooltip({ active, payload, label }: StateTooltipProps) {
  if (!active || !payload?.length || !payload[0]) return null;
  const entry = payload[0].payload;
  const color = payload[0].color;
  return (
    <div className="egap-tooltip">
      <p className="egap-tooltip-label">{label}</p>
      <p className="egap-tooltip-row">
        <span className="egap-tooltip-dot" style={{ background: "#64748b" }} />
        Region: <strong>{REGION_LABELS[entry.region]}</strong>
      </p>
      <p className="egap-tooltip-row">
        <span className="egap-tooltip-dot" style={{ background: color }} />
        Deficit: <strong>−{entry.pct.toFixed(1)}%</strong>
      </p>
      <p className="egap-tooltip-row">
        <span className="egap-tooltip-dot" style={{ background: "#d97706" }} />
        Not Supplied: <strong>{entry.gap.toLocaleString("en-IN")} MU</strong>
      </p>
      <p className="egap-tooltip-row">
        <span className="egap-tooltip-dot" style={{ background: "#94a3b8" }} />
        Requirement: <strong>{entry.req.toLocaleString("en-IN")} MU</strong>
      </p>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Component                                                                   */
/* -------------------------------------------------------------------------- */

export default function EnergyGapPanel() {
  const [collapsed, setCollapsed] = useState(false);
  const [tab, setTab] = useState<"national" | "statewise">("national");
  const [year, setYear] = useState<YearKey>("fy2425");

  // Latest full year (FY 24-25) for the national KPI cards
  const latest = ENERGY_GAP_DATA[2]!;
  const prev = ENERGY_GAP_DATA[0]!;

  // State-wise chart: states with gap > 0, sorted by pct desc
  const stateChartData: StateChartEntry[] = STATE_GAP_DATA
    .map((s) => ({ state: s.state, region: s.region, ...s[year] }))
    .filter((s) => s.gap > 0)
    .sort((a, b) => b.pct - a.pct);

  const stateChartHeight = Math.max(200, stateChartData.length * 36);

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
              and distribution (T&amp;D) constraints at the state level.
            </p>
          </div>

          {/* ── Tabs ── */}
          <div className="egap-tabs">
            <button
              className={`egap-tab ${tab === "national" ? "egap-tab--active" : ""}`}
              onClick={() => setTab("national")}
            >
              National Summary
            </button>
            <button
              className={`egap-tab ${tab === "statewise" ? "egap-tab--active" : ""}`}
              onClick={() => setTab("statewise")}
            >
              State-wise Breakdown
            </button>
          </div>

          {/* ── National Summary tab ── */}
          {tab === "national" && (
            <>
              {/* KPI Cards */}
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

              {/* Charts */}
              <div className="egap-charts-row">
                <div className="egap-chart-card">
                  <h4 className="egap-chart-title">Energy Requirement vs Supplied (BU)</h4>
                  <p className="egap-chart-desc">
                    Billion Units (MU ÷ 1,000) &nbsp;·&nbsp; Line = Deficit %
                  </p>
                  <ResponsiveContainer width="100%" height={260}>
                    <ComposedChart data={ENERGY_GAP_DATA} margin={{ top: 8, right: 24, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                      <XAxis dataKey="year" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                      <YAxis yAxisId="bu" domain={[1100, 1800]} tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `${v}`} width={40} />
                      <YAxis yAxisId="pct" orientation="right" domain={[0, 6]} tick={{ fontSize: 11, fill: "#d97706" }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `${v}%`} width={36} />
                      <Tooltip content={<EnergyTooltip />} />
                      <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                      <Bar yAxisId="bu" dataKey="requirementBU" name="Requirement (BU)" fill="#0f766e" radius={[3, 3, 0, 0]} maxBarSize={36} />
                      <Bar yAxisId="bu" dataKey="suppliedBU" name="Supplied (BU)" fill="#5eead4" radius={[3, 3, 0, 0]} maxBarSize={36} />
                      <Line yAxisId="pct" type="monotone" dataKey="deficitPct" name="Deficit %" stroke="#d97706" strokeWidth={2} dot={{ r: 4, fill: "#d97706", strokeWidth: 0 }} activeDot={{ r: 6 }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>

                <div className="egap-chart-card">
                  <h4 className="egap-chart-title">Peak Demand vs Peak Met (MW)</h4>
                  <p className="egap-chart-desc">Megawatts &nbsp;·&nbsp; Line = Peak Deficit %</p>
                  <ResponsiveContainer width="100%" height={260}>
                    <ComposedChart data={ENERGY_GAP_DATA} margin={{ top: 8, right: 24, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                      <XAxis dataKey="year" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                      <YAxis yAxisId="mw" domain={[150000, 270000]} tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`} width={40} />
                      <YAxis yAxisId="pct" orientation="right" domain={[0, 6]} tick={{ fontSize: 11, fill: "#d97706" }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `${v}%`} width={36} />
                      <Tooltip content={<PeakTooltip />} />
                      <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                      <Bar yAxisId="mw" dataKey="peakDemandMW" name="Peak Demand (MW)" fill="#0f766e" radius={[3, 3, 0, 0]} maxBarSize={36} />
                      <Bar yAxisId="mw" dataKey="peakMetMW" name="Peak Met (MW)" fill="#5eead4" radius={[3, 3, 0, 0]} maxBarSize={36} />
                      <Line yAxisId="pct" type="monotone" dataKey="peakDeficitPct" name="Peak Deficit %" stroke="#d97706" strokeWidth={2} dot={{ r: 4, fill: "#d97706", strokeWidth: 0 }} activeDot={{ r: 6 }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Trend table */}
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
                          {row.partial && <span className="egap-partial-badge">Apr–Dec</span>}
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
            </>
          )}

          {/* ── State-wise Breakdown tab ── */}
          {tab === "statewise" && (
            <div className="egap-state-view">
              {/* Year selector */}
              <div className="egap-year-selector">
                {(Object.keys(YEAR_LABELS) as YearKey[]).map((key) => (
                  <button
                    key={key}
                    className={`egap-year-btn ${year === key ? "egap-year-btn--active" : ""}`}
                    onClick={() => setYear(key)}
                  >
                    {YEAR_LABELS[key]}
                    {key === "fy2526" && <span className="egap-partial-badge">Apr–Dec</span>}
                  </button>
                ))}
              </div>

              {/* Deficit chart — only states with gap > 0 */}
              {stateChartData.length > 0 ? (
                <div className="egap-chart-card">
                  <div className="egap-state-chart-header">
                    <div>
                      <h4 className="egap-chart-title">
                        States / UTs with Energy Deficit — {YEAR_LABELS[year]}
                      </h4>
                      <p className="egap-chart-desc">
                        Sorted by deficit % (highest first) · Only states with gap &gt; 0 shown
                      </p>
                    </div>
                    <div className="egap-deficit-legend">
                      <span className="egap-legend-item"><span className="egap-legend-dot" style={{ background: "#0f766e" }} />&lt;1%</span>
                      <span className="egap-legend-item"><span className="egap-legend-dot" style={{ background: "#d97706" }} />1–2%</span>
                      <span className="egap-legend-item"><span className="egap-legend-dot" style={{ background: "#f97316" }} />2–5%</span>
                      <span className="egap-legend-item"><span className="egap-legend-dot" style={{ background: "#dc2626" }} />5%+</span>
                    </div>
                  </div>
                  <div style={{ height: stateChartHeight }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart
                        layout="vertical"
                        data={stateChartData}
                        margin={{ top: 4, right: 56, left: 0, bottom: 4 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                        <XAxis
                          type="number"
                          domain={[0, "auto"]}
                          tick={{ fontSize: 11, fill: "#64748b" }}
                          axisLine={false}
                          tickLine={false}
                          tickFormatter={(v: number) => `${v}%`}
                        />
                        <YAxis
                          type="category"
                          dataKey="state"
                          width={148}
                          tick={{ fontSize: 11, fill: "#475569" }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <Tooltip content={<StateTooltip />} />
                        <Bar dataKey="pct" name="Deficit %" radius={[0, 3, 3, 0]} maxBarSize={22}>
                          {stateChartData.map((entry, i) => (
                            <Cell key={i} fill={getBarColor(entry.pct)} />
                          ))}
                        </Bar>
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              ) : (
                <div className="egap-no-deficit">
                  <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p>No states reported an energy deficit for {YEAR_LABELS[year]}</p>
                </div>
              )}

              {/* State-wise table grouped by region */}
              <div className="egap-table-wrapper">
                <table className="egap-table">
                  <thead>
                    <tr>
                      <th>State / UT</th>
                      <th className="egap-num">Requirement (MU)</th>
                      <th className="egap-num">Supplied (MU)</th>
                      <th className="egap-num">Not Supplied (MU)</th>
                      <th className="egap-num">Deficit %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {REGION_ORDER.flatMap((region) => {
                      const states = STATE_GAP_DATA.filter((s) => s.region === region);
                      return [
                        <tr key={`hdr-${region}`} className="egap-region-row">
                          <td colSpan={5}>{REGION_LABELS[region]}</td>
                        </tr>,
                        ...states.map((s) => {
                          const d = s[year];
                          return (
                            <Fragment key={s.state}>
                              <tr className={d.gap > 0 ? "egap-deficit-row" : ""}>
                                <td>{s.state}</td>
                                <td className="egap-num">{d.req.toLocaleString("en-IN")}</td>
                                <td className="egap-num">{d.sup.toLocaleString("en-IN")}</td>
                                <td className={`egap-num ${d.gap > 0 ? "egap-gap-cell" : ""}`}>
                                  {d.gap > 0 ? d.gap.toLocaleString("en-IN") : "—"}
                                </td>
                                <td className={`egap-num ${d.pct > 0 ? "egap-pct-cell" : ""}`}>
                                  {d.pct > 0 ? `−${d.pct.toFixed(1)}%` : "—"}
                                </td>
                              </tr>
                            </Fragment>
                          );
                        }),
                      ];
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

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
