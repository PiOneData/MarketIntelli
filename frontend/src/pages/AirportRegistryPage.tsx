import { useState, useMemo, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { fetchAirports, createAirport, updateAirport, type ApiAirport, type AirportCreate } from "../api/airports";

// ── Types ──────────────────────────────────────────────────────────────────────
interface AirportOperations {
  annual_passengers_mn?: string | number | null;
  no_of_runways?: string | number | null;
  power_consumption_mw?: string | null;
  operator_concessionaire?: string | null;
}

interface AirportGreenEnergy {
  solar_capacity_installed_mw?: string | number | null;
  pct_green_coverage?: string | null;
  carbon_neutral_aci_level?: string | null;
  green_energy_sources?: string | null;
}

interface AirportProperties {
  id: string;
  slno: number;
  airport_name: string;
  iata_code?: string | null;
  city?: string | null;
  state?: string | null;
  type?: string | null;
  status?: string | null;
  is_notable_green?: boolean;
  operations?: AirportOperations;
  green_energy?: AirportGreenEnergy;
  overall_rating?: string | null;
  lat?: number | null;
  lon?: number | null;
}

type SortDir = "asc" | "desc";
type SortKey = "airport_name" | "iata_code" | "city" | "state" | "type" | "status" | "solar_mw" | "re_pct" | "aci";

// ── Helpers ───────────────────────────────────────────────────────────────────
const UPCOMING_STATUSES = [
  "Under Development",
  "Under Development / Proposed",
  "Under Construction (Phase 1 Launch ~2025-26)",
];

function statusColor(status: string | null | undefined): string {
  if (!status) return "#94a3b8";
  if (status === "Operational") return "#16a34a";
  if (status.startsWith("Limited") || status.startsWith("Operational (")) return "#d97706";
  if (UPCOMING_STATUSES.includes(status)) return "#a855f7";
  if (status === "Disused") return "#dc2626";
  return "#64748b";
}

function statusBg(status: string | null | undefined): string {
  if (!status) return "#f1f5f9";
  if (status === "Operational") return "#f0fdf4";
  if (status.startsWith("Limited") || status.startsWith("Operational (")) return "#fffbeb";
  if (UPCOMING_STATUSES.includes(status)) return "#faf5ff";
  if (status === "Disused") return "#fef2f2";
  return "#f1f5f9";
}

function solarMw(p: AirportProperties): number {
  const v = p.green_energy?.solar_capacity_installed_mw;
  if (v == null) return 0;
  const n = parseFloat(String(v));
  return isNaN(n) ? 0 : n;
}

function rePct(p: AirportProperties): number {
  const v = p.green_energy?.pct_green_coverage;
  if (!v) return 0;
  const n = parseFloat(String(v).replace("%", ""));
  return isNaN(n) ? 0 : n;
}

function typeShort(type: string | null | undefined): string {
  if (!type) return "—";
  if (type.startsWith("International")) return "International";
  if (type.startsWith("Domestic")) return "Domestic";
  if (type.startsWith("Military")) return "Military";
  if (type.startsWith("Civil")) return "Civil";
  return type;
}

function typeColor(type: string | null | undefined): string {
  const t = typeShort(type);
  if (t === "International") return "#2563eb";
  if (t === "Domestic") return "#7c3aed";
  if (t === "Military") return "#dc2626";
  if (t === "Civil") return "#0891b2";
  return "#64748b";
}

function exportCsv(rows: AirportProperties[]) {
  const header = ["#", "Airport Name", "IATA", "City", "State", "Type", "Status", "Solar (MW)", "RE%", "ACI Level"];
  const lines = rows.map(p => [
    p.slno,
    `"${p.airport_name}"`,
    p.iata_code ?? "",
    p.city ?? "",
    p.state ?? "",
    p.type ?? "",
    p.status ?? "",
    solarMw(p) || "",
    p.green_energy?.pct_green_coverage ?? "",
    p.green_energy?.carbon_neutral_aci_level ?? "",
  ].join(","));
  const csv = [header.join(","), ...lines].join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  const a = document.createElement("a");
  a.href = url; a.download = "india_airports_registry.csv"; a.click();
  URL.revokeObjectURL(url);
}

// ── Map API flat response → AirportProperties (nested for existing UI) ────────
function mapApiToProps(a: ApiAirport): AirportProperties {
  return {
    id: a.id,
    slno: a.sno ?? 0,
    airport_name: a.airport_name,
    iata_code: a.iata_code,
    city: a.city,
    state: a.state,
    type: a.type,
    status: a.status,
    is_notable_green: a.is_green,
    lat: a.latitude,
    lon: a.longitude,
    operations: {
      annual_passengers_mn: a.annual_passengers_mn,
      no_of_runways: a.no_of_runways,
      power_consumption_mw: a.power_consumption_mw,
      operator_concessionaire: a.operator_concessionaire,
    },
    green_energy: {
      solar_capacity_installed_mw: a.solar_capacity_mw,
      pct_green_coverage: a.pct_green_coverage,
      carbon_neutral_aci_level: a.carbon_neutral_aci_level,
      green_energy_sources: a.green_energy_sources,
    },
  };
}

const INDIAN_STATES_AIRPORT = [
  "Andaman & Nicobar Islands", "Andhra Pradesh", "Arunachal Pradesh", "Assam",
  "Bihar", "Chandigarh", "Chhattisgarh", "Dadra & Nagar Haveli", "Daman & Diu",
  "Delhi", "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jammu & Kashmir",
  "Jharkhand", "Karnataka", "Kerala", "Ladakh", "Lakshadweep", "Madhya Pradesh",
  "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha",
  "Puducherry", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana",
  "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
];

const AIRPORT_TYPES = [
  "International", "Domestic", "Military / Civil Enclave", "Civil", "Greenfield",
];

const AIRPORT_STATUSES = [
  "Operational", "Under Development", "Under Construction", "Limited Operations",
  "Proposed", "Disused",
];

const EMPTY_AIRPORT_FORM: AirportCreate = {
  airport_name: "",
  iata_code: "",
  city: "",
  state: "",
  type: "",
  status: "Operational",
  operator_concessionaire: "",
  power_consumption_mw: "",
  solar_capacity_mw: "",
  pct_green_coverage: "",
  is_green: false,
};

// ── Airport Detail Panel ───────────────────────────────────────────────────────
type AirportDetailTab = "overview" | "operations" | "green_energy" | "developer";

interface AirportDetailPanelProps {
  airport: AirportProperties;
  onClose: () => void;
  onViewDeveloper: (operatorName: string) => void;
  onEdit: () => void;
}

function AirportDetailPanel({ airport, onClose, onViewDeveloper, onEdit }: AirportDetailPanelProps) {
  const [tab, setTab] = useState<AirportDetailTab>("overview");

  const TABS: { id: AirportDetailTab; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "operations", label: "Operations" },
    { id: "green_energy", label: "Green Energy" },
    { id: "developer", label: "Developer" },
  ];

  const solar = solarMw(airport);
  const pct = rePct(airport);
  const aci = airport.green_energy?.carbon_neutral_aci_level;
  const isUpcoming = UPCOMING_STATUSES.includes(airport.status ?? "");
  const operator = airport.operations?.operator_concessionaire ?? "";

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, background: "rgba(15,23,42,0.35)",
          zIndex: 1000, backdropFilter: "blur(2px)",
        }}
      />
      {/* Panel */}
      <div style={{
        position: "fixed", top: 0, right: 0, bottom: 0,
        width: "560px", maxWidth: "100vw",
        background: "#fff", zIndex: 1001,
        display: "flex", flexDirection: "column",
        boxShadow: "-8px 0 40px rgba(15,23,42,0.16)",
        fontFamily: "var(--sans, 'DM Sans', system-ui, sans-serif)",
        overflowY: "auto",
      }}>
        {/* Header */}
        <div style={{
          background: airport.is_notable_green
            ? "linear-gradient(130deg, #059669 0%, #10b981 60%, #34d399 100%)"
            : (isUpcoming
              ? "linear-gradient(130deg, #7e22ce 0%, #a855f7 60%, #c084fc 100%)"
              : "linear-gradient(130deg, #0284c7 0%, #0ea5e9 60%, #38bdf8 100%)"),
          padding: "24px 24px 20px",
          position: "relative", flexShrink: 0,
        }}>
          <div style={{ position: "absolute", top: "16px", right: "16px", display: "flex", gap: "8px" }}>
            <button
              onClick={onEdit}
              style={{
                background: "rgba(255,255,255,0.18)", border: "none",
                borderRadius: "8px", padding: "6px 12px", cursor: "pointer",
                color: "#fff", fontSize: "12px", fontWeight: 700,
              }}
            >
              ✎ Edit
            </button>
            <button
              onClick={onClose}
              style={{
                background: "rgba(255,255,255,0.18)", border: "none",
                borderRadius: "8px", padding: "6px 10px", cursor: "pointer",
                color: "#fff", fontSize: "14px", fontWeight: 700,
              }}
            >
              ✕
            </button>
          </div>
          {airport.iata_code && (
            <div style={{
              display: "inline-block", padding: "2px 10px",
              background: "rgba(255,255,255,0.25)", color: "#fff",
              fontSize: "12px", fontWeight: 800, letterSpacing: "0.1em",
              marginBottom: "8px",
            }}>
              {airport.iata_code}
            </div>
          )}
          <h2 style={{ fontSize: "20px", fontWeight: 800, color: "#fff", margin: 0, lineHeight: 1.25 }}>
            {airport.airport_name}
          </h2>
          <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.8)", marginTop: "4px" }}>
            {airport.city}{airport.state ? `, ${airport.state}` : ""}
          </div>
          <div style={{ display: "flex", gap: "8px", marginTop: "10px", flexWrap: "wrap" }}>
            <span style={{
              padding: "3px 10px", fontSize: "10px", fontWeight: 700,
              background: "rgba(255,255,255,0.2)", color: "#fff",
              letterSpacing: "0.05em",
            }}>
              {typeShort(airport.type)}
            </span>
            <span style={{
              padding: "3px 10px", fontSize: "10px", fontWeight: 700,
              background: "rgba(255,255,255,0.2)", color: "#fff",
              letterSpacing: "0.05em",
            }}>
              {isUpcoming ? "UPCOMING" : (airport.status ?? "—")}
            </span>
            {airport.is_notable_green && (
              <span style={{
                padding: "3px 10px", fontSize: "10px", fontWeight: 700,
                background: "rgba(255,255,255,0.2)", color: "#fff",
              }}>
                🌿 Green Certified
              </span>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", borderBottom: "2px solid #f1f5f9", flexShrink: 0 }}>
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                flex: 1, padding: "12px 4px", border: "none",
                background: "transparent", cursor: "pointer",
                fontSize: "11px", fontWeight: 700, textTransform: "uppercase",
                letterSpacing: "0.06em",
                color: tab === t.id ? "#0d7a6e" : "#64748b",
                borderBottom: tab === t.id ? "2px solid #0d7a6e" : "2px solid transparent",
                marginBottom: "-2px", transition: "color 0.15s",
                fontFamily: "inherit",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div style={{ padding: "20px 24px", flex: 1, display: "flex", flexDirection: "column", gap: "16px" }}>

          {/* Overview */}
          {tab === "overview" && (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                {[
                  { lbl: "Airport Name", val: airport.airport_name },
                  { lbl: "IATA Code", val: airport.iata_code ?? "—" },
                  { lbl: "City", val: airport.city ?? "—" },
                  { lbl: "State / UT", val: airport.state ?? "—" },
                  { lbl: "Type", val: typeShort(airport.type) },
                  { lbl: "Status", val: isUpcoming ? "Upcoming" : (airport.status ?? "—") },
                  { lbl: "Overall Rating", val: airport.overall_rating ?? "—" },
                ].map(row => (
                  <div key={row.lbl} style={{
                    padding: "12px 14px", border: "1px solid #e5e7eb",
                    background: "#f9fafb",
                  }}>
                    <div style={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "#94a3b8", marginBottom: "4px" }}>
                      {row.lbl}
                    </div>
                    <div style={{ fontSize: "13px", fontWeight: 600, color: "#111827" }}>{row.val}</div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Operations */}
          {tab === "operations" && (
            <>
              {[
                { lbl: "Annual Passengers (MN)", val: airport.operations?.annual_passengers_mn != null ? String(airport.operations.annual_passengers_mn) : "—" },
                { lbl: "Number of Runways", val: airport.operations?.no_of_runways != null ? String(airport.operations.no_of_runways) : "—" },
                { lbl: "Power Consumption (MW)", val: airport.operations?.power_consumption_mw ?? "—" },
                { lbl: "Operator / Concessionaire", val: operator || "—" },
              ].map(row => (
                <div key={row.lbl} style={{
                  display: "flex", justifyContent: "space-between", alignItems: "flex-start",
                  padding: "12px 16px", border: "1px solid #e5e7eb", background: "#f9fafb", gap: "12px",
                }}>
                  <span style={{ fontSize: "13px", color: "#6b7280", flexShrink: 0 }}>{row.lbl}</span>
                  <span style={{ fontSize: "13px", fontWeight: 600, color: "#111827", textAlign: "right" }}>{row.val}</span>
                </div>
              ))}
            </>
          )}

          {/* Green Energy */}
          {tab === "green_energy" && (
            <>
              {[
                { lbl: "Solar Capacity Installed (MW)", val: solar > 0 ? `${solar.toFixed(2)} MW` : "—" },
                { lbl: "Renewable Energy Coverage", val: pct > 0 ? `${pct}%` : "—" },
                { lbl: "ACI Carbon Neutral Level", val: (aci && aci !== "Not designated") ? aci : "Not Designated" },
                { lbl: "Green Energy Sources", val: airport.green_energy?.green_energy_sources ?? "—" },
                { lbl: "Green Certified", val: airport.is_notable_green ? "Yes ✅" : "No" },
              ].map(row => (
                <div key={row.lbl} style={{
                  display: "flex", justifyContent: "space-between", alignItems: "flex-start",
                  padding: "12px 16px", border: "1px solid #e5e7eb", background: "#f9fafb", gap: "12px",
                }}>
                  <span style={{ fontSize: "13px", color: "#6b7280", flexShrink: 0 }}>{row.lbl}</span>
                  <span style={{ fontSize: "13px", fontWeight: 600, color: row.lbl === "Green Certified" && airport.is_notable_green ? "#16a34a" : "#111827", textAlign: "right" }}>{row.val}</span>
                </div>
              ))}
            </>
          )}

          {/* Developer */}
          {tab === "developer" && (
            <>
              <p style={{ fontSize: "13px", color: "#6b7280", margin: 0 }}>
                Developer / operator profile for this airport.
              </p>
              <div style={{ padding: "16px", border: "1px solid #e5e7eb", background: "#f9fafb" }}>
                <div style={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "#94a3b8", marginBottom: "8px" }}>
                  Operator / Developer
                </div>
                {operator ? (
                  <button
                    onClick={() => onViewDeveloper(operator)}
                    style={{
                      fontSize: "15px", fontWeight: 700, color: "#0d7a6e",
                      background: "none", border: "none", padding: 0,
                      cursor: "pointer", textDecoration: "underline",
                      fontFamily: "inherit", textAlign: "left",
                    }}
                  >
                    {operator} →
                  </button>
                ) : (
                  <span style={{ fontSize: "14px", color: "#94a3b8" }}>Not specified</span>
                )}
                <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "6px" }}>
                  Click the name above to view the full developer profile.
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function AirportRegistryPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [airports, setAirports] = useState<AirportProperties[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAirport, setSelectedAirport] = useState<AirportProperties | null>(null);

  // Add / Edit modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [editAirport, setEditAirport] = useState<AirportProperties | null>(null);
  const [addForm, setAddForm] = useState<AirportCreate>(EMPTY_AIRPORT_FORM);
  const [editForm, setEditForm] = useState<AirportCreate>(EMPTY_AIRPORT_FORM);
  const [saving, setSaving] = useState(false);

  // Filters
  const [search, setSearch] = useState("");
  const [filterState, setFilterState] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [greenOnly, setGreenOnly] = useState(false);

  // Sort
  const [sortKey, setSortKey] = useState<SortKey>("airport_name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  // Pagination
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  const loadAirports = useCallback(() => {
    setLoading(true);
    fetchAirports({ page_size: 500 })
      .then(res => setAirports(res.airports.map(mapApiToProps)))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadAirports();
  }, [loadAirports]);

  const handleAddAirport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.airport_name || !addForm.state || !addForm.status) return;
    setSaving(true);
    try {
      await createAirport(addForm);
      queryClient.invalidateQueries({ queryKey: ["airports"] });
      loadAirports();
      setAddForm(EMPTY_AIRPORT_FORM);
      setShowAddModal(false);
    } catch (err) {
      console.error("Failed to add airport:", err);
      alert("Failed to add airport. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleEditAirport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editAirport?.id || !editForm.airport_name) return;
    setSaving(true);
    try {
      await updateAirport(editAirport.id, editForm);
      queryClient.invalidateQueries({ queryKey: ["airports"] });
      loadAirports();
      setEditAirport(null);
      setSelectedAirport(null);
    } catch (err) {
      console.error("Failed to update airport:", err);
      alert("Failed to update airport. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (airport: AirportProperties) => {
    setEditForm({
      airport_name: airport.airport_name,
      iata_code: airport.iata_code ?? "",
      city: airport.city ?? "",
      state: airport.state ?? "",
      type: airport.type ?? "",
      status: airport.status ?? "",
      operator_concessionaire: airport.operations?.operator_concessionaire ?? "",
      power_consumption_mw: airport.operations?.power_consumption_mw ?? "",
      solar_capacity_mw: String(airport.green_energy?.solar_capacity_installed_mw ?? ""),
      pct_green_coverage: airport.green_energy?.pct_green_coverage ?? "",
      is_green: airport.is_notable_green ?? false,
    });
    setEditAirport(airport);
  };

  // Derived filter options
  const states = useMemo(() => [...new Set(airports.map(a => a.state ?? "").filter(Boolean))].sort(), [airports]);
  const types = useMemo(() => [...new Set(airports.map(a => typeShort(a.type)).filter(s => s !== "—"))].sort(), [airports]);
  const statusOptions = useMemo(() => [...new Set(airports.map(a => a.status ?? "").filter(Boolean))].sort(), [airports]);

  // Stats
  const totalSolar = useMemo(() => airports.reduce((sum, a) => sum + solarMw(a), 0), [airports]);
  const greenCount = useMemo(() => airports.filter(a => a.is_notable_green).length, [airports]);
  const statesCount = useMemo(() => new Set(airports.map(a => a.state).filter(Boolean)).size, [airports]);

  // Filtered + sorted
  const filtered = useMemo(() => {
    let rows = [...airports];
    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter(a => a.airport_name.toLowerCase().includes(q) || (a.iata_code ?? "").toLowerCase().includes(q) || (a.city ?? "").toLowerCase().includes(q));
    }
    if (filterState) rows = rows.filter(a => a.state === filterState);
    if (filterType) rows = rows.filter(a => typeShort(a.type) === filterType);
    if (filterStatus) rows = rows.filter(a => a.status === filterStatus);
    if (greenOnly) rows = rows.filter(a => a.is_notable_green);

    rows.sort((a, b) => {
      let av: string | number = 0, bv: string | number = 0;
      if (sortKey === "airport_name") { av = a.airport_name; bv = b.airport_name; }
      else if (sortKey === "iata_code") { av = a.iata_code ?? ""; bv = b.iata_code ?? ""; }
      else if (sortKey === "city") { av = a.city ?? ""; bv = b.city ?? ""; }
      else if (sortKey === "state") { av = a.state ?? ""; bv = b.state ?? ""; }
      else if (sortKey === "type") { av = typeShort(a.type); bv = typeShort(b.type); }
      else if (sortKey === "status") { av = a.status ?? ""; bv = b.status ?? ""; }
      else if (sortKey === "solar_mw") { av = solarMw(a); bv = solarMw(b); }
      else if (sortKey === "re_pct") { av = rePct(a); bv = rePct(b); }
      else if (sortKey === "aci") { av = a.green_energy?.carbon_neutral_aci_level ?? ""; bv = b.green_energy?.carbon_neutral_aci_level ?? ""; }

      if (typeof av === "number" && typeof bv === "number") return sortDir === "asc" ? av - bv : bv - av;
      return sortDir === "asc" ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
    });
    return rows;
  }, [airports, search, filterState, filterType, filterStatus, greenOnly, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
    setPage(1);
  };

  const resetFilters = () => {
    setSearch(""); setFilterState(""); setFilterType(""); setFilterStatus(""); setGreenOnly(false); setPage(1);
  };

  const thStyle = (key: SortKey): React.CSSProperties => ({
    padding: "10px 12px", fontSize: "10px", fontWeight: 700, textTransform: "uppercase",
    letterSpacing: "0.08em", color: sortKey === key ? "#0d7a6e" : "#64748b",
    background: "#f8fafc", borderBottom: "2px solid #e2e8f0", cursor: "pointer",
    whiteSpace: "nowrap", userSelect: "none",
  });

  const SortArrow = ({ col }: { col: SortKey }) =>
    sortKey === col ? <span style={{ marginLeft: 4 }}>{sortDir === "asc" ? "↑" : "↓"}</span> : null;

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh", color: "#64748b", fontFamily: "var(--sans, system-ui)" }}>
      Loading airport registry…
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", fontFamily: "var(--sans, 'DM Sans', system-ui, sans-serif)" }}>
      {/* ── Header ── */}
      <div style={{ background: "#fff", borderBottom: "1px solid #e2e8f0", padding: "24px 32px" }}>
        <div style={{ maxWidth: 1400, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#0d7a6e", marginBottom: "6px" }}>
                India Infrastructure Registry
              </div>
              <h1 style={{ fontSize: "26px", fontWeight: 800, color: "#0f172a", margin: 0, letterSpacing: "-0.02em" }}>
                Airport Registry
              </h1>
              <p style={{ fontSize: "13px", color: "#64748b", marginTop: "4px" }}>
                {airports.length} airports across India — operational, upcoming, and green-certified
              </p>
            </div>
            <div style={{ display: "flex", gap: "10px" }}>
              <button
                onClick={() => setShowAddModal(true)}
                style={{ padding: "8px 18px", background: "#0d7a6e", color: "#fff", border: "none", fontSize: "12px", fontWeight: 700, cursor: "pointer", letterSpacing: "0.04em" }}
              >
                + Add Airport
              </button>
              <button
                onClick={() => exportCsv(filtered)}
                style={{ padding: "8px 18px", background: "#0f172a", color: "#fff", border: "none", fontSize: "12px", fontWeight: 700, cursor: "pointer", letterSpacing: "0.04em" }}
              >
                ↓ Export CSV ({filtered.length})
              </button>
            </div>
          </div>

          {/* Stats cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", marginTop: "20px" }}>
            {[
              { val: airports.length, lbl: "Total Airports", color: "#0d7a6e" },
              { val: greenCount, lbl: "Green Certified", color: "#16a34a" },
              { val: statesCount, lbl: "States / UTs", color: "#2563eb" },
              { val: `${totalSolar.toFixed(1)} MW`, lbl: "Total Solar Capacity", color: "#f59e0b" },
            ].map(k => (
              <div key={k.lbl} style={{ padding: "16px 20px", background: "#fff", border: "1px solid #e2e8f0", borderTop: `3px solid ${k.color}` }}>
                <div style={{ fontSize: "24px", fontWeight: 800, color: "#0f172a" }}>{k.val}</div>
                <div style={{ fontSize: "11px", color: "#64748b", fontWeight: 500, marginTop: "2px" }}>{k.lbl}</div>
              </div>
            ))}
          </div>

        </div>
      </div>

      {/* ── Add Airport Modal ── */}
      {showAddModal && (
        <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(15,23,42,0.55)", backdropFilter: "blur(3px)", display: "flex", alignItems: "center", justifyContent: "center" }}
          onClick={e => { if (e.target === e.currentTarget) setShowAddModal(false); }}>
          <div style={{ background: "#fff", borderRadius: "0.75rem", boxShadow: "0 20px 60px rgba(0,0,0,0.25)", width: "min(620px, 95vw)", maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ padding: "18px 24px", borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "space-between", background: "#f8fafc", borderTopLeftRadius: "0.75rem", borderTopRightRadius: "0.75rem" }}>
              <div>
                <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "#1e293b" }}>Add New Airport</h3>
                <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#64748b" }}>Enter airport details below</p>
              </div>
              <button onClick={() => setShowAddModal(false)} style={{ background: "none", border: "1px solid #e2e8f0", cursor: "pointer", borderRadius: "6px", padding: "6px 10px", fontSize: "16px", color: "#64748b" }}>✕</button>
            </div>
            <form onSubmit={handleAddAirport} style={{ padding: "24px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              {[
                { label: "Airport Name *", name: "airport_name", type: "text", placeholder: "e.g. Indira Gandhi Intl Airport" },
                { label: "IATA Code", name: "iata_code", type: "text", placeholder: "e.g. DEL" },
                { label: "City", name: "city", type: "text", placeholder: "e.g. New Delhi" },
                { label: "Operator / Concessionaire", name: "operator_concessionaire", type: "text", placeholder: "e.g. GMR Group" },
                { label: "Power Consumption (MW)", name: "power_consumption_mw", type: "text", placeholder: "e.g. 15" },
                { label: "Solar Capacity (MW)", name: "solar_capacity_mw", type: "text", placeholder: "e.g. 7.84" },
                { label: "Green Energy %", name: "pct_green_coverage", type: "text", placeholder: "e.g. 60%" },
              ].map(f => (
                <div key={f.name} style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <label style={{ fontSize: "12px", fontWeight: 600, color: "#374151" }}>{f.label}</label>
                  <input name={f.name} type={f.type} placeholder={f.placeholder}
                    value={(addForm as Record<string, unknown>)[f.name] as string ?? ""}
                    onChange={e => setAddForm(prev => ({ ...prev, [f.name]: e.target.value }))}
                    style={{ padding: "8px 10px", border: "1px solid #d1d5db", fontSize: "13px", outline: "none", fontFamily: "inherit" }} />
                </div>
              ))}
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <label style={{ fontSize: "12px", fontWeight: 600, color: "#374151" }}>State / UT *</label>
                <select value={addForm.state ?? ""} onChange={e => setAddForm(prev => ({ ...prev, state: e.target.value }))}
                  style={{ padding: "8px 10px", border: "1px solid #d1d5db", fontSize: "13px", fontFamily: "inherit", background: "#fff" }}>
                  <option value="">Select State</option>
                  {INDIAN_STATES_AIRPORT.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <label style={{ fontSize: "12px", fontWeight: 600, color: "#374151" }}>Type</label>
                <select value={addForm.type ?? ""} onChange={e => setAddForm(prev => ({ ...prev, type: e.target.value }))}
                  style={{ padding: "8px 10px", border: "1px solid #d1d5db", fontSize: "13px", fontFamily: "inherit", background: "#fff" }}>
                  <option value="">Select Type</option>
                  {AIRPORT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <label style={{ fontSize: "12px", fontWeight: 600, color: "#374151" }}>Status *</label>
                <select value={addForm.status ?? ""} onChange={e => setAddForm(prev => ({ ...prev, status: e.target.value }))}
                  style={{ padding: "8px 10px", border: "1px solid #d1d5db", fontSize: "13px", fontFamily: "inherit", background: "#fff" }}>
                  <option value="">Select Status</option>
                  {AIRPORT_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div style={{ gridColumn: "1 / -1", display: "flex", alignItems: "center", gap: "8px" }}>
                <input type="checkbox" id="add_is_green" checked={addForm.is_green ?? false}
                  onChange={e => setAddForm(prev => ({ ...prev, is_green: e.target.checked }))} />
                <label htmlFor="add_is_green" style={{ fontSize: "13px", fontWeight: 600, color: "#16a34a", cursor: "pointer" }}>Green Certified Airport</label>
              </div>
              <div style={{ gridColumn: "1 / -1", display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "4px" }}>
                <button type="button" onClick={() => setShowAddModal(false)}
                  style={{ padding: "9px 18px", background: "#f8fafc", border: "1px solid #e2e8f0", fontSize: "13px", fontWeight: 600, cursor: "pointer", fontFamily: "inherit", color: "#374151" }}>
                  Cancel
                </button>
                <button type="submit" disabled={saving}
                  style={{ padding: "9px 20px", background: "#0d7a6e", color: "#fff", border: "none", fontSize: "13px", fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                  {saving ? "Adding…" : "Add Airport"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Edit Airport Modal ── */}
      {editAirport && (
        <div style={{ position: "fixed", inset: 0, zIndex: 1002, background: "rgba(15,23,42,0.55)", backdropFilter: "blur(3px)", display: "flex", alignItems: "center", justifyContent: "center" }}
          onClick={e => { if (e.target === e.currentTarget) setEditAirport(null); }}>
          <div style={{ background: "#fff", borderRadius: "0.75rem", boxShadow: "0 20px 60px rgba(0,0,0,0.25)", width: "min(620px, 95vw)", maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ padding: "18px 24px", borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "space-between", background: "#f8fafc", borderTopLeftRadius: "0.75rem", borderTopRightRadius: "0.75rem" }}>
              <div>
                <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "#1e293b" }}>Edit Airport</h3>
                <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#64748b" }}>{editAirport.airport_name}</p>
              </div>
              <button onClick={() => setEditAirport(null)} style={{ background: "none", border: "1px solid #e2e8f0", cursor: "pointer", borderRadius: "6px", padding: "6px 10px", fontSize: "16px", color: "#64748b" }}>✕</button>
            </div>
            <form onSubmit={handleEditAirport} style={{ padding: "24px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              {[
                { label: "Airport Name *", name: "airport_name", type: "text", placeholder: "" },
                { label: "IATA Code", name: "iata_code", type: "text", placeholder: "" },
                { label: "City", name: "city", type: "text", placeholder: "" },
                { label: "Operator / Concessionaire", name: "operator_concessionaire", type: "text", placeholder: "" },
                { label: "Power Consumption (MW)", name: "power_consumption_mw", type: "text", placeholder: "" },
                { label: "Solar Capacity (MW)", name: "solar_capacity_mw", type: "text", placeholder: "" },
                { label: "Green Energy %", name: "pct_green_coverage", type: "text", placeholder: "" },
              ].map(f => (
                <div key={f.name} style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <label style={{ fontSize: "12px", fontWeight: 600, color: "#374151" }}>{f.label}</label>
                  <input name={f.name} type={f.type} placeholder={f.placeholder}
                    value={(editForm as Record<string, unknown>)[f.name] as string ?? ""}
                    onChange={e => setEditForm(prev => ({ ...prev, [f.name]: e.target.value }))}
                    style={{ padding: "8px 10px", border: "1px solid #d1d5db", fontSize: "13px", outline: "none", fontFamily: "inherit" }} />
                </div>
              ))}
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <label style={{ fontSize: "12px", fontWeight: 600, color: "#374151" }}>State / UT</label>
                <select value={editForm.state ?? ""} onChange={e => setEditForm(prev => ({ ...prev, state: e.target.value }))}
                  style={{ padding: "8px 10px", border: "1px solid #d1d5db", fontSize: "13px", fontFamily: "inherit", background: "#fff" }}>
                  <option value="">Select State</option>
                  {INDIAN_STATES_AIRPORT.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <label style={{ fontSize: "12px", fontWeight: 600, color: "#374151" }}>Type</label>
                <select value={editForm.type ?? ""} onChange={e => setEditForm(prev => ({ ...prev, type: e.target.value }))}
                  style={{ padding: "8px 10px", border: "1px solid #d1d5db", fontSize: "13px", fontFamily: "inherit", background: "#fff" }}>
                  <option value="">Select Type</option>
                  {AIRPORT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <label style={{ fontSize: "12px", fontWeight: 600, color: "#374151" }}>Status</label>
                <select value={editForm.status ?? ""} onChange={e => setEditForm(prev => ({ ...prev, status: e.target.value }))}
                  style={{ padding: "8px 10px", border: "1px solid #d1d5db", fontSize: "13px", fontFamily: "inherit", background: "#fff" }}>
                  <option value="">Select Status</option>
                  {AIRPORT_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div style={{ gridColumn: "1 / -1", display: "flex", alignItems: "center", gap: "8px" }}>
                <input type="checkbox" id="edit_is_green" checked={editForm.is_green ?? false}
                  onChange={e => setEditForm(prev => ({ ...prev, is_green: e.target.checked }))} />
                <label htmlFor="edit_is_green" style={{ fontSize: "13px", fontWeight: 600, color: "#16a34a", cursor: "pointer" }}>Green Certified Airport</label>
              </div>
              <div style={{ gridColumn: "1 / -1", display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "4px" }}>
                <button type="button" onClick={() => setEditAirport(null)}
                  style={{ padding: "9px 18px", background: "#f8fafc", border: "1px solid #e2e8f0", fontSize: "13px", fontWeight: 600, cursor: "pointer", fontFamily: "inherit", color: "#374151" }}>
                  Cancel
                </button>
                <button type="submit" disabled={saving}
                  style={{ padding: "9px 20px", background: "#0d7a6e", color: "#fff", border: "none", fontSize: "13px", fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                  {saving ? "Saving…" : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "24px 32px" }}>
        <>
            {/* ── Filters ── */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", alignItems: "center", marginBottom: "16px", background: "#fff", padding: "14px 16px", border: "1px solid #e2e8f0" }}>
              <input
                type="text"
                placeholder="Search airport, IATA, city…"
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
                style={{ flex: "1 1 200px", padding: "7px 12px", border: "1px solid #e2e8f0", fontSize: "13px", outline: "none", fontFamily: "inherit" }}
              />
              <select value={filterState} onChange={e => { setFilterState(e.target.value); setPage(1); }}
                style={{ padding: "7px 10px", border: "1px solid #e2e8f0", fontSize: "12px", fontFamily: "inherit", background: "#fff" }}>
                <option value="">All States</option>
                {states.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <select value={filterType} onChange={e => { setFilterType(e.target.value); setPage(1); }}
                style={{ padding: "7px 10px", border: "1px solid #e2e8f0", fontSize: "12px", fontFamily: "inherit", background: "#fff" }}>
                <option value="">All Types</option>
                {types.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1); }}
                style={{ padding: "7px 10px", border: "1px solid #e2e8f0", fontSize: "12px", fontFamily: "inherit", background: "#fff" }}>
                <option value="">All Statuses</option>
                {statusOptions.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", fontWeight: 600, color: "#16a34a", cursor: "pointer" }}>
                <input type="checkbox" checked={greenOnly} onChange={e => { setGreenOnly(e.target.checked); setPage(1); }} />
                Green Only
              </label>
              {(search || filterState || filterType || filterStatus || greenOnly) && (
                <button onClick={resetFilters} style={{ padding: "7px 12px", fontSize: "11px", border: "1px solid #e2e8f0", background: "#f8fafc", cursor: "pointer", fontFamily: "inherit", color: "#475569" }}>
                  ✕ Clear
                </button>
              )}
              <span style={{ fontSize: "11px", color: "#94a3b8", marginLeft: "auto" }}>
                {filtered.length} of {airports.length} airports
              </span>
            </div>

            {/* ── Table ── */}
            <div style={{ background: "#fff", border: "1px solid #e2e8f0", overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                <thead>
                  <tr>
                    <th style={{ ...thStyle("airport_name"), textAlign: "left" }} onClick={() => handleSort("airport_name")}>
                      Airport Name <SortArrow col="airport_name" />
                    </th>
                    <th style={thStyle("iata_code")} onClick={() => handleSort("iata_code")}>
                      IATA <SortArrow col="iata_code" />
                    </th>
                    <th style={{ ...thStyle("city"), textAlign: "left" }} onClick={() => handleSort("city")}>
                      City <SortArrow col="city" />
                    </th>
                    <th style={{ ...thStyle("state"), textAlign: "left" }} onClick={() => handleSort("state")}>
                      State <SortArrow col="state" />
                    </th>
                    <th style={thStyle("type")} onClick={() => handleSort("type")}>
                      Type <SortArrow col="type" />
                    </th>
                    <th style={thStyle("status")} onClick={() => handleSort("status")}>
                      Status <SortArrow col="status" />
                    </th>
                    <th style={{ ...thStyle("solar_mw"), textAlign: "right" }} onClick={() => handleSort("solar_mw")}>
                      Solar (MW) <SortArrow col="solar_mw" />
                    </th>
                    <th style={{ ...thStyle("re_pct"), textAlign: "right" }} onClick={() => handleSort("re_pct")}>
                      RE% <SortArrow col="re_pct" />
                    </th>
                    <th style={{ ...thStyle("aci"), textAlign: "left" }} onClick={() => handleSort("aci")}>
                      ACI Level <SortArrow col="aci" />
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((a, idx) => {
                    const solar = solarMw(a);
                    const pct = rePct(a);
                    const aci = a.green_energy?.carbon_neutral_aci_level;
                    const isUpcoming = UPCOMING_STATUSES.includes(a.status ?? "");
                    return (
                      <tr
                        key={a.slno}
                        style={{ borderBottom: "1px solid #f1f5f9", background: idx % 2 === 0 ? "#fff" : "#fafbfc", cursor: "pointer" }}
                        title="View airport profile"
                        onClick={() => setSelectedAirport(a)}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = "#f0fdfa"; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = idx % 2 === 0 ? "#fff" : "#fafbfc"; }}
                      >
                        <td style={{ padding: "10px 12px", maxWidth: 280 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            {a.is_notable_green && (
                              <span title="Green Certified" style={{ fontSize: "12px" }}>🌿</span>
                            )}
                            <div style={{ fontWeight: 600, color: "#0f172a", lineHeight: 1.3 }}>{a.airport_name}</div>
                          </div>
                        </td>
                        <td style={{ padding: "10px 12px", textAlign: "center" }}>
                          {a.iata_code ? (
                            <span style={{ fontFamily: "var(--mono, monospace)", fontSize: "12px", fontWeight: 700, color: "#0d7a6e", background: "#f0fdfa", padding: "2px 6px" }}>
                              {a.iata_code}
                            </span>
                          ) : <span style={{ color: "#94a3b8" }}>—</span>}
                        </td>
                        <td style={{ padding: "10px 12px", color: "#334155", whiteSpace: "nowrap" }}>{a.city ?? "—"}</td>
                        <td style={{ padding: "10px 12px", color: "#334155", fontSize: "12px" }}>{a.state ?? "—"}</td>
                        <td style={{ padding: "10px 12px", textAlign: "center" }}>
                          <span style={{
                            fontSize: "10px", fontWeight: 700, padding: "2px 7px",
                            background: `${typeColor(a.type)}18`,
                            color: typeColor(a.type), letterSpacing: "0.04em",
                          }}>
                            {typeShort(a.type)}
                          </span>
                        </td>
                        <td style={{ padding: "10px 12px", textAlign: "center" }}>
                          <span style={{
                            fontSize: "10px", fontWeight: 700, padding: "3px 8px",
                            background: statusBg(a.status), color: statusColor(a.status),
                            letterSpacing: "0.03em", whiteSpace: "nowrap",
                          }}>
                            {isUpcoming ? "UPCOMING" : (a.status ?? "—")}
                          </span>
                        </td>
                        <td style={{ padding: "10px 12px", textAlign: "right", color: solar > 0 ? "#16a34a" : "#94a3b8", fontWeight: solar > 0 ? 700 : 400 }}>
                          {solar > 0 ? solar.toFixed(1) : "—"}
                        </td>
                        <td style={{ padding: "10px 12px", textAlign: "right" }}>
                          {pct > 0 ? (
                            <span style={{ fontWeight: 700, color: "#16a34a" }}>{pct}%</span>
                          ) : <span style={{ color: "#94a3b8" }}>—</span>}
                        </td>
                        <td style={{ padding: "10px 12px", fontSize: "11px", color: aci && aci !== "Not designated" ? "#16a34a" : "#94a3b8", fontWeight: 600 }}>
                          {aci && aci !== "Not designated" ? aci : "—"}
                        </td>
                      </tr>
                    );
                  })}
                  {paginated.length === 0 && (
                    <tr>
                      <td colSpan={9} style={{ padding: "40px", textAlign: "center", color: "#94a3b8", fontSize: "14px" }}>
                        No airports match the current filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* ── Pagination ── */}
            {totalPages > 1 && (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "16px" }}>
                <span style={{ fontSize: "12px", color: "#64748b" }}>
                  Page {page} of {totalPages} · {filtered.length} results
                </span>
                <div style={{ display: "flex", gap: "4px" }}>
                  <button onClick={() => setPage(1)} disabled={page === 1}
                    style={{ padding: "5px 10px", fontSize: "12px", border: "1px solid #e2e8f0", background: "#fff", cursor: page === 1 ? "not-allowed" : "pointer", opacity: page === 1 ? 0.4 : 1 }}>
                    «
                  </button>
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                    style={{ padding: "5px 10px", fontSize: "12px", border: "1px solid #e2e8f0", background: "#fff", cursor: page === 1 ? "not-allowed" : "pointer", opacity: page === 1 ? 0.4 : 1 }}>
                    ‹
                  </button>
                  {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
                    const pg = totalPages <= 7 ? i + 1 : Math.max(1, Math.min(totalPages - 6, page - 3)) + i;
                    return (
                      <button key={pg} onClick={() => setPage(pg)}
                        style={{ padding: "5px 10px", fontSize: "12px", border: `1px solid ${pg === page ? "#0d7a6e" : "#e2e8f0"}`, background: pg === page ? "#0d7a6e" : "#fff", color: pg === page ? "#fff" : "#334155", cursor: "pointer", fontWeight: pg === page ? 700 : 400 }}>
                        {pg}
                      </button>
                    );
                  })}
                  <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                    style={{ padding: "5px 10px", fontSize: "12px", border: "1px solid #e2e8f0", background: "#fff", cursor: page === totalPages ? "not-allowed" : "pointer", opacity: page === totalPages ? 0.4 : 1 }}>
                    ›
                  </button>
                  <button onClick={() => setPage(totalPages)} disabled={page === totalPages}
                    style={{ padding: "5px 10px", fontSize: "12px", border: "1px solid #e2e8f0", background: "#fff", cursor: page === totalPages ? "not-allowed" : "pointer", opacity: page === totalPages ? 0.4 : 1 }}>
                    »
                  </button>
                </div>
              </div>
            )}
        </>

      </div>

      {selectedAirport && (
        <AirportDetailPanel
          airport={selectedAirport}
          onClose={() => setSelectedAirport(null)}
          onEdit={() => {
            openEdit(selectedAirport);
          }}
          onViewDeveloper={(operatorName) => {
            setSelectedAirport(null);
            navigate(`/projects/airport-developer-profiles?operator=${encodeURIComponent(operatorName)}`);
          }}
        />
      )}
    </div>
  );
}
