import { useState } from "react";

type GeoLayer = "solar" | "disaster" | "land";

function GeoAnalyticsPage() {
  const [activeLayer, setActiveLayer] = useState<GeoLayer>("solar");

  return (
    <div className="geo-analytics-page">
      <h2>Geo AI &amp; Spatial Analytics</h2>

      {/* Layer Selector Tabs */}
      <div className="geo-layer-tabs">
        <button
          className={`geo-layer-tab ${activeLayer === "solar" ? "geo-layer-tab--active" : ""}`}
          onClick={() => setActiveLayer("solar")}
        >
          <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
            <path d="M12 7a5 5 0 100 10 5 5 0 000-10zm0-3a1 1 0 01-1-1V1a1 1 0 112 0v2a1 1 0 01-1 1zm0 18a1 1 0 01-1-1v-2a1 1 0 112 0v2a1 1 0 01-1 1zm9-9h-2a1 1 0 110-2h2a1 1 0 110 2zM4 13H2a1 1 0 110-2h2a1 1 0 110 2zm15.07-6.36a1 1 0 01-.71-.29l-1.41-1.42a1 1 0 111.41-1.41l1.42 1.41a1 1 0 01-.71 1.71zM6.34 19.66a1 1 0 01-.7-.29l-1.42-1.42a1 1 0 111.41-1.41l1.42 1.41a1 1 0 01-.71 1.71zM19.07 19.66a1 1 0 01-.71-1.71l1.42-1.41a1 1 0 111.41 1.41l-1.42 1.42a1 1 0 01-.7.29zM6.34 6.64a1 1 0 01-.7-.29L4.22 4.93a1 1 0 011.41-1.41l1.42 1.42a1 1 0 01-.71 1.7z" />
          </svg>
          Solar Potential
        </button>
        <a
          className="geo-layer-tab"
          href="https://dharanv2006.users.earthengine.app/view/wind-site-analyser"
          target="_blank"
          rel="noopener noreferrer"
          id="wind-site-analyser"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
          </svg>
          Wind Site Analyser
          <svg viewBox="0 0 20 20" fill="currentColor" width="12" height="12" style={{ marginLeft: "4px" }}>
            <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
            <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
          </svg>
        </a>
        <button
          className={`geo-layer-tab ${activeLayer === "disaster" ? "geo-layer-tab--active" : ""}`}
          onClick={() => setActiveLayer("disaster")}
        >
          <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
            <path d="M12 2L1 21h22L12 2zm0 4l7.53 13H4.47L12 6zm-1 5v4h2v-4h-2zm0 6v2h2v-2h-2z" />
          </svg>
          Disaster Risk
        </button>
        <button
          className={`geo-layer-tab ${activeLayer === "land" ? "geo-layer-tab--active" : ""}`}
          onClick={() => setActiveLayer("land")}
        >
          <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
            <path d="M14 6l-3.75 5 2.85 3.8-1.6 1.2C9.81 13.75 7 10 7 10l-6 8h22L14 6z" />
          </svg>
          Land Availability
        </button>
      </div>

      {/* Layer Content */}
      {activeLayer === "solar" && (
        <section id="solar-potential-mapping" className="geo-layer-placeholder">
          <h3>Solar Potential Mapping</h3>
          <p>High-resolution irradiance and land suitability analysis using satellite imagery.</p>
        </section>
      )}

      {activeLayer === "disaster" && (
        <section id="disaster-risk-overlay" className="geo-layer-placeholder">
          <h3>Disaster Risk Overlay</h3>
          <p>Integration of flood, cyclone, and heatwave risk zones for project resilience planning.</p>
        </section>
      )}

      {activeLayer === "land" && (
        <section id="land-availability" className="geo-layer-placeholder">
          <h3>Land Availability</h3>
          <p>Analyze available land parcels for renewable energy project development with satellite-based classification.</p>
        </section>
      )}
    </div>
  );
}

export default GeoAnalyticsPage;
