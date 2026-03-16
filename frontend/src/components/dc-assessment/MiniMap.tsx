import { useRef, useEffect, type MutableRefObject } from 'react';
import { MapContainer, TileLayer, CircleMarker, useMap } from 'react-leaflet';
import type { Map as LeafletMap } from 'leaflet';

interface MiniMapProps {
    lat: number;
    lon: number;
    name: string;
    color: string;
}

function MapRefCapture({ mapRef }: { mapRef: MutableRefObject<LeafletMap | null> }) {
    const map = useMap();
    useEffect(() => { mapRef.current = map; }, [map, mapRef]);
    return null;
}

export default function MiniMap({ lat, lon, name: _name, color }: MiniMapProps) {
    const mapRef = useRef<LeafletMap | null>(null);

    return (
        <div style={{ position: 'relative', height: '100%', width: '100%', minHeight: '280px' }}>
            <MapContainer
                center={[lat, lon]}
                zoom={15}
                style={{ height: '100%', width: '100%' }}
                zoomControl={false}
                scrollWheelZoom={true}
                dragging={true}
                doubleClickZoom={true}
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
                <MapRefCapture mapRef={mapRef} />
            </MapContainer>

            {/* Zoom controls */}
            <div style={{
                position: 'absolute',
                top: '12px',
                right: '12px',
                zIndex: 1000,
                display: 'flex',
                flexDirection: 'column',
                gap: '2px',
                pointerEvents: 'all',
            }}>
                <button
                    onClick={() => mapRef.current?.zoomIn()}
                    title="Zoom in"
                    style={{
                        width: '32px',
                        height: '32px',
                        background: '#fff',
                        border: '1px solid rgba(0,0,0,0.25)',
                        borderRadius: '4px 4px 0 0',
                        cursor: 'pointer',
                        fontSize: '20px',
                        fontWeight: 700,
                        lineHeight: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                        color: '#333',
                        fontFamily: 'inherit',
                    }}
                >+</button>
                <button
                    onClick={() => mapRef.current?.zoomOut()}
                    title="Zoom out"
                    style={{
                        width: '32px',
                        height: '32px',
                        background: '#fff',
                        border: '1px solid rgba(0,0,0,0.25)',
                        borderTop: 'none',
                        borderRadius: '0 0 4px 4px',
                        cursor: 'pointer',
                        fontSize: '22px',
                        fontWeight: 700,
                        lineHeight: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                        color: '#333',
                        fontFamily: 'inherit',
                    }}
                >−</button>
            </div>

            {/* Reset zoom button */}
            <div style={{
                position: 'absolute',
                bottom: '12px',
                right: '12px',
                zIndex: 1000,
                pointerEvents: 'all',
            }}>
                <button
                    onClick={() => mapRef.current?.setView([lat, lon], 15)}
                    title="Reset view"
                    style={{
                        background: 'rgba(255,255,255,0.92)',
                        border: '1px solid rgba(0,0,0,0.2)',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '10px',
                        fontWeight: 700,
                        padding: '4px 8px',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                        color: '#444',
                        letterSpacing: '0.03em',
                        fontFamily: 'inherit',
                    }}
                >Reset</button>
            </div>
        </div>
    );
}
