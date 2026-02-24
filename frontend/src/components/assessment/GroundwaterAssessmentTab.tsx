/**
 * GroundwaterAssessmentTab.tsx
 *
 * Adapts the SolarWindAssessment application (https://github.com/Ramsdale00/SolarWindAssessment)
 * into the MarketIntelli Geo Analytics section.
 *
 * Changes from the original SolarWindAssessment app:
 *   - Replaced the standalone React app scaffold (index.html / index.tsx entry) with a
 *     component that plugs directly into the existing MarketIntelli routing.
 *   - Removed the Google Earth Engine JavaScript client-side SDK dependency; Google Cloud
 *     credentials are fetched from the MarketIntelli backend (see /api/v1/geo-analytics/google-credentials).
 *   - groundwater.geojson is no longer bundled as a static file; it is served by the backend
 *     at /api/v1/geo-analytics/groundwater (stored in the groundwater_resources table).
 *   - The map library has been kept as Leaflet (react-leaflet) – already present in this project.
 *   - Styling follows MarketIntelli's CSS custom-property design tokens.
 */

import { useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, GeoJSON, useMap } from "react-leaflet";
import L from "leaflet";
import type { Layer, LeafletMouseEvent, PathOptions } from "leaflet";
import type { Feature, FeatureCollection, Geometry } from "geojson";
import { getGroundwaterResources } from "../../api/geoAnalytics";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface GWProperties {
  id: string;
  gml_id: string;
  objectid: number | null;
  block: string;
  tehsil: string;
  district: string;
  gwr_2011_2: number | null;
  code: number | null;
  classification: string;
  net_annual_gw_availability: number | null;
  annual_gw_draft_irrigation: number | null;
  stage_of_gw_development: number | null;
  annual_gw_draft_domestic_industrial: number | null;
  annual_gw_draft_total: number | null;
  annual_replenishable_gw_total: number | null;
  state_name: string;
  natural_discharge_non_monsoon: number | null;
  st_area_shape: number | null;
  st_length_shape: number | null;
}

// ---------------------------------------------------------------------------
// Colour scale – matches the CGWB classification palette used in the
// original SolarWindAssessment app.
// ---------------------------------------------------------------------------

const CLASSIFICATION_COLORS: Record<string, string> = {
  "Over Exploited": "#dc2626",  // red
  "Critical":       "#f97316",  // orange
  "Semi-Critical":  "#eab308",  // yellow
  "Safe":           "#16a34a",  // green
  "Saline":         "#7c3aed",  // purple
};

const DEFAULT_COLOR = "#94a3b8"; // gray for unknown

function classificationColor(cls: string): string {
  for (const [key, color] of Object.entries(CLASSIFICATION_COLORS)) {
    if (cls?.toLowerCase().includes(key.toLowerCase())) return color;
  }
  return DEFAULT_COLOR;
}

function gwStyle(feature?: Feature<Geometry, GWProperties>): PathOptions {
  const cls = feature?.properties?.classification ?? "";
  return {
    fillColor: classificationColor(cls),
    fillOpacity: 0.55,
    color: "#1e293b",
    weight: 0.8,
    opacity: 0.7,
  };
}

// ---------------------------------------------------------------------------
// Map fit-bounds helper
// ---------------------------------------------------------------------------

function FitBounds({ geojson }: { geojson: FeatureCollection | null }) {
  const map = useMap();
  useEffect(() => {
    if (!geojson || geojson.features.length === 0) return;
    try {
      const layer = L.geoJSON(geojson);
      const bounds = layer.getBounds();
      if (bounds.isValid()) map.fitBounds(bounds, { padding: [20, 20] });
    } catch {
      // silently ignore if bounds computation fails (e.g. empty geometry)
    }
  }, [geojson, map]);
  return null;
}

// ---------------------------------------------------------------------------
// Filter bar
// ---------------------------------------------------------------------------

const CLASSIFICATIONS = [
  "All",
  "Over Exploited",
  "Critical",
  "Semi-Critical",
  "Safe",
  "Saline",
];

function FilterBar({
  stateFilter,
  classFilter,
  districtFilter,
  onStateChange,
  onClassChange,
  onDistrictChange,
  onApply,
  loading,
}: {
  stateFilter: string;
  classFilter: string;
  districtFilter: string;
  onStateChange: (v: string) => void;
  onClassChange: (v: string) => void;
  onDistrictChange: (v: string) => void;
  onApply: () => void;
  loading: boolean;
}) {
  return (
    <div className="gw-filter-bar">
      <input
        className="gw-filter-input"
        placeholder="State name…"
        value={stateFilter}
        onChange={(e) => onStateChange(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && onApply()}
      />
      <select
        className="gw-filter-select"
        value={classFilter}
        onChange={(e) => onClassChange(e.target.value)}
      >
        {CLASSIFICATIONS.map((c) => (
          <option key={c} value={c === "All" ? "" : c}>
            {c}
          </option>
        ))}
      </select>
      <input
        className="gw-filter-input"
        placeholder="District…"
        value={districtFilter}
        onChange={(e) => onDistrictChange(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && onApply()}
      />
      <button className="gw-filter-btn" onClick={onApply} disabled={loading}>
        {loading ? "Loading…" : "Apply"}
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Feature info panel (right side)
// ---------------------------------------------------------------------------

function fmt(v: number | null | undefined, unit = "", decimals = 2): string {
  if (v == null) return "—";
  return `${v.toFixed(decimals)}${unit ? " " + unit : ""}`;
}

function InfoPanel({ feature }: { feature: Feature<Geometry, GWProperties> | null }) {
  if (!feature) {
    return (
      <div className="gw-info-panel gw-info-panel--empty">
        <div className="gw-info-placeholder">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/>
            <circle cx="12" cy="10" r="3"/>
          </svg>
          <p>Click a zone on the map to view groundwater assessment details</p>
        </div>
      </div>
    );
  }

  const p = feature.properties;
  const clsColor = classificationColor(p.classification);

  return (
    <div className="gw-info-panel">
      <div className="gw-info-header">
        <span
          className="gw-info-badge"
          style={{ background: clsColor, color: "#fff" }}
        >
          {p.classification || "Unknown"}
        </span>
        <h3 className="gw-info-title">{p.block || "—"}</h3>
        <p className="gw-info-subtitle">
          {[p.district, p.tehsil, p.state_name].filter(Boolean).join(", ")}
        </p>
      </div>

      <div className="gw-info-section">
        <h4>Development Stage</h4>
        <div className="gw-stage-bar">
          <div
            className="gw-stage-fill"
            style={{
              width: `${Math.min(p.stage_of_gw_development ?? 0, 200)}%`,
              background: clsColor,
            }}
          />
        </div>
        <p className="gw-stage-label">
          {fmt(p.stage_of_gw_development, "%")} of safe yield
        </p>
      </div>

      <div className="gw-info-section">
        <h4>Annual Groundwater Balance (MCM)</h4>
        <div className="gw-kv-grid">
          <span>Net Availability</span>
          <strong>{fmt(p.net_annual_gw_availability)}</strong>
          <span>Draft – Irrigation</span>
          <strong>{fmt(p.annual_gw_draft_irrigation)}</strong>
          <span>Draft – Domestic &amp; Industrial</span>
          <strong>{fmt(p.annual_gw_draft_domestic_industrial)}</strong>
          <span>Total Draft</span>
          <strong>{fmt(p.annual_gw_draft_total)}</strong>
          <span>Replenishable Total</span>
          <strong>{fmt(p.annual_replenishable_gw_total)}</strong>
          <span>Non-Monsoon Discharge</span>
          <strong>{fmt(p.natural_discharge_non_monsoon)}</strong>
        </div>
      </div>

      {p.gwr_2011_2 != null && (
        <div className="gw-info-section">
          <h4>Historical</h4>
          <div className="gw-kv-grid">
            <span>GWR 2011 Stage</span>
            <strong>{fmt(p.gwr_2011_2, "%")}</strong>
          </div>
        </div>
      )}

      <div className="gw-info-section">
        <h4>Identifiers</h4>
        <div className="gw-kv-grid gw-kv-grid--xs">
          <span>GML ID</span>
          <strong>{p.gml_id || "—"}</strong>
          <span>Object ID</span>
          <strong>{p.objectid ?? "—"}</strong>
          <span>CODE</span>
          <strong>{fmt(p.code, "", 0)}</strong>
          <span>Area (m²)</span>
          <strong>{p.st_area_shape != null ? p.st_area_shape.toLocaleString("en-IN", { maximumFractionDigits: 0 }) : "—"}</strong>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Legend
// ---------------------------------------------------------------------------

function Legend() {
  return (
    <div className="gw-legend">
      <h4 className="gw-legend-title">Classification</h4>
      {Object.entries(CLASSIFICATION_COLORS).map(([label, color]) => (
        <div key={label} className="gw-legend-item">
          <span className="gw-legend-swatch" style={{ background: color }} />
          <span>{label}</span>
        </div>
      ))}
      <div className="gw-legend-item">
        <span className="gw-legend-swatch" style={{ background: DEFAULT_COLOR }} />
        <span>Unknown</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Stats summary bar
// ---------------------------------------------------------------------------

function StatsSummary({ features }: { features: Feature<Geometry, GWProperties>[] }) {
  const counts: Record<string, number> = {};
  for (const f of features) {
    const cls = f.properties?.classification ?? "Unknown";
    counts[cls] = (counts[cls] ?? 0) + 1;
  }

  return (
    <div className="gw-stats-bar">
      {Object.entries(CLASSIFICATION_COLORS).map(([label, color]) =>
        counts[label] ? (
          <div key={label} className="gw-stats-chip" style={{ borderColor: color }}>
            <span className="gw-stats-dot" style={{ background: color }} />
            <span className="gw-stats-label">{label}</span>
            <strong className="gw-stats-count">{counts[label]}</strong>
          </div>
        ) : null
      )}
      <div className="gw-stats-chip gw-stats-chip--total">
        <strong>{features.length}</strong>
        <span>total zones</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function GroundwaterAssessmentTab() {
  const [geojson, setGeojson] = useState<FeatureCollection<Geometry, GWProperties> | null>(null);
  const [selectedFeature, setSelectedFeature] = useState<Feature<Geometry, GWProperties> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [stateFilter, setStateFilter] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const [districtFilter, setDistrictFilter] = useState("");

  const geojsonLayerRef = useRef<ReturnType<typeof GeoJSON> | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const fc = await getGroundwaterResources({
        state: stateFilter || undefined,
        classification: classFilter || undefined,
        district: districtFilter || undefined,
      });
      // Cast: the API already returns FeatureCollection shape
      setGeojson(fc as FeatureCollection<Geometry, GWProperties>);
      setSelectedFeature(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load groundwater data.");
    } finally {
      setLoading(false);
    }
  };

  // Load all zones on mount
  useEffect(() => {
    fetchData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const onEachFeature = (
    feature: Feature<Geometry, GWProperties>,
    layer: Layer
  ) => {
    layer.on({
      click: () => setSelectedFeature(feature),
      mouseover: (e: LeafletMouseEvent) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (e.target as any).setStyle({ weight: 2, fillOpacity: 0.75 });
      },
      mouseout: (e: LeafletMouseEvent) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (e.target as any).setStyle(gwStyle(feature));
      },
    });
  };

  const features = (geojson?.features ?? []) as Feature<Geometry, GWProperties>[];

  return (
    <div className="gw-assessment-root">
      {/* Header */}
      <div className="gw-header">
        <div>
          <h2 className="gw-header-title">Groundwater Assessment</h2>
          <p className="gw-header-subtitle">
            Central Ground Water Board (CGWB) block-level exploitation data — powered by SolarWindAssessment
          </p>
        </div>
        {!loading && geojson && <StatsSummary features={features} />}
      </div>

      {/* Filters */}
      <FilterBar
        stateFilter={stateFilter}
        classFilter={classFilter}
        districtFilter={districtFilter}
        onStateChange={setStateFilter}
        onClassChange={setClassFilter}
        onDistrictChange={setDistrictFilter}
        onApply={fetchData}
        loading={loading}
      />

      {/* Error */}
      {error && (
        <div className="gw-error">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          {error}
        </div>
      )}

      {/* Loading state (first load with no data yet) */}
      {loading && !geojson && (
        <div className="gw-loading">
          <div className="gw-loading-spinner" />
          <p>Loading groundwater zones…</p>
        </div>
      )}

      {/* Map + Info panel */}
      {(!loading || geojson) && !error && (
        <div className="gw-map-layout">
          {/* Map */}
          <div className="gw-map-wrap">
            <MapContainer
              center={[20.5937, 78.9629]}
              zoom={5}
              className="gw-leaflet-map"
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {geojson && geojson.features.length > 0 && (
                <>
                  <GeoJSON
                    key={JSON.stringify({ stateFilter, classFilter, districtFilter })}
                    data={geojson}
                    style={gwStyle}
                    onEachFeature={onEachFeature}
                    ref={geojsonLayerRef as React.Ref<never>}
                  />
                  <FitBounds geojson={geojson} />
                </>
              )}
              <Legend />
            </MapContainer>

            {/* Overlay spinner when re-fetching */}
            {loading && geojson && (
              <div className="gw-map-loading-overlay">
                <div className="gw-loading-spinner" />
              </div>
            )}
          </div>

          {/* Info panel */}
          <InfoPanel feature={selectedFeature} />
        </div>
      )}

      {/* Empty state after filter */}
      {!loading && geojson && geojson.features.length === 0 && (
        <div className="gw-empty">
          <p>No groundwater zones match the current filters.</p>
          <button
            className="gw-filter-btn"
            onClick={() => {
              setStateFilter("");
              setClassFilter("");
              setDistrictFilter("");
              fetchData();
            }}
          >
            Clear filters
          </button>
        </div>
      )}
    </div>
  );
}
