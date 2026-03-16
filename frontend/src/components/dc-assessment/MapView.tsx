import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, CircleMarker, useMap, GeoJSON, Tooltip, FeatureGroup, Pane, Marker, ZoomControl } from 'react-leaflet';
import { AssetFeature, AssetType } from '../../types/dc';
import { getDCId } from '../../lib/dcUtils';
import { X, Loader2, ArrowRight, Layers } from 'lucide-react';
import L from 'leaflet';

// FIX #3: Move constants OUTSIDE component so they don't recreate on every render
const NORMALIZE_STATE: Record<string, string> = {
    'Odisha': 'Orissa',
    'New Delhi': 'Delhi',
    'Pondicherry': 'Puducherry',
    'Telangana': 'Andhra Pradesh',
};

// Reverse map: GeoJSON name → data name (for clicking states on map)
const REVERSE_NORMALIZE: Record<string, string> = Object.fromEntries(
    Object.entries(NORMALIZE_STATE).map(([k, v]) => [v, k])
);

const geoNameToData = (geoName: string, dataStates: Set<string>): string => {
    // Try exact match first
    if (dataStates.has(geoName)) return geoName;
    // Try reverse normalize (e.g. Orissa → Odisha)
    const rev = REVERSE_NORMALIZE[geoName];
    if (rev && dataStates.has(rev)) return rev;
    return geoName;
};

function MapViewController({
    target,
    stateGeoJson,
    cityBounds
}: {
    target: [number, number] | null,
    stateGeoJson: unknown | null,
    cityBounds: L.LatLngBounds | null
}) {
    const map = useMap();
    useEffect(() => {
        if (target) {
            // Fly to marker - reduced zoom slightly for better rendering
            map.flyTo(target, 12, { animate: true, duration: 1.2, easeLinearity: 0.35 });
        } else if (cityBounds) {
            // Fit bounds of the city's markers
            map.flyToBounds(cityBounds, {
                animate: true,
                duration: 1.2,
                easeLinearity: 0.35,
                maxZoom: 12,
                paddingTopLeft: [450, 50], // Same shift for city/company bounds
                paddingBottomRight: [50, 50]
            });
        } else if (stateGeoJson) {
            // Fit bounds of the state polygon
            const layer = L.geoJSON(stateGeoJson as Parameters<typeof L.geoJSON>[0]);
            map.flyToBounds(layer.getBounds(), {
                animate: true,
                duration: 1.1,
                easeLinearity: 0.35,
                paddingTopLeft: [450, 50],  // Shift view dramatically to the right avoiding the 340px sidebar
                paddingBottomRight: [50, 50]
            });
        } else {
            // Return to India view - adjust right slightly
            map.flyTo([20.5937, 82.0000], 5, { animate: true, duration: 1.5, easeLinearity: 0.25 });
        }
    }, [target, stateGeoJson, cityBounds, map]);
    return null;
}

function ZoomListener() {
    const map = useMap();
    useEffect(() => {
        const updateZoom = () => {
            document.documentElement.style.setProperty('--map-zoom', map.getZoom().toString());
        };
        updateZoom(); // initial set
        map.on('zoom', updateZoom);
        return () => { map.off('zoom', updateZoom); };
    }, [map]);
    return null;
}

interface MapViewProps {
    features: AssetFeature[];
    selectedId: number | null;
    onSelectDC: (id: number | null) => void;
    filterState: string;
    filterCity: string;
    filterCompany: string;
    setFilterState: (s: string) => void;
    setFilterCity: (s: string) => void;
    setFilterCompany: (s: string) => void;
    activeAssetType: AssetType;
    heatmapMode: 'off' | 'count' | 'mw';
    onViewDetail: (id: number) => void;
    initialFlyTarget?: [number, number];
}

const getHeatmapColor = (val: number, max: number, mode: 'count' | 'mw' | 'off') => {
    if (!val || max === 0 || mode === 'off') return 'transparent';
    const ratio = val / max;
    if (mode === 'count') {
        // Warm Orange/Red scale for count
        if (ratio > 0.8) return '#991b1b'; // dark red
        if (ratio > 0.6) return '#dc2626'; // red
        if (ratio > 0.4) return '#ea580c'; // orange
        if (ratio > 0.15) return '#f97316'; // orange-light
        if (ratio > 0.05) return '#fb923c';
        return '#fdba74';
    } else {
        // Purple scale for MW capacity
        if (ratio > 0.8) return '#4c1d95';
        if (ratio > 0.6) return '#6d28d9';
        if (ratio > 0.4) return '#7c3aed';
        if (ratio > 0.15) return '#8b5cf6';
        if (ratio > 0.05) return '#a78bfa';
        return '#c4b5fd';
    }
};

export default function MapView({ features, selectedId, onSelectDC, filterState, filterCity, filterCompany, setFilterState, setFilterCity, setFilterCompany, activeAssetType, heatmapMode, onViewDetail, initialFlyTarget }: MapViewProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [flyTarget, setFlyTarget] = useState<[number, number] | null>(initialFlyTarget ?? null);
    const [statesGeoJson, setStatesGeoJson] = useState<unknown>(null);
    const [indiaOutlineGeoJson, setIndiaOutlineGeoJson] = useState<unknown>(null);
    const hasMounted = useRef(false);

    useEffect(() => {
        fetch('/data/india_states.geojson')
            .then(res => res.json())
            .then(data => setStatesGeoJson(data))
            .catch(err => console.error('Could not load states map', err));

        // Fetch custom-built national outline
        fetch('/data/india_outline.geojson')
            .then(res => res.json())
            .then(data => setIndiaOutlineGeoJson(data))
            .catch(() => console.log('Outline not found, skipping'));
    }, []);


    // FIX #6: Reset isLoading when selected DC changes
    useEffect(() => {
        setIsLoading(false);
    }, [selectedId]);

    const handleMarkerClick = useCallback((feature: AssetFeature) => {
        const id = getDCId(feature);
        if (selectedId === id) return; // ignore clicking same DC

        const [lon, lat] = feature.geometry.coordinates;
        onSelectDC(id);

        // Auto-filter by company to isolate this company's assets
        const comp = feature.properties.company || feature.properties.type;
        if (comp) setFilterCompany(comp as string);

        setFlyTarget([lat, lon]);
    }, [onSelectDC, selectedId, setFilterCompany]);

    // Manually define visual centers for major states that calculate poorly from bounding boxes
    const stateCenters = useMemo(() => {
        if (!statesGeoJson) return {} as Record<string, [number, number]>;
        const statesData = statesGeoJson as { features: Array<{ properties: { NAME_1: string }; geometry: { type: string; coordinates: unknown } }> };
        const centers: Record<string, [number, number]> = {};
        statesData.features.forEach((f) => {
            const sn = f.properties.NAME_1;
            // Manual overrides for best visual placement
            if (sn === 'Andhra Pradesh') { centers[sn] = [17.5, 79.5]; return; }
            if (sn === 'Madhya Pradesh') { centers[sn] = [23.5, 78.5]; return; }
            if (sn === 'Maharashtra') { centers[sn] = [19.2, 76.0]; return; }
            if (sn === 'Karnataka') { centers[sn] = [14.0, 76.0]; return; }
            if (sn === 'Gujarat') { centers[sn] = [23.0, 71.5]; return; }
            if (sn === 'West Bengal') { centers[sn] = [23.5, 87.5]; return; }
            if (sn === 'Tamil Nadu') { centers[sn] = [11.0, 78.5]; return; }
            if (sn === 'Uttar Pradesh') { centers[sn] = [27.0, 80.5]; return; }
            if (sn === 'Rajasthan') { centers[sn] = [26.5, 73.5]; return; }

            // Automatic fallback bounding box center
            let minLon = 180, maxLon = -180, minLat = 90, maxLat = -90;
            const processRing = (ring: number[][]) => {
                ring.forEach(c => {
                    const lon = c[0] ?? 0, lat = c[1] ?? 0;
                    if (lon < minLon) minLon = lon;
                    if (lon > maxLon) maxLon = lon;
                    if (lat < minLat) minLat = lat;
                    if (lat > maxLat) maxLat = lat;
                });
            };
            if (f.geometry.type === 'MultiPolygon') (f.geometry.coordinates as number[][][][]).forEach((poly) => poly.forEach(processRing));
            else (f.geometry.coordinates as number[][][]).forEach(processRing);

            centers[sn] = [(minLat + maxLat) / 2, (minLon + maxLon) / 2];
        });
        return centers;
    }, [statesGeoJson]);

    // All state names that exist in our DC data (normalized)
    const dataStates = useMemo(() => new Set(features.map(f => f.properties.state ? (NORMALIZE_STATE[f.properties.state] || f.properties.state) : null).filter(Boolean) as string[]), [features]);

    // Calculate Heatmap Data
    const stateHeatmapData = useMemo(() => {
        const data: Record<string, { count: number, mw: number }> = {};
        let maxVal = 0;
        features.forEach(f => {
            const rawState = f.properties.state;
            if (!rawState) return;
            const state = NORMALIZE_STATE[rawState] || rawState;

            if (!data[state]) data[state] = { count: 0, mw: 0 };

            data[state].count += 1;
            data[state].mw += (parseFloat(f.properties.power_mw as string) || 0);
        });
        Object.values(data).forEach(v => {
            const val = heatmapMode === 'count' ? v.count : v.mw;
            if (val > maxVal) maxVal = val;
        });
        return { data, maxVal };
    }, [features, heatmapMode]);

    // Click a state polygon → filter sidebar (heatmap stays at state level always)
    const handleStateClick = useCallback((geoName: string) => {
        const dataName = geoNameToData(geoName, dataStates);
        console.log("State Clicked:", geoName, "->", dataName);

        // If clicking the currently selected state, clear the filter (toggle off)
        if (filterState === dataName) {
            setFilterState('');
        } else {
            setFilterState(dataName);
        }

        setFilterCity('');
        setFilterCompany('');
        onSelectDC(null);
    }, [dataStates, filterState, setFilterState, setFilterCity, setFilterCompany, onSelectDC]);

    // Suppress unused warning (handleStateClick is defined but not wired to GeoJSON interactive=false)
    void handleStateClick;

    const selectedFeature = useMemo(() => features.find(f => getDCId(f) === selectedId), [features, selectedId]);
    const activeState = filterState || selectedFeature?.properties?.state;
    const activeCity = filterCity || selectedFeature?.properties?.city;

    const activeStateGeoJson = useMemo(() => {
        if (!statesGeoJson || !activeState) return null;
        const normalized = NORMALIZE_STATE[activeState] || activeState;
        const statesData = statesGeoJson as { type: string; features: Array<{ properties: { NAME_1: string } }> };
        const filtered = statesData.features.filter((f) => {
            const geoName = f.properties.NAME_1;
            const dName = geoNameToData(geoName, dataStates);
            return dName === activeState || geoName === normalized || geoName === activeState;
        });
        return filtered.length ? { ...statesData, features: filtered } : null;
    }, [statesGeoJson, activeState, dataStates]);

    const activeBounds = useMemo(() => {
        // Do not trigger bounds calculation/zoom just for company filtering. Only zoom to cities.
        if (!activeCity) return null;

        let matchFeatures = features;
        if (activeCity) matchFeatures = matchFeatures.filter(f => f.properties.city === activeCity);
        if (filterCompany) matchFeatures = matchFeatures.filter(f => (f.properties.company || f.properties.type || '') === filterCompany);
        // Make sure we restrict to the state as well
        if (activeState) matchFeatures = matchFeatures.filter(f => f.properties.state === activeState);

        if (matchFeatures.length === 0) return null;

        const lats = matchFeatures.map(f => f.geometry.coordinates[1]);
        const lons = matchFeatures.map(f => f.geometry.coordinates[0]);

        return L.latLngBounds(
            L.latLng(Math.min(...lats), Math.min(...lons)),
            L.latLng(Math.max(...lats), Math.max(...lons))
        );
    }, [features, activeCity, filterCompany, activeState]);

    // FIX #8: Only fly on genuine user-driven changes, not on initial mount
    useEffect(() => {
        if (!hasMounted.current) { hasMounted.current = true; return; }
        if (selectedFeature) {
            const [lon, lat] = selectedFeature.geometry.coordinates;
            setFlyTarget([lat, lon]);
        } else {
            setFlyTarget(null);
        }
    }, [selectedFeature]);

    const handleViewFullAssessment = (id: number) => {
        setIsLoading(true);
        onViewDetail(id);
    };

    return (
        <div style={{ position: 'relative', height: '100%', width: '100%' }}>
            <MapContainer
                center={[20.5937, 78.9629]}
                zoom={5}
                style={{ height: '100%', width: '100%' }}
                zoomControl={false}
                preferCanvas={true}
            >
                <ZoomControl position="bottomright" />
                <ZoomListener />
                <TileLayer
                    attribution='&copy; Esri, Maxar'
                    url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                    maxZoom={18}
                />

                {/* Thick Global India Outline Layer */}
                {indiaOutlineGeoJson && !activeStateGeoJson && (
                    <GeoJSON
                        key="india-national-outline"
                        data={indiaOutlineGeoJson as Parameters<typeof GeoJSON>[0]['data']}
                        interactive={false}
                        style={{
                            fill: false,
                            color: '#ffffff',    // White for visibility on satellite
                            weight: 1.5,
                            opacity: 0.7,
                            dashArray: '8 4',
                        }}
                    />
                )}

                {/* Active State Outline — stroke only, NO fill (prevents blue wash when zoomed in) */}
                {activeStateGeoJson && (
                    <GeoJSON
                        key={`outline-${activeState}-${heatmapMode}`}
                        data={activeStateGeoJson as Parameters<typeof GeoJSON>[0]['data']}
                        interactive={false}
                        style={{
                            fill: true,
                            fillColor: '#0f9b8c',
                            fillOpacity: heatmapMode === 'off' ? 0.12 : 0,
                            color: '#ffffff',
                            weight: 2,
                            opacity: 0.85,
                            dashArray: '6 4',
                        } as L.PathOptions}
                    />
                )}

                {/* Transparent silently-clickable state overlay for standard mode */}
                {statesGeoJson && (
                    <GeoJSON
                        key={`state-overlay-${heatmapMode}-${activeAssetType}-${features.length}-${filterState}-${filterCompany}`}
                        data={statesGeoJson as Parameters<typeof GeoJSON>[0]['data']}
                        interactive={false} // Force false to prevent UI lag from DOM event tracking
                        style={(feature: unknown) => {
                            const sn = (feature as { properties: { NAME_1: string } }).properties.NAME_1;
                            const dataName = geoNameToData(sn, dataStates);
                            const valObj = stateHeatmapData.data[dataName];
                            const val = valObj ? (heatmapMode === 'count' ? valObj.count : valObj.mw) : 0;
                            const hasData = dataStates.has(dataName);

                            // Hide if no data, heatmap is off, or if we are filtering by state and this is NOT the state
                            if (!hasData || heatmapMode === 'off' || (filterState && dataName !== filterState)) {
                                // Default mode: extremely faint internal state outlines, to let outer edge pop
                                // Added near-invisible fill to guarantee Leaflet SVG hit detection across all browsers
                                return { fillColor: '#000000', weight: 0.5, color: '#ffffff', opacity: 0.25, fillOpacity: 0.01, interactive: false };
                            }

                            return {
                                fillColor: getHeatmapColor(val, stateHeatmapData.maxVal, heatmapMode),
                                weight: 1,
                                color: '#fff', // White border between colored states
                                fillOpacity: 0.6,
                                opacity: 0.5,
                                interactive: false
                            };
                        }}
                    />
                )}

                {/* Independent Heatmap Text Overlays for perfect geometric centering */}
                {statesGeoJson && heatmapMode !== 'off' && (
                    <Pane name="heatmap-labels" style={{ zIndex: 610 }}>
                        {Object.keys(stateCenters).map(sn => {
                            const dataName = geoNameToData(sn, dataStates);
                            if (!dataStates.has(dataName)) return null;
                            if (filterState && dataName !== filterState) return null;

                            const valObj = stateHeatmapData.data[dataName] || { count: 0, mw: 0 };
                            let displayVal = '';
                            if (heatmapMode === 'mw' && activeAssetType === 'datacenter') {
                                const mw = valObj.mw;
                                if (mw >= 1000) displayVal = `${(mw / 1000).toFixed(2)} GW`;
                                else displayVal = `${mw.toFixed(2)} MW`;
                            } else {
                                displayVal = `${valObj.count}`;
                            }

                            const Icon = L.divIcon({
                                className: 'heatmap-custom-label',
                                html: `<div>${displayVal}</div>`,
                                iconSize: [0, 0]
                            });

                            return (
                                <Marker key={`label-${sn}`} position={stateCenters[sn]} icon={Icon} interactive={false} />
                            );
                        })}
                    </Pane>
                )}


                <MapViewController target={flyTarget} stateGeoJson={!flyTarget && !activeBounds ? activeStateGeoJson : null} cityBounds={!flyTarget ? activeBounds : null} />

                {/* DC/Airport Markers - explicitly in a top-level pane to ensure hover works */}
                <Pane name="top-markers" style={{ zIndex: 620 }}>
                    {features.map(feature => {
                        const id = getDCId(feature);
                        const p = feature.properties;
                        const [lon, lat] = feature.geometry.coordinates;
                        const isSelected = selectedId === id;

                        const isUpcoming = Boolean(p.is_upcoming);
                        const isAirportUpcoming = activeAssetType === 'airport' && !['Operational', 'Limited Use', 'Limited Operations', 'Operational (Limited)', 'Operational (Charter)'].includes(p.status as string ?? '');

                        let fillColor = activeAssetType === 'airport' ? '#0ea5e9' : '#0d7a6e';
                        let opacity = 0.9;
                        let radius = isSelected ? 8 : 4;
                        const borderColor = isSelected ? '#fff' : 'transparent';
                        const borderWeight = isSelected ? 1.5 : 0;

                        // Support for Light green glow on green airports
                        if (activeAssetType === 'airport' && p.is_notable_green) {
                            fillColor = '#10b981';
                        }
                        // Amber for upcoming/under-construction DCs
                        if (activeAssetType === 'datacenter' && isUpcoming) {
                            fillColor = '#f59e0b';
                        }
                        // Purple for upcoming/under-development airports
                        if (isAirportUpcoming) {
                            fillColor = '#a855f7';
                        }

                        const matchState = !filterState || p.state === filterState;
                        const matchCompany = !filterCompany || (p.company || p.type || '') === filterCompany;
                        const isFilteredCompany = filterCompany && matchCompany;

                        if (!matchState || !matchCompany) {
                            opacity = 0.15;
                            radius = isSelected ? 8 : 3;
                        } else if (isFilteredCompany) {
                            // Visually enlarge and change color to make filtered companies pop vividly!
                            radius = isSelected ? 8 : 7;
                            opacity = 1;
                            fillColor = activeAssetType === 'airport' ? '#ea580c' : '#f59e0b'; // Vivid amber/orange
                        } else if (activeState && activeAssetType === 'datacenter') {
                            fillColor = '#0f9b8c';
                        }

                        return (
                            <FeatureGroup key={`grp-${id}`}>
                                {/* Removed extra glowing radius based on user request */}
                                <CircleMarker
                                    key={id}
                                    center={[lat, lon]}
                                    radius={radius}
                                    pathOptions={{
                                        fillColor,
                                        color: isSelected ? '#fff' : borderColor,
                                        weight: isSelected ? 3 : borderWeight,
                                        fillOpacity: opacity,
                                        opacity: opacity,
                                        interactive: true
                                    }}
                                    eventHandlers={{
                                        click: (e: L.LeafletMouseEvent) => {
                                            L.DomEvent.stopPropagation(e);
                                            handleMarkerClick(feature);
                                        },
                                    }}
                                >
                                    <Tooltip direction="top" offset={[0, -10]} opacity={1} sticky={true}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                            <div style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a', lineHeight: 1.2 }}>
                                                {p.dc_name || p.airport_name || 'Unknown Asset'}
                                            </div>
                                            <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 500 }}>
                                                {p.city}, {p.state}
                                            </div>
                                        </div>
                                    </Tooltip>
                                </CircleMarker>
                            </FeatureGroup>
                        );
                    })}
                </Pane>
            </MapContainer>

            {/* ── Floating Detail Card (Issue #5 fix: raised higher from bottom) ── */}
            {selectedFeature && (
                <div className="anim-fade-slide-up" style={{
                    position: 'absolute',
                    bottom: '36px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    zIndex: 1000,
                    background: '#fff',
                    borderRadius: '14px',
                    boxShadow: '0 16px 48px rgba(28,26,24,0.12), 0 4px 12px rgba(28,26,24,0.06)',
                    width: '400px',
                    overflow: 'hidden',
                    border: '1px solid #e2e8f0',
                    fontFamily: "var(--sans, 'DM Sans', system-ui, sans-serif)",
                }}>
                    {/* Header band */}
                    {(() => {
                        const selIsUpcoming = Boolean(selectedFeature.properties.is_upcoming);
                        const selAirportUpcoming = activeAssetType === 'airport' && !['Operational', 'Limited Use', 'Limited Operations', 'Operational (Limited)', 'Operational (Charter)'].includes(selectedFeature.properties.status as string ?? '');
                        const headerBg = activeAssetType === 'airport'
                            ? (selAirportUpcoming ? 'linear-gradient(130deg, #7e22ce 0%, #a855f7 60%, #c084fc 100%)' : (selectedFeature.properties.is_notable_green ? 'linear-gradient(130deg, #059669 0%, #10b981 60%, #34d399 100%)' : 'linear-gradient(130deg, #0284c7 0%, #0ea5e9 60%, #38bdf8 100%)'))
                            : (selIsUpcoming ? 'linear-gradient(130deg, #b45309 0%, #d97706 60%, #f59e0b 100%)' : 'linear-gradient(130deg, #0d5f59 0%, #0d7a6e 60%, #0f9b8c 100%)');
                        return (
                    <div style={{ background: headerBg, padding: '14px 48px 12px 16px', position: 'relative' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                            <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.65)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', margin: 0 }}>
                                Selected {activeAssetType === 'airport' ? 'Airport' : 'Datacenter'}
                            </p>
                            {(selIsUpcoming || selAirportUpcoming) && (
                                <span style={{ padding: '2px 7px', background: 'rgba(255,255,255,0.25)', color: '#fff', fontSize: '8px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', borderRadius: '3px' }}>
                                    UPCOMING
                                </span>
                            )}
                        </div>
                        <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#fff', lineHeight: 1.25, marginBottom: '3px' }}>
                            {selectedFeature.properties.dc_name || selectedFeature.properties.airport_name}
                        </h3>
                        <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.72)' }}>
                            {selectedFeature.properties.company || selectedFeature.properties.type} · {selectedFeature.properties.city}, {selectedFeature.properties.state}
                        </p>
                        {/* FIX #11: Use null for deselect, not NaN */}
                        <button onClick={() => onSelectDC(null)} style={{ position: 'absolute', top: '12px', right: '12px', background: 'rgba(255,255,255,0.18)', border: 'none', borderRadius: '6px', padding: '5px', cursor: 'pointer', display: 'flex', color: '#fff', lineHeight: 0 }}>
                            <X size={14} />
                        </button>
                    </div>
                        );
                    })()}

                    {/* Overview grid */}
                    <div style={{ padding: '12px 14px 14px' }}>
                        <p style={{ fontSize: '10px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '8px' }}>
                            {activeAssetType === 'airport' ? 'Airport Overview' : 'Datacenter Overview'}
                        </p>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '6px', marginBottom: '12px' }}>
                            {activeAssetType === 'airport' ? (
                                [
                                    { icon: '👥', label: 'Pass.(MN)', val: selectedFeature.properties.operations?.annual_passengers_mn },
                                    { icon: '✈️', label: 'Runways', val: selectedFeature.properties.operations?.no_of_runways },
                                    { icon: '📦', label: 'Cargo(MT)', val: selectedFeature.properties.operations?.cargo_capacity_mtpa },
                                    { icon: '🌿', label: 'Green', val: selectedFeature.properties.is_notable_green ? 'Yes' : 'No' },
                                ].map(({ icon, label, val }) => (
                                    <div key={label} style={{ background: '#f8fafc', borderRadius: '8px', padding: '8px 4px', textAlign: 'center' }}>
                                        <div style={{ fontSize: '15px', marginBottom: '3px' }}>{icon}</div>
                                        <div style={{ fontSize: '7.5px', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</div>
                                        <div style={{ fontSize: '9.5px', fontWeight: 800, color: '#0f172a', lineHeight: 1.2, marginTop: '2px' }}>{val ?? 'N/A'}</div>
                                    </div>
                                ))
                            ) : (
                                [
                                    { icon: '⚡', label: 'Power', val: selectedFeature.properties.power_mw !== 'Not Specified' ? `${selectedFeature.properties.power_mw} MW` : 'N/A' },
                                    { icon: '🏢', label: 'Tier', val: selectedFeature.properties.tier_design !== 'Not Specified' ? selectedFeature.properties.tier_design : 'N/A' },
                                    { icon: '🗄️', label: 'White Area', val: selectedFeature.properties.whitespace !== 'Not Specified' ? selectedFeature.properties.whitespace : 'N/A' },
                                    { icon: '🏅', label: 'Rating', val: selectedFeature.properties.overall_rating || 'N/A' },
                                ].map(({ icon, label, val }) => (
                                    <div key={label} style={{ background: '#f8fafc', borderRadius: '8px', padding: '8px 4px', textAlign: 'center' }}>
                                        <div style={{ fontSize: '15px', marginBottom: '3px' }}>{icon}</div>
                                        <div style={{ fontSize: '7.5px', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</div>
                                        <div style={{ fontSize: '9.5px', fontWeight: 800, color: '#0f172a', lineHeight: 1.2, marginTop: '2px' }}>{val ?? 'N/A'}</div>
                                    </div>
                                ))
                            )}
                        </div>

                        <button
                            onClick={() => handleViewFullAssessment(getDCId(selectedFeature))}
                            disabled={isLoading}
                            style={{
                                width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px',
                                padding: '11px 16px',
                                background: isLoading ? '#99d6d0' : (activeAssetType === 'airport' ? (selectedFeature.properties.is_notable_green ? 'linear-gradient(135deg, #059669, #10b981)' : 'linear-gradient(135deg, #0284c7, #0ea5e9)') : 'linear-gradient(135deg, #0d5f59, #0d7a6e)'),
                                color: '#fff', borderRadius: '9px', fontSize: '13px', fontWeight: 700,
                                border: 'none', cursor: isLoading ? 'not-allowed' : 'pointer',
                                boxShadow: isLoading ? 'none' : (activeAssetType === 'airport' ? (selectedFeature.properties.is_notable_green ? '0 4px 14px rgba(16,185,129,0.35)' : '0 4px 14px rgba(14,165,233,0.35)') : '0 4px 14px rgba(13,122,110,0.35)'),
                                transition: 'all 0.15s', fontFamily: 'inherit',
                            }}
                        >
                            {isLoading
                                ? <><Loader2 size={14} className="animate-spin" /> Loading Assessment…</>
                                : <>View Geospatial Assessment  <ArrowRight size={14} /></>
                            }
                        </button>
                    </div>
                </div>
            )}

        </div>
    );
}

// Export Layers icon for use in parent if needed
export { Layers };
