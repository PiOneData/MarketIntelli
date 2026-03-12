import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
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
  Plane,
  Building2,
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

interface AirportEntry {
  slno: number;
  airport_name: string;
  iata_code: string | null;
  city: string;
  state: string;
  type: string;
  status: string;
  lat: number;
  lon: number;
  is_notable_green: boolean;
  green_energy: {
    solar_capacity_installed_mw?: string | number | null;
    annual_generation_mu?: string | number | null;
    annual_consumption_mu?: string | number | null;
    pct_green_coverage?: string | null;
    carbon_neutral_aci_level?: string | null;
  } | null;
  operations: {
    power_consumption_mw?: string | number | null;
    [key: string]: unknown;
  } | null;
}

interface DcPopupState {
  dc: Record<string, unknown>;
  lat: number;
  lng: number;
}

interface AirportPopupState {
  airport: AirportEntry;
  lat: number;
  lng: number;
}

interface StateKpiData {
  stateName: string;
  dc: {
    count: number;
    totalPowerMw: number;
    companies: string[];
    avgScore: number;
    tiers: Record<string, number>;
  } | null;
  airport: {
    count: number;
    totalSolarMw: number;
    totalPowerConsumptionMw: number;
    greenCount: number;
    operationalCount: number;
    types: Record<string, number>;
  } | null;
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
const LAYER_GROUPS = ["wind", "solar", "dc", "airports"] as const;
type LayerGroup = (typeof LAYER_GROUPS)[number];

const TOGGLE_GROUPS: {
  key: LayerGroup;
  label: string;
  icon: React.ReactNode;
}[] = [
  { key: "wind",     label: "Wind",        icon: <Wind size={12} /> },
  { key: "solar",    label: "Solar",       icon: <Sun size={12} /> },
  { key: "dc",       label: "Data Centers",icon: <Server size={12} /> },
  { key: "airports", label: "Airports",    icon: <Plane size={12} /> },
];

const LAYER_DEFS: { id: string; group: LayerGroup }[] = [
  { id: "wind-heat",      group: "wind" },
  { id: "turbines-glow",  group: "wind" },
  { id: "turbines-core",  group: "wind" },
  { id: "solar-heat",     group: "solar" },
  { id: "solar-glow",     group: "solar" },
  { id: "solar-core",     group: "solar" },
  { id: "dc-glow",        group: "dc" },
  { id: "dc-core",        group: "dc" },
  { id: "dc-label",       group: "dc" },
  { id: "airport-glow",   group: "airports" },
  { id: "airport-core",   group: "airports" },
  { id: "airport-label",  group: "airports" },
];

// ── Helpers ──────────────────────────────────────────────────────────────────
function parseNum(val: unknown): number {
  if (val === null || val === undefined || val === "" || val === "N/A") return 0;
  const n = parseFloat(String(val).replace(/[^0-9.-]/g, ""));
  return isNaN(n) ? 0 : n;
}

function normalizeStateName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s*&\s*/g, " and ")
    .replace(/\s+/g, " ")
    .trim();
}

function statesMatch(geoJsonName: string, dataName: string): boolean {
  const n1 = normalizeStateName(geoJsonName);
  const n2 = normalizeStateName(dataName);
  if (n1 === n2) return true;
  // Handle cases like "Andaman & Nicobar Islands" vs "Andaman and Nicobar"
  if (n1.includes(n2) || n2.includes(n1)) return true;
  // Split multi-state names like "Chandigarh / Punjab / Haryana"
  const parts = n2.split(/\s*\/\s*/);
  return parts.some((p) => n1.includes(p.trim()) || p.trim().includes(n1));
}

function computeStateKpi(
  stateName: string,
  dcList: DcEntry[],
  airportList: AirportEntry[],
  layerVis: Record<LayerGroup, boolean>,
): StateKpiData {
  const kpi: StateKpiData = { stateName, dc: null, airport: null };

  if (layerVis.dc) {
    const stateDcs = dcList.filter((dc) =>
      statesMatch(stateName, String(dc.props["state"] ?? "")),
    );
    const totalPowerMw = stateDcs.reduce(
      (sum, dc) => sum + parseNum(dc.props["power_mw"]),
      0,
    );
    const companies = [
      ...new Set(stateDcs.map((dc) => dc.company).filter(Boolean)),
    ];
    const scores = stateDcs
      .map((dc) => parseNum(dc.props["overall_score"]))
      .filter((s) => s > 0);
    const avgScore =
      scores.length > 0
        ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
        : 0;
    const tiers: Record<string, number> = {};
    for (const dc of stateDcs) {
      const t = String(dc.tier ?? dc.props["tier_design"] ?? "Not Specified");
      tiers[t] = (tiers[t] ?? 0) + 1;
    }
    kpi.dc = { count: stateDcs.length, totalPowerMw, companies, avgScore, tiers };
  }

  if (layerVis.airports) {
    const stateAirports = airportList.filter((a) =>
      statesMatch(stateName, a.state),
    );
    const totalSolarMw = stateAirports.reduce(
      (sum, a) => sum + parseNum(a.green_energy?.solar_capacity_installed_mw),
      0,
    );
    const totalPowerConsumptionMw = stateAirports.reduce(
      (sum, a) => sum + parseNum(a.operations?.power_consumption_mw),
      0,
    );
    const greenCount = stateAirports.filter((a) => a.is_notable_green).length;
    const operationalCount = stateAirports.filter((a) =>
      a.status?.toLowerCase().includes("operational"),
    ).length;
    const types: Record<string, number> = {};
    for (const a of stateAirports) {
      const t = a.type || "Unknown";
      types[t] = (types[t] ?? 0) + 1;
    }
    kpi.airport = {
      count: stateAirports.length,
      totalSolarMw,
      totalPowerConsumptionMw,
      greenCount,
      operationalCount,
      types,
    };
  }

  return kpi;
}

// ── Component ────────────────────────────────────────────────────────────────
export default function SolarWindMap({ onDatacenterClick, onLocationAnalyze }: Props) {
  const navigate = useNavigate();
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const marker = useRef<maplibregl.Marker | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [searchCoords, setSearchCoords] = useState({ lat: "", lng: "" });
  const [layerVis, setLayerVis] = useState<Record<LayerGroup, boolean>>({
    wind: true,
    solar: true,
    dc: true,
    airports: false,
  });
  const [dcPopup, setDcPopup] = useState<DcPopupState | null>(null);
  const [airportPopup, setAirportPopup] = useState<AirportPopupState | null>(null);
  const [markerPos, setMarkerPos] = useState<{ lat: number; lng: number } | null>(null);
  const [dcList, setDcList] = useState<DcEntry[]>([]);
  const [airportList, setAirportList] = useState<AirportEntry[]>([]);
  const [dcSearch, setDcSearch] = useState("");
  const [stateKpi, setStateKpi] = useState<StateKpiData | null>(null);

  // Refs to keep latest values accessible inside map event callbacks (closures)
  const layerVisRef = useRef(layerVis);
  const dcListRef = useRef<DcEntry[]>([]);
  const airportListRef = useRef<AirportEntry[]>([]);

  useEffect(() => { layerVisRef.current = layerVis; }, [layerVis]);
  useEffect(() => { dcListRef.current = dcList; }, [dcList]);
  useEffect(() => { airportListRef.current = airportList; }, [airportList]);

  const toggleGroup = (group: LayerGroup) => {
    setLayerVis((prev) => ({ ...prev, [group]: !prev[group] }));
  };

  // Load DC list for search autocomplete
  useEffect(() => {
    fetch("/api/v1/solar-assessment/data/datacenter-assessment")
      .then((res) => res.json())
      .then((data: GeoJSON.FeatureCollection) => {
        const list: DcEntry[] = data.features
          .filter(
            (f): f is GeoJSON.Feature<GeoJSON.Point> =>
              f.geometry.type === "Point",
          )
          .map((f) => ({
            ...(f.properties as Record<string, unknown>),
            name: String(f.properties?.["dc_name"] ?? f.properties?.["name"] ?? ""),
            company: String(f.properties?.["company"] ?? ""),
            address: f.properties?.["address"] as string | undefined,
            tier: (f.properties?.["tier_design"] ?? f.properties?.["tier"]) as string | undefined,
            id: f.properties?.["slno"] != null
              ? String(f.properties?.["slno"])
              : (f.properties?.["id"] as string | undefined),
            lng: (f.properties?.["lon"] ?? (f.geometry as GeoJSON.Point).coordinates[0] ?? 0) as number,
            lat: (f.properties?.["lat"] ?? (f.geometry as GeoJSON.Point).coordinates[1] ?? 0) as number,
            props: f.properties as Record<string, unknown>,
          }));
        setDcList(list);
      })
      .catch((err) => console.error("Failed to load DC list", err));
  }, []);

  // Load airport list
  useEffect(() => {
    fetch("/data/india_airports_unified.geojson")
      .then((res) => res.json())
      .then((data: GeoJSON.FeatureCollection) => {
        const list: AirportEntry[] = data.features
          .filter(
            (f): f is GeoJSON.Feature<GeoJSON.Point> =>
              f.geometry.type === "Point",
          )
          .map((f) => {
            const p = f.properties as Record<string, unknown>;
            const ge = p["green_energy"] as AirportEntry["green_energy"];
            const ops = p["operations"] as AirportEntry["operations"];
            return {
              slno: p["slno"] as number,
              airport_name: String(p["airport_name"] ?? ""),
              iata_code: p["iata_code"] as string | null,
              city: String(p["city"] ?? ""),
              state: String(p["state"] ?? ""),
              type: String(p["type"] ?? ""),
              status: String(p["status"] ?? ""),
              lat: (p["lat"] ?? (f.geometry as GeoJSON.Point).coordinates[1]) as number,
              lon: (p["lon"] ?? (f.geometry as GeoJSON.Point).coordinates[0]) as number,
              is_notable_green: Boolean(p["is_notable_green"]),
              green_energy: ge ?? null,
              operations: ops ?? null,
            };
          });
        setAirportList(list);
      })
      .catch((err) => console.error("Failed to load airport list", err));
  }, []);

  // Initialize MapLibre GL map
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
          datacenters: {
            type: "geojson",
            data: "/api/v1/solar-assessment/data/datacenter-assessment",
          },
          airports: {
            type: "geojson",
            data: "/data/india_airports_unified.geojson",
          },
          "india-states": {
            type: "geojson",
            data: "/data/india_states.geojson",
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
          // State boundaries (always visible, very subtle)
          {
            id: "states-fill",
            type: "fill",
            source: "india-states",
            paint: {
              "fill-color": "rgba(255,255,255,0)",
              "fill-opacity": 0,
            },
          },
          {
            id: "states-outline",
            type: "line",
            source: "india-states",
            paint: {
              "line-color": "rgba(255,255,255,0.18)",
              "line-width": 1,
            },
          },
          // State highlight on click
          {
            id: "states-highlight",
            type: "fill",
            source: "india-states",
            filter: ["==", "NAME_1", ""],
            paint: {
              "fill-color": "rgba(99,211,196,0.12)",
              "fill-opacity": 1,
            },
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
                "interpolate", ["linear"], ["heatmap-density"],
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
                "interpolate", ["linear"], ["heatmap-density"],
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
          // Airports glow
          {
            id: "airport-glow",
            type: "circle",
            source: "airports",
            layout: { visibility: "none" },
            paint: {
              "circle-radius": ["interpolate", ["linear"], ["zoom"], 4, 9, 10, 20, 14, 28],
              "circle-color": "#2563eb",
              "circle-opacity": 0.25,
              "circle-blur": 0.5,
            },
          },
          // Airports core
          {
            id: "airport-core",
            type: "circle",
            source: "airports",
            layout: { visibility: "none" },
            paint: {
              "circle-radius": ["interpolate", ["linear"], ["zoom"], 4, 5, 10, 10, 14, 14],
              "circle-color": [
                "case",
                ["boolean", ["get", "is_notable_green"], false],
                "#16a34a",
                "#2563eb",
              ],
              "circle-stroke-color": "#ffffff",
              "circle-stroke-width": 2,
              "circle-opacity": 1,
            },
          },
          // Airports label
          {
            id: "airport-label",
            type: "symbol",
            source: "airports",
            minzoom: 9,
            layout: {
              visibility: "none",
              "text-field": ["coalesce", ["get", "airport_name"], ""],
              "text-font": ["Open Sans Regular", "Arial Unicode MS Regular"],
              "text-size": 10,
              "text-anchor": "top",
              "text-offset": [0, 1.2],
              "text-max-width": 12,
              "text-allow-overlap": false,
            },
            paint: {
              "text-color": "#ffffff",
              "text-halo-color": "#1e3a5f",
              "text-halo-width": 1.8,
              "text-opacity": ["interpolate", ["linear"], ["zoom"], 9, 0, 10, 1],
            },
          },
          // Data centers glow
          {
            id: "dc-glow",
            type: "circle",
            source: "datacenters",
            paint: {
              "circle-radius": ["interpolate", ["linear"], ["zoom"], 4, 10, 10, 22, 14, 32],
              "circle-color": "#0f766e",
              "circle-opacity": 0.25,
              "circle-blur": 0.5,
            },
          },
          // Data centers core
          {
            id: "dc-core",
            type: "circle",
            source: "datacenters",
            paint: {
              "circle-radius": ["interpolate", ["linear"], ["zoom"], 4, 6, 10, 12, 14, 16],
              "circle-color": "#0f766e",
              "circle-stroke-color": "#ffffff",
              "circle-stroke-width": 2.5,
              "circle-opacity": 1,
            },
          },
          // Data centers label
          {
            id: "dc-label",
            type: "symbol",
            source: "datacenters",
            minzoom: 10,
            layout: {
              "text-field": [
                "step", ["zoom"],
                ["coalesce", ["get", "dc_name"], ["get", "name"], ""],
                13,
                [
                  "format",
                  ["coalesce", ["get", "dc_name"], ["get", "name"], ""], { "font-scale": 1.0 },
                  "\n", {},
                  [
                    "concat",
                    ["number-format", ["to-number", ["get", "lat"]], { "max-fraction-digits": 4 }],
                    "°N  ",
                    ["number-format", ["to-number", ["coalesce", ["get", "lon"], ["get", "lng"]]], { "max-fraction-digits": 4 }],
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
    map.current.on("load", () => setLoaded(true));

    // DC click — show popup
    map.current.on("click", "dc-core", (e) => {
      e.preventDefault();
      const feature = e.features?.[0];
      if (!feature) return;
      const coords = (feature.geometry as GeoJSON.Point).coordinates as [number, number];
      map.current?.flyTo({ center: coords, zoom: 17.5, duration: 1000 });
      setDcPopup({ dc: feature.properties as Record<string, unknown>, lat: coords[1], lng: coords[0] });
      setAirportPopup(null);
      setStateKpi(null);
    });

    map.current.on("mouseenter", "dc-core", () => {
      if (map.current) map.current.getCanvas().style.cursor = "pointer";
    });
    map.current.on("mouseleave", "dc-core", () => {
      if (map.current) map.current.getCanvas().style.cursor = "";
    });

    // Airport click — show popup
    map.current.on("click", "airport-core", (e) => {
      e.preventDefault();
      const feature = e.features?.[0];
      if (!feature) return;
      const coords = (feature.geometry as GeoJSON.Point).coordinates as [number, number];
      map.current?.flyTo({ center: coords, zoom: 13, duration: 1000 });
      const p = feature.properties as Record<string, unknown>;
      const parseJsonField = (val: unknown) => {
        if (typeof val === "string") { try { return JSON.parse(val); } catch { return null; } }
        return val ?? null;
      };
      const airport: AirportEntry = {
        slno: p["slno"] as number,
        airport_name: String(p["airport_name"] ?? ""),
        iata_code: p["iata_code"] as string | null,
        city: String(p["city"] ?? ""),
        state: String(p["state"] ?? ""),
        type: String(p["type"] ?? ""),
        status: String(p["status"] ?? ""),
        lat: coords[1],
        lon: coords[0],
        is_notable_green: Boolean(p["is_notable_green"]),
        green_energy: parseJsonField(p["green_energy"]) as AirportEntry["green_energy"],
        operations: parseJsonField(p["operations"]) as AirportEntry["operations"],
      };
      setAirportPopup({ airport, lat: coords[1], lng: coords[0] });
      setDcPopup(null);
      setStateKpi(null);
    });

    map.current.on("mouseenter", "airport-core", () => {
      if (map.current) map.current.getCanvas().style.cursor = "pointer";
    });
    map.current.on("mouseleave", "airport-core", () => {
      if (map.current) map.current.getCanvas().style.cursor = "";
    });

    // State click — show KPI overview
    map.current.on("click", "states-fill", (e) => {
      const feature = e.features?.[0];
      if (!feature) return;
      const stateName = String(feature.properties?.["NAME_1"] ?? "");
      if (!stateName) return;

      const currentLayerVis = layerVisRef.current;
      const hasActiveOverlay = currentLayerVis.dc || currentLayerVis.airports;
      if (!hasActiveOverlay) return;

      // Highlight clicked state
      if (map.current?.getLayer("states-highlight")) {
        map.current.setFilter("states-highlight", ["==", "NAME_1", stateName]);
      }

      const kpi = computeStateKpi(
        stateName,
        dcListRef.current,
        airportListRef.current,
        currentLayerVis,
      );
      setStateKpi(kpi);
      setDcPopup(null);
      setAirportPopup(null);
    });

    map.current.on("mouseenter", "states-fill", () => {
      if (map.current) map.current.getCanvas().style.cursor = "crosshair";
    });
    map.current.on("mouseleave", "states-fill", () => {
      if (map.current) map.current.getCanvas().style.cursor = "";
    });

    // General map click — place marker for custom location
    map.current.on("click", (e) => {
      const dcFeats = map.current?.queryRenderedFeatures(e.point, { layers: ["dc-core"] });
      if (dcFeats && dcFeats.length > 0) return;

      const airportFeats = map.current?.queryRenderedFeatures(e.point, { layers: ["airport-core"] });
      if (airportFeats && airportFeats.length > 0) return;

      // If a state overlay is active, state click handles it — don't place marker
      const stateFeats = map.current?.queryRenderedFeatures(e.point, { layers: ["states-fill"] });
      const currentLayerVis = layerVisRef.current;
      if (stateFeats && stateFeats.length > 0 && (currentLayerVis.dc || currentLayerVis.airports)) {
        return;
      }

      setDcPopup(null);
      setAirportPopup(null);
      setStateKpi(null);
      // Clear state highlight
      if (map.current?.getLayer("states-highlight")) {
        map.current.setFilter("states-highlight", ["==", "NAME_1", ""]);
      }

      const { lng, lat } = e.lngLat;
      const isIndia = lat >= 6.0 && lat <= 37.5 && lng >= 68.0 && lng <= 97.5;
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

      setMarkerPos({ lat, lng });
      setSearchCoords({ lat: lat.toFixed(6), lng: lng.toFixed(6) });
    });

    return () => {};
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
    // Clear state KPI and highlight when both DC and airport are toggled off
    if (!layerVis.dc && !layerVis.airports) {
      setStateKpi(null);
      if (map.current?.getLayer("states-highlight")) {
        map.current.setFilter("states-highlight", ["==", "NAME_1", ""]);
      }
    }
  }, [layerVis, loaded]);

  const flyToDc = (dc: DcEntry) => {
    if (!map.current) return;
    map.current.flyTo({ center: [dc.lng, dc.lat], zoom: 17.5, duration: 2000, essential: true });
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

  const closeStateKpi = () => {
    setStateKpi(null);
    if (map.current?.getLayer("states-highlight")) {
      map.current.setFilter("states-highlight", ["==", "NAME_1", ""]);
    }
  };

  return (
    <div className={fullscreen ? "map-fullscreen-overlay" : "w-full h-full absolute top-0 left-0 overflow-hidden"} style={{ fontFamily: "var(--font-family, 'Inter', 'Segoe UI', system-ui, sans-serif)" }}>
      <div ref={mapContainer} className="w-full h-full" />
      {/* Fullscreen toggle */}
      <button
        onClick={() => setFullscreen((f) => !f)}
        className="map-fullscreen-btn map-fullscreen-btn--icon"
        style={{ position: "absolute", bottom: 48, right: 12, zIndex: 20 }}
        title={fullscreen ? "Exit fullscreen" : "Enter fullscreen"}
      >
        {fullscreen ? "✕" : "⛶"}
      </button>

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
              onChange={(e) => setSearchCoords((p) => ({ ...p, lat: e.target.value }))}
              style={{ flex: 1, minWidth: 0, boxSizing: "border-box", background: "#f8fafc", border: "1px solid #e2e8f0", padding: "6px 8px", fontSize: "11px", fontWeight: 600, color: "#334155", outline: "none", fontFamily: "inherit" }}
            />
            <input
              type="text"
              placeholder="Lng"
              value={searchCoords.lng}
              onChange={(e) => setSearchCoords((p) => ({ ...p, lng: e.target.value }))}
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
              <X size={14} style={{ color: "#94a3b8", cursor: "pointer", flexShrink: 0 }} onClick={() => setDcSearch("")} />
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
          {(layerVis.dc || layerVis.airports) && (
            <div style={{ padding: "6px 12px 8px", borderTop: "1px solid #f1f5f9" }}>
              <div style={{ fontSize: "9px", color: "#94a3b8", fontWeight: 500 }}>
                Click a state to view KPI overview
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Custom location analyze panel */}
      <AnimatePresence>
        {markerPos && !dcPopup && !airportPopup && !stateKpi && (
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
                  if (marker.current) { marker.current.remove(); marker.current = null; }
                }}
                style={{ width: "28px", height: "28px", display: "flex", alignItems: "center", justifyContent: "center", background: "none", border: "1px solid #e2e8f0", cursor: "pointer", color: "#64748b", flexShrink: 0 }}
              >
                <X size={14} />
              </button>
              <button
                onClick={() => { onLocationAnalyze?.(markerPos.lat, markerPos.lng); }}
                style={{ background: "#1e293b", color: "#fff", border: "none", padding: "8px 16px", fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", flexShrink: 0, fontFamily: "inherit" }}
              >
                <Search size={12} />
                Analyze
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* State KPI Overview Panel */}
      <AnimatePresence>
        {stateKpi && (
          <motion.div
            key="state-kpi-panel"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 max-w-[95vw]"
            style={{ width: stateKpi.dc && stateKpi.airport ? "760px" : "560px" }}
          >
            <div style={{ background: "#fff", border: "1px solid #e2e8f0", boxShadow: "0 16px 48px rgba(0,0,0,0.2)", overflow: "hidden" }}>
              {/* Header */}
              <div style={{ padding: "14px 20px", background: "linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <MapPin size={14} style={{ color: "#5eead4" }} />
                  <div>
                    <div style={{ fontSize: "9px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.1em" }}>State Overview</div>
                    <div style={{ fontSize: "16px", fontWeight: 700, color: "#fff", lineHeight: 1.2 }}>{stateKpi.stateName}</div>
                  </div>
                </div>
                <button
                  onClick={closeStateKpi}
                  style={{ width: "28px", height: "28px", display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.15)", cursor: "pointer", color: "#fff", borderRadius: "2px" }}
                >
                  <X size={14} />
                </button>
              </div>

              {/* KPI Body */}
              <div style={{ display: "flex", gap: 0 }}>
                {/* DC KPIs */}
                {stateKpi.dc && (
                  <div style={{ flex: 1, padding: "16px 20px", borderRight: stateKpi.airport ? "1px solid #e2e8f0" : "none" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "7px", marginBottom: "14px" }}>
                      <Server size={13} style={{ color: "#0f766e" }} />
                      <span style={{ fontSize: "11px", fontWeight: 700, color: "#0f766e", textTransform: "uppercase", letterSpacing: "0.08em" }}>Data Centers</span>
                      {stateKpi.dc.count === 0 && (
                        <span style={{ fontSize: "10px", color: "#94a3b8" }}>— none in dataset</span>
                      )}
                    </div>
                    {stateKpi.dc.count > 0 ? (
                      <>
                        {/* Main metrics */}
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "12px" }}>
                          <KpiTile
                            label="Total Data Centers"
                            value={String(stateKpi.dc.count)}
                            unit=""
                            accent="#0f766e"
                            icon={<Server size={11} />}
                          />
                          <KpiTile
                            label="Total Power Capacity"
                            value={stateKpi.dc.totalPowerMw > 0 ? stateKpi.dc.totalPowerMw.toFixed(0) : "—"}
                            unit={stateKpi.dc.totalPowerMw > 0 ? "MW" : ""}
                            accent="#7c3aed"
                            icon={<Building2 size={11} />}
                          />
                          <KpiTile
                            label="Avg RE Score"
                            value={stateKpi.dc.avgScore > 0 ? String(stateKpi.dc.avgScore) : "—"}
                            unit={stateKpi.dc.avgScore > 0 ? "/100" : ""}
                            accent="#0891b2"
                            icon={<Sun size={11} />}
                          />
                          <KpiTile
                            label="Companies"
                            value={String(stateKpi.dc.companies.length)}
                            unit=""
                            accent="#d97706"
                            icon={<Building2 size={11} />}
                          />
                        </div>
                        {/* Companies list */}
                        {stateKpi.dc.companies.length > 0 && (
                          <div style={{ marginBottom: "10px" }}>
                            <div style={{ fontSize: "9px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "6px" }}>Companies</div>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                              {stateKpi.dc.companies.slice(0, 6).map((c) => (
                                <span key={c} style={{ padding: "2px 8px", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "2px", fontSize: "9px", fontWeight: 600, color: "#166534" }}>{c}</span>
                              ))}
                              {stateKpi.dc.companies.length > 6 && (
                                <span style={{ padding: "2px 8px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "2px", fontSize: "9px", color: "#64748b" }}>+{stateKpi.dc.companies.length - 6} more</span>
                              )}
                            </div>
                          </div>
                        )}
                        {/* Tier breakdown */}
                        {Object.keys(stateKpi.dc.tiers).length > 0 && (
                          <div>
                            <div style={{ fontSize: "9px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "6px" }}>Tier Breakdown</div>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                              {Object.entries(stateKpi.dc.tiers).map(([tier, count]) => (
                                <span key={tier} style={{ padding: "2px 8px", background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "2px", fontSize: "9px", fontWeight: 600, color: "#1d4ed8" }}>
                                  {tier}: {count}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      <div style={{ fontSize: "11px", color: "#94a3b8", padding: "8px 0" }}>
                        No data centers found for this state in the current dataset.
                      </div>
                    )}
                  </div>
                )}

                {/* Airport KPIs */}
                {stateKpi.airport && (
                  <div style={{ flex: 1, padding: "16px 20px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "7px", marginBottom: "14px" }}>
                      <Plane size={13} style={{ color: "#2563eb" }} />
                      <span style={{ fontSize: "11px", fontWeight: 700, color: "#2563eb", textTransform: "uppercase", letterSpacing: "0.08em" }}>Airports</span>
                      {stateKpi.airport.count === 0 && (
                        <span style={{ fontSize: "10px", color: "#94a3b8" }}>— none found</span>
                      )}
                    </div>
                    {stateKpi.airport.count > 0 ? (
                      <>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "12px" }}>
                          <KpiTile
                            label="Total Airports"
                            value={String(stateKpi.airport.count)}
                            unit=""
                            accent="#2563eb"
                            icon={<Plane size={11} />}
                          />
                          <KpiTile
                            label="Solar Capacity"
                            value={stateKpi.airport.totalSolarMw > 0 ? stateKpi.airport.totalSolarMw.toFixed(1) : "—"}
                            unit={stateKpi.airport.totalSolarMw > 0 ? "MW" : ""}
                            accent="#eab308"
                            icon={<Sun size={11} />}
                          />
                          <KpiTile
                            label="Power Consumption"
                            value={stateKpi.airport.totalPowerConsumptionMw > 0 ? stateKpi.airport.totalPowerConsumptionMw.toFixed(1) : "—"}
                            unit={stateKpi.airport.totalPowerConsumptionMw > 0 ? "MW" : ""}
                            accent="#7c3aed"
                            icon={<Building2 size={11} />}
                          />
                          <KpiTile
                            label="Green Airports"
                            value={String(stateKpi.airport.greenCount)}
                            unit={`/ ${stateKpi.airport.count}`}
                            accent="#16a34a"
                            icon={<Wind size={11} />}
                          />
                        </div>
                        {/* Operational */}
                        <div style={{ padding: "8px 10px", background: "#f8fafc", border: "1px solid #e2e8f0", marginBottom: "10px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                          <span style={{ fontSize: "10px", fontWeight: 600, color: "#475569" }}>Operational</span>
                          <span style={{ fontSize: "12px", fontWeight: 700, color: "#0f766e" }}>
                            {stateKpi.airport.operationalCount} / {stateKpi.airport.count}
                          </span>
                        </div>
                        {/* Type breakdown */}
                        {Object.keys(stateKpi.airport.types).length > 0 && (
                          <div>
                            <div style={{ fontSize: "9px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "6px" }}>By Type</div>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                              {Object.entries(stateKpi.airport.types).map(([type, count]) => (
                                <span key={type} style={{ padding: "2px 8px", background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "2px", fontSize: "9px", fontWeight: 600, color: "#1d4ed8" }}>
                                  {type}: {count}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      <div style={{ fontSize: "11px", color: "#94a3b8", padding: "8px 0" }}>
                        No airports matched for this state.
                      </div>
                    )}
                  </div>
                )}
              </div>
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
                  src={`https://services.arcgisonline.com/arcgis/rest/services/World_Imagery/MapServer/export?bbox=${dcPopup.lng - 0.008},${dcPopup.lat - 0.004},${dcPopup.lng + 0.008},${dcPopup.lat + 0.004}&bboxSR=4326&imageSR=4326&size=1200,480&format=jpg&f=image`}
                  alt="Satellite View"
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  onError={(e) => {
                    const img = e.currentTarget;
                    img.style.display = "none";
                    const parent = img.parentElement;
                    if (parent && !parent.querySelector(".sat-fallback")) {
                      const fb = document.createElement("div");
                      fb.className = "sat-fallback";
                      fb.style.cssText = "width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;background:#0f172a;";
                      fb.innerHTML = `<div style="font-family:monospace;font-size:13px;color:#5eead4;font-weight:700">${dcPopup.lat.toFixed(5)}°N · ${dcPopup.lng.toFixed(5)}°E</div><div style="font-size:11px;color:#64748b">Satellite imagery unavailable</div>`;
                      parent.appendChild(fb);
                    }
                  }}
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
                    <div
                      onClick={() => navigate("/projects/developer-profiles")}
                      style={{ fontSize: "10px", fontWeight: 700, color: "#0f766e", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "4px", cursor: "pointer", textDecoration: "underline dotted", textUnderlineOffset: "3px" }}
                      title="View developer profile"
                    >
                      {String(dcPopup.dc["company"] ?? "")}
                    </div>
                    <h3 style={{ fontSize: "18px", fontWeight: 700, color: "#1e293b", lineHeight: 1.2 }}>
                      {String(dcPopup.dc["dc_name"] ?? dcPopup.dc["name"] ?? "")}
                    </h3>
                  </div>
                  <div style={{ padding: "4px 10px", border: "1px solid #e2e8f0", fontSize: "10px", fontWeight: 700, color: "#475569", textTransform: "uppercase" }}>
                    {String(dcPopup.dc["tier_design"] ?? dcPopup.dc["tier"] ?? "")}
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

      {/* Airport popup card */}
      <AnimatePresence>
        {airportPopup && (
          <motion.div
            key="airport-popup"
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 60 }}
            className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 w-[500px] max-w-[95vw]"
          >
            <div style={{ background: "#fff", border: "1px solid #e2e8f0", boxShadow: "0 16px 48px rgba(0,0,0,0.2)", overflow: "hidden" }}>
              {/* Header */}
              <div style={{ padding: "16px 20px", background: "linear-gradient(135deg, #1e3a5f 0%, #1d4ed8 100%)", position: "relative" }}>
                <button
                  onClick={() => setAirportPopup(null)}
                  style={{ position: "absolute", top: "12px", right: "12px", width: "28px", height: "28px", display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,0.15)", border: "none", color: "#fff", cursor: "pointer" }}
                >
                  <X size={14} />
                </button>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <Plane size={18} style={{ color: "#93c5fd" }} />
                  <div>
                    {airportPopup.airport.iata_code && (
                      <div style={{ fontSize: "10px", fontWeight: 700, color: "#93c5fd", letterSpacing: "0.12em", marginBottom: "2px" }}>
                        {airportPopup.airport.iata_code}
                      </div>
                    )}
                    <div style={{ fontSize: "17px", fontWeight: 700, color: "#fff", lineHeight: 1.2 }}>
                      {airportPopup.airport.airport_name}
                    </div>
                    <div style={{ fontSize: "11px", color: "#bfdbfe", marginTop: "2px" }}>
                      {airportPopup.airport.city}, {airportPopup.airport.state}
                    </div>
                  </div>
                </div>
              </div>

              {/* Info grid */}
              <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: "12px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
                  <AirportKpiCell label="Type" value={airportPopup.airport.type} />
                  <AirportKpiCell label="Status" value={airportPopup.airport.status} />
                  <AirportKpiCell
                    label="Green"
                    value={airportPopup.airport.is_notable_green ? "Yes 🌿" : "No"}
                    accent={airportPopup.airport.is_notable_green ? "#16a34a" : undefined}
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                  <AirportKpiCell
                    label="Solar Capacity"
                    value={
                      airportPopup.airport.green_energy?.solar_capacity_installed_mw
                        ? `${airportPopup.airport.green_energy.solar_capacity_installed_mw} MW`
                        : "—"
                    }
                    accent="#eab308"
                  />
                  <AirportKpiCell
                    label="Power Consumption"
                    value={
                      airportPopup.airport.operations?.power_consumption_mw
                        ? `${airportPopup.airport.operations.power_consumption_mw} MW`
                        : "—"
                    }
                    accent="#7c3aed"
                  />
                  <AirportKpiCell
                    label="Annual Generation"
                    value={
                      airportPopup.airport.green_energy?.annual_generation_mu
                        ? `${airportPopup.airport.green_energy.annual_generation_mu} MU`
                        : "—"
                    }
                    accent="#0891b2"
                  />
                  <AirportKpiCell
                    label="Green Coverage"
                    value={airportPopup.airport.green_energy?.pct_green_coverage ?? "—"}
                    accent="#16a34a"
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                  <AirportKpiCell
                    label="Carbon / ACI Level"
                    value={airportPopup.airport.green_energy?.carbon_neutral_aci_level ?? "—"}
                  />
                  <div style={{ padding: "10px", background: "#f8fafc", border: "1px solid #e2e8f0" }}>
                    <div style={{ fontSize: "9px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "4px" }}>Coordinates</div>
                    <div style={{ fontFamily: "monospace", fontSize: "10px", fontWeight: 700, color: "#334155" }}>
                      {airportPopup.lat.toFixed(4)}°N · {airportPopup.lng.toFixed(4)}°E
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────
function KpiTile({
  label,
  value,
  unit,
  accent,
  icon,
}: {
  label: string;
  value: string;
  unit: string;
  accent: string;
  icon: React.ReactNode;
}) {
  return (
    <div style={{ padding: "10px 12px", background: "#f8fafc", border: "1px solid #e2e8f0" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "5px", marginBottom: "6px" }}>
        <span style={{ color: accent }}>{icon}</span>
        <span style={{ fontSize: "9px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</span>
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: "3px" }}>
        <span style={{ fontSize: "20px", fontWeight: 800, color: "#1e293b", fontVariantNumeric: "tabular-nums" }}>{value}</span>
        {unit && <span style={{ fontSize: "11px", fontWeight: 600, color: "#64748b" }}>{unit}</span>}
      </div>
    </div>
  );
}

function AirportKpiCell({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div style={{ padding: "10px 12px", background: "#f8fafc", border: "1px solid #e2e8f0" }}>
      <div style={{ fontSize: "9px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "4px" }}>{label}</div>
      <div style={{ fontSize: "12px", fontWeight: 700, color: accent ?? "#334155" }}>{value}</div>
    </div>
  );
}
