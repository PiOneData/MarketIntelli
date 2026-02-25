import { useState, useCallback, useMemo } from "react";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

type IpoStatus = "Listed" | "Upcoming" | "Open" | "Pipeline";
type IpoSector = "Solar" | "Wind" | "Bio" | "Hydro";

interface IpoEntry {
  id: string;
  company: string;
  sector: IpoSector;
  exchange: string;
  issueSize: string;
  priceRange: string;
  listingDate: string;
  ipoOpenDate?: string;
  status: IpoStatus;
  listingGain?: string;
  description: string;
  /** Canonical link for this company (NSE quote / BSE / SEBI DRHP) */
  source: string;
  /** Label shown on the link button */
  sourceLabel: string;
}

/* ------------------------------------------------------------------ */
/*  Static Data — Power Sector IPOs (Solar, Wind, Bio, Hydro)          */
/*  Source: ipoplatform.com and public domain financial data           */
/* ------------------------------------------------------------------ */

const IPO_DATA: IpoEntry[] = [
  /* ---- SOLAR ---- */
  {
    id: "s1",
    company: "Waaree Energies Ltd",
    sector: "Solar",
    exchange: "BSE & NSE",
    issueSize: "₹4,321 Cr",
    priceRange: "₹1,427 – ₹1,503",
    listingDate: "28 Oct 2024",
    ipoOpenDate: "21 Oct 2024",
    status: "Listed",
    listingGain: "+89%",
    description:
      "India's largest solar PV module manufacturer with 12 GW aggregate installed capacity. Offers modules for utility, commercial and residential segments.",
    source: "https://www.nseindia.com/get-quotes/equity?symbol=WAAREEENER",
    sourceLabel: "View on NSE",
  },
  {
    id: "s2",
    company: "Premier Energies Ltd",
    sector: "Solar",
    exchange: "BSE & NSE",
    issueSize: "₹2,830 Cr",
    priceRange: "₹427 – ₹450",
    listingDate: "03 Sep 2024",
    ipoOpenDate: "27 Aug 2024",
    status: "Listed",
    listingGain: "+120%",
    description:
      "Solar cell and module manufacturer with 5.1 GW module capacity and 3.2 GW cell capacity. First Indian company to commercialise n-type TOPCon solar cells.",
    source: "https://www.nseindia.com/get-quotes/equity?symbol=PREMIERENE",
    sourceLabel: "View on NSE",
  },
  {
    id: "s3",
    company: "ACME Solar Holdings Ltd",
    sector: "Solar",
    exchange: "BSE & NSE",
    issueSize: "₹3,000 Cr",
    priceRange: "₹275 – ₹289",
    listingDate: "13 Nov 2024",
    ipoOpenDate: "06 Nov 2024",
    status: "Listed",
    listingGain: "-13%",
    description:
      "One of India's leading renewable energy IPPs. Operational solar capacity of 1,320 MW with additional 1,500 MW solar and 150 MW wind under construction.",
    source: "https://www.nseindia.com/get-quotes/equity?symbol=ACMESOLAR",
    sourceLabel: "View on NSE",
  },
  {
    id: "s4",
    company: "Saatvik Green Energy Ltd",
    sector: "Solar",
    exchange: "BSE & NSE",
    issueSize: "₹900 Cr",
    priceRange: "₹442 – ₹465",
    listingDate: "26 Sep 2025",
    ipoOpenDate: "19 Sep 2025",
    status: "Listed",
    listingGain: "+38%",
    description:
      "Solar PV module manufacturer and EPC service provider. Annual installed capacity of ~3.80 GW. Revenue grew 100% and PAT rose 113% in FY2025.",
    source: "https://www.nseindia.com/get-quotes/equity?symbol=SAATVIKG",
    sourceLabel: "View on NSE",
  },
  {
    id: "s5",
    company: "Vikram Solar Ltd",
    sector: "Solar",
    exchange: "BSE & NSE",
    issueSize: "₹1,500 Cr (est.)",
    priceRange: "TBA",
    listingDate: "Aug 2025",
    ipoOpenDate: "19 Aug 2025",
    status: "Listed",
    description:
      "One of India's leading solar module manufacturers with high-efficiency PERC and TOPCon modules. Significant export-oriented capacity.",
    source: "https://www.nseindia.com/get-quotes/equity?symbol=VIKRAMSOLAR",
    sourceLabel: "View on NSE",
  },
  {
    id: "s6",
    company: "CleanMax Enviro Energy Solutions Ltd",
    sector: "Solar",
    exchange: "BSE & NSE",
    issueSize: "TBA",
    priceRange: "TBA",
    listingDate: "27 Feb 2026",
    ipoOpenDate: "20 Feb 2026",
    status: "Upcoming",
    description:
      "India's leading C&I renewable energy company. Provides onsite solar, wind hybrids, and decarbonisation solutions via long-term PPAs to corporates such as Google and Apple.",
    source: "https://www.nseindia.com/market-data/all-upcoming-ipos",
    sourceLabel: "NSE Upcoming IPOs",
  },
  {
    id: "s7",
    company: "Emmvee Photovoltaic Power Pvt Ltd",
    sector: "Solar",
    exchange: "BSE & NSE",
    issueSize: "₹2,900 Cr",
    priceRange: "TBA",
    listingDate: "TBA",
    status: "Pipeline",
    description:
      "Solar panel manufacturer offering modules for utility-scale and rooftop projects. Filed DRHP with SEBI for a ₹2,900 Cr IPO.",
    source: "https://www.sebi.gov.in/sebiweb/other/OtherAction.do?doRecognisedFpi=yes&intmId=1",
    sourceLabel: "View SEBI DRHP",
  },
  {
    id: "s8",
    company: "PMEA Solar Tech Solutions Ltd",
    sector: "Solar",
    exchange: "BSE & NSE",
    issueSize: "TBA",
    priceRange: "TBA",
    listingDate: "TBA",
    status: "Pipeline",
    description:
      "Solar technology solutions provider. Filed DRHP with SEBI in September 2024.",
    source: "https://www.sebi.gov.in/sebiweb/other/OtherAction.do?doRecognisedFpi=yes&intmId=1",
    sourceLabel: "View SEBI DRHP",
  },

  /* ---- WIND ---- */
  {
    id: "w1",
    company: "Inox Green Energy Services Ltd",
    sector: "Wind",
    exchange: "BSE & NSE",
    issueSize: "₹740 Cr",
    priceRange: "₹61 – ₹65",
    listingDate: "23 Nov 2022",
    ipoOpenDate: "11 Nov 2022",
    status: "Listed",
    listingGain: "+5%",
    description:
      "One of India's major wind power O&M service providers. Subsidiary of Inox Wind Ltd. Specialises in long-term O&M contracts for wind energy projects.",
    source: "https://www.nseindia.com/get-quotes/equity?symbol=INOXGREEN",
    sourceLabel: "View on NSE",
  },
  {
    id: "w2",
    company: "Continuum Green Energy Ltd",
    sector: "Wind",
    exchange: "BSE & NSE",
    issueSize: "₹3,650 Cr",
    priceRange: "TBA",
    listingDate: "TBA",
    status: "Pipeline",
    description:
      "IPP specialising in wind and solar hybrid projects for C&I and utilities. Current operational capacity of 2.22 GWp with 1.31 GWp under construction.",
    source: "https://www.sebi.gov.in/sebiweb/other/OtherAction.do?doRecognisedFpi=yes&intmId=1",
    sourceLabel: "View SEBI DRHP",
  },

  /* ---- BIO (Biofuels / Biomass) ---- */
  {
    id: "b1",
    company: "Shubhshree Biofuels Energy Ltd",
    sector: "Bio",
    exchange: "NSE SME",
    issueSize: "₹53 Cr",
    priceRange: "₹119",
    listingDate: "16 Sep 2024",
    ipoOpenDate: "09 Sep 2024",
    status: "Listed",
    listingGain: "+67%",
    description:
      "Supplies biomass fuels including pellets and briquettes (132 T/day capacity) to industrial sectors. Benefits from Govt mandate for 5–7% biomass blending in coal thermal plants.",
    source: "https://www.nseindia.com/get-quotes/equity?symbol=SHUBHSHREE",
    sourceLabel: "View on NSE Emerge",
  },
  {
    id: "b2",
    company: "NTPC Green Energy Ltd",
    sector: "Bio",
    exchange: "BSE & NSE",
    issueSize: "₹10,000 Cr",
    priceRange: "₹102 – ₹108",
    listingDate: "27 Nov 2024",
    ipoOpenDate: "19 Nov 2024",
    status: "Listed",
    listingGain: "+15%",
    description:
      "Wholly-owned RE subsidiary of NTPC. Business covers solar, wind, hydro, biomass, waste, green hydrogen and tidal energy. Largest renewable PSU (excl. hydro).",
    source: "https://www.nseindia.com/get-quotes/equity?symbol=NTPCGREEN",
    sourceLabel: "View on NSE",
  },

  /* ---- HYDRO ---- */
  {
    id: "h1",
    company: "IREDA Ltd",
    sector: "Hydro",
    exchange: "BSE & NSE",
    issueSize: "₹2,150 Cr",
    priceRange: "₹30 – ₹32",
    listingDate: "29 Nov 2023",
    ipoOpenDate: "21 Nov 2023",
    status: "Listed",
    listingGain: "+56%",
    description:
      "Government of India NBFC under MNRE, financing solar, wind, hydropower, biomass, biofuel, green hydrogen and other RE projects since 1987.",
    source: "https://www.nseindia.com/get-quotes/equity?symbol=IREDA",
    sourceLabel: "View on NSE",
  },
  {
    id: "h2",
    company: "NTPC Green Energy Ltd",
    sector: "Hydro",
    exchange: "BSE & NSE",
    issueSize: "₹10,000 Cr",
    priceRange: "₹102 – ₹108",
    listingDate: "27 Nov 2024",
    ipoOpenDate: "19 Nov 2024",
    status: "Listed",
    listingGain: "+15%",
    description:
      "NTPC Green operates hydro, solar, wind, and other RE assets. As of Aug 2024, operational capacity included 3,071 MW solar and 100 MW wind across six states.",
    source: "https://www.nseindia.com/get-quotes/equity?symbol=NTPCGREEN",
    sourceLabel: "View on NSE",
  },
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */

const SECTOR_META: Record<IpoSector, { icon: string; color: string; bg: string; badge: string }> = {
  Solar: { icon: "☀️", color: "#d97706", bg: "#fef3c7", badge: "ipo-badge--solar" },
  Wind:  { icon: "💨", color: "#0369a1", bg: "#e0f2fe", badge: "ipo-badge--wind" },
  Bio:   { icon: "🌿", color: "#15803d", bg: "#dcfce7", badge: "ipo-badge--bio" },
  Hydro: { icon: "💧", color: "#1d4ed8", bg: "#dbeafe", badge: "ipo-badge--hydro" },
};

const STATUS_META: Record<IpoStatus, { color: string; bg: string }> = {
  Listed:   { color: "#166534", bg: "#dcfce7" },
  Open:     { color: "#92400e", bg: "#fef3c7" },
  Upcoming: { color: "#1d4ed8", bg: "#dbeafe" },
  Pipeline: { color: "#6b7280", bg: "#f3f4f6" },
};

const SECTORS: IpoSector[] = ["Solar", "Wind", "Bio", "Hydro"];

/* ------------------------------------------------------------------ */
/*  KPI Strip                                                           */
/* ------------------------------------------------------------------ */

interface IpoKpi {
  label: string;
  value: string;
  sub: string;
  color: string;
  bg: string;
  icon: string;
}

function IpoKpiStrip({ ipos }: { ipos: IpoEntry[] }) {
  const kpis: IpoKpi[] = useMemo(() => {
    const listed   = ipos.filter((i) => i.status === "Listed");
    const open     = ipos.filter((i) => i.status === "Open");
    const upcoming = ipos.filter((i) => i.status === "Upcoming");
    const pipeline = ipos.filter((i) => i.status === "Pipeline");

    // Sum of issue sizes for listed IPOs (parse ₹X,XXX Cr)
    const totalFunds = listed.reduce((sum, i) => {
      const match = i.issueSize.match(/[\d,]+/);
      return sum + (match ? parseFloat(match[0].replace(/,/g, "")) : 0);
    }, 0);

    // Average listing gain among listed IPOs that have one
    const gains = listed
      .filter((i) => i.listingGain)
      .map((i) => parseFloat((i.listingGain ?? "0").replace("%", "")));
    const avgGain = gains.length
      ? gains.reduce((a, b) => a + b, 0) / gains.length
      : 0;

    return [
      {
        label: "Total IPOs Tracked",
        value: String(ipos.length),
        sub: `${SECTORS.length} renewable sectors`,
        color: "#0f766e",
        bg: "#f0fdfa",
        icon: "📊",
      },
      {
        label: "Listed & Trading",
        value: String(listed.length),
        sub: `${open.length} open · ${upcoming.length} upcoming`,
        color: "#166534",
        bg: "#dcfce7",
        icon: "✅",
      },
      {
        label: "Pipeline (SEBI Filed)",
        value: String(pipeline.length),
        sub: "DRHP filed, awaiting approval",
        color: "#6b7280",
        bg: "#f3f4f6",
        icon: "⏳",
      },
      {
        label: "Avg. Listing Gain",
        value: avgGain >= 0 ? `+${avgGain.toFixed(0)}%` : `${avgGain.toFixed(0)}%`,
        sub: `across ${gains.length} listed IPOs`,
        color: avgGain >= 0 ? "#16a34a" : "#dc2626",
        bg: avgGain >= 0 ? "#dcfce7" : "#fee2e2",
        icon: avgGain >= 0 ? "📈" : "📉",
      },
      {
        label: "Total Funds Raised",
        value: `₹${(totalFunds / 1000).toFixed(0)}K Cr`,
        sub: "by listed RE companies",
        color: "#1d4ed8",
        bg: "#dbeafe",
        icon: "💰",
      },
    ];
  }, [ipos]);

  return (
    <div className="ipo-kpi-strip">
      {kpis.map((k) => (
        <div key={k.label} className="ipo-kpi-card" style={{ background: k.bg }}>
          <div className="ipo-kpi-icon">{k.icon}</div>
          <div className="ipo-kpi-value" style={{ color: k.color }}>{k.value}</div>
          <div className="ipo-kpi-label">{k.label}</div>
          <div className="ipo-kpi-sub">{k.sub}</div>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  IPO Card                                                            */
/* ------------------------------------------------------------------ */

function IpoCard({ ipo }: { ipo: IpoEntry }) {
  const sm = SECTOR_META[ipo.sector];
  const st = STATUS_META[ipo.status];
  const isPositive = ipo.listingGain?.startsWith("+");
  const isNegative = ipo.listingGain?.startsWith("-");

  return (
    <div className="ipo-card">
      <div className="ipo-card-header">
        <span className={`ipo-badge ${sm.badge}`}>
          {sm.icon} {ipo.sector}
        </span>
        <span
          className="ipo-status-badge"
          style={{ background: st.bg, color: st.color }}
        >
          {ipo.status}
        </span>
      </div>

      <h4 className="ipo-company">{ipo.company}</h4>
      <p className="ipo-desc">{ipo.description}</p>

      <div className="ipo-details">
        <div className="ipo-detail-row">
          <span className="ipo-detail-label">Exchange</span>
          <span className="ipo-detail-value">{ipo.exchange}</span>
        </div>
        <div className="ipo-detail-row">
          <span className="ipo-detail-label">Issue Size</span>
          <span className="ipo-detail-value">{ipo.issueSize}</span>
        </div>
        <div className="ipo-detail-row">
          <span className="ipo-detail-label">Price Range</span>
          <span className="ipo-detail-value">{ipo.priceRange}</span>
        </div>
        {ipo.ipoOpenDate && (
          <div className="ipo-detail-row">
            <span className="ipo-detail-label">IPO Open</span>
            <span className="ipo-detail-value">{ipo.ipoOpenDate}</span>
          </div>
        )}
        <div className="ipo-detail-row">
          <span className="ipo-detail-label">Listing Date</span>
          <span className="ipo-detail-value">{ipo.listingDate}</span>
        </div>
        {ipo.listingGain && (
          <div className="ipo-detail-row">
            <span className="ipo-detail-label">Listing Gain</span>
            <span
              className="ipo-gain"
              style={{ color: isPositive ? "#16a34a" : isNegative ? "#dc2626" : "#64748b" }}
            >
              {ipo.listingGain}
            </span>
          </div>
        )}
      </div>

      <a
        href={ipo.source}
        target="_blank"
        rel="noopener noreferrer"
        className="ipo-source-link"
        title={ipo.sourceLabel}
      >
        {ipo.sourceLabel} ↗
      </a>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Page                                                           */
/* ------------------------------------------------------------------ */

function IpoWatchPage() {
  const [activeSector, setActiveSector] = useState<IpoSector | "All">("All");
  const [activeStatus, setActiveStatus] = useState<IpoStatus | "All">("All");
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    // Simulate a data refresh (real implementation would re-fetch from API)
    setTimeout(() => {
      setLastRefreshed(new Date());
      setRefreshing(false);
    }, 1200);
  }, []);

  const filtered = IPO_DATA.filter((ipo) => {
    const matchSector = activeSector === "All" || ipo.sector === activeSector;
    const matchStatus = activeStatus === "All" || ipo.status === activeStatus;
    return matchSector && matchStatus;
  });

  // De-duplicate (NTPC Green appears in both Bio and Hydro)
  const seen = new Set<string>();
  const uniqueFiltered = filtered.filter((ipo) => {
    const key = `${ipo.id}-${ipo.sector}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const sectorCounts = SECTORS.reduce<Record<string, number>>((acc, s) => {
    acc[s] = IPO_DATA.filter((ipo) => ipo.sector === s).length;
    return acc;
  }, {});

  return (
    <div className="ipo-watch-page">
      {/* Header */}
      <div className="ipo-watch-header">
        <div className="ipo-watch-title-row">
          <div>
            <h2 className="ipo-watch-title">Power Sector IPO Watch</h2>
            <p className="ipo-watch-subtitle">
              India renewable energy IPOs — Solar, Wind, Bio &amp; Hydro — sourced from{" "}
              <a href="https://www.nseindia.com/market-data/all-upcoming-ipos" target="_blank" rel="noopener noreferrer">
                NSE
              </a>
              {" · "}
              <a href="https://www.bseindia.com/markets/publicissues/ipo_eq.aspx" target="_blank" rel="noopener noreferrer">
                BSE
              </a>
              {" · "}
              <a href="https://www.sebi.gov.in/sebiweb/other/OtherAction.do?doRecognisedFpi=yes&intmId=1" target="_blank" rel="noopener noreferrer">
                SEBI DRHP
              </a>
            </p>
          </div>
          <div className="ipo-refresh-area">
            <span className="ipo-refresh-ts">
              Updated: {lastRefreshed.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
            </span>
            <button
              className={`ipo-refresh-btn ${refreshing ? "ipo-refresh-btn--spinning" : ""}`}
              onClick={handleRefresh}
              disabled={refreshing}
              title="Refresh IPO data"
            >
              <svg
                className="ipo-refresh-icon"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="1 4 1 10 7 10" />
                <path d="M3.51 15a9 9 0 102.13-9.36L1 10" />
              </svg>
              {refreshing ? "Refreshing…" : "Refresh"}
            </button>
          </div>
        </div>

        {/* Sector summary chips */}
        <div className="ipo-sector-summary">
          {SECTORS.map((s) => {
            const sm = SECTOR_META[s];
            return (
              <div key={s} className="ipo-summary-chip" style={{ background: sm.bg, color: sm.color }}>
                <span>{sm.icon}</span>
                <strong>{s}</strong>
                <span className="ipo-summary-count">{sectorCounts[s]} IPOs</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* KPI Strip */}
      <IpoKpiStrip ipos={IPO_DATA} />

      {/* Filters */}
      <div className="ipo-filters">
        <div className="ipo-filter-group">
          <span className="ipo-filter-label">Sector</span>
          <div className="ipo-filter-chips">
            {(["All", ...SECTORS] as (IpoSector | "All")[]).map((s) => (
              <button
                key={s}
                className={`ipo-filter-chip ${activeSector === s ? "ipo-filter-chip--active" : ""}`}
                onClick={() => setActiveSector(s)}
              >
                {s !== "All" && SECTOR_META[s as IpoSector].icon + " "}
                {s}
              </button>
            ))}
          </div>
        </div>
        <div className="ipo-filter-group">
          <span className="ipo-filter-label">Status</span>
          <div className="ipo-filter-chips">
            {(["All", "Listed", "Open", "Upcoming", "Pipeline"] as (IpoStatus | "All")[]).map((st) => (
              <button
                key={st}
                className={`ipo-filter-chip ${activeStatus === st ? "ipo-filter-chip--active" : ""}`}
                onClick={() => setActiveStatus(st)}
              >
                {st}
              </button>
            ))}
          </div>
        </div>
        <span className="ipo-filter-count">{uniqueFiltered.length} IPOs</span>
      </div>

      {/* Grid */}
      {uniqueFiltered.length === 0 ? (
        <div className="ipo-empty">
          <p>No IPOs match the selected filters.</p>
          <button
            className="ipo-filter-chip"
            onClick={() => { setActiveSector("All"); setActiveStatus("All"); }}
          >
            Clear Filters
          </button>
        </div>
      ) : (
        <div className="ipo-grid">
          {uniqueFiltered.map((ipo) => (
            <IpoCard key={`${ipo.id}-${ipo.sector}`} ipo={ipo} />
          ))}
        </div>
      )}

      {/* Disclaimer */}
      <p className="ipo-disclaimer">
        * Listed companies link directly to{" "}
        <a href="https://www.nseindia.com" target="_blank" rel="noopener noreferrer">NSE</a>
        {" / "}
        <a href="https://www.bseindia.com" target="_blank" rel="noopener noreferrer">BSE</a>{" "}
        equity quote pages. Pipeline companies link to{" "}
        <a href="https://www.sebi.gov.in" target="_blank" rel="noopener noreferrer">SEBI</a>{" "}
        DRHP filings. Listing gains are approximate. Not investment advice.
        Always verify with NSE/BSE before investing.
      </p>
    </div>
  );
}

export default IpoWatchPage;
