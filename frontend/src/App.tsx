import { Routes, Route } from "react-router-dom";
import MainLayout from "./components/layout/MainLayout";
import DashboardPage from "./pages/DashboardPage";
import GeoAnalyticsPage from "./pages/GeoAnalyticsPage";
import ProjectsPage from "./pages/ProjectsPage";
import PolicyPage from "./pages/PolicyPage";
import AlertsPage from "./pages/AlertsPage";

function App() {
  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/geo-analytics" element={<GeoAnalyticsPage />} />
        <Route path="/projects" element={<ProjectsPage />} />
        <Route path="/policy" element={<PolicyPage />} />
        <Route path="/alerts" element={<AlertsPage />} />
      </Route>
    </Routes>
  );
}

export default App;
