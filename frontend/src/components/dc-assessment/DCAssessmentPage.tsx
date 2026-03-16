import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Layers } from 'lucide-react';
import MapView from './MapView';
import Sidebar from './Sidebar';
import StateBriefing from './StateBriefing';
import { AssetFeature, AssetType, AssetGeoJSON } from '../../types/dc';
import { getDCId } from '../../lib/dcUtils';
import AssetDetailPage from '../AssetDetailPage';
import './dc-assessment.css';

interface AirportNavState {
    lat?: number;
    lon?: number;
    iata?: string;
    name?: string;
}

// Header height: nav-top (68px) + power ticker (32px) = 100px
const HEADER_HEIGHT = 100;

export default function DCAssessmentPage() {
    const routerLocation = useLocation();
    const navState = (routerLocation.state ?? null) as AirportNavState | null;

    const [dcFeatures, setDcFeatures] = useState<AssetFeature[]>([]);
    const [airportFeatures, setAirportFeatures] = useState<AssetFeature[]>([]);
    const [loading, setLoading] = useState(true);

    const initialFlyTarget: [number, number] | undefined =
        navState?.lat != null && navState?.lon != null
            ? [navState.lat, navState.lon]
            : undefined;

    const [activeAssetType, setActiveAssetType] = useState<AssetType>(
        navState?.lat != null ? 'airport' : 'datacenter'
    );
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [filterState, setFilterState] = useState('');
    const [filterCity, setFilterCity] = useState('');
    const [filterCompany, setFilterCompany] = useState('');
    const [heatmapMode, setHeatmapMode] = useState<'off' | 'count' | 'mw'>('off');
    const [rxOpen, setRxOpen] = useState(false);
    const [selectedViewId, setSelectedViewId] = useState<string | null>(null);

    useEffect(() => {
        Promise.all([
            fetch('/data/india_dc_288_combined.geojson').then(r => r.json()),
            fetch('/data/india_airports_unified.geojson').then(r => r.json()),
        ]).then(([dcData, airportData]: [AssetGeoJSON, AssetGeoJSON]) => {
            setDcFeatures(dcData.features ?? []);
            setAirportFeatures(airportData.features ?? []);
        }).catch(err => {
            console.error('Failed to load asset data', err);
        }).finally(() => {
            setLoading(false);
        });
    }, []);

    // Auto-select airport when navigated from developer profile Key Airports
    useEffect(() => {
        if (!navState?.iata || airportFeatures.length === 0) return;
        const match = airportFeatures.find(
            f => f.properties.iata_code === navState.iata
        );
        if (match) setSelectedId(getDCId(match));
    }, [airportFeatures]); // eslint-disable-line react-hooks/exhaustive-deps

    const features = activeAssetType === 'datacenter' ? dcFeatures : airportFeatures;

    const handleToggleAsset = (type: AssetType) => {
        setActiveAssetType(type);
        setSelectedId(null);
        setFilterState('');
        setFilterCity('');
        setFilterCompany('');
    };

    const handleViewDetail = (id: number) => {
        setSelectedViewId(String(id));
        setRxOpen(true);
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: `calc(100vh - ${HEADER_HEIGHT}px)`, color: '#64748b', gap: '10px' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: 'spin 1s linear infinite' }}>
                    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                </svg>
                Loading asset data…
            </div>
        );
    }

    return (
        <>
            <div style={{ display: 'flex', height: `calc(100vh - ${HEADER_HEIGHT}px)`, overflow: 'hidden', background: '#f1f5f9', gap: '0' }}>

                {/* ── Left Sidebar ── */}
                <div style={{ width: '340px', flexShrink: 0, padding: '12px', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
                    <Sidebar
                        features={features}
                        selectedId={selectedId}
                        onSelectDC={setSelectedId}
                        filterState={filterState}
                        setFilterState={setFilterState}
                        filterCity={filterCity}
                        setFilterCity={setFilterCity}
                        filterCompany={filterCompany}
                        setFilterCompany={setFilterCompany}
                        activeAssetType={activeAssetType}
                        onToggleAsset={handleToggleAsset}
                    />
                </div>

                {/* ── Map Area ── */}
                <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
                    <MapView
                        features={features}
                        selectedId={selectedId}
                        onSelectDC={setSelectedId}
                        filterState={filterState}
                        filterCity={filterCity}
                        filterCompany={filterCompany}
                        setFilterState={setFilterState}
                        setFilterCity={setFilterCity}
                        setFilterCompany={setFilterCompany}
                        activeAssetType={activeAssetType}
                        heatmapMode={heatmapMode}
                        onViewDetail={handleViewDetail}
                        initialFlyTarget={initialFlyTarget}
                    />

                    {/* ── State Briefing overlay (top-left of map) ── */}
                    {filterState && (
                        <div style={{ position: 'absolute', top: '12px', left: '12px', zIndex: 1000, width: '280px' }}>
                            <StateBriefing
                                features={features}
                                state={filterState}
                                onClear={() => { setFilterState(''); setFilterCity(''); setFilterCompany(''); }}
                                activeAssetType={activeAssetType}
                            />
                        </div>
                    )}

                    {/* ── Heatmap mode toggle (floating, top-right) ── */}
                    <div style={{
                        position: 'absolute', top: '12px', right: '12px', zIndex: 1000,
                        display: 'flex', gap: '4px', background: 'rgba(255,255,255,0.95)',
                        borderRadius: '12px', padding: '5px',
                        boxShadow: '0 4px 16px rgba(28,26,24,0.10), 0 1px 4px rgba(28,26,24,0.06)',
                        backdropFilter: 'blur(8px)',
                        border: '1px solid rgba(226,232,240,0.8)',
                    }}>
                        <span style={{ display: 'flex', alignItems: 'center', padding: '0 8px', color: '#94a3b8' }}>
                            <Layers size={13} />
                        </span>
                        {(['off', 'count', 'mw'] as const).map(mode => (
                            <button
                                key={mode}
                                onClick={() => setHeatmapMode(mode)}
                                style={{
                                    padding: '5px 10px', borderRadius: '8px', border: 'none',
                                    background: heatmapMode === mode ? '#0d7a6e' : 'transparent',
                                    color: heatmapMode === mode ? '#fff' : '#64748b',
                                    fontSize: '11px', fontWeight: 700, cursor: 'pointer',
                                    transition: 'all 0.15s', fontFamily: 'inherit',
                                    letterSpacing: '0.02em',
                                }}
                            >
                                {mode === 'off' ? 'Off' : mode === 'count' ? 'Count' : 'MW'}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── Geospatial Assessment Overlay ── */}
            {rxOpen && selectedViewId && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    zIndex: 9000,
                    overflowY: 'auto',
                    background: '#f1f5f9',
                }}>
                    <AssetDetailPage
                        id={selectedViewId}
                        type={activeAssetType}
                        onBack={() => setRxOpen(false)}
                    />
                </div>
            )}
        </>
    );
}
