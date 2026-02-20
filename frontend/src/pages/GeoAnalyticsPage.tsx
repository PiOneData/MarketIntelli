import { useParams } from "react-router-dom";
import SolarAnalysisWizard from "../components/solar/SolarAnalysisWizard";

function GeoAnalyticsPage() {
  const { section } = useParams<{ section: string }>();
  const activeSection = section || "solar-potential-mapping";

  return (
    <div className="geo-analytics-page">
      {activeSection !== "solar-analysis" && (
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
    </div>
  );
}

export default GeoAnalyticsPage;
