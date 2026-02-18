import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { FinancialInsight } from "../../types/dashboard";

interface Props {
  insights: FinancialInsight[];
}

interface AggRow {
  period: string;
  [category: string]: number | string;
}

const CATEGORY_COLORS: Record<string, string> = {
  modules: "#f59e0b",
  inverters: "#3b82f6",
  epc: "#0f766e",
  investment: "#ec4899",
  funding: "#8b5cf6",
  other: "#64748b",
};

function getCategoryColor(cat: string): string {
  return CATEGORY_COLORS[cat.toLowerCase()] ?? CATEGORY_COLORS.other;
}

function buildChartData(insights: FinancialInsight[]): {
  rows: AggRow[];
  categories: string[];
} {
  // Group by period, then by category — take average value per group
  const periodMap = new Map<string, Map<string, number[]>>();
  for (const ins of insights) {
    if (!periodMap.has(ins.period)) periodMap.set(ins.period, new Map());
    const catMap = periodMap.get(ins.period)!;
    if (!catMap.has(ins.category)) catMap.set(ins.category, []);
    catMap.get(ins.category)!.push(ins.value);
  }

  const allCategories = new Set<string>();
  insights.forEach((i) => allCategories.add(i.category));

  const rows: AggRow[] = [];
  const sortedPeriods = Array.from(periodMap.keys()).sort();
  for (const period of sortedPeriods) {
    const row: AggRow = { period };
    const catMap = periodMap.get(period)!;
    for (const cat of allCategories) {
      const vals = catMap.get(cat);
      if (vals && vals.length > 0) {
        row[cat] = parseFloat(
          (vals.reduce((s, v) => s + v, 0) / vals.length).toFixed(2),
        );
      } else {
        row[cat] = 0;
      }
    }
    rows.push(row);
  }

  return { rows, categories: Array.from(allCategories) };
}

interface TooltipPayloadEntry {
  name: string;
  value: number;
  color: string;
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip chart-tooltip--wide">
      <p className="chart-tooltip-label">{label}</p>
      {payload
        .filter((p) => p.value > 0)
        .map((p) => (
          <div key={p.name} className="chart-tooltip-row">
            <span
              className="chart-tooltip-dot"
              style={{ background: p.color }}
            />
            <span className="chart-tooltip-name">{p.name}</span>
            <span className="chart-tooltip-value">
              {p.value.toLocaleString("en-IN")}
            </span>
          </div>
        ))}
    </div>
  );
}

export default function FinancialInsightsChart({ insights }: Props) {
  if (insights.length === 0) {
    return (
      <div className="chart-card">
        <div className="chart-card-header">
          <h3 className="chart-card-title">Financial Insights Trends</h3>
        </div>
        <div className="chart-empty">No financial data available</div>
      </div>
    );
  }

  const { rows, categories } = buildChartData(insights);

  // Detect unit from first insight for y-axis label
  const unit = insights[0]?.unit ?? "";

  return (
    <div className="chart-card">
      <div className="chart-card-header">
        <div>
          <h3 className="chart-card-title">Financial Insights Trends</h3>
          <p className="chart-card-sub">
            Average metric value by period &amp; category
            {unit ? ` (${unit})` : ""}
          </p>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={280}>
        <BarChart
          data={rows}
          margin={{ top: 8, right: 16, bottom: 8, left: 8 }}
          barCategoryGap="25%"
          barGap={3}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
          <XAxis
            dataKey="period"
            tick={{ fontSize: 11, fill: "#64748b" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "#64748b" }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) =>
              v >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${v}`
            }
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            iconType="circle"
            iconSize={9}
            formatter={(value: string) => (
              <span style={{ fontSize: 12, color: "#475569", textTransform: "capitalize" }}>
                {value}
              </span>
            )}
          />
          {categories.map((cat) => (
            <Bar
              key={cat}
              dataKey={cat}
              name={cat}
              fill={getCategoryColor(cat)}
              radius={[3, 3, 0, 0]}
              isAnimationActive={true}
              animationBegin={100}
              animationDuration={700}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
