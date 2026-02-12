import { useState, useEffect } from "react";
import { Outlet, NavLink, useLocation, useNavigate } from "react-router-dom";
import refexLogo from "../../assets/refex-logo.svg";

interface SubItem {
  id: string;
  label: string;
  path?: string;
}

interface NavItem {
  path: string;
  label: string;
  children?: SubItem[];
}

const navItems: NavItem[] = [
  { path: "/", label: "Dashboard" },
  {
    path: "/geo-analytics",
    label: "Geo Analytics",
    children: [
      { id: "solar-potential-mapping", label: "Solar Potential Mapping" },
      { id: "grid-infrastructure-layer", label: "Grid Infrastructure Layer" },
      { id: "disaster-risk-overlay", label: "Disaster Risk Overlay" },
    ],
  },
  {
    path: "/projects",
    label: "Projects",
    children: [
      { id: "project-directory", label: "Project Directory" },
      { id: "developer-profiles", label: "Developer Profiles" },
      { id: "tender-intelligence", label: "Tender Intelligence" },
      { id: "india-data-center-alerts", label: "India Data Center Alert Service", path: "/projects/india-data-center-alerts" },
    ],
  },
  {
    path: "/policy",
    label: "Policy",
    children: [
      { id: "policy-repository", label: "Policy Repository" },
      { id: "tariff-tracker", label: "Tariff Tracker" },
      { id: "compliance-alerts", label: "Compliance Alerts" },
      { id: "subsidy-monitor", label: "Subsidy Monitor" },
    ],
  },
  {
    path: "/alerts",
    label: "Alerts",
    children: [
      { id: "active-alerts", label: "Active Alerts" },
      { id: "custom-watchlists", label: "Custom Watchlists" },
      { id: "disaster-response-integration", label: "Disaster Response Integration" },
    ],
  },
];

function Sidenav({
  items,
  collapsed,
}: {
  items: SubItem[];
  collapsed: boolean;
}) {
  const navigate = useNavigate();

  const handleClick = (item: SubItem) => {
    if (item.path) {
      navigate(item.path);
    } else {
      const el = document.getElementById(item.id);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  };

  return (
    <aside className={`sidenav ${collapsed ? "sidenav--collapsed" : ""}`}>
      <div className="sidenav-inner">
        <ul>
          {items.map((item) => (
            <li key={item.id}>
              <button onClick={() => handleClick(item)}>
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      </nav>
      <main className="app-main">
        <Outlet />
      </main>
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}

export default MainLayout;
