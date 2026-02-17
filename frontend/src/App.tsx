import { Routes, Route, Navigate } from "react-router-dom";
import MainLayout from "./components/layout/MainLayout";
import DashboardPage from "./pages/DashboardPage";
import GeoAnalyticsPage from "./pages/GeoAnalyticsPage";
import ProjectsPage from "./pages/ProjectsPage";
import PolicyPage from "./pages/PolicyPage";
import AlertsPage from "./pages/AlertsPage";
import IndiaDataCenterAlertPage from "./pages/IndiaDataCenterAlertPage";
import PowerDataPage from "./pages/PowerDataPage";

function App() {
  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route path="/" element={<DashboardPage />} />

        {/* Geo Analytics */}
        <Route path="/geo-analytics" element={<Navigate to="/geo-analytics/solar-potential-mapping" replace />} />
        <Route path="/geo-analytics/:section" element={<GeoAnalyticsPage />} />

        {/* Projects */}
        <Route path="/projects" element={<Navigate to="/projects/project-directory" replace />} />
        <Route path="/projects/india-data-center-alerts" element={<IndiaDataCenterAlertPage />} />
        <Route path="/projects/india-data-center-registry" element={<IndiaDataCenterAlertPage />} />
        <Route path="/projects/:section" element={<ProjectsPage />} />

        {/* Power Data */}
        <Route path="/power-data" element={<Navigate to="/power-data/overview" replace />} />
        <Route path="/power-data/:section" element={<PowerDataPage />} />

        {/* Policy */}
        <Route path="/policy" element={<Navigate to="/policy/policy-repository" replace />} />
        <Route path="/policy/:section" element={<PolicyPage />} />

        {/* Alerts */}
        <Route path="/alerts" element={<Navigate to="/alerts/active-alerts" replace />} />
        <Route path="/alerts/:section" element={<AlertsPage />} />
      </Route>
    </Routes>
  );
}

export default App;
