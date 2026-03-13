import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MapContainer, TileLayer, CircleMarker, Tooltip } from "react-leaflet";
import "leaflet/dist/leaflet.css";

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

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function AirportRegistryPage() {
  const navigate = useNavigate();
  const [airports, setAirports] = useState<AirportProperties[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"registry" | "map">("registry");

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

  useEffect(() => {
    fetch("/data/india_airports_unified.geojson")
      .then(r => r.json())
      .then((data: { features: Array<{ geometry: { coordinates: [number, number] }; properties: AirportProperties }> }) => {
        setAirports(data.features.map(f => ({
          ...f.properties,
          lat: f.geometry.coordinates[1],
          lon: f.geometry.coordinates[0],
        })));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

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
            <button
              onClick={() => exportCsv(filtered)}
              style={{ padding: "8px 18px", background: "#0d7a6e", color: "#fff", border: "none", fontSize: "12px", fontWeight: 700, cursor: "pointer", letterSpacing: "0.04em" }}
            >
              ↓ Export CSV ({filtered.length})
            </button>
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

          {/* Tabs */}
          <div style={{ display: "flex", gap: 0, marginTop: "20px", borderBottom: "2px solid #e2e8f0" }}>
            {(["registry", "map"] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)} style={{
                padding: "8px 20px", fontSize: "12px", fontWeight: 700, textTransform: "uppercase",
                letterSpacing: "0.06em", border: "none", background: "transparent", cursor: "pointer",
                color: activeTab === tab ? "#0d7a6e" : "#64748b",
                borderBottom: activeTab === tab ? "2px solid #0d7a6e" : "2px solid transparent",
                marginBottom: "-2px",
              }}>
                {tab === "registry" ? "Registry" : "Map View"}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "24px 32px" }}>
        {activeTab === "registry" && (
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
                    const operatorStr = a.operations?.operator_concessionaire ?? "";
                    return (
                      <tr
                        key={a.slno}
                        style={{ borderBottom: "1px solid #f1f5f9", background: idx % 2 === 0 ? "#fff" : "#fafbfc", cursor: "pointer" }}
                        title="View operator profile"
                        onClick={() => navigate(`/projects/airport-developer-profiles?operator=${encodeURIComponent(operatorStr)}`)}
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
        )}

        {/* ── Map Tab ── */}
        {activeTab === "map" && (
          <div style={{ position: "relative", height: "65vh", border: "1px solid #e2e8f0", overflow: "hidden" }}>
            <MapContainer center={[20.5937, 78.9629]} zoom={5} style={{ height: "100%", width: "100%" }} preferCanvas>
              <TileLayer attribution="© CartoDB" url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />
              {airports.filter(a => a.lat && a.lon).map(a => {
                const isUpcoming = UPCOMING_STATUSES.includes(a.status ?? "");
                const color = a.is_notable_green ? "#10b981" : (isUpcoming ? "#a855f7" : "#0d7a6e");
                return (
                  <CircleMarker
                    key={a.slno}
                    center={[a.lat!, a.lon!]}
                    radius={4}
                    pathOptions={{ fillColor: color, color: "transparent", fillOpacity: 0.85 }}
                  >
                    <Tooltip direction="top" offset={[0, -6]} opacity={1}>
                      <div style={{ fontSize: "12px", fontWeight: 700 }}>{a.airport_name}</div>
                      <div style={{ fontSize: "10px", color: "#64748b" }}>{a.city}, {a.state}</div>
                      <div style={{ fontSize: "10px" }}>{a.status ?? ""}</div>
                    </Tooltip>
                  </CircleMarker>
                );
              })}
            </MapContainer>
            {/* Legend */}
            <div style={{ position: "absolute", bottom: 24, right: 24, background: "rgba(255,255,255,0.92)", padding: "10px 14px", border: "1px solid #e2e8f0", fontSize: "11px", zIndex: 1000 }}>
              {[
                { color: "#10b981", label: "Green Certified" },
                { color: "#a855f7", label: "Upcoming" },
                { color: "#0d7a6e", label: "Operational" },
              ].map(l => (
                <div key={l.label} style={{ display: "flex", alignItems: "center", gap: "7px", marginBottom: "4px" }}>
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: l.color, flexShrink: 0 }} />
                  <span style={{ color: "#334155" }}>{l.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
