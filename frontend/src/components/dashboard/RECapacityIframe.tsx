import { useState, useRef } from "react";
import { STATE_COORDINATES } from "../../utils/stateCoordinates";

const NITI_URL = "https://iced.niti.gov.in/analytics/re-installed-vs-potential-capacity";

const INDIA_STATES = Object.keys(STATE_COORDINATES)
  .filter((s) => s !== "Others")
  .sort();

const ENERGY_TYPES = [
  { value: "", label: "All Energy Types" },
  { value: "solar", label: "Solar" },
  { value: "wind", label: "Wind" },
  { value: "hydro", label: "Small Hydro" },
  { value: "biomass", label: "Biomass / Bagasse" },
  { value: "other", label: "Other RE" },
];

export default function RECapacityIframe() {
  const [stateFilter, setStateFilter] = useState("");
  const [energyType, setEnergyType] = useState("");
  const [iframeError, setIframeError] = useState(false);
  const [copied, setCopied] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const handleCopyState = () => {
    if (stateFilter) {
      navigator.clipboard.writeText(stateFilter).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  };

  const handleIframeLoad = () => {
    // Attempt to detect if iframe was blocked — browsers don't expose this
    // directly, so we show the fallback only on explicit error
    setIframeError(false);
  };

  const handleIframeError = () => {
    setIframeError(true);
  };

  return (
    <section className="re-capacity-section">
      {/* Section header */}
      <div className="re-capacity-header">
        <div className="re-capacity-header-left">
          <h3>Installed vs Potential Capacity — State & Country View</h3>
          <p className="re-capacity-desc">
            Country-wide and state-level comparison of installed renewable energy capacity against
            assessed potential. Data sourced from NITI Aayog ICED Analytics.
          </p>
        </div>
        <a
          href={NITI_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="re-capacity-open-btn"
        >
          <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14">
            <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
            <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
          </svg>
          Open in NITI ICED
        </a>
      </div>

      {/* Filters */}
      <div className="re-capacity-filters">
        <div className="re-capacity-filter-group">
          <label htmlFor="re-state-filter">Filter by State / UT</label>
          <div className="re-capacity-filter-row">
            <select
              id="re-state-filter"
              value={stateFilter}
              onChange={(e) => setStateFilter(e.target.value)}
              className="re-capacity-select"
            >
              <option value="">All India</option>
              {INDIA_STATES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            {stateFilter && (
              <button
                className={`re-capacity-copy-btn ${copied ? "re-capacity-copy-btn--copied" : ""}`}
                onClick={handleCopyState}
                title="Copy state name to search within the dashboard"
              >
                {copied ? "Copied!" : "Copy to search"}
              </button>
            )}
          </div>
        </div>
        <div className="re-capacity-filter-group">
          <label htmlFor="re-energy-filter">Energy Type</label>
          <select
            id="re-energy-filter"
            value={energyType}
            onChange={(e) => setEnergyType(e.target.value)}
            className="re-capacity-select"
          >
            {ENERGY_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <div className="re-capacity-filter-note">
          <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          Select a state and use "Copy to search" to filter within the embedded dashboard. Filters
          apply interactively inside the NITI ICED panel below.
        </div>
      </div>

      {/* Iframe or fallback */}
      {iframeError ? (
        <div className="re-capacity-fallback">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="40" height="40">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
          <p>The NITI ICED dashboard could not be embedded due to browser security restrictions.</p>
          <a
            href={NITI_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="re-capacity-fallback-link"
          >
            Open NITI ICED Dashboard &rarr;
          </a>
        </div>
      ) : (
        <div className="re-capacity-iframe-wrapper">
          <iframe
            ref={iframeRef}
            src={NITI_URL}
            title="RE Installed vs Potential Capacity — NITI Aayog ICED"
            className="re-capacity-iframe"
            onLoad={handleIframeLoad}
            onError={handleIframeError}
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
            loading="lazy"
          />
          <div className="re-capacity-iframe-overlay-hint">
            <span>
              Embedded from{" "}
              <a href={NITI_URL} target="_blank" rel="noopener noreferrer">
                iced.niti.gov.in
              </a>
            </span>
          </div>
        </div>
      )}
    </section>
  );
}
