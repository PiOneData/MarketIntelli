import { Link } from "react-router-dom";

interface AlertCard {
  severity: "critical" | "high" | "medium" | "positive";
  category: string;
  title: string;
  body: string;
  impact: string;
  source: string;
  date: string;
  links: { label: string; url: string }[];
}

const ALERT_CARDS: AlertCard[] = [
  {
    severity: "critical",
    category: "Supply Security",
    title: "Strait of Hormuz: Crude & LPG Supply Risk",
    body:
      "Ongoing Iran-Israel-US tensions threaten closure of the Strait of Hormuz, through which ~20% of global oil and ~25% of India's LPG imports transit. Any blockade would spike Brent crude prices and increase India's energy import bill by an estimated ₹1.2–2.0 lakh crore annually.",
    impact: "Brent crude ↑35–60% in blockade scenario · India import bill +₹1.2–2.0 lakh cr",
    source: "MEA / IEA / Reuters",
    date: "Mar 2026",
    links: [
      { label: "IEA Oil Security", url: "https://www.iea.org/topics/oil-security" },
      { label: "MEA Statement", url: "https://www.mea.gov.in/press-releases.htm" },
      { label: "Reuters Energy", url: "https://www.reuters.com/business/energy/" },
    ],
  },
  {
    severity: "high",
    category: "RE Supply Chain",
    title: "Solar Module & BESS Logistics Disruption",
    body:
      "Red Sea/Gulf shipping routes carry ~60% of India's solar module imports from China and Southeast Asia. Conflict escalation increases freight costs 15–40% and extends delivery timelines by 4–8 weeks, directly impacting RE project commissioning schedules and capex.",
    impact: "Solar module freight +15–40% · Project timeline delays 4–8 weeks",
    source: "IEEFA / MNRE / Shipping Intelligence",
    date: "Mar 2026",
    links: [
      { label: "IEEFA India", url: "https://ieefa.org/tag/india/" },
      { label: "MNRE Reports", url: "https://mnre.gov.in/physical-progress/" },
    ],
  },
  {
    severity: "high",
    category: "Currency & Finance",
    title: "Rupee Depreciation Pressure on RE Capex",
    body:
      "Oil price spikes widen India's current account deficit, depreciating the rupee against USD. A 5% INR depreciation increases RE equipment capex by ~3–5% for imported components (inverters, trackers, turbines), eroding project IRRs by 80–120 bps.",
    impact: "INR/USD pressure · RE capex +3–5% · IRR erosion 80–120 bps",
    source: "RBI / CERC / Bloomberg",
    date: "Mar 2026",
    links: [
      { label: "RBI Monetary Policy", url: "https://www.rbi.org.in/Scripts/MonetaryPolicy.aspx" },
      { label: "CERC Orders", url: "https://cercind.gov.in/" },
    ],
  },
  {
    severity: "high",
    category: "Gas Markets",
    title: "LNG Spot Price Spike Risk",
    body:
      "Iran conflict could disrupt LNG supply from Qatar and Australia through the Arabian Sea routes. India's LNG-based power plants (8.5 GW capacity) face fuel cost risk. Short-term gas power costliness strengthens the case for RE but stresses grid stability.",
    impact: "LNG spot +25–50% · Gas genco fuel costs under pressure · 8.5 GW at risk",
    source: "GAIL / Petronet LNG / IEA GAS2025",
    date: "Mar 2026",
    links: [
      { label: "IEA Gas 2024", url: "https://www.iea.org/reports/gas-2024" },
      { label: "GAIL India", url: "https://www.gailonline.com/" },
      { label: "Petronet LNG", url: "https://www.petronetlng.com/" },
    ],
  },
  {
    severity: "medium",
    category: "Foreign Investment",
    title: "Gulf RE Investment & Financing Disruption",
    body:
      "Saudi Aramco, ADNOC, and sovereign wealth funds (ADIA, PIF) have committed $8.5 bn to Indian RE infrastructure. Escalating regional conflict may freeze new commitments and delay disbursements, affecting SECI auction timelines and hybrid project financing.",
    impact: "$8.5 bn committed Gulf RE investment at risk · SECI timelines at risk",
    source: "SECI / PIB / Gulf News / MEA",
    date: "Mar 2026",
    links: [
      { label: "SECI Tenders", url: "https://seci.co.in/" },
      { label: "PIB Press Releases", url: "https://pib.gov.in/AllRelease.aspx" },
      { label: "MEA India-Gulf", url: "https://www.mea.gov.in/india-and-gulf.htm" },
    ],
  },
  {
    severity: "positive",
    category: "RE Opportunity",
    title: "Domestic Renewable Transition Acceleration",
    body:
      "Geopolitical volatility underscores India's energy security imperative. The government has reaffirmed 500 GW RE target by 2030. Import substitution policies for solar manufacturing (PLI Scheme ₹24,000 cr), domestic BESS manufacturing, and green hydrogen corridors are being fast-tracked.",
    impact: "500 GW RE target reaffirmed · PLI ₹24,000 cr solar manufacturing boost",
    source: "MNRE / PIB / NEP 2022-32",
    date: "Mar 2026",
    links: [
      { label: "MNRE 500GW Progress", url: "https://mnre.gov.in/physical-progress/" },
      { label: "NEP 2022-32 (CEA)", url: "https://cea.nic.in/national-electricity-plan-volume-i-generation/" },
      { label: "PIB RE Announcements", url: "https://pib.gov.in/AllRelease.aspx" },
    ],
  },
];

const SEV_LABEL: Record<AlertCard["severity"], string> = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
  positive: "Positive",
};

export default function IranConflictSection() {
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
              Six key risk vectors tracked as of March 2026 — sourced from MEA, IEA, MNRE, and market intelligence.
            </p>
          </div>
          <div className="alerts-meta">
            <span className="alerts-meta-date">Last updated: March 6, 2026</span>
            <span className="alerts-meta-badge">6 Active Risk Vectors</span>
          </div>
        </div>

        <div className="alerts-grid">
          {ALERT_CARDS.map((card) => (
            <div className={`alert-card ${card.severity}`} key={card.title}>
              <div className="alert-card-top">
                <span className={`alert-severity sev-${card.severity}`}>
                  {SEV_LABEL[card.severity]}
                </span>
                <span className="alert-category">{card.category}</span>
              </div>
              <div className="alert-title">{card.title}</div>
              <div className="alert-body">{card.body}</div>
              <div className="alert-impact">
                <span className="alert-impact-label">Impact</span>
                <span className="alert-impact-val">{card.impact}</span>
              </div>
              <div className="alert-footer">
                <span className="alert-source">Source: {card.source}</span>
                <span className="alert-date">{card.date}</span>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "10px" }}>
                {card.links.map((lnk) => (
                  <a
                    key={lnk.url}
                    href={lnk.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      fontSize: "10px", fontWeight: 600, color: "#0f766e",
                      textDecoration: "none", padding: "3px 8px",
                      border: "1px solid #0f766e", borderRadius: "2px",
                      letterSpacing: "0.03em", lineHeight: 1.4,
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = "#0f766e"; e.currentTarget.style.color = "#fff"; }}
                    onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#0f766e"; }}
                  >
                    {lnk.label} ↗
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div style={{ textAlign: "center", marginTop: "8px" }}>
          <Link to="/alerts/active-alerts" className="alerts-cta">
            View All Alerts →
          </Link>
        </div>
      </div>
    </section>
  );
}
