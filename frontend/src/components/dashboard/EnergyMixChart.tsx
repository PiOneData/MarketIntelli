import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { PowerMarketOverview } from "../../types/powerMarket";

interface Props {
  overview: PowerMarketOverview;
}

const SLICE_COLORS = ["#f59e0b", "#3b82f6", "#14b8a6", "#ec4899"];

const SOURCE_LABELS: Record<string, string> = {
  Solar: "#f59e0b",
  Wind: "#3b82f6",
  "Small Hydro": "#14b8a6",
  "Biomass/Waste": "#ec4899",
};

interface CustomLabelProps {
  cx: number;
  cy: number;
  midAngle: number;
  innerRadius: number;
  outerRadius: number;
  percent: number;
}

function CustomLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent }: CustomLabelProps) {
  if (percent < 0.04) return null;
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.55;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text
      x={x}
      y={y}
      fill="#fff"
      textAnchor="middle"
      dominantBaseline="central"
      fontSize={12}
      fontWeight={700}
    >
      {`${(percent * 100).toFixed(1)}%`}
    </text>
  );
}

interface TooltipPayloadEntry {
  name: string;
  value: number;
  payload: {
    name: string;
    value: number;
    unit: string;
  };
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: TooltipPayloadEntry[] }) {
  if (!active || !payload?.length) return null;
  const entry = payload[0];
  if (!entry) return null;
  const gw =
    entry.value >= 1000
      ? `${(entry.value / 1000).toFixed(2)} GW`
      : `${entry.value.toLocaleString("en-IN")} MW`;
  return (
    <div className="chart-tooltip">
      <p className="chart-tooltip-label">{entry.name}</p>
      <p className="chart-tooltip-value">{gw}</p>
    </div>
  );
}

export default function EnergyMixChart({ overview }: Props) {
  const rawData = [
    { name: "Solar", value: overview.total_solar_mw },
    { name: "Wind", value: overview.total_wind_mw },
    { name: "Small Hydro", value: overview.total_small_hydro_mw },
    { name: "Biomass/Waste", value: overview.total_biomass_mw },
  ].filter((d) => d.value > 0);

  const total = rawData.reduce((sum, d) => sum + d.value, 0);
  const totalFormatted =
    total >= 1000
      ? `${(total / 1000).toFixed(2)} GW`
      : `${total.toLocaleString("en-IN")} MW`;

  if (rawData.length === 0) {
    return (
      <div className="chart-card">
        <div className="chart-card-header">
          <h3 className="chart-card-title">Renewable Energy Mix</h3>
        </div>
        <div className="chart-empty">No capacity data available</div>
      </div>
    );
  }

  return (
    <div className="chart-card">
      <div className="chart-card-header">
        <div>
          <h3 className="chart-card-title">Renewable Energy Mix</h3>
          <p className="chart-card-sub">Share by installed capacity ({overview.data_year})</p>
        </div>
        <div className="chart-card-badge">
          <span className="chart-total-label">Total</span>
          <span className="chart-total-value">{totalFormatted}</span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={280}>
        <PieChart>
          <Pie
            data={rawData}
            cx="50%"
            cy="50%"
            innerRadius={70}
            outerRadius={115}
            paddingAngle={3}
            dataKey="value"
            labelLine={false}
            label={CustomLabel as unknown as boolean}
            isAnimationActive={true}
            animationBegin={100}
            animationDuration={800}
          >
            {rawData.map((_, index) => (
              <Cell
                key={`cell-${index}`}
                fill={SLICE_COLORS[index % SLICE_COLORS.length]}
                stroke="white"
                strokeWidth={2}
              />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend
            iconType="circle"
            iconSize={10}
            formatter={(value: string) => (
              <span style={{ color: SOURCE_LABELS[value] ?? "#666", fontWeight: 600, fontSize: 13 }}>
                {value}
              </span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
