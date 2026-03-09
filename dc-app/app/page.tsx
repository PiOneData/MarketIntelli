'use client';

import { useEffect, useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { AssetFeature, AssetGeoJSON, AssetType } from '@/types/dc';
import Sidebar from '@/components/Sidebar';
import { Building2, MapPin, Globe, Wifi, PlaneTakeoff } from 'lucide-react';

const MapView = dynamic(() => import('@/components/MapView'), { ssr: false });

export default function HomePage() {
  const [activeAssetType, setActiveAssetType] = useState<AssetType>('datacenter');
  const [allData, setAllData] = useState<Record<AssetType, AssetFeature[]>>({ datacenter: [], airport: [] });

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [filterState, setFilterState] = useState('');
  const [filterCity, setFilterCity] = useState('');
  const [filterCompany, setFilterCompany] = useState('');
  const [loading, setLoading] = useState(true);
  const [heatmapMode, setHeatmapMode] = useState<'off' | 'count' | 'mw'>('off');

  useEffect(() => {
    Promise.all([
      fetch('/data/india_dc_288_combined.geojson').then(r => r.json()),
      fetch('/data/india_airports_unified.geojson').then(r => r.json()),
    ])
      .then(([dcData, aptData]: [AssetGeoJSON, AssetGeoJSON]) => {
        setAllData({
          datacenter: dcData.features,
          airport: aptData.features
        });
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const features = allData[activeAssetType];

  const kpis = useMemo(() => {
    const states = new Set(features.map(f => f.properties.state));
    const cities = new Set(features.map(f => f.properties.city));
    return { total: features.length, states: states.size, cities: cities.size };
  }, [features]);

  // Handle active dataset toggle — clear selections when changing
  const toggleAsset = (type: AssetType) => {
    if (type === activeAssetType) return;
    setActiveAssetType(type);
    setSelectedId(null);
    setFilterState('');
    setFilterCity('');
    setFilterCompany('');
  };

  if (loading) {
    return (
      <div style={{
        height: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 50%, #1d4ed8 100%)',
        gap: '20px',
      }}>
        <div style={{
          width: '52px', height: '52px', borderRadius: '14px',
          background: 'rgba(255,255,255,0.08)', border: '2px solid rgba(255,255,255,0.12)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Globe size={22} color="#93c5fd" />
        </div>
        <div style={{ textAlign: 'center' }}>
          <p style={{ color: '#fff', fontSize: '18px', fontWeight: 700, marginBottom: '6px' }}>Geospatial Intelligence</p>
          <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '13px' }}>Loading datasets…</p>
        </div>
        <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{
              width: '6px', height: '6px', borderRadius: '50%', background: '#3b82f6',
              animation: `spin 1.2s ease-in-out ${i * 0.2}s infinite`,
              opacity: 0.8,
            }} />
          ))}
        </div>
        <style>{`@keyframes spin { 0%,100%{transform:scale(0.6);opacity:0.4}50%{transform:scale(1);opacity:1} }`}</style>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>

      {/* ══════════════════════════════════════════
          TOP NAV — Deep Navy Premium Header
          ══════════════════════════════════════════ */}
      <header style={{
        height: '56px',
        background: '#0f172a',
        display: 'flex', alignItems: 'center',
        padding: '0 20px', gap: '20px',
        flexShrink: 0,
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        zIndex: 50,
      }}>

        {/* Brand mark */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
          <div style={{
            width: '32px', height: '32px', borderRadius: '9px',
            background: 'linear-gradient(135deg, #14b8a6, #0ea5e9)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 0 1px rgba(255,255,255,0.1)',
          }}>
            <Globe size={16} color="#fff" />
          </div>
          <div>
            <span style={{ fontSize: '14.5px', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>
              Geospatial Intelligence
            </span>
            <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)', fontWeight: 500, marginLeft: '7px' }}>
              India · 2026
            </span>
          </div>
        </div>

        {/* Divider */}
        <div style={{ width: '1px', height: '20px', background: 'rgba(255,255,255,0.1)', flexShrink: 0 }} />

        {/* KPI chips */}
        <div style={{ display: 'flex', gap: '6px', flex: 1 }}>
          {[
            {
              icon: activeAssetType === 'datacenter' ? <Building2 size={10} /> : <PlaneTakeoff size={10} />,
              label: activeAssetType === 'datacenter' ? 'Datacenters' : 'Airports',
              value: kpis.total, color: activeAssetType === 'datacenter' ? '#60a5fa' : '#2dd4bf'
            },
            { icon: <Globe size={10} />, label: 'States', value: kpis.states, color: '#34d399' },
            { icon: <MapPin size={10} />, label: 'Cities', value: kpis.cities, color: '#f59e0b' },
          ].map(({ icon, label, value, color }) => (
            <div key={label} style={{
              display: 'flex', alignItems: 'center', gap: '5px',
              padding: '4px 11px', borderRadius: '9999px',
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.09)',
              fontSize: '12px',
            }}>
              <span style={{ color }}>{icon}</span>
              <span style={{ fontWeight: 800, color: '#fff' }}>{value}</span>
              <span style={{ color: 'rgba(255,255,255,0.45)', fontWeight: 500 }}>{label}</span>
            </div>
          ))}
        </div>

        {/* Live status */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          padding: '5px 12px', borderRadius: '9999px',
          background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)',
          flexShrink: 0,
        }}>
          <span style={{
            width: '6px', height: '6px', borderRadius: '50%', background: '#10b981',
            display: 'inline-block',
            boxShadow: '0 0 6px rgba(16,185,129,0.7)',
          }} />
          <span style={{ fontSize: '11px', color: '#34d399', fontWeight: 700 }}>Live</span>
        </div>

        {/* Wifi icon */}
        <Wifi size={14} color="rgba(255,255,255,0.2)" />
      </header>

      {/* ══════════════════════════════════════════
          BODY — Map fills full space, Sidebar floats
          ══════════════════════════════════════════ */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>

        {/* Heatmap UI Toggle (Floating on Map) */}
        {!selectedId && (
          <div style={{
            position: 'absolute', top: '16px', right: '16px',
            zIndex: 400, background: '#fff', padding: '4px', borderRadius: '10px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1), 0 1px 3px rgba(0,0,0,0.08)',
            display: 'flex', gap: '3px'
          }}>
            <button
              onClick={() => setHeatmapMode('off')}
              style={{
                background: heatmapMode === 'off' ? '#f1f5f9' : 'transparent',
                color: heatmapMode === 'off' ? '#475569' : '#94a3b8',
                border: 'none', padding: '5px 12px', borderRadius: '7px',
                fontSize: '11px', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s'
              }}
            >
              Off
            </button>
            <button
              onClick={() => setHeatmapMode('count')}
              style={{
                background: heatmapMode === 'count' ? '#ffedd5' : 'transparent',
                color: heatmapMode === 'count' ? '#ea580c' : '#94a3b8',
                border: 'none', padding: '5px 12px', borderRadius: '7px',
                fontSize: '11px', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s'
              }}
            >
              By Count
            </button>
            {activeAssetType === 'datacenter' && (
              <button
                onClick={() => setHeatmapMode('mw')}
                style={{
                  background: heatmapMode === 'mw' ? '#f3e8ff' : 'transparent',
                  color: heatmapMode === 'mw' ? '#7e22ce' : '#94a3b8',
                  border: 'none', padding: '5px 12px', borderRadius: '7px',
                  fontSize: '11px', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s'
                }}
              >
                By Capacity
              </button>
            )}
          </div>
        )}

        {/* Map — full bleed background layer */}
        <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
          <MapView
            features={features}
            selectedId={selectedId}
            onSelectDC={(id) => setSelectedId(id)}
            filterState={filterState}
            filterCity={filterCity}
            filterCompany={filterCompany}
            setFilterState={setFilterState}
            setFilterCity={setFilterCity}
            setFilterCompany={setFilterCompany}
            activeAssetType={activeAssetType}
            heatmapMode={heatmapMode}
          />
        </div>

        {/* Sidebar wrapper — gives the aside a concrete height to fill */}
        <div style={{
          position: 'absolute', top: '16px', left: '16px', bottom: '16px',
          width: '340px', zIndex: 20, pointerEvents: 'none',
        }}>
          <Sidebar
            features={features}
            selectedId={selectedId}
            onSelectDC={(id) => setSelectedId(id)}
            filterState={filterState}
            setFilterState={setFilterState}
            filterCity={filterCity}
            setFilterCity={setFilterCity}
            filterCompany={filterCompany}
            setFilterCompany={setFilterCompany}
            activeAssetType={activeAssetType}
            onToggleAsset={toggleAsset}
          />
        </div>
      </div>
    </div>
  );
}
