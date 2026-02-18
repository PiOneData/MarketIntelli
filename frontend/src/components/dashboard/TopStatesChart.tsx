import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import type { RenewableCapacitySummary } from "../../types/powerMarket";

interface Props {
  summaryData: RenewableCapacitySummary[];
}

interface AggState {
  state: string;
  total_mw: number;
}

function aggregateByState(data: RenewableCapacitySummary[]): AggState[] {
  const map = new Map<string, number>();
  for (const row of data) {
    const prev = map.get(row.state) ?? 0;
    map.set(row.state, prev + row.total_installed_mw);
  }
  return Array.from(map.entries())
    .map(([state, total_mw]) => ({ state, total_mw }))
    .sort((a, b) => b.total_mw - a.total_mw)
    .slice(0, 10);
}

function formatTickMW(v: number): string {
  if (v >= 1000) return `${(v / 1000).toFixed(0)}k`;
  return `${v}`;
}

const BAR_COLORS = [
  "#0f766e", "#14b8a6", "#0d9488", "#0e7490",
  "#0369a1", "#1d4ed8", "#4f46e5", "#7c3aed",
  "#9333ea", "#c026d3",
];

interface TooltipPayloadEntry {
  value: number;
  payload: {
    state: string;
    total_mw: number;
  };
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: TooltipPayloadEntry[] }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  const display =
    d.total_mw >= 1000
      ? `${(d.total_mw / 1000).toFixed(2)} GW`
      : `${d.total_mw.toLocaleString("en-IN")} MW`;
  return (
    <div className="chart-tooltip">
      <p className="chart-tooltip-label">{d.state}</p>
      <p className="chart-tooltip-value">{display} installed</p>
    </div>
  );
}

export default function TopStatesChart({ summaryData }: Props) {
  const aggData = aggregateByState(summaryData);

  if (aggData.length === 0) {
    return (
      <div className="chart-card">
        <div className="chart-card-header">
          <h3 className="chart-card-title">Top States by RE Capacity</h3>
        </div>
        <div className="chart-empty">No state capacity data available</div>
      </div>
    );
  }

  const maxVal = aggData[0].total_mw;
  const domainMax = Math.ceil(maxVal / 5000) * 5000;

  return (
    <div className="chart-card">
      <div className="chart-card-header">
        <div>
          <h3 className="chart-card-title">Top States by RE Capacity</h3>
          <p className="chart-card-sub">Installed capacity across all renewable sources (MW)</p>
        </div>
        <span className="chart-card-tag">Top {aggData.length}</span>
      </div>

      <ResponsiveContainer width="100%" height={280}>
        <BarChart
          data={aggData}
          layout="vertical"
          margin={{ top: 4, right: 24, bottom: 4, left: 8 }}
          barCategoryGap="20%"
        >
          <CartesianGrid
            strokeDasharray="3 3"
            horizontal={false}
            stroke="#e2e8f0"
          />
          <XAxis
            type="number"
            domain={[0, domainMax]}
            tickFormatter={formatTickMW}
            tick={{ fontSize: 11, fill: "#64748b" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="state"
            width={90}
            tick={{ fontSize: 11, fill: "#334155", fontWeight: 500 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(15,118,110,0.06)" }} />
          <Bar
            dataKey="total_mw"
            radius={[0, 4, 4, 0]}
            isAnimationActive={true}
            animationBegin={100}
            animationDuration={700}
          >
            {aggData.map((_, index) => (
              <Cell key={`cell-${index}`} fill={BAR_COLORS[index % BAR_COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
