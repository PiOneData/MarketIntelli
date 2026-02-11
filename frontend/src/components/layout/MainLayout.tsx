import { Outlet, NavLink } from "react-router-dom";

const navItems = [
  { path: "/", label: "Dashboard" },
  { path: "/geo-analytics", label: "Geo Analytics" },
  { path: "/projects", label: "Projects" },
  { path: "/policy", label: "Policy" },
  { path: "/alerts", label: "Alerts" },
];

function MainLayout() {
  return (
    <div className="app-layout">
      <header className="app-header">
        <h1>MarketIntelli</h1>
        <span className="subtitle">Solar Market Intelligence Platform</span>
      </header>
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
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}

export default MainLayout;
