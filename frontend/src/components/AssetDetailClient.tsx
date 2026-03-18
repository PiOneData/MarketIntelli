'use client';

import { useEffect, useState } from 'react';
import { AssetFeature, AssetGeoJSON, SolarAssessment, WindAssessment, WaterAssessment, AssetType } from '@/types/dc';
import { getGWColor, getRiskDescription, formatNum, MONTHS, getRatingColor, getWindGradeColor } from '@/lib/utils';
import Link from 'next/link';
import { ArrowLeft, ExternalLink, Building2, Zap, Droplets, Sun, Wind, CloudRain, Calendar, Waves, PlaneTakeoff, ShieldCheck, X, Search, Info, HelpCircle, FileText, Loader2 } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';

const MiniMap = dynamic(() => import('@/components/MiniMap'), { ssr: false });

// ─── Count-up hook ────────────────────────────────────────────────────────────
function useCountUp(target: number, duration = 1200, delay = 0) {
    const [value, setValue] = useState(0);
    useEffect(() => {
        const t = setTimeout(() => {
            const start = performance.now();
            const tick = (now: number) => {
                const p = Math.min(1, (now - start) / duration);
                const e = 1 - Math.pow(1 - p, 3);
                setValue(target * e);
                if (p < 1) requestAnimationFrame(tick);
            };
            requestAnimationFrame(tick);
        }, delay);
        return () => clearTimeout(t);
    }, [target, duration, delay]);
    return value;
}

// ─── Animated entrance card ───────────────────────────────────────────────────
function AnimCard({ children, delay = 0, style }: { children: React.ReactNode; delay?: number; style?: React.CSSProperties }) {
    const [visible, setVisible] = useState(false);
    useEffect(() => { const t = setTimeout(() => setVisible(true), delay); return () => clearTimeout(t); }, [delay]);
    return (
        <div style={{ background: '#fff', borderRadius: '20px', padding: '24px', boxShadow: '0 4px 24px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9', opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(20px)', transition: 'opacity 0.5s ease, transform 0.5s ease', display: 'flex', flexDirection: 'column', height: '100%', ...style }}>
            {children}
        </div>
    );
}

// ─── Rating badge ─────────────────────────────────────────────────────────────
function RatingBadge({ rating, size = 'sm' }: { rating: string; size?: 'sm' | 'lg' }) {
    const c = getRatingColor(rating);
    return (
        <span style={{ display: 'inline-flex', alignItems: 'center', padding: size === 'lg' ? '8px 18px' : '4px 10px', borderRadius: '99px', background: c.bg, color: c.accent, fontSize: size === 'lg' ? '14px' : '11px', fontWeight: 800, border: `1.5px solid ${c.border}`, letterSpacing: '0.5px' }}>
            {rating}
        </span>
    );
}

// ─── Section header ───────────────────────────────────────────────────────────
function SectionHeader({ icon, title, subtitle, badge }: { icon: React.ReactNode; title: string; subtitle?: string; badge?: React.ReactNode }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #f1f5f9' }}>
                    {icon}
                </div>
                <div>
                    <h2 style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>{title}</h2>
                    {subtitle && <p style={{ fontSize: '11px', color: '#94a3b8', marginTop: '1px' }}>{subtitle}</p>}
                </div>
            </div>
            {badge}
        </div>
    );
}

// ─── Metric tile ──────────────────────────────────────────────────────────────
function MetricTile({ label, value, color, sub }: { label: string; value: string; color?: string; sub?: string }) {
    return (
        <div style={{ background: color ? color + '10' : '#f8fafc', borderRadius: '10px', padding: '12px', border: color ? `1px solid ${color}30` : 'none' }}>
            <p style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 600, marginBottom: '5px' }}>{label}</p>
            <p style={{ fontSize: '15px', fontWeight: 800, color: color ?? '#0f172a', lineHeight: 1 }}>{value}</p>
            {sub && <p style={{ fontSize: '10px', color: '#cbd5e1', marginTop: '3px' }}>{sub}</p>}
        </div>
    );
}

// ─── Horizontal bar ──────────────────────────────────────────────────────────
function ProgressBar({ value, max, color, label, valueLabel }: { value: number; max: number; color: string; label: string; valueLabel: string }) {
    const [width, setWidth] = useState(0);
    useEffect(() => { const t = setTimeout(() => setWidth(Math.min(100, (value / max) * 100)), 400); return () => clearTimeout(t); }, [value, max]);
    return (
        <div style={{ marginBottom: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>{label}</span>
                <span style={{ fontSize: '12px', fontWeight: 700, color }}>{valueLabel}</span>
            </div>
            <div style={{ height: '6px', background: '#f1f5f9', borderRadius: '99px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${width}%`, background: color, borderRadius: '99px', transition: 'width 1.2s cubic-bezier(0.34,1.56,0.64,1)' }} />
            </div>
        </div>
    );
}

// ─── Gauge ───────────────────────────────────────────────────────────────────
function GaugeSVG({ pct, color, max = 250 }: { pct: number; color: string; max?: number }) {
    const fraction = Math.min(pct, max) / max;
    const r = 48; const cx = 64; const cy = 60;
    const circ = 2 * Math.PI * r;
    const offset = circ * (1 - fraction * 0.75);
    return (
        <svg width={128} height={90} viewBox="0 0 128 90">
            <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f1f5f9" strokeWidth="9" strokeDasharray={`${circ * 0.75} ${circ * 0.25}`} strokeLinecap="round" transform={`rotate(135 ${cx} ${cy})`} />
            <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth="9" strokeDasharray={`${circ}`} strokeDashoffset={offset} strokeLinecap="round" transform={`rotate(135 ${cx} ${cy})`} style={{ transition: 'stroke-dashoffset 1.4s cubic-bezier(0.34,1.56,0.64,1)' }} />
            <text x={cx} y={cy - 3} textAnchor="middle" fontSize="17" fontWeight="800" fill={color} fontFamily="Inter">{pct.toFixed(1)}%</text>
            <text x={cx} y={cy + 13} textAnchor="middle" fontSize="8" fill="#94a3b8" fontFamily="Inter">EXTRACTION</text>
        </svg>
    );
}

function SolarMonthChart({ monthly }: { monthly: number[] }) {
    const max = Math.max(...monthly);
    const [shown, setShown] = useState(false);
    const [hoverIndex, setHoverIndex] = useState<number | null>(null);
    useEffect(() => { const t = setTimeout(() => setShown(true), 600); return () => clearTimeout(t); }, []);
    return (
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: '75px', paddingTop: '10px' }}>
            {monthly.map((val, i) => {
                const h = shown ? Math.max(4, (val / max) * 55) : 4;
                const isHovered = hoverIndex === i;
                return (
                    <div
                        key={i}
                        onMouseEnter={() => setHoverIndex(i)}
                        onMouseLeave={() => setHoverIndex(null)}
                        style={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px', cursor: 'pointer', opacity: hoverIndex !== null && hoverIndex !== i ? 0.4 : 1, transition: 'all 0.2s', transform: isHovered ? 'translateY(-3px)' : 'none' }}
                    >
                        {isHovered && (
                            <div style={{ position: 'absolute', top: '-25px', background: '#0f172a', color: '#fff', fontSize: '9px', padding: '3px 6px', borderRadius: '4px', fontWeight: 700, pointerEvents: 'none', whiteSpace: 'nowrap', zIndex: 10, boxShadow: '0 4px 10px rgba(0,0,0,0.2)' }}>
                                {val.toFixed(2)}
                            </div>
                        )}
                        <div style={{ width: '100%', height: `${h}px`, background: isHovered ? 'linear-gradient(to top, #f59e0b, #fef3c7)' : 'linear-gradient(to top, #f59e0b, #fcd34d)', borderRadius: '4px 4px 0 0', transition: `height 0.8s cubic-bezier(0.34,1.56,0.64,1) ${i * 40}ms, background 0.2s, box-shadow 0.2s`, boxShadow: isHovered ? '0 0 12px rgba(245,158,11,0.6)' : 'none' }} />
                        <span style={{ fontSize: '10px', color: isHovered ? '#f59e0b' : '#94a3b8', fontWeight: isHovered ? 800 : 700, transition: 'color 0.2s' }}>{MONTHS[i].charAt(0)}</span>
                    </div>
                );
            })}
        </div>
    );
}

// ─── Wind profile table ───────────────────────────────────────────────────────
function WindProfileTable({ profile }: { profile: WindAssessment['profile'] }) {
    const heights = ['10', '50', '100', '150', '200'] as const;
    const maxPD = Math.max(...heights.map(h => profile[h]?.pd ?? 0));
    return (
        <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead>
                    <tr style={{ background: '#f8fafc' }}>
                        {['Height', 'Wind Speed', 'Air Density', 'Power Density', 'Bar'].map(h => (
                            <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontSize: '10px', fontWeight: 700, color: '#94a3b8', borderBottom: '1px solid #f1f5f9' }}>{h}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {heights.map((h, i) => {
                        const row = profile[h];
                        const barW = row ? ((row.pd / maxPD) * 100) : 0;
                        const blue = `hsl(${220 - i * 15}, 80%, ${55 + i * 5}%)`;
                        return (
                            <tr key={h} style={{ borderBottom: '1px solid #f8fafc' }}>
                                <td style={{ padding: '9px 10px', fontWeight: 700, color: '#0f172a' }}>{h}m</td>
                                <td style={{ padding: '9px 10px', color: '#374151', fontWeight: 600 }}>{row ? `${row.ws.toFixed(2)} m/s` : 'N/A'}</td>
                                <td style={{ padding: '9px 10px', color: '#374151', fontWeight: 500 }}>{row ? `${row.ad.toFixed(3)} kg/m³` : 'N/A'}</td>
                                <td style={{ padding: '9px 10px', color: '#111827', fontWeight: 700 }}>{row ? `${row.pd.toFixed(1)} W/m²` : 'N/A'}</td>
                                <td style={{ padding: '9px 10px', width: '80px' }}>
                                    <div style={{ height: '6px', background: '#f1f5f9', borderRadius: '99px', overflow: 'hidden' }}>
                                        <div style={{ height: '100%', width: `${barW}%`, background: blue, borderRadius: '99px', transition: `width 1s ease ${i * 100}ms` }} />
                                    </div>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}

// ─── Glossary Modal Component ────────────────────────────────────────────────
const GLOSSARY = [
    // Solar Resource Assessment
    { cat: 'Solar', term: 'ghi (kWh/m²/day)', desc: 'Average daily solar radiation received on a horizontal surface. Primary indicator of solar energy availability at the site. Higher values indicate stronger solar resource and better PV potential.' },
    { cat: 'Solar', term: 'ghi_annual (kWh/m²/year)', desc: 'Total yearly solar radiation calculated from daily GHI. Represents long-term solar energy availability. Useful for annual generation estimates.' },
    { cat: 'Solar', term: 'gti (kWh/m²/day)', desc: 'Solar radiation incident on an optimally tilted panel surface. Accounts for tilt and orientation effects. Better predictor of PV panel performance than GHI.' },
    { cat: 'Solar', term: 'pvout (kWh/kWp/day)', desc: 'Daily electricity generation per installed kWp of PV capacity. Represents system productivity independent of plant size. Key planning metric for solar yield.' },
    { cat: 'Solar', term: 'pvout_annual (kWh/kWp/year)', desc: 'Annualized PV electricity production per kWp. Indicates yearly energy generation potential. Used for financial and capacity planning.' },
    { cat: 'Solar', term: 'optimal_tilt (degrees)', desc: 'Panel tilt angle that maximizes yearly solar capture. Depends on latitude and climate conditions. Guides PV mounting design.' },
    { cat: 'Solar', term: 'avg_temp (°C)', desc: 'Mean ambient air temperature. Higher temperatures slightly reduce PV efficiency. Important for performance correction.' },
    { cat: 'Solar', term: 'elevation (m)', desc: 'Site altitude above sea level. Influences atmospheric clarity and irradiance. Higher elevation often improves solar resource.' },
    { cat: 'Solar', term: 'slope (degrees)', desc: 'Terrain steepness within analysis buffer. Flatter terrain eases construction and panel layout. Steep slopes increase installation cost.' },
    { cat: 'Solar', term: 'aspect (degrees)', desc: 'Dominant terrain orientation relative to north. South-facing slopes (≈180°) favor solar exposure in Northern Hemisphere. Affects solar incidence angle.' },
    { cat: 'Solar', term: 'aod (optical depth)', desc: 'Atmospheric aerosol concentration reducing sunlight transmission. Higher AOD means more scattering and lower irradiance. Indicator of haze or pollution.' },
    { cat: 'Solar', term: 'aod_label (class)', desc: 'Qualitative air clarity class derived from AOD. Describes atmospheric transparency conditions. Helps interpret solar attenuation.' },
    { cat: 'Solar', term: 'cloud_pct (%)', desc: 'Average cloud cover fraction over analysis period. Clouds reduce solar irradiance reaching ground. Major driver of seasonal variability.' },
    { cat: 'Solar', term: 'cloud_label (class)', desc: 'Sky condition classification derived from cloud percentage. Indicates general cloudiness regime. Helps contextualize solar variability.' },
    { cat: 'Solar', term: 'era5_ghi (kWh/m²/day)', desc: 'Solar radiation from ERA5 climate reanalysis model. Independent dataset used for cross-validation. Provides climate-model reference value.' },
    { cat: 'Solar', term: 'era5_agreement (%)', desc: 'Agreement between ERA5 and Solar Atlas irradiance. High percentage indicates dataset consistency. Useful confidence indicator.' },
    { cat: 'Solar', term: 'monthly (kWh/kWp/day)', desc: 'Monthly PV output values from January to December. Shows seasonal solar variability pattern. Used for production planning.' },
    { cat: 'Solar', term: 'seasonal_range (kWh/kWp/day)', desc: 'Difference between highest and lowest monthly PV output. Measures seasonality strength. High values indicate monsoon or winter dip.' },
    { cat: 'Solar', term: 'seasonal_label (class)', desc: 'Seasonality classification derived from seasonal range. Describes stability of solar resource. Helps interpret variability risk.' },
    { cat: 'Solar', term: 'best_month (month)', desc: 'Month with highest PV output. Indicates peak solar production season. Useful for operational planning.' },
    { cat: 'Solar', term: 'worst_month (month)', desc: 'Month with lowest PV output. Indicates minimum solar availability period. Important for storage or backup sizing.' },
    { cat: 'Solar', term: 'score (0–100)', desc: 'Normalized solar suitability score from multi-factor model. Combines irradiance, cloud, aerosols, and terrain. Enables site comparison.' },
    { cat: 'Solar', term: 'rating (class)', desc: 'Solar resource class derived from score. Ranges from VERY POOR to WORLD-CLASS. Provides qualitative assessment.' },

    // Wind Resource Assessment
    { cat: 'Wind', term: 'profile[h].ws (m/s)', desc: 'Mean wind speed at hub height h (10–200 m). Primary driver of wind energy production. Higher speed greatly increases power output.' },
    { cat: 'Wind', term: 'profile[h].pd (W/m²)', desc: 'Wind power density at height h. Represents kinetic energy flux in wind. Standard metric for wind resource classification.' },
    { cat: 'Wind', term: 'profile[h].ad (kg/m³)', desc: 'Air density at height h. Denser air carries more kinetic energy. Affects turbine power output.' },
    { cat: 'Wind', term: 'cf3 (fraction)', desc: 'Capacity factor for IEC-III class turbine. Fraction of rated output achieved annually. Indicates wind farm productivity.' },
    { cat: 'Wind', term: 'cf3_pct (%)', desc: 'Capacity factor expressed as percentage. Easier interpretation of turbine utilization. Higher means better wind regime.' },
    { cat: 'Wind', term: 'rix (index)', desc: 'Terrain ruggedness index describing surface complexity. High ruggedness increases turbulence. Can reduce turbine efficiency.' },
    { cat: 'Wind', term: 'shear_alpha (–)', desc: 'Vertical wind shear exponent between 10 m and 100 m. Indicates how wind speed increases with height. Important for turbine hub selection.' },
    { cat: 'Wind', term: 'elevation (m)', desc: 'Terrain elevation above sea level. Influences air density and wind patterns. Higher elevation often improves wind exposure.' },
    { cat: 'Wind', term: 'slope (degrees)', desc: 'Terrain slope affecting flow acceleration or turbulence. Steep slopes can distort wind field. Impacts turbine placement.' },
    { cat: 'Wind', term: 'pd100 (W/m²)', desc: 'Wind power density at 100 m hub height. Standard reference for utility-scale turbines. Used in wind class grading.' },
    { cat: 'Wind', term: 'annual_mwh_2mw (MWh/year)', desc: 'Estimated annual energy from a 2 MW turbine. Derived from capacity factor. Practical generation indicator.' },
    { cat: 'Wind', term: 'grade (class)', desc: 'Wind resource class from A+ to F based on power density. Indicates commercial viability. Standard wind atlas classification.' },
    { cat: 'Wind', term: 'grade_label (text)', desc: 'Descriptive interpretation of wind grade. Explains expected feasibility. Helps non-technical users.' },
    { cat: 'Wind', term: 'score (0–100)', desc: 'Normalized wind suitability score combining speed, density, turbulence, and capacity factor. Enables cross-site comparison. Quantifies wind potential.' },
    { cat: 'Wind', term: 'rating (class)', desc: 'Wind suitability category from VERY POOR to EXCELLENT. Qualitative summary of wind resource. Supports decision making.' },

    // Water & Hydrology Assessment
    { cat: 'Water', term: 'precip_daily (mm/day)', desc: 'Average daily precipitation over analysis period. Primary indicator of water input to region. Higher values improve water availability.' },
    { cat: 'Water', term: 'precip_annual (mm/year)', desc: 'Annual rainfall derived from daily precipitation. Indicates long-term water supply. Important for sustainability assessment.' },
    { cat: 'Water', term: 'occurrence (%)', desc: 'Frequency of surface water presence from satellite history. Measures persistence of water bodies. Proxy for surface water reliability.' },
    { cat: 'Water', term: 'flood_risk (class)', desc: 'Flood susceptibility derived from surface water extent. Indicates likelihood of inundation. Important for infrastructure risk.' },
    { cat: 'Water', term: 'soil_0_10 (kg/m²)', desc: 'Soil moisture in top 10 cm layer. Reflects immediate water availability. Influences evaporation and vegetation.' },
    { cat: 'Water', term: 'soil_10_40 (kg/m²)', desc: 'Soil moisture in 10–40 cm layer. Represents intermediate storage. Important for plant and shallow aquifer recharge.' },
    { cat: 'Water', term: 'soil_40_100 (kg/m²)', desc: 'Deep soil moisture content. Indicates long-term water storage. Linked to groundwater recharge.' },
    { cat: 'Water', term: 'root_zone (kg/m²)', desc: 'Integrated soil moisture in root zone depth. Represents plant-available water. Proxy for ecosystem moisture.' },
    { cat: 'Water', term: 'deficit (mm)', desc: 'Climatic water deficit (PET minus precipitation). Indicates unmet atmospheric demand. High deficit means water stress.' },
    { cat: 'Water', term: 'deficit_label (class)', desc: 'Qualitative water stress category from deficit. Describes hydrological stress level. Aids interpretation.' },
    { cat: 'Water', term: 'runoff (mm)', desc: 'Surface runoff amount. Portion of rainfall leaving as flow. Indicates drainage and flood potential.' },
    { cat: 'Water', term: 'pet (mm)', desc: 'Potential evapotranspiration. Atmospheric demand for water. Climatic dryness indicator.' },
    { cat: 'Water', term: 'aet (mm)', desc: 'Actual evapotranspiration. Real water loss to atmosphere. Reflects soil moisture limitation.' },
    { cat: 'Water', term: 'aridity (ratio)', desc: 'Ratio of precipitation to PET. Measures climatic dryness. Low values indicate arid conditions.' },
    { cat: 'Water', term: 'pdsi (index)', desc: 'Palmer Drought Severity Index. Standard drought/wetness indicator. Integrates temperature and rainfall.' },
    { cat: 'Water', term: 'pdsi_label (class)', desc: 'Qualitative drought classification from PDSI. Indicates wet or dry regime. Helps contextualize hydrology.' },
    { cat: 'Water', term: 'lwe (cm)', desc: 'GRACE satellite groundwater storage anomaly. Change in total water mass. Indicates depletion or surplus.' },
    { cat: 'Water', term: 'grace_label (class)', desc: 'Groundwater trend classification from LWE. Shows storage gain or loss. Long-term sustainability indicator.' },
    { cat: 'Water', term: 'ndwi (index)', desc: 'Normalized Difference Water Index from Landsat. Detects surface water presence. Local water indicator.' },
    { cat: 'Water', term: 'score (0–100)', desc: 'Normalized water suitability score combining precipitation, groundwater, deficit, and soil moisture. Measures water sustainability. Enables comparison.' },
    { cat: 'Water', term: 'rating (class)', desc: 'Water availability class from CRITICAL to ABUNDANT. Qualitative hydrological suitability. Decision support metric.' },

    // Overall Suitability
    { cat: 'Overall', term: 'overall_score (0–100)', desc: 'Composite suitability score combining solar (35%), wind (35%), and water (30%). Represents overall renewable feasibility. Primary site ranking metric.' },
    { cat: 'Overall', term: 'overall_rating (class)', desc: 'Overall site classification from CHALLENGING to PREMIUM SITE. Qualitative summary of renewable suitability. Supports decision making.' },
    { cat: 'Overall', term: 'solar_score (0–100)', desc: 'Solar component of overall suitability. Derived from solar model. Enables component comparison.' },
    { cat: 'Overall', term: 'wind_score (0–100)', desc: 'Wind component of overall suitability. Derived from wind model. Indicates wind contribution.' },
    { cat: 'Overall', term: 'water_score (0–100)', desc: 'Water component of overall suitability. Derived from hydrology model. Indicates sustainability.' },
    { cat: 'Overall', term: 'solar_rating (class)', desc: 'Solar qualitative class. Interprets solar score. Easy comparison across sites.' },
    { cat: 'Overall', term: 'wind_rating (class)', desc: 'Wind qualitative class. Interprets wind score. Indicates feasibility.' },
    { cat: 'Overall', term: 'water_rating (class)', desc: 'Water qualitative class. Interprets water score. Indicates availability' }
];

const LEGEND_TABS = [
    { key: 'Solar', label: 'Solar', icon: '☀️', bg: '#fef3c7', color: '#92400e', activeBg: '#f59e0b', activeColor: '#fff' },
    { key: 'Wind', label: 'Wind', icon: '💨', bg: '#eff6ff', color: '#1d4ed8', activeBg: '#3b82f6', activeColor: '#fff' },
    { key: 'Water', label: 'Water', icon: '💧', bg: '#ecfdf5', color: '#065f46', activeBg: '#10b981', activeColor: '#fff' },
    { key: 'Overall', label: 'Overall', icon: '⚡', bg: '#f1f5f9', color: '#64748b', activeBg: '#64748b', activeColor: '#fff' },
] as const;

function GlossaryModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
    const [search, setSearch] = useState('');
    const [activeTab, setActiveTab] = useState<'Solar' | 'Wind' | 'Water' | 'Overall'>('Solar');
    if (!isOpen) return null;

    const isSearching = search.trim().length > 0;
    const filtered = isSearching
        ? GLOSSARY.filter(g => g.term.toLowerCase().includes(search.toLowerCase()) || g.desc.toLowerCase().includes(search.toLowerCase()))
        : GLOSSARY.filter(g => g.cat === activeTab);

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(8px)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }} onClick={onClose}>
            <div style={{ background: '#fff', width: '100%', maxWidth: '650px', maxHeight: '85vh', borderRadius: '24px', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', animation: 'fadeSlideUp 0.3s ease-out' }} onClick={e => e.stopPropagation()}>
                <div style={{ padding: '24px 32px 18px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                        <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a' }}>Assessment Legend</h2>
                        <p style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>Definition of geospatial and meteorological terms</p>
                    </div>
                    <button onClick={onClose} style={{ background: '#f8fafc', border: 'none', borderRadius: '12px', padding: '8px', cursor: 'pointer', color: '#64748b' }}><X size={20} /></button>
                </div>
                <div style={{ padding: '16px 32px 0' }}>
                    <div style={{ position: 'relative', marginBottom: '16px' }}>
                        <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                        <input
                            placeholder="Search all terms..."
                            value={search} onChange={e => setSearch(e.target.value)}
                            style={{ width: '100%', padding: '12px 12px 12px 40px', borderRadius: '14px', border: '1px solid #e2e8f0', fontSize: '13px', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}
                        />
                    </div>
                    {!isSearching && (
                        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '2px' }}>
                            {LEGEND_TABS.map(tab => {
                                const isActive = activeTab === tab.key;
                                return (
                                    <button
                                        key={tab.key}
                                        onClick={() => setActiveTab(tab.key)}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: '6px',
                                            padding: '8px 16px', borderRadius: '10px', border: 'none',
                                            background: isActive ? tab.activeBg : tab.bg,
                                            color: isActive ? tab.activeColor : tab.color,
                                            fontSize: '12px', fontWeight: 700, cursor: 'pointer',
                                            whiteSpace: 'nowrap', transition: 'all 0.15s ease',
                                            boxShadow: isActive ? '0 2px 8px rgba(0,0,0,0.15)' : 'none',
                                            flexShrink: 0,
                                        }}
                                    >
                                        <span>{tab.icon}</span>
                                        {tab.label}
                                        <span style={{ fontSize: '10px', opacity: 0.8, marginLeft: '2px' }}>
                                            ({GLOSSARY.filter(g => g.cat === tab.key).length})
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
                <div style={{ flex: 1, overflowY: 'auto', padding: '12px 32px 32px' }}>
                    {filtered.map((g, i) => (
                        <div key={i} style={{ padding: '16px 0', borderBottom: i === filtered.length - 1 ? 'none' : '1px solid #f8fafc' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                                {isSearching && (
                                    <span style={{ fontSize: '9px', fontWeight: 800, padding: '2px 8px', borderRadius: '6px', background: g.cat === 'Solar' ? '#fef3c7' : g.cat === 'Wind' ? '#eff6ff' : g.cat === 'Water' ? '#ecfdf5' : '#f1f5f9', color: g.cat === 'Solar' ? '#92400e' : g.cat === 'Wind' ? '#1d4ed8' : g.cat === 'Water' ? '#065f46' : '#64748b', textTransform: 'uppercase' }}>{g.cat}</span>
                                )}
                                <h3 style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>{g.term}</h3>
                            </div>
                            <p style={{ fontSize: '12.5px', color: '#475569', lineHeight: 1.6 }}>{g.desc}</p>
                        </div>
                    ))}
                    {filtered.length === 0 && (
                        <div style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8' }}>
                            {isSearching ? `No terms found matching "${search}"` : 'No terms in this category'}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}


function WindProfileChart({ profile }: { profile: WindAssessment['profile'] }) {
    if (!profile) return null;
    const heights = ['10', '50', '100', '150', '200'] as const;
    const data = heights.map(h => ({
        height: `${h}m`,
        ws: Number(profile[h]?.ws?.toFixed(2) ?? 0),
        pd: Number(profile[h]?.pd?.toFixed(1) ?? 0),
        ad: Number(profile[h]?.ad?.toFixed(3) ?? 0)
    }));

    return (
        <div style={{ width: '100%', height: '260px', marginTop: '20px' }}>
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="height" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} dy={10} />
                    <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                    <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                    <Tooltip contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: '12px', fontWeight: 600 }} />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '15px' }} iconType="circle" />
                    <Line yAxisId="left" type="monotone" dataKey="ws" name="Wind Speed (m/s)" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, fill: '#fff', strokeWidth: 2 }} activeDot={{ r: 6 }} />
                    <Line yAxisId="right" type="monotone" dataKey="pd" name="Power Den. (W/m²)" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4, fill: '#fff', strokeWidth: 2 }} />
                    <Line yAxisId="left" type="monotone" dataKey="ad" name="Air Den. (kg/m³)" stroke="#10b981" strokeWidth={3} dot={{ r: 4, fill: '#fff', strokeWidth: 2 }} />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function AssetDetailClient({ id }: { id: string }) {
    const searchParams = useSearchParams();
    const type = searchParams.get('type') as AssetType | null;

    const [feature, setFeature] = useState<AssetFeature | null>(null);
    const [loading, setLoading] = useState(true);
    const [gaugeActive, setGaugeActive] = useState(false);
    const [activeTab, setActiveTab] = useState(0);
    const [glossaryOpen, setGlossaryOpen] = useState(false);
    const [metadata, setMetadata] = useState<any>(null);
    const [isGeneratingReport, setIsGeneratingReport] = useState(false);
    const [reportSuccess, setReportSuccess] = useState(false);

    // ── All hooks unconditionally first ──
    const gw = feature?.properties.local_analysis?.groundwater as any;
    const hasGW = gw && typeof gw.category === 'string';
    const ph = feature?.properties.local_analysis?.powerhouse;

    const capMW = useCountUp(ph?.cap_mw ?? 0, 1200, 300);
    const energyMU = useCountUp(ph?.energy_mu ?? 0, 1200, 400);
    const availMCM = useCountUp(hasGW ? gw.avail_mcm : 0, 1200, 600);

    useEffect(() => {
        Promise.all([
            fetch('/data/india_dc_288_combined.geojson').then(r => r.json()),
            fetch('/data/india_airports_unified.geojson').then(r => r.json()),
        ]).then(([dcData, aptData]: [AssetGeoJSON, AssetGeoJSON]) => {
            const currentMetadata = type === 'airport' ? aptData.metadata : dcData.metadata;
            setMetadata(currentMetadata);
            let found = null;
            if (type === 'airport') {
                found = aptData.features.find(f => String(f.properties.slno) === String(id)) || null;
            } else if (type === 'datacenter') {
                found = dcData.features.find(f => String(f.properties.slno) === String(id)) || null;
            } else {
                const dcFound = dcData.features.find(f => String(f.properties.slno) === String(id));
                const aptFound = aptData.features.find(f => String(f.properties.slno) === String(id));
                found = dcFound || aptFound || null;
            }
            setFeature(found);
            setLoading(false);
            setTimeout(() => setGaugeActive(true), 700);
        }).catch(() => {
            setLoading(false);
        });
    }, [id]);

    const handleGenerateReport = async () => {
        if (!feature) return;
        setIsGeneratingReport(true);
        try {
            const res = await fetch('/api/generate-report', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...feature.properties, lat: feature.geometry.coordinates[1], lon: feature.geometry.coordinates[0] })
            });
            if (!res.ok) throw new Error('Failed to generate report');

            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${(feature.properties.dc_name || feature.properties.airport_name || 'Site').replace(/\\s+/g, '_')}_Analysis.pdf`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            setReportSuccess(true);
            setTimeout(() => setReportSuccess(false), 3000);

        } catch (error) {
            console.error(error);
            const msg = error instanceof Error ? error.message : String(error);
            alert(`Failed to generate Assessment report: ${msg}`);
        } finally {
            setIsGeneratingReport(false);
        }
    };

    if (loading) return (
        <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px', background: '#f8fafc' }}>
            <div style={{ width: '40px', height: '40px', border: '4px solid #e2e8f0', borderTop: '4px solid #1e40af', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );

    if (!feature) return (
        <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px' }}>
            <p style={{ fontSize: '20px', fontWeight: 700 }}>Asset not found</p>
            <Link href="/" style={{ color: '#1e40af', fontWeight: 600 }}>← Back to Map</Link>
        </div>
    );

    const p = feature.properties;
    const [lon, lat] = feature.geometry.coordinates;
    const solar: SolarAssessment = p.solar;
    const wind: WindAssessment = p.wind;
    const water: WaterAssessment = p.water;
    const gwColors = hasGW ? getGWColor(gw.category) : getGWColor('');
    const extPct = hasGW ? (gw.ext_pct ?? 0) : 0;
    const phSafe = p.local_analysis?.powerhouse;

    const heroBg = !p.airport_name
        ? 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 55%, #1e40af 100%)' // DC Blue
        : p.is_notable_green
            ? 'linear-gradient(135deg, #0f172a 0%, #064e3b 55%, #047857 100%)' // Green Airport
            : 'linear-gradient(135deg, #0f172a 0%, #0369a1 55%, #0284c7 100%)'; // Normal Airport Light Blue

    return (
        <div style={{ minHeight: '100vh', background: '#f1f5f9', fontFamily: 'Inter, sans-serif' }}>

            {/* ── Navbar ── */}
            <nav style={{ background: '#fff', borderBottom: '1px solid #e2e8f0', padding: '0 32px', height: '58px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100, boxShadow: '0 1px 8px rgba(0,0,0,0.05)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#1e40af', textDecoration: 'none', fontWeight: 600, fontSize: '13px' }}>
                        <ArrowLeft size={15} /> Back to Map
                    </Link>
                    <button onClick={() => setGlossaryOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', padding: '6px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>
                        <HelpCircle size={14} /> View Legend
                    </button>
                    <button
                        onClick={handleGenerateReport}
                        disabled={isGeneratingReport || reportSuccess}
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', background: reportSuccess ? '#059669' : (isGeneratingReport ? '#e2e8f0' : '#1e3a8a'), color: (isGeneratingReport && !reportSuccess) ? '#94a3b8' : '#fff', border: 'none', padding: '6px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 700, cursor: (isGeneratingReport || reportSuccess) ? 'not-allowed' : 'pointer', transition: 'background 0.2s' }}
                    >
                        {isGeneratingReport ? <Loader2 size={14} className="animate-spin" style={{ animation: 'spin 1.5s linear infinite' }} /> : (reportSuccess ? <ShieldCheck size={14} /> : <FileText size={14} />)}
                        {isGeneratingReport ? 'Generating Assessment Report...' : (reportSuccess ? 'Report Downloaded!' : 'Generate Assessment Report')}
                    </button>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {p.airport_name ? <PlaneTakeoff size={15} color="#1e40af" /> : <Building2 size={15} color="#1e40af" />}
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>Geospatial Intelligence</span>
                </div>
                {(p.url || p.official_website) && (p.url !== 'Not Specified' && p.official_website !== 'Not Specified') && (
                    <a href={p.url || p.official_website || '#'} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#64748b', fontSize: '12px', textDecoration: 'none', fontWeight: 500 }}>
                        <ExternalLink size={13} /> Website
                    </a>
                )}
            </nav>

            <div style={{ maxWidth: '1340px', margin: '0 auto', padding: '28px 20px 48px' }}>


                {/* ══════════ HERO (Split: Info left · Map right) ══════════ */}
                <div style={{ background: heroBg, borderRadius: '24px', marginBottom: '22px', color: '#fff', position: 'relative', overflow: 'hidden', animation: 'fadeSlideUp 0.5s ease', display: 'flex', minHeight: '280px' }}>

                    {/* Decorative circles */}
                    <div style={{ position: 'absolute', top: '-60px', left: '-60px', width: '220px', height: '220px', borderRadius: '50%', background: 'rgba(255,255,255,0.02)', pointerEvents: 'none' }} />
                    <div style={{ position: 'absolute', bottom: '-40px', left: '30%', width: '160px', height: '160px', borderRadius: '50%', background: 'rgba(255,255,255,0.02)', pointerEvents: 'none' }} />

                    {/* ── LEFT: DC Info ── */}
                    <div style={{ flex: 1, padding: '32px 36px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minWidth: 0 }}>

                        {/* Breadcrumb */}
                        <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)', marginBottom: '10px', fontWeight: 500 }}>
                            {p.market ?? p.city} · {p.city}, {p.state} · India
                        </p>

                        {/* Name + company + infographic */}
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '18px', gap: '16px' }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <h1 style={{ fontSize: '32px', fontWeight: 900, letterSpacing: '-0.5px', lineHeight: 1.15, marginBottom: '4px', color: '#fff' }}>{p.dc_name || p.airport_name}</h1>
                                <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', fontWeight: 500 }}>
                                    {p.company || p.type} {p.is_notable_green && <span style={{ marginLeft: '6px', color: '#34d399' }}><ShieldCheck size={13} style={{ display: 'inline', verticalAlign: 'text-bottom' }} /> Certified Green</span>}
                                </p>
                            </div>

                            {/* Conditional Infographic: Server Rack OR Plane Radar */}
                            {!p.airport_name ? (
                                <div style={{ position: 'relative', flexShrink: 0, width: '130px', height: '70px' }}>
                                    {/* Rack 1 */}
                                    <div style={{ position: 'absolute', left: '0', bottom: '0', width: '34px', height: '58px', background: 'rgba(241,245,249,0.12)', borderRadius: '6px', border: '1.5px solid rgba(255,255,255,0.3)', display: 'flex', flexDirection: 'column', gap: '4px', padding: '5px' }}>
                                        {[1, 2, 3, 4].map(i => (
                                            <div key={i} style={{ flex: 1, background: 'rgba(15,23,42,0.5)', borderRadius: '2px', display: 'flex', alignItems: 'center', padding: '0 4px', gap: '3px' }}>
                                                <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: i === 2 ? '#ef4444' : '#10b981', boxShadow: `0 0 5px ${i === 2 ? '#ef4444' : '#10b981'}` }} />
                                            </div>
                                        ))}
                                    </div>
                                    {/* Rack 2 (largest, center) */}
                                    <div style={{ position: 'absolute', left: '42px', bottom: '0', width: '40px', height: '70px', background: 'rgba(241,245,249,0.22)', borderRadius: '6px', border: '1.5px solid rgba(255,255,255,0.55)', zIndex: 2, display: 'flex', flexDirection: 'column', gap: '4px', padding: '5px', backdropFilter: 'blur(6px)' }}>
                                        <div style={{ height: '3px', width: '100%', background: 'rgba(255,255,255,0.35)', borderRadius: '2px', marginBottom: '1px' }} />
                                        {[1, 2, 3, 4, 5].map(i => (
                                            <div key={i} style={{ flex: 1, background: 'rgba(15,23,42,0.6)', borderRadius: '2px', display: 'flex', alignItems: 'center', padding: '0 4px', gap: '3px' }}>
                                                <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#60a5fa', boxShadow: '0 0 7px #60a5fa' }} />
                                                <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: i % 2 === 0 ? '#34d399' : 'transparent', boxShadow: i % 2 === 0 ? '0 0 5px #34d399' : 'none' }} />
                                            </div>
                                        ))}
                                    </div>
                                    {/* Rack 3 */}
                                    <div style={{ position: 'absolute', right: '0', bottom: '0', width: '34px', height: '48px', background: 'rgba(241,245,249,0.09)', borderRadius: '6px', border: '1.5px solid rgba(255,255,255,0.2)', display: 'flex', flexDirection: 'column', gap: '4px', padding: '5px' }}>
                                        {[1, 2, 3].map(i => (
                                            <div key={i} style={{ flex: 1, background: 'rgba(15,23,42,0.4)', borderRadius: '2px', display: 'flex', alignItems: 'center', padding: '0 4px', gap: '3px' }}>
                                                <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#10b981', opacity: 0.9, boxShadow: '0 0 4px #10b981' }} />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div style={{ position: 'relative', flexShrink: 0, width: '130px', height: '70px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15,23,42,0.3)', borderRadius: '12px', border: `1px solid ${p.is_notable_green ? 'rgba(16,185,129,0.3)' : 'rgba(56,189,248,0.3)'}`, overflow: 'hidden', boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.2)' }}>
                                    {/* Grid Texture */}
                                    <div style={{ position: 'absolute', width: '200%', height: '200%', backgroundImage: 'linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)', backgroundSize: '10px 10px', transform: 'perspective(150px) rotateX(60deg) translateY(-20px)', opacity: 0.6 }} />

                                    {/* Concentric Radar Rings */}
                                    <div style={{ position: 'absolute', top: '50%', left: '50%', width: '80px', height: '80px', border: `1px dashed ${p.is_notable_green ? 'rgba(16,185,129,0.3)' : 'rgba(56,189,248,0.3)'}`, borderRadius: '50%', transform: 'translate(-50%, -50%)' }} />
                                    <div style={{ position: 'absolute', top: '50%', left: '50%', width: '45px', height: '45px', border: `1px solid ${p.is_notable_green ? 'rgba(16,185,129,0.2)' : 'rgba(56,189,248,0.2)'}`, borderRadius: '50%', transform: 'translate(-50%, -50%)' }} />

                                    {/* Plane */}
                                    <PlaneTakeoff size={32} color={p.is_notable_green ? '#10b981' : '#38bdf8'} style={{ position: 'relative', zIndex: 10, transform: 'translateY(-2px)', filter: `drop-shadow(0 2px 6px rgba(0,0,0,0.8))` }} />

                                    {/* Glowing Accent Bar */}
                                    <div style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: '4px', background: p.is_notable_green ? '#10b981' : '#38bdf8', boxShadow: `0 -2px 14px ${p.is_notable_green ? '#10b981' : '#38bdf8'}`, opacity: 0.9 }} />
                                </div>
                            )}
                        </div>

                        {/* Spec chips */}
                        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '16px' }}>
                            {p.airport_name ? (
                                [
                                    { label: 'PASSENGERS (MN)', value: p.operations?.annual_passengers_mn ?? 'N/A' },
                                    { label: 'RUNWAYS', value: p.operations?.no_of_runways ?? 'N/A' },
                                    { label: 'CARGO (MTPA)', value: p.operations?.cargo_capacity_mtpa ?? 'N/A' },
                                    { label: 'GREEN STATUS', value: p.green_energy?.carbon_neutral_aci_level ?? 'None' },
                                ].map(s => (
                                    <div key={s.label} style={{ padding: '8px 14px', background: 'rgba(255,255,255,0.08)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.11)' }}>
                                        <p style={{ fontSize: '8px', color: 'rgba(255,255,255,0.4)', fontWeight: 700, marginBottom: '3px', letterSpacing: '0.08em' }}>{s.label}</p>
                                        <p style={{ fontSize: '13px', fontWeight: 700, color: '#fff' }}>{s.value}</p>
                                    </div>
                                ))
                            ) : (
                                [
                                    { label: 'POWER', value: p.power_mw !== 'Not Specified' ? `${p.power_mw} MW` : 'N/A' },
                                    { label: 'TIER', value: p.tier_design !== 'Not Specified' ? p.tier_design : 'N/A' },
                                    { label: 'WHITE', value: p.whitespace !== 'Not Specified' ? p.whitespace : 'N/A' },
                                    { label: 'POSTAL', value: String(p.postal) },
                                ].map(s => (
                                    <div key={s.label} style={{ padding: '8px 14px', background: 'rgba(255,255,255,0.08)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.11)' }}>
                                        <p style={{ fontSize: '8px', color: 'rgba(255,255,255,0.4)', fontWeight: 700, marginBottom: '3px', letterSpacing: '0.08em' }}>{s.label}</p>
                                        <p style={{ fontSize: '13px', fontWeight: 700, color: '#fff' }}>{s.value}</p>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Assessment ratings */}
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
                            {[
                                { icon: '☀️', label: 'Solar', rating: solar?.rating, score: solar?.score },
                                { icon: '💨', label: 'Wind', rating: wind?.rating, score: wind?.score },
                                { icon: '💧', label: 'Water', rating: water?.rating, score: water?.score },
                                { icon: '🌊', label: 'Groundwater', rating: hasGW ? gw.category : 'No Data', score: hasGW ? gw.ext_pct : null },
                            ].map(a => (
                                <div key={a.label} style={{ padding: '8px 14px', background: 'rgba(255,255,255,0.07)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.11)' }}>
                                    <p style={{ fontSize: '8px', color: 'rgba(255,255,255,0.38)', fontWeight: 700, marginBottom: '3px', letterSpacing: '0.08em' }}>{a.icon} {a.label.toUpperCase()}</p>
                                    <p style={{ fontSize: '12.5px', fontWeight: 800, color: '#fff' }}>{a.rating ?? 'N/A'}</p>
                                    {a.score != null && <p style={{ fontSize: '9.5px', color: 'rgba(255,255,255,0.38)', marginTop: '1px' }}>{a.score.toFixed(1)}{a.label === 'Groundwater' ? '%' : ''}</p>}
                                </div>
                            ))}
                        </div>

                        {/* Address */}
                        <p style={{ fontSize: '10.5px', color: 'rgba(255,255,255,0.3)', marginTop: 'auto' }}>
                            📍 {p.address ? p.address.replace(/\\n/g, ' · ').replace(/\n/g, ' · ') : 'No Address Provided'}
                        </p>
                    </div>

                    {/* ── RIGHT: Mini Map Panel ── */}
                    <div style={{ width: '580px', flexShrink: 0, display: 'flex', flexDirection: 'column', borderLeft: '1px solid rgba(255,255,255,0.08)' }}>
                        {/* Map fills top — no overlay ON the map to avoid Leaflet z-index conflicts */}
                        <div style={{ flex: 1, minHeight: '190px', overflow: 'hidden' }}>
                            <MiniMap lat={lat} lon={lon} name={p.dc_name || p.airport_name || 'Asset'} color={hasGW ? gwColors.accent : '#6b7280'} />
                        </div>
                        {/* Bottom strip with COORDINATES + LOCATION + Google Maps */}
                        <div style={{ padding: '12px 14px', background: 'rgba(0,0,0,0.30)', flexShrink: 0, borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                            {/* Coordinates row */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                                <div>
                                    <p style={{ fontSize: '8px', color: 'rgba(255,255,255,0.38)', fontWeight: 700, marginBottom: '3px', letterSpacing: '0.09em' }}>COORDINATES</p>
                                    <p style={{ fontSize: '11px', fontWeight: 700, color: '#e2e8f0', lineHeight: 1.5 }}>{lat.toFixed(5)}°N</p>
                                    <p style={{ fontSize: '11px', fontWeight: 700, color: '#e2e8f0', lineHeight: 1.5 }}>{lon.toFixed(5)}°E</p>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <p style={{ fontSize: '8px', color: 'rgba(255,255,255,0.38)', fontWeight: 700, marginBottom: '3px', letterSpacing: '0.09em' }}>LOCATION</p>
                                    <p style={{ fontSize: '11px', fontWeight: 700, color: '#e2e8f0', lineHeight: 1.5 }}>{p.city}</p>
                                    <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.55)', fontWeight: 500, lineHeight: 1.5 }}>{p.state}</p>
                                </div>
                            </div>
                            {/* Google Maps button */}
                            <a href={`https://www.google.com/maps?q=${lat},${lon}`} target="_blank" rel="noopener noreferrer"
                                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', padding: '8px', borderRadius: '8px', background: 'rgba(37,99,235,0.85)', color: '#fff', textDecoration: 'none', fontSize: '11.5px', fontWeight: 700, border: '1px solid rgba(37,99,235,0.6)', width: '100%' }}>
                                <ExternalLink size={11} /> Open in Google Maps
                            </a>
                        </div>
                    </div>
                </div>

                {/* ══════════ TABS NAVIGATOR ══════════ */}
                <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', overflowX: 'auto', paddingBottom: '4px' }}>
                    {['☀️ Solar Energy', '💨 Wind Energy', '💧 Water & Hydrology', '🌊 Groundwater', '⚡ Nearest Powerhouse'].map((tab, idx) => (
                        <button key={tab} onClick={() => setActiveTab(idx)} style={{ padding: '12px 24px', borderRadius: '12px', border: activeTab === idx ? '2px solid #1e40af' : '1px solid #e2e8f0', background: activeTab === idx ? '#eff6ff' : '#fff', color: activeTab === idx ? '#1e40af' : '#64748b', fontWeight: 800, fontSize: '13px', cursor: 'pointer', boxShadow: activeTab === idx ? '0 4px 12px rgba(30,64,175,0.15)' : 'none', transition: 'all 0.2s ease', whiteSpace: 'nowrap' }}>
                            {tab}
                        </button>
                    ))}
                </div>

                <div style={{ position: 'relative', minHeight: '500px' }}>
                    {activeTab === 0 && (
                        <AnimCard delay={80}>
                            <SectionHeader icon={<Sun size={17} color="#f59e0b" />} title="Solar Energy Assessment" subtitle={`Score ${solar?.score ?? 'N/A'} / 100`} badge={<RatingBadge rating={solar?.rating ?? 'N/A'} />} />
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
                                <MetricTile label="Annual GHI" value={`${formatNum(solar?.ghi_annual, 0)} kWh/m²/yr`} color="#f59e0b" sub="Global Horiz. Irradiation" />
                                <MetricTile label="Annual PV Output" value={`${formatNum(solar?.pvout_annual, 0)} kWh/kWp/yr`} color="#f97316" sub="Photovoltaic Potential" />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '14px' }}>
                                <MetricTile label="Daily GHI" value={`${formatNum(solar?.ghi, 2)} kWh/m²/day`} sub="Per day avg" />
                                <MetricTile label="Daily GTI" value={`${formatNum(solar?.gti, 2)} kWh/m²/day`} sub="Tilted surface" />
                                <MetricTile label="Daily PVOUT" value={`${formatNum(solar?.pvout, 2)} kWh/kWp/day`} sub="Per day avg" />
                            </div>
                            {solar?.monthly?.length === 12 && (
                                <div style={{ marginBottom: '14px' }}>
                                    <p style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600, marginBottom: '8px' }}>Monthly PV Output (kWh/kWp/day)</p>
                                    <SolarMonthChart monthly={solar.monthly} />
                                </div>
                            )}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
                                <MetricTile label="Best Month" value={solar?.best_month ?? 'N/A'} />
                                <MetricTile label="Worst Month" value={solar?.worst_month ?? 'N/A'} />
                                <MetricTile label="Optimal Tilt" value={`${formatNum(solar?.optimal_tilt)}°`} />
                                <MetricTile label="Avg Temperature" value={`${formatNum(solar?.avg_temp)}°C`} />
                                <MetricTile label="ERA5 GHI (Validation)" value={`${formatNum(solar?.era5_ghi, 2)} kWh/m²/day`} sub={solar?.era5_agreement != null ? `${formatNum(solar.era5_agreement, 1)}% agreement` : undefined} />
                                <MetricTile label="Elevation" value={`${formatNum(solar?.elevation, 0)} m`} />
                                <MetricTile label="Terrain Slope" value={`${formatNum(solar?.slope, 2)}°`} />
                                <MetricTile label="Terrain Aspect" value={`${formatNum(solar?.aspect, 1)}°`} />
                            </div>
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
                                {solar?.aod_label && (
                                    <span style={{ fontSize: '11px', padding: '4px 10px', background: '#fef3c7', color: '#92400e', borderRadius: '99px', fontWeight: 600, border: '1px solid #fde68a' }}>
                                        🌫️ {solar.aod_label} ({formatNum(solar.aod, 2)})
                                    </span>
                                )}
                                {solar?.cloud_label && (
                                    <span style={{ fontSize: '11px', padding: '4px 10px', background: '#eff6ff', color: '#1d4ed8', borderRadius: '99px', fontWeight: 600, border: '1px solid #bfdbfe' }}>
                                        ☁️ {solar.cloud_label} ({solar.cloud_pct != null ? formatNum(solar.cloud_pct, 0) + '%' : 'N/A'})
                                    </span>
                                )}
                                {solar?.seasonal_label && (
                                    <span style={{ fontSize: '11px', padding: '4px 10px', background: '#fdf4ff', color: '#7c3aed', borderRadius: '99px', fontWeight: 600, border: '1px solid #e9d5ff' }}>
                                        📈 {solar.seasonal_label} (Range: {formatNum(solar.seasonal_range, 2)})
                                    </span>
                                )}
                            </div>
                            <div style={{ marginTop: 'auto' }}>
                                <ProgressBar value={wind?.cf3_pct ?? 0} max={100} color="#f59e0b" label="Wind Capacity Factor (3MW ref.)" valueLabel={`${formatNum(wind?.cf3_pct)}%`} />
                            </div>
                        </AnimCard>
                    )}

                    {activeTab === 1 && (
                        <AnimCard delay={80}>
                            <SectionHeader icon={<Wind size={17} color="#3b82f6" />} title="Wind Energy Assessment" subtitle={`Score ${wind?.score ?? 'N/A'} / 100`} badge={<RatingBadge rating={wind?.rating ?? 'N/A'} />} />
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
                                <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '14px', textAlign: 'center' }}>
                                    <p style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 600, marginBottom: '6px' }}>WIND GRADE</p>
                                    <p style={{ fontSize: '32px', fontWeight: 900, color: getWindGradeColor(wind?.grade ?? ''), lineHeight: 1 }}>{wind?.grade ?? 'N/A'}</p>
                                    <p style={{ fontSize: '10px', color: '#94a3b8', marginTop: '4px' }}>{wind?.grade_label ?? ''}</p>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <MetricTile label="Capacity Factor" value={`${formatNum(wind?.cf3_pct)}%`} color="#3b82f6" />
                                    <MetricTile label="Est. Annual (2MW)" value={`${formatNum(wind?.annual_mwh_2mw, 0)} MWh/yr`} color="#8b5cf6" />
                                </div>
                            </div>
                            <p style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600, marginBottom: '8px' }}>Wind Profile by Height</p>
                            {wind?.profile ? (
                                <>
                                    <WindProfileTable profile={wind.profile} />
                                    <WindProfileChart profile={wind.profile} />
                                </>
                            ) : (
                                <p style={{ color: '#94a3b8', fontSize: '12px' }}>No profile data</p>
                            )}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '14px' }}>
                                <MetricTile label="Power Density @100m" value={`${formatNum(wind?.pd100, 1)} W/m²`} />
                                <MetricTile label="Wind Shear α" value={formatNum(wind?.shear_alpha, 3)} />
                                <MetricTile label="Elevation" value={`${formatNum(wind?.elevation, 0)} m`} />
                                <MetricTile label="Terrain Index (RIX)" value={formatNum(wind?.rix, 4)} />
                                <MetricTile label="Slope" value={formatNum(wind?.slope, 3)} />
                            </div>
                        </AnimCard>
                    )}

                    {activeTab === 2 && (
                        <AnimCard delay={80}>
                            <SectionHeader icon={<CloudRain size={17} color="#06b6d4" />} title="Water & Hydrology" subtitle={`Score ${water?.score ?? 'N/A'} / 100`} badge={<RatingBadge rating={water?.rating ?? 'N/A'} />} />
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '14px' }}>
                                <MetricTile label="Annual Precip" value={`${formatNum(water?.precip_annual, 0)} mm/yr`} color="#06b6d4" />
                                <MetricTile label="Daily Avg" value={`${formatNum(water?.precip_daily, 2)} mm/day`} color="#0ea5e9" />
                                <MetricTile label="Surface Water" value={`${formatNum(water?.occurrence, 1)}%`} color="#38bdf8" sub="Persistence frequency" />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '14px' }}>
                                <MetricTile label="Potential Evapo. (PET)" value={`${formatNum(water?.pet, 1)} mm`} sub="Avg Monthly Total" />
                                <MetricTile label="Actual Evapo. (AET)" value={`${formatNum(water?.aet, 1)} mm`} sub="Avg Monthly Total" />
                            </div>
                            {water?.flood_risk && (
                                <div style={{ padding: '12px 16px', borderRadius: '12px', background: water.flood_risk.toLowerCase().includes('prone') ? '#fef2f2' : '#f0fdf4', border: `1px solid ${water.flood_risk.toLowerCase().includes('prone') ? '#fecaca' : '#bbf7d0'}`, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <span style={{ fontSize: '18px' }}>{water.flood_risk.toLowerCase().includes('prone') ? '⚠️' : '✅'}</span>
                                    <div>
                                        <p style={{ fontSize: '11px', fontWeight: 700, color: water.flood_risk.toLowerCase().includes('prone') ? '#dc2626' : '#15803d' }}>{water.flood_risk}</p>
                                        <p style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>Flood Risk Assessment</p>
                                    </div>
                                </div>
                            )}
                            <p style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', marginBottom: '8px' }}>Soil Moisture (kg/m²)</p>
                            {[
                                { label: '0–10 cm', val: water?.soil_0_10 ?? 0, max: 50 },
                                { label: '10–40 cm', val: water?.soil_10_40 ?? 0, max: 150 },
                                { label: '40–100 cm', val: water?.soil_40_100 ?? 0, max: 300 },
                            ].map(s => (
                                <ProgressBar key={s.label} value={s.val} max={s.max} color="#06b6d4" label={s.label} valueLabel={`${formatNum(s.val)} kg/m²`} />
                            ))}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: 'auto' }}>
                                <div style={{ padding: '10px 12px', background: '#f0f9ff', borderRadius: '10px', border: '1px solid #bae6fd' }}>
                                    <p style={{ fontSize: '9px', color: '#0369a1', fontWeight: 700, marginBottom: '3px' }}>PDSI DROUGHT INDEX</p>
                                    <p style={{ fontSize: '12px', fontWeight: 800, color: '#0c4a6e' }}>{water?.pdsi_label ?? 'N/A'}</p>
                                    <p style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>PDSI: {formatNum(water?.pdsi, 2)}</p>
                                </div>
                                <div style={{ padding: '10px 12px', background: '#f0fdf4', borderRadius: '10px', border: '1px solid #bbf7d0' }}>
                                    <p style={{ fontSize: '9px', color: '#15803d', fontWeight: 700, marginBottom: '3px' }}>GRACE WATER LEVEL</p>
                                    <p style={{ fontSize: '12px', fontWeight: 800, color: '#14532d' }}>{water?.grace_label ?? 'N/A'}</p>
                                    <p style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>LWE: {formatNum(water?.lwe, 2)} cm</p>
                                </div>
                                <MetricTile label="Water Deficit" value={water?.deficit_label ?? 'N/A'} sub={`${formatNum(water?.deficit, 1)} mm/month`} />
                                <MetricTile label="Root Zone Moisture" value={`${formatNum(water?.root_zone, 0)} kg/m²`} />
                                <MetricTile label="Runoff" value={`${formatNum(water?.runoff, 2)} mm`} sub="Avg Monthly Total" />
                                <MetricTile label="NDWI Index" value={formatNum(water?.ndwi, 3)} sub="Water Index" />
                                <MetricTile label="Aridity Index" value={formatNum(water?.aridity, 2)} sub="P/PET Ratio" />
                            </div>
                        </AnimCard>
                    )}

                    {activeTab === 3 && (
                        <AnimCard delay={80}>
                            <SectionHeader icon={<Droplets size={17} color={hasGW ? gwColors.accent : '#94a3b8'} />} title="Groundwater Assessment" subtitle={hasGW ? `${gw.block}, ${gw.district}` : 'No survey data'} badge={hasGW ? <RatingBadge rating={gw.category} /> : undefined} />
                            {hasGW ? (
                                <>
                                    <div style={{ display: 'flex', gap: '16px', alignItems: 'center', padding: '16px', background: '#f8fafc', borderRadius: '14px', marginBottom: '16px' }}>
                                        <GaugeSVG pct={gaugeActive ? extPct : 0} color={gwColors.accent} />
                                        <div style={{ flex: 1 }}>
                                            <span style={{ display: 'inline-block', padding: '5px 12px', borderRadius: '99px', background: gwColors.bg, color: gwColors.accent, fontSize: '12px', fontWeight: 800, border: `2px solid ${gwColors.border}`, marginBottom: '8px' }}>{gw.category}</span>
                                            <p style={{ fontSize: '11px', color: '#64748b', lineHeight: 1.5 }}>{getRiskDescription(gw.category)}</p>
                                        </div>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                        {[
                                            { label: 'Availability', value: `${formatNum(availMCM, 0)} MCM/yr`, highlight: true },
                                            { label: 'Total Draft', value: `${formatNum(gw.draft_total_mcm, 0)} MCM/yr` },
                                            { label: 'Replenishable', value: `${formatNum(gw.replenishable_total, 0)} MCM` },
                                            { label: 'Natural Discharge', value: `${formatNum(gw.natural_discharge, 1)} MCM` },
                                            { label: 'Irrigation Draft', value: `${formatNum(gw.irrigation_draft, 0)} MCM` },
                                            { label: 'Industrial Draft', value: `${formatNum(gw.industrial_draft, 0)} MCM` },
                                        ].map(m => (
                                            <div key={m.label} style={{ background: m.highlight ? gwColors.bg : '#f8fafc', borderRadius: '10px', padding: '10px 12px', border: m.highlight ? `1px solid ${gwColors.border}40` : 'none' }}>
                                                <p style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 600, marginBottom: '3px' }}>{m.label}</p>
                                                <p style={{ fontSize: '13px', fontWeight: 800, color: m.highlight ? gwColors.accent : '#0f172a' }}>{m.value}</p>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            ) : (
                                <div style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8' }}>
                                    <Droplets size={40} style={{ margin: '0 auto 12px', display: 'block', opacity: 0.3 }} />
                                    <p style={{ fontWeight: 600 }}>No Groundwater Data</p>
                                    <p style={{ fontSize: '12px', marginTop: '6px', lineHeight: 1.5 }}>This location falls outside available survey coverage.</p>
                                </div>
                            )}
                        </AnimCard>
                    )}

                    {activeTab === 4 && (
                        <AnimCard delay={80}>
                            <SectionHeader icon={<Zap size={17} color="#1e40af" />} title="Nearest Powerhouse" subtitle="Local electricity infrastructure" />
                            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: '12px', alignItems: 'center' }}>
                                <div style={{ background: '#f8fafc', borderRadius: '14px', padding: '16px 20px' }}>
                                    <p style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', marginBottom: '4px' }}>{phSafe?.name ?? 'N/A'}</p>
                                    <p style={{ fontSize: '13px', color: '#64748b', fontWeight: 500 }}><span style={{ color: '#1e40af', fontWeight: 700 }}>{formatNum(phSafe?.dist_km)} km</span> from this {p.airport_name ? 'airport' : 'datacenter'}</p>
                                    {phSafe?.river && phSafe.river !== '<Null>' && <p style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}><Waves style={{ display: 'inline', width: 11 }} /> River: {phSafe.river}</p>}
                                </div>
                                <MetricTile label="Capacity" value={`${capMW.toFixed(1)} MW`} color="#1e40af" sub="Installed" />
                                <MetricTile label="Energy Output" value={`${energyMU.toFixed(0)} MU/yr`} color="#7c3aed" />
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <MetricTile label="Type" value={phSafe?.type && phSafe.type !== '<Null>' ? phSafe.type : 'N/A'} />
                                    <MetricTile label="Class" value={phSafe?.class ?? 'N/A'} />
                                </div>
                            </div>
                            {phSafe?.completion_year && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '12px', fontSize: '12px', color: '#94a3b8' }}>
                                    <Calendar size={12} /> Commissioned: <strong>{Math.round(phSafe.completion_year)}</strong>
                                </div>
                            )}
                        </AnimCard>
                    )}

                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '24px', marginBottom: '20px' }}>
                    <button onClick={() => setActiveTab(Math.max(0, activeTab - 1))} disabled={activeTab === 0} style={{ padding: '12px 24px', borderRadius: '10px', border: '1px solid #e2e8f0', background: activeTab === 0 ? '#f8fafc' : '#fff', color: activeTab === 0 ? '#cbd5e1' : '#1e40af', fontWeight: 700, cursor: activeTab === 0 ? 'not-allowed' : 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        ← Previous
                    </button>
                    <button onClick={() => setActiveTab(Math.min(4, activeTab + 1))} disabled={activeTab === 4} style={{ padding: '12px 24px', borderRadius: '10px', border: 'none', background: activeTab === 4 ? '#f1f5f9' : '#1e40af', color: activeTab === 4 ? '#94a3b8' : '#fff', fontWeight: 700, cursor: activeTab === 4 ? 'not-allowed' : 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: activeTab === 4 ? 'none' : '0 4px 12px rgba(30,64,175,0.2)' }}>
                        Next →
                    </button>
                </div>
            </div >

            <GlossaryModal isOpen={glossaryOpen} onClose={() => setGlossaryOpen(false)} />


            <style>{`
        @keyframes fadeSlideUp { from { opacity:0; transform:translateY(24px); } to { opacity:1; transform:translateY(0); } }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
        </div >
    );
}
