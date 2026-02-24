import { useParams } from "react-router-dom";
import SolarAnalysisWizard from "../components/solar/SolarAnalysisWizard";
import SolarWindAssessmentPage from "../components/solar-wind-assessment/SolarWindAssessmentPage";

function GeoAnalyticsPage() {
  const { section } = useParams<{ section: string }>();
  const activeSection = section || "solar-potential-mapping";

  return (
    <div className="geo-analytics-page">
      {activeSection !== "solar-analysis" && activeSection !== "assessment" && (
        <h2>Geo AI &amp; Spatial Analytics</h2>
      )}

      {activeSection === "solar-potential-mapping" && (
        <section id="solar-potential-mapping" className="geo-layer-placeholder">
          <h3>Solar Potential Mapping</h3>
          <p>High-resolution irradiance and land suitability analysis using satellite imagery.</p>
        </section>
      )}

      {activeSection === "disaster-risk-overlay" && (
        <section id="disaster-risk-overlay" className="geo-layer-placeholder">
          <h3>Disaster Risk Overlay</h3>
          <p>Integration of flood, cyclone, and heatwave risk zones for project resilience planning.</p>
        </section>
      )}

      {activeSection === "land-availability" && (
        <section id="land-availability" className="geo-layer-placeholder">
          <h3>Land Availability</h3>
          <p>Analyze available land parcels for renewable energy project development with satellite-based classification.</p>
        </section>
      )}

      {activeSection === "solar-analysis" && (
        <SolarAnalysisWizard />
      )}

      {activeSection === "tn-land-record" && (
        <section id="tn-land-record" className="geo-iframe-section">
          <div className="geo-iframe-header">
            <div>
              <h3 className="geo-iframe-title">TN Land Record</h3>
              <p className="geo-iframe-subtitle">Tamil Nadu GIS Viewer — spatial land record data via TNGIS</p>
            </div>
            <a
              href="https://tngis.tn.gov.in/apps/gi_viewer/"
              target="_blank"
              rel="noopener noreferrer"
              className="geo-iframe-open-btn"
            >
              <svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor">
                <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
                <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
              </svg>
              Open in new tab
            </a>
          </div>
          <div className="geo-iframe-wrap">
            <iframe
              src="https://tngis.tn.gov.in/apps/gi_viewer/"
              title="TN GIS Land Record Viewer"
              className="geo-iframe"
              allowFullScreen
            />
          </div>
        </section>
      )}

      {activeSection === "assessment" && (
        <SolarWindAssessmentPage />
      )}
    </div>
  );
}

export default GeoAnalyticsPage;
