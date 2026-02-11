import type { MarketOverview } from "../../types/dashboard";

function MarketOverviewPanel({ data }: { data: MarketOverview }) {
  return (
    <section className="market-overview-panel">
      <h3>Market Overview</h3>
      <div className="metrics-grid">
        <div className="metric-card">
          <span className="metric-value">
            {data.total_capacity_mw.toLocaleString()} MW
          </span>
          <span className="metric-label">Total Installed Capacity</span>
        </div>
        <div className="metric-card">
          <span className="metric-value">{data.upcoming_projects_count}</span>
          <span className="metric-label">Upcoming Projects</span>
        </div>
        <div className="metric-card">
          <span className="metric-value">
            {data.regional_distribution.length}
          </span>
          <span className="metric-label">Regions Covered</span>
        </div>
      </div>
    </section>
  );
}

export default MarketOverviewPanel;
