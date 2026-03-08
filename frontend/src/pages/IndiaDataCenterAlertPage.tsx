import { useState, useMemo, useEffect } from "react";
import DataCenterHeatMap from "../components/DataCenterHeatMap";
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

/** Canonical state name map — normalises DB variants to a single name. */
const STATE_NORMALIZE: Record<string, string> = {
  "New Delhi": "Delhi",
  "NCR": "Delhi",
  "Delhi NCR": "Delhi",
  "NCR Delhi": "Delhi",
  "NCT of Delhi": "Delhi",
  "National Capital Region": "Delhi",
  "Telengana": "Telangana",
  "Telanagana": "Telangana",
  "Tamilnadu": "Tamil Nadu",
  "TamilNadu": "Tamil Nadu",
  "Orissa": "Odisha",
  "Pondicherry": "Puducherry",
  "Jammu and Kashmir": "Jammu & Kashmir",
  "Jammu Kashmir": "Jammu & Kashmir",
  "J&K": "Jammu & Kashmir",
  "Uttaranchal": "Uttarakhand",
  "Uttrakhand": "Uttarakhand",
  "Andaman and Nicobar Islands": "Andaman & Nicobar Islands",
  "Andaman & Nicobar": "Andaman & Nicobar Islands",
  "Dadra and Nagar Haveli": "Dadra & Nagar Haveli",
  "Daman and Diu": "Daman & Diu",
};

function normalizeState(state: string): string {
  return STATE_NORMALIZE[state] ?? state;
}

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
    name: f.name,
    dateAdded: f.date_added ? f.date_added.split("T")[0] : "",
    company: f.company_name,
    city: f.city,
    location: f.location_detail || f.name,
    locationDetail: f.location_detail ?? undefined,
    state: f.state,
    powerMW: f.power_capacity_mw,
    sizeSqFt: f.size_sqft,
    status: STATUS_DISPLAY[f.status] || f.status,
    tierLevel: f.tier_level ?? undefined,
    lat: f.latitude ?? undefined,
    lng: f.longitude ?? undefined,
  }));
}

type SortField = "date_added" | "company_name" | "city" | "state" | "power_capacity_mw" | "size_sqft" | "status";

/* ------------------------------------------------------------------ */
/*  State Analytics Panel                                               */
/* ------------------------------------------------------------------ */

interface StateAnalyticsData {
  state: string;
  count: number;
  powerMW: number;
  powerCount: number;
}

// Top-5 accent colours (rank 1–5); rest are neutral
const TOP5_ACCENTS = ["#0f766e", "#0369a1", "#7c3aed", "#b45309", "#be123c"];

function TopStatesAnalytics({ facilities }: { facilities: DataCenterFacility[] }) {
  const [expanded, setExpanded] = useState(false);

  const stateMap: Record<string, StateAnalyticsData> = {};
  for (const f of facilities) {
    const state = normalizeState(f.state);
    if (!stateMap[state]) stateMap[state] = { state, count: 0, powerMW: 0, powerCount: 0 };
    stateMap[state].count += 1;
    if (f.power_capacity_mw && f.power_capacity_mw > 0) {
      stateMap[state].powerMW += f.power_capacity_mw;
      stateMap[state].powerCount += 1;
    }
  }

  // Sort by capacity descending (states with 0 MW go to bottom, sorted by count)
  const sorted = Object.values(stateMap).sort((a, b) =>
    b.powerMW !== a.powerMW ? b.powerMW - a.powerMW : b.count - a.count
  );
  const maxMW = sorted[0]?.powerMW ?? 1;
  const TOP_N = 5;
  const visibleRows = expanded ? sorted : sorted.slice(0, TOP_N);
  const hiddenCount = sorted.length - TOP_N;

  if (sorted.length === 0) return null;

  const renderRow = (s: StateAnalyticsData, i: number) => {
    const isTop5 = i < TOP_N;
    const accent = isTop5 ? (TOP5_ACCENTS[i] ?? "#0f766e") : "#64748b";
    const barPct = maxMW > 0 && s.powerMW > 0 ? Math.max(2, Math.round((s.powerMW / maxMW) * 100)) : 0;

    return (
      <div
        key={s.state}
        style={{
          display: "grid",
          gridTemplateColumns: "20px 1fr auto",
          alignItems: "center",
          gap: "10px",
          padding: "7px 16px",
          borderBottom: "1px solid #f1f5f9",
          background: isTop5 && i === 0 ? "#f0fdfa" : "#fff",
        }}
      >
        {/* Rank number */}
        <span style={{
          fontSize: "11px", fontWeight: 700,
          color: isTop5 ? accent : "#cbd5e1",
          textAlign: "right",
          fontVariantNumeric: "tabular-nums",
        }}>
          {i + 1}
        </span>

        {/* State + bar */}
        <div style={{ minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "3px" }}>
            <span style={{
              fontSize: "12px", fontWeight: isTop5 ? 700 : 500,
              color: isTop5 ? "#0f172a" : "#475569",
              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
            }}>
              {s.state}
            </span>
            <span style={{
              fontSize: "11px", color: "#94a3b8", marginLeft: "8px", whiteSpace: "nowrap",
              fontVariantNumeric: "tabular-nums",
            }}>
              {s.count} DC
            </span>
          </div>
          {/* Capacity bar */}
          <div style={{
            height: "4px", background: "#f1f5f9", borderRadius: "999px", overflow: "hidden",
          }}>
            {barPct > 0 && (
              <div style={{
                height: "100%", width: `${barPct}%`,
                background: isTop5
                  ? `linear-gradient(90deg, ${accent}cc, ${accent})`
                  : "#cbd5e1",
                borderRadius: "999px",
              }} />
            )}
          </div>
        </div>

        {/* MW value */}
        <div style={{ textAlign: "right", whiteSpace: "nowrap" }}>
          <span style={{
            fontSize: "12px", fontWeight: 700,
            color: s.powerMW > 0 ? (isTop5 ? accent : "#475569") : "#cbd5e1",
            fontVariantNumeric: "tabular-nums",
          }}>
            {s.powerMW > 0
              ? `${s.powerMW >= 1000
                  ? (s.powerMW / 1000).toFixed(2) + " GW"
                  : s.powerMW % 1 === 0
                    ? s.powerMW.toFixed(0) + " MW"
                    : s.powerMW.toFixed(2) + " MW"}`
              : "—"}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div style={{
      marginBottom: "24px",
      border: "1px solid #e2e8f0",
      borderRadius: "0.75rem",
      overflow: "hidden",
      background: "#fff",
      boxShadow: "0 1px 8px rgba(0,0,0,0.06)",
    }}>
      {/* Header */}
      <div style={{
        padding: "12px 16px",
        background: "#f8fafc",
        borderBottom: "1px solid #e2e8f0",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "13px", fontWeight: 700, color: "#0f172a" }}>By State</span>
          <span style={{
            background: "#0f766e", color: "#fff",
            fontSize: "11px", fontWeight: 700,
            padding: "1px 7px", borderRadius: "999px",
          }}>
            {sorted.length}
          </span>
        </div>
        <span style={{ fontSize: "11px", color: "#94a3b8" }}>
          Capacity where available · sorted by MW
        </span>
      </div>

      {/* Rows */}
      <div style={{ padding: "6px 0" }}>
        {visibleRows.map((s, i) => renderRow(s, i))}
      </div>

      {/* Expand / Collapse */}
      {hiddenCount > 0 && (
        <div style={{ borderTop: "1px solid #f1f5f9" }}>
          <button
            onClick={() => setExpanded((v) => !v)}
            style={{
              width: "100%", padding: "9px 16px",
              background: "none", border: "none", cursor: "pointer",
              fontSize: "12px", fontWeight: 600,
              color: "#0f766e", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
            }}
          >
            {expanded ? (
              <>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"/></svg>
                Show less
              </>
            ) : (
              <>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                Show {hiddenCount} more {hiddenCount === 1 ? "state" : "states"}
              </>
            )}
          </button>
        </div>
      )}

      {/* Footer */}
      <div style={{
        padding: "8px 16px",
        borderTop: "1px solid #f1f5f9",
        background: "#fafbfc",
        fontSize: "10px", color: "#94a3b8",
      }}>
        MW totals reflect disclosed capacity only · {sorted.filter(s => s.powerCount > 0).length} of {sorted.length} states have capacity data
      </div>
    </div>
  );
}

const TOP5_KPI_ACCENTS = ["#0f766e", "#0369a1", "#7c3aed", "#b45309", "#be123c"];

function CompactTopStates({ facilities }: { facilities: DataCenterFacility[] }) {
  const stateMap: Record<string, { count: number; powerMW: number }> = {};
  for (const f of facilities) {
    const state = normalizeState(f.state);
    if (!stateMap[state]) stateMap[state] = { count: 0, powerMW: 0 };
    stateMap[state].count += 1;
    if (f.power_capacity_mw > 0) stateMap[state].powerMW += f.power_capacity_mw;
  }
  const top5 = Object.entries(stateMap)
    .sort(([, a], [, b]) => b.powerMW !== a.powerMW ? b.powerMW - a.powerMW : b.count - a.count)
    .slice(0, 5);
  const maxMW = top5[0]?.[1].powerMW ?? 1;

  if (top5.length === 0) {
    return (
      <div className="india-dc-stat-card india-dc-stat-card--info">
        <span className="india-dc-stat-label">Top States</span>
        <span style={{ fontSize: "11px", color: "#94a3b8" }}>No data</span>
      </div>
    );
  }

  return (
    <div className="india-dc-stat-card india-dc-stat-card--info" style={{ gap: 0, padding: "12px 14px" }}>
      <div style={{ marginBottom: "8px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: "10px", fontWeight: 800, color: "#0f172a", textTransform: "uppercase", letterSpacing: "0.07em" }}>
          Top States
        </span>
        <span style={{ fontSize: "9px", color: "#94a3b8" }}>by Power</span>
      </div>
      {top5.map(([state, info], i) => {
        const barPct = maxMW > 0 && info.powerMW > 0 ? Math.max(5, Math.round((info.powerMW / maxMW) * 100)) : 5;
        const accent = TOP5_KPI_ACCENTS[i] ?? "#64748b";
        const mwLabel = info.powerMW >= 1000
          ? `${(info.powerMW / 1000).toFixed(1)}GW`
          : info.powerMW > 0
            ? `${Math.round(info.powerMW)}MW`
            : `${info.count}DC`;
        return (
          <div key={state} style={{ display: "flex", alignItems: "center", gap: "5px", marginBottom: "5px" }}>
            <span style={{ fontSize: "9px", fontWeight: 700, color: accent, width: "10px", textAlign: "right", flexShrink: 0 }}>
              {i + 1}
            </span>
            <span style={{
              fontSize: "11px", fontWeight: i < 2 ? 700 : 500,
              color: i === 0 ? "#0f172a" : "#334155",
              flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>
              {state}
            </span>
            <div style={{ width: "36px", height: "3px", background: "#f1f5f9", borderRadius: "99px", overflow: "hidden", flexShrink: 0 }}>
              <div style={{ height: "100%", width: `${barPct}%`, background: accent, borderRadius: "99px" }} />
            </div>
            <span style={{
              fontSize: "9px", color: "#64748b", width: "36px",
              textAlign: "right", flexShrink: 0, fontVariantNumeric: "tabular-nums",
            }}>
              {mwLabel}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function SortIcon({ active, dir }: { active: boolean; dir: "asc" | "desc" }) {
  return (
    <span style={{ marginLeft: "4px", fontSize: "10px", opacity: active ? 1 : 0.35, color: active ? "#0f766e" : "#6b7280" }}>
      {active ? (dir === "asc" ? "▲" : "▼") : "⇅"}
    </span>
  );
}

const PAGE_SIZE = 10;

function IndiaDataCenterAlertPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(EMPTY_FORM);
  const [showAddModal, setShowAddModal] = useState(false);
  const [filters, setFilters] = useState({ state: "", city: "", company: "", power: "" });
  const [activeTab, setActiveTab] = useState<"registry" | "map" | "substations">("registry");
  const [stocksByCompany, setStocksByCompany] = useState<Record<string, DcStock>>({});
  const [sortField, setSortField] = useState<SortField>("date_added");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = useState(1);

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

  // Apply client-side filters + sorting
  const filteredData = useMemo(() => {
    const data = facilities.filter((f) => {
      if (filters.state && normalizeState(f.state) !== filters.state) return false;
      if (filters.city && !f.city.toLowerCase().includes(filters.city.toLowerCase())) return false;
      if (filters.company && !f.company_name.toLowerCase().includes(filters.company.toLowerCase())) return false;
      if (filters.power) {
        const mw = f.power_capacity_mw ?? 0;
        if (filters.power === "<10" && mw >= 10) return false;
        if (filters.power === "10-50" && (mw < 10 || mw > 50)) return false;
        if (filters.power === "50-100" && (mw < 50 || mw > 100)) return false;
        if (filters.power === ">100" && mw <= 100) return false;
      }
      return true;
    });
    return [...data].sort((a, b) => {
      const av = a[sortField] ?? "";
      const bv = b[sortField] ?? "";
      if (typeof av === "number" && typeof bv === "number") {
        return sortDir === "asc" ? av - bv : bv - av;
      }
      return sortDir === "asc"
        ? String(av).localeCompare(String(bv))
        : String(bv).localeCompare(String(av));
    });
  }, [facilities, filters, sortField, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filteredData.length / PAGE_SIZE));
  const paginatedData = filteredData.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const mapData = useMemo(() => toMapFormat(facilities), [facilities]);

  const uniqueStates = useMemo(
    () => [...new Set(facilities.map((f) => normalizeState(f.state)))].sort(),
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
    setCurrentPage(1);
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
      setShowAddModal(false);
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
    setFilters({ state: "", city: "", company: "", power: "" });
    setCurrentPage(1);
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
        <DataCenterHeatMap dataCenters={mapData} />
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
        <CompactTopStates facilities={facilities} />
        <div className="india-dc-stat-card india-dc-stat-card--success">
          <span className="india-dc-stat-value">{Math.round(stats?.total_power_mw ?? 0)} MW</span>
          <span className="india-dc-stat-label">Total Power Capacity</span>
        </div>
      </div>

      {/* Top 5 States Analytics */}
      <TopStatesAnalytics facilities={facilities} />


      {/* Add Data Center Modal */}
      {showAddModal && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 1000,
            background: "rgba(15,23,42,0.55)", backdropFilter: "blur(3px)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowAddModal(false); }}
        >
          <div style={{
            background: "#fff", borderRadius: "0.75rem",
            boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
            width: "min(600px, 95vw)", maxHeight: "90vh", overflowY: "auto",
          }}>
            {/* Modal header */}
            <div style={{
              padding: "18px 24px", borderBottom: "1px solid #e2e8f0",
              display: "flex", alignItems: "center", justifyContent: "space-between",
              borderTopLeftRadius: "0.75rem", borderTopRightRadius: "0.75rem",
              background: "#f8fafc",
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "#1e293b" }}>Add New Data Center</h3>
                <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#64748b" }}>Enter facility details below</p>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                style={{
                  background: "none", border: "1px solid #e2e8f0", cursor: "pointer",
                  borderRadius: "6px", padding: "6px 10px", fontSize: "16px", color: "#64748b", lineHeight: 1,
                }}
              >
                ✕
              </button>
            </div>
            {/* Modal body / form */}
            <div style={{ padding: "24px" }}>
              <form onSubmit={handleAddDataCenter} className="india-dc-form">
                <div className="india-dc-form-grid">
                  <div className="india-dc-field">
                    <label htmlFor="company">Company / Group</label>
                    <input id="company" name="company" type="text" placeholder="e.g. Adani Group" value={form.company} onChange={handleFormChange} />
                  </div>
                  <div className="india-dc-field">
                    <label htmlFor="city">City</label>
                    <input id="city" name="city" type="text" placeholder="e.g. Mumbai" value={form.city} onChange={handleFormChange} />
                  </div>
                  <div className="india-dc-field">
                    <label htmlFor="location">Location</label>
                    <input id="location" name="location" type="text" placeholder="e.g. Navi Mumbai SEZ" value={form.location} onChange={handleFormChange} />
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
                    <input id="powerMW" name="powerMW" type="number" placeholder="e.g. 50" value={form.powerMW} onChange={handleFormChange} />
                  </div>
                  <div className="india-dc-field">
                    <label htmlFor="sizeSqFt">Size (Sq. Ft.)</label>
                    <input id="sizeSqFt" name="sizeSqFt" type="number" placeholder="e.g. 200000" value={form.sizeSqFt} onChange={handleFormChange} />
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
                <div style={{ display: "flex", gap: "10px", marginTop: "20px", justifyContent: "flex-end" }}>
                  <button type="button" className="india-dc-btn india-dc-btn--outline" onClick={() => setShowAddModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="india-dc-btn india-dc-btn--primary">Add Data Center</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

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
          <div className="india-dc-field">
            <label htmlFor="filter-power">Power Capacity</label>
            <select id="filter-power" name="power" value={filters.power} onChange={handleFilterChange}>
              <option value="">All Power Ranges</option>
              <option value="<10">&lt; 10 MW</option>
              <option value="10-50">10 – 50 MW</option>
              <option value="50-100">50 – 100 MW</option>
              <option value=">100">&gt; 100 MW</option>
            </select>
          </div>
          <div className="india-dc-field india-dc-field--action">
            <button type="button" className="india-dc-btn india-dc-btn--outline" onClick={clearFilters}>Clear Filters</button>
          </div>
        </div>
      </div>

      {/* Data Center Registry Table */}
      <div className="india-dc-table-section">
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "4px" }}>
          <h3 style={{ margin: 0, color: "var(--color-primary-dark)" }}>Data Center Registry</h3>
          <div style={{ display: "flex", gap: "8px", flexShrink: 0, marginLeft: "12px" }}>
            <button
              className="india-dc-btn india-dc-btn--primary"
              onClick={() => setShowAddModal(true)}
            >
              + Add Data Center
            </button>
            <button type="button" className="india-dc-btn india-dc-btn--info" onClick={handleExportCSV}>
              Export to CSV
            </button>
          </div>
        </div>
        <p className="india-dc-table-count">
          {isLoading ? "Loading..." : `${filteredData.length} of ${facilities.length} data centers — page ${currentPage} of ${totalPages}`}
        </p>
        <div className="india-dc-table-wrapper">
          <table className="india-dc-table">
            <thead>
              <tr>
                {(
                  [
                    { label: "Date Added", field: "date_added" },
                    { label: "Company / Group", field: "company_name" },
                    { label: "City", field: "city" },
                    { label: "Location", field: null },
                    { label: "State", field: "state" },
                    { label: "Power (MW)", field: "power_capacity_mw" },
                    { label: "Size (Sq. Ft.)", field: "size_sqft" },
                    { label: "Status", field: "status" },
                    { label: "Stock", field: null },
                  ] as { label: string; field: SortField | null }[]
                ).map(({ label, field }) =>
                  field ? (
                    <th
                      key={label}
                      style={{ cursor: "pointer", userSelect: "none", whiteSpace: "nowrap" }}
                      onClick={() => {
                        if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
                        else { setSortField(field); setSortDir("asc"); }
                      }}
                    >
                      {label}
                      <SortIcon active={sortField === field} dir={sortDir} />
                    </th>
                  ) : (
                    <th key={label}>{label}</th>
                  )
                )}
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
                paginatedData.map((f) => {
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
        {totalPages > 1 && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", marginTop: "16px", flexWrap: "wrap" }}>
            <button
              className="india-dc-btn india-dc-btn--outline"
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
            >«</button>
            <button
              className="india-dc-btn india-dc-btn--outline"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >‹ Prev</button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 2)
              .reduce<(number | "…")[]>((acc, p, idx, arr) => {
                if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push("…");
                acc.push(p);
                return acc;
              }, [])
              .map((p, idx) =>
                p === "…" ? (
                  <span key={`ellipsis-${idx}`} style={{ padding: "0 4px", color: "#94a3b8" }}>…</span>
                ) : (
                  <button
                    key={p}
                    className={`india-dc-btn ${currentPage === p ? "india-dc-btn--primary" : "india-dc-btn--outline"}`}
                    onClick={() => setCurrentPage(p as number)}
                    style={{ minWidth: "36px" }}
                  >{p}</button>
                )
              )}
            <button
              className="india-dc-btn india-dc-btn--outline"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >Next ›</button>
            <button
              className="india-dc-btn india-dc-btn--outline"
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
            >»</button>
          </div>
        )}
      </div>

      </>}
    </div>
  );
}

export default IndiaDataCenterAlertPage;
