import { useParams } from "react-router-dom";
import { useAlerts } from "../hooks/useAlerts";
import LoadingSpinner from "../components/common/LoadingSpinner";
import ErrorMessage from "../components/common/ErrorMessage";

function AlertsPage() {
  const { section } = useParams<{ section: string }>();
  const activeSection = section || "active-alerts";
  const { data: alerts, isLoading, isError, refetch } = useAlerts();

  if (isLoading) return <LoadingSpinner message="Loading alerts..." />;
  if (isError)
    return (
      <ErrorMessage
        message="Failed to load alerts"
        onRetry={() => refetch()}
      />
    );

  return (
    <div className="alerts-page">
      <h2>Alert &amp; Notification Engine</h2>

      {activeSection === "active-alerts" && (
        <section id="active-alerts">
          <h3>Active Alerts ({alerts?.length ?? 0})</h3>
          <p>Real-time notifications on policy changes, project delays, or environmental risks.</p>
        </section>
      )}

      {activeSection === "custom-watchlists" && (
        <section id="custom-watchlists">
          <h3>Custom Watchlists</h3>
          <p>User-defined tracking of developers, states, or project categories.</p>
        </section>
      )}

      {activeSection === "disaster-response-integration" && (
        <section id="disaster-response-integration">
          <h3>Disaster Response Integration</h3>
          <p>Early warnings for extreme weather events affecting solar assets.</p>
        </section>
      )}
    </div>
  );
}

export default AlertsPage;
