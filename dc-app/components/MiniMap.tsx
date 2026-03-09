'use client';

import { MapContainer, TileLayer, CircleMarker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

interface MiniMapProps {
    lat: number;
    lon: number;
    name: string;
    color: string;
}

export default function MiniMap({ lat, lon, name, color }: MiniMapProps) {
    return (
        <MapContainer
            center={[lat, lon]}
            zoom={15}
            style={{ height: '100%', minHeight: '260px', width: '100%' }}
            zoomControl={false}
            scrollWheelZoom={false}
            dragging={false}
            doubleClickZoom={false}
        >
            <TileLayer
                attribution="&copy; Esri &mdash; Source: Esri"
                url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            />
            <CircleMarker
                center={[lat, lon]}
                radius={8}
                pathOptions={{ fillColor: color, color: '#fff', weight: 2, fillOpacity: 0.9 }}
            />
        </MapContainer>
    );
}
