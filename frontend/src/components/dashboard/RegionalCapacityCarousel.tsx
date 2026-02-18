import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import type { RenewableCapacitySummary } from "../../types/powerMarket";

type Region = "North" | "South" | "East" | "West";

/* ─── Indian state → region mapping ──────────────────────────────────────── */
const STATE_REGION: Record<string, Region> = {
  // North
  Rajasthan: "North", "Uttar Pradesh": "North", Haryana: "North",
  Punjab: "North", "Himachal Pradesh": "North", Uttarakhand: "North",
  "Jammu and Kashmir": "North", "Jammu & Kashmir": "North",
  Delhi: "North", Ladakh: "North",
  // South
  "Tamil Nadu": "South", Karnataka: "South", Kerala: "South",
  "Andhra Pradesh": "South", Telangana: "South", Puducherry: "South",
  // East
  "West Bengal": "East", Odisha: "East", Bihar: "East",
  Jharkhand: "East", Assam: "East", Chhattisgarh: "East",
  Meghalaya: "East", Tripura: "East", Manipur: "East",
  Mizoram: "East", Nagaland: "East", "Arunachal Pradesh": "East",
  Sikkim: "East",
  // West
  Gujarat: "West", Maharashtra: "West", Goa: "West",
  "Madhya Pradesh": "West",
};

/* ─── Region styling config ───────────────────────────────────────────────── */
const REGION_CFG: Record<Region, {
  color: string; light: string; border: string;
  direction: string; key: string;
}> = {
  North: { color: "#1d4ed8", light: "#eff6ff", border: "#3b82f6", direction: "↑", key: "N" },
  South: { color: "#065f46", light: "#f0fdf4", border: "#10b981", direction: "↓", key: "S" },
  East:  { color: "#92400e", light: "#fffbeb", border: "#f59e0b", direction: "→", key: "E" },
  West:  { color: "#4c1d95", light: "#f5f3ff", border: "#8b5cf6", direction: "←", key: "W" },
};

/* ─── Fallback/demo data for when API has no capacity data ────────────────── */
const FALLBACK_REGIONAL: Record<Region, { mw: number; sources: { name: string; mw: number }[] }> = {
  North: { mw: 42500, sources: [{ name: "Solar", mw: 32100 }, { name: "Wind", mw: 6800 }, { name: "Small Hydro", mw: 3600 }] },
  South: { mw: 67300, sources: [{ name: "Wind", mw: 29400 }, { name: "Solar", mw: 28600 }, { name: "Small Hydro", mw: 9300 }] },
  East:  { mw: 18700, sources: [{ name: "Solar", mw: 8200 }, { name: "Small Hydro", mw: 5400 }, { name: "Biomass", mw: 5100 }] },
  West:  { mw: 58200, sources: [{ name: "Solar", mw: 28400 }, { name: "Wind", mw: 22500 }, { name: "Biomass", mw: 7300 }] },
};

const FALLBACK_CHAMPS: Record<string, { state: string; mw: number }[]> = {
  Solar:       [{ state: "Rajasthan", mw: 18700 }, { state: "Gujarat", mw: 10500 }, { state: "Karnataka", mw: 9400 }, { state: "Tamil Nadu", mw: 8200 }],
  Wind:        [{ state: "Tamil Nadu", mw: 10500 }, { state: "Gujarat", mw: 10200 }, { state: "Rajasthan", mw: 7400 }, { state: "Karnataka", mw: 6500 }],
  "Small Hydro":[{ state: "Himachal Pradesh", mw: 2800 }, { state: "Uttarakhand", mw: 2100 }, { state: "Karnataka", mw: 1900 }, { state: "Kerala", mw: 1600 }],
  Biomass:     [{ state: "Maharashtra", mw: 2600 }, { state: "Uttar Pradesh", mw: 2200 }, { state: "Karnataka", mw: 1800 }, { state: "Andhra Pradesh", mw: 1400 }],
};

/* ─── Utility ─────────────────────────────────────────────────────────────── */
function fmtGW(mw: number): string {
  if (mw >= 1000) return `${(mw / 1000).toFixed(1)} GW`;
  return `${mw.toLocaleString("en-IN", { maximumFractionDigits: 0 })} MW`;
}

/* ─── Animated Solar Sun ──────────────────────────────────────────────────── */
function SolarAnimation() {
  return (
    <div className="rcd-anim-wrap rcd-solar-wrap">
      {/* ambient glow */}
      <div className="rcd-solar-glow" />
      <svg viewBox="-70 -70 140 140" className="rcd-solar-svg" aria-hidden="true">
        <defs>
          <radialGradient id="rcdSunGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stopColor="#fffbeb" />
            <stop offset="45%"  stopColor="#fbbf24" />
            <stop offset="100%" stopColor="#f59e0b" />
          </radialGradient>
        </defs>

        {/* outer slow-rotating rays */}
        <g className="rcd-solar-rays-outer">
          {Array.from({ length: 12 }).map((_, i) => {
            const a = (i * 30 * Math.PI) / 180;
            const r1 = 34, r2 = 58 + (i % 3 === 0 ? 8 : 0);
            return (
              <line
                key={i}
                x1={Math.cos(a) * r1} y1={Math.sin(a) * r1}
                x2={Math.cos(a) * r2} y2={Math.sin(a) * r2}
                stroke="#fbbf24"
                strokeWidth={i % 3 === 0 ? 3 : 1.5}
                strokeLinecap="round"
                opacity={i % 3 === 0 ? 1 : 0.55}
              />
            );
          })}
        </g>

        {/* inner counter-rotating rays */}
        <g className="rcd-solar-rays-inner">
          {Array.from({ length: 8 }).map((_, i) => {
            const a = ((i * 45 + 22.5) * Math.PI) / 180;
            return (
              <line
                key={i}
                x1={Math.cos(a) * 26} y1={Math.sin(a) * 26}
                x2={Math.cos(a) * 42} y2={Math.sin(a) * 42}
                stroke="#f59e0b"
                strokeWidth={2.5}
                strokeLinecap="round"
                opacity={0.75}
              />
            );
          })}
        </g>

        {/* sun disc */}
        <circle r="26" fill="url(#rcdSunGrad)" className="rcd-solar-core" />
        <circle r="18" fill="#fffbeb" opacity="0.45" className="rcd-solar-inner" />
      </svg>
    </div>
  );
}

/* ─── Animated Wind Turbines ──────────────────────────────────────────────── */
function WindAnimation() {
  return (
    <div className="rcd-anim-wrap rcd-wind-wrap">
      {/* main turbine */}
      <div className="rcd-turbine-unit rcd-turbine-main">
        <svg viewBox="-55 -52 110 52" className="rcd-turbine-head" aria-hidden="true">
          <defs>
            <linearGradient id="rcdBlade1" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#93c5fd" />
              <stop offset="100%" stopColor="#1e40af" />
            </linearGradient>
          </defs>
          <g>
            <animateTransform
              attributeName="transform"
              attributeType="XML"
              type="rotate"
              from="0 0 0"
              to="360 0 0"
              dur="3s"
              repeatCount="indefinite"
            />
            <path d="M-4,4 L4,4 L2.5,-43 L0,-48 L-2.5,-43 Z" fill="url(#rcdBlade1)" />
            <path d="M-4,4 L4,4 L2.5,-43 L0,-48 L-2.5,-43 Z" fill="url(#rcdBlade1)" transform="rotate(120 0 0)" />
            <path d="M-4,4 L4,4 L2.5,-43 L0,-48 L-2.5,-43 Z" fill="url(#rcdBlade1)" transform="rotate(240 0 0)" />
          </g>
          <circle r="8" fill="#1e3a5f" />
          <circle r="4.5" fill="#475569" />
        </svg>
        <div className="rcd-turbine-tower rcd-turbine-tower-lg" />
      </div>

      {/* secondary turbine (offset, slower) */}
      <div className="rcd-turbine-unit rcd-turbine-secondary">
        <svg viewBox="-38 -36 76 36" className="rcd-turbine-head rcd-turbine-head-sm" aria-hidden="true">
          <defs>
            <linearGradient id="rcdBlade2" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#bfdbfe" />
              <stop offset="100%" stopColor="#3b82f6" />
            </linearGradient>
          </defs>
          <g>
            <animateTransform
              attributeName="transform"
              attributeType="XML"
              type="rotate"
              from="60 0 0"
              to="420 0 0"
              dur="4.5s"
              repeatCount="indefinite"
            />
            <path d="M-3,3 L3,3 L2,-30 L0,-34 L-2,-30 Z" fill="url(#rcdBlade2)" />
            <path d="M-3,3 L3,3 L2,-30 L0,-34 L-2,-30 Z" fill="url(#rcdBlade2)" transform="rotate(120 0 0)" />
            <path d="M-3,3 L3,3 L2,-30 L0,-34 L-2,-30 Z" fill="url(#rcdBlade2)" transform="rotate(240 0 0)" />
          </g>
          <circle r="5.5" fill="#1e3a5f" />
          <circle r="3" fill="#475569" />
        </svg>
        <div className="rcd-turbine-tower rcd-turbine-tower-sm" />
      </div>

      {/* horizontal wind streak lines */}
      <div className="rcd-wind-streaks">
        {[0, 1, 2, 3, 4].map(i => (
          <div key={i} className={`rcd-wind-streak rcd-wind-streak-${i}`} />
        ))}
      </div>
    </div>
  );
}

/* ─── Animated Hydro Waves ────────────────────────────────────────────────── */
function HydroAnimation() {
  return (
    <div className="rcd-anim-wrap rcd-hydro-wrap">
      <div className="rcd-hydro-drops">
        {[0, 1, 2, 3].map(i => <div key={i} className={`rcd-hydro-drop rcd-hydro-drop-${i}`} />)}
      </div>
      <div className="rcd-hydro-waves-container">
        <svg viewBox="0 0 400 80" className="rcd-hydro-wave-svg" preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <linearGradient id="rcdHydroGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.75" />
              <stop offset="100%" stopColor="#0369a1" stopOpacity="0.95" />
            </linearGradient>
          </defs>
          {/* wave 1 — animate by moving along x */}
          <g className="rcd-wave-g1">
            <path d="M0,40 Q50,15 100,40 Q150,65 200,40 Q250,15 300,40 Q350,65 400,40 Q450,15 500,40 Q550,65 600,40 L600,80 L0,80 Z"
              fill="url(#rcdHydroGrad)" opacity="0.65" />
          </g>
          {/* wave 2 */}
          <g className="rcd-wave-g2">
            <path d="M0,50 Q50,25 100,50 Q150,75 200,50 Q250,25 300,50 Q350,75 400,50 Q450,25 500,50 Q550,75 600,50 L600,80 L0,80 Z"
              fill="#0284c7" opacity="0.5" />
          </g>
        </svg>
      </div>
    </div>
  );
}

/* ─── Animated Biomass Leaves ─────────────────────────────────────────────── */
function BiomassAnimation() {
  return (
    <div className="rcd-anim-wrap rcd-biomass-wrap">
      {[0, 1, 2, 3, 4, 5, 6].map(i => (
        <div key={i} className={`rcd-leaf rcd-leaf-${i}`} aria-hidden="true">
          <svg viewBox="0 0 24 32" fill="none">
            <path d="M12,2 Q21,9 19,20 Q17,29 12,30 Q7,29 5,20 Q3,9 12,2 Z"
              fill={i % 2 === 0 ? "#4ade80" : "#22c55e"} opacity="0.85" />
            <path d="M12,4 Q12,18 12,29" stroke="#166534" strokeWidth="1.2" opacity="0.55" strokeLinecap="round" />
            <path d="M12,12 Q16,10 18,14" stroke="#166534" strokeWidth="0.8" opacity="0.4" strokeLinecap="round" />
            <path d="M12,18 Q8,16 6,20" stroke="#166534" strokeWidth="0.8" opacity="0.4" strokeLinecap="round" />
          </svg>
        </div>
      ))}
    </div>
  );
}

/* ─── Slide 0: Regional overview ──────────────────────────────────────────── */
function RegionalSlide({ data }: {
  data: { totals: Record<Region, number>; sources: Record<Region, Record<string, number>> } | null;
}) {
  const REGIONS: Region[] = ["North", "South", "East", "West"];

  const getTotal = (r: Region) => data?.totals[r] ?? FALLBACK_REGIONAL[r].mw;

  const getTopSources = (r: Region) => {
    if (!data) return FALLBACK_REGIONAL[r].sources;
    return Object.entries(data.sources[r])
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([name, mw]) => ({ name, mw }));
  };

  const grandTotal = REGIONS.reduce((s, r) => s + getTotal(r), 0);

  return (
    <div className="rcd-regional-slide">
      <div className="rcd-regional-grid">
        {REGIONS.map(region => {
          const cfg = REGION_CFG[region];
          const total = getTotal(region);
          const sources = getTopSources(region);
          const pct = Math.round((total / grandTotal) * 100);

          return (
            <div
              key={region}
              className="rcd-region-card"
              style={{
                background: `linear-gradient(145deg, ${cfg.light} 0%, #fff 100%)`,
                borderTopColor: cfg.border,
              }}
            >
              {/* badge + title */}
              <div className="rcd-region-card-top">
                <div className="rcd-region-badge" style={{ background: cfg.border }}>
                  <span className="rcd-region-badge-key">{cfg.key}</span>
                </div>
                <div className="rcd-region-titles">
                  <span className="rcd-region-name" style={{ color: cfg.color }}>{region}</span>
                  <span className="rcd-region-sublabel">India</span>
                </div>
                <span className="rcd-region-pct" style={{ color: cfg.border }}>{pct}%</span>
              </div>

              {/* total capacity */}
              <div className="rcd-region-total">
                <span className="rcd-region-total-val">{fmtGW(total)}</span>
                <span className="rcd-region-total-lbl">Installed</span>
              </div>

              {/* share bar */}
              <div className="rcd-region-share-bar-bg">
                <div
                  className="rcd-region-share-bar-fill"
                  style={{ width: `${pct}%`, background: cfg.border }}
                />
              </div>

              {/* top energy sources */}
              <div className="rcd-region-sources">
                {sources.map(({ name, mw }, idx) => (
                  <div key={idx} className="rcd-region-source-row">
                    <div className="rcd-source-dot" style={{ background: cfg.border, opacity: 1 - idx * 0.2 }} />
                    <span className="rcd-source-name">{name}</span>
                    <span className="rcd-source-val">{fmtGW(mw)}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* grand total band */}
      <div className="rcd-grand-total-band">
        <div className="rcd-grand-total-icon">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 3v18h18" /><path d="m19 9-5 5-4-4-3 3" />
          </svg>
        </div>
        <span className="rcd-grand-total-label">All-India RE Installed</span>
        <span className="rcd-grand-total-val">{fmtGW(grandTotal)}</span>
        <span className="rcd-grand-total-sub">Across all 4 regions</span>
      </div>
    </div>
  );
}

/* ─── Slide 1 & 2: Single energy source champions ────────────────────────── */
interface ChampEntry { state: string; mw: number }

function EnergyChampionSlide({
  source, label, unit, animation, accentColor, bgColor, champions,
}: {
  source: string; label: string; unit: string;
  animation: React.ReactNode;
  accentColor: string; bgColor: string;
  champions: ChampEntry[];
}) {
  const max = champions[0]?.mw || 1;
  const rankMedals = ["#f59e0b", "#94a3b8", "#cd7f32", "#6b7280"];

  return (
    <div className="rcd-energy-slide" style={{ "--rcd-accent": accentColor, "--rcd-bg": bgColor } as React.CSSProperties}>
      {/* left: animation panel */}
      <div className="rcd-anim-panel">
        {animation}
        <div className="rcd-anim-label">
          <span className="rcd-anim-source">{source}</span>
          <span className="rcd-anim-unit">Energy</span>
        </div>
      </div>

      {/* right: champion cards */}
      <div className="rcd-champions-panel">
        <div className="rcd-champions-header">
          <span className="rcd-champions-title">State Leaders</span>
          <span className="rcd-champions-sub">by Installed Capacity · {label}</span>
        </div>
        <div className="rcd-champions-list">
          {champions.slice(0, 4).map(({ state, mw }, idx) => (
            <div key={state} className="rcd-champion-row">
              <div className="rcd-champion-rank" style={{ color: rankMedals[idx] }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
                <span>#{idx + 1}</span>
              </div>
              <span className="rcd-champion-state">{state}</span>
              <div className="rcd-champion-bar-bg">
                <div
                  className="rcd-champion-bar-fill"
                  style={{ width: `${Math.round((mw / max) * 100)}%`, background: accentColor }}
                />
              </div>
              <span className="rcd-champion-val">{fmtGW(mw)}</span>
            </div>
          ))}
        </div>
        <div className="rcd-champion-unit-strip" style={{ borderColor: accentColor }}>
          Capacity in {unit}
        </div>
      </div>
    </div>
  );
}

/* ─── Slide 3: Hydro + Biomass dual panel ─────────────────────────────────── */
function DualSlide({ hydro, biomass }: { hydro: ChampEntry[]; biomass: ChampEntry[] }) {
  const renderHalf = (
    title: string,
    items: ChampEntry[],
    animation: React.ReactNode,
    barColor: string,
  ) => {
    const max = items[0]?.mw || 1;
    return (
      <div className="rcd-dual-half">
        <div className="rcd-dual-anim-row">
          {animation}
          <span className="rcd-dual-title">{title}</span>
        </div>
        <div className="rcd-dual-list">
          {items.slice(0, 4).map(({ state, mw }, idx) => (
            <div key={state} className="rcd-dual-row">
              <span className="rcd-dual-rank" style={{ color: idx === 0 ? "#f59e0b" : "#94a3b8" }}>#{idx + 1}</span>
              <span className="rcd-dual-state">{state}</span>
              <div className="rcd-dual-bar-bg">
                <div className="rcd-dual-bar-fill" style={{ width: `${Math.round((mw / max) * 100)}%`, background: barColor }} />
              </div>
              <span className="rcd-dual-val">{fmtGW(mw)}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="rcd-dual-slide">
      {renderHalf("Small Hydro", hydro, <HydroAnimation />, "#0ea5e9")}
      <div className="rcd-dual-divider" />
      {renderHalf("Biomass", biomass, <BiomassAnimation />, "#22c55e")}
    </div>
  );
}

/* ─── Main carousel component ─────────────────────────────────────────────── */
interface RegionalCapacityCarouselProps {
  capacitySummary?: RenewableCapacitySummary[];
}

const SLIDE_COUNT = 4;
const AUTO_MS = 6000;
const SLIDE_LABELS = ["Regional Capacity", "Solar Leaders", "Wind Leaders", "Hydro & Biomass"];

export default function RegionalCapacityCarousel({ capacitySummary }: RegionalCapacityCarouselProps) {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /* ── derive regional aggregates ── */
  const regionalData = useMemo(() => {
    if (!capacitySummary?.length) return null;
    const totals: Record<Region, number> = { North: 0, South: 0, East: 0, West: 0 };
    const sources: Record<Region, Record<string, number>> = { North: {}, South: {}, East: {}, West: {} };
    for (const entry of capacitySummary) {
      const region = STATE_REGION[entry.state];
      if (!region) continue;
      totals[region] += entry.total_installed_mw;
      sources[region][entry.energy_source] = (sources[region][entry.energy_source] || 0) + entry.total_installed_mw;
    }
    return { totals, sources };
  }, [capacitySummary]);

  /* ── derive state champions ── */
  const champions = useMemo(() => {
    if (!capacitySummary?.length) return FALLBACK_CHAMPS;
    const map: Record<string, Record<string, number>> = {};
    for (const e of capacitySummary) {
      if (!map[e.energy_source]) map[e.energy_source] = {};
      map[e.energy_source][e.state] = (map[e.energy_source][e.state] || 0) + e.total_installed_mw;
    }
    const result: Record<string, ChampEntry[]> = {};
    for (const [src, stateMap] of Object.entries(map)) {
      result[src] = Object.entries(stateMap)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 4)
        .map(([state, mw]) => ({ state, mw }));
    }
    return result;
  }, [capacitySummary]);

  const goTo = useCallback(
    (idx: number) => setActive(((idx % SLIDE_COUNT) + SLIDE_COUNT) % SLIDE_COUNT),
    [],
  );
  const next = useCallback(() => goTo(active + 1), [active, goTo]);
  const prev = useCallback(() => goTo(active - 1), [active, goTo]);

  useEffect(() => {
    if (paused) { if (timerRef.current) clearInterval(timerRef.current); return; }
    timerRef.current = setInterval(next, AUTO_MS);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [paused, next]);

  const solar   = champions["Solar"]       || champions["solar"]       || FALLBACK_CHAMPS.Solar;
  const wind    = champions["Wind"]        || champions["wind"]        || FALLBACK_CHAMPS.Wind;
  const hydro   = champions["Small Hydro"] || FALLBACK_CHAMPS["Small Hydro"];
  const biomass = champions["Biomass"]     || champions["biomass"]     || FALLBACK_CHAMPS.Biomass;

  return (
    <section
      className="rcd-carousel"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      aria-label="Regional Capacity Dashboard"
    >
      {/* ── header ── */}
      <div className="rcd-header">
        <div className="rcd-header-left">
          <h3 className="rcd-title">Regional Capacity Dashboard</h3>
          <span className="rcd-subtitle">{SLIDE_LABELS[active]} — India Renewable Energy</span>
        </div>
        <div className="rcd-nav">
          <button className="rcd-nav-btn" onClick={prev} aria-label="Previous slide">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
          </button>
          <div className="rcd-dots">
            {Array.from({ length: SLIDE_COUNT }).map((_, i) => (
              <button
                key={i}
                className={`rcd-dot${i === active ? " rcd-dot--active" : ""}`}
                onClick={() => goTo(i)}
                aria-label={`Slide ${i + 1}: ${SLIDE_LABELS[i]}`}
              />
            ))}
          </div>
          <button className="rcd-nav-btn" onClick={next} aria-label="Next slide">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
          </button>
        </div>
      </div>

      {/* ── slide viewport ── */}
      <div className="rcd-viewport" key={active}>
        {active === 0 && <RegionalSlide data={regionalData} />}
        {active === 1 && (
          <EnergyChampionSlide
            source="Solar" label="Photovoltaic" unit="GW / MW"
            animation={<SolarAnimation />}
            accentColor="#f59e0b" bgColor="#fffbeb"
            champions={solar}
          />
        )}
        {active === 2 && (
          <EnergyChampionSlide
            source="Wind" label="Onshore Wind" unit="GW / MW"
            animation={<WindAnimation />}
            accentColor="#3b82f6" bgColor="#eff6ff"
            champions={wind}
          />
        )}
        {active === 3 && <DualSlide hydro={hydro} biomass={biomass} />}
      </div>

      {/* ── progress bar ── */}
      <div className="rcd-progress">
        <div className="rcd-progress-fill" style={{ width: `${((active + 1) / SLIDE_COUNT) * 100}%` }} />
      </div>
    </section>
  );
}
