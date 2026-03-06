import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import refexLogo from "../../assets/refex-logo.png";

function LiveClock() {
  const [time, setTime] = useState("");

  useEffect(() => {
    const update = () => {
      const now = new Date();
      const ist = now.toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      });
      setTime(`IST ${ist}`);
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);

  return <span className="ft-clock">{time}</span>;
}

const footerCols = [
  {
    heading: "Platform",
    links: [
      { label: "Dashboard", to: "/" },
      { label: "Power Data Overview", to: "/power-data/overview" },
      { label: "Finance & Investment", to: "/finance/finance-intelligence" },
      { label: "Policy Repository", to: "/policy/policy-repository" },
      { label: "News & Alerts", to: "/alerts/news-feed" },
    ],
  },
  {
    heading: "Projects",
    links: [
      { label: "Data Center Registry", to: "/projects/india-data-center-registry" },
      { label: "Airport Registry", to: "/projects/airport-registry" },
      { label: "Project Directory", to: "/projects/project-directory" },
      { label: "Developer Profiles", to: "/projects/developer-profiles" },
      { label: "Tender Intelligence", to: "/projects/tender-intelligence" },
    ],
  },
  {
    heading: "Analytics",
    links: [
      { label: "RE Potential Assessment", to: "/geo-analytics/assessment" },
      { label: "TN Land Record", to: "/geo-analytics/tn-land-record" },
      { label: "Power Trading", to: "/finance/power-trading" },
      { label: "Energy Demand Sizing", to: "/finance/energy-demand" },
      { label: "RE Capacity", to: "/power-data/renewable-capacity" },
      { label: "Power Generation", to: "/power-data/power-generation" },
      { label: "Transmission", to: "/power-data/transmission" },
      { label: "Consumption", to: "/power-data/consumption" },
      { label: "RE Tariffs", to: "/power-data/re-tariffs" },
      { label: "Data Sources", to: "/power-data/data-repository" },
      { label: "Tariff Tracker", to: "/policy/tariff-tracker" },
      { label: "Compliance Alerts", to: "/policy/compliance-alerts" },
      { label: "Subsidy Monitor", to: "/policy/subsidy-monitor" },
      { label: "Investment Guidelines", to: "/finance/investment-finance" },
      { label: "Infra Pipeline", to: "/finance/infra-pipeline" },
      { label: "Credit & Financing", to: "/finance/credit-environment" },
      { label: "FDI & Foreign Capital", to: "/finance/fdi-trends" },
      { label: "IPO Watch", to: "/alerts/ipo-watch" },
      { label: "Active Alerts", to: "/alerts/active-alerts" },
      { label: "Custom Watchlists", to: "/alerts/custom-watchlists" },
    ],
  },
];

export default function AppFooter() {
  return (
    <footer className="app-footer">
      <div className="ft-top">
        {/* Brand column */}
        <div>
          <div className="ft-logo">
            <img src={refexLogo} alt="Refex" />
          </div>
          <p className="ft-tagline">
            India's renewable energy intelligence platform. Real-time generation, pricing, policy,
            and project pipeline — built for energy professionals.
          </p>
        </div>

        {footerCols.map((col) => (
          <div className="ft-col" key={col.heading}>
            <h4>{col.heading}</h4>
            <ul>
              {col.links.map((link) => (
                <li key={link.to}>
                  <Link to={link.to}>{link.label}</Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="ft-bottom">
        <span className="ft-copy">
          © {new Date().getFullYear()} Refex Energy Limited · REFEX MI · All data sourced from
          CEA, IEX India, Ministry of Power, MNRE, CERC
        </span>
        <LiveClock />
      </div>
    </footer>
  );
}
