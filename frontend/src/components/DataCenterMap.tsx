import { useEffect, useRef, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { FeatureCollection, Feature, Point } from "geojson";
import { Search, Wind, Sun, Server, Layers, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { STATE_COORDINATES } from "../utils/stateCoordinates";

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
  lng: number;
  lat: number;
  props: Record<string, unknown>;
}

interface PopupState {
  dc: DcGeoEntry;
}

type LayerGroup = "wind" | "solar" | "dc" | "registry";

const LAYER_TOGGLE_GROUPS: {
  key: LayerGroup;
  label: string;
  color: string;
}[] = [
  { key: "wind", label: "Wind Sites", color: "#00FFFF" },
  { key: "solar", label: "Solar Sites", color: "#FFD700" },
  { key: "dc", label: "Data Centers", color: "#14b8a6" },
  { key: "registry", label: "Registry", color: "#3b82f6" },
];

const LAYER_IDS: { id: string; group: LayerGroup }[] = [
  { id: "wind-heat", group: "wind" },
  { id: "turbines-glow", group: "wind" },
  { id: "turbines-core", group: "wind" },
  { id: "solar-heat", group: "solar" },
  { id: "solar-glow", group: "solar" },
  { id: "solar-core", group: "solar" },
  { id: "dc-glow", group: "dc" },
  { id: "dc-core", group: "dc" },
  { id: "dc-label", group: "dc" },
  { id: "registry-glow", group: "registry" },
  { id: "registry-core", group: "registry" },
];

function DataCenterMap({ dataCenters }: { dataCenters: DataCenter[] }) {
  const navigate = useNavigate();
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [layerVis, setLayerVis] = useState<Record<LayerGroup, boolean>>({
    wind: true,
    solar: true,
    dc: true,
    registry: true,
  });
  const [popup, setPopup] = useState<PopupState | null>(null);
  const [dcGeoList, setDcGeoList] = useState<DcGeoEntry[]>([]);
  const [search, setSearch] = useState("");
  const [showLayerPanel, setShowLayerPanel] = useState(false);

  // Build state-level GeoJSON from dataCenters prop (API data, no precise coords)
  const stateGeoJSON = useMemo((): FeatureCollection => {
    const stateMap = new Map<string, { count: number; power: number }>();
    dataCenters.forEach((dc) => {
      if (!STATE_COORDINATES[dc.state]) return;
      const entry = stateMap.get(dc.state) ?? { count: 0, power: 0 };
      entry.count += 1;
      entry.power += dc.powerMW;
      stateMap.set(dc.state, entry);
    });
    return {
      type: "FeatureCollection",
      features: Array.from(stateMap.entries()).map(([state, info]) => {
        const coords = STATE_COORDINATES[state]!;
        return {
          type: "Feature",
          geometry: {
            type: "Point",
            // STATE_COORDINATES is [lat, lng]; GeoJSON needs [lng, lat]
            coordinates: [coords[1], coords[0]],
          } as Point,
          properties: { state, count: info.count, power: info.power },
        };
      }),
    } as FeatureCollection;
  }, [dataCenters]);

  // Load individual DC entries from datacenters.geojson for search
  useEffect(() => {
    fetch("/datacenters.geojson")
      .then((res) => res.json())
      .then((data: FeatureCollection) => {
        const list: DcGeoEntry[] = data.features
          .filter(
            (f): f is Feature<Point> =>
              f.geometry.type === "Point",
          )
          .map((f) => ({
            ...(f.properties as Record<string, unknown>),
            name: String(f.properties?.["name"] ?? ""),
            company: String(f.properties?.["company"] ?? ""),
            address: f.properties?.["address"] as string | undefined,
            tier: f.properties?.["tier"] as string | undefined,
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
          "renewable-energy": {
            type: "geojson",
            data: "/api/v1/solar-assessment/data/wind-solar-data",
          },
          "datacenters-geojson": {
            type: "geojson",
            data: "/datacenters.geojson",
          },
          "registry-circles": {
            type: "geojson",
            data: { type: "FeatureCollection", features: [] } as FeatureCollection,
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
          // ── Wind heatmap ──────────────────────────────────────────────────
          {
            id: "wind-heat",
            type: "heatmap",
            source: "renewable-energy",
            filter: ["==", "type", "wind"],
            maxzoom: 13.5,
            paint: {
              "heatmap-weight": ["interpolate", ["linear"], ["zoom"], 0, 0.1, 9, 0.6],
              "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 0, 0.1, 9, 1.5],
              "heatmap-color": [
                "interpolate",
                ["linear"],
                ["heatmap-density"],
                0, "rgba(0,255,255,0)",
                0.2, "rgba(0,255,255,0.2)",
                0.5, "rgba(0,255,255,0.6)",
                1, "rgba(0,255,255,1)",
              ],
              "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 0, 2, 9, 15],
              "heatmap-opacity": ["interpolate", ["linear"], ["zoom"], 10, 1, 13.5, 0],
            },
          },
          {
            id: "turbines-glow",
            type: "circle",
            source: "renewable-energy",
            filter: ["==", "type", "wind"],
            minzoom: 11,
            paint: {
              "circle-radius": ["interpolate", ["linear"], ["zoom"], 11, 2, 16, 12],
              "circle-color": "#00FFFF",
              "circle-opacity": ["interpolate", ["linear"], ["zoom"], 11, 0, 12, 0.6],
              "circle-blur": 0.6,
            },
          },
          {
            id: "turbines-core",
            type: "circle",
            source: "renewable-energy",
            filter: ["==", "type", "wind"],
            minzoom: 11,
            paint: {
              "circle-radius": ["interpolate", ["linear"], ["zoom"], 11, 1, 16, 4],
              "circle-color": "#FFFFFF",
              "circle-opacity": 1,
            },
          },
          // ── Solar heatmap ─────────────────────────────────────────────────
          {
            id: "solar-heat",
            type: "heatmap",
            source: "renewable-energy",
            filter: ["==", "type", "solar"],
            maxzoom: 13.5,
            paint: {
              "heatmap-weight": ["interpolate", ["linear"], ["zoom"], 0, 0.1, 9, 0.6],
              "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 0, 0.1, 9, 1.5],
              "heatmap-color": [
                "interpolate",
                ["linear"],
                ["heatmap-density"],
                0, "rgba(255,255,0,0)",
                0.2, "rgba(255,255,0,0.2)",
                0.5, "rgba(255,200,0,0.6)",
                1, "rgba(255,255,0,1)",
              ],
              "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 0, 2, 9, 15],
              "heatmap-opacity": ["interpolate", ["linear"], ["zoom"], 10, 1, 13.5, 0],
            },
          },
          {
            id: "solar-glow",
            type: "circle",
            source: "renewable-energy",
            filter: ["==", "type", "solar"],
            minzoom: 11,
            paint: {
              "circle-radius": ["interpolate", ["linear"], ["zoom"], 11, 2, 16, 12],
              "circle-color": "#FFFF00",
              "circle-opacity": ["interpolate", ["linear"], ["zoom"], 11, 0, 12, 0.6],
              "circle-blur": 0.6,
            },
          },
          {
            id: "solar-core",
            type: "circle",
            source: "renewable-energy",
            filter: ["==", "type", "solar"],
            minzoom: 11,
            paint: {
              "circle-radius": ["interpolate", ["linear"], ["zoom"], 11, 1, 16, 4],
              "circle-color": "#FFFFFF",
              "circle-opacity": 1,
            },
          },
          // ── Data center markers (precise coords from GeoJSON) ─────────────
          {
            id: "dc-glow",
            type: "circle",
            source: "datacenters-geojson",
            filter: ["all", ["has", "address"], ["!=", ["get", "address"], ""]],
            paint: {
              "circle-radius": ["interpolate", ["linear"], ["zoom"], 4, 10, 10, 22, 14, 32],
              "circle-color": "#0f766e",
              "circle-opacity": 0.25,
              "circle-blur": 0.5,
            },
          },
          {
            id: "dc-core",
            type: "circle",
            source: "datacenters-geojson",
            filter: ["all", ["has", "address"], ["!=", ["get", "address"], ""]],
            paint: {
              "circle-radius": ["interpolate", ["linear"], ["zoom"], 4, 6, 10, 12, 14, 16],
              "circle-color": "#0f766e",
              "circle-stroke-color": "#ffffff",
              "circle-stroke-width": 2.5,
              "circle-opacity": 1,
            },
          },
          {
            id: "dc-label",
            type: "symbol",
            source: "datacenters-geojson",
            minzoom: 10,
            filter: ["all", ["has", "address"], ["!=", ["get", "address"], ""]],
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
          // ── Registry state circles (API data, state-level aggregation) ────
          {
            id: "registry-glow",
            type: "circle",
            source: "registry-circles",
            paint: {
              "circle-radius": [
                "interpolate",
                ["linear"],
                ["zoom"],
                4, ["*", ["sqrt", ["get", "count"]], 10],
                8, ["*", ["sqrt", ["get", "count"]], 22],
              ],
              "circle-color": "#3b82f6",
              "circle-opacity": 0.18,
              "circle-blur": 0.8,
            },
          },
          {
            id: "registry-core",
            type: "circle",
            source: "registry-circles",
            paint: {
              "circle-radius": [
                "interpolate",
                ["linear"],
                ["zoom"],
                4, ["*", ["sqrt", ["get", "count"]], 6],
                8, ["*", ["sqrt", ["get", "count"]], 14],
              ],
              "circle-color": "#2563eb",
              "circle-opacity": 0.65,
              "circle-stroke-width": 2,
              "circle-stroke-color": "#93c5fd",
            },
          },
        ],
      },
      center: [78.96, 20.59],
      zoom: 4.8,
      attributionControl: false,
    });

    map.current.addControl(new maplibregl.NavigationControl(), "bottom-right");

    map.current.on("load", () => {
      setLoaded(true);
    });

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

    // Close popup on empty map click
    map.current.on("click", (e) => {
      const hits = map.current?.queryRenderedFeatures(e.point, { layers: ["dc-core"] });
      if (!hits?.length) setPopup(null);
    });

    return () => {
      // intentionally empty — map lives for the component lifetime
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Update registry circles when dataCenters changes
  useEffect(() => {
    if (!loaded || !map.current) return;
    const src = map.current.getSource("registry-circles") as maplibregl.GeoJSONSource | undefined;
    src?.setData(stateGeoJSON);
  }, [stateGeoJSON, loaded]);

  // Apply layer visibility toggles
  useEffect(() => {
    if (!loaded || !map.current) return;
    for (const { id, group } of LAYER_IDS) {
      if (map.current.getLayer(id)) {
        map.current.setLayoutProperty(
          id,
          "visibility",
          layerVis[group] ? "visible" : "none",
        );
      }
    }
  }, [layerVis, loaded]);

  const toggleGroup = (key: LayerGroup) =>
    setLayerVis((prev) => ({ ...prev, [key]: !prev[key] }));

  const filteredDcs = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (q.length < 2) return [];
    return dcGeoList
      .filter(
        (d) =>
          d.name.toLowerCase().includes(q) ||
          d.company.toLowerCase().includes(q),
      )
      .slice(0, 6);
  }, [search, dcGeoList]);

  const flyToDc = (dc: DcGeoEntry) => {
    map.current?.flyTo({ center: [dc.lng, dc.lat], zoom: 14, duration: 1200, essential: true });
    setPopup({ dc });
    setSearch("");
  };

  const handleAccessReport = (dc: DcGeoEntry) => {
    // Store selected DC so SolarWindAssessmentPage can auto-trigger analysis
    sessionStorage.setItem(
      "pending_dc_assessment",
      JSON.stringify({ props: dc.props, lat: dc.lat, lng: dc.lng }),
    );
    navigate("/geo-analytics/assessment");
  };

  // State breakdown from API data
  const stateBreakdown = useMemo(() => {
    const m = new Map<string, { count: number; power: number }>();
    dataCenters.forEach((dc) => {
      const s = m.get(dc.state) ?? { count: 0, power: 0 };
      s.count += 1;
      s.power += dc.powerMW;
      m.set(dc.state, s);
    });
    return Array.from(m.entries()).sort((a, b) => b[1].power - a[1].power);
  }, [dataCenters]);

  return (
    <div className="dc-map-container">
      {/* ── Map area ─────────────────────────────────────────────────────── */}
      <div className="dc-map-wrapper" style={{ position: "relative" }}>
        <div
          ref={mapContainer}
          style={{ width: "100%", height: "600px" }}
        />

        {/* Search bar */}
        <div
          style={{
            position: "absolute",
            top: 12,
            left: 12,
            zIndex: 10,
            width: 280,
          }}
        >
          <div style={{ position: "relative" }}>
            <Search
              size={14}
              style={{
                position: "absolute",
                left: 10,
                top: "50%",
                transform: "translateY(-50%)",
                color: "#64748b",
                pointerEvents: "none",
              }}
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search data centers…"
              style={{
                width: "100%",
                paddingLeft: 32,
                paddingRight: 8,
                paddingTop: 8,
                paddingBottom: 8,
                borderRadius: 8,
                border: "1px solid #cbd5e1",
                background: "white",
                fontSize: 13,
                boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>
          <AnimatePresence>
            {filteredDcs.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                style={{
                  background: "white",
                  borderRadius: 8,
                  boxShadow: "0 4px 16px rgba(0,0,0,0.15)",
                  border: "1px solid #e2e8f0",
                  marginTop: 4,
                  overflow: "hidden",
                }}
              >
                {filteredDcs.map((dc) => (
                  <button
                    key={`${dc.id ?? dc.name}-${dc.lng}`}
                    onClick={() => flyToDc(dc)}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      padding: "8px 12px",
                      border: "none",
                      background: "none",
                      cursor: "pointer",
                      borderBottom: "1px solid #f1f5f9",
                      display: "flex",
                      flexDirection: "column",
                      gap: 2,
                    }}
                  >
                    <span style={{ fontSize: 13, fontWeight: 600, color: "#1e293b" }}>
                      {dc.name}
                    </span>
                    <span style={{ fontSize: 11, color: "#64748b" }}>
                      {dc.company}
                      {dc.address ? ` · ${dc.address}` : ""}
                    </span>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Layer toggle panel */}
        <div style={{ position: "absolute", top: 12, right: 48, zIndex: 10 }}>
          <button
            onClick={() => setShowLayerPanel((p) => !p)}
            style={{
              background: "white",
              border: "1px solid #cbd5e1",
              borderRadius: 8,
              padding: "7px 10px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
              boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
              fontSize: 12,
              fontWeight: 600,
              color: "#475569",
            }}
          >
            <Layers size={14} />
            Layers
          </button>
          <AnimatePresence>
            {showLayerPanel && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                style={{
                  position: "absolute",
                  top: "calc(100% + 6px)",
                  right: 0,
                  background: "white",
                  borderRadius: 10,
                  boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
                  border: "1px solid #e2e8f0",
                  padding: 10,
                  minWidth: 170,
                }}
              >
                {LAYER_TOGGLE_GROUPS.map(({ key, label, color }) => (
                  <button
                    key={key}
                    onClick={() => toggleGroup(key)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      width: "100%",
                      padding: "6px 8px",
                      borderRadius: 6,
                      border: "none",
                      background: layerVis[key] ? "#f0fdf4" : "#f8fafc",
                      cursor: "pointer",
                      marginBottom: 2,
                      color: layerVis[key] ? "#0f766e" : "#94a3b8",
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  >
                    <span
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: "50%",
                        background: layerVis[key] ? color : "#cbd5e1",
                        flexShrink: 0,
                      }}
                    />
                    {label}
                    <span
                      style={{
                        marginLeft: "auto",
                        fontSize: 10,
                        color: layerVis[key] ? "#14b8a6" : "#94a3b8",
                      }}
                    >
                      {layerVis[key] ? "ON" : "OFF"}
                    </span>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* DC popup */}
        <AnimatePresence>
          {popup && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -65%)",
                zIndex: 20,
                background: "white",
                borderRadius: 12,
                boxShadow: "0 8px 32px rgba(0,0,0,0.22)",
                border: "1px solid #e2e8f0",
                padding: "16px 18px",
                minWidth: 250,
                maxWidth: 310,
              }}
            >
              <button
                onClick={() => setPopup(null)}
                style={{
                  position: "absolute",
                  top: 8,
                  right: 8,
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "#94a3b8",
                  padding: 2,
                }}
              >
                <X size={14} />
              </button>

              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  color: "#0f766e",
                  marginBottom: 6,
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                }}
              >
                <Server size={11} />
                Data Center
              </div>

              <div
                style={{
                  fontSize: 15,
                  fontWeight: 700,
                  color: "#1e293b",
                  marginBottom: 2,
                  paddingRight: 20,
                }}
              >
                {popup.dc.name}
              </div>
              <div style={{ fontSize: 12, color: "#64748b", marginBottom: 4 }}>
                {popup.dc.company}
              </div>
              {popup.dc.address && (
                <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 4 }}>
                  {popup.dc.address}
                </div>
              )}
              {popup.dc.tier && (
                <div
                  style={{
                    display: "inline-block",
                    fontSize: 10,
                    fontWeight: 700,
                    color: "#0f766e",
                    background: "#f0fdf4",
                    border: "1px solid #bbf7d0",
                    borderRadius: 4,
                    padding: "2px 7px",
                    marginBottom: 4,
                  }}
                >
                  Tier {popup.dc.tier}
                </div>
              )}
              <div
                style={{
                  fontSize: 10,
                  color: "#94a3b8",
                  marginBottom: 14,
                  fontFamily: "monospace",
                }}
              >
                {popup.dc.lat.toFixed(5)}°N · {popup.dc.lng.toFixed(5)}°E
              </div>

              <button
                onClick={() => handleAccessReport(popup.dc)}
                style={{
                  width: "100%",
                  background: "linear-gradient(135deg, #0f766e, #0d9488)",
                  color: "white",
                  border: "none",
                  borderRadius: 8,
                  padding: "9px 12px",
                  cursor: "pointer",
                  fontSize: 12,
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                }}
              >
                <Server size={13} />
                Access Intelligence Report
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Wind/Solar legend bar */}
        <div
          style={{
            position: "absolute",
            bottom: 24,
            left: 12,
            zIndex: 10,
            display: "flex",
            gap: 10,
          }}
        >
          {[
            { label: "Wind", color: "#00FFFF" },
            { label: "Solar", color: "#FFD700" },
            { label: "Data Center", color: "#0f766e" },
            { label: "Registry", color: "#2563eb" },
          ].map(({ label, color }) => (
            <div
              key={label}
              style={{
                background: "rgba(0,0,0,0.55)",
                borderRadius: 6,
                padding: "4px 8px",
                display: "flex",
                alignItems: "center",
                gap: 5,
                fontSize: 11,
                color: "white",
                backdropFilter: "blur(4px)",
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: color,
                  flexShrink: 0,
                }}
              />
              {label}
            </div>
          ))}
        </div>
      </div>

      {/* ── Sidebar ───────────────────────────────────────────────────────── */}
      <div className="dc-map-sidebar">
        <h3 className="dc-map-sidebar-title">Map Overview</h3>
        <div className="dc-map-sidebar-hint">
          <p>
            Click a <strong style={{ color: "#0f766e" }}>teal marker</strong> on
            the map or search below to view a data center&apos;s RE Intelligence
            Report.
          </p>

          <div className="dc-map-legend" style={{ marginTop: 16 }}>
            <h4>Layer Legend</h4>
            {[
              { label: "Data Centers (Analysis)", color: "#0f766e", icon: <Server size={10} /> },
              { label: "Registry by State", color: "#2563eb", icon: <Server size={10} /> },
              { label: "Wind Sites", color: "#00FFFF", icon: <Wind size={10} /> },
              { label: "Solar Sites", color: "#FFD700", icon: <Sun size={10} /> },
            ].map(({ label, color, icon }) => (
              <div key={label} className="dc-map-legend-item">
                <span
                  className="dc-map-legend-dot"
                  style={{ backgroundColor: color }}
                />
                <span style={{ display: "flex", alignItems: "center", gap: 4, color: "#64748b" }}>
                  {icon} {label}
                </span>
              </div>
            ))}
          </div>

          <div className="dc-map-state-list" style={{ marginTop: 16 }}>
            <h4>By State ({stateBreakdown.length})</h4>
            {stateBreakdown.map(([state, info]) => (
              <div
                key={state}
                className="dc-map-state-btn"
                style={{ cursor: "default" }}
              >
                <span className="dc-map-state-name">{state}</span>
                <span className="dc-map-state-stats">
                  {info.count} DC · {info.power.toLocaleString()} MW
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default DataCenterMap;
