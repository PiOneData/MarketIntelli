import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { FeatureCollection, Point } from "geojson";
import { motion, AnimatePresence } from "framer-motion";
import { geocodeFacilities, geocodeAddresses } from "../api/dataCenters";

// ── state name normalizer ─────────────────────────────────────────────────────
const _STATE_NORM: Record<string, string> = {
  "New Delhi": "Delhi", NCR: "Delhi", "Delhi NCR": "Delhi",
  "NCR Delhi": "Delhi", "NCT of Delhi": "Delhi",
  "National Capital Region": "Delhi",
  Telengana: "Telangana", Telanagana: "Telangana",
  Tamilnadu: "Tamil Nadu", TamilNadu: "Tamil Nadu",
  Orissa: "Odisha", Pondicherry: "Puducherry",
  "Jammu and Kashmir": "Jammu & Kashmir", "J&K": "Jammu & Kashmir",
  Uttaranchal: "Uttarakhand", Uttrakhand: "Uttarakhand",
};
function normState(s: string): string {
  return _STATE_NORM[s] ?? s;
}

// ── types ─────────────────────────────────────────────────────────────────────
export interface DCHeatMapEntry {
  id: string;
  name: string;
  company: string;
  city: string;
  state: string;
  location: string;
  locationDetail?: string;
  powerMW: number;
  status: string;
  tierLevel?: string;
  lat?: number;
  lng?: number;
}

type HeatmapMode = "count" | "mw";

interface DCPopup {
  id: string;
  name: string;
  company: string;
  city: string;
  state: string;
  address?: string;
  powerMW: number;
  status: string;
  tier?: string;
  lat: number;
  lng: number;
}

// ── heatmap paint configs ─────────────────────────────────────────────────────
const COUNT_COLOR = [
  "interpolate", ["linear"], ["heatmap-density"],
  0, "rgba(0,0,0,0)",
  0.15, "#4338ca",
  0.35, "#0ea5e9",
  0.55, "#34d399",
  0.75, "#fbbf24",
  0.9,  "#f97316",
  1,    "#dc2626",
] as unknown as maplibregl.ExpressionSpecification;

const MW_COLOR = [
  "interpolate", ["linear"], ["heatmap-density"],
  0, "rgba(0,0,0,0)",
  0.15, "#d9f99d",
  0.35, "#86efac",
  0.55, "#fde68a",
  0.75, "#f97316",
  0.9,  "#dc2626",
  1,    "#7f1d1d",
] as unknown as maplibregl.ExpressionSpecification;

// Handles both raw ("operational") and display ("Operational", "Under Construction") status values
const STATUS_COLOR = (fallback: string): maplibregl.ExpressionSpecification =>
  [
    "match", ["downcase", ["get", "status"]],
    "operational",        "#0f766e",
    "under_construction", "#0369a1",
    "under construction", "#0369a1",
    "planned",            "#7c3aed",
    fallback,
  ] as unknown as maplibregl.ExpressionSpecification;

// ── component ─────────────────────────────────────────────────────────────────
function DataCenterHeatMap({ dataCenters }: { dataCenters: DCHeatMapEntry[] }) {
  const navigate    = useNavigate();
  const queryClient = useQueryClient();
  const mapRef      = useRef<HTMLDivElement>(null);
  const map         = useRef<maplibregl.Map | null>(null);
  const [loaded, setLoaded]   = useState(false);
  const [mode, setMode]       = useState<HeatmapMode>("count");
  const [popup, setPopup]     = useState<DCPopup | null>(null);
  const [selState, setSelState] = useState<string | null>(null);

  // geocoding UX
  const [cityGeocodeState, setCityGeocodeState] = useState<
    "idle" | "running" | "done"
  >("idle");
  const [addrGeocodeState, setAddrGeocodeState] = useState<
    "idle" | "running" | "done" | "error"
  >("idle");
  const [addrGeocodeMsg, setAddrGeocodeMsg] = useState("");

  // ── derived data ────────────────────────────────────────────────────────────
  const mappedDCs = useMemo(
    () => dataCenters.filter((d) => d.lat != null && d.lng != null),
    [dataCenters]
  );
  const unmappedCount = dataCenters.length - mappedDCs.length;

  // Max MW for normalization (used in GeoJSON weight field)
  const maxMW = useMemo(
    () => Math.max(1, ...mappedDCs.map((d) => d.powerMW)),
    [mappedDCs]
  );

  const facilitiesGeoJSON = useMemo<FeatureCollection>(
    () => ({
      type: "FeatureCollection",
      features: mappedDCs.map((dc) => ({
        type: "Feature",
        geometry: { type: "Point", coordinates: [dc.lng!, dc.lat!] },
        properties: {
          id:           dc.id,
          name:         dc.name,
          company:      dc.company,
          city:         dc.city,
          state:        normState(dc.state),
          address:      dc.locationDetail ?? dc.location,
          power_mw:     dc.powerMW,
          status:       dc.status,
          tier:         dc.tierLevel ?? "",
          count_weight: 1,
          mw_weight:    dc.powerMW > 0 ? dc.powerMW / maxMW : 0.05,
        },
      })),
    }),
    [mappedDCs, maxMW]
  );

  // Per-state stats + bounding boxes (derived from mapped DCs only)
  const stateStats = useMemo(() => {
    const m = new Map<string, {
      count: number; power: number;
      minLat: number; maxLat: number; minLng: number; maxLng: number;
    }>();
    for (const dc of mappedDCs) {
      const st = normState(dc.state);
      if (!st) continue;
      const prev = m.get(st) ?? {
        count: 0, power: 0,
        minLat: dc.lat!, maxLat: dc.lat!,
        minLng: dc.lng!, maxLng: dc.lng!,
      };
      prev.count++;
      prev.power     += dc.powerMW;
      prev.minLat     = Math.min(prev.minLat, dc.lat!);
      prev.maxLat     = Math.max(prev.maxLat, dc.lat!);
      prev.minLng     = Math.min(prev.minLng, dc.lng!);
      prev.maxLng     = Math.max(prev.maxLng, dc.lng!);
      m.set(st, prev);
    }
    return Array.from(m.entries())
      .sort((a, b) => b[1].count - a[1].count)
      .map(([state, info]) => ({ state, ...info }));
  }, [mappedDCs]);

  const maxStateMW = useMemo(
    () => Math.max(1, ...stateStats.map((s) => s.power)),
    [stateStats]
  );

  // ── map init ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (map.current || !mapRef.current) return;

    map.current = new maplibregl.Map({
      container: mapRef.current,
      style:     "https://tiles.openfreemap.org/styles/liberty",
      center:    [78.96, 20.59],
      zoom:      4.4,
      attributionControl: false,
    });

    map.current.addControl(
      new maplibregl.NavigationControl({ visualizePitch: false }),
      "bottom-right"
    );
    map.current.addControl(
      new maplibregl.AttributionControl({ compact: true }),
      "bottom-right"
    );

    map.current.on("load", () => {
      if (!map.current) return;

      // ── source ──────────────────────────────────────────────────────────────
      map.current.addSource("dcs", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });

      // ── heatmap layer (visible at zoom ≤ 9) ─────────────────────────────────
      map.current.addLayer({
        id:      "dc-heat",
        type:    "heatmap",
        source:  "dcs",
        maxzoom: 10,
        paint: {
          "heatmap-weight":    ["get", "count_weight"],
          "heatmap-intensity": [
            "interpolate", ["linear"], ["zoom"], 3, 0.6, 9, 2.5,
          ],
          "heatmap-radius": [
            "interpolate", ["linear"], ["zoom"], 3, 20, 7, 40, 9, 60,
          ],
          "heatmap-opacity": [
            "interpolate", ["linear"], ["zoom"], 8, 0.92, 10, 0,
          ],
          "heatmap-color": COUNT_COLOR,
        },
      });

      // ── glow ring (individual DC; visible at zoom ≥ 8) ──────────────────────
      map.current.addLayer({
        id:      "dc-glow",
        type:    "circle",
        source:  "dcs",
        minzoom: 8,
        paint: {
          "circle-radius": [
            "interpolate", ["linear"], ["zoom"], 8, 14, 14, 28,
          ],
          "circle-color":   STATUS_COLOR("#64748b"),
          "circle-opacity": [
            "interpolate", ["linear"], ["zoom"], 8, 0, 9, 0.2,
          ],
          "circle-blur": 1.2,
        },
      });

      // ── core circle (individual DC; visible at zoom ≥ 8) ────────────────────
      map.current.addLayer({
        id:      "dc-core",
        type:    "circle",
        source:  "dcs",
        minzoom: 8,
        paint: {
          "circle-radius": [
            "interpolate", ["linear"], ["zoom"], 8, 5, 14, 14,
          ],
          "circle-color":        STATUS_COLOR("#64748b"),
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 2,
          "circle-opacity":      [
            "interpolate", ["linear"], ["zoom"], 8, 0, 9, 1,
          ],
        },
      });

      // ── name label (visible at zoom ≥ 11.5) ─────────────────────────────────
      map.current.addLayer({
        id:      "dc-label",
        type:    "symbol",
        source:  "dcs",
        minzoom: 11.5,
        layout: {
          "text-field":         ["get", "name"],
          "text-font":          ["Noto Sans Regular"],
          "text-size":          11,
          "text-anchor":        "top",
          "text-offset":        [0, 1.2],
          "text-max-width":     14,
          "text-allow-overlap": false,
        },
        paint: {
          "text-color":      "#1e293b",
          "text-halo-color": "#ffffff",
          "text-halo-width": 1.5,
          "text-opacity":    [
            "interpolate", ["linear"], ["zoom"], 11.5, 0, 12, 1,
          ],
        },
      });

      // ── click on DC ─────────────────────────────────────────────────────────
      map.current.on("click", "dc-core", (e) => {
        e.preventDefault();
        const feat = e.features?.[0];
        if (!feat) return;
        const coords = (feat.geometry as Point).coordinates as [number, number];
        const p = feat.properties as Record<string, unknown>;
        map.current?.flyTo({ center: coords, zoom: 14, duration: 1000 });
        setPopup({
          id:      String(p["id"] ?? ""),
          name:    String(p["name"] ?? ""),
          company: String(p["company"] ?? ""),
          city:    String(p["city"] ?? ""),
          state:   String(p["state"] ?? ""),
          address: p["address"] as string | undefined,
          powerMW: Number(p["power_mw"] ?? 0),
          status:  String(p["status"] ?? ""),
          tier:    p["tier"] as string | undefined,
          lat:     coords[1] ?? 0,
          lng:     coords[0] ?? 0,
        });
      });

      map.current.on("mouseenter", "dc-core", () => {
        if (map.current) map.current.getCanvas().style.cursor = "pointer";
      });
      map.current.on("mouseleave", "dc-core", () => {
        if (map.current) map.current.getCanvas().style.cursor = "";
      });

      // blank map click → close popup
      map.current.on("click", (e) => {
        const hits = map.current?.queryRenderedFeatures(e.point, {
          layers: ["dc-core"],
        });
        if (!hits?.length) setPopup(null);
      });

      setLoaded(true);
    });

    return () => { /* map lives for component lifetime */ };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── push new GeoJSON whenever data changes ──────────────────────────────────
  useEffect(() => {
    if (!loaded || !map.current) return;
    const src = map.current.getSource("dcs") as maplibregl.GeoJSONSource | undefined;
    src?.setData(facilitiesGeoJSON);
  }, [loaded, facilitiesGeoJSON]);

  // ── update heatmap weight + color ramp when mode changes ────────────────────
  useEffect(() => {
    if (!loaded || !map.current) return;
    const weightField = mode === "count" ? "count_weight" : "mw_weight";
    map.current.setPaintProperty(
      "dc-heat", "heatmap-weight",
      ["get", weightField] as unknown as maplibregl.ExpressionSpecification
    );
    map.current.setPaintProperty("dc-heat", "heatmap-color",
      mode === "count" ? COUNT_COLOR : MW_COLOR
    );
  }, [loaded, mode]);

  // ── auto-trigger fast (city-centroid) geocoding if no DCs are mapped ────────
  useEffect(() => {
    if (cityGeocodeState !== "idle") return;
    if (dataCenters.length === 0) return;
    if (mappedDCs.length > 0) return; // already have coordinates
    setCityGeocodeState("running");
    geocodeFacilities()
      .then((r) => {
        if (r.resolved > 0) {
          void queryClient.invalidateQueries({ queryKey: ["dc-facilities"] });
        }
      })
      .catch(console.error)
      .finally(() => setCityGeocodeState("done"));
  }, [cityGeocodeState, dataCenters.length, mappedDCs.length, queryClient]);

  // ── actions ─────────────────────────────────────────────────────────────────
  const flyToState = useCallback(
    (state: string) => {
      const s = stateStats.find((ss) => ss.state === state);
      if (!s || !map.current) return;
      const padLat = Math.max(0.6, (s.maxLat - s.minLat) * 0.35);
      const padLng = Math.max(0.6, (s.maxLng - s.minLng) * 0.35);
      map.current.fitBounds(
        [
          [s.minLng - padLng, s.minLat - padLat],
          [s.maxLng + padLng, s.maxLat + padLat],
        ],
        { padding: 60, duration: 1500 }
      );
      setSelState(state);
      setPopup(null);
    },
    [stateStats]
  );

  const resetView = useCallback(() => {
    map.current?.flyTo({ center: [78.96, 20.59], zoom: 4.4, duration: 1500 });
    setSelState(null);
    setPopup(null);
  }, []);

  const handleGeocodeAddresses = useCallback(async () => {
    if (addrGeocodeState === "running") return;
    setAddrGeocodeState("running");
    setAddrGeocodeMsg("");
    try {
      const res = await geocodeAddresses(true);
      setAddrGeocodeMsg(res.message);
      setAddrGeocodeState("done");
      // Refresh after 10 s (first Nominatim results arrive quickly)
      setTimeout(() => {
        void queryClient.invalidateQueries({ queryKey: ["dc-facilities"] });
      }, 10_000);
    } catch {
      setAddrGeocodeState("error");
      setAddrGeocodeMsg("Geocoding request failed — check backend logs.");
    }
  }, [addrGeocodeState, queryClient]);

  // ── render ──────────────────────────────────────────────────────────────────
  return (
    <div className="dc-heatmap-root">
      {/* ─── Address Geocoding Banner ────────────────────────────────────────── */}
      <AnimatePresence>
        {addrGeocodeState !== "idle" && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={`dc-heatmap-geocode-banner dc-heatmap-geocode-banner--${addrGeocodeState}`}
          >
            <span className="dc-heatmap-geocode-icon">
              {addrGeocodeState === "running" && (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round"
                  className="dc-heatmap-spin">
                  <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
                </svg>
              )}
              {addrGeocodeState === "done"    && "✓"}
              {addrGeocodeState === "error"   && "✗"}
            </span>
            <span className="dc-heatmap-geocode-text">
              {addrGeocodeState === "running"
                ? "Address geocoding is running in the background — precise coordinates will appear shortly…"
                : addrGeocodeMsg}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Layout: Sidebar + Map ───────────────────────────────────────────── */}
      <div className="dc-heatmap-layout">

        {/* ─ Left Sidebar: State Drill-down ─────────────────────────────────── */}
        <aside className="dc-heatmap-sidebar">
          {/* Header */}
          <div className="dc-heatmap-sidebar-header">
            <div className="dc-heatmap-sidebar-title-row">
              <span className="dc-heatmap-sidebar-title">States</span>
              <span className="dc-heatmap-sidebar-badge">{stateStats.length}</span>
            </div>
            {selState && (
              <button className="dc-heatmap-reset-small" onClick={resetView}>
                ← India
              </button>
            )}
          </div>

          {/* Mode sub-label */}
          <div className="dc-heatmap-sidebar-sublabel">
            {mode === "count" ? "Sorted by DC count" : "Bar = power (MW)"}
          </div>

          {/* State list */}
          <div className="dc-heatmap-state-list">
            {stateStats.map(({ state, count, power }) => {
              const barPct =
                power > 0
                  ? Math.max(4, Math.round((power / maxStateMW) * 100))
                  : 0;
              const isSelected = selState === state;
              return (
                <button
                  key={state}
                  className={`dc-heatmap-state-btn${isSelected ? " dc-heatmap-state-btn--active" : ""}`}
                  onClick={() => flyToState(state)}
                >
                  <div className="dc-heatmap-state-top">
                    <span className="dc-heatmap-state-name">{state}</span>
                    <span className="dc-heatmap-state-count">{count}</span>
                  </div>
                  <div className="dc-heatmap-state-bar-bg">
                    {barPct > 0 && (
                      <div
                        className="dc-heatmap-state-bar-fill"
                        style={{ width: `${barPct}%` }}
                      />
                    )}
                  </div>
                  <div className="dc-heatmap-state-mw">
                    {power > 0
                      ? power >= 1000
                        ? `${(power / 1000).toFixed(1)} GW`
                        : `${power.toFixed(0)} MW`
                      : "—"}
                  </div>
                </button>
              );
            })}

            {stateStats.length === 0 && (
              <div className="dc-heatmap-state-empty">
                {cityGeocodeState === "running"
                  ? "Loading coordinates…"
                  : "No mapped data centers"}
              </div>
            )}
          </div>

          {/* Precision geocode action */}
          <div className="dc-heatmap-sidebar-footer">
            {addrGeocodeState === "idle" && (
              <button
                className="dc-heatmap-addr-btn"
                onClick={handleGeocodeAddresses}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83" />
                </svg>
                Geocode Precise Addresses
              </button>
            )}
            {addrGeocodeState === "running" && (
              <div className="dc-heatmap-addr-running">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round"
                  className="dc-heatmap-spin">
                  <circle cx="12" cy="12" r="10" />
                </svg>
                Geocoding in background…
              </div>
            )}
            <div className="dc-heatmap-sidebar-coverage">
              {mappedDCs.length}/{dataCenters.length} DCs mapped
            </div>
          </div>
        </aside>

        {/* ─ Main Map ───────────────────────────────────────────────────────── */}
        <div className="dc-heatmap-map-wrap">
          <div className="dc-heatmap-map-inner" ref={mapRef} />

          {/* ── Mode Toggle (top-right) ──────────────────────────────────────── */}
          <div className="dc-heatmap-mode-toggle">
            <button
              className={`dc-heatmap-mode-btn${mode === "count" ? " dc-heatmap-mode-btn--active" : ""}`}
              onClick={() => setMode("count")}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                <rect x="3" y="3" width="7" height="7" />
                <rect x="14" y="3" width="7" height="7" />
                <rect x="3" y="14" width="7" height="7" />
                <rect x="14" y="14" width="7" height="7" />
              </svg>
              Count
            </button>
            <button
              className={`dc-heatmap-mode-btn${mode === "mw" ? " dc-heatmap-mode-btn--active" : ""}`}
              onClick={() => setMode("mw")}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
              </svg>
              MW
            </button>
          </div>

          {/* ── Reset Button (top-left, when drilled in) ─────────────────────── */}
          <AnimatePresence>
            {(selState || unmappedCount > 0) && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="dc-heatmap-top-left-controls"
              >
                {selState && (
                  <button className="dc-heatmap-india-btn" onClick={resetView}>
                    ← India View
                  </button>
                )}
                {unmappedCount > 0 && cityGeocodeState === "running" && (
                  <div className="dc-heatmap-geocoding-pill">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" strokeWidth="2" className="dc-heatmap-spin">
                      <circle cx="12" cy="12" r="10" />
                    </svg>
                    Geocoding {unmappedCount} DCs…
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Legend (bottom-left) ─────────────────────────────────────────── */}
          <div className="dc-heatmap-legend">
            <div className="dc-heatmap-legend-title">
              {mode === "count" ? "DC Density" : "Power Density (MW)"}
            </div>
            <div className="dc-heatmap-legend-bar">
              {(mode === "count"
                ? ["#4338ca", "#0ea5e9", "#34d399", "#fbbf24", "#f97316", "#dc2626"]
                : ["#d9f99d", "#86efac", "#fde68a", "#f97316", "#dc2626", "#7f1d1d"]
              ).map((c, i) => (
                <div key={i} className="dc-heatmap-legend-swatch" style={{ background: c }} />
              ))}
            </div>
            <div className="dc-heatmap-legend-labels">
              <span>Low</span><span>High</span>
            </div>
            <div className="dc-heatmap-legend-hint">
              Zoom in to see individual facilities
            </div>
          </div>

          {/* ── Status Colour Key (bottom-right above nav) ───────────────────── */}
          <div className="dc-heatmap-status-key">
            <div className="dc-heatmap-status-key-title">Status</div>
            {[
              { label: "Operational",       color: "#0f766e" },
              { label: "Under Construction",color: "#0369a1" },
              { label: "Planned",           color: "#7c3aed" },
            ].map(({ label, color }) => (
              <div key={label} className="dc-heatmap-status-key-row">
                <span
                  className="dc-heatmap-status-key-dot"
                  style={{ background: color }}
                />
                {label}
              </div>
            ))}
          </div>

          {/* ── DC Popup ─────────────────────────────────────────────────────── */}
          <AnimatePresence>
            {popup && (
              <motion.div
                initial={{ opacity: 0, scale: 0.93, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.93, y: 8 }}
                transition={{ duration: 0.18 }}
                className="dc-heatmap-popup"
              >
                {/* Satellite thumbnail */}
                <div className="dc-heatmap-popup-thumb">
                  <img
                    src={`https://services.arcgisonline.com/arcgis/rest/services/World_Imagery/MapServer/export?bbox=${popup.lng - 0.007},${popup.lat - 0.0035},${popup.lng + 0.007},${popup.lat + 0.0035}&bboxSR=4326&imageSR=4326&size=700,280&format=jpg&f=image`}
                    alt="Satellite view"
                    className="dc-heatmap-popup-img"
                    onError={(e) => { e.currentTarget.style.display = "none"; }}
                  />
                  {/* Crosshair pin */}
                  <div className="dc-heatmap-popup-pin" />
                  {/* Status chip */}
                  <div
                    className="dc-heatmap-popup-status"
                    style={{
                      background: (() => {
                        const s = popup.status.toLowerCase();
                        return s.includes("operational")   ? "#0f766e"
                             : s.includes("construction")  ? "#0369a1"
                             : "#7c3aed";
                      })(),
                    }}
                  >
                    {popup.status.replace(/_/g, " ")}
                  </div>
                  {/* Close */}
                  <button
                    className="dc-heatmap-popup-close"
                    onClick={() => setPopup(null)}
                    aria-label="Close"
                  >
                    ✕
                  </button>
                </div>

                {/* Body */}
                <div className="dc-heatmap-popup-body">
                  <div className="dc-heatmap-popup-eyebrow">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" strokeWidth="2.5">
                      <rect x="2" y="2" width="20" height="8" rx="2" />
                      <rect x="2" y="14" width="20" height="8" rx="2" />
                      <line x1="6" y1="6" x2="6.01" y2="6" />
                      <line x1="6" y1="18" x2="6.01" y2="18" />
                    </svg>
                    Data Center
                  </div>

                  <div className="dc-heatmap-popup-name">{popup.name}</div>
                  <div className="dc-heatmap-popup-company">{popup.company}</div>

                  {popup.address && (
                    <div className="dc-heatmap-popup-address">{popup.address}</div>
                  )}

                  {/* Chips row */}
                  <div className="dc-heatmap-popup-chips">
                    {popup.powerMW > 0 && (
                      <span className="dc-heatmap-chip dc-heatmap-chip--power">
                        ⚡ {popup.powerMW} MW
                      </span>
                    )}
                    {popup.tier && popup.tier !== "" && (
                      <span className="dc-heatmap-chip dc-heatmap-chip--tier">
                        {popup.tier}
                      </span>
                    )}
                  </div>

                  {/* Coordinates */}
                  <div className="dc-heatmap-popup-coords">
                    {popup.lat.toFixed(5)}°N · {popup.lng.toFixed(5)}°E
                    &nbsp;·&nbsp;{popup.city}, {popup.state}
                  </div>

                  {/* CTA */}
                  <button
                    className="dc-heatmap-popup-cta"
                    onClick={() => {
                      sessionStorage.setItem(
                        "pending_dc_assessment",
                        JSON.stringify({ props: { ...popup }, lat: popup.lat, lng: popup.lng })
                      );
                      navigate("/geo-analytics/assessment");
                    }}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                      <rect x="2" y="2" width="20" height="8" rx="2" />
                      <rect x="2" y="14" width="20" height="8" rx="2" />
                    </svg>
                    Access Intelligence Report
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ─── Mode description strip ──────────────────────────────────────────── */}
      <div className="dc-heatmap-footer-hint">
        {mode === "count"
          ? "Heatmap shows geographic density of data centers. Switch to MW mode to visualise power concentration."
          : "Heatmap intensity is weighted by power capacity (MW). Zoom in past level 9 to reveal individual facilities."}
      </div>
    </div>
  );
}

export default DataCenterHeatMap;
