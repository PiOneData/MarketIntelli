import { useState, useEffect, useRef } from "react";
import { Outlet, NavLink, useLocation, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import refexLogo from "../../assets/refex-logo.png";
import PowerTicker from "./PowerTicker";
import AppFooter from "./AppFooter";
import apiClient from "../../api/client";

const NAV_ITEMS = [
  { path: "/", label: "Dashboard", end: true },
  {
    path: "/geo-analytics", label: "Geo Analytics",
    children: [
      { path: "/geo-analytics/tn-land-record", label: "TN Land Record" },
      { path: "/geo-analytics/assessment", label: "RE Site Assessment" },
    ],
  },
  {
    path: "/projects", label: "Projects",
    children: [
      { path: "/projects/india-data-center-registry", label: "Data Center Registry" },
      { path: "/projects/airport-registry", label: "Airport Registry" },
      { path: "/projects/project-directory", label: "Project Directory" },
      { path: "/projects/developer-profiles", label: "Developer Profiles" },
      { path: "/projects/tender-intelligence", label: "Tender Intelligence" },
    ],
  },
  {
    path: "/power-data", label: "Power Data",
    children: [
      { path: "/power-data/overview", label: "Overview" },
      { path: "/power-data/renewable-capacity", label: "Renewable Capacity" },
      { path: "/power-data/power-generation", label: "Power Generation" },
      { path: "/power-data/transmission", label: "Transmission" },
      { path: "/power-data/consumption", label: "Consumption" },
      { path: "/power-data/re-tariffs", label: "RE Tariffs" },
      { path: "/power-data/data-repository", label: "Data Sources" },
    ],
  },
  {
    path: "/finance", label: "Finance",
    children: [
      { path: "/finance/finance-intelligence", label: "Finance Intelligence" },
      { path: "/finance/investment-finance", label: "Investment Guidelines" },
      { path: "/finance/power-trading", label: "Power Trading" },
      { path: "/finance/energy-demand", label: "Energy Demand" },
      { path: "/finance/infra-pipeline", label: "Infra Pipeline" },
      { path: "/finance/credit-environment", label: "Credit & Financing" },
      { path: "/finance/fdi-trends", label: "FDI & Foreign Capital" },
    ],
  },
  {
    path: "/policy", label: "Policy",
    children: [
      { path: "/policy/policy-repository", label: "Policy Repository" },
      { path: "/policy/tariff-tracker", label: "Tariff Tracker" },
      { path: "/policy/compliance-alerts", label: "Compliance Alerts" },
      { path: "/policy/subsidy-monitor", label: "Subsidy Monitor" },
    ],
  },
  {
    path: "/alerts", label: "Alerts",
    children: [
      { path: "/alerts/news-feed", label: "News Feed" },
      { path: "/alerts/active-alerts", label: "Active Alerts" },
      { path: "/alerts/custom-watchlists", label: "Watchlists" },
      { path: "/alerts/ipo-watch", label: "IPO Watch" },
    ],
  },
];

function MainLayout() {
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  const drawerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setDrawerOpen(false);
    if (location.hash) {
      const el = document.getElementById(location.hash.slice(1));
      if (el) {
        setTimeout(() => el.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
        return;
      }
    }
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [location.pathname, location.hash]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close on outside click
  useEffect(() => {
    if (!drawerOpen) return;
    const handler = (e: MouseEvent) => {
      if (drawerRef.current && !drawerRef.current.contains(e.target as Node)) {
        setDrawerOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [drawerOpen]);

  // Auto-expand active group
  useEffect(() => {
    const active = NAV_ITEMS.find(
      (item) => item.path !== "/" && location.pathname.startsWith(item.path)
    );
    if (active) setExpandedGroup(active.path);
  }, [location.pathname]);

  const { data: usdInr } = useQuery({
    queryKey: ["finance", "usdinr"],
    queryFn: () => apiClient.get<{ rate: number | null; change_pct: number | null }>("/finance/commodity/usdinr").then(r => r.data),
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });

  const { data: brent } = useQuery({
    queryKey: ["finance", "brent-crude"],
    queryFn: () => apiClient.get<{ price: number | null; change_pct: number | null }>("/finance/commodity/brent").then(r => r.data),
    staleTime: 3 * 60 * 1000,
    retry: 2,
  });

  const inrDisplay = usdInr?.rate != null ? `₹${usdInr.rate.toFixed(2)}/$` : "₹/$ Watch";
  const inrUp = (usdInr?.change_pct ?? 0) >= 0;
  const brentDisplay = brent?.price != null ? `Brent $${brent.price.toFixed(2)}/bbl` : "Brent Crude";
  const brentUp = (brent?.change_pct ?? 0) >= 0;

  return (
    <div className="app-layout">
      {/* ── Header ── */}
      <header className={`app-header${scrolled ? " scrolled" : ""}`}>
        <div className="nav-top">
          {/* Left: hamburger + logo */}
          <div className="nav-brand">
            <button
              className="nav-hamburger"
              onClick={() => setDrawerOpen((o) => !o)}
              aria-label="Open navigation"
            >
              <span /><span /><span />
            </button>
            <Link to="/" className="nav-logo-link">
              <img src={refexLogo} alt="Refex MI" className="nav-logo-img" />
              <span className="nav-logo-sep" />
              <span className="nav-logo-sub">Market Intelligence</span>
            </Link>
          </div>

          {/* Center: Iran alert */}
          <div className="nav-center">
            <Link
              to="/#iran-conflict"
              className="nav-alert-link"
              title="Iran Conflict — View energy impact analysis on homepage"
            >
              <span className="nav-alert-dot" />
              <span className="nav-alert-text">IRAN Alert</span>
              <span
                className="nav-brent"
                style={brent?.price != null ? { color: brentUp ? "#ef4444" : "#22c55e" } : undefined}
              >
                {brentDisplay}
              </span>
              <span
                className="nav-brent nav-inr"
                style={usdInr?.rate != null ? { color: inrUp ? "#ef4444" : "#22c55e" } : undefined}
              >
                {inrDisplay}
              </span>
            </Link>
          </div>

          {/* Right: profile */}
          <div className="nav-btns">
            <Link to="/profile" className="header-profile-btn" title="My Profile">
              <span className="header-profile-avatar">AS</span>
            </Link>
          </div>
        </div>
        <PowerTicker />
      </header>

      {/* ── Nav Drawer ── */}
      {drawerOpen && (
        <div className="nav-drawer-overlay" onClick={() => setDrawerOpen(false)} />
      )}
      <nav
        ref={drawerRef}
        className={`nav-drawer${drawerOpen ? " nav-drawer--open" : ""}`}
        aria-hidden={!drawerOpen}
      >
        <div className="nav-drawer-header">
          <span className="nav-drawer-title">Navigation</span>
          <button
            className="nav-drawer-close"
            onClick={() => setDrawerOpen(false)}
            aria-label="Close navigation"
          >
            ✕
          </button>
        </div>
        <ul className="nav-drawer-list">
          {NAV_ITEMS.map((item) => {
            const isActive =
              item.end
                ? location.pathname === item.path
                : location.pathname.startsWith(item.path + "/") ||
                  location.pathname === item.path;
            const isExpanded = expandedGroup === item.path;
            if (!item.children) {
              return (
                <li key={item.path}>
                  <NavLink
                    to={item.path}
                    end={item.end}
                    className={`nav-drawer-item${isActive ? " active" : ""}`}
                  >
                    {item.label}
                  </NavLink>
                </li>
              );
            }
            return (
              <li key={item.path} className="nav-drawer-group">
                <button
                  className={`nav-drawer-group-btn${isActive ? " active" : ""}`}
                  onClick={() =>
                    setExpandedGroup((prev) =>
                      prev === item.path ? null : item.path
                    )
                  }
                >
                  {item.label}
                  <span className={`nav-drawer-chevron${isExpanded ? " open" : ""}`}>›</span>
                </button>
                {isExpanded && (
                  <ul className="nav-drawer-children">
                    {item.children.map((child) => (
                      <li key={child.path}>
                        <NavLink
                          to={child.path}
                          className={({ isActive: ca }: { isActive: boolean }) =>
                            `nav-drawer-child${ca ? " active" : ""}`
                          }
                        >
                          {child.label}
                        </NavLink>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      </nav>

      {/* ── Content ── */}
      <main className="app-main">
        <Outlet />
      </main>

      <AppFooter />
    </div>
  );
}

export default MainLayout;
