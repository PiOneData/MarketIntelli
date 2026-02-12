import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface DataCenterMapProps {
  dataCenters: Array<{
    id: string;
    company: string;
    city: string;
    location: string;
    state: string;
    powerMW: number;
    sizeSqFt: number;
    status: string;
    lat: number;
    lng: number;
  }>;
  onMarkerClick?: (id: string) => void;
}

const statusColors: Record<string, string> = {
  "Planned": "#fbbf24",
  "Under Construction": "#f87171",
  "Operational": "#34d399",
};

const DataCenterMap = ({ dataCenters, onMarkerClick }: DataCenterMapProps) => {
  // Default center: India
  const center = [22.5937, 78.9629];
  return (
    <MapContainer center={center} zoom={5} style={{ height: "500px", width: "100%" }}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {dataCenters.map((dc) => (
        <Marker
          key={dc.id}
          position={[dc.lat, dc.lng]}
          eventHandlers={{
            click: () => onMarkerClick?.(dc.id),
          }}
          icon={L.divIcon({
            className: "custom-marker",
            html: `<div style='background:${statusColors[dc.status] || "#60a5fa"};border-radius:50%;width:24px;height:24px;display:flex;align-items:center;justify-content:center;color:white;font-weight:bold;'>DC</div>`
          })}
        >
          <Popup>
            <div style={{ minWidth: 180 }}>
              <strong>{dc.company}</strong>
              <br />{dc.city}, {dc.state}
              <br />{dc.location}
              <br />Power: {dc.powerMW} MW
              <br />Size: {dc.sizeSqFt.toLocaleString()} sq.ft.
              <br />Status: <span style={{ color: statusColors[dc.status] }}>{dc.status}</span>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
};

export default DataCenterMap;
