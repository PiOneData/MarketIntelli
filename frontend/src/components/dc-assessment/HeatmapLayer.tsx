import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet.heat';

interface HeatmapLayerProps {
    points: [number, number, number][]; // [lat, lon, intensity]
    radius?: number;
    blur?: number;
    maxZoom?: number;
    gradient?: { [key: number]: string };
}

export default function HeatmapLayer({ points, radius = 25, blur = 15, maxZoom = 10, gradient }: HeatmapLayerProps) {
    const map = useMap();

    useEffect(() => {
        if (!points || points.length === 0) return;

        // Initialize heatlayer
        const options: Record<string, unknown> = { radius, blur, maxZoom };
        if (gradient) options.gradient = gradient;

        const heatLayer = (L as unknown as { heatLayer: (points: [number, number, number][], options: Record<string, unknown>) => L.Layer }).heatLayer(points, options).addTo(map);

        return () => {
            map.removeLayer(heatLayer);
        };
    }, [map, points, radius, blur, maxZoom, gradient]);

    return null;
}
