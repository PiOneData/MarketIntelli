import { useState, useEffect, useRef, useCallback, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { fetchAirports, fetchAirportsMeta, fetchAirportsPowerStats, type Airport } from "../api/airports";

// ── Satellite map style (ESRI World Imagery — free, no API key) ───────────────
const SATELLITE_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    "esri-satellite": {
      type: "raster",
      tiles: ["https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"],
      tileSize: 256,
      attribution: "Tiles © Esri — Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community",
    },
    "esri-labels": {
      type: "raster",
      tiles: ["https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"],
      tileSize: 256,
    },
  },
  layers: [
    { id: "esri-satellite-layer", type: "raster", source: "esri-satellite" },
    { id: "esri-labels-layer",    type: "raster", source: "esri-labels" },
  ],
};

// ── Constants ─────────────────────────────────────────────────────────────────
const TYPE_COLORS: Record<string, string> = {
  International: "#2563eb",
  Domestic: "#7c3aed",
  Civil: "#0891b2",
  Military: "#dc2626",
  "Military / Civil Enclave": "#ea580c",
  "Cargo / Civil": "#059669",
};

function typeColor(t: string): string {
  for (const [k, v] of Object.entries(TYPE_COLORS)) {
    if (t?.toLowerCase().includes(k.toLowerCase())) return v;
  }
  return "#64748b";
}

function statusBadgeClass(s: string): string {
  if (!s) return "ar-badge ar-badge--gray";
  const l = s.toLowerCase();
  if (l.includes("operational")) return "ar-badge ar-badge--green";
  if (l.includes("limited")) return "ar-badge ar-badge--yellow";
  if (l.includes("under") || l.includes("construction")) return "ar-badge ar-badge--blue";
  if (l.includes("closed") || l.includes("decommission")) return "ar-badge ar-badge--red";
  return "ar-badge ar-badge--gray";
}

function displayVal(v: string | number | null | undefined): string {
  if (v === null || v === undefined || v === "") return "—";
  return String(v);
}

// ── Detail Section ─────────────────────────────────────────────────────────────
function InfoRow({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div className="ar-info-row">
      <span className="ar-info-label">{label}</span>
      <span className="ar-info-value">{displayVal(value)}</span>
    </div>
  );
}

function SectionCard({ title, icon, children }: { title: string; icon: string; children: ReactNode }) {
  return (
    <div className="ar-section-card">
      <div className="ar-section-header">
        <span className="ar-section-icon">{icon}</span>
        <h3 className="ar-section-title">{title}</h3>
      </div>
      <div className="ar-section-body">{children}</div>
    </div>
  );
}

// ── Mini Map ────────────────────────────────────────────────────────────────────
function AirportMiniMap({ lat, lng, name }: { lat: number; lng: number; name: string }) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<maplibregl.Map | null>(null);

  useEffect(() => {
    if (!mapRef.current) return;
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const map = new maplibregl.Map({
      container: mapRef.current,
      style: SATELLITE_STYLE,
      center: [lng, lat],
      zoom: 11,
      attributionControl: false,
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");

    map.on("load", () => {
      const el = document.createElement("div");
      el.className = "ar-map-marker";
      new maplibregl.Marker({ element: el }).setLngLat([lng, lat]).addTo(map);
    });

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [lat, lng]);

  return (
    <div className="ar-mini-map-wrap">
      <div ref={mapRef} className="ar-mini-map" />
      <div className="ar-mini-map-label">
        <span className="ar-mini-map-pin">📍</span> {name}
      </div>
    </div>
  );
}

// ── All-Airports Map ────────────────────────────────────────────────────────────
function AllAirportsMap({
  airports,
  selectedId,
  onSelect,
}: {
  airports: Airport[];
  selectedId: number | null;
  onSelect: (id: number) => void;
}) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);

  const clearMarkers = () => {
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];
  };

  useEffect(() => {
    if (!mapRef.current) return;
    if (mapInstanceRef.current) return;

    const map = new maplibregl.Map({
      container: mapRef.current,
      style: SATELLITE_STYLE,
      center: [80.0, 22.5],
      zoom: 4.2,
      attributionControl: false,
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    mapInstanceRef.current = map;

    return () => {
      clearMarkers();
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const addMarkers = () => {
      clearMarkers();
      airports.forEach((airport) => {
        if (airport.latitude === null || airport.longitude === null) return;
        const sno = airport["S.No"];
        const isSelected = sno === selectedId;

        const el = document.createElement("div");
        el.className = airport.is_green
          ? `ar-map-dot ar-map-dot--green${isSelected ? " ar-map-dot--selected" : ""}`
          : `ar-map-dot${isSelected ? " ar-map-dot--selected" : ""}`;
        el.title = airport["Airport Name"];

        const popup = new maplibregl.Popup({
          closeButton: false,
          closeOnClick: false,
          offset: 12,
          className: "ar-map-popup",
        }).setHTML(
          `<div class="ar-popup-content">
            <div class="ar-popup-name">${airport["Airport Name"]}</div>
            <div class="ar-popup-meta">${airport.City}, ${airport["State / UT"]}</div>
            ${airport["IATA Code"] !== "N/A" ? `<div class="ar-popup-iata">${airport["IATA Code"]}</div>` : ""}
            ${airport.is_green ? '<div class="ar-popup-green">🌿 Green Airport</div>' : ""}
          </div>`
        );

        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([airport.longitude!, airport.latitude!])
          .addTo(map);

        el.addEventListener("mouseenter", () => popup.addTo(map).setLngLat([airport.longitude!, airport.latitude!]));
        el.addEventListener("mouseleave", () => popup.remove());
        el.addEventListener("click", () => onSelect(sno));

        markersRef.current.push(marker);
      });
    };

    if (map.loaded()) {
      addMarkers();
    } else {
      map.on("load", addMarkers);
    }
  }, [airports, selectedId, onSelect]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || selectedId === null) return;
    const airport = airports.find((a) => a["S.No"] === selectedId);
    if (airport?.latitude && airport?.longitude) {
      map.flyTo({ center: [airport.longitude, airport.latitude], zoom: 10, speed: 1.5 });
    }
  }, [selectedId, airports]);

  return <div ref={mapRef} className="ar-full-map" />;
}

// ── Airport Detail ──────────────────────────────────────────────────────────────
function AirportDetail({
  airport,
  onClose,
  powerDataMissing,
}: {
  airport: Airport;
  onClose: () => void;
  powerDataMissing: number;
}) {
  const hasCoords = airport.latitude !== null && airport.longitude !== null;

  return (
    <div className="ar-detail-panel">
      <div className="ar-detail-header">
        <div className="ar-detail-title-row">
          <div className="ar-detail-title-block">
            <div className="ar-detail-badges">
              {airport.is_green && <span className="ar-green-badge">🌿 Green Airport</span>}
              <span className="ar-badge" style={{ backgroundColor: typeColor(airport.Type), color: "#fff" }}>
                {airport.Type}
              </span>
              <span className={statusBadgeClass(airport.Status)}>{airport.Status}</span>
            </div>
            <h2 className="ar-detail-name">{airport["Airport Name"]}</h2>
            <div className="ar-detail-subtitle">
              {airport["IATA Code"] !== "N/A" && (
                <span className="ar-iata-code">{airport["IATA Code"]}</span>
              )}
              <span className="ar-detail-location">
                {airport.City}, {airport["State / UT"]}
              </span>
            </div>
          </div>
          <button className="ar-close-btn" onClick={onClose} aria-label="Close">✕</button>
        </div>
      </div>

      <div className="ar-detail-body">
        {hasCoords && (
          <AirportMiniMap
            lat={airport.latitude!}
            lng={airport.longitude!}
            name={airport["Airport Name"]}
          />
        )}

        <div className="ar-sections-grid">
          {/* Overview */}
          <SectionCard title="Overview" icon="✈️">
            <InfoRow label="Operator / Concessionaire" value={airport["Operator / Concessionaire"]} />
            {airport["Official Website"] && airport["Official Website"] !== "N/A" ? (
              <div className="ar-info-row">
                <span className="ar-info-label">Official Website</span>
                <a
                  href={airport["Official Website"]}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ar-info-link"
                >
                  {airport["Official Website"]}
                </a>
              </div>
            ) : (
              <InfoRow label="Official Website" value={airport["Official Website"]} />
            )}
            <InfoRow label="Data Source" value={airport["Data Source"]} />
            <InfoRow label="Last Updated" value={airport["Last Updated"]} />
          </SectionCard>

          {/* Location */}
          <SectionCard title="Location" icon="📍">
            <InfoRow label="Full Address" value={airport["Full Address"]} />
            <InfoRow label="City" value={airport.City} />
            <InfoRow label="State / UT" value={airport["State / UT"]} />
            <InfoRow label="Pincode" value={airport.Pincode} />
            {hasCoords && (
              <InfoRow
                label="Coordinates"
                value={`${airport.latitude?.toFixed(4)}°N, ${airport.longitude?.toFixed(4)}°E`}
              />
            )}
          </SectionCard>

          {/* Traffic */}
          <SectionCard title="Traffic & Operations" icon="📊">
            <InfoRow label="Annual Passengers" value={airport["Annual Passengers (Mn)"] !== null ? `${airport["Annual Passengers (Mn)"]} Mn` : null} />
            <InfoRow label="Annual Flight Movements" value={airport["Annual Flight Movements"]} />
            <InfoRow label="Avg Daily Departures" value={airport["Avg Daily Departures"]} />
            <InfoRow label="Avg Daily Arrivals" value={airport["Avg Daily Arrivals"]} />
          </SectionCard>

          {/* Infrastructure */}
          <SectionCard title="Infrastructure" icon="🏗️">
            <InfoRow label="No. of Runways" value={airport["No. of Runways"]} />
            <InfoRow label="No. of Terminals" value={airport["No. of Terminals"]} />
            <InfoRow label="Check-In Counters" value={airport["Check-In Counters"]} />
            <InfoRow label="Immigration Desks" value={airport["Immigration Desks"]} />
            <InfoRow label="Baggage Carousels" value={airport["Baggage Carousels"]} />
            <InfoRow label="Lounges" value={airport.Lounges} />
            <InfoRow label="Wi-Fi" value={airport["Wi-Fi"]} />
          </SectionCard>

          {/* Cargo */}
          <SectionCard title="Cargo" icon="📦">
            <InfoRow label="Cargo Capacity" value={airport["Cargo Capacity (MTPA)"] !== null && airport["Cargo Capacity (MTPA)"] !== "N/A" ? `${airport["Cargo Capacity (MTPA)"]} MTPA` : airport["Cargo Capacity (MTPA)"]} />
            <InfoRow label="Actual Cargo Handled" value={airport["Actual Cargo Handled (MT)"] !== null && airport["Actual Cargo Handled (MT)"] !== "N/A" ? `${airport["Actual Cargo Handled (MT)"]} MT` : airport["Actual Cargo Handled (MT)"]} />
          </SectionCard>

          {/* Power & Sustainability */}
          <SectionCard title="Power & Sustainability" icon="⚡">
            {powerDataMissing > 0 && (
              <div className="ar-power-disclaimer">
                ⚠️ Power consumption data is incomplete — unavailable for {powerDataMissing} airport{powerDataMissing !== 1 ? "s" : ""} in this dataset.
              </div>
            )}
            <InfoRow label="Power Consumption" value={airport["Power Consumption (MW)"] !== null && airport["Power Consumption (MW)"] !== "N/A" ? `${airport["Power Consumption (MW)"]} MW` : airport["Power Consumption (MW)"]} />
            <InfoRow label="Power Mode / Renewables" value={airport["Power Mode / Renewables"]} />
            <InfoRow label="Solar Capacity Installed" value={airport["Solar Capacity Installed (MW)"] !== null && airport["Solar Capacity Installed (MW)"] !== "N/A" ? `${airport["Solar Capacity Installed (MW)"]} MW` : airport["Solar Capacity Installed (MW)"]} />
            <InfoRow label="Annual Generation" value={airport["Annual Generation (Million Units)"] !== null && airport["Annual Generation (Million Units)"] !== "N/A" ? `${airport["Annual Generation (Million Units)"]} MU` : airport["Annual Generation (Million Units)"]} />
            <InfoRow label="Annual Consumption" value={airport["Annual Consumption (Million Units)"] !== null && airport["Annual Consumption (Million Units)"] !== "N/A" ? `${airport["Annual Consumption (Million Units)"]} MU` : airport["Annual Consumption (Million Units)"]} />
            <InfoRow label="Green Energy Coverage" value={airport["% Green Energy Coverage"]} />
            <InfoRow label="Green Energy Sources" value={airport["Green Energy Sources"]} />
            <InfoRow label="Carbon Neutral / ACI Level" value={airport["Carbon Neutral / ACI Level"]} />
          </SectionCard>

          {/* Services */}
          <SectionCard title="Services" icon="🛎️">
            <InfoRow label="Special Assistance" value={airport["Special Assistance Services"]} />
            <InfoRow label="Key Vendors & Operators" value={airport["Key Vendors & Operators"]} />
          </SectionCard>
        </div>
      </div>
    </div>
  );
}

// ── Airport List Item ────────────────────────────────────────────────────────────
function AirportListItem({
  airport,
  isSelected,
  onClick,
}: {
  airport: Airport;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className={`ar-list-item${isSelected ? " ar-list-item--selected" : ""}${airport.is_green ? " ar-list-item--green" : ""}`}
      onClick={onClick}
    >
      <div className="ar-list-item-top">
        <span className="ar-list-item-name">{airport["Airport Name"]}</span>
        {airport.is_green && <span className="ar-list-green-dot" title="Green Airport">🌿</span>}
      </div>
      <div className="ar-list-item-meta">
        <span className="ar-list-item-city">{airport.City}, {airport["State / UT"]}</span>
        {airport["IATA Code"] !== "N/A" && (
          <span className="ar-list-item-iata">{airport["IATA Code"]}</span>
        )}
      </div>
      <div className="ar-list-item-tags">
        <span
          className="ar-type-dot"
          style={{ backgroundColor: typeColor(airport.Type) }}
        />
        <span className="ar-list-type">{airport.Type}</span>
        <span className={statusBadgeClass(airport.Status)}>{airport.Status}</span>
        {airport["Power Consumption (MW)"] && airport["Power Consumption (MW)"] !== "N/A" && airport["Power Consumption (MW)"] !== null && (
          <span style={{ fontSize: "10px", color: "#f59e0b", fontWeight: 600, marginLeft: "2px" }}>
            ⚡ {airport["Power Consumption (MW)"]} MW
          </span>
        )}
        {airport.is_green && airport["Solar Capacity Installed (MW)"] && airport["Solar Capacity Installed (MW)"] !== "N/A" && airport["Solar Capacity Installed (MW)"] !== null && (
          <span style={{ fontSize: "10px", color: "#16a34a", fontWeight: 600 }}>
            ☀ {airport["Solar Capacity Installed (MW)"]} MW solar
          </span>
        )}
      </div>
    </button>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────────
export default function AirportRegistryPage() {
  const [search, setSearch] = useState("");
  const [filterState, setFilterState] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [greenOnly, setGreenOnly] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [view, setView] = useState<"map" | "list">("map");

  const { data: meta } = useQuery({
    queryKey: ["airports-meta"],
    queryFn: fetchAirportsMeta,
    staleTime: Infinity,
  });

  const { data: powerStats } = useQuery({
    queryKey: ["airports-power-stats"],
    queryFn: fetchAirportsPowerStats,
    staleTime: Infinity,
  });

  const powerDataMissing =
    powerStats != null
      ? powerStats.total_airports - powerStats.airports_with_power_data
      : 0;

  const { data, isLoading } = useQuery({
    queryKey: ["airports", search, filterState, filterType, filterStatus, greenOnly],
    queryFn: () =>
      fetchAirports({
        search: search || undefined,
        state: filterState || undefined,
        type: filterType || undefined,
        status: filterStatus || undefined,
        green_only: greenOnly || undefined,
      }),
    staleTime: 60_000,
  });

  const airports = data?.airports ?? [];
  const selectedAirport = selectedId !== null ? airports.find((a) => a["S.No"] === selectedId) ?? null : null;

  const handleSelect = useCallback((id: number) => {
    setSelectedId((prev) => (prev === id ? null : id));
  }, []);

  const handleClearFilters = () => {
    setSearch("");
    setFilterState("");
    setFilterType("");
    setFilterStatus("");
    setGreenOnly(false);
  };

  const hasFilters = search || filterState || filterType || filterStatus || greenOnly;

  return (
    <div className="ar-page">
      {/* ── Left Panel: Filters + List ── */}
      <aside className="ar-left-panel">
        <div className="ar-panel-header">
          <h1 className="ar-panel-title">Airport Registry</h1>
          <p className="ar-panel-subtitle">
            {isLoading ? "Loading…" : `${data?.total ?? 0} airports`}
          </p>
        </div>

        {/* Search */}
        <div className="ar-search-wrap">
          <span className="ar-search-icon">🔍</span>
          <input
            className="ar-search-input"
            placeholder="Search name, city, IATA…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setSelectedId(null); }}
          />
          {search && (
            <button className="ar-search-clear" onClick={() => setSearch("")}>✕</button>
          )}
        </div>

        {/* Filters */}
        <div className="ar-filters">
          <select
            className="ar-filter-select"
            value={filterState}
            onChange={(e) => { setFilterState(e.target.value); setSelectedId(null); }}
          >
            <option value="">All States / UTs</option>
            {meta?.states.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          <select
            className="ar-filter-select"
            value={filterType}
            onChange={(e) => { setFilterType(e.target.value); setSelectedId(null); }}
          >
            <option value="">All Types</option>
            {meta?.types.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>

          <select
            className="ar-filter-select"
            value={filterStatus}
            onChange={(e) => { setFilterStatus(e.target.value); setSelectedId(null); }}
          >
            <option value="">All Statuses</option>
            {meta?.statuses.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          <label className="ar-green-toggle">
            <input
              type="checkbox"
              checked={greenOnly}
              onChange={(e) => { setGreenOnly(e.target.checked); setSelectedId(null); }}
            />
            <span className="ar-green-toggle-label">🌿 Green airports only</span>
          </label>

          {hasFilters && (
            <button className="ar-clear-filters-btn" onClick={handleClearFilters}>
              Clear filters
            </button>
          )}
        </div>

        {/* View toggle */}
        <div className="ar-view-toggle">
          <button
            className={`ar-view-btn${view === "map" ? " ar-view-btn--active" : ""}`}
            onClick={() => setView("map")}
          >
            🗺 Map
          </button>
          <button
            className={`ar-view-btn${view === "list" ? " ar-view-btn--active" : ""}`}
            onClick={() => setView("list")}
          >
            ☰ List
          </button>
        </div>

        {/* Airport list */}
        <div className="ar-list">
          {isLoading ? (
            <div className="ar-list-loading">Loading airports…</div>
          ) : airports.length === 0 ? (
            <div className="ar-list-empty">No airports found.</div>
          ) : (
            airports.map((airport) => (
              <AirportListItem
                key={airport["S.No"]}
                airport={airport}
                isSelected={airport["S.No"] === selectedId}
                onClick={() => handleSelect(airport["S.No"])}
              />
            ))
          )}
        </div>
      </aside>

      {/* ── Right Panel: Map + Detail ── */}
      <div className="ar-right-panel">
        {view === "map" && (
          <div className="ar-map-container">
            <AllAirportsMap
              airports={airports}
              selectedId={selectedId}
              onSelect={handleSelect}
            />
            <div className="ar-map-legend">
              <div className="ar-legend-item">
                <span className="ar-map-dot ar-map-dot--small" />
                <span>Airport</span>
              </div>
              <div className="ar-legend-item">
                <span className="ar-map-dot ar-map-dot--green ar-map-dot--small" />
                <span>Green Airport</span>
              </div>
            </div>
            {!selectedAirport && (
              <div className="ar-map-hint">Click an airport pin or list item to view details</div>
            )}
          </div>
        )}

        {selectedAirport ? (
          <div className={`ar-detail-container${view === "map" ? " ar-detail-container--overlay" : ""}`}>
            <AirportDetail
              airport={selectedAirport}
              onClose={() => setSelectedId(null)}
              powerDataMissing={powerDataMissing}
            />
          </div>
        ) : view === "list" ? (
          <div className="ar-detail-placeholder">
            <div className="ar-placeholder-icon">✈️</div>
            <p className="ar-placeholder-text">Select an airport to view its details</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
