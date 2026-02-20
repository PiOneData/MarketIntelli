import { Routes, Route, Navigate } from "react-router-dom";
import MainLayout from "./components/layout/MainLayout";
import DashboardPage from "./pages/DashboardPage";
import GeoAnalyticsPage from "./pages/GeoAnalyticsPage";
import ProjectsPage from "./pages/ProjectsPage";
import PolicyPage from "./pages/PolicyPage";
import AlertsPage from "./pages/AlertsPage";
import IndiaDataCenterAlertPage from "./pages/IndiaDataCenterAlertPage";
import PowerDataPage from "./pages/PowerDataPage";
import FinancePage from "./pages/FinancePage";
import ProfilePage from "./pages/ProfilePage";

function App() {
  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route path="/" element={<DashboardPage />} />

        {/* Geo Analytics */}
        <Route path="/geo-analytics" element={<Navigate to="/geo-analytics/solar-potential-mapping" replace />} />
        <Route path="/geo-analytics/:section" element={<GeoAnalyticsPage />} />

        {/* Projects */}
        <Route path="/projects" element={<Navigate to="/projects/india-data-center-registry" replace />} />
        <Route path="/projects/india-data-center-alerts" element={<IndiaDataCenterAlertPage />} />
        <Route path="/projects/india-data-center-registry" element={<IndiaDataCenterAlertPage />} />
        <Route path="/projects/:section" element={<ProjectsPage />} />

        {/* Power Data */}
        <Route path="/power-data" element={<Navigate to="/power-data/overview" replace />} />
        <Route path="/power-data/:section" element={<PowerDataPage />} />

        {/* Finance */}
        <Route path="/finance" element={<Navigate to="/finance/finance-intelligence" replace />} />
        <Route path="/finance/:section" element={<FinancePage />} />

        {/* Policy */}
        <Route path="/policy" element={<Navigate to="/policy/policy-repository" replace />} />
        <Route path="/policy/:section" element={<PolicyPage />} />

        {/* Alerts */}
        <Route path="/alerts" element={<Navigate to="/alerts/news-feed" replace />} />
        <Route path="/alerts/:section" element={<AlertsPage />} />

        {/* Profile */}
        <Route path="/profile" element={<ProfilePage />} />
      </Route>
    </Routes>
  );
}

export default App;
