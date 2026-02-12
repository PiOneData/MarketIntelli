import { Outlet, NavLink, useLocation } from "react-router-dom";

interface SubItem {
  id: string;
  label: string;
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

function Sidenav({ items }: { items: SubItem[] }) {
  const handleClick = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <aside className="sidenav">
      <ul>
        {items.map((item) => (
          <li key={item.id}>
            <button onClick={() => handleClick(item.id)}>{item.label}</button>
          </li>
        ))}
      </ul>
    </aside>
  );
}

function MainLayout() {
  const location = useLocation();
  const currentNav = navItems.find((item) => item.path === location.pathname);
  const subItems = currentNav?.children;

  return (
    <div className="app-layout">
      <header className="app-header">
        <div className="header-brand">
          <h1>MarketIntelli</h1>
          <span className="subtitle">Solar Market Intelligence Platform</span>
        </div>
        <nav className="app-nav">
          <ul>
            {navItems.map((item) => (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  className={({ isActive }) => (isActive ? "active" : "")}
                >
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </header>
      <div className={`app-content ${subItems ? "has-sidenav" : ""}`}>
        {subItems && <Sidenav items={subItems} />}
        <main className="app-main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default MainLayout;
