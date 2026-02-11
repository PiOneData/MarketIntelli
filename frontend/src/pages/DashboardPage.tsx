import { useMarketOverview, useFinancialInsights } from "../hooks/useDashboard";
import MarketOverviewPanel from "../features/dashboard/MarketOverviewPanel";
import FinancialInsightsPanel from "../features/dashboard/FinancialInsightsPanel";
import LoadingSpinner from "../components/common/LoadingSpinner";
import ErrorMessage from "../components/common/ErrorMessage";

function DashboardPage() {
  const overview = useMarketOverview();
  const insights = useFinancialInsights();

  if (overview.isLoading || insights.isLoading) {
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

  return (
    <div className="dashboard-page">
      <h2>Solar Intelligence Dashboard</h2>
      {overview.data && <MarketOverviewPanel data={overview.data} />}
      {insights.data && <FinancialInsightsPanel data={insights.data} />}
    </div>
  );
}

export default DashboardPage;
