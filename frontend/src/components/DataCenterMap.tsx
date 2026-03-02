/**
 * DataCenterMap — Leaflet + OpenStreetMap interactive map for the India DC Registry.
 *
 * Features
 * --------
 * - Marker clustering (leaflet.markercluster) — handles 1000+ rows
 * - Density heatmap (leaflet.heat) — weighted by city DC count
 * - State choropleth — colors Indian states by DC count (fetched from CDN)
 * - Power-based circle radius: <50 MW → 6px, 50-200 MW → 12px, 200+ MW → 20px
 * - Dark enterprise sidebar: search, city dropdown, power slider, analytics panel,
 *   top-cities ranked list, layer toggles, renewable solar overlay
 * - Side profile panel — slides in on marker click with satellite thumbnail + actions
 * - Memoized filtered dataset — markers NOT redrawn on every keystroke (debounced)
 * - All lat/lon from API — no hardcoding, no client-side geocoding
 */

import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import "leaflet.heat";
import { Server, X, Zap, Building2, MapPin, Activity, ChevronUp } from "lucide-react";
import { geocodeFacilities } from "../api/dataCenters";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DataCenter {
  id: string;
  name: string;
  dateAdded: string;
  company: string;
  city: string;
  location: string;
  locationDetail?: string;
  state: string;
  powerMW: number;
  sizeSqFt: number;
  status: string;
  tierLevel?: string;
  geocodeStatus?: string;
  lat?: number;
  lng?: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getMarkerRadius(powerMW: number): number {
  if (powerMW >= 200) return 20;
  if (powerMW >= 50) return 12;
  return 6;
}

function getStateColor(count: number): string {
  if (count >= 20) return "#fca5a5";
  if (count >= 10) return "#fcd34d";
  if (count >= 5)  return "#86efac";
  if (count >= 1)  return "#bbf7d0";
  return "transparent";
}

const SIDEBAR_STYLE: React.CSSProperties = {
  background: "#0f172a",
  color: "#e2e8f0",
  border: "1px solid rgba(255,255,255,0.06)",
  borderRadius: "0.5rem",
  padding: "16px",
  display: "flex",
  flexDirection: "column",
  gap: 16,
  overflowY: "auto",
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function DataCenterMap({ dataCenters }: { dataCenters: DataCenter[] }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // DOM / Leaflet refs
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const clusterRef = useRef<L.MarkerClusterGroup | null>(null);
  const heatRef = useRef<L.HeatLayer | null>(null);
  const choroplethRef = useRef<L.GeoJSON | null>(null);
  const renewableRef = useRef<L.LayerGroup | null>(null);
  // Map of facility id → CircleMarker (created once, reused on filter)
  const markerCacheRef = useRef<Map<string, L.CircleMarker>>(new Map());

  // UI state
  const [mapLoaded, setMapLoaded] = useState(false);
  const [searchRaw, setSearchRaw] = useState("");
  const [search, setSearch] = useState(""); // debounced
  const [cityFilter, setCityFilter] = useState("");
  const [minPower, setMinPower] = useState(0);
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [showChoropleth, setShowChoropleth] = useState(true);
  const [showRenewable, setShowRenewable] = useState(false);
  const [selectedDC, setSelectedDC] = useState<DataCenter | null>(null);
  const [geocodingState, setGeocodingState] = useState<"idle" | "running" | "done">("idle");
  const [stateCounts, setStateCounts] = useState<Record<string, number>>({});
  const [choroplethLoaded, setChoroplethLoaded] = useState(false);

  // Debounce text search so markers don't redraw on every keystroke
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchRaw), 300);
    return () => clearTimeout(t);
  }, [searchRaw]);

  // Auto-trigger geocoding when the DB has no coordinates yet
  const dbMappedCount = useMemo(
    () => dataCenters.filter((dc) => dc.lat != null && dc.lng != null).length,
    [dataCenters],
  );
  useEffect(() => {
    if (geocodingState !== "idle" || dataCenters.length === 0 || dbMappedCount > 0) return;
    setGeocodingState("running");
    geocodeFacilities()
      .then((r) => {
        if (r.resolved > 0) void queryClient.invalidateQueries({ queryKey: ["dc-facilities"] });
      })
      .catch(console.error)
      .finally(() => setGeocodingState("done"));
  }, [geocodingState, dataCenters.length, dbMappedCount, queryClient]);

  // ---------------------------------------------------------------------------
  // Derived data (memoized — only recomputed when inputs change)
  // ---------------------------------------------------------------------------

  const cities = useMemo(
    () => [...new Set(dataCenters.map((d) => d.city).filter(Boolean))].sort(),
    [dataCenters],
  );

  const maxPower = useMemo(
    () => Math.max(0, ...dataCenters.map((d) => d.powerMW)),
    [dataCenters],
  );

  const filteredDCs = useMemo(() => {
    const q = search.toLowerCase().trim();
    return dataCenters.filter((dc) => {
      if (dc.lat == null || dc.lng == null) return false;
      if (cityFilter && dc.city !== cityFilter) return false;
      if (minPower > 0 && dc.powerMW < minPower) return false;
      if (q.length >= 2 && !dc.name.toLowerCase().includes(q) && !dc.company.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [dataCenters, cityFilter, minPower, search]);

  const analytics = useMemo(() => {
    const count = filteredDCs.length;
    const totalMW = filteredDCs.reduce((s, d) => s + d.powerMW, 0);
    return { count, totalMW, avgMW: count > 0 ? totalMW / count : 0 };
  }, [filteredDCs]);

  const topCities = useMemo(() => {
    const m = new Map<string, { count: number; power: number }>();
    for (const dc of filteredDCs) {
      const c = m.get(dc.city) ?? { count: 0, power: 0 };
      c.count++;
      c.power += dc.powerMW;
      m.set(dc.city, c);
    }
    return [...m.entries()]
      .sort((a, b) => b[1].count - a[1].count || b[1].power - a[1].power)
      .slice(0, 8);
  }, [filteredDCs]);

  // ---------------------------------------------------------------------------
  // Map initialisation (runs once)
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    const map = L.map(mapContainer.current, {
      center: [20.59, 78.96],
      zoom: 5,
      zoomControl: false,
      preferCanvas: true, // faster rendering for many markers
    });

    // OSM tiles
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    L.control.zoom({ position: "bottomright" }).addTo(map);

    // Marker cluster group
    const cluster = L.markerClusterGroup({
      chunkedLoading: true,
      maxClusterRadius: 60,
      showCoverageOnHover: false,
      spiderfyOnMaxZoom: true,
      iconCreateFunction: (c) => {
        const count = c.getChildCount();
        const size = count > 50 ? 44 : count > 20 ? 36 : 28;
        return L.divIcon({
          html: `<div style="
            width:${size}px;height:${size}px;
            background:rgba(15,118,110,0.85);
            border:2px solid #fff;border-radius:50%;
            display:flex;align-items:center;justify-content:center;
            color:#fff;font-size:${size > 36 ? 14 : 12}px;font-weight:700;
            box-shadow:0 2px 8px rgba(0,0,0,0.35);
          ">${count}</div>`,
          className: "",
          iconSize: [size, size],
          iconAnchor: [size / 2, size / 2],
        });
      },
    });
    map.addLayer(cluster);

    // Heatmap layer (starts empty; updated whenever filteredDCs changes)
    const heat = L.heatLayer([], {
      radius: 35,
      blur: 25,
      maxZoom: 10,
      max: 10,
      gradient: { 0.0: "#4ade80", 0.5: "#fb923c", 1.0: "#ef4444" },
    });
    heat.addTo(map);

    mapRef.current = map;
    clusterRef.current = cluster;
    heatRef.current = heat;

    // Load India states GeoJSON for choropleth
    // Source: https://github.com/datameet/maps — uses ST_NM property for state names
    fetch("https://raw.githubusercontent.com/datameet/maps/master/States/india-composite.geojson")
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((gj) => {
        const layer = L.geoJSON(gj as GeoJSON.FeatureCollection, {
          style: () => ({
            fillColor: "#e2e8f0",
            fillOpacity: 0.15,
            color: "#94a3b8",
            weight: 1,
            opacity: 0.6,
          }),
          onEachFeature: (feature, lyr) => {
            const name: string =
              (feature.properties as Record<string, string>)["ST_NM"] ??
              (feature.properties as Record<string, string>)["NAME_1"] ??
              "";
            lyr.bindTooltip(name, { sticky: true, opacity: 0.85 });
          },
        });
        layer.addTo(map);
        layer.bringToBack();
        choroplethRef.current = layer;
        setChoroplethLoaded(true);
      })
      .catch(() => {
        // CDN unavailable — choropleth silently disabled
      });

    setMapLoaded(true);

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ---------------------------------------------------------------------------
  // Update markers + heatmap when filteredDCs changes
  // ---------------------------------------------------------------------------

  useEffect(() => {
    const cluster = clusterRef.current;
    const heat = heatRef.current;
    if (!mapLoaded || !cluster) return;

    // --- Rebuild state counts for choropleth colouring ---
    const sc: Record<string, number> = {};
    for (const dc of filteredDCs) sc[dc.state] = (sc[dc.state] ?? 0) + 1;
    setStateCounts(sc);

    // --- Update cluster markers ---
    cluster.clearLayers();

    const cityGroup = new Map<string, number>();
    for (const dc of filteredDCs) cityGroup.set(dc.city, (cityGroup.get(dc.city) ?? 0) + 1);

    const heatData: [number, number, number][] = [];

    for (const dc of filteredDCs) {
      if (dc.lat == null || dc.lng == null) continue;

      // Reuse cached marker if it already exists for this facility
      let marker = markerCacheRef.current.get(dc.id);
      if (!marker) {
        const radius = getMarkerRadius(dc.powerMW);
        marker = L.circleMarker([dc.lat, dc.lng], {
          radius,
          fillColor: "#0f766e",
          color: "#ffffff",
          weight: 2,
          opacity: 1,
          fillOpacity: 0.85,
        });
        marker.bindTooltip(
          `<strong style="font-size:13px">${dc.name}</strong><br/>
           <span style="color:#64748b">${dc.company}</span><br/>
           ${dc.city}, ${dc.state}${dc.powerMW ? ` · ${dc.powerMW} MW` : ""}`,
          { direction: "top", offset: [0, -4], opacity: 0.95 },
        );
        marker.on("click", () => setSelectedDC(dc));
        markerCacheRef.current.set(dc.id, marker);
      }
      cluster.addLayer(marker);

      // Heatmap weight = city density (capped at 10)
      const weight = Math.min((cityGroup.get(dc.city) ?? 1) / 3, 10);
      heatData.push([dc.lat, dc.lng, weight]);
    }

    if (heat) heat.setLatLngs(heatData);
  }, [filteredDCs, mapLoaded]);

  // ---------------------------------------------------------------------------
  // Choropleth re-style when state counts or loaded status changes
  // ---------------------------------------------------------------------------

  useEffect(() => {
    const layer = choroplethRef.current;
    if (!layer || !choroplethLoaded) return;
    layer.setStyle((feature) => {
      if (!feature) return {};
      const props = feature.properties as Record<string, string>;
      const name = props["ST_NM"] ?? props["NAME_1"] ?? "";
      const count = stateCounts[name] ?? 0;
      return {
        fillColor: getStateColor(count),
        fillOpacity: count > 0 ? 0.45 : 0.1,
        color: "#94a3b8",
        weight: 1,
        opacity: 0.6,
      };
    });
    layer.bringToBack();
  }, [stateCounts, choroplethLoaded]);

  // ---------------------------------------------------------------------------
  // Layer visibility toggles
  // ---------------------------------------------------------------------------

  useEffect(() => {
    const map = mapRef.current;
    const heat = heatRef.current;
    if (!map || !heat) return;
    if (showHeatmap) map.addLayer(heat);
    else map.removeLayer(heat);
  }, [showHeatmap]);

  useEffect(() => {
    const map = mapRef.current;
    const layer = choroplethRef.current;
    if (!map || !layer) return;
    if (showChoropleth) { map.addLayer(layer); layer.bringToBack(); }
    else map.removeLayer(layer);
  }, [showChoropleth]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (showRenewable) {
      if (!renewableRef.current) {
        // Dummy solar potential zones over high-irradiance regions of India
        const zones: [[number, number], [number, number]][] = [
          [[22, 68], [28, 76]],  // Rajasthan / Gujarat
          [[16, 75], [22, 82]],  // Maharashtra / Telangana
          [[8,  76], [14, 80]],  // Tamil Nadu / Kerala
          [[20, 82], [26, 88]],  // Odisha / West Bengal
        ];
        renewableRef.current = L.layerGroup(
          zones.map(([sw, ne]) =>
            L.rectangle([sw, ne], {
              color: "#f59e0b",
              weight: 1.5,
              fillColor: "#fbbf24",
              fillOpacity: 0.13,
              dashArray: "6 4",
            }),
          ),
        );
      }
      renewableRef.current.addTo(map);
    } else {
      if (renewableRef.current) map.removeLayer(renewableRef.current);
    }
  }, [showRenewable]);

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  const flyToDC = useCallback((dc: DataCenter) => {
    if (dc.lat != null && dc.lng != null && mapRef.current) {
      mapRef.current.flyTo([dc.lat, dc.lng], 14, { duration: 1.2, easeLinearity: 0.3 });
    }
  }, []);

  const handleAccessReport = useCallback(
    (dc: DataCenter) => {
      sessionStorage.setItem(
        "pending_dc_assessment",
        JSON.stringify({
          lat: dc.lat,
          lng: dc.lng,
          props: {
            name: dc.name,
            company: dc.company,
            state: dc.state,
            city: dc.city,
            power_mw: dc.powerMW,
            status: dc.status,
          },
        }),
      );
      navigate("/geo-analytics/assessment");
    },
    [navigate],
  );

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  const totalMapped = dataCenters.filter((d) => d.lat != null && d.lng != null).length;

  return (
    <div className="dc-map-container">
      {/* ── Map area ─────────────────────────────────────────────────────── */}
      <div className="dc-map-wrapper" style={{ position: "relative" }}>
        <div
          ref={mapContainer}
          style={{ width: "100%", height: 620, borderRadius: "0.5rem", overflow: "hidden" }}
        />

        {/* Geocoding status badge */}
        <div style={{ position: "absolute", bottom: 12, left: 12, zIndex: 1000 }}>
          <div
            style={{
              background: "rgba(15,23,42,0.82)",
              backdropFilter: "blur(4px)",
              color: geocodingState === "running" ? "#fbbf24" : "#94a3b8",
              fontSize: 11,
              padding: "4px 10px",
              borderRadius: 4,
              border: "1px solid rgba(255,255,255,0.1)",
              fontWeight: 600,
            }}
          >
            {geocodingState === "running"
              ? "⟳ Geocoding…"
              : `${totalMapped.toLocaleString()} / ${dataCenters.length.toLocaleString()} facilities mapped`}
          </div>
        </div>

        {/* Map layer toggles (top-left overlay) */}
        <div
          style={{
            position: "absolute",
            top: 12,
            left: 12,
            zIndex: 1000,
            display: "flex",
            flexDirection: "column",
            gap: 5,
          }}
        >
          {(
            [
              { label: "Heatmap", value: showHeatmap, set: setShowHeatmap },
              { label: "States",  value: showChoropleth, set: setShowChoropleth },
            ] as { label: string; value: boolean; set: (v: boolean) => void }[]
          ).map(({ label, value, set }) => (
            <button
              key={label}
              onClick={() => set(!value)}
              style={{
                background: value ? "rgba(15,118,110,0.85)" : "rgba(15,23,42,0.75)",
                backdropFilter: "blur(4px)",
                color: value ? "#fff" : "#94a3b8",
                border: `1px solid ${value ? "#0f766e" : "rgba(255,255,255,0.15)"}`,
                fontSize: 11,
                padding: "4px 10px",
                cursor: "pointer",
                borderRadius: 4,
                fontWeight: 700,
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* ── Side profile panel ──────────────────────────────────────────── */}
        {selectedDC && (
          <div
            style={{
              position: "absolute",
              top: 0,
              right: 0,
              bottom: 0,
              zIndex: 2000,
              width: 300,
              background: "#0f172a",
              color: "#e2e8f0",
              boxShadow: "-4px 0 24px rgba(0,0,0,0.45)",
              display: "flex",
              flexDirection: "column",
              borderTopRightRadius: "0.5rem",
              borderBottomRightRadius: "0.5rem",
            }}
          >
            {/* Header */}
            <div
              style={{
                padding: "14px 16px",
                borderBottom: "1px solid rgba(255,255,255,0.08)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                flexShrink: 0,
              }}
            >
              <div style={{ flex: 1, paddingRight: 8 }}>
                <div
                  style={{
                    fontSize: 9,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.12em",
                    color: "#0f766e",
                    marginBottom: 4,
                  }}
                >
                  Data Center Profile
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#f1f5f9", lineHeight: 1.3 }}>
                  {selectedDC.name}
                </div>
                <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>{selectedDC.company}</div>
              </div>
              <button
                onClick={() => setSelectedDC(null)}
                style={{ background: "none", border: "none", color: "#475569", cursor: "pointer", padding: 4 }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Satellite thumbnail */}
            {selectedDC.lat != null && selectedDC.lng != null && (
              <div style={{ height: 120, flexShrink: 0, overflow: "hidden" }}>
                <img
                  src={`https://services.arcgisonline.com/arcgis/rest/services/World_Imagery/MapServer/export?bbox=${selectedDC.lng - 0.01},${selectedDC.lat - 0.006},${selectedDC.lng + 0.01},${selectedDC.lat + 0.006}&bboxSR=4326&imageSR=4326&size=600,240&format=jpg&f=image`}
                  alt="Satellite view"
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
              </div>
            )}

            {/* Details body */}
            <div style={{ flex: 1, overflowY: "auto", padding: "14px 16px" }}>
              {/* Stats grid */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 14 }}>
                {(
                  [
                    { label: "Power",   value: selectedDC.powerMW  ? `${selectedDC.powerMW} MW` : "—",    icon: <Zap      size={11} /> },
                    { label: "Size",    value: selectedDC.sizeSqFt ? `${(selectedDC.sizeSqFt / 1000).toFixed(0)}K sqft` : "—", icon: <Building2 size={11} /> },
                    { label: "Status",  value: selectedDC.status,                                          icon: <Activity size={11} /> },
                    { label: "Tier",    value: selectedDC.tierLevel ?? "—",                                icon: <Server   size={11} /> },
                  ] as { label: string; value: string; icon: React.ReactNode }[]
                ).map(({ label, value, icon }) => (
                  <div
                    key={label}
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      borderRadius: 6,
                      padding: "8px 10px",
                      border: "1px solid rgba(255,255,255,0.06)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                        color: "#64748b",
                        fontSize: 9,
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "0.07em",
                        marginBottom: 4,
                      }}
                    >
                      {icon} {label}
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#e2e8f0" }}>{value}</div>
                  </div>
                ))}
              </div>

              {/* Location */}
              <div style={{ marginBottom: 14 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                    color: "#64748b",
                    fontSize: 11,
                    marginBottom: 4,
                  }}
                >
                  <MapPin size={12} /> Location
                </div>
                <div style={{ fontSize: 13, color: "#cbd5e1" }}>
                  {selectedDC.city}, {selectedDC.state}
                </div>
                {selectedDC.locationDetail && (
                  <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
                    {selectedDC.locationDetail}
                  </div>
                )}
                {selectedDC.lat != null && (
                  <div style={{ fontSize: 10, fontFamily: "monospace", color: "#475569", marginTop: 4 }}>
                    {selectedDC.lat.toFixed(5)}°N · {selectedDC.lng!.toFixed(5)}°E
                  </div>
                )}
                {selectedDC.geocodeStatus && (
                  <div
                    style={{
                      display: "inline-block",
                      marginTop: 4,
                      fontSize: 9,
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      padding: "2px 6px",
                      borderRadius: 3,
                      background:
                        selectedDC.geocodeStatus === "ROOFTOP"
                          ? "rgba(15,118,110,0.2)"
                          : "rgba(245,158,11,0.15)",
                      color:
                        selectedDC.geocodeStatus === "ROOFTOP" ? "#2dd4bf" : "#fbbf24",
                      border: `1px solid ${selectedDC.geocodeStatus === "ROOFTOP" ? "rgba(45,212,191,0.3)" : "rgba(251,191,36,0.3)"}`,
                    }}
                  >
                    {selectedDC.geocodeStatus}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <button
                  onClick={() => flyToDC(selectedDC)}
                  style={{
                    background: "rgba(15,118,110,0.12)",
                    color: "#2dd4bf",
                    border: "1px solid rgba(15,118,110,0.25)",
                    padding: "8px 12px",
                    cursor: "pointer",
                    fontSize: 12,
                    fontWeight: 600,
                    borderRadius: 6,
                  }}
                >
                  Zoom to Location
                </button>
                <button
                  onClick={() => handleAccessReport(selectedDC)}
                  style={{
                    background: "linear-gradient(135deg, #0f766e, #0d9488)",
                    color: "#fff",
                    border: "none",
                    padding: "9px 12px",
                    cursor: "pointer",
                    fontSize: 12,
                    fontWeight: 700,
                    borderRadius: 6,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                  }}
                >
                  <Server size={13} /> Intelligence Report
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Dark sidebar ──────────────────────────────────────────────────── */}
      <div className="dc-map-sidebar" style={SIDEBAR_STYLE}>
        {/* Search */}
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#64748b", marginBottom: 6 }}>
            Search
          </div>
          <input
            value={searchRaw}
            onChange={(e) => setSearchRaw(e.target.value)}
            placeholder="Name or company…"
            style={{
              width: "100%",
              boxSizing: "border-box",
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.1)",
              color: "#e2e8f0",
              padding: "7px 10px",
              fontSize: 13,
              borderRadius: 6,
              outline: "none",
            }}
          />
        </div>

        {/* City dropdown */}
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#64748b", marginBottom: 6 }}>
            City
          </div>
          <select
            value={cityFilter}
            onChange={(e) => setCityFilter(e.target.value)}
            style={{
              width: "100%",
              boxSizing: "border-box",
              background: "#1e293b",
              border: "1px solid rgba(255,255,255,0.1)",
              color: "#e2e8f0",
              padding: "7px 10px",
              fontSize: 13,
              borderRadius: 6,
            }}
          >
            <option value="">All Cities</option>
            {cities.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        {/* Power slider */}
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#64748b", marginBottom: 4 }}>
            Min Power: {minPower > 0 ? `${minPower} MW` : "All"}
          </div>
          <input
            type="range"
            min={0}
            max={Math.max(1, Math.ceil(maxPower))}
            step={10}
            value={minPower}
            onChange={(e) => setMinPower(Number(e.target.value))}
            style={{ width: "100%", accentColor: "#0f766e" }}
          />
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#475569" }}>
            <span>0</span>
            <span>{Math.ceil(maxPower)} MW</span>
          </div>
        </div>

        {/* Renewable overlay toggle */}
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#64748b", marginBottom: 6 }}>
            Overlays
          </div>
          <button
            onClick={() => setShowRenewable(!showRenewable)}
            style={{
              width: "100%",
              padding: "7px 12px",
              fontSize: 12,
              fontWeight: 600,
              background: showRenewable ? "rgba(245,158,11,0.15)" : "rgba(255,255,255,0.04)",
              color: showRenewable ? "#fbbf24" : "#64748b",
              border: `1px solid ${showRenewable ? "rgba(245,158,11,0.3)" : "rgba(255,255,255,0.08)"}`,
              cursor: "pointer",
              borderRadius: 6,
              textAlign: "left",
            }}
          >
            ☀ Solar Potential Zones
          </button>
        </div>

        {/* Analytics panel */}
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 14 }}>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#64748b", marginBottom: 10 }}>
            Analytics
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {(
              [
                { label: "Visible DCs", value: analytics.count.toLocaleString() },
                { label: "Total MW",    value: Math.round(analytics.totalMW).toLocaleString() },
                { label: "Avg MW/DC",  value: analytics.avgMW.toFixed(1) },
                { label: "Cities",     value: topCities.length },
              ] as { label: string; value: string | number }[]
            ).map(({ label, value }) => (
              <div
                key={label}
                style={{
                  background: "rgba(255,255,255,0.04)",
                  borderRadius: 6,
                  padding: "8px 10px",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <div style={{ fontSize: 18, fontWeight: 700, color: "#0f766e", lineHeight: 1 }}>{value}</div>
                <div style={{ fontSize: 10, color: "#64748b", marginTop: 3 }}>{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Cities ranked panel */}
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#64748b", marginBottom: 8 }}>
            Top Cities
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            {topCities.length === 0 && (
              <div style={{ fontSize: 12, color: "#475569", textAlign: "center", padding: "8px 0" }}>
                No data
              </div>
            )}
            {topCities.map(([city, info], i) => (
              <div
                key={city}
                onClick={() => setCityFilter(cityFilter === city ? "" : city)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "6px 8px",
                  borderRadius: 5,
                  cursor: "pointer",
                  background:
                    cityFilter === city
                      ? "rgba(15,118,110,0.15)"
                      : "rgba(255,255,255,0.03)",
                  border: `1px solid ${cityFilter === city ? "rgba(15,118,110,0.3)" : "rgba(255,255,255,0.05)"}`,
                  transition: "background 0.15s",
                }}
              >
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: i < 3 ? "#0f766e" : "#475569",
                    width: 16,
                    textAlign: "right",
                    flexShrink: 0,
                  }}
                >
                  {i + 1}
                </span>
                <span
                  style={{
                    flex: 1,
                    fontSize: 12,
                    color: "#cbd5e1",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {city}
                </span>
                <span style={{ fontSize: 11, color: "#475569", flexShrink: 0 }}>
                  {info.count}
                </span>
                {cityFilter === city && (
                  <ChevronUp size={10} style={{ color: "#0f766e", flexShrink: 0 }} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Map legend */}
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 14 }}>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#64748b", marginBottom: 8 }}>
            Circle = Power
          </div>
          {(
            [
              { label: "< 50 MW",    r: 6 },
              { label: "50–200 MW",  r: 12 },
              { label: "200+ MW",    r: 20 },
            ] as { label: string; r: number }[]
          ).map(({ label, r }) => (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <div
                style={{
                  width: r * 2,
                  height: r * 2,
                  borderRadius: "50%",
                  background: "#0f766e",
                  border: "2px solid rgba(255,255,255,0.25)",
                  flexShrink: 0,
                }}
              />
              <span style={{ fontSize: 11, color: "#64748b" }}>{label}</span>
            </div>
          ))}
          <div style={{ marginTop: 8, fontSize: 10, color: "#475569" }}>
            <span style={{ display: "inline-block", width: 10, height: 10, background: "#bbf7d0", borderRadius: 2, marginRight: 4 }} />1+ DC ·
            <span style={{ display: "inline-block", width: 10, height: 10, background: "#fcd34d", borderRadius: 2, margin: "0 4px" }} />10+ ·
            <span style={{ display: "inline-block", width: 10, height: 10, background: "#fca5a5", borderRadius: 2, margin: "0 4px" }} />20+
          </div>
        </div>
      </div>
    </div>
  );
}

export default DataCenterMap;
