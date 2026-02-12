import { useState } from "react";

interface DataCenter {
  id: string;
  dateAdded: string;
  company: string;
  city: string;
  location: string;
  state: string;
  powerMW: number;
  sizeSqFt: number;
  status: string;
}

const INITIAL_DATA: DataCenter[] = [
  {
    id: "1",
    dateAdded: "2026-02-12",
    company: "Adani Group",
    city: "Mumbai",
    location: "Navi Mumbai SEZ",
    state: "Maharashtra",
    powerMW: 50,
    sizeSqFt: 200000,
    status: "Under Construction",
  },
  {
    id: "2",
    dateAdded: "2026-02-11",
    company: "Reliance Jio",
    city: "Hyderabad",
    location: "Hitech City",
    state: "Telangana",
    powerMW: 80,
    sizeSqFt: 350000,
    status: "Operational",
  },
  {
    id: "3",
    dateAdded: "2026-02-10",
    company: "Tata Communications",
    city: "Chennai",
    location: "Ambattur Industrial Estate",
    state: "Tamil Nadu",
    powerMW: 30,
    sizeSqFt: 120000,
    status: "Operational",
  },
  {
    id: "4",
    dateAdded: "2026-02-10",
    company: "NTT Data",
    city: "Bangalore",
    location: "Whitefield",
    state: "Karnataka",
    powerMW: 45,
    sizeSqFt: 180000,
    status: "Planned",
  },
  {
    id: "5",
    dateAdded: "2026-02-09",
    company: "AWS India",
    city: "Pune",
    location: "Hinjewadi IT Park",
    state: "Maharashtra",
    powerMW: 100,
    sizeSqFt: 500000,
    status: "Under Construction",
  },
  {
    id: "6",
    dateAdded: "2026-02-08",
    company: "Yotta Infrastructure",
    city: "Greater Noida",
    location: "Sector 62",
    state: "Uttar Pradesh",
    powerMW: 60,
    sizeSqFt: 250000,
    status: "Operational",
  },
];

const INDIAN_STATES = [
  "Andhra Pradesh", "Bihar", "Delhi", "Goa", "Gujarat", "Haryana",
  "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Odisha",
  "Punjab", "Rajasthan", "Tamil Nadu", "Telangana", "Uttar Pradesh",
  "West Bengal",
];

const STATUS_OPTIONS = ["Planned", "Under Construction", "Operational"];

const EMPTY_FORM = {
  company: "",
  city: "",
  location: "",
  state: "",
  powerMW: "",
  sizeSqFt: "",
  status: "",
};

function IndiaDataCenterAlertPage() {
  const [dataCenters, setDataCenters] = useState<DataCenter[]>(INITIAL_DATA);
  const [form, setForm] = useState(EMPTY_FORM);
  const [filters, setFilters] = useState({ state: "", city: "", company: "" });

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  };

  const handleAddDataCenter = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.company || !form.city || !form.state || !form.status) return;
    const newEntry: DataCenter = {
      id: Date.now().toString(),
      dateAdded: new Date().toISOString().split("T")[0],
      company: form.company,
      city: form.city,
      location: form.location,
      state: form.state,
      powerMW: Number(form.powerMW) || 0,
      sizeSqFt: Number(form.sizeSqFt) || 0,
      status: form.status,
    };
    setDataCenters([newEntry, ...dataCenters]);
    setForm(EMPTY_FORM);
  };

  const handleDelete = (id: string) => {
    setDataCenters(dataCenters.filter((dc) => dc.id !== id));
  };

  const handleExportCSV = () => {
    const headers = ["Date Added", "Company/Group", "City", "Location", "State", "Power (MW)", "Size (Sq. Ft.)", "Status"];
    const rows = filteredData.map((dc) => [dc.dateAdded, dc.company, dc.city, dc.location, dc.state, dc.powerMW, dc.sizeSqFt, dc.status]);
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

  const filteredData = dataCenters.filter((dc) => {
    if (filters.state && dc.state !== filters.state) return false;
    if (filters.city && !dc.city.toLowerCase().includes(filters.city.toLowerCase())) return false;
    if (filters.company && !dc.company.toLowerCase().includes(filters.company.toLowerCase())) return false;
    return true;
  });

  const uniqueStates = [...new Set(dataCenters.map((dc) => dc.state))].sort();
  const uniqueCities = [...new Set(dataCenters.map((dc) => dc.city))].sort();

  const totalPower = dataCenters.reduce((sum, dc) => sum + dc.powerMW, 0);
  const addedToday = dataCenters.filter((dc) => dc.dateAdded === new Date().toISOString().split("T")[0]).length;

  return (
    <div className="india-dc-page">
      <div className="india-dc-header">
        <h2>India Data Center Alert Service</h2>
        <p>Track and monitor data center developments across India. Get real-time alerts on new facilities, expansions, and power capacity changes.</p>
      </div>

      {/* Stats Cards */}
      <div className="india-dc-stats">
        <div className="india-dc-stat-card">
          <span className="india-dc-stat-value">{dataCenters.length}</span>
          <span className="india-dc-stat-label">Total Data Centers</span>
        </div>
        <div className="india-dc-stat-card india-dc-stat-card--accent">
          <span className="india-dc-stat-value">{addedToday}</span>
          <span className="india-dc-stat-label">Added Today</span>
        </div>
        <div className="india-dc-stat-card india-dc-stat-card--info">
          <span className="india-dc-stat-value">{uniqueStates.length}</span>
          <span className="india-dc-stat-label">States Covered</span>
        </div>
        <div className="india-dc-stat-card india-dc-stat-card--success">
          <span className="india-dc-stat-value">{totalPower} MW</span>
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
                  <option key={s} value={s}>{s}</option>
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
        <p className="india-dc-table-count">{filteredData.length} of {dataCenters.length} data centers shown</p>
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
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan={9} className="india-dc-table-empty">No data centers match the current filters.</td>
                </tr>
              ) : (
                filteredData.map((dc) => (
                  <tr key={dc.id}>
                    <td>{dc.dateAdded}</td>
                    <td className="india-dc-table-company">{dc.company}</td>
                    <td>{dc.city}</td>
                    <td>{dc.location}</td>
                    <td>{dc.state}</td>
                    <td>{dc.powerMW}</td>
                    <td>{dc.sizeSqFt.toLocaleString()}</td>
                    <td>
                      <span className={`india-dc-status india-dc-status--${dc.status.toLowerCase().replace(/\s+/g, "-")}`}>
                        {dc.status}
                      </span>
                    </td>
                    <td>
                      <button className="india-dc-btn-delete" onClick={() => handleDelete(dc.id)} title="Delete">
                        <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
                          <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default IndiaDataCenterAlertPage;
