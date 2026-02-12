import { useState, useEffect } from "react";
import { Outlet, NavLink, useLocation, useNavigate } from "react-router-dom";

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
      </div>
    </aside>
  );
}

function MainLayout() {
  const location = useLocation();
  const currentNav = navItems.find((item) =>
    location.pathname === item.path || location.pathname.startsWith(item.path + "/")
  );
  const subItems = currentNav?.children;
  const [sidenavOpen, setSidenavOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    setSidenavOpen(true);
  }, [location.pathname]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setSearchQuery("");
    }
  };

  return (
    <div className="app-layout">
      <header className="app-header">
        <div className="header-brand">
          {subItems && (
            <button
              className={`menu-toggle ${sidenavOpen ? "menu-toggle--active" : ""}`}
              onClick={() => setSidenavOpen((prev) => !prev)}
              aria-label={sidenavOpen ? "Close sidebar" : "Open sidebar"}
              aria-expanded={sidenavOpen}
            >
              <span className="menu-toggle-bar" />
              <span className="menu-toggle-bar" />
              <span className="menu-toggle-bar" />
            </button>
          )}
          <h1>MarketIntelli</h1>
          <span className="subtitle">Solar Market Intelligence Platform</span>
        </div>
        <nav className="app-nav">
          <ul>
            {navItems.map((item) => (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  end={item.path === "/"}
                  className={({ isActive }) => (isActive ? "active" : "")}
                >
                  {item.label}
                </NavLink>
              </li>
            ))}
            <li className="header-search">
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
            </li>
          </ul>
        </nav>
      </header>
      <div className={`app-body ${subItems ? "has-sidenav" : ""}`}>
        {subItems && <Sidenav items={subItems} collapsed={!sidenavOpen} />}
        <div className="app-content">
          <main className="app-main">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}

export default MainLayout;
