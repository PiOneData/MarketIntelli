'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { AssetFeature, AssetType } from '@/types/dc';
import { getDCId } from '@/lib/utils';
import Link from 'next/link';
import { Search, X, ChevronDown, ArrowUpRight, MapPin, Building, PlaneTakeoff, ShieldCheck } from 'lucide-react';
import StateBriefing from './StateBriefing';

interface SidebarProps {
    features: AssetFeature[];
    selectedId: number | null;
    onSelectDC: (id: number | null) => void;
    filterState: string;
    setFilterState: (s: string) => void;
    filterCity: string;
    setFilterCity: (s: string) => void;
    filterCompany: string;
    setFilterCompany: (s: string) => void;
    activeAssetType: AssetType;
    onToggleAsset: (type: AssetType) => void;
}


// Highlight matching text in search results
function Highlight({ text, query }: { text?: string | null; query: string }) {
    const safeText = text || '';
    if (!query.trim()) return <>{safeText}</>;
    const parts = safeText.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
    return (
        <>
            {parts.map((p, i) =>
                p.toLowerCase() === query.toLowerCase()
                    ? <mark key={i} style={{ background: '#fef08a', color: '#1e3a8a', fontWeight: 700, borderRadius: '2px', padding: '0 1px' }}>{p}</mark>
                    : p
            )}
        </>
    );
}

export default function Sidebar({ features, selectedId, onSelectDC, filterState, setFilterState, filterCity, setFilterCity, filterCompany, setFilterCompany, activeAssetType, onToggleAsset }: SidebarProps) {
    const [search, setSearch] = useState('');
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [stateOpen, setStateOpen] = useState(false);
    const [cityOpen, setCityOpen] = useState(false);
    const [companyOpen, setCompanyOpen] = useState(false);
    const [collapsed, setCollapsed] = useState(false);
    const searchRef = useRef<HTMLInputElement>(null);
    const stateRef = useRef<HTMLDivElement>(null);
    const cityRef = useRef<HTMLDivElement>(null);
    const companyRef = useRef<HTMLDivElement>(null);

    // Close dropdowns on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (stateRef.current && !stateRef.current.contains(e.target as Node)) setStateOpen(false);
            if (cityRef.current && !cityRef.current.contains(e.target as Node)) setCityOpen(false);
            if (companyRef.current && !companyRef.current.contains(e.target as Node)) setCompanyOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const states = useMemo(() => Array.from(new Set(features.map(f => f.properties.state))).sort(), [features]);
    const cities = useMemo(() => Array.from(new Set(
        features.filter(f => !filterState || f.properties.state === filterState).map(f => f.properties.city)
    )).sort(), [features, filterState]);
    const companies = useMemo(() => Array.from(new Set(
        features.filter(f =>
            (!filterState || f.properties.state === filterState) &&
            (!filterCity || f.properties.city === filterCity)
        ).map(f => f.properties.company || f.properties.type || 'Unknown')
    )).filter(c => c !== 'Unknown').sort(), [features, filterState, filterCity]);

    const filtered = useMemo(() => {
        const q = search.toLowerCase();
        return features.filter(f => {
            const p = f.properties;
            const name = p.dc_name || p.airport_name || '';
            const comp = p.company || p.type || '';
            const matchQ = !q || name.toLowerCase().includes(q) || comp.toLowerCase().includes(q)
                || p.city.toLowerCase().includes(q) || p.state.toLowerCase().includes(q);
            const matchState = !filterState || p.state === filterState;
            const matchCity = !filterCity || p.city === filterCity;
            const matchCompany = !filterCompany || comp === filterCompany;
            return matchQ && matchState && matchCity && matchCompany;
        });
    }, [features, search, filterState, filterCity, filterCompany]);

    const suggestions = useMemo(() => {
        if (!search.trim()) return [];
        return filtered.slice(0, 6);
    }, [filtered, search]);

    const hasFilters = !!(filterState || filterCity || filterCompany || search);
    const clearAll = () => { setSearch(''); setFilterState(''); setFilterCity(''); setFilterCompany(''); onSelectDC(null); };

    if (collapsed) {
        return (
            <button
                onClick={() => setCollapsed(false)}
                style={{
                    display: 'flex', alignItems: 'center', gap: '8px', pointerEvents: 'auto',
                    background: '#0f172a', color: '#fff', border: 'none',
                    borderRadius: '12px', padding: '10px 14px',
                    cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600,
                    fontSize: '13px', boxShadow: '0 8px 32px rgba(15,23,42,0.25)',
                }}
            >
                {activeAssetType === 'datacenter' ? <Building size={14} color="#60a5fa" /> : <PlaneTakeoff size={14} color="#34d399" />}
                Explore {activeAssetType === 'datacenter' ? 'DCs' : 'Airports'}
            </button>
        );
    }

    return (
        <aside className="anim-fade-slide-in" style={{
            height: '100%',
            width: '100%',
            zIndex: 20,
            display: 'flex',
            flexDirection: 'column',
            background: '#fff',
            borderRadius: '18px',
            boxShadow: '0 8px 40px rgba(15,23,42,0.14), 0 2px 8px rgba(15,23,42,0.07)',
            border: '1px solid rgba(226,232,240,0.8)',
            overflow: 'hidden',
            fontFamily: "'DM Sans', system-ui, sans-serif",
            pointerEvents: 'auto',
        }}>

            {/* ── Panel Header ── */}
            <div style={{
                padding: '14px 16px 0',
                background: 'linear-gradient(180deg, #f8fafc 0%, #fff 100%)',
                flexShrink: 0,
            }}>
                {/* ── Segmented Toggle Layer ── */}
                <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: '12px', padding: '4px', marginBottom: '16px' }}>
                    <button
                        onClick={() => { onToggleAsset('datacenter'); onSelectDC(null); }}
                        style={{
                            flex: 1, padding: '7px', border: 'none', borderRadius: '9px',
                            background: activeAssetType === 'datacenter' ? '#fff' : 'transparent',
                            color: activeAssetType === 'datacenter' ? '#0f172a' : '#64748b',
                            fontWeight: 700, fontSize: '11px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                            boxShadow: activeAssetType === 'datacenter' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none', transition: 'all 0.2s', fontFamily: 'inherit'
                        }}
                    >
                        <Building size={12} color={activeAssetType === 'datacenter' ? '#3b82f6' : '#94a3b8'} /> Datacenters
                    </button>
                    <button
                        onClick={() => { onToggleAsset('airport'); onSelectDC(null); }}
                        style={{
                            flex: 1, padding: '7px', border: 'none', borderRadius: '9px',
                            background: activeAssetType === 'airport' ? '#fff' : 'transparent',
                            color: activeAssetType === 'airport' ? '#0f172a' : '#64748b',
                            fontWeight: 700, fontSize: '11px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                            boxShadow: activeAssetType === 'airport' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none', transition: 'all 0.2s', fontFamily: 'inherit'
                        }}
                    >
                        <PlaneTakeoff size={12} color={activeAssetType === 'airport' ? '#10b981' : '#94a3b8'} /> Airports
                    </button>
                </div>

                {/* Title row */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <div>
                        <p style={{ fontSize: '10px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: '2px' }}>
                            Analytics Panel
                        </p>
                        <h2 style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>
                            {filterState ? filterState : 'All India'}
                        </h2>
                    </div>
                    <button
                        onClick={() => setCollapsed(true)}
                        style={{ background: '#f1f5f9', border: 'none', borderRadius: '9px', padding: '6px', cursor: 'pointer', color: '#94a3b8', display: 'flex', lineHeight: 0 }}
                        title="Collapse panel"
                    >
                        <X size={14} />
                    </button>
                </div>

                {/* Search bar */}
                <div style={{ position: 'relative', marginBottom: '8px' }}>
                    <Search size={13} color="#94a3b8" style={{ position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                    <input
                        ref={searchRef}
                        type="text"
                        placeholder="Search datacenters, companies, cities…"
                        value={search}
                        onChange={e => { setSearch(e.target.value); setShowSuggestions(true); }}
                        onFocus={() => setShowSuggestions(true)}
                        onBlur={() => setTimeout(() => setShowSuggestions(false), 180)}
                        style={{
                            width: '100%', padding: '9px 34px 9px 34px',
                            borderRadius: '10px', fontFamily: 'inherit',
                            border: '1.5px solid #e2e8f0', fontSize: '12.5px',
                            background: '#f8fafc', color: '#0f172a', outline: 'none',
                            transition: 'border-color 0.15s, box-shadow 0.15s',
                        }}
                        onMouseEnter={e => { (e.target as HTMLInputElement).style.borderColor = '#bfdbfe'; }}
                        onMouseLeave={e => { if (document.activeElement !== e.target) (e.target as HTMLInputElement).style.borderColor = '#e2e8f0'; }}
                    />
                    {search && (
                        <button onClick={() => setSearch('')} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '2px', lineHeight: 0 }}>
                            <X size={12} />
                        </button>
                    )}

                    {/* Search suggestions dropdown */}
                    {showSuggestions && suggestions.length > 0 && (
                        <div style={{
                            position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
                            background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px',
                            boxShadow: '0 12px 32px rgba(0,0,0,0.12)', zIndex: 999, overflow: 'hidden',
                        }}>
                            <p style={{ padding: '6px 12px', fontSize: '9.5px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', borderBottom: '1px solid #f1f5f9' }}>
                                Top matches
                            </p>
                            {suggestions.map(f => {
                                const id = getDCId(f);
                                return (
                                    <div key={id}
                                        onMouseDown={() => { onSelectDC(id); setSearch(f.properties.dc_name || f.properties.airport_name || ''); setShowSuggestions(false); }}
                                        style={{ padding: '9px 12px', cursor: 'pointer', borderBottom: '1px solid #f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                                        onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')}
                                        onMouseLeave={e => (e.currentTarget.style.background = '#fff')}
                                    >
                                        <div>
                                            <p style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a', marginBottom: '1px' }}>
                                                <Highlight text={f.properties.dc_name || f.properties.airport_name || ''} query={search} />
                                            </p>
                                            <p style={{ fontSize: '10.5px', color: '#94a3b8' }}>
                                                <Highlight text={f.properties.company || f.properties.type || ''} query={search} /> · {f.properties.city}
                                            </p>
                                        </div>
                                        <MapPin size={11} color="#bfdbfe" />
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Filter row */}
                <div style={{ display: 'flex', gap: '6px', paddingBottom: '12px' }}>

                    {/* State filter */}
                    <div ref={stateRef} style={{ flex: 1, position: 'relative' }}>
                        <button
                            onClick={() => { setStateOpen(v => !v); setCityOpen(false); }}
                            style={{
                                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                padding: '7px 10px', borderRadius: '9px', fontFamily: 'inherit',
                                border: `1.5px solid ${filterState ? '#bfdbfe' : '#e2e8f0'}`,
                                background: filterState ? '#eff6ff' : '#f8fafc',
                                color: filterState ? '#1d4ed8' : '#64748b',
                                fontSize: '12px', fontWeight: filterState ? 700 : 500, cursor: 'pointer', outline: 'none',
                            }}
                        >
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '95px' }}>
                                {filterState || 'All States'}
                            </span>
                            <ChevronDown size={11} color={filterState ? '#1d4ed8' : '#94a3b8'} style={{ flexShrink: 0, transition: 'transform 0.15s', transform: stateOpen ? 'rotate(180deg)' : 'none' }} />
                        </button>
                        {stateOpen && (
                            <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', boxShadow: '0 12px 32px rgba(0,0,0,0.11)', zIndex: 999, maxHeight: '220px', overflowY: 'auto' }}>
                                <div onClick={() => { setFilterState(''); setFilterCity(''); setStateOpen(false); onSelectDC(null); }}
                                    style={{ padding: '8px 12px', fontSize: '12px', fontWeight: 500, color: !filterState ? '#1d4ed8' : '#64748b', background: !filterState ? '#eff6ff' : '#fff', cursor: 'pointer' }}
                                    onMouseEnter={e => { if (filterState) e.currentTarget.style.background = '#f8fafc'; }}
                                    onMouseLeave={e => { if (filterState) e.currentTarget.style.background = '#fff'; }}>
                                    All States
                                </div>
                                {states.map(s => (
                                    <div key={s} onClick={() => { setFilterState(s); setFilterCity(''); setStateOpen(false); onSelectDC(null); }}
                                        style={{ padding: '8px 12px', fontSize: '12px', fontWeight: filterState === s ? 700 : 400, color: filterState === s ? '#1d4ed8' : '#334155', background: filterState === s ? '#eff6ff' : '#fff', cursor: 'pointer', borderTop: '1px solid #f8fafc' }}
                                        onMouseEnter={e => { if (filterState !== s) e.currentTarget.style.background = '#f8fafc'; }}
                                        onMouseLeave={e => { if (filterState !== s) e.currentTarget.style.background = '#fff'; }}>
                                        {s}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* City filter */}
                    <div ref={cityRef} style={{ flex: 1, position: 'relative' }}>
                        <button
                            onClick={() => { if (filterState || cities.length <= 60) { setCityOpen(v => !v); setStateOpen(false); } }}
                            style={{
                                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                padding: '7px 10px', borderRadius: '9px', fontFamily: 'inherit',
                                border: `1.5px solid ${filterCity ? '#bfdbfe' : '#e2e8f0'}`,
                                background: filterCity ? '#eff6ff' : '#f8fafc',
                                color: filterCity ? '#1d4ed8' : '#64748b',
                                fontSize: '12px', fontWeight: filterCity ? 700 : 500,
                                cursor: (!filterState && cities.length > 60) ? 'not-allowed' : 'pointer',
                                outline: 'none', opacity: (!filterState && cities.length > 60) ? 0.45 : 1,
                            }}
                        >
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '95px' }}>
                                {filterCity || 'All Cities'}
                            </span>
                            <ChevronDown size={11} color={filterCity ? '#1d4ed8' : '#94a3b8'} style={{ flexShrink: 0, transition: 'transform 0.15s', transform: cityOpen ? 'rotate(180deg)' : 'none' }} />
                        </button>
                        {cityOpen && (
                            <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', boxShadow: '0 12px 32px rgba(0,0,0,0.11)', zIndex: 999, maxHeight: '220px', overflowY: 'auto' }}>
                                <div onClick={() => { setFilterCity(''); setCityOpen(false); onSelectDC(null); }}
                                    style={{ padding: '8px 12px', fontSize: '12px', fontWeight: 500, color: !filterCity ? '#1d4ed8' : '#64748b', background: !filterCity ? '#eff6ff' : '#fff', cursor: 'pointer' }}
                                    onMouseEnter={e => { if (filterCity) e.currentTarget.style.background = '#f8fafc'; }}
                                    onMouseLeave={e => { if (filterCity) e.currentTarget.style.background = '#fff'; }}>
                                    All Cities
                                </div>
                                {cities.map(c => (
                                    <div key={c} onClick={() => { setFilterCity(c); setCityOpen(false); onSelectDC(null); }}
                                        style={{ padding: '8px 12px', fontSize: '12px', fontWeight: filterCity === c ? 700 : 400, color: filterCity === c ? '#1d4ed8' : '#334155', background: filterCity === c ? '#eff6ff' : '#fff', cursor: 'pointer', borderTop: '1px solid #f8fafc' }}
                                        onMouseEnter={e => { if (filterCity !== c) e.currentTarget.style.background = '#f8fafc'; }}
                                        onMouseLeave={e => { if (filterCity !== c) e.currentTarget.style.background = '#fff'; }}>
                                        {c}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Company filter */}
                    <div ref={companyRef} style={{ flex: 1, position: 'relative' }}>
                        <button
                            onClick={() => { if (companies.length > 0) { setCompanyOpen(v => !v); setStateOpen(false); setCityOpen(false); } }}
                            style={{
                                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                padding: '7px 10px', borderRadius: '9px', fontFamily: 'inherit',
                                border: `1.5px solid ${filterCompany ? '#bfdbfe' : '#e2e8f0'}`,
                                background: filterCompany ? '#eff6ff' : '#f8fafc',
                                color: filterCompany ? '#1d4ed8' : '#64748b',
                                fontSize: '12px', fontWeight: filterCompany ? 700 : 500,
                                cursor: companies.length > 0 ? 'pointer' : 'not-allowed',
                                outline: 'none', opacity: companies.length > 0 ? 1 : 0.45,
                            }}
                        >
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '65px' }}>
                                {filterCompany || 'All Orgs'}
                            </span>
                            <ChevronDown size={11} color={filterCompany ? '#1d4ed8' : '#94a3b8'} style={{ flexShrink: 0, transition: 'transform 0.15s', transform: companyOpen ? 'rotate(180deg)' : 'none' }} />
                        </button>
                        {companyOpen && (
                            <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', boxShadow: '0 12px 32px rgba(0,0,0,0.11)', zIndex: 999, maxHeight: '220px', overflowY: 'auto' }}>
                                <div onClick={() => { setFilterCompany(''); setCompanyOpen(false); onSelectDC(null); }}
                                    style={{ padding: '8px 12px', fontSize: '12px', fontWeight: 500, color: !filterCompany ? '#1d4ed8' : '#64748b', background: !filterCompany ? '#eff6ff' : '#fff', cursor: 'pointer' }}
                                    onMouseEnter={e => { if (filterCompany) e.currentTarget.style.background = '#f8fafc'; }}
                                    onMouseLeave={e => { if (filterCompany) e.currentTarget.style.background = '#fff'; }}>
                                    All Orgs
                                </div>
                                {companies.map(c => (
                                    <div key={c} onClick={() => { setFilterCompany(c); setCompanyOpen(false); onSelectDC(null); }}
                                        style={{ padding: '8px 12px', fontSize: '12px', fontWeight: filterCompany === c ? 700 : 400, color: filterCompany === c ? '#1d4ed8' : '#334155', background: filterCompany === c ? '#eff6ff' : '#fff', cursor: 'pointer', borderTop: '1px solid #f8fafc', wordBreak: 'break-word' }}
                                        onMouseEnter={e => { if (filterCompany !== c) e.currentTarget.style.background = '#f8fafc'; }}
                                        onMouseLeave={e => { if (filterCompany !== c) e.currentTarget.style.background = '#fff'; }}>
                                        {c}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Thin bottom border */}
                <div style={{ height: '1px', background: '#f1f5f9', marginLeft: '-16px', marginRight: '-16px' }} />
            </div>

            {/* ── State Briefing ── */}
            {filterState && (
                <div style={{ borderBottom: '1px solid #f1f5f9', flexShrink: 0 }}>
                    <StateBriefing
                        features={features}
                        state={filterState}
                        onClear={() => { setFilterState(''); setFilterCity(''); setFilterCompany(''); }}
                        activeAssetType={activeAssetType}
                    />
                </div>
            )}



            {/* ── Count bar ── */}
            <div style={{ padding: '8px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fafbfc', flexShrink: 0, borderBottom: '1px solid #f1f5f9', marginTop: hasFilters ? '0' : '10px' }}>
                <p style={{ fontSize: '11px', color: '#94a3b8' }}>
                    {hasFilters
                        ? <><span style={{ color: '#2563eb', fontWeight: 700 }}>{filtered.length}</span> {activeAssetType === 'datacenter' ? 'datacenters' : 'airports'} matched</>
                        : <><span style={{ color: '#2563eb', fontWeight: 700 }}>{features.length}</span> total across India</>
                    }
                </p>
                {hasFilters && (
                    <button onClick={clearAll} style={{ fontSize: '10px', color: '#dc2626', fontWeight: 700, background: '#fee2e2', border: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: '3px 9px', borderRadius: '6px' }}>
                        Clear All
                    </button>
                )}
            </div>

            {/* ── DC List ── */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '6px 8px 10px' }}>
                {filtered.map(feature => {
                    const id = getDCId(feature);
                    const p = feature.properties;
                    const isSelected = selectedId === id;

                    return (
                        <div
                            key={id}
                            onClick={() => onSelectDC(id)}
                            style={{
                                padding: '11px 12px',
                                borderRadius: '11px',
                                marginBottom: '3px',
                                background: isSelected ? 'linear-gradient(135deg, #eff6ff, #f0f9ff)' : '#fff',
                                border: `1px solid ${isSelected ? '#bfdbfe' : 'transparent'}`,
                                borderLeft: `3px solid ${isSelected ? '#2563eb' : 'transparent'}`,
                                cursor: 'pointer',
                                transition: 'all 0.12s ease',
                                boxShadow: isSelected ? '0 2px 12px rgba(37,99,235,0.10)' : 'none',
                            }}
                            onMouseEnter={e => {
                                if (!isSelected) {
                                    e.currentTarget.style.background = '#f8fafc';
                                    e.currentTarget.style.borderColor = '#e2e8f0';
                                    e.currentTarget.style.borderLeftColor = '#cbd5e1';
                                    e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.05)';
                                }
                            }}
                            onMouseLeave={e => {
                                if (!isSelected) {
                                    e.currentTarget.style.background = '#fff';
                                    e.currentTarget.style.borderColor = 'transparent';
                                    e.currentTarget.style.borderLeftColor = 'transparent';
                                    e.currentTarget.style.boxShadow = 'none';
                                }
                            }}
                        >
                            {/* Name + link */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '6px', marginBottom: '3px' }}>
                                <p style={{ fontSize: '12.5px', fontWeight: 700, color: '#0f172a', lineHeight: 1.3, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' } as any}>
                                    <Highlight text={p.dc_name || p.airport_name || ''} query={search} />
                                </p>
                                <Link
                                    href={`/asset/${id}?type=${activeAssetType}`}
                                    onClick={e => e.stopPropagation()}
                                    style={{ color: '#2563eb', flexShrink: 0, marginTop: '2px', lineHeight: 0, background: '#eff6ff', borderRadius: '6px', padding: '3px' }}
                                >
                                    <ArrowUpRight size={11} />
                                </Link>
                            </div>

                            {/* Company + location */}
                            <p style={{ fontSize: '10.5px', color: '#64748b', marginBottom: '8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {activeAssetType === 'datacenter' ? (
                                    <Highlight text={p.company || ''} query={search} />
                                ) : (
                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                        {p.type} {p.is_notable_green && <ShieldCheck size={12} color="#10b981" />}
                                    </span>
                                )}
                                <span style={{ color: '#cbd5e1', margin: '0 4px' }}>·</span>
                                <Highlight text={p.city} query={search} />
                                <span style={{ color: '#cbd5e1', margin: '0 4px' }}>·</span>
                                {p.state}
                            </p>

                        </div>
                    );
                })}

                {filtered.length === 0 && (
                    <div style={{ padding: '48px 20px', textAlign: 'center' }}>
                        <div style={{ fontSize: '40px', marginBottom: '12px' }}>🔍</div>
                        <p style={{ fontSize: '14px', fontWeight: 700, color: '#334155', marginBottom: '5px' }}>No results</p>
                        <p style={{ fontSize: '11.5px', color: '#94a3b8' }}>Try adjusting your search or filters</p>
                    </div>
                )}
            </div>
        </aside>
    );
}
