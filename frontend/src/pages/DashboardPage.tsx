import { useMemo } from "react";
import { useMarketOverview, useFinancialInsights } from "../hooks/useDashboard";
import {
  usePowerMarketOverview,
  useCapacitySummary,
  useRETariffs,
} from "../hooks/usePowerMarket";
import KpiCarousel from "../components/dashboard/KpiCarousel";
import RegionalCapacityCarousel from "../components/dashboard/RegionalCapacityCarousel";
import EnergyMixChart from "../components/dashboard/EnergyMixChart";
import TopStatesChart from "../components/dashboard/TopStatesChart";
import FinancialInsightsChart from "../components/dashboard/FinancialInsightsChart";
import LoadingSpinner from "../components/common/LoadingSpinner";
import ErrorMessage from "../components/common/ErrorMessage";

function DashboardPage() {
  const overview = useMarketOverview();
  const insights = useFinancialInsights();
  const pmOverview = usePowerMarketOverview();
  const capacitySummary = useCapacitySummary();
  const tariffs = useRETariffs();

  // Compute average tariff across all discovered RE tariffs
  const avgTariff = useMemo(() => {
    if (!tariffs.data?.length) return undefined;
    const sum = tariffs.data.reduce((acc, t) => acc + t.rate_per_kwh, 0);
    return sum / tariffs.data.length;
  }, [tariffs.data]);

  // Only block on the market overview (primary data)
  if (overview.isLoading && !overview.data) {
    return <LoadingSpinner message="Loading dashboard..." />;
  }

  if (overview.isError) {
    return (
      <ErrorMessage
        message="Failed to load market overview"
        onRetry={() => overview.refetch()}
      />
    );
  }

  const hasPmData = !!pmOverview.data;
  const hasCapData = !!capacitySummary.data?.length;
  const hasInsights = !!insights.data?.length;

  return (
    <div className="dashboard-page">
      <div className="dashboard-page-header">
        <h2>Renewable Energy Dashboard</h2>
        <p className="dashboard-page-desc">
          Real-time market overview for India's renewable energy sector
        </p>
      </div>

      {/* KPI Carousel */}
      <KpiCarousel
        pmOverview={pmOverview.data}
        marketOverview={overview.data}
        avgTariff={avgTariff}
        pmLoading={pmOverview.isLoading}
        mktLoading={overview.isLoading}
      />

      {/* Regional Capacity Dashboard Carousel */}
      <RegionalCapacityCarousel capacitySummary={capacitySummary.data} />

      {/* Charts Row */}
      {(hasPmData || hasCapData) && (
        <div className="dashboard-charts-row">
          {hasPmData && <EnergyMixChart overview={pmOverview.data!} />}
          {hasCapData && <TopStatesChart summaryData={capacitySummary.data!} />}
        </div>
      )}

      {/* Financial Insights Chart + Table */}
      {hasInsights && (
        <>
          <FinancialInsightsChart insights={insights.data!} />

          <section className="financial-insights-panel">
            <div className="panel-header">
              <h3>Financial Insights Detail</h3>
              <span className="panel-count">{insights.data!.length} records</span>
            </div>
            {insights.isLoading ? (
              <div className="panel-loading">Loading...</div>
            ) : (
              <div className="pm-table-wrapper">
                <table className="pm-table">
                  <thead>
                    <tr>
                      <th>Category</th>
                      <th>Metric</th>
                      <th style={{ textAlign: "right" }}>Value</th>
                      <th>Period</th>
                      <th>Source</th>
                    </tr>
                  </thead>
                  <tbody>
                    {insights.data!.map((insight) => (
                      <tr key={insight.id}>
                        <td>
                          <span
                            className="pm-source-badge"
                            style={{ textTransform: "capitalize" }}
                          >
                            {insight.category}
                          </span>
                        </td>
                        <td>{insight.metric_name}</td>
                        <td className="pm-num">
                          {insight.value.toLocaleString("en-IN")} {insight.unit}
                        </td>
                        <td>{insight.period}</td>
                        <td style={{ fontSize: "0.75rem", color: "var(--color-gray-400)" }}>
                          {insight.source}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}

      {/* Market Overview Metrics (fallback cards when pm data not available) */}
      {overview.data && !hasPmData && (
        <section className="market-overview-panel">
          <h3>Market Overview</h3>
          <div className="metrics-grid">
            <div className="metric-card">
              <span className="metric-value">
                {overview.data.total_capacity_mw.toLocaleString()} MW
              </span>
              <span className="metric-label">Total Installed Capacity</span>
            </div>
            <div className="metric-card">
              <span className="metric-value">
                {overview.data.upcoming_projects_count}
              </span>
              <span className="metric-label">Upcoming Projects</span>
            </div>
            <div className="metric-card">
              <span className="metric-value">
                {overview.data.regional_distribution.length}
              </span>
              <span className="metric-label">Regions Covered</span>
            </div>
          </div>
        </section>
      )}

      {/* Empty state */}
      {!hasPmData && !hasInsights && !overview.isLoading && (
        <div className="dashboard-empty">
          <div className="dashboard-empty-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/>
            </svg>
          </div>
          <h3>No data available yet</h3>
          <p>
            Seed the database to populate charts and KPI metrics. Run the seed
            scripts from the backend to get started.
          </p>
        </div>
      )}
    </div>
  );
}

export default DashboardPage;
