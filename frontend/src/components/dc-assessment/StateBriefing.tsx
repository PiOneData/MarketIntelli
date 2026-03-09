import { useMemo } from 'react';
import { AssetFeature, AssetType } from '../../types/dc';
import { X, MapPin } from 'lucide-react';

interface StateBriefingProps {
    features: AssetFeature[];
    state: string;
    onClear: () => void;
    activeAssetType?: AssetType;
}



export default function StateBriefing({ features, state, onClear, activeAssetType }: StateBriefingProps) {
    const stats = useMemo(() => {
        const stateDCs = features.filter(f => f.properties.state === state);
        if (stateDCs.length === 0) return null;

        const cityCounts: Record<string, number> = {};
        stateDCs.forEach(f => {
            cityCounts[f.properties.city] = (cityCounts[f.properties.city] || 0) + 1;
        });
        const sortedCities = Object.entries(cityCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);
        const maxCount = sortedCities[0]?.[1] ?? 1;

        return {
            total: stateDCs.length,
            cities: sortedCities,
            maxCount,
        };
    }, [features, state]);

    if (!stats) return null;

    return (
        <div className="anim-fade-slide-in" style={{
            margin: '0 12px 10px',
            background: '#fff',
            border: '1px solid #d6eeeb',
            borderLeft: '3px solid #0d7a6e',
            borderRadius: '10px',
            padding: '14px',
            boxShadow: '0 2px 8px rgba(13,122,110,0.07)',
        }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <MapPin size={11} color="#2563eb" />
                        <span style={{ fontSize: '11px', fontWeight: 700, color: '#0d7a6e', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{state}</span>
                    </div>
                    <p style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', lineHeight: 1.2 }}>{stats.total} <span style={{ fontSize: '12px', fontWeight: 500, color: '#64748b' }}>{activeAssetType === 'airport' ? 'Airports' : 'Datacenters'}</span></p>
                </div>
                <button onClick={onClear} style={{ background: '#f1f5f9', border: 'none', borderRadius: '6px', padding: '5px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px', fontSize: '10px', fontWeight: 600, color: '#64748b', fontFamily: 'inherit' }}>
                    <X size={10} /> Clear
                </button>
            </div>

            {/* City Distribution Bar Chart */}
            <div style={{ marginBottom: '12px' }}>
                <p style={{ fontSize: '10px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>City Distribution</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    {stats.cities.map(([city, count]) => (
                        <div key={city} style={{ display: 'grid', gridTemplateColumns: '76px 1fr 20px', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '10px', fontWeight: 600, color: '#334155', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'right' }}>{city}</span>
                            <div style={{ height: '6px', background: '#f1f5f9', borderRadius: '99px', overflow: 'hidden' }}>
                                <div style={{ height: '100%', width: `${(count / stats.maxCount) * 100}%`, background: 'linear-gradient(90deg, #0d7a6e, #0f9b8c)', borderRadius: '99px', transition: 'width 0.5s ease' }} />
                            </div>
                            <span style={{ fontSize: '10px', fontWeight: 700, color: '#64748b' }}>{count}</span>
                        </div>
                    ))}
                </div>
            </div>

        </div>
    );
}
