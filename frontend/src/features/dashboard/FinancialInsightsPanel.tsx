import type { FinancialInsight } from "../../types/dashboard";

function FinancialInsightsPanel({ data }: { data: FinancialInsight[] }) {
  return (
    <section className="financial-insights-panel">
      <h3>Financial Insights</h3>
      {data.length === 0 ? (
        <p>No financial insights available yet.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Category</th>
              <th>Metric</th>
              <th>Value</th>
              <th>Period</th>
              <th>Source</th>
            </tr>
          </thead>
          <tbody>
            {data.map((insight) => (
              <tr key={insight.id}>
                <td>{insight.category}</td>
                <td>{insight.metric_name}</td>
                <td>
                  {insight.value.toLocaleString()} {insight.unit}
                </td>
                <td>{insight.period}</td>
                <td>{insight.source}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

export default FinancialInsightsPanel;
