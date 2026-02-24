
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, ComposedChart, Legend, BarChart, Bar, Cell, Scatter } from 'recharts';
import { Wind, Sun, Cloud, Gauge, ArrowLeft, Loader2, Thermometer, Info, TrendingUp, Satellite, Ruler, X, AlertTriangle, Settings, Zap, Battery, Compass, ChevronDown, ChevronUp, Eye, Layers, Target, Map, Server, Globe, MapPin, Building2, Cpu, BookOpen, ShieldCheck, Microscope } from 'lucide-react';

// --- REUSABLE COMPONENTS ---

// --- COMPONENTS ---

const LoadingState = ({ lat, lng }) => (
    <div className="fixed inset-0 bg-slate-50 flex items-center justify-center">
        <div className="text-center space-y-4">
            <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto" />
            <p className="text-slate-600 font-medium">Extracting site intelligence for {lat.toFixed(4)}°N, {lng.toFixed(4)}°E</p>
        </div>
    </div>
);



// Plain wrapper — no flip, no overlay, no interactivity
const ScientificFlipCard = ({ children, className }) => (
    <div className={className}>{children}</div>
);

const ReportView = ({ analysis, live, lat, lng, datacenter, onClose, onClearCache }) => {
    const [activeTab, setActiveTab] = useState(datacenter ? 'datacenter' : 'wind');
    const [showLogicGuide, setShowLogicGuide] = useState(false);

    if (!analysis || !live) return <LoadingState lat={lat} lng={lng} />;

    // Nested structure mapping
    const windData = analysis.wind || {};
    const solarData = analysis.solar || {};
    const waterData = analysis.water || {};

    const {
        wind_speed_80m,
        wind_speed_120m,
        wind_speed_180m,
        wind_direction_80m,
        wind_direction_120m,
        wind_direction_180m,
        temperature_120m,
        air_density_120m,
        humidity,
        precipitation,
        cloud_cover,
        visibility,
        apparent_temp,
        pressure_msl
    } = live;

    const getCardinal = (angle) => {
        const directionsFull = ['North', 'North-East', 'East', 'South-East', 'South', 'South-West', 'West', 'North-West'];
        return directionsFull[Math.round(angle / 45) % 8];
    };

    const shearExponent = windData.physics?.shear_alpha || 0.143;
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    // Backend returns monthly as { values: [...], best_month, worst_month, ... }
    const monthlyValues = solarData.monthly?.values || (Array.isArray(solarData.monthly) ? solarData.monthly : []);
    const monthlySolarData = monthlyValues.map((val, i) => ({ month: monthNames[i], pvout: val }));

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-[#f8fafc] overflow-y-auto font-sans text-slate-900"
        >
            {/* HEADER */}
            <nav className="sticky top-0 bg-white/80 backdrop-blur-md shadow-sm border-b border-slate-200 z-50 px-8 py-4 flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-gradient-to-br from-violet-600 via-indigo-600 to-cyan-500 rounded-2xl text-white shadow-lg">
                        <Satellite size={24} strokeWidth={2} />
                    </div>
                    <div>
                        <h1 className="font-black text-slate-800 tracking-tight text-xl uppercase leading-none">Geospatial Site Intelligent</h1>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{lat.toFixed(4)}N, {lng.toFixed(4)}E</span>
                            <span className="w-1 h-1 bg-slate-200 rounded-full" />
                            <span className="text-[10px] text-indigo-500 font-black uppercase tracking-widest">Site Assessment</span>
                        </div>
                    </div>
                </div>

                <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
                    {[
                        ...(datacenter ? [{ id: 'datacenter', icon: <Server size={14} />, label: 'Data Center', activeClass: 'bg-violet-600 text-white shadow-md shadow-violet-200' }] : []),
                        { id: 'wind', icon: <Wind size={14} />, label: 'Wind', activeClass: 'bg-cyan-500   text-white shadow-md shadow-cyan-200' },
                        { id: 'solar', icon: <Sun size={14} />, label: 'Solar', activeClass: 'bg-amber-400  text-white shadow-md shadow-amber-200' },
                        { id: 'water', icon: <Cloud size={14} />, label: 'Hydrology', activeClass: 'bg-blue-600   text-white shadow-md shadow-blue-200' },
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${activeTab === tab.id
                                ? tab.activeClass
                                : 'text-slate-400 hover:text-slate-600'
                                }`}>
                            {tab.icon}
                            {tab.label}
                        </button>
                    ))}
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setShowLogicGuide(!showLogicGuide)}
                        className={`p-3 rounded-2xl transition-all border flex items-center gap-2 ${showLogicGuide ? 'bg-indigo-600 text-white border-indigo-500 shadow-lg shadow-indigo-100' : 'bg-white text-slate-400 border-slate-100 hover:bg-slate-50'}`}
                    >
                        <span className="text-[10px] font-black uppercase tracking-widest hidden md:block">Intelligence Guide</span>
                    </button>
                    <button onClick={onClose} className="p-3 bg-slate-50 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all border border-slate-100"><X size={20} /></button>
                </div>
            </nav>

            {/* ════════════ INTELLIGENCE LOGIC GUIDE ════════════ */}
            <AnimatePresence>
                {showLogicGuide && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="fixed top-24 right-8 left-8 md:left-auto md:w-[450px] bg-white rounded-[2.5rem] shadow-[0_32px_80px_-16px_rgba(0,0,0,0.2)] border border-slate-100 z-[60] overflow-hidden"
                    >
                        <div className="bg-slate-900 p-8 text-white relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/20 rounded-full -translate-y-8 translate-x-8 blur-2xl" />
                            <div className="flex items-center gap-4 relative z-10">
                                <div className="p-3 bg-indigo-500 rounded-2xl"><BookOpen size={20} /></div>
                                <div>
                                    <h3 className="text-lg font-black uppercase tracking-tight">Intelligence Logic</h3>
                                    <p className="text-[9px] text-indigo-300 font-bold uppercase tracking-widest">How we assess site suitability</p>
                                </div>
                            </div>
                        </div>
                        <div className="p-8 space-y-8 max-h-[60vh] overflow-y-auto">
                            {[
                                {
                                    icon: <Server className="text-violet-500" />,
                                    title: "Infrastructure Layer",
                                    desc: "Assesses physical datacenter assets. We track Tier ratings, power capacity (MW), and whitespace. This acts as the baseline for existing infrastructure density."
                                },
                                {
                                    icon: <Wind className="text-cyan-500" />,
                                    title: "Wind Resource Assessment",
                                    desc: "Uses GWA v3 & ERA5 data. We calculate Capacity Factors (CF) for IEC Class 1, 2, and 3 turbines at 100m. Ideal for understanding grid-tie renewable potential."
                                },
                                {
                                    icon: <Sun className="text-amber-500" />,
                                    title: "Solar Viability",
                                    desc: "Extracts GHI, DNI, and DIF levels from Copernicus CAMS. We factor in terrain slope and AOD (Aerosol Optical Depth) to estimate panel degradation and real-world efficiency."
                                },
                                {
                                    icon: <Cloud className="text-blue-500" />,
                                    title: "Hydrology & Resilience",
                                    desc: "Critical for cooling logic. We analyze Groundwater anomalies (GRACE Satellite), Soil Moisture (GLDAS), and Flood Risk (JRC) to determine supply stability."
                                },
                                {
                                    icon: <ShieldCheck className="text-emerald-500" />,
                                    title: "Supply Index Logic",
                                    desc: "A weighted composite of 5 datasets. High scores mean high resource abundance (Green). Scarcity (Red) indicates higher operational risk for high-power data centers."
                                }
                            ].map((item, i) => (
                                <div key={i} className="flex gap-5 group">
                                    <div className="shrink-0 w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center border border-slate-100 group-hover:border-indigo-100 group-hover:bg-indigo-50 transition-colors">
                                        {React.cloneElement(item.icon, { size: 20 })}
                                    </div>
                                    <div className="space-y-1">
                                        <h4 className="text-xs font-black text-slate-800 uppercase tracking-wide">{item.title}</h4>
                                        <p className="text-[11px] text-slate-500 leading-relaxed font-medium">{item.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-center">
                            <button
                                onClick={() => setShowLogicGuide(false)}
                                className="px-8 py-2.5 bg-slate-800 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-slate-700 transition-colors"
                            >
                                Understood
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <main className="max-w-[1400px] mx-auto p-8 space-y-12">
                <AnimatePresence mode="wait">

                    {/* ════════════ DATA CENTER TAB ════════════ */}
                    {activeTab === 'datacenter' && datacenter && (
                        <motion.div key="datacenter" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-10">

                            {/* STATIC SATELLITE IMAGE */}
                            <div className="relative rounded-[3rem] overflow-hidden shadow-2xl h-56 bg-slate-900">
                                <img
                                    src={`https://services.arcgisonline.com/arcgis/rest/services/World_Imagery/MapServer/export?bbox=${lng - 0.005},${lat - 0.0025},${lng + 0.005},${lat + 0.0025}&bboxSR=4326&imageSR=4326&size=1000,400&format=jpg&f=image`}
                                    alt={`Satellite view of ${datacenter.name}`}
                                    className="w-full h-full object-cover"
                                />
                                {/* Crosshair on datacenter location */}
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                    <div className="relative">
                                        <div className="w-4 h-4 rounded-full bg-violet-500 border-2 border-white shadow-xl ring-8 ring-violet-500/30" />
                                        <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-px h-4 bg-white/80" />
                                        <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 w-px h-4 bg-white/80" />
                                        <div className="absolute top-1/2 -translate-y-1/2 -left-6 h-px w-4 bg-white/80" />
                                        <div className="absolute top-1/2 -translate-y-1/2 -right-6 h-px w-4 bg-white/80" />
                                    </div>
                                </div>
                                {/* Overlay labels */}
                                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-5 flex justify-between items-end">
                                    <div>
                                        <div className="text-[9px] font-black text-violet-300 uppercase tracking-widest">Satellite View</div>
                                        <div className="text-sm font-black text-white">{datacenter.name}</div>
                                    </div>
                                    <div className="text-right">
                                        <div className="font-mono text-[10px] text-white/70">{lat.toFixed(5)}°N</div>
                                        <div className="font-mono text-[10px] text-white/70">{lng.toFixed(5)}°E</div>
                                    </div>
                                </div>
                                <div className="absolute top-3 right-3 px-3 py-1 bg-black/50 backdrop-blur-sm text-white text-[8px] font-black uppercase tracking-wider rounded-full">© Esri · Non-interactive</div>
                            </div>

                            {/* HERO BANNER */}
                            <div className="relative rounded-[3rem] overflow-hidden bg-gradient-to-br from-slate-900 via-violet-950 to-purple-950 p-10 shadow-2xl">
                                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                                    {[0, 1, 2].map(i => (
                                        <motion.div key={i}
                                            className="absolute rounded-full border border-violet-500/20"
                                            style={{ width: 300 + i * 200, height: 300 + i * 200, top: '50%', left: '65%', x: '-50%', y: '-50%' }}
                                            animate={{ scale: [1, 1.12, 1], opacity: [0.25, 0.05, 0.25] }}
                                            transition={{ duration: 3.5 + i, repeat: Infinity, delay: i * 0.9 }}
                                        />
                                    ))}
                                </div>
                                <div className="relative z-10 grid grid-cols-1 lg:grid-cols-3 gap-10 items-center">

                                    {/* Icon + name */}
                                    <div className="flex flex-col items-center gap-6">
                                        <motion.div
                                            className="w-28 h-28 rounded-[2rem] bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center shadow-2xl"
                                            animate={{ y: [0, -6, 0] }}
                                            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                                        >
                                            <Server size={52} className="text-white" strokeWidth={1.5} />
                                        </motion.div>
                                        <div className="text-center">
                                            <div className="inline-block px-4 py-1.5 rounded-full bg-violet-500/20 border border-violet-500/30 text-violet-300 text-[10px] font-black uppercase tracking-widest">
                                                {datacenter.tier || 'Unknown Tier'}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Name + company */}
                                    <div className="col-span-1 space-y-4">
                                        <div className="text-[10px] font-black text-violet-400 uppercase tracking-widest">Data Center Profile</div>
                                        <h2 className="text-3xl font-black text-white leading-tight">{datacenter.name}</h2>
                                        <div className="text-violet-300 font-bold text-sm">{datacenter.company}</div>
                                        {datacenter.url && (
                                            <a href={datacenter.url} target="_blank" rel="noopener noreferrer"
                                                className="inline-flex items-center gap-2 text-[10px] font-black text-violet-300 hover:text-white uppercase tracking-widest transition-colors">
                                                <Globe size={12} />{datacenter.url.replace('https://', '')}
                                            </a>
                                        )}
                                    </div>

                                    {/* Quick stats */}
                                    <div className="grid grid-cols-2 gap-4">
                                        {[
                                            { label: 'Power', val: datacenter.power_mw || '—', unit: 'MW', col: 'from-violet-600 to-purple-700' },
                                            { label: 'Tier Design', val: datacenter.tier || '—', unit: '', col: 'from-indigo-600 to-violet-700' },
                                            { label: 'Whitespace', val: datacenter.whitespace || '—', unit: '', col: 'from-purple-600 to-fuchsia-700' },
                                            { label: 'Market', val: datacenter.market || '—', unit: '', col: 'from-fuchsia-600 to-pink-700' },
                                        ].map(({ label, val, unit, col }) => (
                                            <div key={label} className={`bg-gradient-to-br ${col} p-5 rounded-[1.5rem] shadow-xl text-white relative overflow-hidden`}>
                                                <div className="absolute inset-0 bg-white/5" />
                                                <div className="text-[8px] font-black uppercase tracking-widest opacity-70 mb-2">{label}</div>
                                                <div className="text-sm font-black leading-tight relative z-10">{val}</div>
                                                {unit && <div className="text-[8px] font-bold opacity-60 mt-1">{unit}</div>}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* LOCATION + ADDRESS */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                                {/* Address card */}
                                <div className="bg-white border border-slate-100 rounded-[3rem] p-10 shadow-sm space-y-8">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-violet-50 border border-violet-100 rounded-2xl text-violet-500"><MapPin size={20} /></div>
                                        <div>
                                            <h3 className="text-lg font-black text-slate-800 tracking-tight uppercase">Physical Location</h3>
                                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1">Address · Postal · Coordinates</p>
                                        </div>
                                    </div>
                                    <div className="space-y-5">
                                        <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
                                            <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Street Address</div>
                                            <div className="text-sm font-bold text-slate-700">{datacenter.address}</div>
                                        </div>
                                        <div className="grid grid-cols-3 gap-4">
                                            <div className="p-5 bg-violet-50 rounded-2xl border border-violet-100 text-center">
                                                <div className="text-[9px] font-black text-violet-400 uppercase mb-1">City</div>
                                                <div className="text-sm font-black text-violet-700">{datacenter.city || '—'}</div>
                                            </div>
                                            <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 text-center">
                                                <div className="text-[9px] font-black text-slate-400 uppercase mb-1">State</div>
                                                <div className="text-sm font-black text-slate-700">{datacenter.state || '—'}</div>
                                            </div>
                                            <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 text-center">
                                                <div className="text-[9px] font-black text-slate-400 uppercase mb-1">Postal</div>
                                                <div className="text-sm font-black text-slate-700">{datacenter.postal || '—'}</div>
                                            </div>
                                        </div>
                                        <div className="p-6 bg-slate-900 rounded-2xl">
                                            <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">GPS Coordinates</div>
                                            <div className="font-mono text-sm font-black text-violet-400">{lat.toFixed(6)}°N, {lng.toFixed(6)}°E</div>
                                            {datacenter.plus_code && (
                                                <div className="text-[9px] text-slate-500 font-bold mt-2">{datacenter.plus_code}</div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Infrastructure specs */}
                                <div className="bg-white border border-slate-100 rounded-[3rem] p-10 shadow-sm space-y-8">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-purple-50 border border-purple-100 rounded-2xl text-purple-500"><Cpu size={20} /></div>
                                        <div>
                                            <h3 className="text-lg font-black text-slate-800 tracking-tight uppercase">Infrastructure Specs</h3>
                                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1">Tier · Power · Whitespace</p>
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        {[
                                            { label: 'Tier Classification', val: datacenter.tier || 'Not Specified', bg: 'bg-violet-50', border: 'border-violet-100', text: 'text-violet-700', sub: 'Uptime Institute standard' },
                                            { label: 'Power Capacity', val: datacenter.power_mw ? `${datacenter.power_mw} MW` : 'Not Specified', bg: 'bg-amber-50', border: 'border-amber-100', text: 'text-amber-700', sub: 'Critical load capacity' },
                                            { label: 'Whitespace', val: datacenter.whitespace || 'Not Specified', bg: 'bg-emerald-50', border: 'border-emerald-100', text: 'text-emerald-700', sub: 'Colocation floor area' },
                                            { label: 'Market', val: datacenter.market || 'Not Specified', bg: 'bg-cyan-50', border: 'border-cyan-100', text: 'text-cyan-700', sub: 'Served market region' },
                                            { label: 'Country', val: datacenter.country || 'India', bg: 'bg-slate-50', border: 'border-slate-100', text: 'text-slate-700', sub: 'Jurisdiction' },
                                        ].map(({ label, val, bg, border, text, sub }) => (
                                            <div key={label} className={`flex justify-between items-center p-5 ${bg} border ${border} rounded-2xl`}>
                                                <div>
                                                    <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{label}</div>
                                                    <div className="text-[9px] text-slate-300 font-bold mt-0.5">{sub}</div>
                                                </div>
                                                <div className={`text-sm font-black ${text}`}>{val}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* ASSESSMENT PROMPT BANNER */}
                            <div className="bg-gradient-to-r from-violet-600 to-indigo-600 rounded-[2rem] p-8 flex items-center justify-between shadow-xl">
                                <div>
                                    <div className="text-[10px] font-black text-violet-200 uppercase tracking-widest mb-2">Site Intelligence Available</div>
                                    <div className="text-white font-black text-lg">Switch tabs to view Wind, Solar & Hydrology assessments for this site</div>
                                </div>
                                <div className="flex gap-3">
                                    {[{ id: 'wind', icon: <Wind size={16} />, label: 'Wind' }, { id: 'solar', icon: <Sun size={16} />, label: 'Solar' }, { id: 'water', icon: <Cloud size={16} />, label: 'Water' }].map(t => (
                                        <button key={t.id} onClick={() => setActiveTab(t.id)}
                                            className="flex items-center gap-2 px-5 py-3 bg-white/20 hover:bg-white/30 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-white/20">
                                            {t.icon}{t.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                        </motion.div>
                    )}

                    {activeTab === 'wind' && (
                        <motion.div key="wind" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-8">

                            {/* HERO BANNER */}
                            <div className="relative rounded-[3rem] overflow-hidden" style={{ background: 'linear-gradient(135deg,#0f172a 0%,#1e293b 45%,#0c1a35 100%)' }}>
                                <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full opacity-10" style={{ background: 'radial-gradient(circle,#38bdf8 0%,transparent 70%)', filter: 'blur(60px)' }} />
                                <div className="relative z-10 grid grid-cols-1 lg:grid-cols-3">
                                    {/* Score arc */}
                                    <div className="flex flex-col items-center justify-center p-12 border-r border-white/5">
                                        <div className="text-[9px] font-black text-cyan-400/70 uppercase tracking-[0.3em] mb-8">Wind Viability Index</div>
                                        <div className="relative w-48 h-48">
                                            <svg viewBox="0 0 200 200" className="w-full h-full -rotate-90">
                                                <circle cx="100" cy="100" r="80" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="14" strokeDasharray="400 502" strokeLinecap="round" />
                                                <motion.circle cx="100" cy="100" r="80" fill="none" stroke="url(#wArc)" strokeWidth="14" strokeLinecap="round" strokeDasharray="502" strokeDashoffset="502" animate={{ strokeDashoffset: 502 - ((windData.score ?? 0) / 100) * 400 }} transition={{ duration: 1.5, ease: 'easeOut' }} />
                                                <defs><linearGradient id="wArc" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor="#38bdf8" /><stop offset="100%" stopColor="#818cf8" /></linearGradient></defs>
                                            </svg>
                                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                                <div className="text-5xl font-black text-white tracking-tighter">{windData.score ?? '—'}</div>
                                                <div className="text-[9px] font-black text-cyan-400 uppercase tracking-widest mt-1">{windData.rating ?? '—'}</div>
                                            </div>
                                        </div>
                                        <div className="mt-3 text-[8px] text-slate-500 font-bold">/ 100 composite score</div>
                                    </div>
                                    {/* Turbine + Grade */}
                                    <div className="flex flex-col items-center justify-center p-12 border-r border-white/5">
                                        <div className="relative mb-6">
                                            <svg width="90" height="110" viewBox="0 0 100 120">
                                                <polygon points="48,120 52,120 53,60 47,60" fill="#334155" />
                                                <circle cx="50" cy="58" r="5" fill="#64748b" />
                                                <motion.g style={{ originX: '50px', originY: '58px' }} animate={{ rotate: 360 }} transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}>
                                                    <ellipse cx="50" cy="30" rx="3.5" ry="28" fill="#38bdf8" opacity="0.9" />
                                                    <ellipse cx="50" cy="30" rx="3.5" ry="28" fill="#38bdf8" opacity="0.9" transform="rotate(120 50 58)" />
                                                    <ellipse cx="50" cy="30" rx="3.5" ry="28" fill="#38bdf8" opacity="0.9" transform="rotate(240 50 58)" />
                                                </motion.g>
                                            </svg>
                                        </div>
                                        <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Resource Grade</div>
                                        <div className="text-8xl font-black tracking-tighter leading-none" style={{ background: 'linear-gradient(135deg,#38bdf8,#818cf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{windData.resource?.grade ?? '—'}</div>
                                        <div className="text-[10px] text-slate-400 font-bold uppercase mt-3 tracking-[0.15em]">{windData.resource?.label ?? '—'}</div>
                                    </div>
                                    {/* Key metrics */}
                                    <div className="flex flex-col justify-center p-12 gap-5">
                                        <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Key Metrics · 100m AGL</div>
                                        {[
                                            { label: 'Wind Speed', t: "Wind Speed (U100)", value: `${windData.resource?.ws_100 ?? '—'} m/s`, color: '#38bdf8', bar: (windData.resource?.ws_100 ?? 0) / 15 },
                                            { label: 'Power Density', t: "Power Density (PD)", value: `${windData.resource?.pd_100 ?? '—'} W/m²`, color: '#818cf8', bar: (windData.resource?.pd_100 ?? 0) / 800 },
                                            { label: 'Air Density', t: "Air Density", value: `${windData.physics?.air_density ?? windData.resource?.ad_100 ?? '—'} kg/m³`, color: '#34d399', bar: ((windData.physics?.air_density ?? 1.0) / 1.3) },
                                            { label: 'Best CF', t: "Capacity Factor (CF)", value: windData.capacity_factors?.cf_best != null ? `${(windData.capacity_factors.cf_best * 100).toFixed(1)}%` : '—', color: '#fb923c', bar: windData.capacity_factors?.cf_best ?? 0 },
                                        ].map(({ label, t, value, color, bar }) => (
                                            <ScientificFlipCard key={label} title={t} className="w-full" backClassName="bg-slate-900 border border-white/10 rounded-2xl">
                                                <div className="flex justify-between items-baseline mb-1.5 hover:translate-x-1 transition-transform">
                                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1">
                                                        {label}
                                                    </span>
                                                    <span className="text-sm font-black text-white">{value}</span>
                                                </div>
                                                <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                                                    <motion.div className="h-full rounded-full" style={{ background: color }} initial={{ width: 0 }} animate={{ width: `${Math.min(bar * 100, 100)}%` }} transition={{ duration: 1.2, delay: 0.2 }} />
                                                </div>
                                            </ScientificFlipCard>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* LIVE HUB HEIGHTS */}
                            <div>
                                <div className="flex items-center gap-3 mb-5">
                                    <div className="p-2 rounded-xl" style={{ background: 'linear-gradient(135deg,#0f172a,#1e293b)' }}><TrendingUp size={16} className="text-cyan-400" /></div>
                                    <div>
                                        <div className="text-sm font-black text-slate-800 uppercase tracking-wider">Live Atmospheric Telemetry</div>
                                        <div className="text-[9px] text-slate-400 font-bold">Open-Meteo · Real-time multi-height readings</div>
                                    </div>
                                </div>
                                <div className="grid grid-cols-3 gap-5">
                                    {[
                                        { label: 'High Hub', height: '180m', speed: (wind_speed_180m / 3.6).toFixed(2), dir: wind_direction_180m, bg1: '#0f172a', bg2: '#1e3a5f', dot: '#38bdf8' },
                                        { label: 'Primary Hub', height: '120m', speed: (wind_speed_120m / 3.6).toFixed(2), dir: wind_direction_120m, bg1: '#1a1040', bg2: '#2d1b69', dot: '#818cf8', main: true },
                                        { label: 'Standard Hub', height: '80m', speed: (wind_speed_80m / 3.6).toFixed(2), dir: wind_direction_80m, bg1: '#0d2426', bg2: '#164e4e', dot: '#34d399' },
                                    ].map(({ label, height, speed, dir, bg1, bg2, dot, main }) => (
                                        <div key={height} className={`relative rounded-[2.5rem] overflow-hidden ${main ? 'ring-2 ring-indigo-400/40' : ''}`} style={{ background: `linear-gradient(145deg,${bg1},${bg2})` }}>
                                            {main && <div className="absolute top-4 right-4 text-[7px] font-black text-indigo-300 bg-indigo-500/20 px-2 py-1 rounded-full uppercase tracking-widest">Rated Hub</div>}
                                            <div className="p-8">
                                                <div className="text-[8px] font-black uppercase tracking-[0.25em] mb-1" style={{ color: dot }}>{label}</div>
                                                <div className="text-[9px] font-bold text-white/40 mb-5">{height} AGL</div>
                                                <div className="text-6xl font-black text-white tracking-tighter leading-none mb-1">{speed}</div>
                                                <div className="text-[9px] font-bold text-white/40 mb-5">m/s</div>
                                                <div className="flex items-center gap-4">
                                                    <div className="relative w-11 h-11 flex items-center justify-center">
                                                        <div className="absolute inset-0 rounded-full border border-white/10" />
                                                        <motion.div animate={{ rotate: dir }} transition={{ type: 'spring', stiffness: 60 }} className="w-0.5 h-4 rounded-full absolute top-1.5" style={{ background: `linear-gradient(to bottom,${dot},transparent)`, transformOrigin: 'bottom center', left: 'calc(50% - 1px)' }} />
                                                        <div className="w-1.5 h-1.5 rounded-full" style={{ background: dot }} />
                                                    </div>
                                                    <div>
                                                        <div className="text-[8px] font-black text-white/30 uppercase">Direction</div>
                                                        <div className="text-xs font-black text-white">{getCardinal(dir)}</div>
                                                        <div className="text-[8px] text-white/30">{dir}°</div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* VERTICAL PROFILE CHART */}
                            <div className="bg-white border border-slate-100 rounded-[3rem] shadow-sm overflow-hidden">
                                <div className="px-10 pt-10 pb-4 flex items-center justify-between">
                                    <div>
                                        <div className="text-xs font-black text-slate-800 uppercase tracking-wider">Vertical Wind Profile</div>
                                        <div className="text-[9px] text-slate-400 font-bold mt-0.5">GWA v3 · 10m–200m AGL · Speed · Power Density · Air Density</div>
                                    </div>
                                    <div className="flex items-center gap-5 text-[8px] font-bold text-slate-400">
                                        <span className="flex items-center gap-1.5"><span className="inline-block w-4 h-1 rounded-full bg-indigo-500" />Speed m/s</span>
                                        <span className="flex items-center gap-1.5"><span className="inline-block w-4 h-1 rounded-full bg-amber-400" />Power W/m²</span>
                                        <span className="flex items-center gap-1.5"><span className="inline-block w-4 h-0.5 bg-cyan-400" />Air Density</span>
                                    </div>
                                </div>
                                <div className="px-4 pb-4 h-[300px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <ComposedChart data={(windData.profile?.heights || []).map((h, i) => ({ height: `${h}m`, speed: windData.profile.speeds[i], power: windData.profile.densities[i], ad: windData.profile.air_density?.[i] }))} margin={{ top: 10, right: 50, left: 0, bottom: 20 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                            <XAxis dataKey="height" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} label={{ value: 'Hub height (m AGL)', position: 'insideBottom', offset: -10, fontSize: 9, fontWeight: 900, fill: '#94a3b8' }} />
                                            <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#94a3b8' }} width={40} />
                                            <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#22d3ee' }} domain={[1.0, 1.3]} tickFormatter={v => v.toFixed(2)} width={45} />
                                            <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 40px -10px rgba(0,0,0,0.2)', padding: '16px', fontSize: 11 }} />
                                            <Area yAxisId="left" type="monotone" dataKey="speed" name="Speed (m/s)" fill="#4f46e5" fillOpacity={0.07} stroke="#4f46e5" strokeWidth={3} />
                                            <Line yAxisId="left" type="monotone" dataKey="power" name="Power (W/m²)" stroke="#f59e0b" strokeWidth={2.5} dot={{ r: 5, fill: '#f59e0b', strokeWidth: 0 }} activeDot={{ r: 7 }} />
                                            <Line yAxisId="right" type="monotone" dataKey="ad" name="Air Density (kg/m³)" stroke="#22d3ee" strokeWidth={2} strokeDasharray="6 3" dot={{ r: 3, fill: '#22d3ee', strokeWidth: 0 }} />
                                        </ComposedChart>
                                    </ResponsiveContainer>
                                </div>
                                <div className="grid grid-cols-4 border-t border-slate-100">
                                    {[
                                        { label: 'Shear α', value: shearExponent.toFixed(3), sub: 'Hellmann exponent', color: 'text-indigo-600' },
                                        { label: 'Shear Ratio', value: windData.physics?.shear_ratio ?? '—', sub: 'ws100 / ws10', color: 'text-violet-600' },
                                        { label: 'RIX', value: windData.terrain?.rix ?? '—', sub: 'Ruggedness τ', color: 'text-amber-500' },
                                        { label: 'Elevation', value: `${windData.terrain?.elevation ?? '—'}m`, sub: `Slope ${windData.terrain?.slope ?? '—'}°`, color: 'text-slate-700' },
                                    ].map((p, i) => (
                                        <div key={p.label} className={`px-8 py-6 text-center ${i < 3 ? 'border-r border-slate-100' : ''}`}>
                                            <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">{p.label}</div>
                                            <div className={`text-2xl font-black ${p.color}`}>{p.value}</div>
                                            <div className="text-[8px] text-slate-300 font-bold mt-1">{p.sub}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* IEC CAPACITY FACTORS + ANNUAL YIELD */}
                            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                                <div className="lg:col-span-3 bg-white border border-slate-100 rounded-[3rem] p-10 shadow-sm">
                                    <div className="flex items-center gap-3 mb-8">
                                        <div className="p-2.5 rounded-2xl bg-indigo-50"><Zap size={16} className="text-indigo-500" /></div>
                                        <div>
                                            <div className="text-xs font-black text-slate-800 uppercase tracking-wider">IEC Turbine Capacity Factors</div>
                                            <div className="text-[9px] text-slate-400 font-bold">GWA v3 · site-specific CF per turbine class</div>
                                        </div>
                                    </div>
                                    <div className="space-y-6">
                                        {[
                                            { cls: 'IEC Class 1', sub: 'High Wind >7.5 m/s', value: windData.capacity_factors?.cf_iec1, grad: 'from-indigo-500 to-violet-500', best: windData.capacity_factors?.best_class?.includes('Class 1') },
                                            { cls: 'IEC Class 2', sub: 'Medium Wind 6.5–7.5 m/s', value: windData.capacity_factors?.cf_iec2, grad: 'from-amber-400 to-orange-400', best: windData.capacity_factors?.best_class?.includes('Class 2') },
                                            { cls: 'IEC Class 3', sub: 'Low Wind 5.0–6.5 m/s', value: windData.capacity_factors?.cf_iec3, grad: 'from-emerald-400 to-teal-400', best: windData.capacity_factors?.best_class?.includes('Class 3') },
                                        ].map(({ cls, sub, value, grad, best }) => (
                                            <div key={cls}>
                                                <div className="flex justify-between items-end mb-2.5">
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-[10px] font-black text-slate-700 uppercase tracking-wide">{cls}</span>
                                                            {best && <span className="text-[7px] font-black bg-indigo-500 text-white px-2 py-0.5 rounded-full uppercase">★ Optimal</span>}
                                                        </div>
                                                        <div className="text-[8px] text-slate-400 font-bold mt-0.5">{sub}</div>
                                                    </div>
                                                    <div className={`text-3xl font-black ${best ? 'text-indigo-600' : 'text-slate-700'}`}>{value != null ? `${(value * 100).toFixed(1)}%` : '—'}</div>
                                                </div>
                                                <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                                                    <motion.div className={`h-full rounded-full bg-gradient-to-r ${grad}`} initial={{ width: 0 }} animate={{ width: `${Math.min((value ?? 0) * 100, 100)}%` }} transition={{ duration: 1.1, ease: 'easeOut', delay: 0.15 }} />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="mt-8 pt-6 border-t border-slate-50 text-[9px] text-slate-400 font-bold">
                                        <span className="text-indigo-500 font-black">Recommended: </span>{windData.capacity_factors?.best_class ?? '—'}
                                    </div>
                                </div>
                                <div className="lg:col-span-2 flex flex-col gap-5">
                                    <div className="flex-1 relative rounded-[3rem] overflow-hidden flex flex-col justify-between p-10" style={{ background: 'linear-gradient(145deg,#0f172a 0%,#1e1b4b 60%,#0c1a35 100%)' }}>
                                        <div className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-10" style={{ background: 'radial-gradient(circle,#818cf8 0%,transparent 70%)', filter: 'blur(40px)' }} />
                                        <div>
                                            <div className="text-[8px] font-black text-indigo-400/70 uppercase tracking-[0.25em] mb-1">Annual Yield Estimate</div>
                                            <div className="text-[8px] text-slate-500 font-bold mb-5">2 MW reference turbine · best-class CF</div>
                                            <div className="text-5xl font-black text-white tracking-tighter leading-none">{windData.yield_est?.annual_mwh_2mw != null ? Number(windData.yield_est.annual_mwh_2mw).toLocaleString() : '—'}</div>
                                            <div className="text-sm font-black text-indigo-300/60 mt-1">MWh / year</div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4 pt-5 border-t border-white/10">
                                            <div>
                                                <div className="text-[7px] text-slate-500 font-black uppercase">Best CF</div>
                                                <div className="text-xl font-black text-white mt-0.5">{windData.capacity_factors?.cf_best != null ? `${(windData.capacity_factors.cf_best * 100).toFixed(1)}%` : '—'}</div>
                                            </div>
                                            <div>
                                                <div className="text-[7px] text-slate-500 font-black uppercase">kWh / yr</div>
                                                <div className="text-xl font-black text-white mt-0.5">{windData.yield_est?.annual_kwh_2mw != null ? `${(windData.yield_est.annual_kwh_2mw / 1000).toFixed(0)}k` : '—'}</div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className={`rounded-[2.5rem] p-8 border ${(windData.resource?.ad_loss_pct ?? 0) > 5 ? 'bg-rose-50 border-rose-200' : 'bg-emerald-50 border-emerald-200'}`}>
                                        <div className="flex justify-between items-start mb-2">
                                            <div>
                                                <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Air Density Power Loss</div>
                                                <div className="text-[8px] text-slate-400 font-bold mt-0.5">vs ISA 1.225 kg/m³</div>
                                            </div>
                                            <div className={`text-3xl font-black ${(windData.resource?.ad_loss_pct ?? 0) > 5 ? 'text-rose-600' : 'text-emerald-600'}`}>{windData.resource?.ad_loss_pct ?? 0}%</div>
                                        </div>
                                        <div className="text-[9px] font-bold text-slate-500">{(windData.resource?.ad_loss_pct ?? 0) > 5 ? '⚠️ Significant — reduces AEP' : '✅ Within operational tolerance'}</div>
                                    </div>
                                </div>
                            </div>

                            {/* AIR DENSITY + TERRAIN */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                <div className="bg-white border border-slate-100 rounded-[3rem] p-10 shadow-sm">
                                    <div className="flex items-center gap-3 mb-8">
                                        <div className="p-2.5 rounded-2xl bg-cyan-50"><TrendingUp size={16} className="text-cyan-500" /></div>
                                        <div>
                                            <div className="text-xs font-black text-slate-800 uppercase tracking-wider">Atmospheric Density</div>
                                            <div className="text-[9px] text-slate-400 font-bold">GWA climatology vs live Open-Meteo</div>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-6">
                                        {[
                                            { label: 'GWA 100m', sub: 'Long-term avg', value: windData.physics?.air_density ?? windData.resource?.ad_100, color: '#22d3ee', pct: ((windData.physics?.air_density ?? 1.0) / 1.3) * 100 },
                                            { label: 'Live 120m', sub: 'Open-Meteo now', value: (air_density_120m ?? 1.225).toFixed(3), color: '#818cf8', pct: ((air_density_120m ?? 1.0) / 1.3) * 100 },
                                        ].map(({ label, sub, value, color, pct }) => (
                                            <div key={label} className="flex flex-col items-center gap-3">
                                                <div className="relative w-28 h-28">
                                                    <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                                                        <circle cx="50" cy="50" r="38" fill="none" stroke="#f1f5f9" strokeWidth="10" />
                                                        <motion.circle cx="50" cy="50" r="38" fill="none" stroke={color} strokeWidth="10" strokeLinecap="round" strokeDasharray="239" strokeDashoffset="239" animate={{ strokeDashoffset: 239 - (pct / 100) * 239 }} transition={{ duration: 1.3, ease: 'easeOut' }} />
                                                    </svg>
                                                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                                                        <div className="text-lg font-black text-slate-800">{value ?? '—'}</div>
                                                        <div className="text-[7px] font-bold text-slate-400">kg/m³</div>
                                                    </div>
                                                </div>
                                                <div className="text-center">
                                                    <div className="text-[9px] font-black text-slate-600 uppercase tracking-wide">{label}</div>
                                                    <div className="text-[8px] text-slate-400 font-bold">{sub}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="bg-white border border-slate-100 rounded-[3rem] p-10 shadow-sm">
                                    <div className="flex items-center gap-3 mb-8">
                                        <div className="p-2.5 rounded-2xl bg-amber-50"><Map size={16} className="text-amber-500" /></div>
                                        <div>
                                            <div className="text-xs font-black text-slate-800 uppercase tracking-wider">Terrain & Site Physics</div>
                                            <div className="text-[9px] text-slate-400 font-bold">SRTM · GWA ruggedness index</div>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        {[
                                            { label: 'Elevation', t: "Elevation (m ASL)", value: `${windData.terrain?.elevation ?? '—'}`, unit: 'm ASL', color: 'text-slate-700', bg: 'bg-slate-50', border: 'border-slate-200' },
                                            { label: 'Slope', t: "Terrain Slope", value: `${windData.terrain?.slope ?? '—'}`, unit: '°', color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' },
                                            { label: 'RIX Index', t: "Ruggedness Index (RIX)", value: `${windData.terrain?.rix ?? '—'}`, unit: 'τ', color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-200' },
                                            { label: 'Shear α', t: "Wind Shear (α)", value: shearExponent.toFixed(3), unit: 'Hellmann', color: 'text-violet-600', bg: 'bg-violet-50', border: 'border-violet-200' },
                                        ].map(({ label, t, value, unit, color, bg, border }) => (
                                            <ScientificFlipCard key={label} title={t} className="h-full" backClassName="bg-slate-900 border border-white/10 rounded-[1.75rem]">
                                                <div className={`${bg} border ${border} rounded-[1.75rem] p-5 text-center h-full flex flex-col justify-center hover:shadow-md transition-shadow`}>
                                                    <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center justify-center gap-1">
                                                        {label}
                                                    </div>
                                                    <div className={`text-2xl font-black ${color}`}>{value}</div>
                                                    <div className="text-[8px] text-slate-300 font-bold mt-0.5">{unit}</div>
                                                </div>
                                            </ScientificFlipCard>
                                        ))}
                                    </div>
                                </div>
                            </div>

                        </motion.div>
                    )}

                    {activeTab === 'solar' && (
                        <motion.div key="solar" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-8">

                            {/* ── HERO BANNER ── */}
                            <div className="relative rounded-[3rem] overflow-hidden" style={{ background: 'linear-gradient(135deg,#1c0a00 0%,#3d1a00 40%,#1a0e00 100%)' }}>
                                <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full opacity-20" style={{ background: 'radial-gradient(circle,#fb923c 0%,transparent 70%)', filter: 'blur(80px)' }} />
                                <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full opacity-10" style={{ background: 'radial-gradient(circle,#fbbf24 0%,transparent 70%)', filter: 'blur(40px)' }} />
                                <div className="relative z-10 grid grid-cols-1 lg:grid-cols-3">

                                    {/* Score arc */}
                                    <div className="flex flex-col items-center justify-center p-12 border-r border-white/5">
                                        <div className="text-[9px] font-black text-amber-400/70 uppercase tracking-[0.3em] mb-8">Solar Viability Index</div>
                                        <div className="relative w-48 h-48">
                                            <svg viewBox="0 0 200 200" className="w-full h-full -rotate-90">
                                                <circle cx="100" cy="100" r="80" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="14" strokeDasharray="400 502" strokeLinecap="round" />
                                                <motion.circle cx="100" cy="100" r="80" fill="none" stroke="url(#sArc)" strokeWidth="14" strokeLinecap="round" strokeDasharray="502" strokeDashoffset="502"
                                                    animate={{ strokeDashoffset: 502 - ((solarData.score ?? 0) / 100) * 400 }}
                                                    transition={{ duration: 1.5, ease: 'easeOut' }} />
                                                <defs>
                                                    <linearGradient id="sArc" x1="0%" y1="0%" x2="100%" y2="0%">
                                                        <stop offset="0%" stopColor="#fb923c" />
                                                        <stop offset="100%" stopColor="#fbbf24" />
                                                    </linearGradient>
                                                </defs>
                                            </svg>
                                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                                <div className="text-5xl font-black text-white tracking-tighter">{solarData.score ?? '—'}</div>
                                                <div className="text-[9px] font-black text-amber-400 uppercase tracking-widest mt-1">{solarData.rating ?? '—'}</div>
                                            </div>
                                        </div>
                                        <div className="mt-3 text-[8px] text-slate-500 font-bold">/ 100 composite score</div>
                                    </div>

                                    {/* Animated Sun */}
                                    <div className="flex flex-col items-center justify-center p-12 border-r border-white/5">
                                        <div className="relative mb-4">
                                            <motion.svg width="90" height="90" viewBox="0 0 100 100"
                                                animate={{ rotate: 360 }} transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}>
                                                {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map(angle => (
                                                    <line key={angle}
                                                        x1={50 + 30 * Math.cos(angle * Math.PI / 180)}
                                                        y1={50 + 30 * Math.sin(angle * Math.PI / 180)}
                                                        x2={50 + 42 * Math.cos(angle * Math.PI / 180)}
                                                        y2={50 + 42 * Math.sin(angle * Math.PI / 180)}
                                                        stroke="#fbbf24" strokeWidth="3" strokeLinecap="round" opacity="0.8" />
                                                ))}
                                                <circle cx="50" cy="50" r="22" fill="#fb923c" />
                                                <circle cx="50" cy="50" r="16" fill="#fbbf24" />
                                            </motion.svg>
                                        </div>
                                        <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Daily PVOUT</div>
                                        <div className="text-7xl font-black tracking-tighter leading-none" style={{ background: 'linear-gradient(135deg,#fb923c,#fbbf24)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                                            {solarData.core?.pvout_kwh_kwp_day ?? '—'}
                                        </div>
                                        <div className="text-[10px] text-slate-400 font-bold uppercase mt-2 tracking-[0.15em]">kWh / kWp / day</div>
                                    </div>

                                    {/* Key metrics */}
                                    <div className="flex flex-col justify-center p-12 gap-5">
                                        <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Key Metrics · GSA Long-term</div>
                                        {[
                                            { label: 'Global Horiz. Irr.', t: "GHI (Global Horizontal)", value: `${solarData.core?.ghi_kwh_m2_day ?? '—'} kWh/m²`, color: '#fbbf24', bar: (solarData.core?.ghi_kwh_m2_day ?? 0) / 8 },
                                            { label: 'Tilted Plane (GTI)', t: "GTI (Global Tilted)", value: `${solarData.core?.gti_kwh_m2_day ?? '—'} kWh/m²`, color: '#fb923c', bar: (solarData.core?.gti_kwh_m2_day ?? 0) / 8 },
                                            { label: 'Annual PVOUT', t: "GHI (Global Horizontal)", value: `${solarData.core?.pvout_kwh_kwp_year ?? '—'} kWh/kWp`, color: '#f97316', bar: (solarData.core?.pvout_kwh_kwp_year ?? 0) / 2000 },
                                            { label: 'Optimal Tilt', t: "Optimal Tilt", value: `${solarData.core?.optimal_tilt ?? '—'}°`, color: '#fdba74', bar: (solarData.core?.optimal_tilt ?? 0) / 90 },
                                        ].map(({ label, t, value, color, bar }) => (
                                            <ScientificFlipCard key={label} title={t} className="w-full" backClassName="bg-slate-900 border border-white/10 rounded-2xl">
                                                <div className="flex justify-between items-baseline mb-1.5 hover:translate-x-1 transition-transform">
                                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1">
                                                        {label}
                                                    </span>
                                                    <span className="text-sm font-black text-white">{value}</span>
                                                </div>
                                                <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                                                    <motion.div className="h-full rounded-full" style={{ background: color }}
                                                        initial={{ width: 0 }} animate={{ width: `${Math.min(bar * 100, 100)}%` }}
                                                        transition={{ duration: 1.2, delay: 0.2 }} />
                                                </div>
                                            </ScientificFlipCard>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* ── MONTHLY GENERATION PROFILE ── */}
                            <div className="bg-white border border-slate-100 rounded-[3rem] shadow-sm overflow-hidden">
                                <div className="px-10 pt-10 pb-4 flex items-center justify-between flex-wrap gap-4">
                                    <div>
                                        <div className="text-xs font-black text-slate-800 uppercase tracking-wider">Monthly Generation Profile</div>
                                        <div className="text-[9px] text-slate-400 font-bold mt-0.5">GSA Long-Term Climatology · kWh / kWp per month</div>
                                    </div>
                                    <div className="flex items-center gap-6">
                                        <div className="text-center">
                                            <div className="text-[8px] font-black text-emerald-500 uppercase tracking-widest">Peak</div>
                                            <div className="text-lg font-black text-emerald-700">{solarData.monthly?.best_month ?? '—'}</div>
                                            <div className="text-[9px] text-emerald-500 font-bold">{solarData.monthly?.best_val ?? '—'} kWh/kWp</div>
                                        </div>
                                        <div className="w-px h-12 bg-slate-100" />
                                        <div className="text-center">
                                            <div className="text-[8px] font-black text-red-400 uppercase tracking-widest">Trough</div>
                                            <div className="text-lg font-black text-red-600">{solarData.monthly?.worst_month ?? '—'}</div>
                                            <div className="text-[9px] text-red-400 font-bold">{solarData.monthly?.worst_val ?? '—'} kWh/kWp</div>
                                        </div>
                                        <div className="w-px h-12 bg-slate-100" />
                                        <div className="text-center">
                                            <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Stability</div>
                                            <div className="text-sm font-black text-slate-700 leading-tight">{solarData.monthly?.stability ?? '—'}</div>
                                            <div className="text-[9px] text-slate-300 font-bold">±{solarData.monthly?.range ?? '—'} kWh</div>
                                        </div>
                                    </div>
                                </div>
                                <div className="px-4 pb-4 h-[240px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={monthlySolarData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                            <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 900, fill: '#94a3b8' }} />
                                            <YAxis hide />
                                            <Tooltip cursor={{ fill: '#fef3c7', radius: 8 }} contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 40px -10px rgba(0,0,0,0.15)', padding: '12px 16px', fontSize: 11 }} formatter={(v) => [`${v} kWh/kWp`, 'PV Output']} />
                                            <Bar dataKey="pvout" name="PV Output" radius={[10, 10, 0, 0]}>
                                                {monthlySolarData.map((_, i) => (
                                                    <Cell key={i} fill={`hsl(${38 - i},${82 + i}%,${52 + i * 1.5}%)`} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                                <div className="grid grid-cols-4 border-t border-slate-100">
                                    {[
                                        { label: 'Annual GHI', value: `${solarData.core?.ghi_kwh_m2_year ?? '—'}`, unit: 'kWh/m²/yr', color: 'text-amber-500' },
                                        { label: 'Annual PVOUT', value: `${solarData.core?.pvout_kwh_kwp_year ?? '—'}`, unit: 'kWh/kWp/yr', color: 'text-orange-500' },
                                        { label: 'Diffuse Fraction', value: `${((solarData.core?.dif_fraction ?? 0) * 100).toFixed(0)}%`, unit: 'of irradiance', color: 'text-cyan-500' },
                                        { label: 'Temp Derating', value: `${solarData.core?.temp_derate_pct ?? '—'}%`, unit: 'thermal loss', color: 'text-rose-500' },
                                    ].map((p, i) => (
                                        <div key={p.label} className={`px-8 py-6 text-center ${i < 3 ? 'border-r border-slate-100' : ''}`}>
                                            <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">{p.label}</div>
                                            <div className={`text-2xl font-black ${p.color}`}>{p.value}</div>
                                            <div className="text-[8px] text-slate-300 font-bold mt-1">{p.unit}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* ── ATMOSPHERICS + TERRAIN + VALIDATION ── */}
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                                {/* Atmospherics */}
                                <div className="bg-white border border-slate-100 rounded-[3rem] p-10 shadow-sm">
                                    <div className="flex items-center gap-3 mb-8">
                                        <div className="p-2.5 rounded-2xl bg-sky-50"><Cloud size={16} className="text-sky-500" /></div>
                                        <div>
                                            <div className="text-xs font-black text-slate-800 uppercase tracking-wider">Sky Quality</div>
                                            <div className="text-[9px] text-slate-400 font-bold">Cloud · AOD · Transmittance</div>
                                        </div>
                                    </div>
                                    <div className="space-y-6">
                                        {[
                                            { label: 'Cloud Cover', t: "Cloud Fraction", sub: solarData.atmospheric?.cloud_label ?? '—', pct: solarData.atmospheric?.cloud_pct ?? 0, color: '#38bdf8', display: `${solarData.atmospheric?.cloud_pct ?? 0}%` },
                                            { label: 'AOD Aerosol', t: "Aerosol Optical Depth (AOD)", sub: solarData.atmospheric?.aod_label ?? '—', pct: (solarData.atmospheric?.aod ?? 0) / 0.8 * 100, color: '#fb923c', display: `${solarData.atmospheric?.aod ?? 0}` },
                                        ].map(({ label, t, sub, pct, color, display }) => (
                                            <ScientificFlipCard key={label} title={t} className="w-full" backClassName="bg-slate-900 border border-white/10 rounded-2xl">
                                                <div className="flex justify-between items-end mb-2 hover:translate-x-1 transition-transform">
                                                    <div className="flex flex-col">
                                                        <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1">
                                                            {label}
                                                        </div>
                                                        <div className="text-[8px] text-slate-300 font-bold mt-0.5">{sub}</div>
                                                    </div>
                                                    <div className="text-xl font-black text-slate-800">{display}</div>
                                                </div>
                                                <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden shadow-inner font-black">
                                                    <motion.div className="h-full rounded-full" style={{ background: color }}
                                                        initial={{ width: 0 }} animate={{ width: `${Math.min(pct, 100)}%` }}
                                                        transition={{ duration: 1.1, ease: 'easeOut' }} />
                                                </div>
                                            </ScientificFlipCard>
                                        ))}
                                        <div className="grid grid-cols-2 gap-3 pt-2">
                                            {[
                                                { label: 'Clear Days', t: "Cloud Fraction", value: solarData.atmospheric?.clear_days_yr ?? '—', unit: 'days/yr', color: 'text-amber-500', bg: 'bg-amber-50', border: 'border-amber-100' },
                                                { label: 'Transmittance', t: "DIF (Diffuse Fraction)", value: solarData.atmospheric?.transmittance ?? '—', unit: 'τ ratio', color: 'text-violet-500', bg: 'bg-violet-50', border: 'border-violet-100' },
                                                { label: 'Avg Temp', t: "Thermal Derating", value: `${solarData.core?.avg_temp ?? '—'}°C`, unit: 'ambient', color: 'text-rose-500', bg: 'bg-rose-50', border: 'border-rose-100' },
                                                { label: 'Temp Loss', t: "Thermal Derating", value: `${solarData.core?.temp_derate_pct ?? '—'}%`, unit: 'derating', color: 'text-slate-600', bg: 'bg-slate-50', border: 'border-slate-100' },
                                            ].map(({ label, t, value, unit, color, bg, border }) => (
                                                <ScientificFlipCard key={label} title={t} className="h-full" backClassName="bg-slate-900 border border-white/10 rounded-[1.5rem]">
                                                    <div className={`${bg} border ${border} rounded-[1.5rem] p-4 text-center h-full flex flex-col justify-center hover:shadow-md transition-shadow`}>
                                                        <div className="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</div>
                                                        <div className={`text-lg font-black ${color}`}>{value}</div>
                                                        <div className="text-[7px] text-slate-300 font-bold">{unit}</div>
                                                    </div>
                                                </ScientificFlipCard>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Terrain */}
                                <div className="bg-white border border-slate-100 rounded-[3rem] p-10 shadow-sm">
                                    <div className="flex items-center gap-3 mb-8">
                                        <div className="p-2.5 rounded-2xl bg-amber-50"><Map size={16} className="text-amber-500" /></div>
                                        <div>
                                            <div className="text-xs font-black text-slate-800 uppercase tracking-wider">Site Terrain</div>
                                            <div className="text-[9px] text-slate-400 font-bold">SRTM 30m · Elevation · Aspect · Slope</div>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-center mb-6">
                                        <svg width="130" height="130" viewBox="0 0 130 130">
                                            <circle cx="65" cy="65" r="62" fill="#fafafa" stroke="#f1f5f9" strokeWidth="1.5" />
                                            <circle cx="65" cy="65" r="50" fill="none" stroke="#f1f5f9" strokeWidth="1" />
                                            {['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'].map((d, i) => {
                                                const a = i * 45 * Math.PI / 180;
                                                const r = i % 2 === 0 ? 54 : 50;
                                                return <text key={d} x={65 + r * Math.sin(a)} y={65 - r * Math.cos(a) + 3}
                                                    textAnchor="middle" fontSize={i % 2 === 0 ? 9 : 7} fontWeight="900"
                                                    fill={i % 2 === 0 ? '#94a3b8' : '#cbd5e1'}>{d}</text>;
                                            })}
                                            <motion.g initial={{ rotate: 0 }} animate={{ rotate: solarData.terrain?.aspect_deg ?? 0 }}
                                                style={{ originX: '65px', originY: '65px' }}
                                                transition={{ type: 'spring', stiffness: 60, damping: 15 }}>
                                                <polygon points="65,20 68,65 65,72 62,65" fill="#fb923c" opacity="0.9" />
                                                <polygon points="65,72 68,65 65,108 62,65" fill="#94a3b8" opacity="0.5" />
                                            </motion.g>
                                            <circle cx="65" cy="65" r="5" fill="#fff" stroke="#fb923c" strokeWidth="2" />
                                        </svg>
                                        <div className="text-[9px] text-slate-400 font-bold text-center mt-1">Panel faces {solarData.terrain?.aspect_deg ?? '—'}° from North</div>
                                        <div className="text-[8px] text-slate-300 font-bold text-center">90°–270° optimal for N. Hemisphere</div>
                                    </div>
                                    <div className="grid grid-cols-3 gap-3">
                                        {[
                                            { label: 'Elevation', t: "Elevation (m ASL)", value: `${solarData.terrain?.elevation_m ?? '—'}`, unit: 'm ASL', color: 'text-slate-700', bg: 'bg-slate-50', border: 'border-slate-100' },
                                            { label: 'Slope', t: "Terrain Slope", value: `${solarData.terrain?.slope_deg ?? '—'}°`, unit: 'degrees', color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-100' },
                                            { label: 'Aspect', t: "Optimal Tilt", value: `${solarData.terrain?.aspect_deg ?? '—'}°`, unit: 'from N', color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100' },
                                        ].map(({ label, t, value, unit, color, bg, border }) => (
                                            <ScientificFlipCard key={label} title={t} className="h-full" backClassName="bg-slate-900 border border-white/10 rounded-[1.5rem]">
                                                <div className={`${bg} border ${border} rounded-[1.5rem] p-4 text-center h-full flex flex-col justify-center hover:shadow-md transition-shadow`}>
                                                    <div className="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</div>
                                                    <div className={`text-xl font-black ${color}`}>{value}</div>
                                                    <div className="text-[7px] text-slate-300 font-bold">{unit}</div>
                                                </div>
                                            </ScientificFlipCard>
                                        ))}
                                    </div>
                                </div>

                                {/* ERA5 Validation */}
                                <div className="bg-white border border-slate-100 rounded-[3rem] p-10 shadow-sm flex flex-col">
                                    <div className="flex items-center gap-3 mb-8">
                                        <div className="p-2.5 rounded-2xl bg-emerald-50"><TrendingUp size={16} className="text-emerald-500" /></div>
                                        <div>
                                            <div className="text-xs font-black text-slate-800 uppercase tracking-wider">Data Validation</div>
                                            <div className="text-[9px] text-slate-400 font-bold">GSA vs ERA5 Reanalysis Cross-Check</div>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 mb-6">
                                        <div className="p-6 rounded-[2rem] text-center" style={{ background: 'linear-gradient(135deg,#3d1a00,#5c2800)' }}>
                                            <div className="text-[8px] font-black text-amber-400 uppercase tracking-widest mb-2">GSA Primary</div>
                                            <div className="text-3xl font-black text-white tracking-tighter">{solarData.validation?.gsa_ghi_day ?? '—'}</div>
                                            <div className="text-[9px] text-amber-400/70 font-bold mt-1">kWh/m²/day</div>
                                            <div className="text-[8px] text-slate-500 mt-1">Global Solar Atlas</div>
                                        </div>
                                        <div className="p-6 bg-slate-50 border border-slate-100 rounded-[2rem] text-center">
                                            <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-2">ERA5 Check</div>
                                            <div className="text-3xl font-black text-slate-700 tracking-tighter">{solarData.validation?.era5_ghi_day ?? '—'}</div>
                                            <div className="text-[9px] text-slate-400 font-bold mt-1">kWh/m²/day</div>
                                            <div className="text-[8px] text-slate-400 mt-1">ECMWF Reanalysis</div>
                                        </div>
                                    </div>
                                    <div className="mt-auto p-6 rounded-[2rem] bg-gradient-to-br from-slate-50 to-amber-50 border border-amber-100">
                                        <div className="flex justify-between items-baseline mb-3">
                                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Data Agreement</span>
                                            <span className={`text-3xl font-black ${(solarData.validation?.agreement_pct ?? 0) >= 90 ? 'text-emerald-600' : 'text-orange-500'}`}>
                                                {solarData.validation?.agreement_pct ?? '—'}%
                                            </span>
                                        </div>
                                        <div className="h-3 bg-white rounded-full overflow-hidden shadow-inner mb-3">
                                            <motion.div initial={{ width: 0 }} animate={{ width: `${solarData.validation?.agreement_pct ?? 0}%` }}
                                                transition={{ duration: 1.1, ease: 'easeOut' }}
                                                className={`h-full rounded-full ${(solarData.validation?.agreement_pct ?? 0) >= 90 ? 'bg-gradient-to-r from-emerald-400 to-green-500' : 'bg-gradient-to-r from-orange-400 to-red-400'}`} />
                                        </div>
                                        <div className="text-[9px] font-bold text-slate-500">
                                            ERA5 drift: <span className="text-amber-600 font-black">±{solarData.validation?.era5_ghi_diff_pct ?? '—'}%</span>
                                            <span className="ml-2">{(solarData.validation?.agreement_pct ?? 0) >= 90 ? '✅ High confidence' : '⚠ Verify with ground station'}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                        </motion.div>
                    )}

                    {activeTab === 'water' && (
                        <motion.div key="water" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-12">

                            {/* ══════════ HERO BANNER ══════════ */}
                            <div className="relative rounded-[3rem] overflow-hidden bg-gradient-to-br from-slate-900 via-blue-950 to-cyan-950 p-10 shadow-2xl">
                                {/* Animated water ripple rings */}
                                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                                    {[0, 1, 2].map(i => (
                                        <motion.div key={i}
                                            className="absolute rounded-full border border-cyan-500/20"
                                            style={{ width: 300 + i * 180, height: 300 + i * 180, top: '50%', left: '60%', x: '-50%', y: '-50%' }}
                                            animate={{ scale: [1, 1.15, 1], opacity: [0.3, 0.05, 0.3] }}
                                            transition={{ duration: 3 + i, repeat: Infinity, delay: i * 0.8 }}
                                        />
                                    ))}
                                </div>

                                <div className="relative z-10 grid grid-cols-1 lg:grid-cols-3 gap-10 items-center">

                                    {/* Left: animated water-drop SVG + score gauge */}
                                    <div className="flex flex-col items-center gap-6">
                                        {/* Animated droplet */}
                                        <div className="relative">
                                            <motion.svg viewBox="0 0 80 100" className="w-24 h-28 drop-shadow-2xl"
                                                animate={{ y: [0, -6, 0] }} transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}>
                                                <defs>
                                                    <linearGradient id="dropGrad" x1="0" y1="0" x2="1" y2="1">
                                                        <stop offset="0%" stopColor="#38bdf8" />
                                                        <stop offset="100%" stopColor="#0ea5e9" />
                                                    </linearGradient>
                                                    <filter id="dropGlow">
                                                        <feGaussianBlur stdDeviation="3" result="blur" />
                                                        <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                                                    </filter>
                                                </defs>
                                                <path d="M40 5 C40 5 8 45 8 65 a32 32 0 0 0 64 0 C72 45 40 5 40 5Z"
                                                    fill="url(#dropGrad)" filter="url(#dropGlow)" opacity="0.9" />
                                                <ellipse cx="28" cy="50" rx="7" ry="12" fill="white" opacity="0.25" />
                                            </motion.svg>
                                        </div>

                                        <div className="text-[9px] font-black text-sky-400/70 uppercase tracking-[0.3em] mb-8 text-center">Hydrology Index</div>

                                        {/* Arc gauge — risk score */}
                                        {(() => {
                                            const score = waterData.composite_risk_score ?? 0;
                                            const pct = Math.min(score / 100, 1);
                                            const r = 52; const circ = Math.PI * r; // half circle
                                            const dash = pct * circ;
                                            const col = score >= 60 ? '#22c55e' : score >= 40 ? '#f59e0b' : '#ef4444';
                                            return (
                                                <div className="relative w-44 h-24 flex items-end justify-center">
                                                    <svg viewBox="0 0 120 65" className="w-full">
                                                        <path d="M10 60 A52 52 0 0 1 110 60" fill="none" stroke="#1e3a5f" strokeWidth="10" strokeLinecap="round" />
                                                        <motion.path d="M10 60 A52 52 0 0 1 110 60" fill="none" stroke={col} strokeWidth="10"
                                                            strokeLinecap="round"
                                                            strokeDasharray={`${dash} ${circ}`}
                                                            initial={{ strokeDasharray: `0 ${circ}` }}
                                                            animate={{ strokeDasharray: `${dash} ${circ}` }}
                                                            transition={{ duration: 1.4, ease: 'easeOut' }} />
                                                    </svg>
                                                    <div className="absolute inset-0 flex flex-col items-center justify-end pb-1">
                                                        <div className="text-4xl font-black text-white tracking-tighter leading-none" style={{ color: col }}>{score}</div>
                                                        <div className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mt-0.5 flex items-center">
                                                            Supply Index
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })()}
                                        <div className="text-[10px] font-black uppercase tracking-[0.2em] px-5 py-2 rounded-full border"
                                            style={{
                                                color: (waterData.composite_risk_score ?? 0) >= 60 ? '#4ade80' : (waterData.composite_risk_score ?? 0) >= 40 ? '#fbbf24' : '#f87171',
                                                borderColor: (waterData.composite_risk_score ?? 0) >= 60 ? '#4ade8040' : (waterData.composite_risk_score ?? 0) >= 40 ? '#fbbf2440' : '#f8717140',
                                                background: (waterData.composite_risk_score ?? 0) >= 60 ? '#4ade8010' : (waterData.composite_risk_score ?? 0) >= 40 ? '#fbbf2410' : '#f8717110',
                                            }}>
                                            {waterData.water_rating ?? '—'}
                                        </div>
                                    </div>

                                    {/* Centre: key metric bars */}
                                    <div className="space-y-5 col-span-1">
                                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Hydrology Fingerprint</div>
                                        {[
                                            { label: 'Annual Precipitation', t: "CHIRPS Precipitation", val: waterData.precipitation?.annual_mm ?? 0, max: 3000, unit: 'mm/yr', col: '#38bdf8' },
                                            { label: 'Surface Water Occurrence', t: "Flood Occurrence (JRC)", val: waterData.surface_water?.occurrence_pct ?? 0, max: 100, unit: '%', col: '#818cf8' },
                                            { label: 'GW Storage Anomaly (LWE)', t: "GRACE GW Anomaly", val: Math.abs(waterData.groundwater_grace?.lwe_thickness_cm ?? 0), max: 30, unit: 'cm', col: '#34d399' },
                                            { label: 'Root-Zone Soil Moisture', t: "Root-Zone Soil Moisture", val: waterData.soil_moisture?.root_zone ?? 0, max: 500, unit: 'kg/m²', col: '#fb923c' },
                                        ].map(({ label, t, val, max, unit, col }) => (
                                            <ScientificFlipCard key={label} title={t} className="w-full" backClassName="bg-slate-900 border border-white/10 rounded-2xl">
                                                <div className="flex justify-between items-center mb-1.5 hover:translate-x-1 transition-transform">
                                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                                                        {label}
                                                    </span>
                                                    <span className="text-xs font-black" style={{ color: col }}>{val} <span className="text-slate-500 font-bold text-[9px]">{unit}</span></span>
                                                </div>
                                                <div className="h-2 bg-white/5 rounded-full overflow-hidden shadow-inner">
                                                    <motion.div className="h-full rounded-full"
                                                        style={{ background: col }}
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${Math.min(val / max * 100, 100)}%` }}
                                                        transition={{ duration: 1, ease: 'easeOut' }} />
                                                </div>
                                            </ScientificFlipCard>
                                        ))}
                                    </div>

                                    {/* Right: quick-stat KPI tiles */}
                                    <div className="grid grid-cols-2 gap-4">
                                        {[
                                            { label: 'Daily Precip', t: "CHIRPS Precipitation", val: waterData.precipitation?.daily_mm ?? '—', unit: 'mm/day', col: 'from-cyan-600 to-blue-700' },
                                            { label: 'PDSI Index', t: "PDSI (Drought Index)", val: waterData.terraclimate?.pdsi ?? '—', unit: waterData.terraclimate?.pdsi_label ?? '', col: 'from-indigo-600 to-violet-700' },
                                            { label: 'Flood Risk', t: "Flood Occurrence (JRC)", val: waterData.surface_water?.flood_risk ?? '—', unit: '', col: 'from-rose-600 to-orange-700' },
                                            { label: 'GW Status', t: "GRACE GW Anomaly", val: waterData.groundwater_grace?.status_label ?? '—', unit: '', col: (waterData.groundwater_grace?.lwe_thickness_cm ?? 0) < -10 ? 'from-rose-600 to-red-700' : (waterData.groundwater_grace?.lwe_thickness_cm ?? 0) < -2 ? 'from-amber-600 to-orange-700' : 'from-emerald-600 to-teal-700' },
                                        ].map(({ label, t, val, unit, col }) => (
                                            <ScientificFlipCard key={label} title={t} className="h-full" backClassName="bg-slate-900 border border-white/10 rounded-[1.5rem]">
                                                <div className={`bg-gradient-to-br ${col} p-5 rounded-[1.5rem] shadow-xl text-white relative overflow-hidden h-full flex flex-col justify-center hover:scale-[1.02] transition-transform`}>
                                                    <div className="absolute inset-0 bg-white/5" />
                                                    <div className="text-[8px] font-black uppercase tracking-widest opacity-70 mb-2 flex items-center gap-1">
                                                        {label}
                                                    </div>
                                                    <div className="text-base font-black leading-tight relative z-10">{val}</div>
                                                    {unit && <div className="text-[8px] font-bold opacity-60 mt-1">{unit}</div>}
                                                </div>
                                            </ScientificFlipCard>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* ══════════ ROW 1: Climate Water Balance ══════════ */}
                            <div className="space-y-6">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-blue-950 border border-blue-900 rounded-2xl text-cyan-400 shadow-sm"><Cloud size={20} /></div>
                                    <div>
                                        <h2 className="text-lg font-black text-slate-800 tracking-tight leading-none uppercase">Climate Water Balance</h2>
                                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1.5">TerraClimate · PDSI · Deficit · ET · Runoff · 2019–2024</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
                                    {[
                                        { label: 'PDSI Drought', info: 'Palmer Drought Severity Index. Long-term drought index using temperature and precipitation. Values below -2 indicate drought.', val: waterData.terraclimate?.pdsi ?? '—', sub: waterData.terraclimate?.pdsi_label ?? '—', unit: 'index', pct: Math.min(Math.abs((waterData.terraclimate?.pdsi ?? 0) / 6) * 100, 100), barCol: (waterData.terraclimate?.pdsi ?? 0) >= 0 ? '#38bdf8' : '#f87171', textCol: (waterData.terraclimate?.pdsi ?? 0) >= 0 ? 'text-blue-500' : 'text-red-500' },
                                        { label: 'Water Deficit', info: 'The amount of water that would have evaporated if it were available but wasn’t. Measures cumulative water stress.', val: waterData.terraclimate?.water_deficit_mm_month ?? '—', sub: waterData.terraclimate?.deficit_label ?? '—', unit: 'mm/month', pct: Math.min((waterData.terraclimate?.water_deficit_mm_month ?? 0) / 200 * 100, 100), barCol: '#fb923c', textCol: 'text-orange-500' },
                                        { label: 'Surface Runoff', info: 'Indicates the volume of water from precipitation that flows over the land surface. Reflects ground saturation.', val: waterData.terraclimate?.runoff_mm_month ?? '—', sub: `Annual: ${waterData.terraclimate?.runoff_annual_mm ?? '—'} mm`, unit: 'mm/month', pct: Math.min((waterData.terraclimate?.runoff_mm_month ?? 0) / 80 * 100, 100), barCol: '#22d3ee', textCol: 'text-cyan-500' },
                                        { label: 'Actual ET', info: 'Total water evaporated from soil and transpired by plants. Essential for understanding cooling potential.', val: waterData.terraclimate?.actual_et_mm_month ?? '—', sub: `Annual: ${waterData.terraclimate?.actual_et_annual_mm ?? '—'} mm`, unit: 'mm/month', pct: Math.min((waterData.terraclimate?.actual_et_mm_month ?? 0) / 150 * 100, 100), barCol: '#4ade80', textCol: 'text-emerald-500' },
                                    ].map(({ label, info, val, sub, unit, pct, barCol, textCol }) => (
                                        <div key={label} className="bg-white border border-slate-100 rounded-[2.5rem] p-8 shadow-sm flex flex-col gap-4 hover:shadow-lg transition-all">
                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center">{label}</span>
                                            <div className={`text-4xl font-black tracking-tighter ${textCol}`}>{val}</div>
                                            <div className="text-[9px] font-bold text-slate-400">{unit}</div>
                                            <div className="text-[9px] font-bold text-slate-500">{sub}</div>
                                            <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden mt-auto">
                                                <motion.div className="h-full rounded-full"
                                                    style={{ background: barCol }}
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${pct}%` }}
                                                    transition={{ duration: 0.9, ease: 'easeOut' }} />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* ══════════ ROW 2: Soil Moisture + MODIS ET ══════════ */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                                {/* Soil Moisture Profile */}
                                <div className="bg-white border border-slate-100 rounded-[3rem] p-10 shadow-sm space-y-8">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-amber-50 border border-amber-100 rounded-2xl text-amber-500"><Layers size={20} /></div>
                                        <div>
                                            <h2 className="text-lg font-black text-slate-800 tracking-tight leading-none uppercase">Soil Moisture Profile</h2>
                                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1.5">GLDAS v2.1 · Layer-by-layer · 2020–2024</p>
                                        </div>
                                    </div>
                                    <div className="space-y-5">
                                        {[
                                            { label: '0 – 10 cm  Topsoil', val: waterData.soil_moisture?.layer_0_10cm ?? 0, max: 50, col: '#fbbf24', bg: 'bg-amber-400', text: 'text-amber-600' },
                                            { label: '10 – 40 cm  Root Upper', val: waterData.soil_moisture?.layer_10_40cm ?? 0, max: 120, col: '#a3e635', bg: 'bg-lime-400', text: 'text-lime-600' },
                                            { label: '40 – 100 cm  Sub-soil', val: waterData.soil_moisture?.layer_40_100cm ?? 0, max: 300, col: '#34d399', bg: 'bg-emerald-400', text: 'text-emerald-600' },
                                            { label: 'Root Zone Total', val: waterData.soil_moisture?.root_zone ?? 0, max: 500, col: '#818cf8', bg: 'bg-indigo-400', text: 'text-indigo-600' },
                                        ].map(({ label, val, max, col, bg, text }) => (
                                            <div key={label}>
                                                <div className="flex justify-between items-center mb-2">
                                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</span>
                                                    <span className={`text-sm font-black ${text}`}>{val} <span className="text-[9px] font-bold text-slate-300">kg/m²</span></span>
                                                </div>
                                                <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                                                    <motion.div className={`h-full rounded-full ${bg}`}
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${Math.min(val / max * 100, 100)}%` }}
                                                        transition={{ duration: 0.9, ease: 'easeOut' }} />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-50">
                                        <div className="text-center p-5 bg-amber-50 rounded-2xl border border-amber-100">
                                            <div className="text-[9px] font-black text-amber-500 uppercase mb-1">Topsoil Layer</div>
                                            <div className="text-2xl font-black text-amber-600">{waterData.soil_moisture?.layer_0_10cm ?? '—'}</div>
                                            <div className="text-[8px] text-amber-400 font-bold">kg/m²</div>
                                        </div>
                                        <div className="text-center p-5 bg-indigo-50 rounded-2xl border border-indigo-100">
                                            <div className="text-[9px] font-black text-indigo-500 uppercase mb-1">Root Zone</div>
                                            <div className="text-2xl font-black text-indigo-600">{waterData.soil_moisture?.root_zone ?? '—'}</div>
                                            <div className="text-[8px] text-indigo-400 font-bold">kg/m²</div>
                                        </div>
                                    </div>
                                </div>

                                {/* MODIS ET */}
                                <div className="bg-white border border-slate-100 rounded-[3rem] p-10 shadow-sm space-y-8">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-2xl text-emerald-500"><TrendingUp size={20} /></div>
                                        <div>
                                            <h2 className="text-lg font-black text-slate-800 tracking-tight leading-none uppercase">Evapotranspiration</h2>
                                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1.5">MODIS MOD16A2 · Actual ET · 2020–2024</p>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-center justify-center py-6 bg-gradient-to-br from-emerald-50 to-cyan-50 rounded-[2rem] border border-emerald-100 relative overflow-hidden">
                                        <div className="absolute inset-0 pointer-events-none">
                                            <motion.div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-300 via-cyan-300 to-emerald-300 opacity-50"
                                                animate={{ x: ['-100%', '100%'] }} transition={{ duration: 3, repeat: Infinity, ease: 'linear' }} />
                                        </div>
                                        <div className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-2">8-Day Composite</div>
                                        <div className="text-7xl font-black text-emerald-600 tracking-tighter leading-none">
                                            {waterData.modis_et?.et_kg_m2_8day ?? '—'}
                                        </div>
                                        <div className="text-sm font-bold text-emerald-400 mt-2">kg / m² per 8 days</div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="p-6 bg-slate-50 rounded-[1.5rem] border border-slate-100 text-center">
                                            <div className="text-[9px] font-black text-slate-400 uppercase mb-2">Monthly Est.</div>
                                            <div className="text-2xl font-black text-slate-700">{waterData.modis_et?.et_monthly_est ?? '—'}</div>
                                            <div className="text-[9px] text-slate-300 font-bold uppercase mt-1">mm / month</div>
                                        </div>
                                        <div className="p-6 bg-slate-900 rounded-[1.5rem] text-center">
                                            <div className="text-[9px] font-black text-slate-500 uppercase mb-2">Annual Est.</div>
                                            <div className="text-2xl font-black text-emerald-400">{waterData.modis_et?.et_annual_est_mm ?? '—'}</div>
                                            <div className="text-[9px] text-slate-500 font-bold uppercase mt-1">mm / year</div>
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Water Loss Intensity</div>
                                        <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden">
                                            <motion.div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-cyan-500"
                                                initial={{ width: 0 }}
                                                animate={{ width: `${Math.min((waterData.modis_et?.et_kg_m2_8day ?? 0) / 40 * 100, 100)}%` }}
                                                transition={{ duration: 0.9 }} />
                                        </div>
                                        <div className="flex justify-between text-[8px] text-slate-300 font-bold">
                                            <span>0</span><span>Low</span><span>Moderate</span><span>40+ kg/m²</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* ══════════ ROW 3: NDWI + Flood Zone ══════════ */}
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                                {/* NDWI Ring Gauge */}
                                <div className="lg:col-span-1 bg-white border border-slate-100 rounded-[3rem] p-10 shadow-sm space-y-8">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-blue-50 border border-blue-100 rounded-2xl text-blue-500"><Droplets size={20} /></div>
                                        <div>
                                            <h2 className="text-lg font-black text-slate-800 tracking-tight leading-none uppercase">NDWI Index</h2>
                                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1.5">Landsat 9 C02 · 2022–2024</p>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-center py-4">
                                        {(() => {
                                            const ndwi = waterData.ndwi_landsat9?.ndwi_value ?? null;
                                            const pct = ndwi !== null ? Math.round((ndwi + 1) / 2 * 100) : 50;
                                            const col = ndwi > 0.3 ? '#3b82f6' : ndwi > 0 ? '#34d399' : ndwi > -0.2 ? '#f59e0b' : '#ef4444';
                                            return (
                                                <>
                                                    <div className="relative w-40 h-40 mb-6">
                                                        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                                                            <circle cx="50" cy="50" r="40" fill="none" stroke="#f1f5f9" strokeWidth="12" />
                                                            <motion.circle cx="50" cy="50" r="40" fill="none" stroke={col} strokeWidth="12"
                                                                strokeLinecap="round"
                                                                strokeDasharray={`${2.51 * pct} ${251 - 2.51 * pct}`}
                                                                initial={{ strokeDasharray: `0 251` }}
                                                                animate={{ strokeDasharray: `${2.51 * pct} ${251 - 2.51 * pct}` }}
                                                                transition={{ duration: 1.2, ease: 'easeOut' }} />
                                                        </svg>
                                                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                                                            <div className="text-3xl font-black" style={{ color: col }}>{ndwi !== null ? ndwi : '—'}</div>
                                                            <div className="text-[8px] font-black text-slate-300 uppercase">ndwi</div>
                                                        </div>
                                                    </div>
                                                    <div className="text-center">
                                                        <div className="text-sm font-black text-slate-600">{waterData.ndwi_landsat9?.ndwi_label ?? 'No data'}</div>
                                                        <div className="text-[9px] text-slate-400 font-bold mt-2 uppercase">{waterData.ndwi_landsat9?.scenes_used ?? '—'} scenes analysed</div>
                                                    </div>
                                                </>
                                            );
                                        })()}
                                    </div>
                                    <div className="flex justify-between text-[8px] font-black text-slate-300 uppercase px-2">
                                        <span>−1 Dry</span><span>0</span><span>+1 Water</span>
                                    </div>
                                </div>

                                {/* Flood Zone */}
                                <div className="lg:col-span-2 bg-white border border-slate-100 rounded-[3rem] p-10 shadow-sm space-y-8">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-red-50 border border-red-100 rounded-2xl text-red-400"><AlertTriangle size={20} /></div>
                                        <div>
                                            <h2 className="text-lg font-black text-slate-800 tracking-tight leading-none uppercase">Flood Zone Analysis</h2>
                                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1.5">JRC GSW v1.4 · 1984–2021 Surface Water History</p>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-6">
                                        <div className={`p-8 rounded-[2rem] border-2 flex flex-col gap-3 ${(waterData.surface_water?.flood_risk ?? '').includes('No') ? 'bg-emerald-50 border-emerald-200' : (waterData.surface_water?.flood_risk ?? '').includes('Very Low') ? 'bg-yellow-50 border-yellow-200' : 'bg-red-50 border-red-200'}`}>
                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Flood Risk Level</span>
                                            <div className={`text-xl font-black ${(waterData.surface_water?.flood_risk ?? '').includes('No') ? 'text-emerald-600' : (waterData.surface_water?.flood_risk ?? '').includes('Very Low') ? 'text-yellow-600' : 'text-red-600'}`}>{waterData.surface_water?.flood_risk ?? '—'}</div>
                                            <span className="text-[9px] text-slate-400 font-bold">Max extent: {waterData.surface_water?.max_extent_fraction ?? '—'}</span>
                                        </div>
                                        <div className="p-8 rounded-[2rem] bg-slate-50 border border-slate-100 flex flex-col gap-3">
                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Seasonal Water</span>
                                            <div className="text-2xl font-black text-slate-800">{waterData.surface_water?.seasonality_months ?? '—'}</div>
                                            <span className="text-[10px] text-slate-400 font-bold">months / year</span>
                                        </div>
                                        <div className="p-8 rounded-[2rem] bg-gradient-to-br from-blue-900 to-cyan-900 text-white flex flex-col gap-3 relative overflow-hidden">
                                            <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/10 rounded-full -translate-y-8 translate-x-8" />
                                            <span className="text-[9px] font-black text-blue-300 uppercase tracking-widest">Water Occurrence</span>
                                            <div className="text-4xl font-black text-white relative z-10">{waterData.surface_water?.occurrence_pct ?? '—'}<span className="text-sm text-blue-300">%</span></div>
                                            <span className="text-[9px] text-blue-400 font-bold">% of years with water</span>
                                        </div>
                                        <div className="p-8 rounded-[2rem] bg-slate-50 border border-slate-100 flex flex-col gap-3">
                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Daily Precip</span>
                                            <div className="text-2xl font-black text-cyan-600">{waterData.precipitation?.daily_mm ?? '—'}</div>
                                            <span className="text-[10px] text-slate-400 font-bold">mm / day avg (CHIRPS)</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* ══════════ ROW 4: Infrastructure + GW Audit ══════════ */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                                {/* Infrastructure */}
                                <div className="bg-white border border-slate-100 rounded-[3rem] p-10 shadow-sm space-y-8">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-violet-50 border border-violet-100 rounded-2xl text-violet-500"><Zap size={20} /></div>
                                        <div>
                                            <h2 className="text-lg font-black text-slate-800 tracking-tight leading-none uppercase">Infrastructure Node</h2>
                                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1.5">Nearest Powerhouse Assets</p>
                                        </div>
                                    </div>
                                    {waterData.infrastructure ? (
                                        <div className="space-y-8">
                                            <div className="flex justify-between items-end pb-8 border-b border-slate-50">
                                                <div>
                                                    <div className="text-3xl font-black text-slate-800">{waterData.infrastructure.name}</div>
                                                    <div className="text-xs text-slate-400 font-bold uppercase mt-2 tracking-widest">{waterData.infrastructure.river} Basin Node</div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-5xl font-black text-violet-600 tracking-tighter">{waterData.infrastructure.dist_km} <span className="text-sm text-slate-300">km</span></div>
                                                    <div className="text-[10px] text-slate-400 font-bold uppercase mt-2">{waterData.infrastructure.dist_km < 20 ? 'Local Proximity' : waterData.infrastructure.dist_km < 100 ? 'Regional Hub' : 'Grid Distant'}</div>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-6">
                                                <div className="p-8 bg-slate-50 rounded-3xl border border-slate-100">
                                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Installed Cap</span>
                                                    <div className="text-2xl font-black text-slate-800">{waterData.infrastructure.cap_mw} <span className="text-xs opacity-40 uppercase">MW</span></div>
                                                </div>
                                                <div className="p-8 bg-slate-900 rounded-3xl text-white shadow-xl">
                                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">Design Energy</span>
                                                    <div className="text-2xl font-black text-violet-400">{waterData.infrastructure.energy_mu} <span className="text-xs opacity-40 uppercase">MU</span></div>
                                                </div>
                                            </div>
                                        </div>
                                    ) : <div className="p-10 text-center text-slate-300 italic text-sm">No local infrastructure identified in query radius.</div>}
                                </div>

                                {/* Groundwater Audit */}
                                <div className="bg-white border border-slate-100 rounded-[3rem] p-10 shadow-sm space-y-8">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-cyan-50 border border-cyan-100 rounded-2xl text-cyan-600"><Settings size={20} /></div>
                                        <div>
                                            <h2 className="text-lg font-black text-slate-800 tracking-tight leading-none uppercase">Groundwater Audit</h2>
                                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1.5">Block-level Sustainability Status · CGWB</p>
                                        </div>
                                    </div>
                                    {waterData.admin ? (
                                        <div className="space-y-8">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <div className="text-3xl font-black text-slate-800">{waterData.admin.block}</div>
                                                    <div className="text-xs text-slate-400 font-bold uppercase mt-2 tracking-widest">Administrative Block</div>
                                                </div>
                                                <div className={`px-6 py-2 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-sm ${(waterData.admin?.cat || '').toLowerCase().includes('safe')
                                                    ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                                                    : (waterData.admin?.cat || '').toLowerCase().includes('semi')
                                                        ? 'bg-amber-50 text-amber-600 border border-amber-100'
                                                        : 'bg-red-50 text-red-600 border border-red-100'
                                                    }`}>
                                                    {waterData.admin?.cat || 'Unknown'}
                                                </div>
                                            </div>
                                            <div className="bg-gradient-to-br from-cyan-50 to-blue-50 p-8 rounded-[2rem] border border-cyan-100">
                                                <div className="flex justify-between items-center mb-6">
                                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Extraction Ratio</span>
                                                    <span className="text-3xl font-black text-cyan-700">{waterData.admin.extract_pct?.toFixed(1)}%</span>
                                                </div>
                                                <div className="w-full h-4 bg-white rounded-full overflow-hidden shadow-inner">
                                                    <motion.div className={`h-full rounded-full ${waterData.admin.extract_pct > 90 ? 'bg-gradient-to-r from-red-500 to-rose-600' : 'bg-gradient-to-r from-cyan-500 to-blue-600'}`}
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${Math.min(waterData.admin.extract_pct, 100)}%` }}
                                                        transition={{ duration: 1 }} />
                                                </div>
                                                <div className="text-[8px] text-slate-400 font-bold mt-3">
                                                    {waterData.admin.extract_pct > 100
                                                        ? '⚠ Over-extracted — exceeds sustainable recharge'
                                                        : waterData.admin.extract_pct > 70
                                                            ? '⚠️ Semi-Critical — Groundwater nearing stress limits'
                                                            : '✅ Within sustainable limits'}
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-6">
                                                <div className="text-center p-6 bg-slate-50 rounded-2xl border border-slate-100">
                                                    <div className="text-[9px] font-black text-slate-400 uppercase mb-1">Annual Draft</div>
                                                    <div className="text-xl font-black text-slate-700">{waterData.admin.usage?.toFixed(1)} <span className="text-xs font-bold text-slate-300">ham</span></div>
                                                    <div className="text-[8px] text-slate-300 mt-1">volume extracted</div>
                                                </div>
                                                <div className="text-center p-6 bg-emerald-50 rounded-2xl border border-emerald-100">
                                                    <div className="text-[9px] font-black text-slate-400 uppercase mb-1">Net Availability</div>
                                                    <div className="text-xl font-black text-emerald-700">{waterData.admin.avail?.toFixed(1)} <span className="text-xs font-bold text-emerald-300">ham</span></div>
                                                    <div className="text-[8px] text-emerald-400 mt-1">annual recharge</div>
                                                </div>
                                            </div>
                                        </div>
                                    ) : <div className="p-10 text-center text-slate-300 italic text-sm">Groundwater administrative data unavailable.</div>}
                                </div>
                            </div>

                        </motion.div>
                    )}

                </AnimatePresence>
            </main>
        </motion.div>
    );
};


const Droplets = ({ size, className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M7 16.3c2.2 0 4-1.8 4-4 0-3.3-4-6.3-4-6.3S3 9 3 12.3c0 2.2 1.8 4 4 4z" />
        <path d="M17 16.3c2.2 0 4-1.8 4-4 0-3.3-4-6.3-4-6.3s-4 3-4 6.3c0 2.2 1.8 4 4 4z" />
    </svg>
);

const SectionHeader = ({ title, subtitle, icon }) => (
    <div className="flex items-center gap-4">
        <div className="p-3 bg-slate-100 rounded-2xl text-slate-600 shadow-sm border border-slate-200">{icon}</div>
        <div>
            <h2 className="text-lg font-black text-slate-800 tracking-tight leading-none uppercase">{title}</h2>
            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1.5">{subtitle}</p>
        </div>
    </div>
);

const HubColumn = ({ label, height, speed, direction, density, color, isMain, getCardinal }) => {
    const flux = (0.5 * density * Math.pow(parseFloat(speed), 3)).toFixed(1);
    return (
        <div className={`bg-white p-8 rounded-[2.5rem] border transition-all duration-300 flex flex-col items-center ${isMain ? 'border-emerald-200 ring-4 ring-emerald-50' : 'border-slate-100 shadow-sm'}`}>
            <div className="text-center mb-6">
                <span className={`text-[9px] font-black uppercase tracking-widest mb-1 block ${isMain ? 'text-emerald-600' : 'text-slate-400'}`}>{label}</span>
                <span className="text-4xl font-black text-slate-800 tracking-tighter">{height}</span>
            </div>
            <div className="w-full space-y-6">
                <div className="text-center">
                    <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest block mb-1">Velocity</span>
                    <div className={`text-5xl font-black ${color} tracking-tighter`}>{speed} <span className="text-xs text-slate-400">m/s</span></div>
                </div>
                <div className="p-4 bg-slate-50 rounded-2xl text-center">
                    <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest block mb-1">Kinetic Power Density</span>
                    <div className="text-xl font-black text-slate-800">{flux} <span className="text-[9px] text-amber-500">W/m²</span></div>
                </div>
                <div className="flex items-center justify-between px-2">
                    <div className="flex flex-col">
                        <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Vector</span>
                        <span className="text-xs font-black">{direction}° {getCardinal(direction)}</span>
                    </div>
                    <motion.div animate={{ rotate: direction }} className="w-10 h-10 rounded-full border border-slate-200 flex items-center justify-center relative">
                        <div className="w-0.5 h-6 bg-indigo-500 rounded-full" />
                        <div className="absolute top-1 w-2 h-2 bg-indigo-500 rotate-45 border-t border-l border-white" />
                    </motion.div>
                </div>
            </div>
        </div>
    );
};

const MetricCard = ({ label, value, unit, icon }) => (
    <div className="bg-white p-6 rounded-[2rem] border border-slate-100 flex flex-col justify-between hover:shadow-lg transition-all">
        <div className="flex justify-between items-center mb-4">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{label}</span>
            <div className="text-slate-200">{icon}</div>
        </div>
        <div className="text-2xl font-black text-slate-800 tracking-tight">{value} <span className="text-xs text-slate-300 uppercase">{unit}</span></div>
    </div>
);

const ResourceCard = ({ label, value, unit, color }) => (
    <div className="bg-white p-6 rounded-2xl border border-slate-100">
        <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</div>
        <div className={`text-2xl font-black ${color} tracking-tight`}>{value} <span className="text-xs text-slate-300 uppercase">{unit}</span></div>
    </div>
);

export default ReportView;
