import { useState } from "react";
import SubstationView from "../components/SubstationView";

type GeoLayer = "solar" | "substations" | "disaster";

function GeoAnalyticsPage() {
  const [activeLayer, setActiveLayer] = useState<GeoLayer>("substations");

  return (
    <div className="geo-analytics-page">
      <h2>Geo AI &amp; Spatial Analytics</h2>

      {/* Layer Selector Tabs */}
      <div className="geo-layer-tabs" id="substations">
        <button
          className={`geo-layer-tab ${activeLayer === "solar" ? "geo-layer-tab--active" : ""}`}
          onClick={() => setActiveLayer("solar")}
        >
          <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
            <path d="M12 7a5 5 0 100 10 5 5 0 000-10zm0-3a1 1 0 01-1-1V1a1 1 0 112 0v2a1 1 0 01-1 1zm0 18a1 1 0 01-1-1v-2a1 1 0 112 0v2a1 1 0 01-1 1zm9-9h-2a1 1 0 110-2h2a1 1 0 110 2zM4 13H2a1 1 0 110-2h2a1 1 0 110 2zm15.07-6.36a1 1 0 01-.71-.29l-1.41-1.42a1 1 0 111.41-1.41l1.42 1.41a1 1 0 01-.71 1.71zM6.34 19.66a1 1 0 01-.7-.29l-1.42-1.42a1 1 0 111.41-1.41l1.42 1.41a1 1 0 01-.71 1.71zM19.07 19.66a1 1 0 01-.71-1.71l1.42-1.41a1 1 0 111.41 1.41l-1.42 1.42a1 1 0 01-.7.29zM6.34 6.64a1 1 0 01-.7-.29L4.22 4.93a1 1 0 011.41-1.41l1.42 1.42a1 1 0 01-.71 1.7z" />
          </svg>
          Solar Potential
        </button>
        <button
          className={`geo-layer-tab ${activeLayer === "substations" ? "geo-layer-tab--active" : ""}`}
          onClick={() => setActiveLayer("substations")}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
          </svg>
          Substations
        </button>
        <button
          className={`geo-layer-tab ${activeLayer === "disaster" ? "geo-layer-tab--active" : ""}`}
          onClick={() => setActiveLayer("disaster")}
        >
          <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
            <path d="M12 2L1 21h22L12 2zm0 4l7.53 13H4.47L12 6zm-1 5v4h2v-4h-2zm0 6v2h2v-2h-2z" />
          </svg>
          Disaster Risk
        </button>
      </div>

      {/* Layer Content */}
      {activeLayer === "solar" && (
        <section id="solar-potential-mapping" className="geo-layer-placeholder">
          <h3>Solar Potential Mapping</h3>
          <p>High-resolution irradiance and land suitability analysis using satellite imagery.</p>
        </section>
      )}

      {activeLayer === "substations" && <SubstationView />}

      {activeLayer === "disaster" && (
        <section id="disaster-risk-overlay" className="geo-layer-placeholder">
          <h3>Disaster Risk Overlay</h3>
          <p>Integration of flood, cyclone, and heatwave risk zones for project resilience planning.</p>
        </section>
      )}
    </div>
  );
}

export default GeoAnalyticsPage;
