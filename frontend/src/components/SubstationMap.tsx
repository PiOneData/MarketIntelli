import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from "react-leaflet";
import type { LatLngExpression } from "leaflet";
import "leaflet/dist/leaflet.css";
import { STATE_COORDINATES } from "../utils/stateCoordinates";

interface StateStats {
  state: string;
  count: number;
  totalCapacityMW: number;
  agencies: string[];
  sectors: {
    Central: number;
    State: number;
    Private: number;
  };
}

interface SubstationMapProps {
  stateStats: StateStats[];
  selectedState: string | null;
  onSelectState: (state: string | null) => void;
}

function FitBounds({ coords }: { coords: [number, number][] }) {
  const map = useMap();
  if (coords.length > 0) {
    map.fitBounds(coords, { padding: [40, 40], maxZoom: 6 });
  }
  return null;
}

function SubstationMap({ stateStats, selectedState, onSelectState }: SubstationMapProps) {
  const mappableStats = stateStats.filter((s) => s.state in STATE_COORDINATES);

  const maxCount = Math.max(...mappableStats.map((s) => s.count), 1);

  const indiaCenter: LatLngExpression = [22.5, 82.0];

  const allCoords = mappableStats.map((s) => STATE_COORDINATES[s.state]);

  return (
    <div className="sub-map-wrapper">
      <MapContainer
        center={indiaCenter}
        zoom={5}
        className="sub-map"
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds coords={allCoords} />
        {mappableStats.map((stat) => {
          const coords = STATE_COORDINATES[stat.state];
          const radius = Math.max(10, Math.min(45, (stat.count / maxCount) * 45));
          const isSelected = selectedState === stat.state;

          return (
            <CircleMarker
              key={stat.state}
              center={coords}
              radius={radius}
              pathOptions={{
                fillColor: isSelected ? "#dc2626" : "#0f766e",
                fillOpacity: isSelected ? 0.8 : 0.55,
                color: isSelected ? "#dc2626" : "#0d5f59",
                weight: isSelected ? 3 : 2,
              }}
              eventHandlers={{
                click: () =>
                  onSelectState(isSelected ? null : stat.state),
              }}
            >
              <Popup>
                <div className="sub-map-popup">
                  <h4>{stat.state}</h4>
                  <p>
                    <strong>{stat.count}</strong> Substation
                    {stat.count !== 1 ? "s" : ""}
                  </p>
                  <p>
                    <strong>
                      {stat.totalCapacityMW >= 1000
                        ? `${(stat.totalCapacityMW / 1000).toFixed(1)} GW`
                        : `${stat.totalCapacityMW} MW`}
                    </strong>{" "}
                    Total Capacity
                  </p>
                  <div className="sub-map-popup-sectors">
                    {stat.sectors.Central > 0 && (
                      <span>Central: {stat.sectors.Central}</span>
                    )}
                    {stat.sectors.State > 0 && (
                      <span>State: {stat.sectors.State}</span>
                    )}
                    {stat.sectors.Private > 0 && (
                      <span>Private: {stat.sectors.Private}</span>
                    )}
                  </div>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>
    </div>
  );
}

export default SubstationMap;
