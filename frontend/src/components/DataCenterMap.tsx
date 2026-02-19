import { useState, useMemo } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import { STATE_COORDINATES } from "../utils/stateCoordinates";
import { resolveCoordinates } from "../utils/cityCoordinates";

interface DataCenter {
  id: string;
  dateAdded: string;
  company: string;
  city: string;
  location: string;
  state: string;
  powerMW: number;
  sizeSqFt: number;
  status: string;
  latitude?: number | null;
  longitude?: number | null;
}

const STATUS_COLORS: Record<string, string> = {
  Operational: "#16a34a",
  "Under Construction": "#d97706",
  Planned: "#2563eb",
};

function getStatusColor(status: string): string {
  return STATUS_COLORS[status] ?? "#6b7280";
}

/**
 * Resolve a [lat, lng] pair for a datacenter.
 * Priority: explicit lat/lng from DB → city coordinates → state coordinates.
 */
function resolveMarkerCoords(dc: DataCenter): [number, number] | null {
  if (dc.latitude != null && dc.longitude != null) {
    return [dc.latitude, dc.longitude];
  }
  return resolveCoordinates(dc.city, dc.state, STATE_COORDINATES);
}

/**
 * Apply a small deterministic jitter so markers at the same city don't
 * perfectly overlap and become impossible to click individually.
 * The offset is based on the datacenter id to be stable across renders.
 */
function jitter(base: [number, number], dc: DataCenter, index: number): [number, number] {
  // Use last two hex chars of id as a seed for a tiny offset (max ±0.03°)
  const seed = parseInt(dc.id.replace(/-/g, "").slice(-4), 16);
  const latOff = ((seed % 200) - 100) / 5000;   // ±0.02°
  const lngOff = (((seed >> 8) % 200) - 100) / 5000;
  return [base[0] + latOff + index * 0.0, base[1] + lngOff];
}

interface StateInfo {
  dataCenters: DataCenter[];
  totalPower: number;
  statusBreakdown: Record<string, number>;
}

function DataCenterMap({ dataCenters }: { dataCenters: DataCenter[] }) {
  const [selectedState, setSelectedState] = useState<string | null>(null);

  // Build per-state summary for sidebar
  const stateData = useMemo(() => {
    const map = new Map<string, StateInfo>();
    dataCenters.forEach((dc) => {
      if (!map.has(dc.state)) {
        map.set(dc.state, { dataCenters: [], totalPower: 0, statusBreakdown: {} });
      }
      const info = map.get(dc.state)!;
      info.dataCenters.push(dc);
      info.totalPower += dc.powerMW;
      info.statusBreakdown[dc.status] = (info.statusBreakdown[dc.status] ?? 0) + 1;
    });
    return map;
  }, [dataCenters]);

  // Track per-city index so jitter works per city group
  const cityIndexMap = useMemo(() => {
    const counters: Record<string, number> = {};
    const result = new Map<string, number>();
    dataCenters.forEach((dc) => {
      const key = `${dc.city}::${dc.state}`;
      const idx = counters[key] ?? 0;
      result.set(dc.id, idx);
      counters[key] = idx + 1;
    });
    return result;
  }, [dataCenters]);

  const indiaCenter: [number, number] = [22.5, 82.0];

  const selectedInfo = selectedState ? stateData.get(selectedState) : null;

  // Markers to render: all DCs with resolved coordinates
  const markers = useMemo(() => {
    return dataCenters.flatMap((dc) => {
      const base = resolveMarkerCoords(dc);
      if (!base) return [];
      const idx = cityIndexMap.get(dc.id) ?? 0;
      const pos = jitter(base, dc, idx);
      return [{ dc, pos }];
    });
  }, [dataCenters, cityIndexMap]);

  return (
    <div className="dc-map-container">
      <div className="dc-map-wrapper">
        <MapContainer
          center={indiaCenter}
          zoom={5}
          className="dc-map"
          scrollWheelZoom={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {markers.map(({ dc, pos }) => {
            const color = getStatusColor(dc.status);
            const isFiltered = selectedState !== null && dc.state !== selectedState;
            return (
              <CircleMarker
                key={dc.id}
                center={pos}
                radius={6}
                pathOptions={{
                  fillColor: color,
                  fillOpacity: isFiltered ? 0.15 : 0.75,
                  color: color,
                  weight: isFiltered ? 0.5 : 1.5,
                  opacity: isFiltered ? 0.2 : 1,
                }}
              >
                <Popup>
                  <div className="dc-map-popup">
                    <h4 style={{ marginBottom: 4 }}>{dc.company}</h4>
                    <p style={{ marginBottom: 2 }}>
                      <strong>Location:</strong>{" "}
                      {dc.location && dc.location !== dc.city
                        ? `${dc.location}, ${dc.city}`
                        : dc.city}
                    </p>
                    <p style={{ marginBottom: 2 }}>
                      <strong>State:</strong> {dc.state}
                    </p>
                    {dc.powerMW > 0 && (
                      <p style={{ marginBottom: 2 }}>
                        <strong>Power:</strong> {dc.powerMW} MW
                      </p>
                    )}
                    {dc.sizeSqFt > 0 && (
                      <p style={{ marginBottom: 2 }}>
                        <strong>Size:</strong> {dc.sizeSqFt.toLocaleString()} sq ft
                      </p>
                    )}
                    <p style={{ marginBottom: 2 }}>
                      <strong>Status:</strong>{" "}
                      <span style={{ color: getStatusColor(dc.status) }}>
                        {dc.status}
                      </span>
                    </p>
                    {dc.dateAdded && (
                      <p style={{ marginBottom: 0, fontSize: "0.8em", color: "#6b7280" }}>
                        Added: {dc.dateAdded}
                      </p>
                    )}
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}
        </MapContainer>
      </div>

      {/* Sidebar */}
      <div className="dc-map-sidebar">
        <h3 className="dc-map-sidebar-title">
          {selectedState ? selectedState : "State Overview"}
        </h3>

        {!selectedState && (
          <div className="dc-map-sidebar-hint">
            <p>
              Each circle represents one data center, coloured by status. Click
              a circle to see details, or select a state below to highlight it.
            </p>
            <div className="dc-map-legend">
              <h4>Legend</h4>
              {Object.entries(STATUS_COLORS).map(([status, color]) => (
                <div key={status} className="dc-map-legend-item">
                  <span
                    className="dc-map-legend-dot"
                    style={{ backgroundColor: color }}
                  />
                  {status}
                </div>
              ))}
            </div>
            <div className="dc-map-state-list">
              <h4>States ({stateData.size})</h4>
              {Array.from(stateData.entries())
                .sort((a, b) => b[1].totalPower - a[1].totalPower)
                .map(([state, info]) => (
                  <button
                    key={state}
                    className="dc-map-state-btn"
                    onClick={() => setSelectedState(state)}
                  >
                    <span className="dc-map-state-name">{state}</span>
                    <span className="dc-map-state-stats">
                      {info.dataCenters.length} DC
                      {info.totalPower > 0
                        ? ` · ${info.totalPower.toLocaleString()} MW`
                        : ""}
                    </span>
                  </button>
                ))}
            </div>
          </div>
        )}

        {selectedInfo && (
          <div className="dc-map-detail">
            <div className="dc-map-detail-summary">
              <div className="dc-map-detail-stat">
                <span className="dc-map-detail-value">
                  {selectedInfo.dataCenters.length}
                </span>
                <span className="dc-map-detail-label">Data Centers</span>
              </div>
              <div className="dc-map-detail-stat">
                <span className="dc-map-detail-value">
                  {selectedInfo.totalPower.toLocaleString()}
                </span>
                <span className="dc-map-detail-label">MW Power</span>
              </div>
            </div>
            <div className="dc-map-detail-status-row">
              {Object.entries(selectedInfo.statusBreakdown).map(
                ([status, count]) => (
                  <span
                    key={status}
                    className="dc-map-detail-status-badge"
                    style={{ backgroundColor: getStatusColor(status) }}
                  >
                    {status}: {count}
                  </span>
                )
              )}
            </div>
            <div className="dc-map-detail-list">
              {selectedInfo.dataCenters.map((dc) => (
                <div key={dc.id} className="dc-map-dc-card">
                  <div className="dc-map-dc-card-header">
                    <strong>{dc.company}</strong>
                    <span
                      className="dc-map-dc-status"
                      style={{ color: getStatusColor(dc.status) }}
                    >
                      {dc.status}
                    </span>
                  </div>
                  <div className="dc-map-dc-card-body">
                    <p>
                      {dc.location && dc.location !== dc.city
                        ? `${dc.location}, `
                        : ""}
                      {dc.city}
                    </p>
                    {(dc.powerMW > 0 || dc.sizeSqFt > 0) && (
                      <p>
                        {dc.powerMW > 0 ? `${dc.powerMW} MW` : ""}
                        {dc.powerMW > 0 && dc.sizeSqFt > 0 ? " · " : ""}
                        {dc.sizeSqFt > 0
                          ? `${dc.sizeSqFt.toLocaleString()} sq ft`
                          : ""}
                      </p>
                    )}
                    {dc.dateAdded && (
                      <p className="dc-map-dc-date">Added: {dc.dateAdded}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <button
              className="india-dc-btn india-dc-btn--outline dc-map-back-btn"
              onClick={() => setSelectedState(null)}
            >
              Back to Overview
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default DataCenterMap;
