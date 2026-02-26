import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import {
  Search,
  MapPin,
  Server,
  Wind,
  Sun,
  X,
  Layers,
  ExternalLink,
  Navigation,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// ── Types ────────────────────────────────────────────────────────────────────
interface DcEntry {
  id?: string;
  name: string;
  company: string;
  address?: string;
  tier?: string;
  lng: number;
  lat: number;
  props: Record<string, unknown>;
}

interface DcPopupState {
  dc: Record<string, unknown>;
  lat: number;
  lng: number;
}

interface Props {
  onDatacenterClick: (
    lat: number,
    lng: number,
    dcProps: Record<string, unknown>,
  ) => void;
  onLocationAnalyze?: (lat: number, lng: number) => void;
}

// ── Constants ────────────────────────────────────────────────────────────────
const LAYER_GROUPS = ["wind", "solar", "dc"] as const;
type LayerGroup = (typeof LAYER_GROUPS)[number];

const TOGGLE_GROUPS: {
  key: LayerGroup;
  label: string;
  icon: React.ReactNode;
}[] = [
  {
    key: "wind",
    label: "Wind",
    icon: <Wind size={12} />,
  },
  {
    key: "solar",
    label: "Solar",
    icon: <Sun size={12} />,
  },
  {
    key: "dc",
    label: "Data Centers",
    icon: <Server size={12} />,
  },
];

const LAYER_DEFS: { id: string; group: LayerGroup }[] = [
  { id: "wind-heat", group: "wind" },
  { id: "turbines-glow", group: "wind" },
  { id: "turbines-core", group: "wind" },
  { id: "solar-heat", group: "solar" },
  { id: "solar-glow", group: "solar" },
  { id: "solar-core", group: "solar" },
  { id: "dc-glow", group: "dc" },
  { id: "dc-core", group: "dc" },
  { id: "dc-label", group: "dc" },
];


// ── Component ────────────────────────────────────────────────────────────────
export default function SolarWindMap({ onDatacenterClick, onLocationAnalyze }: Props) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const marker = useRef<maplibregl.Marker | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [searchCoords, setSearchCoords] = useState({ lat: "", lng: "" });
  const [layerVis, setLayerVis] = useState<Record<LayerGroup, boolean>>({
    wind: true,
    solar: true,
    dc: true,
  });
  const [dcPopup, setDcPopup] = useState<DcPopupState | null>(null);
  const [markerPos, setMarkerPos] = useState<{ lat: number; lng: number } | null>(null);
  const [dcList, setDcList] = useState<DcEntry[]>([]);
  const [dcSearch, setDcSearch] = useState("");

  const toggleGroup = (group: LayerGroup) => {
    setLayerVis((prev) => ({ ...prev, [group]: !prev[group] }));
  };

  // Load DC list for search autocomplete
  useEffect(() => {
    fetch("/datacenters.geojson")
      .then((res) => res.json())
      .then((data: GeoJSON.FeatureCollection) => {
        const list: DcEntry[] = data.features
          .filter(
            (f): f is GeoJSON.Feature<GeoJSON.Point> =>
              f.geometry.type === "Point",
          )
          .map((f) => ({
            ...(f.properties as Record<string, unknown>),
            name: String(f.properties?.["name"] ?? ""),
            company: String(f.properties?.["company"] ?? ""),
            address: f.properties?.["address"] as string | undefined,
            tier: f.properties?.["tier"] as string | undefined,
            id: f.properties?.["id"] as string | undefined,
            lng: (f.geometry as GeoJSON.Point).coordinates[0] ?? 0,
            lat: (f.geometry as GeoJSON.Point).coordinates[1] ?? 0,
            props: f.properties as Record<string, unknown>,
          }));
        setDcList(list);
      })
      .catch((err) => console.error("Failed to load DC list", err));
  }, []);

  // Initialize MapLibre GL map
  useEffect(() => {
    if (map.current || !mapContainer.current) return;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        // Free OpenMapTiles glyphs — required for symbol/label layers
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
          datacenters: {
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
          // Wind heatmap
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
          // Wind turbines glow
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
          // Wind turbines core
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
          // Solar heatmap
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
          // Solar glow
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
          // Solar core
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
          // Data centers glow — only features with complete addresses
          {
            id: "dc-glow",
            type: "circle",
            source: "datacenters",
            filter: ["all", ["has", "address"], ["!=", ["get", "address"], ""]],
            paint: {
              "circle-radius": ["interpolate", ["linear"], ["zoom"], 4, 10, 10, 22, 14, 32],
              "circle-color": "#0f766e",
              "circle-opacity": 0.25,
              "circle-blur": 0.5,
            },
          },
          // Data centers core — only features with complete addresses
          {
            id: "dc-core",
            type: "circle",
            source: "datacenters",
            filter: ["all", ["has", "address"], ["!=", ["get", "address"], ""]],
            paint: {
              "circle-radius": ["interpolate", ["linear"], ["zoom"], 4, 6, 10, 12, 14, 16],
              "circle-color": "#0f766e",
              "circle-stroke-color": "#ffffff",
              "circle-stroke-width": 2.5,
              "circle-opacity": 1,
            },
          },
          // Data centers label — name at zoom 10+, name + coordinates at zoom 13+
          {
            id: "dc-label",
            type: "symbol",
            source: "datacenters",
            minzoom: 10,
            filter: ["all", ["has", "address"], ["!=", ["get", "address"], ""]],
            layout: {
              "text-field": [
                "step",
                ["zoom"],
                ["get", "name"],
                13,
                [
                  "format",
                  ["get", "name"], { "font-scale": 1.0 },
                  "\n", {},
                  [
                    "concat",
                    ["number-format", ["to-number", ["get", "lat"]], { "max-fraction-digits": 4 }],
                    "°N  ",
                    ["number-format", ["to-number", ["get", "lng"]], { "max-fraction-digits": 4 }],
                    "°E",
                  ],
                  { "font-scale": 0.78 },
                ],
              ],
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
              "text-opacity": [
                "interpolate", ["linear"], ["zoom"], 10, 0, 11, 1,
              ],
            },
          },
        ],
      },
      center: [78.96, 20.59],
      zoom: 4.8,
      attributionControl: false,
    });

    map.current.addControl(new maplibregl.NavigationControl(), "bottom-right");
    map.current.on("load", () => setLoaded(true));

    // DC click — show popup
    map.current.on("click", "dc-core", (e) => {
      e.preventDefault();
      const feature = e.features?.[0];
      if (!feature) return;
      const coords = (feature.geometry as GeoJSON.Point).coordinates as [number, number];
      map.current?.flyTo({ center: coords, zoom: 17.5, duration: 1000 });
      setDcPopup({
        dc: feature.properties as Record<string, unknown>,
        lat: coords[1],
        lng: coords[0],
      });
    });

    map.current.on("mouseenter", "dc-core", () => {
      if (map.current) map.current.getCanvas().style.cursor = "pointer";
    });
    map.current.on("mouseleave", "dc-core", () => {
      if (map.current) map.current.getCanvas().style.cursor = "";
    });

    // Map click — place marker for custom location
    map.current.on("click", (e) => {
      const dcFeats = map.current?.queryRenderedFeatures(e.point, {
        layers: ["dc-core"],
      });
      if (dcFeats && dcFeats.length > 0) return;

      setDcPopup(null);
      const { lng, lat } = e.lngLat;
      const isIndia =
        lat >= 6.0 && lat <= 37.5 && lng >= 68.0 && lng <= 97.5;
      if (!isIndia) {
        alert("Analysis available only for India region");
        return;
      }

      if (!marker.current) {
        marker.current = new maplibregl.Marker({ color: "#FF0055" })
          .setLngLat([lng, lat])
          .addTo(map.current!);
      } else {
        marker.current.setLngLat([lng, lat]);
      }

      // Store position in state and populate the coordinate form
      setMarkerPos({ lat, lng });
      setSearchCoords({
        lat: lat.toFixed(6),
        lng: lng.toFixed(6),
      });
    });

    return () => {
      // Don't destroy on re-render — only destroy if component fully unmounts
    };
  }, []);

  // Apply layer visibility toggles
  useEffect(() => {
    if (!map.current || !loaded) return;
    for (const { id, group } of LAYER_DEFS) {
      if (map.current.getLayer(id)) {
        map.current.setLayoutProperty(
          id,
          "visibility",
          layerVis[group] ? "visible" : "none",
        );
      }
    }
  }, [layerVis, loaded]);

  const flyToDc = (dc: DcEntry) => {
    if (!map.current) return;
    map.current.flyTo({
      center: [dc.lng, dc.lat],
      zoom: 17.5,
      duration: 2000,
      essential: true,
    });
    setDcPopup({ dc: dc.props, lat: dc.lat, lng: dc.lng });
    setDcSearch("");
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const lat = parseFloat(searchCoords.lat);
    const lng = parseFloat(searchCoords.lng);
    if (isNaN(lat) || isNaN(lng)) {
      alert("Please enter valid numeric coordinates.");
      return;
    }
    const isIndia = lat >= 6.0 && lat <= 37.5 && lng >= 68.0 && lng <= 97.5;
    if (!isIndia) {
      alert("Analysis available only for India region");
      return;
    }
    if (map.current) {
      map.current.flyTo({ center: [lng, lat], zoom: 14 });
      if (!marker.current) {
        marker.current = new maplibregl.Marker({ color: "#FF0055" })
          .setLngLat([lng, lat])
          .addTo(map.current);
      } else {
        marker.current.setLngLat([lng, lat]);
      }
    }
    setMarkerPos({ lat, lng });
    onLocationAnalyze?.(lat, lng);
  };

  const filteredDcs =
    dcSearch.length > 1
      ? dcList
          .filter(
            (dc) =>
              dc.name.toLowerCase().includes(dcSearch.toLowerCase()) ||
              dc.company.toLowerCase().includes(dcSearch.toLowerCase()),
          )
          .slice(0, 5)
      : [];

  return (
    <div className="w-full h-full absolute top-0 left-0 bg-slate-950 overflow-hidden" style={{ fontFamily: "var(--font-family, 'Inter', 'Segoe UI', system-ui, sans-serif)" }}>
      <div ref={mapContainer} className="w-full h-full" />

      {/* Left top: Jump to coords */}
      <div className="absolute top-4 left-4 z-10 w-60">
        <form
          onSubmit={handleSearch}
          style={{ background: "rgba(255,255,255,0.97)", border: "1px solid #e2e8f0", boxShadow: "0 4px 12px rgba(0,0,0,0.15)", padding: "12px" }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px" }}>
            <Navigation size={12} style={{ color: "#64748b" }} />
            <span style={{ fontSize: "10px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Jump to Coords
            </span>
          </div>
          <div style={{ display: "flex", gap: "6px" }}>
            <input
              type="text"
              placeholder="Lat"
              value={searchCoords.lat}
              onChange={(e) =>
                setSearchCoords((p) => ({ ...p, lat: e.target.value }))
              }
              style={{ flex: 1, minWidth: 0, boxSizing: "border-box", background: "#f8fafc", border: "1px solid #e2e8f0", padding: "6px 8px", fontSize: "11px", fontWeight: 600, color: "#334155", outline: "none", fontFamily: "inherit" }}
            />
            <input
              type="text"
              placeholder="Lng"
              value={searchCoords.lng}
              onChange={(e) =>
                setSearchCoords((p) => ({ ...p, lng: e.target.value }))
              }
              style={{ flex: 1, minWidth: 0, boxSizing: "border-box", background: "#f8fafc", border: "1px solid #e2e8f0", padding: "6px 8px", fontSize: "11px", fontWeight: 600, color: "#334155", outline: "none", fontFamily: "inherit" }}
            />
          </div>
          <button
            type="submit"
            style={{ width: "100%", background: "#0f766e", color: "#fff", border: "none", padding: "8px", fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", cursor: "pointer", marginTop: "8px", fontFamily: "inherit" }}
          >
            <Search size={13} /> Analyze Location
          </button>
        </form>
      </div>

      {/* Center top: DC search */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 w-96">
        <div className="relative">
          <div style={{ background: "rgba(255,255,255,0.97)", border: "1px solid #e2e8f0", boxShadow: "0 4px 12px rgba(0,0,0,0.15)", padding: "10px 16px", display: "flex", alignItems: "center", gap: "10px" }}>
            <Server size={15} style={{ color: "#475569", flexShrink: 0 }} />
            <input
              type="text"
              placeholder="Search data centers..."
              value={dcSearch}
              onChange={(e) => setDcSearch(e.target.value)}
              style={{ background: "transparent", border: "none", outline: "none", fontSize: "12px", fontWeight: 600, color: "#334155", width: "100%", fontFamily: "inherit" }}
            />
            {dcSearch && (
              <X
                size={14}
                style={{ color: "#94a3b8", cursor: "pointer", flexShrink: 0 }}
                onClick={() => setDcSearch("")}
              />
            )}
          </div>
          <AnimatePresence>
            {filteredDcs.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "#fff", border: "1px solid #e2e8f0", boxShadow: "0 8px 24px rgba(0,0,0,0.12)", zIndex: 50, marginTop: "2px" }}
              >
                {filteredDcs.map((dc) => (
                  <button
                    key={String(dc.id ?? dc.name)}
                    onClick={() => flyToDc(dc)}
                    style={{ width: "100%", padding: "10px 14px", display: "flex", alignItems: "center", gap: "10px", background: "none", border: "none", borderBottom: "1px solid #f1f5f9", cursor: "pointer", textAlign: "left", fontFamily: "inherit" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "#f8fafc")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
                  >
                    <MapPin size={13} style={{ color: "#64748b", flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: "11px", fontWeight: 700, color: "#1e293b" }}>{dc.name}</div>
                      <div style={{ fontSize: "10px", color: "#94a3b8", fontWeight: 500 }}>{dc.company}</div>
                    </div>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Right top: Layer toggles */}
      <div className="absolute top-4 right-4 z-10 w-48">
        <div style={{ background: "rgba(255,255,255,0.97)", border: "1px solid #e2e8f0", boxShadow: "0 4px 12px rgba(0,0,0,0.15)" }}>
          <div style={{ padding: "8px 12px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", gap: "6px" }}>
            <Layers size={11} style={{ color: "#64748b" }} />
            <span style={{ fontSize: "10px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.08em" }}>Overlays</span>
          </div>
          <div style={{ padding: "8px" }}>
            {TOGGLE_GROUPS.map(({ key, label, icon }) => (
              <label
                key={key}
                style={{ display: "flex", alignItems: "center", gap: "8px", padding: "6px 8px", cursor: "pointer", userSelect: "none" }}
              >
                <input
                  type="checkbox"
                  checked={layerVis[key]}
                  onChange={() => toggleGroup(key)}
                  style={{ width: "14px", height: "14px", cursor: "pointer", accentColor: "#0f766e" }}
                />
                <span style={{ color: "#334155" }}>{icon}</span>
                <span style={{ fontSize: "11px", fontWeight: 600, color: "#334155" }}>{label}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* Custom location analyze panel */}
      <AnimatePresence>
        {markerPos && !dcPopup && (
          <motion.div
            key="location-panel"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 w-[480px] max-w-[95vw]"
          >
            <div style={{ background: "rgba(255,255,255,0.97)", border: "1px solid #e2e8f0", boxShadow: "0 8px 32px rgba(0,0,0,0.2)", padding: "16px 20px", display: "flex", alignItems: "center", gap: "16px" }}>
              <MapPin size={16} style={{ color: "#475569", flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: "10px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "2px" }}>
                  Custom Location Selected
                </div>
                <div style={{ fontFamily: "monospace", fontWeight: 700, color: "#1e293b", fontSize: "12px" }}>
                  {markerPos.lat.toFixed(5)}°N · {markerPos.lng.toFixed(5)}°E
                </div>
              </div>
              <button
                onClick={() => {
                  setMarkerPos(null);
                  if (marker.current) {
                    marker.current.remove();
                    marker.current = null;
                  }
                }}
                style={{ width: "28px", height: "28px", display: "flex", alignItems: "center", justifyContent: "center", background: "none", border: "1px solid #e2e8f0", cursor: "pointer", color: "#64748b", flexShrink: 0 }}
              >
                <X size={14} />
              </button>
              <button
                onClick={() => {
                  onLocationAnalyze?.(markerPos.lat, markerPos.lng);
                }}
                style={{ background: "#1e293b", color: "#fff", border: "none", padding: "8px 16px", fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", flexShrink: 0, fontFamily: "inherit" }}
              >
                <Search size={12} />
                Analyze
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Datacenter popup card */}
      <AnimatePresence>
        {dcPopup && (
          <motion.div
            key="dc-popup"
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 60 }}
            className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 w-[580px] max-w-[95vw]"
          >
            <div style={{ background: "#fff", border: "1px solid #e2e8f0", boxShadow: "0 16px 48px rgba(0,0,0,0.2)", overflow: "hidden" }}>
              {/* Satellite image */}
              <div style={{ position: "relative", height: "180px", width: "100%", overflow: "hidden", background: "#0f172a" }}>
                <img
                  src={`https://services.arcgisonline.com/arcgis/rest/services/World_Imagery/MapServer/export?bbox=${dcPopup.lng - 0.005},${dcPopup.lat - 0.002},${dcPopup.lng + 0.005},${dcPopup.lat + 0.002}&bboxSR=4326&imageSR=4326&size=800,320&format=jpg&f=image`}
                  alt="Building Satellite View"
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
                <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
                  <div style={{ width: "14px", height: "14px", background: "#0f766e", border: "2px solid #fff", boxShadow: "0 0 12px rgba(15,118,110,0.8)" }} />
                </div>
                <button
                  onClick={() => setDcPopup(null)}
                  style={{ position: "absolute", top: "12px", right: "12px", width: "32px", height: "32px", display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.5)", border: "none", color: "#fff", cursor: "pointer" }}
                >
                  <X size={16} />
                </button>
                <div style={{ position: "absolute", top: "12px", left: "12px", padding: "4px 10px", background: "rgba(0,0,0,0.5)", color: "rgba(255,255,255,0.9)", fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  {String(dcPopup.dc["id"] ?? "").toUpperCase()}
                </div>
              </div>

              {/* Info section */}
              <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "14px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ fontSize: "10px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "4px" }}>
                      {String(dcPopup.dc["company"] ?? "")}
                    </div>
                    <h3 style={{ fontSize: "18px", fontWeight: 700, color: "#1e293b", lineHeight: 1.2 }}>
                      {String(dcPopup.dc["name"] ?? "")}
                    </h3>
                  </div>
                  <div style={{ padding: "4px 10px", border: "1px solid #e2e8f0", fontSize: "10px", fontWeight: 700, color: "#475569", textTransform: "uppercase" }}>
                    {String(dcPopup.dc["tier"] ?? "Tier III")}
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                  <div style={{ padding: "12px", background: "#f8fafc", border: "1px solid #e2e8f0" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "5px", marginBottom: "6px" }}>
                      <MapPin size={11} style={{ color: "#64748b" }} />
                      <span style={{ fontSize: "9px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em" }}>Address</span>
                    </div>
                    <div style={{ fontSize: "11px", fontWeight: 600, color: "#475569", lineHeight: 1.4 }}>
                      {String(dcPopup.dc["address"] ?? "")}
                    </div>
                  </div>
                  <div style={{ padding: "12px", background: "#f8fafc", border: "1px solid #e2e8f0" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "5px", marginBottom: "6px" }}>
                      <Navigation size={11} style={{ color: "#64748b" }} />
                      <span style={{ fontSize: "9px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em" }}>Coordinates</span>
                    </div>
                    <div style={{ fontFamily: "monospace", fontSize: "11px", fontWeight: 700, color: "#334155" }}>
                      {dcPopup.lat.toFixed(6)}°N<br />{dcPopup.lng.toFixed(6)}°E
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setDcPopup(null);
                    onDatacenterClick(dcPopup.lat, dcPopup.lng, dcPopup.dc);
                  }}
                  style={{ width: "100%", background: "#0f766e", color: "#fff", border: "none", padding: "12px", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", cursor: "pointer", fontFamily: "inherit" }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "#0d5f59"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "#0f766e"; }}
                >
                  <ExternalLink size={14} />
                  <span>Access Intelligence Report</span>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
