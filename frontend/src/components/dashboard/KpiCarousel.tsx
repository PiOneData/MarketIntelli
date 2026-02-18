import { useState, useEffect, useCallback, useRef } from "react";
import type { PowerMarketOverview } from "../../types/powerMarket";
import type { MarketOverview } from "../../types/dashboard";

interface KpiCard {
  id: string;
  label: string;
  value: string;
  unit: string;
  icon: React.ReactNode;
  colorVar: string;
  description: string;
}

interface KpiCarouselProps {
  pmOverview?: PowerMarketOverview;
  marketOverview?: MarketOverview;
  avgTariff?: number;
  pmLoading?: boolean;
  mktLoading?: boolean;
}

function formatCapacity(mw: number): { value: string; unit: string } {
  if (mw >= 1000) {
    return { value: (mw / 1000).toFixed(2), unit: "GW" };
  }
  return { value: mw.toLocaleString("en-IN", { maximumFractionDigits: 0 }), unit: "MW" };
}

function formatGeneration(mu: number): { value: string; unit: string } {
  if (mu >= 1000) {
    return { value: (mu / 1000).toFixed(1), unit: "BU" };
  }
  return { value: mu.toLocaleString("en-IN", { maximumFractionDigits: 0 }), unit: "MU" };
}

// Simple inline SVG icons
const SolarIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="4"/><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/>
    <line x1="4.22" y1="4.22" x2="7.05" y2="7.05"/><line x1="16.95" y1="16.95" x2="19.78" y2="19.78"/>
    <line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/>
    <line x1="4.22" y1="19.78" x2="7.05" y2="16.95"/><line x1="16.95" y1="7.05" x2="19.78" y2="4.22"/>
  </svg>
);
const WindIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.7 7.7a2.5 2.5 0 1 1 1.8 4.3H2"/><path d="M9.6 4.6A2 2 0 1 1 11 8H2"/><path d="M12.6 19.4A2 2 0 1 0 14 16H2"/>
  </svg>
);
const HydroIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2C6.5 11 4 15.5 4 18a8 8 0 0 0 16 0c0-2.5-2.5-7-8-16z"/>
  </svg>
);
const BioIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 22c1.25-1.25 2.5-3.75 5-3.75s3.75 2.5 5 3.75 2.5-3.75 5-3.75"/>
    <path d="M12 7c0 0 2.5-3 5-3s5 3 5 3-2.5 3-5 3-5-3-5-3z"/><line x1="12" y1="7" x2="12" y2="22"/>
  </svg>
);
const GenerationIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
  </svg>
);
const CapacityIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
  </svg>
);
const RegionIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
  </svg>
);
const TariffIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
  </svg>
);

const CARDS_PER_SLIDE = 4;
const AUTO_ADVANCE_MS = 5000;

export default function KpiCarousel({
  pmOverview,
  marketOverview,
  avgTariff,
  pmLoading,
  mktLoading,
}: KpiCarouselProps) {
  const [activeSlide, setActiveSlide] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const buildCards = (): KpiCard[] => {
    const loading = pmLoading || mktLoading;
    const dash = "—";

    const reTotal = pmOverview
      ? formatCapacity(pmOverview.total_installed_re_mw)
      : { value: dash, unit: "GW" };
    const solar = pmOverview
      ? formatCapacity(pmOverview.total_solar_mw)
      : { value: dash, unit: "GW" };
    const wind = pmOverview
      ? formatCapacity(pmOverview.total_wind_mw)
      : { value: dash, unit: "GW" };
    const gen = pmOverview
      ? formatGeneration(pmOverview.total_generation_mu)
      : { value: dash, unit: "BU" };
    const smallHydro = pmOverview
      ? formatCapacity(pmOverview.total_small_hydro_mw)
      : { value: dash, unit: "MW" };
    const biomass = pmOverview
      ? formatCapacity(pmOverview.total_biomass_mw)
      : { value: dash, unit: "MW" };
    const regions = marketOverview
      ? marketOverview.regional_distribution.length.toString()
      : dash;
    const dataYear = pmOverview ? pmOverview.data_year.toString() : "2025";

    return [
      {
        id: "re-total",
        label: "Total RE Installed",
        value: loading ? dash : reTotal.value,
        unit: loading ? "" : reTotal.unit,
        icon: <CapacityIcon />,
        colorVar: "--color-primary",
        description: "All renewable sources combined",
      },
      {
        id: "solar",
        label: "Solar Capacity",
        value: loading ? dash : solar.value,
        unit: loading ? "" : solar.unit,
        icon: <SolarIcon />,
        colorVar: "--color-accent",
        description: "Ground & rooftop solar PV",
      },
      {
        id: "wind",
        label: "Wind Capacity",
        value: loading ? dash : wind.value,
        unit: loading ? "" : wind.unit,
        icon: <WindIcon />,
        colorVar: "--kpi-blue",
        description: "Onshore wind installed",
      },
      {
        id: "generation",
        label: "Total RE Generation",
        value: loading ? dash : gen.value,
        unit: loading ? "" : gen.unit,
        icon: <GenerationIcon />,
        colorVar: "--color-success",
        description: `Energy produced in ${dataYear}`,
      },
      {
        id: "small-hydro",
        label: "Small Hydro",
        value: loading ? dash : smallHydro.value,
        unit: loading ? "" : smallHydro.unit,
        icon: <HydroIcon />,
        colorVar: "--kpi-cyan",
        description: "Run-of-river & micro hydro",
      },
      {
        id: "biomass",
        label: "Biomass / Waste",
        value: loading ? dash : biomass.value,
        unit: loading ? "" : biomass.unit,
        icon: <BioIcon />,
        colorVar: "--kpi-rose",
        description: "Biomass & biogas plants",
      },
      {
        id: "regions",
        label: "States Tracked",
        value: loading ? dash : regions,
        unit: "States",
        icon: <RegionIcon />,
        colorVar: "--kpi-indigo",
        description: "Geographic coverage across India",
      },
      {
        id: "tariff",
        label: "Avg. RE Tariff",
        value: loading || avgTariff === undefined ? dash : avgTariff.toFixed(2),
        unit: loading || avgTariff === undefined ? "" : "₹/kWh",
        icon: <TariffIcon />,
        colorVar: "--kpi-orange",
        description: "Weighted average discovered tariff",
      },
    ];
  };

  const cards = buildCards();
  const totalSlides = Math.ceil(cards.length / CARDS_PER_SLIDE);

  const goToSlide = useCallback(
    (idx: number) => {
      setActiveSlide(((idx % totalSlides) + totalSlides) % totalSlides);
    },
    [totalSlides],
  );

  const next = useCallback(() => goToSlide(activeSlide + 1), [activeSlide, goToSlide]);
  const prev = useCallback(() => goToSlide(activeSlide - 1), [activeSlide, goToSlide]);

  useEffect(() => {
    if (isHovered) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = setInterval(next, AUTO_ADVANCE_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isHovered, next]);

  const slidedCards = cards.slice(
    activeSlide * CARDS_PER_SLIDE,
    activeSlide * CARDS_PER_SLIDE + CARDS_PER_SLIDE,
  );

  return (
    <section
      className="kpi-carousel"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      aria-label="Key Performance Indicators"
    >
      <div className="kpi-carousel-header">
        <div className="kpi-carousel-title-group">
          <h3 className="kpi-carousel-title">Key Market Indicators</h3>
          <span className="kpi-carousel-subtitle">
            {pmOverview ? `Data Year: ${pmOverview.data_year}` : "Renewable Energy — India"}
          </span>
        </div>
        <div className="kpi-carousel-nav">
          <button
            className="kpi-nav-btn"
            onClick={prev}
            aria-label="Previous slide"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>
          <div className="kpi-carousel-dots">
            {Array.from({ length: totalSlides }).map((_, i) => (
              <button
                key={i}
                className={`kpi-dot${i === activeSlide ? " kpi-dot--active" : ""}`}
                onClick={() => goToSlide(i)}
                aria-label={`Go to slide ${i + 1}`}
              />
            ))}
          </div>
          <button
            className="kpi-nav-btn"
            onClick={next}
            aria-label="Next slide"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </button>
        </div>
      </div>

      <div className="kpi-slide" key={activeSlide}>
        {slidedCards.map((card) => (
          <div
            className="kpi-card"
            key={card.id}
            style={{ "--kpi-accent": `var(${card.colorVar})` } as React.CSSProperties}
          >
            <div className="kpi-card-top">
              <div className="kpi-card-icon-wrap">
                {card.icon}
              </div>
              <div className="kpi-card-values">
                <span className="kpi-card-value">{card.value}</span>
                {card.unit && <span className="kpi-card-unit">{card.unit}</span>}
              </div>
            </div>
            <div className="kpi-card-bottom">
              <span className="kpi-card-label">{card.label}</span>
              <span className="kpi-card-desc">{card.description}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="kpi-progress-bar">
        <div
          className="kpi-progress-fill"
          style={{ width: `${((activeSlide + 1) / totalSlides) * 100}%` }}
        />
      </div>
    </section>
  );
}
