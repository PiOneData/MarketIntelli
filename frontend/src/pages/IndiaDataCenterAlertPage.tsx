import { useState, useMemo, useEffect } from "react";
import DataCenterMap from "../components/DataCenterMap";
import SubstationView from "../components/SubstationView";
import { useFacilities, useFacilityStats } from "../hooks/useDataCenters";
import { listFacilities, createFacility } from "../api/dataCenters";
import { useQueryClient } from "@tanstack/react-query";
import type { DataCenterFacility } from "../types/dataCenters";
import apiClient from "../api/client";

interface DcStock {
  dc_company: string;
  ticker: string;
  exchange: string;
  price: number | null;
  currency: string;
  error?: string;
}

interface DcStockResponse {
  stocks: DcStock[];
}

const INDIAN_STATES = [
  "Andhra Pradesh", "Bihar", "Chhattisgarh", "Delhi", "Goa", "Gujarat",
  "Haryana", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh",
  "Maharashtra", "Odisha", "Punjab", "Rajasthan", "Tamil Nadu",
  "Telangana", "Uttar Pradesh", "West Bengal",
];

const STATUS_OPTIONS = ["planned", "under_construction", "operational"];

const STATUS_DISPLAY: Record<string, string> = {
  planned: "Planned",
  under_construction: "Under Construction",
  operational: "Operational",
};

const EMPTY_FORM = {
  company: "",
  city: "",
  location: "",
  state: "",
  powerMW: "",
  sizeSqFt: "",
  status: "",
};

/**
 * Adapts API facility data to the shape expected by DataCenterMap component.
 */
function toMapFormat(facilities: DataCenterFacility[]) {
  return facilities.map((f) => ({
    id: f.id,
    dateAdded: f.date_added ? f.date_added.split("T")[0] : "",
    company: f.company_name,
    city: f.city,
    location: f.location_detail || f.name,
    state: f.state,
    powerMW: f.power_capacity_mw,
    sizeSqFt: f.size_sqft,
    status: STATUS_DISPLAY[f.status] || f.status,
  }));
}

function IndiaDataCenterAlertPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(EMPTY_FORM);
  const [filters, setFilters] = useState({ state: "", city: "", company: "" });
  const [activeTab, setActiveTab] = useState<"registry" | "map" | "substations">("registry");
  const [stocksByCompany, setStocksByCompany] = useState<Record<string, DcStock>>({});

  // Fetch facilities from API
  const { data: facilities = [], isLoading, error } = useFacilities({ page_size: 500 });
  const { data: stats } = useFacilityStats();

  useEffect(() => {
    apiClient.get<DcStockResponse>("/projects/dc-stocks").then((res) => {
      const map: Record<string, DcStock> = {};
      for (const s of res.data.stocks) map[s.dc_company] = s;
      setStocksByCompany(map);
    }).catch(() => { /* stock links are best-effort */ });
  }, []);

  // Apply client-side filters
  const filteredData = useMemo(() => {
    return facilities.filter((f) => {
      if (filters.state && f.state !== filters.state) return false;
      if (filters.city && !f.city.toLowerCase().includes(filters.city.toLowerCase())) return false;
      if (filters.company && !f.company_name.toLowerCase().includes(filters.company.toLowerCase())) return false;
      return true;
    });
  }, [facilities, filters]);

  const mapData = useMemo(() => toMapFormat(facilities), [facilities]);

  const uniqueStates = useMemo(
    () => [...new Set(facilities.map((f) => f.state))].sort(),
    [facilities]
  );
  const uniqueCities = useMemo(
    () => [...new Set(facilities.map((f) => f.city))].sort(),
    [facilities]
  );

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  };

  const handleAddDataCenter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.company || !form.city || !form.state || !form.status) return;

    try {
      // Find matching company from existing facilities
      const matchingFacility = facilities.find(
        (f) => f.company_name.toLowerCase() === form.company.toLowerCase()
      );
      if (!matchingFacility) {
        alert("Company not found in database. Please add the company first via the admin panel.");
        return;
      }
      await createFacility({
        company_id: matchingFacility.company_id,
        name: form.location || `${form.city} Data Center`,
        city: form.city,
        state: form.state,
        location_detail: form.location,
        power_capacity_mw: Number(form.powerMW) || 0,
        size_sqft: Number(form.sizeSqFt) || 0,
        status: form.status,
      });
      queryClient.invalidateQueries({ queryKey: ["dc-facilities"] });
      queryClient.invalidateQueries({ queryKey: ["dc-facility-stats"] });
      setForm(EMPTY_FORM);
    } catch (err) {
      console.error("Failed to add data center:", err);
      alert("Failed to add data center. Please try again.");
    }
  };

  const handleExportCSV = async () => {
    const allFacilities = await listFacilities({ page_size: 500 });
    const headers = ["Date Added", "Company/Group", "City", "Location", "State", "Power (MW)", "Size (Sq. Ft.)", "Status"];
    const rows = allFacilities.map((f) => [
      f.date_added ? f.date_added.split("T")[0] : "",
      f.company_name,
      f.city,
      f.location_detail || f.name,
      f.state,
      f.power_capacity_mw,
      f.size_sqft,
      STATUS_DISPLAY[f.status] || f.status,
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "india_data_centers.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const clearFilters = () => {
    setFilters({ state: "", city: "", company: "" });
  };

  if (error) {
    return (
      <div className="india-dc-page">
        <div className="india-dc-header">
          <h2>India Data Center Registry</h2>
          <p style={{ color: "#ef4444" }}>Failed to load data centers. Please try again later.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="india-dc-page">
      <div className="india-dc-header">
        <h2>India Data Center Registry</h2>
        <p>Track and monitor data center developments across India. Get real-time alerts on new facilities, expansions, and power capacity changes.</p>
      </div>

      {/* Tab Navigation */}
      <div className="india-dc-tabs">
        <button
          className={`india-dc-tab ${activeTab === "registry" ? "india-dc-tab--active" : ""}`}
          onClick={() => setActiveTab("registry")}
        >
          <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
            <path fillRule="evenodd" d="M5 4a3 3 0 00-3 3v6a3 3 0 003 3h10a3 3 0 003-3V7a3 3 0 00-3-3H5zm-1 9v-1h5v2H5a1 1 0 01-1-1zm7 1h4a1 1 0 001-1v-1h-5v2zm0-4h5V8h-5v2zM9 8H4v2h5V8z" clipRule="evenodd" />
          </svg>
          Registry
        </button>
        <button
          className={`india-dc-tab ${activeTab === "map" ? "india-dc-tab--active" : ""}`}
          onClick={() => setActiveTab("map")}
        >
          <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
            <path fillRule="evenodd" d="M12 1.586l-4 4v12.828l4-4V1.586zM3.707 3.293A1 1 0 002 4v10a1 1 0 00.293.707L6 18.414V5.586L3.707 3.293zM14 5.586v12.828l2.293-2.293A1 1 0 0018 16V6a1 1 0 00-.293-.707L14 1.586v4z" clipRule="evenodd" />
          </svg>
          Map View
        </button>
        <button
          className={`india-dc-tab ${activeTab === "substations" ? "india-dc-tab--active" : ""}`}
          onClick={() => setActiveTab("substations")}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
          </svg>
          Substation Map
        </button>
      </div>

      {/* Map View */}
      {activeTab === "map" && (
        <DataCenterMap dataCenters={mapData} />
      )}

      {/* Substation Map View */}
      {activeTab === "substations" && <SubstationView />}

      {/* Registry View */}
      {activeTab === "registry" && <>

      {/* Stats Cards */}
      <div className="india-dc-stats">
        <div className="india-dc-stat-card">
          <span className="india-dc-stat-value">{stats?.total_facilities ?? facilities.length}</span>
          <span className="india-dc-stat-label">Total Data Centers</span>
        </div>
        <div className="india-dc-stat-card india-dc-stat-card--accent">
          <span className="india-dc-stat-value">{Object.keys(stats?.by_company ?? {}).length}</span>
          <span className="india-dc-stat-label">Companies</span>
        </div>
        <div className="india-dc-stat-card india-dc-stat-card--info">
          <span className="india-dc-stat-value">{stats?.states_covered ?? uniqueStates.length}</span>
          <span className="india-dc-stat-label">States Covered</span>
        </div>
        <div className="india-dc-stat-card india-dc-stat-card--success">
          <span className="india-dc-stat-value">{Math.round(stats?.total_power_mw ?? 0)} MW</span>
          <span className="india-dc-stat-label">Total Power Capacity</span>
        </div>
      </div>

      {/* Add New Data Center Form */}
      <div className="india-dc-form-section">
        <h3>Add New Data Center</h3>
        <form onSubmit={handleAddDataCenter} className="india-dc-form">
          <div className="india-dc-form-grid">
            <div className="india-dc-field">
              <label htmlFor="company">Company / Group</label>
              <input
                id="company"
                name="company"
                type="text"
                placeholder="e.g. Adani Group"
                value={form.company}
                onChange={handleFormChange}
              />
            </div>
            <div className="india-dc-field">
              <label htmlFor="city">City</label>
              <input
                id="city"
                name="city"
                type="text"
                placeholder="e.g. Mumbai"
                value={form.city}
                onChange={handleFormChange}
              />
            </div>
            <div className="india-dc-field">
              <label htmlFor="location">Location</label>
              <input
                id="location"
                name="location"
                type="text"
                placeholder="e.g. Navi Mumbai SEZ"
                value={form.location}
                onChange={handleFormChange}
              />
            </div>
            <div className="india-dc-field">
              <label htmlFor="state">State</label>
              <select id="state" name="state" value={form.state} onChange={handleFormChange}>
                <option value="">Select State</option>
                {INDIAN_STATES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div className="india-dc-field">
              <label htmlFor="powerMW">Power Needs (MW)</label>
              <input
                id="powerMW"
                name="powerMW"
                type="number"
                placeholder="e.g. 50"
                value={form.powerMW}
                onChange={handleFormChange}
              />
            </div>
            <div className="india-dc-field">
              <label htmlFor="sizeSqFt">Size (Sq. Ft.)</label>
              <input
                id="sizeSqFt"
                name="sizeSqFt"
                type="number"
                placeholder="e.g. 200000"
                value={form.sizeSqFt}
                onChange={handleFormChange}
              />
            </div>
            <div className="india-dc-field">
              <label htmlFor="status">Status</label>
              <select id="status" name="status" value={form.status} onChange={handleFormChange}>
                <option value="">Select Status</option>
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>{STATUS_DISPLAY[s]}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="india-dc-form-actions">
            <button type="submit" className="india-dc-btn india-dc-btn--primary">Add Data Center</button>
            <button type="button" className="india-dc-btn india-dc-btn--info" onClick={handleExportCSV}>Export to CSV</button>
            <button type="button" className="india-dc-btn india-dc-btn--accent">Daily Report</button>
          </div>
        </form>
      </div>

      {/* Filters */}
      <div className="india-dc-filters">
        <h3>Filters</h3>
        <div className="india-dc-filters-row">
          <div className="india-dc-field">
            <label htmlFor="filter-state">Filter by State</label>
            <select id="filter-state" name="state" value={filters.state} onChange={handleFilterChange}>
              <option value="">All States</option>
              {uniqueStates.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div className="india-dc-field">
            <label htmlFor="filter-city">Filter by City</label>
            <select id="filter-city" name="city" value={filters.city} onChange={handleFilterChange}>
              <option value="">All Cities</option>
              {uniqueCities.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div className="india-dc-field">
            <label htmlFor="filter-company">Filter by Company</label>
            <input
              id="filter-company"
              name="company"
              type="text"
              placeholder="Search company..."
              value={filters.company}
              onChange={handleFilterChange}
            />
          </div>
          <div className="india-dc-field india-dc-field--action">
            <button type="button" className="india-dc-btn india-dc-btn--outline" onClick={clearFilters}>Clear Filters</button>
          </div>
        </div>
      </div>

      {/* Data Center Registry Table */}
      <div className="india-dc-table-section">
        <h3>Data Center Registry</h3>
        <p className="india-dc-table-count">
          {isLoading ? "Loading..." : `${filteredData.length} of ${facilities.length} data centers shown`}
        </p>
        <div className="india-dc-table-wrapper">
          <table className="india-dc-table">
            <thead>
              <tr>
                <th>Date Added</th>
                <th>Company / Group</th>
                <th>City</th>
                <th>Location</th>
                <th>State</th>
                <th>Power (MW)</th>
                <th>Size (Sq. Ft.)</th>
                <th>Status</th>
                <th>Stock</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="india-dc-table-empty">Loading data centers...</td>
                </tr>
              ) : filteredData.length === 0 ? (
                <tr>
                  <td colSpan={9} className="india-dc-table-empty">No data centers match the current filters.</td>
                </tr>
              ) : (
                filteredData.map((f) => {
                  const stock = stocksByCompany[f.company_name];
                  const hasStock = !!(stock && !stock.error && stock.price != null);
                  return (
                    <tr key={f.id}>
                      <td>{f.date_added ? f.date_added.split("T")[0] : ""}</td>
                      <td className="india-dc-table-company">{f.company_name}</td>
                      <td>{f.city}</td>
                      <td>{f.location_detail || f.name}</td>
                      <td>{f.state}</td>
                      <td>{f.power_capacity_mw}</td>
                      <td>{f.size_sqft.toLocaleString()}</td>
                      <td>
                        <span className={`india-dc-status india-dc-status--${f.status}`}>
                          {STATUS_DISPLAY[f.status] || f.status}
                        </span>
                      </td>
                      <td>
                        {hasStock && stock ? (
                          <a
                            href={`https://finance.yahoo.com/quote/${encodeURIComponent(stock.ticker)}/`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              display: "inline-flex", alignItems: "center", gap: "4px",
                              fontSize: "12px", color: "#1e293b", textDecoration: "none",
                              fontWeight: 600, whiteSpace: "nowrap",
                            }}
                            title={`View ${stock.ticker} on Yahoo Finance`}
                          >
                            {stock.ticker}
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
                              <polyline points="15 3 21 3 21 9" />
                              <line x1="10" y1="14" x2="21" y2="3" />
                            </svg>
                          </a>
                        ) : (
                          <span style={{ fontSize: "12px", color: "#d1d5db" }}>—</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      </>}
    </div>
  );
}

export default IndiaDataCenterAlertPage;
