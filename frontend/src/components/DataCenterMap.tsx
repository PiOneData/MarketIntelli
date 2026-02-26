import { useEffect, useRef, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { FeatureCollection, Feature, Point } from "geojson";
import { Search, Server, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

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

interface DcGeoEntry {
  id?: string;
  name: string;
  company: string;
  address?: string;
  tier?: string;
  whitespace?: string;
  power_mw?: string | null;
  power_mw_numeric?: number | null;
  city?: string;
  state?: string;
  lng: number;
  lat: number;
  props: Record<string, unknown>;
}

interface PopupState {
  dc: DcGeoEntry;
}

interface StateSummaryEntry {
  count: number;
  power: number;
  companies: Set<string>;
  tiers: Record<string, number>;
}

// Tier colour mapping
const TIER_COLORS: Record<string, string> = {
  "Tier 4": "#7c3aed",  // purple
  "Tier 3": "#0f766e",  // teal
  "Tier 2": "#d97706",  // amber
  "Not Specified": "#64748b", // slate
};

function tierColor(tier: string | undefined): string {
  if (!tier) return "#64748b";
  return TIER_COLORS[tier] ?? "#64748b";
}

function TierBadge({ tier }: { tier: string | undefined }) {
  const color = tierColor(tier);
  const label = tier && tier !== "Not Specified" ? tier : "Unrated";
  return (
    <span style={{
      display: "inline-block", fontSize: 10, fontWeight: 700,
      color, background: `${color}18`,
      border: `1px solid ${color}55`,
      padding: "2px 7px", marginBottom: 4,
    }}>
      {label}
    </span>
  );
}

function DataCenterMap({ dataCenters }: { dataCenters: DataCenter[] }) {
  const navigate = useNavigate();
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [popup, setPopup] = useState<PopupState | null>(null);
  const [dcGeoList, setDcGeoList] = useState<DcGeoEntry[]>([]);
  const [search, setSearch] = useState("");
  const [selectedState, setSelectedState] = useState<string | null>(null);

  // Load individual DC entries from datacenters.geojson for search
  useEffect(() => {
    fetch("/datacenters.geojson")
      .then((res) => res.json())
      .then((data: FeatureCollection) => {
        const list: DcGeoEntry[] = data.features
          .filter((f): f is Feature<Point> => f.geometry.type === "Point")
          .map((f) => ({
            ...(f.properties as Record<string, unknown>),
            name: String(f.properties?.["name"] ?? ""),
            company: String(f.properties?.["company"] ?? ""),
            address: f.properties?.["address"] as string | undefined,
            tier: f.properties?.["tier"] as string | undefined,
            whitespace: f.properties?.["whitespace"] as string | undefined,
            power_mw: f.properties?.["power_mw"] as string | null | undefined,
            power_mw_numeric: f.properties?.["power_mw_numeric"] as number | null | undefined,
            city: f.properties?.["city"] as string | undefined,
            state: f.properties?.["state"] as string | undefined,
            id: f.properties?.["id"] as string | undefined,
            lng: (f.geometry as Point).coordinates[0] ?? 0,
            lat: (f.geometry as Point).coordinates[1] ?? 0,
            props: f.properties as Record<string, unknown>,
          }));
        setDcGeoList(list);
      })
      .catch(console.error);
  }, []);

  // Initialize MapLibre map
  useEffect(() => {
    if (map.current || !mapContainer.current) return;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        glyphs: "https://fonts.openmaptiles.org/{fontstack}/{range}.pbf",
        sources: {
          "satellite-source": {
            type: "raster",
            tiles: [
              "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
            ],
            tileSize: 256,
            attribution: "&copy; Esri, Maxar",
            maxzoom: 18,
          },
          "datacenters-geojson": {
            type: "geojson",
            data: "/datacenters.geojson",
          },
        },
        layers: [
          {
            id: "satellite-layer",
            type: "raster",
            source: "satellite-source",
            minzoom: 0,
            maxzoom: 24,
          },
          // Data center glow
          {
            id: "dc-glow",
            type: "circle",
            source: "datacenters-geojson",
            paint: {
              "circle-radius": ["interpolate", ["linear"], ["zoom"], 4, 10, 10, 22, 14, 32],
              "circle-color": [
                "match", ["get", "tier"],
                "Tier 4", "#7c3aed",
                "Tier 3", "#0f766e",
                "Tier 2", "#d97706",
                "#64748b"
              ],
              "circle-opacity": 0.2,
              "circle-blur": 0.6,
            },
          },
          // Data center core marker (tier-coloured)
          {
            id: "dc-core",
            type: "circle",
            source: "datacenters-geojson",
            paint: {
              "circle-radius": [
                "interpolate", ["linear"], ["zoom"],
                4, ["case", ["==", ["get", "tier"], "Tier 4"], 7, ["==", ["get", "tier"], "Tier 3"], 6, 5],
                10, ["case", ["==", ["get", "tier"], "Tier 4"], 14, ["==", ["get", "tier"], "Tier 3"], 12, 9],
                14, ["case", ["==", ["get", "tier"], "Tier 4"], 18, ["==", ["get", "tier"], "Tier 3"], 15, 12],
              ],
              "circle-color": [
                "match", ["get", "tier"],
                "Tier 4", "#7c3aed",
                "Tier 3", "#0f766e",
                "Tier 2", "#d97706",
                "#64748b"
              ],
              "circle-stroke-color": "#ffffff",
              "circle-stroke-width": 2,
              "circle-opacity": 1,
            },
          },
          // Data center label (visible at zoom 10+)
          {
            id: "dc-label",
            type: "symbol",
            source: "datacenters-geojson",
            minzoom: 10,
            layout: {
              "text-field": ["get", "name"],
              "text-font": ["Open Sans Regular", "Arial Unicode MS Regular"],
              "text-size": 11,
              "text-anchor": "top",
              "text-offset": [0, 1.3],
              "text-max-width": 14,
              "text-allow-overlap": false,
            },
            paint: {
              "text-color": "#ffffff",
              "text-halo-color": "#0f172a",
              "text-halo-width": 1.8,
              "text-opacity": ["interpolate", ["linear"], ["zoom"], 10, 0, 11, 1],
            },
          },
        ],
      },
      center: [78.96, 20.59],
      zoom: 4.8,
      attributionControl: false,
    });

    map.current.addControl(new maplibregl.NavigationControl(), "bottom-right");

    map.current.on("load", () => { setLoaded(true); });

    // DC click — show popup
    map.current.on("click", "dc-core", (e) => {
      e.preventDefault();
      const feature = e.features?.[0];
      if (!feature) return;
      const coords = (feature.geometry as Point).coordinates as [number, number];
      const props = feature.properties as Record<string, unknown>;
      map.current?.flyTo({ center: coords, zoom: 14, duration: 1000 });
      setPopup({
        dc: {
          name: String(props["name"] ?? ""),
          company: String(props["company"] ?? ""),
          address: props["address"] as string | undefined,
          tier: props["tier"] as string | undefined,
          whitespace: props["whitespace"] as string | undefined,
          power_mw: props["power_mw"] as string | null | undefined,
          power_mw_numeric: props["power_mw_numeric"] as number | null | undefined,
          city: props["city"] as string | undefined,
          state: props["state"] as string | undefined,
          id: props["id"] as string | undefined,
          lng: coords[0] ?? 0,
          lat: coords[1] ?? 0,
          props,
        },
      });
    });

    map.current.on("mouseenter", "dc-core", () => {
      if (map.current) map.current.getCanvas().style.cursor = "pointer";
    });
    map.current.on("mouseleave", "dc-core", () => {
      if (map.current) map.current.getCanvas().style.cursor = "";
    });

    map.current.on("click", (e) => {
      const hits = map.current?.queryRenderedFeatures(e.point, { layers: ["dc-core"] });
      if (!hits?.length) setPopup(null);
    });

    return () => { /* map lives for component lifetime */ };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  void loaded;

  const handleAccessReport = (dc: DcGeoEntry) => {
    sessionStorage.setItem(
      "pending_dc_assessment",
      JSON.stringify({ props: dc.props, lat: dc.lat, lng: dc.lng }),
    );
    navigate("/geo-analytics/assessment");
  };

  const filteredDcs = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (q.length < 2) return [];
    return dcGeoList
      .filter((d) => d.name.toLowerCase().includes(q) || d.company.toLowerCase().includes(q))
      .slice(0, 6);
  }, [search, dcGeoList]);

  const flyToDc = (dc: DcGeoEntry) => {
    map.current?.flyTo({ center: [dc.lng, dc.lat], zoom: 14, duration: 1200, essential: true });
    setPopup({ dc });
    setSearch("");
  };

  // State summary from GeoJSON data (more complete than API data)
  const stateSummary = useMemo(() => {
    const m = new Map<string, StateSummaryEntry>();
    dcGeoList.forEach((dc) => {
      const s = dc.state ?? "";
      if (!s) return;
      if (!m.has(s)) m.set(s, { count: 0, power: 0, companies: new Set(), tiers: {} });
      const entry = m.get(s)!;
      entry.count += 1;
      entry.power += dc.power_mw_numeric ?? 0;
      if (dc.company) entry.companies.add(dc.company);
      const tier = dc.tier ?? "Not Specified";
      entry.tiers[tier] = (entry.tiers[tier] ?? 0) + 1;
    });

    // Also merge API data (has size/status info)
    dataCenters.forEach((dc) => {
      if (!m.has(dc.state)) {
        m.set(dc.state, { count: 0, power: 0, companies: new Set(), tiers: {} });
      }
      const entry = m.get(dc.state)!;
      if (!dcGeoList.find((g) => g.state === dc.state)) {
        entry.count += 1;
        entry.power += dc.powerMW;
      }
    });

    return Array.from(m.entries())
      .map(([state, info]) => ({ state, ...info, companyCount: info.companies.size }))
      .sort((a, b) => b.count - a.count);
  }, [dcGeoList, dataCenters]);

  const selectedStateInfo = useMemo(
    () => selectedState ? stateSummary.find((s) => s.state === selectedState) : null,
    [selectedState, stateSummary]
  );

  const flyToState = (state: string) => {
    // Find DCs in that state and fit bounds
    const stateDcs = dcGeoList.filter((d) => d.state === state);
    if (!stateDcs.length || !map.current) return;
    if (stateDcs.length === 1) {
      map.current.flyTo({ center: [stateDcs[0].lng, stateDcs[0].lat], zoom: 8, duration: 800 });
    } else {
      const lngs = stateDcs.map((d) => d.lng);
      const lats = stateDcs.map((d) => d.lat);
      map.current.fitBounds(
        [[Math.min(...lngs) - 0.5, Math.min(...lats) - 0.5], [Math.max(...lngs) + 0.5, Math.max(...lats) + 0.5]],
        { padding: 40, duration: 900 }
      );
    }
  };

  return (
    <div className="dc-map-container">
      {/* Map area */}
      <div className="dc-map-wrapper" style={{ position: "relative" }}>
        <div ref={mapContainer} style={{ width: "100%", height: "600px" }} />

        {/* Search bar */}
        <div style={{ position: "absolute", top: 12, left: 12, zIndex: 10, width: 280 }}>
          <div style={{ position: "relative" }}>
            <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#64748b", pointerEvents: "none" }} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search data centers…"
              style={{ width: "100%", paddingLeft: 32, paddingRight: 8, paddingTop: 8, paddingBottom: 8, border: "1px solid #cbd5e1", background: "white", fontSize: 13, boxShadow: "0 2px 8px rgba(0,0,0,0.15)", outline: "none", boxSizing: "border-box" }}
            />
          </div>
          <AnimatePresence>
            {filteredDcs.length > 0 && (
              <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                style={{ background: "white", boxShadow: "0 4px 16px rgba(0,0,0,0.15)", border: "1px solid #e2e8f0", marginTop: 4, overflow: "hidden" }}>
                {filteredDcs.map((dc) => (
                  <button key={`${dc.id ?? dc.name}-${dc.lng}`} onClick={() => flyToDc(dc)}
                    style={{ width: "100%", textAlign: "left", padding: "8px 12px", border: "none", background: "none", cursor: "pointer", borderBottom: "1px solid #f1f5f9", display: "flex", flexDirection: "column", gap: 2 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "#1e293b" }}>{dc.name}</span>
                    <span style={{ fontSize: 11, color: "#64748b" }}>{dc.company}{dc.address ? ` · ${dc.address}` : ""}</span>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* DC popup */}
        <AnimatePresence>
          {popup && (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -65%)", zIndex: 20, background: "white", boxShadow: "0 8px 32px rgba(0,0,0,0.22)", border: "1px solid #e2e8f0", minWidth: 280, maxWidth: 340, overflow: "hidden" }}>

              {/* Satellite image */}
              <div style={{ position: "relative", height: "140px", background: "#0f172a", overflow: "hidden" }}>
                <img
                  src={`https://services.arcgisonline.com/arcgis/rest/services/World_Imagery/MapServer/export?bbox=${popup.dc.lng - 0.008},${popup.dc.lat - 0.004},${popup.dc.lng + 0.008},${popup.dc.lat + 0.004}&bboxSR=4326&imageSR=4326&size=680,280&format=jpg&f=image`}
                  alt="Satellite View"
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  onError={(e) => { e.currentTarget.style.display = "none"; }}
                />
                <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
                  <div style={{ width: "10px", height: "10px", background: tierColor(popup.dc.tier), border: "2px solid #fff", boxShadow: `0 0 8px ${tierColor(popup.dc.tier)}cc` }} />
                </div>
                <button onClick={() => setPopup(null)}
                  style={{ position: "absolute", top: 8, right: 8, background: "rgba(0,0,0,0.5)", border: "none", cursor: "pointer", color: "#fff", padding: "4px", display: "flex" }}>
                  <X size={13} />
                </button>
              </div>

              {/* Info */}
              <div style={{ padding: "14px 16px" }}>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#0f766e", marginBottom: 4, display: "flex", alignItems: "center", gap: 5 }}>
                  <Server size={11} /> Data Center
                </div>
                <div style={{ fontSize: 15, fontWeight: 700, color: "#1e293b", marginBottom: 2, paddingRight: 20 }}>{popup.dc.name}</div>
                <div style={{ fontSize: 12, color: "#64748b", marginBottom: 4 }}>{popup.dc.company}</div>
                {popup.dc.address && <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 6 }}>{popup.dc.address}</div>}

                {/* Tier + capacity + whitespace row */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 6, alignItems: "center" }}>
                  <TierBadge tier={popup.dc.tier} />
                  {popup.dc.power_mw && (
                    <span style={{ fontSize: 10, fontWeight: 600, color: "#374151", background: "#f1f5f9", border: "1px solid #e2e8f0", padding: "2px 7px" }}>
                      ⚡ {popup.dc.power_mw}
                    </span>
                  )}
                  {popup.dc.whitespace && (
                    <span style={{ fontSize: 10, color: "#374151", background: "#f1f5f9", border: "1px solid #e2e8f0", padding: "2px 7px" }}>
                      📐 {popup.dc.whitespace}
                    </span>
                  )}
                </div>

                <div style={{ fontSize: 10, color: "#94a3b8", marginBottom: 12, fontFamily: "monospace" }}>
                  {popup.dc.lat.toFixed(5)}°N · {popup.dc.lng.toFixed(5)}°E
                  {popup.dc.city && <span> · {popup.dc.city}{popup.dc.state ? `, ${popup.dc.state}` : ""}</span>}
                </div>
                <button onClick={() => handleAccessReport(popup.dc)}
                  style={{ width: "100%", background: "linear-gradient(135deg, #0f766e, #0d9488)", color: "white", border: "none", padding: "9px 12px", cursor: "pointer", fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                  <Server size={13} /> Access Intelligence Report
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Legend */}
        <div style={{ position: "absolute", bottom: 24, left: 12, zIndex: 10 }}>
          <div style={{ background: "rgba(0,0,0,0.65)", padding: "6px 12px", display: "flex", flexDirection: "column", gap: 4, fontSize: 11, color: "white", backdropFilter: "blur(4px)" }}>
            <div style={{ fontWeight: 700, marginBottom: 2, fontSize: 10, letterSpacing: "0.06em", textTransform: "uppercase", color: "#94a3b8" }}>Tier</div>
            {Object.entries(TIER_COLORS).map(([tier, color]) => (
              <div key={tier} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: color, display: "inline-block", flexShrink: 0 }} />
                {tier}
              </div>
            ))}
            <div style={{ marginTop: 4, paddingTop: 4, borderTop: "1px solid rgba(255,255,255,0.15)", color: "#94a3b8" }}>
              {dcGeoList.length} data centers
            </div>
          </div>
        </div>
      </div>

      {/* Sidebar */}
      <div className="dc-map-sidebar">
        <h3 className="dc-map-sidebar-title">Map Overview</h3>
        <div className="dc-map-sidebar-hint">
          <p>
            Click a marker on the map or search above to view a data center&apos;s RE Intelligence Report. Select a state below to zoom in and see a quick summary.
          </p>
          <div className="dc-map-state-list" style={{ marginTop: 16 }}>
            <h4>By State ({stateSummary.length})</h4>
            {stateSummary.map(({ state, count, power, tiers }) => {
              const isSelected = selectedState === state;
              return (
                <button
                  key={state}
                  className="dc-map-state-btn"
                  onClick={() => {
                    setSelectedState(isSelected ? null : state);
                    if (!isSelected) flyToState(state);
                  }}
                  style={{
                    cursor: "pointer",
                    width: "100%",
                    textAlign: "left",
                    border: isSelected ? "1px solid #0f766e" : "1px solid transparent",
                    background: isSelected ? "#f0fdf9" : "transparent",
                    borderRadius: 4,
                    padding: "6px 8px",
                    marginBottom: 2,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span className="dc-map-state-name" style={{ fontWeight: isSelected ? 700 : 500 }}>{state}</span>
                    <span className="dc-map-state-stats">{count} DC · {power > 0 ? `${power.toFixed(0)} MW` : "—"}</span>
                  </div>
                  {/* Tier mini-bar */}
                  {isSelected && (
                    <div style={{ marginTop: 4, display: "flex", gap: 3, flexWrap: "wrap" }}>
                      {Object.entries(tiers).filter(([, n]) => (n as number) > 0).sort(([a], [b]) => a.localeCompare(b)).map(([tier, n]) => (
                        <span key={tier} style={{
                          fontSize: 9, padding: "1px 5px",
                          background: `${tierColor(tier)}22`,
                          border: `1px solid ${tierColor(tier)}55`,
                          color: tierColor(tier), fontWeight: 700,
                        }}>
                          {tier === "Not Specified" ? "Unrated" : tier}: {n}
                        </span>
                      ))}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* State KPI Panel — shown below map when a state is selected */}
      <AnimatePresence>
        {selectedStateInfo && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            style={{
              margin: "0 0 16px",
              border: "1px solid #0f766e",
              background: "linear-gradient(135deg, #f0fdf9 0%, #ecfdf5 100%)",
              padding: "20px 24px",
              display: "flex", flexDirection: "column", gap: 12,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#0f766e", marginBottom: 4 }}>
                  State Summary
                </div>
                <h3 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#0f172a" }}>{selectedStateInfo.state}</h3>
              </div>
              <button
                onClick={() => setSelectedState(null)}
                style={{ border: "1px solid #cbd5e1", background: "#fff", cursor: "pointer", padding: "4px 8px", fontSize: 12, color: "#64748b" }}
              >
                ✕ Close
              </button>
            </div>

            {/* KPI cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 10 }}>
              {[
                { label: "Data Centers", value: selectedStateInfo.count.toString(), color: "#0f766e" },
                { label: "Total Power", value: selectedStateInfo.power > 0 ? `${selectedStateInfo.power.toFixed(0)} MW` : "—", color: "#7c3aed" },
                { label: "Companies", value: selectedStateInfo.companyCount.toString(), color: "#d97706" },
                { label: "Tier 3 / 4 DCs", value: ((selectedStateInfo.tiers["Tier 3"] ?? 0) + (selectedStateInfo.tiers["Tier 4"] ?? 0)).toString(), color: "#0891b2" },
              ].map((kpi) => (
                <div key={kpi.label} style={{
                  background: "#fff", border: "1px solid #e2e8f0",
                  padding: "14px 16px", borderTop: `3px solid ${kpi.color}`,
                }}>
                  <div style={{ fontSize: 22, fontWeight: 700, color: "#0f172a", lineHeight: 1 }}>{kpi.value}</div>
                  <div style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>{kpi.label}</div>
                </div>
              ))}
            </div>

            {/* Tier breakdown */}
            {Object.keys(selectedStateInfo.tiers).length > 0 && (
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
                  Tier Breakdown
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {Object.entries(selectedStateInfo.tiers)
                    .sort(([a], [b]) => a.localeCompare(b))
                    .map(([tier, count]) => (
                      <div key={tier} style={{
                        display: "flex", alignItems: "center", gap: 6,
                        background: "#fff", border: `1px solid ${tierColor(tier)}55`,
                        padding: "6px 12px",
                      }}>
                        <span style={{ width: 8, height: 8, borderRadius: "50%", background: tierColor(tier), flexShrink: 0 }} />
                        <span style={{ fontSize: 12, fontWeight: 600, color: tierColor(tier) }}>{tier === "Not Specified" ? "Unrated" : tier}</span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>{count}</span>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Top companies in state */}
            {selectedStateInfo.companies.size > 0 && (
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>
                  Operators ({selectedStateInfo.companies.size})
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                  {Array.from(selectedStateInfo.companies).slice(0, 12).map((co) => (
                    <span key={co} style={{
                      fontSize: 11, padding: "3px 8px",
                      background: "#f8fafc", border: "1px solid #e2e8f0", color: "#374151",
                    }}>
                      {co}
                    </span>
                  ))}
                  {selectedStateInfo.companies.size > 12 && (
                    <span style={{ fontSize: 11, color: "#94a3b8", padding: "3px 8px" }}>+{selectedStateInfo.companies.size - 12} more</span>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default DataCenterMap;
