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
  // === AdaniConneX Projects ===
  {
    id: "1",
    dateAdded: "2025-01-15",
    company: "AdaniConneX",
    city: "Navi Mumbai",
    location: "Navi Mumbai Campus",
    state: "Maharashtra",
    powerMW: 1000,
    sizeSqFt: 4000000,
    status: "Under Construction",
  },
  {
    id: "2",
    dateAdded: "2025-03-10",
    company: "AdaniConneX",
    city: "Hyderabad",
    location: "Hyderabad Campus",
    state: "Telangana",
    powerMW: 600,
    sizeSqFt: 2400000,
    status: "Planned",
  },
  {
    id: "3",
    dateAdded: "2025-02-20",
    company: "AdaniConneX",
    city: "Pune",
    location: "Pune Campus",
    state: "Maharashtra",
    powerMW: 250,
    sizeSqFt: 1000000,
    status: "Planned",
  },
  {
    id: "4",
    dateAdded: "2025-04-05",
    company: "AdaniConneX",
    city: "Noida",
    location: "Noida Campus",
    state: "Uttar Pradesh",
    powerMW: 150,
    sizeSqFt: 600000,
    status: "Under Construction",
  },
  {
    id: "5",
    dateAdded: "2025-06-12",
    company: "AdaniConneX",
    city: "Chennai",
    location: "Chennai 1",
    state: "Tamil Nadu",
    powerMW: 33,
    sizeSqFt: 132000,
    status: "Operational",
  },
  // === Reliance Industries ===
  {
    id: "6",
    dateAdded: "2025-01-20",
    company: "Reliance Industries",
    city: "Jamnagar",
    location: "Jamnagar AI Data Center",
    state: "Gujarat",
    powerMW: 1000,
    sizeSqFt: 4500000,
    status: "Planned",
  },
  // === Google / AdaniConneX / Airtel ===
  {
    id: "7",
    dateAdded: "2026-01-15",
    company: "Google (with AdaniConneX & Airtel)",
    city: "Visakhapatnam",
    location: "AI & Data Center Hub",
    state: "Andhra Pradesh",
    powerMW: 500,
    sizeSqFt: 2000000,
    status: "Planned",
  },
  // === NTT Global Data Centers ===
  {
    id: "8",
    dateAdded: "2025-06-01",
    company: "NTT Global Data Centers",
    city: "Navi Mumbai",
    location: "NAV2 Campus",
    state: "Maharashtra",
    powerMW: 500,
    sizeSqFt: 2000000,
    status: "Under Construction",
  },
  {
    id: "9",
    dateAdded: "2024-03-15",
    company: "NTT Global Data Centers",
    city: "Navi Mumbai",
    location: "NAV1 Campus (NAV1A)",
    state: "Maharashtra",
    powerMW: 30,
    sizeSqFt: 398000,
    status: "Operational",
  },
  {
    id: "10",
    dateAdded: "2024-06-20",
    company: "NTT Global Data Centers",
    city: "Chennai",
    location: "Chennai 2 Campus, Ambattur",
    state: "Tamil Nadu",
    powerMW: 35,
    sizeSqFt: 180000,
    status: "Operational",
  },
  {
    id: "11",
    dateAdded: "2025-08-10",
    company: "NTT Global Data Centers",
    city: "Bengaluru",
    location: "Bengaluru 4 Campus",
    state: "Karnataka",
    powerMW: 67,
    sizeSqFt: 300000,
    status: "Under Construction",
  },
  {
    id: "12",
    dateAdded: "2024-09-15",
    company: "NTT Global Data Centers",
    city: "Noida",
    location: "Noida Campus",
    state: "Uttar Pradesh",
    powerMW: 53,
    sizeSqFt: 300000,
    status: "Operational",
  },
  {
    id: "13",
    dateAdded: "2025-04-23",
    company: "NTT DATA & Neysa Networks",
    city: "Hyderabad",
    location: "AI Data Center Cluster",
    state: "Telangana",
    powerMW: 400,
    sizeSqFt: 1600000,
    status: "Planned",
  },
  {
    id: "14",
    dateAdded: "2025-07-01",
    company: "NTT Global Data Centers",
    city: "Mumbai",
    location: "Mumbai 9, Chandivali Campus",
    state: "Maharashtra",
    powerMW: 40,
    sizeSqFt: 200000,
    status: "Operational",
  },
  // === CtrlS Datacenters ===
  {
    id: "15",
    dateAdded: "2025-02-15",
    company: "CtrlS Datacenters",
    city: "Hyderabad",
    location: "Chandan Valley Industrial Park",
    state: "Telangana",
    powerMW: 612,
    sizeSqFt: 2500000,
    status: "Under Construction",
  },
  {
    id: "16",
    dateAdded: "2025-08-15",
    company: "CtrlS Datacenters",
    city: "Kolkata",
    location: "Kolkata Campus Phase 1",
    state: "West Bengal",
    powerMW: 16,
    sizeSqFt: 80000,
    status: "Operational",
  },
  {
    id: "17",
    dateAdded: "2025-04-10",
    company: "CtrlS Datacenters",
    city: "Bhopal",
    location: "Badwai IT Park",
    state: "Madhya Pradesh",
    powerMW: 12,
    sizeSqFt: 60000,
    status: "Under Construction",
  },
  // === STT GDC India ===
  {
    id: "18",
    dateAdded: "2024-09-20",
    company: "STT GDC India",
    city: "Chennai",
    location: "STT Chennai 2, Ambattur",
    state: "Tamil Nadu",
    powerMW: 25,
    sizeSqFt: 150000,
    status: "Operational",
  },
  {
    id: "19",
    dateAdded: "2025-01-10",
    company: "STT GDC India",
    city: "Chennai",
    location: "Siruseri Campus",
    state: "Tamil Nadu",
    powerMW: 50,
    sizeSqFt: 250000,
    status: "Under Construction",
  },
  {
    id: "20",
    dateAdded: "2025-04-20",
    company: "STT GDC India",
    city: "Kolkata",
    location: "New Town Campus",
    state: "West Bengal",
    powerMW: 25,
    sizeSqFt: 243500,
    status: "Operational",
  },
  {
    id: "21",
    dateAdded: "2025-10-15",
    company: "STT GDC India",
    city: "Navi Mumbai",
    location: "MIDC Mahape Campus",
    state: "Maharashtra",
    powerMW: 100,
    sizeSqFt: 500000,
    status: "Under Construction",
  },
  {
    id: "22",
    dateAdded: "2024-06-01",
    company: "STT GDC India",
    city: "Mumbai",
    location: "STT Mumbai DC 3, BKC",
    state: "Maharashtra",
    powerMW: 20,
    sizeSqFt: 100000,
    status: "Operational",
  },
  {
    id: "23",
    dateAdded: "2024-09-25",
    company: "STT GDC India",
    city: "Pune",
    location: "Pune 5-Building Campus",
    state: "Maharashtra",
    powerMW: 40,
    sizeSqFt: 200000,
    status: "Operational",
  },
  // === Lumina CloudInfra (Blackstone) ===
  {
    id: "24",
    dateAdded: "2025-05-10",
    company: "Lumina CloudInfra (Blackstone)",
    city: "Navi Mumbai",
    location: "Airoli & Mahape Campuses",
    state: "Maharashtra",
    powerMW: 500,
    sizeSqFt: 2000000,
    status: "Planned",
  },
  // === Digital Edge / NIIF ===
  {
    id: "25",
    dateAdded: "2024-08-15",
    company: "Digital Edge (Stonepeak) / NIIF",
    city: "Navi Mumbai",
    location: "BOM1 Greenfield Hyperscale Campus",
    state: "Maharashtra",
    powerMW: 300,
    sizeSqFt: 1200000,
    status: "Under Construction",
  },
  // === Sify Technologies ===
  {
    id: "26",
    dateAdded: "2025-09-01",
    company: "Sify Infinit Spaces",
    city: "Visakhapatnam",
    location: "Rushikonda-Madhurawada IT Park",
    state: "Andhra Pradesh",
    powerMW: 50,
    sizeSqFt: 200000,
    status: "Under Construction",
  },
  {
    id: "27",
    dateAdded: "2025-02-10",
    company: "Sify Technologies",
    city: "Lucknow",
    location: "AI Hub Data Center",
    state: "Uttar Pradesh",
    powerMW: 30,
    sizeSqFt: 120000,
    status: "Under Construction",
  },
  // === RackBank ===
  {
    id: "28",
    dateAdded: "2025-06-20",
    company: "RackBank",
    city: "Raipur",
    location: "AI Data Center Complex",
    state: "Chhattisgarh",
    powerMW: 80,
    sizeSqFt: 350000,
    status: "Under Construction",
  },
  // === Anant Raj ===
  {
    id: "29",
    dateAdded: "2025-07-15",
    company: "Anant Raj",
    city: "Gurugram",
    location: "Haryana Data Center Campus",
    state: "Haryana",
    powerMW: 300,
    sizeSqFt: 1200000,
    status: "Planned",
  },
  // === Colt DCS & RMZ Digital ===
  {
    id: "30",
    dateAdded: "2025-05-20",
    company: "Colt DCS & RMZ Digital",
    city: "Mumbai",
    location: "Mumbai Hyperscale Campus",
    state: "Maharashtra",
    powerMW: 150,
    sizeSqFt: 600000,
    status: "Planned",
  },
  {
    id: "31",
    dateAdded: "2025-05-20",
    company: "Colt DCS & RMZ Digital",
    city: "Bengaluru",
    location: "Bengaluru Hyperscale Campus",
    state: "Karnataka",
    powerMW: 100,
    sizeSqFt: 400000,
    status: "Planned",
  },
  // === Lodha Developers ===
  {
    id: "32",
    dateAdded: "2025-11-10",
    company: "Lodha Developers",
    city: "Mumbai",
    location: "Green Integrated Data Center Park",
    state: "Maharashtra",
    powerMW: 200,
    sizeSqFt: 1000000,
    status: "Planned",
  },
  // === Yotta Infrastructure ===
  {
    id: "33",
    dateAdded: "2024-01-15",
    company: "Yotta Infrastructure",
    city: "Greater Noida",
    location: "Yotta NM1, Sector 62",
    state: "Uttar Pradesh",
    powerMW: 60,
    sizeSqFt: 250000,
    status: "Operational",
  },
  {
    id: "34",
    dateAdded: "2023-06-10",
    company: "Yotta Infrastructure",
    city: "Navi Mumbai",
    location: "Yotta D1, Panvel",
    state: "Maharashtra",
    powerMW: 50,
    sizeSqFt: 300000,
    status: "Operational",
  },
  // === AWS India ===
  {
    id: "35",
    dateAdded: "2025-03-01",
    company: "AWS India (Amazon)",
    city: "Hyderabad",
    location: "AWS Asia Pacific (Hyderabad) Region",
    state: "Telangana",
    powerMW: 200,
    sizeSqFt: 800000,
    status: "Operational",
  },
  {
    id: "36",
    dateAdded: "2025-08-20",
    company: "AWS India (Amazon)",
    city: "Mumbai",
    location: "AWS Asia Pacific (Mumbai) Region",
    state: "Maharashtra",
    powerMW: 150,
    sizeSqFt: 600000,
    status: "Operational",
  },
  // === Microsoft Azure ===
  {
    id: "37",
    dateAdded: "2025-02-15",
    company: "Microsoft Azure",
    city: "Pune",
    location: "Azure Central India Region",
    state: "Maharashtra",
    powerMW: 180,
    sizeSqFt: 700000,
    status: "Operational",
  },
  {
    id: "38",
    dateAdded: "2025-04-01",
    company: "Microsoft Azure",
    city: "Chennai",
    location: "Azure South India Region",
    state: "Tamil Nadu",
    powerMW: 100,
    sizeSqFt: 400000,
    status: "Operational",
  },
  // === Equinix ===
  {
    id: "39",
    dateAdded: "2025-01-20",
    company: "Equinix",
    city: "Mumbai",
    location: "MB1, GPX Mumbai 1",
    state: "Maharashtra",
    powerMW: 18,
    sizeSqFt: 90000,
    status: "Operational",
  },
  {
    id: "40",
    dateAdded: "2025-11-05",
    company: "Equinix",
    city: "Chennai",
    location: "Chennai Expansion Campus",
    state: "Tamil Nadu",
    powerMW: 30,
    sizeSqFt: 150000,
    status: "Under Construction",
  },
  // === Reliance Jio ===
  {
    id: "41",
    dateAdded: "2024-05-10",
    company: "Reliance Jio",
    city: "Hyderabad",
    location: "Hitech City",
    state: "Telangana",
    powerMW: 80,
    sizeSqFt: 350000,
    status: "Operational",
  },
  {
    id: "42",
    dateAdded: "2024-08-15",
    company: "Reliance Jio",
    city: "Mumbai",
    location: "Dhirubhai Ambani Knowledge City",
    state: "Maharashtra",
    powerMW: 120,
    sizeSqFt: 500000,
    status: "Operational",
  },
  // === Tata Communications ===
  {
    id: "43",
    dateAdded: "2024-02-10",
    company: "Tata Communications",
    city: "Chennai",
    location: "Ambattur Industrial Estate",
    state: "Tamil Nadu",
    powerMW: 30,
    sizeSqFt: 120000,
    status: "Operational",
  },
  {
    id: "44",
    dateAdded: "2024-04-20",
    company: "Tata Communications",
    city: "Pune",
    location: "Pune Data Center Campus",
    state: "Maharashtra",
    powerMW: 25,
    sizeSqFt: 100000,
    status: "Operational",
  },
];

const INDIAN_STATES = [
  "Andhra Pradesh", "Bihar", "Chhattisgarh", "Delhi", "Goa", "Gujarat",
  "Haryana", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh",
  "Maharashtra", "Odisha", "Punjab", "Rajasthan", "Tamil Nadu",
  "Telangana", "Uttar Pradesh", "West Bengal",
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
