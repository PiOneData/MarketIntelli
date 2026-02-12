import { useState } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from "react-leaflet";
import type { LatLngExpression } from "leaflet";

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
}

interface StateInfo {
  center: LatLngExpression;
  dataCenters: DataCenter[];
  totalPower: number;
  totalSize: number;
  statusBreakdown: Record<string, number>;
}

const STATE_COORDINATES: Record<string, [number, number]> = {
  "Andhra Pradesh": [15.9129, 79.74],
  "Bihar": [25.0961, 85.3131],
  "Chhattisgarh": [21.2787, 81.8661],
  "Delhi": [28.7041, 77.1025],
  "Goa": [15.2993, 74.124],
  "Gujarat": [22.2587, 71.1924],
  "Haryana": [29.0588, 76.0856],
  "Jharkhand": [23.6102, 85.2799],
  "Karnataka": [15.3173, 75.7139],
  "Kerala": [10.8505, 76.2711],
  "Madhya Pradesh": [22.9734, 78.6569],
  "Maharashtra": [19.7515, 75.7139],
  "Odisha": [20.9517, 85.0985],
  "Punjab": [31.1471, 75.3412],
  "Rajasthan": [27.0238, 74.2179],
  "Tamil Nadu": [11.1271, 78.6569],
  "Telangana": [18.1124, 79.0193],
  "Uttar Pradesh": [26.8467, 80.9462],
  "West Bengal": [22.9868, 87.855],
};

const STATUS_COLORS: Record<string, string> = {
  Operational: "#16a34a",
  "Under Construction": "#d97706",
  Planned: "#2563eb",
};

function FitBounds({ stateData }: { stateData: Map<string, StateInfo> }) {
  const map = useMap();
  if (stateData.size > 0) {
    map.fitBounds(
      Array.from(stateData.values()).map((s) => s.center as [number, number]),
      { padding: [40, 40], maxZoom: 6 }
    );
  }
  return null;
}

function DataCenterMap({ dataCenters }: { dataCenters: DataCenter[] }) {
  const [selectedState, setSelectedState] = useState<string | null>(null);

  const stateData = new Map<string, StateInfo>();
  dataCenters.forEach((dc) => {
    const coords = STATE_COORDINATES[dc.state];
    if (!coords) return;
    if (!stateData.has(dc.state)) {
      stateData.set(dc.state, {
        center: coords,
        dataCenters: [],
        totalPower: 0,
        totalSize: 0,
        statusBreakdown: {},
      });
    }
    const info = stateData.get(dc.state)!;
    info.dataCenters.push(dc);
    info.totalPower += dc.powerMW;
    info.totalSize += dc.sizeSqFt;
    info.statusBreakdown[dc.status] = (info.statusBreakdown[dc.status] || 0) + 1;
  });

  const maxPower = Math.max(...Array.from(stateData.values()).map((s) => s.totalPower), 1);

  const indiaCenter: LatLngExpression = [22.5, 82.0];

  const selectedInfo = selectedState ? stateData.get(selectedState) : null;

  return (
    <div className="dc-map-container">
      <div className="dc-map-wrapper">
        <MapContainer center={indiaCenter} zoom={5} className="dc-map" scrollWheelZoom={true}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <FitBounds stateData={stateData} />
          {Array.from(stateData.entries()).map(([state, info]) => {
            const radius = Math.max(12, Math.min(40, (info.totalPower / maxPower) * 40));
            const isSelected = selectedState === state;
            return (
              <CircleMarker
                key={state}
                center={info.center}
                radius={radius}
                pathOptions={{
                  fillColor: isSelected ? "#dc2626" : "#0f766e",
                  fillOpacity: isSelected ? 0.8 : 0.6,
                  color: isSelected ? "#dc2626" : "#0d5f59",
                  weight: isSelected ? 3 : 2,
                }}
                eventHandlers={{
                  click: () => setSelectedState(isSelected ? null : state),
                }}
              >
                <Popup>
                  <div className="dc-map-popup">
                    <h4>{state}</h4>
                    <p><strong>{info.dataCenters.length}</strong> Data Center{info.dataCenters.length !== 1 ? "s" : ""}</p>
                    <p><strong>{info.totalPower.toLocaleString()} MW</strong> Total Power</p>
                    <p><strong>{info.totalSize.toLocaleString()} sq ft</strong> Total Size</p>
                    <div className="dc-map-popup-status">
                      {Object.entries(info.statusBreakdown).map(([status, count]) => (
                        <span key={status} style={{ color: STATUS_COLORS[status] || "#333" }}>
                          {status}: {count}
                        </span>
                      ))}
                    </div>
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}
        </MapContainer>
      </div>

      {/* State Detail Panel */}
      <div className="dc-map-sidebar">
        <h3 className="dc-map-sidebar-title">
          {selectedState ? selectedState : "State Overview"}
        </h3>
        {!selectedState && (
          <div className="dc-map-sidebar-hint">
            <p>Click a circle on the map to view state details.</p>
            <div className="dc-map-legend">
              <h4>Legend</h4>
              <p className="dc-map-legend-note">Circle size = total power capacity</p>
              {Object.entries(STATUS_COLORS).map(([status, color]) => (
                <div key={status} className="dc-map-legend-item">
                  <span className="dc-map-legend-dot" style={{ backgroundColor: color }} />
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
                      {info.dataCenters.length} DC &middot; {info.totalPower.toLocaleString()} MW
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
                <span className="dc-map-detail-value">{selectedInfo.dataCenters.length}</span>
                <span className="dc-map-detail-label">Data Centers</span>
              </div>
              <div className="dc-map-detail-stat">
                <span className="dc-map-detail-value">{selectedInfo.totalPower.toLocaleString()}</span>
                <span className="dc-map-detail-label">MW Power</span>
              </div>
              <div className="dc-map-detail-stat">
                <span className="dc-map-detail-value">{selectedInfo.totalSize.toLocaleString()}</span>
                <span className="dc-map-detail-label">Sq. Ft.</span>
              </div>
            </div>
            <div className="dc-map-detail-status-row">
              {Object.entries(selectedInfo.statusBreakdown).map(([status, count]) => (
                <span
                  key={status}
                  className="dc-map-detail-status-badge"
                  style={{
                    backgroundColor: STATUS_COLORS[status] || "#666",
                  }}
                >
                  {status}: {count}
                </span>
              ))}
            </div>
            <div className="dc-map-detail-list">
              {selectedInfo.dataCenters.map((dc) => (
                <div key={dc.id} className="dc-map-dc-card">
                  <div className="dc-map-dc-card-header">
                    <strong>{dc.company}</strong>
                    <span
                      className="dc-map-dc-status"
                      style={{ color: STATUS_COLORS[dc.status] || "#333" }}
                    >
                      {dc.status}
                    </span>
                  </div>
                  <div className="dc-map-dc-card-body">
                    <p>{dc.location}, {dc.city}</p>
                    <p>{dc.powerMW} MW &middot; {dc.sizeSqFt.toLocaleString()} sq ft</p>
                    <p className="dc-map-dc-date">Added: {dc.dateAdded}</p>
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
