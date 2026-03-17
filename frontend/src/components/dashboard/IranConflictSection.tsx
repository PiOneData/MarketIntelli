import React, { useRef, useCallback } from "react";

interface AlertCard {
  severity: "critical" | "high" | "medium" | "positive";
  category: string;
  title: string;
  body: string;
  impact: string;
  impactLabel: string;
  source: string;
  date: string;
  articleUrl: string;
  links: { label: string; url: string }[];
}

const ALERT_CARDS: AlertCard[] = [
  {
    severity: "critical",
    category: "Supply Security",
    title: "Strait of Hormuz — 20% of Global Oil at Risk",
    body:
      "US–Israel strikes on Iran began 28 Feb 2026. Brent crude surged 10–13% to ₹6,850/bbl (~$82). India sources 51% of crude from West Asia — 2.5–2.7 mb/d transits Hormuz. LPG reserves limited to 10 days; 93% of LPG imports from Gulf region.",
    impactLabel: "Price Impact",
    impact: "Brent ↑$80–82/bbl · Analysts flag $100 risk if Hormuz blocked",
    source: "Down To Earth · Business Standard",
    date: "01 Mar 2026",
    articleUrl: "https://www.downtoearth.org.in/energy/oil-gas-prices-continue-to-surge-as-west-asia-conflict-disrupts-hormuz-supply-route-india-allowed-to-turn-to-russian-crude",
    links: [
      { label: "Down To Earth", url: "https://www.downtoearth.org.in/energy/oil-gas-prices-continue-to-surge-as-west-asia-conflict-disrupts-hormuz-supply-route-india-allowed-to-turn-to-russian-crude" },
      { label: "Business Standard", url: "https://www.business-standard.com/world-news/iran-conflict-oil-shock-strait-of-hormuz-global-economy-126030900560_1.html" },
    ],
  },
  {
    severity: "high",
    category: "RE Supply Chain",
    title: "Solar Module & BESS Logistics Disruption",
    body:
      "Shipping lanes through Hormuz carry RE components and critical minerals. Freight & insurance surcharges already rising. Solar module deliveries for Q1–Q2 2026 face schedule slippage. BESS risk most acute — India pipeline jumps from 507 MWh (2025) to 5 GWh (2026) target.",
    impactLabel: "RE Risk",
    impact: "2–4 week delivery delays · BESS project commissioning at risk",
    source: "SaurEnergy · CEEW Analysis",
    date: "03 Mar 2026",
    articleUrl: "https://www.saurenergy.com/solar-energy-blog/indias-renewable-energy-sector-implications-of-a-prolonged-middle-east-conflict-11171383",
    links: [
      { label: "SaurEnergy", url: "https://www.saurenergy.com/solar-energy-blog/indias-renewable-energy-sector-implications-of-a-prolonged-middle-east-conflict-11171383" },
    ],
  },
  {
    severity: "high",
    category: "Currency & Capex",
    title: "Rupee Pressure Raises RE Project Costs",
    body:
      "Elevated oil prices expand India's import bill — 85%+ of crude is imported. Higher USD demand weakens the rupee, raising costs for imported equipment (inverters, trackers, BESS cells). Project IRRs for new bids under pressure as equipment costs in INR terms rise.",
    impactLabel: "Capex Risk",
    impact: "INR depreciation pressure · Equipment costs ↑4–8% est.",
    source: "Policy Circle · CEEW",
    date: "02 Mar 2026",
    articleUrl: "https://www.policycircle.org/economy/rupee-depreciation-indias-oil-warning/",
    links: [
      { label: "Policy Circle — Rupee Risk", url: "https://www.policycircle.org/economy/rupee-depreciation-indias-oil-warning/" },
      { label: "Policy Circle — Oil Dependency", url: "https://www.policycircle.org/economy/iran-conflict-indias-oil-dependency/" },
    ],
  },
  {
    severity: "medium",
    category: "Gas & Fertiliser",
    title: "LNG Price Spike Threatens Power & Agriculture",
    body:
      "67% of India's LNG imports (25 MT in 2025) sourced from West Asia. European gas prices up 38% after Qatar facility strikes. India's gas-based power capacity (~25 GW) faces fuel cost surge. Urea production at risk — 60% of feedstock LNG imported from Qatar.",
    impactLabel: "Power Market",
    impact: "Gas-based PLF may fall · DAM spot prices at risk of ↑",
    source: "Business Standard · Policy Circle",
    date: "01 Mar 2026",
    articleUrl: "https://www.business-standard.com/industry/news/west-asia-crisis-triggers-severe-lng-lpg-supply-shock-for-indian-firms-126030400982_1.html",
    links: [
      { label: "Business Standard — LNG Shock", url: "https://www.business-standard.com/industry/news/west-asia-crisis-triggers-severe-lng-lpg-supply-shock-for-indian-firms-126030400982_1.html" },
      { label: "Business Standard — LNG Supply Chain", url: "https://www.business-standard.com/industry/news/west-asia-crisis-lng-supply-cut-india-industry-hormuz-risk-qatar-126030900626_1.html" },
    ],
  },
  {
    severity: "high",
    category: "Green H₂ & Investment",
    title: "Gulf RE Investment & Green H₂ Partnerships at Risk",
    body:
      "Middle East has become a key partner for India in green hydrogen, critical minerals and RE project investment. Gulf SWFs (ADNOC, ACWA Power, TAQA) have active India RE commitments. Escalating instability could pause or delay deal-making and disbursements.",
    impactLabel: "Investment Risk",
    impact: "Gulf-India RE FDI pipeline under review · H₂ MoUs at risk",
    source: "SaurEnergy · Columbia SIPA CGEP",
    date: "02 Mar 2026",
    articleUrl: "https://www.saurenergy.com/solar-energy-blog/indias-renewable-energy-sector-implications-of-a-prolonged-middle-east-conflict-11171383",
    links: [
      { label: "SaurEnergy — RE Sector Impact", url: "https://www.saurenergy.com/solar-energy-blog/indias-renewable-energy-sector-implications-of-a-prolonged-middle-east-conflict-11171383" },
      { label: "Columbia CGEP", url: "https://www.energypolicy.columbia.edu/" },
    ],
  },
  {
    severity: "positive",
    category: "Policy Acceleration",
    title: "Crisis Accelerates India's Renewable Transition",
    body:
      "Sustained oil above $85–100/bbl historically accelerates RE transitions in import-dependent nations. Analysts expect faster auction rounds, expedited clearances and enhanced PLI disbursements covering full solar value chain (cells, wafers, polysilicon). Energy security narrative now politically potent.",
    impactLabel: "Upside",
    impact: "RE target acceleration likely · Import duty protection justified",
    source: "SaurEnergy · Climate Trends · CEEW",
    date: "03 Mar 2026",
    articleUrl: "https://www.saurenergy.com/solar-energy-news/iran-conflict-signals-why-india-must-accelerate-the-clean-energy-shift-11167701",
    links: [
      { label: "SaurEnergy — Clean Energy Shift", url: "https://www.saurenergy.com/solar-energy-news/iran-conflict-signals-why-india-must-accelerate-the-clean-energy-shift-11167701" },
    ],
  },
];

const SEV_LABEL: Record<AlertCard["severity"], string> = {
  critical: "Critical",
  high: "High",
  medium: "Moderate",
  positive: "Opportunity",
};

export default function IranConflictSection() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startScroll = useCallback((direction: "left" | "right") => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollLeft += direction === "right" ? 6 : -6;
      }
    }, 16);
  }, []);

  const stopScroll = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  return (
    <section className="alerts-section" id="iran-conflict">
      <div className="alerts-inner">
        <div className="alerts-header">
          <div>
            <div className="alerts-label">
              <span className="alert-pulse" />
              Geopolitical Alert · March 2026
            </div>
            <h2>Iran Conflict &amp; India Energy Impact</h2>
            <p className="s-sub">
              Six key risk vectors tracked as of March 2026 — curated analysis sourced from Down To Earth, Business Standard, SaurEnergy, Policy Circle, and CEEW.
            </p>
          </div>
          <div className="alerts-meta">
            <div className="alerts-meta-date">
              <span className="alerts-static-label">Static · Last reviewed: March 6, 2026</span>
              <span className="alerts-static-note">Curated analysis — not a live feed. For live Brent &amp; USD/INR see ticker ↑</span>
            </div>
            <span className="alerts-meta-badge">6 Active Risk Vectors</span>
          </div>
        </div>

        {/* Hover-driven carousel */}
        <div className="alerts-carousel-wrapper">
          <button
            className="alerts-carousel-btn alerts-carousel-btn--left"
            onMouseEnter={() => startScroll("left")}
            onMouseLeave={stopScroll}
            aria-label="Scroll left"
          >
            ‹
          </button>
          <div className="alerts-scroll-track" ref={scrollRef}>
            <div className="alerts-scroll-inner">
              {ALERT_CARDS.map((card) => (
                <a
                  key={card.title}
                  href={card.articleUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`alert-card alert-card--link ${card.severity}`}
                >
                  <div className="alert-card-top">
                    <span className={`alert-severity sev-${card.severity}`}>
                      {SEV_LABEL[card.severity]}
                    </span>
                    <span className="alert-category">{card.category}</span>
                  </div>
                  <div className="alert-title">{card.title}</div>
                  <div className="alert-body">{card.body}</div>
                  <div className="alert-impact">
                    <span className="alert-impact-label">{card.impactLabel}</span>
                    <span className="alert-impact-val">{card.impact}</span>
                  </div>
                  <div className="alert-footer">
                    <span className="alert-source">{card.source}</span>
                    <span className="alert-date">{card.date}</span>
                  </div>
                  <div className="alert-card-sources">
                    {card.links.map((lnk) => (
                      <span
                        key={lnk.url}
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); window.open(lnk.url, "_blank", "noopener,noreferrer"); }}
                        className="alert-src-chip"
                      >
                        {lnk.label} ↗
                      </span>
                    ))}
                  </div>
                </a>
              ))}
            </div>
          </div>
          <button
            className="alerts-carousel-btn alerts-carousel-btn--right"
            onMouseEnter={() => startScroll("right")}
            onMouseLeave={stopScroll}
            aria-label="Scroll right"
          >
            ›
          </button>
        </div>

        <div style={{ textAlign: "center", marginTop: "32px" }}>
          <a href="/alerts/active-alerts" className="alerts-cta">
            View All Alerts →
          </a>
        </div>
      </div>
    </section>
  );
}
