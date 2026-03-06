import { useState, useEffect } from "react";
import { Outlet, NavLink, useLocation, useNavigate, Link } from "react-router-dom";
import refexLogo from "../../assets/refex-logo.png";
import PowerTicker from "./PowerTicker";
import AppFooter from "./AppFooter";

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
      { id: "tn-land-record", label: "TN Land Record", path: "/geo-analytics/tn-land-record" },
      { id: "assessment", label: "RE Potential Assessment", path: "/geo-analytics/assessment" },
    ],
  },
  {
    path: "/projects",
    label: "Projects",
    children: [
      { id: "india-data-center-registry", label: "India Data Center Registry", path: "/projects/india-data-center-registry" },
      { id: "airport-registry", label: "Airport Registry", path: "/projects/airport-registry" },
      { id: "project-directory", label: "Project Directory", path: "/projects/project-directory" },
      { id: "developer-profiles", label: "Developer Profiles", path: "/projects/developer-profiles" },
      { id: "tender-intelligence", label: "Tender Intelligence", path: "/projects/tender-intelligence" },
    ],
  },
  {
    path: "/power-data",
    label: "Power Data",
    children: [
      { id: "overview", label: "Overview", path: "/power-data/overview" },
      { id: "renewable-capacity", label: "Renewable Capacity", path: "/power-data/renewable-capacity" },
      { id: "power-generation", label: "Power Generation", path: "/power-data/power-generation" },
      { id: "transmission", label: "Transmission", path: "/power-data/transmission" },
      { id: "consumption", label: "Consumption", path: "/power-data/consumption" },
      { id: "re-tariffs", label: "RE Tariffs", path: "/power-data/re-tariffs" },
      { id: "data-repository", label: "Data Sources", path: "/power-data/data-repository" },
    ],
  },
  {
    path: "/finance",
    label: "Finance",
    children: [
      { id: "finance-intelligence", label: "Finance & Investment Intelligence", path: "/finance/finance-intelligence" },
      { id: "investment-finance", label: "Investment Guidelines", path: "/finance/investment-finance" },
      { id: "power-trading", label: "Power Trading", path: "/finance/power-trading" },
      { id: "energy-demand", label: "Energy Demand Sizing", path: "/finance/energy-demand" },
      { id: "infra-pipeline", label: "Infrastructure Pipeline", path: "/finance/infra-pipeline" },
      { id: "credit-environment", label: "Credit & Financing", path: "/finance/credit-environment" },
      { id: "fdi-trends", label: "FDI & Foreign Capital", path: "/finance/fdi-trends" },
    ],
  },
  {
    path: "/policy",
    label: "Policy",
    children: [
      { id: "policy-repository", label: "Policy Repository", path: "/policy/policy-repository" },
      { id: "tariff-tracker", label: "Tariff Tracker", path: "/policy/tariff-tracker" },
      { id: "compliance-alerts", label: "Compliance Alerts", path: "/policy/compliance-alerts" },
      { id: "subsidy-monitor", label: "Subsidy Monitor", path: "/policy/subsidy-monitor" },
    ],
  },
  {
    path: "/alerts",
    label: "Alerts",
    children: [
      { id: "news-feed", label: "News Feed", path: "/alerts/news-feed" },
      { id: "active-alerts", label: "Active Alerts", path: "/alerts/active-alerts" },
      { id: "custom-watchlists", label: "Custom Watchlists", path: "/alerts/custom-watchlists" },
      { id: "ipo-watch", label: "IPO Watch", path: "/alerts/ipo-watch" },
    ],
  },
];

const EXTERNAL_LINKS: Record<string, string> = {};

function Sidenav({
  items,
  collapsed,
  onToggle,
}: {
  items: SubItem[];
  collapsed: boolean;
  onToggle: () => void;
}) {
  const navigate = useNavigate();
  const location = useLocation();

  const handleClick = (item: SubItem) => {
    if (EXTERNAL_LINKS[item.id]) {
      window.open(EXTERNAL_LINKS[item.id], "_blank", "noopener,noreferrer");
      return;
    }
    if (item.path) {
      navigate(item.path);
    }
  };

  return (
    <aside className={`sidenav ${collapsed ? "sidenav--collapsed" : ""}`}>
      <div className="sidenav-inner">
        <button
          className={`menu-toggle ${!collapsed ? "menu-toggle--active" : ""}`}
          onClick={onToggle}
          aria-label={!collapsed ? "Collapse sidebar" : "Expand sidebar"}
          aria-expanded={!collapsed}
        >
          <span className="menu-toggle-bar" />
          <span className="menu-toggle-bar" />
          <span className="menu-toggle-bar" />
        </button>
        <ul>
          {items.map((item) => {
            const isActive = item.path ? location.pathname === item.path : false;
            return (
              <li key={item.id}>
                <button
                  className={isActive ? "sidenav-btn--active" : ""}
                  onClick={() => handleClick(item)}
                >
                  {item.label}
                  {EXTERNAL_LINKS[item.id] && (
                    <svg className="sidenav-external-icon" viewBox="0 0 20 20" fill="currentColor" width="12" height="12">
                      <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
                      <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
                    </svg>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </aside>
  );
}

function MainLayout() {
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sidenavOpen, setSidenavOpen] = useState(true);

  const isHomepage = location.pathname === "/";

  const currentNav = navItems.find((item) =>
    location.pathname === item.path || location.pathname.startsWith(item.path + "/")
  );
  const subItems = !isHomepage ? currentNav?.children : undefined;

  useEffect(() => {
    setSidenavOpen(true);
  }, [location.pathname]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setSearchQuery("");
    }
  };

  return (
    <div className="app-layout">
      <header className={`app-header${scrolled ? " scrolled" : ""}`}>
        <div className="nav-top">
          <div className="nav-brand">
            <img src={refexLogo} alt="Refex MI" className="nav-logo-img" />
            <span className="nav-logo-sep" />
            <span className="nav-logo-sub">Market Intelligence</span>
          </div>
          <nav className="nav-links">
            <ul>
              {navItems.map((item) => (
                <li key={item.path}>
                  <NavLink
                    to={item.path}
                    end={item.path === "/"}
                    className={({ isActive }: { isActive: boolean }) => (isActive ? "active" : "")}
                  >
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
          <div className="nav-btns">
            <Link
              to="/alerts/active-alerts"
              className="nav-alert-link"
              title="Iran Conflict — Active Geopolitical Alert"
            >
              <span className="nav-alert-dot" />
              <span className="nav-alert-text">IRAN Alert</span>
              <span className="nav-brent">Brent ↑</span>
              <span className="nav-brent nav-inr">₹/$ Watch</span>
            </Link>
            <form onSubmit={handleSearchSubmit} className="header-search-form">
              <svg className="header-search-icon" viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
                <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
              </svg>
              <input
                type="text"
                className="header-search-input"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Search"
              />
            </form>
            <Link to="/profile" className="header-profile-btn" title="My Profile" aria-label="Profile">
              <span className="header-profile-avatar">AS</span>
            </Link>
          </div>
        </div>
        <PowerTicker />
      </header>

      <div className={`app-body${subItems ? " has-sidenav" : ""}`}>
        {subItems && (
          <Sidenav
            items={subItems}
            collapsed={!sidenavOpen}
            onToggle={() => setSidenavOpen((prev) => !prev)}
          />
        )}
        <div className="app-content">
          <main className="app-main">
            <Outlet />
          </main>
        </div>
      </div>

      <AppFooter />
    </div>
  );
}

export default MainLayout;
