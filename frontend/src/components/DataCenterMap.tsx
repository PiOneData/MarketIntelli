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
  lng: number;
  lat: number;
  props: Record<string, unknown>;
}

interface PopupState {
  dc: DcGeoEntry;
}

function DataCenterMap({ dataCenters }: { dataCenters: DataCenter[] }) {
  const navigate = useNavigate();
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [popup, setPopup] = useState<PopupState | null>(null);
  const [dcGeoList, setDcGeoList] = useState<DcGeoEntry[]>([]);
  const [search, setSearch] = useState("");

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
              "circle-color": "#0f766e",
              "circle-opacity": 0.25,
              "circle-blur": 0.5,
            },
          },
          // Data center core marker
          {
            id: "dc-core",
            type: "circle",
            source: "datacenters-geojson",
            paint: {
              "circle-radius": ["interpolate", ["linear"], ["zoom"], 4, 6, 10, 12, 14, 16],
              "circle-color": "#0f766e",
              "circle-stroke-color": "#ffffff",
              "circle-stroke-width": 2.5,
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

  void loaded; // suppress unused warning

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

  // State summary from API data
  const stateSummary = useMemo(() => {
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
                  <div style={{ width: "10px", height: "10px", background: "#0f766e", border: "2px solid #fff", boxShadow: "0 0 8px rgba(15,118,110,0.8)" }} />
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
                {popup.dc.address && <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 4 }}>{popup.dc.address}</div>}
                {popup.dc.tier && (
                  <div style={{ display: "inline-block", fontSize: 10, fontWeight: 700, color: "#0f766e", background: "#f0fdf4", border: "1px solid #bbf7d0", padding: "2px 7px", marginBottom: 4 }}>
                    Tier {popup.dc.tier}
                  </div>
                )}
                <div style={{ fontSize: 10, color: "#94a3b8", marginBottom: 12, fontFamily: "monospace" }}>
                  {popup.dc.lat.toFixed(5)}°N · {popup.dc.lng.toFixed(5)}°E
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
          <div style={{ background: "rgba(0,0,0,0.55)", padding: "4px 10px", display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "white", backdropFilter: "blur(4px)" }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#0f766e", display: "inline-block" }} />
            Data Centers ({dcGeoList.length})
          </div>
        </div>
      </div>

      {/* Sidebar */}
      <div className="dc-map-sidebar">
        <h3 className="dc-map-sidebar-title">Map Overview</h3>
        <div className="dc-map-sidebar-hint">
          <p>
            Click a <strong style={{ color: "#0f766e" }}>teal marker</strong> on the map or search above to view a data center&apos;s RE Intelligence Report.
          </p>
          <div className="dc-map-state-list" style={{ marginTop: 16 }}>
            <h4>By State ({stateSummary.length})</h4>
            {stateSummary.map(([state, info]) => (
              <div key={state} className="dc-map-state-btn" style={{ cursor: "default" }}>
                <span className="dc-map-state-name">{state}</span>
                <span className="dc-map-state-stats">{info.count} DC · {info.power.toLocaleString()} MW</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default DataCenterMap;
