import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { FeatureCollection, Point } from "geojson";
import { motion, AnimatePresence } from "framer-motion";
import { geocodeFacilities, geocodeAddresses } from "../api/dataCenters";
import { fetchAirports } from "../api/airports";

// ── Satellite map style (ESRI World Imagery) ─────────────────────────────────
const SATELLITE_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    esri: {
      type: "raster",
      tiles: [
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      ],
      tileSize: 256,
      attribution: "Tiles © Esri — Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community",
      maxzoom: 19,
    },
    esri_labels: {
      type: "raster",
      tiles: [
        "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
      ],
      tileSize: 256,
      maxzoom: 19,
    },
  },
  layers: [
    { id: "esri-satellite", type: "raster", source: "esri" },
    { id: "esri-labels", type: "raster", source: "esri_labels", paint: { "raster-opacity": 0.85 } },
  ],
  glyphs: "https://fonts.openmaptiles.org/{fontstack}/{range}.pbf",
  sprite: "",
};

type LayerMode = "dc" | "airports";

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

// ── fallback city coordinates [lng, lat] ───────────────────────────────────
const CITY_COORDS: Record<string, [number, number]> = {
  "mumbai": [72.8777, 19.0760], "navi mumbai": [73.0169, 19.0368],
  "thane": [72.9781, 19.2183], "pune": [73.8567, 18.5204],
  "nashik": [73.7898, 19.9975], "nagpur": [79.0882, 21.1458],
  "aurangabad": [75.3433, 19.8762], "delhi": [77.2090, 28.6139],
  "new delhi": [77.2090, 28.6139], "noida": [77.3910, 28.5355],
  "gurugram": [77.0266, 28.4595], "gurgaon": [77.0266, 28.4595],
  "faridabad": [77.3178, 28.4089], "ghaziabad": [77.4538, 28.6692],
  "greater noida": [77.5040, 28.4744], "bangalore": [77.5946, 12.9716],
  "bengaluru": [77.5946, 12.9716], "mysore": [76.6394, 12.2958],
  "mysuru": [76.6394, 12.2958], "hyderabad": [78.4867, 17.3850],
  "secunderabad": [78.5012, 17.4399], "chennai": [80.2707, 13.0827],
  "coimbatore": [76.9558, 11.0168], "madurai": [78.1198, 9.9252],
  "kolkata": [88.3639, 22.5726], "calcutta": [88.3639, 22.5726],
  "ahmedabad": [72.5714, 23.0225], "surat": [72.8311, 21.1702],
  "vadodara": [73.1812, 22.3072], "rajkot": [70.8022, 22.3039],
  "jaipur": [75.7873, 26.9124], "jodhpur": [73.0243, 26.2389],
  "udaipur": [73.6816, 24.5854], "lucknow": [80.9462, 26.8467],
  "agra": [77.9082, 27.1767], "kanpur": [80.3319, 26.4499],
  "varanasi": [82.9739, 25.3176], "kochi": [76.2673, 9.9312],
  "cochin": [76.2673, 9.9312], "thiruvananthapuram": [76.9366, 8.5241],
  "trivandrum": [76.9366, 8.5241], "kozhikode": [75.7804, 11.2588],
  "chandigarh": [76.7794, 30.7333], "amritsar": [74.8723, 31.6340],
  "ludhiana": [75.8573, 30.9010], "bhubaneswar": [85.8245, 20.2961],
  "patna": [85.1376, 25.5941], "indore": [75.8577, 22.7196],
  "bhopal": [77.4126, 23.2599], "gwalior": [78.1828, 26.2183],
  "visakhapatnam": [83.2185, 17.6868], "vizag": [83.2185, 17.6868],
  "vijayawada": [80.6480, 16.5062], "raipur": [81.6296, 21.2514],
  "ranchi": [85.3294, 23.3441], "jamshedpur": [86.1844, 22.8046],
  "guwahati": [91.7362, 26.1445], "dehradun": [78.0322, 30.3165],
  "shimla": [77.1734, 31.1048], "srinagar": [74.7973, 34.0837],
  "jammu": [74.8579, 32.7266], "panaji": [73.8278, 15.4909],
  "mangalore": [74.8560, 12.9141], "mangaluru": [74.8560, 12.9141],
  "hubli": [75.1240, 15.3647], "salem": [78.1559, 11.6643],
  "tiruchirappalli": [78.7047, 10.7905], "trichy": [78.7047, 10.7905],
  "tiruppur": [77.3411, 11.1085],
};

// ── fallback state-centre coordinates [lng, lat] ────────────────────────────
const STATE_COORDS: Record<string, [number, number]> = {
  "Maharashtra": [75.7139, 19.7515], "Delhi": [77.1025, 28.7041],
  "Karnataka": [75.7139, 15.3173], "Tamil Nadu": [78.6569, 11.1271],
  "Telangana": [79.0193, 17.8495], "Gujarat": [71.1924, 22.2587],
  "West Bengal": [87.8550, 22.9868], "Uttar Pradesh": [80.9462, 26.8467],
  "Rajasthan": [74.2179, 27.0238], "Kerala": [76.2711, 10.8505],
  "Punjab": [75.3412, 31.1471], "Haryana": [76.0856, 29.0588],
  "Andhra Pradesh": [79.7400, 15.9129], "Odisha": [85.0985, 20.9517],
  "Bihar": [85.3131, 25.0961], "Madhya Pradesh": [78.6569, 23.4733],
  "Jharkhand": [85.2799, 23.6102], "Goa": [74.1240, 15.2993],
  "Chhattisgarh": [81.8661, 21.2787], "Himachal Pradesh": [77.1734, 31.1048],
  "Uttarakhand": [79.0193, 30.0668], "Assam": [92.9376, 26.2006],
  "Jammu & Kashmir": [74.7973, 34.0837], "Puducherry": [79.8083, 11.9416],
  "Chandigarh": [76.7794, 30.7333], "Sikkim": [88.5122, 27.5330],
  "Tripura": [91.9882, 23.9408], "Meghalaya": [91.3662, 25.4670],
  "Manipur": [93.9063, 24.6637], "Nagaland": [94.5624, 26.1584],
  "Arunachal Pradesh": [94.7278, 28.2180], "Mizoram": [92.9376, 23.1645],
};

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
  0,    "rgba(0,0,0,0)",
  0.01, "#4338ca",
  0.15, "#0ea5e9",
  0.35, "#34d399",
  0.6,  "#fbbf24",
  0.8,  "#f97316",
  1,    "#dc2626",
] as unknown as maplibregl.ExpressionSpecification;

const MW_COLOR = [
  "interpolate", ["linear"], ["heatmap-density"],
  0,    "rgba(0,0,0,0)",
  0.01, "#d9f99d",
  0.15, "#86efac",
  0.4,  "#fde68a",
  0.7,  "#f97316",
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
  // Keep a ref to the latest GeoJSON so the map `load` handler can seed the
  // source with real data even when the async load fires AFTER data arrives.
  const geoJSONRef  = useRef<FeatureCollection>({ type: "FeatureCollection", features: [] });
  const airportGeoJSONRef = useRef<FeatureCollection>({ type: "FeatureCollection", features: [] });
  const [loaded, setLoaded]   = useState(false);
  const [mode, setMode]       = useState<HeatmapMode>("count");
  const [popup, setPopup]     = useState<DCPopup | null>(null);
  const [selState, setSelState] = useState<string | null>(null);
  const [layerMode, setLayerMode] = useState<LayerMode>("dc");
  const [fullscreen, setFullscreen] = useState(false);

  // Fetch airports for toggle
  const airportsQuery = useQuery({
    queryKey: ["airports-heatmap"],
    queryFn: () => fetchAirports({ status: "Operational" }),
    staleTime: 5 * 60 * 1000,
  });

  // geocoding UX
  const [cityGeocodeState, setCityGeocodeState] = useState<
    "idle" | "running" | "done"
  >("idle");
  const [addrGeocodeState, setAddrGeocodeState] = useState<
    "idle" | "running" | "done" | "error"
  >("idle");
  const [addrGeocodeMsg, setAddrGeocodeMsg] = useState("");

  // ── derived data ────────────────────────────────────────────────────────────
  // DCs with real geocoded coordinates (used for coverage counter + geocode trigger)
  const geocodedDCs = useMemo(
    () => dataCenters.filter((d) => d.lat != null && d.lng != null),
    [dataCenters]
  );

  // DCs for heatmap display: real coords first, then city fallback, then state centre
  const mappedDCs = useMemo(
    () =>
      dataCenters
        .map((d): DCHeatMapEntry | null => {
          if (d.lat != null && d.lng != null) return d;
          const ck = d.city.toLowerCase().trim();
          const cc = CITY_COORDS[ck];
          if (cc) return { ...d, lat: cc[1], lng: cc[0] };
          const sc = STATE_COORDS[normState(d.state)];
          if (sc) return { ...d, lat: sc[1], lng: sc[0] };
          return null;
        })
        .filter((d): d is DCHeatMapEntry => d !== null),
    [dataCenters]
  );

  const unmappedCount = dataCenters.length - geocodedDCs.length;

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

  // Keep ref in sync so the map `load` handler always sees the latest data
  geoJSONRef.current = facilitiesGeoJSON;

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

  // ── airport GeoJSON ─────────────────────────────────────────────────────────
  const airportGeoJSON = useMemo<FeatureCollection>(() => ({
    type: "FeatureCollection",
    features: (airportsQuery.data?.airports ?? [])
      .filter((a) => a.latitude != null && a.longitude != null)
      .map((a) => ({
        type: "Feature",
        geometry: { type: "Point", coordinates: [a.longitude!, a.latitude!] },
        properties: {
          name:    a["Airport Name"],
          city:    a.City,
          state:   a["State / UT"],
          status:  a.Status,
          is_green: a.is_green,
          power_mw: Number(a["Power Consumption (MW)"] ?? 0),
          solar_mw: Number(a["Solar Capacity Installed (MW)"] ?? 0),
          count_weight: 1,
          mw_weight: Math.min(1, Number(a["Power Consumption (MW)"] ?? 0) / 200),
        },
      })),
  }), [airportsQuery.data]);

  airportGeoJSONRef.current = airportGeoJSON;

  // ── map init ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (map.current || !mapRef.current) return;

    map.current = new maplibregl.Map({
      container: mapRef.current,
      style:     SATELLITE_STYLE,
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

      // ── source — seed with latest data immediately (avoids empty flash) ──────
      map.current.addSource("dcs", {
        type: "geojson",
        data: geoJSONRef.current,
      });

      // ── heatmap layer (fades out past zoom 10) ──────────────────────────────
      map.current.addLayer({
        id:     "dc-heat",
        type:   "heatmap",
        source: "dcs",
        paint: {
          // weight = 1 for count mode; updated via setPaintProperty for MW mode
          "heatmap-weight":    1,
          "heatmap-intensity": [
            "interpolate", ["linear"], ["zoom"], 0, 2, 9, 8,
          ],
          "heatmap-radius": [
            "interpolate", ["linear"], ["zoom"], 2, 30, 4, 55, 7, 85, 9, 120,
          ],
          "heatmap-opacity": [
            "interpolate", ["linear"], ["zoom"], 0, 1, 9, 0.9, 11, 0,
          ],
          "heatmap-color": COUNT_COLOR,
        },
      });

      // ── glow ring — visible at ALL zooms, fades in from zoom 4 ──────────────
      map.current.addLayer({
        id:      "dc-glow",
        type:    "circle",
        source:  "dcs",
        paint: {
          "circle-radius": [
            "interpolate", ["linear"], ["zoom"], 4, 8, 8, 16, 14, 30,
          ],
          "circle-color":   STATUS_COLOR("#64748b"),
          "circle-opacity": [
            "interpolate", ["linear"], ["zoom"], 4, 0, 5, 0.12, 9, 0.22,
          ],
          "circle-blur": 1.2,
        },
      });

      // ── core circle — visible at ALL zooms, fully opaque from zoom 4 ─────────
      map.current.addLayer({
        id:      "dc-core",
        type:    "circle",
        source:  "dcs",
        paint: {
          "circle-radius": [
            "interpolate", ["linear"], ["zoom"], 4, 4, 8, 6, 14, 14,
          ],
          "circle-color":        STATUS_COLOR("#64748b"),
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": ["interpolate", ["linear"], ["zoom"], 4, 1, 8, 2],
          "circle-opacity":      [
            "interpolate", ["linear"], ["zoom"], 4, 0.85, 8, 0.9, 9, 1,
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

      // ── airport source + layers ─────────────────────────────────────────────
      map.current.addSource("airports", {
        type: "geojson",
        data: airportGeoJSONRef.current,
      });

      map.current.addLayer({
        id:      "airport-heat",
        type:    "heatmap",
        source:  "airports",
        layout:  { visibility: "none" },
        paint: {
          "heatmap-weight": 1,
          "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 0, 2, 9, 8],
          "heatmap-radius":   ["interpolate", ["linear"], ["zoom"], 2, 30, 4, 55, 7, 85, 9, 120],
          "heatmap-opacity":  ["interpolate", ["linear"], ["zoom"], 0, 1, 9, 0.9, 11, 0],
          "heatmap-color": COUNT_COLOR,
        },
      });

      map.current.addLayer({
        id:      "airport-core",
        type:    "circle",
        source:  "airports",
        layout:  { visibility: "none" },
        paint: {
          "circle-radius":       ["interpolate", ["linear"], ["zoom"], 4, 5, 8, 8, 14, 16],
          "circle-color":        "#0ea5e9",
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 2,
          "circle-opacity":      ["interpolate", ["linear"], ["zoom"], 4, 0.85, 9, 1],
        },
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

  // ── push airport GeoJSON ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!loaded || !map.current) return;
    const src = map.current.getSource("airports") as maplibregl.GeoJSONSource | undefined;
    src?.setData(airportGeoJSON);
  }, [loaded, airportGeoJSON]);

  // ── switch visible layer when layerMode changes ──────────────────────────────
  useEffect(() => {
    if (!loaded || !map.current) return;
    const dcLayers    = ["dc-heat", "dc-glow", "dc-core", "dc-label"];
    const airpLayers  = ["airport-heat", "airport-core"];
    const dcVis    = layerMode === "dc"       ? "visible" : "none";
    const airpVis  = layerMode === "airports" ? "visible" : "none";
    dcLayers.forEach((id) => map.current?.setLayoutProperty(id, "visibility", dcVis));
    airpLayers.forEach((id) => map.current?.setLayoutProperty(id, "visibility", airpVis));
  }, [loaded, layerMode]);

  // ── update heatmap weight + color ramp when mode changes ────────────────────
  useEffect(() => {
    if (!loaded || !map.current) return;
    // For MW mode, weight by mw_weight (normalised 0-1); for count mode, equal weight of 1
    const weight: maplibregl.ExpressionSpecification | number =
      mode === "mw"
        ? (["interpolate", ["linear"], ["get", "mw_weight"], 0, 0.05, 1, 1] as unknown as maplibregl.ExpressionSpecification)
        : 1;
    map.current.setPaintProperty("dc-heat", "heatmap-weight", weight);
    map.current.setPaintProperty("dc-heat", "heatmap-color",
      mode === "count" ? COUNT_COLOR : MW_COLOR
    );
  }, [loaded, mode]);

  // ── auto-trigger fast (city-centroid) geocoding if no DCs have real coords ──
  useEffect(() => {
    if (cityGeocodeState !== "idle") return;
    if (dataCenters.length === 0) return;
    if (geocodedDCs.length > 0) return; // already have real coordinates
    setCityGeocodeState("running");
    geocodeFacilities()
      .then((r) => {
        if (r.resolved > 0) {
          void queryClient.invalidateQueries({ queryKey: ["dc-facilities"] });
        }
      })
      .catch(console.error)
      .finally(() => setCityGeocodeState("done"));
  }, [cityGeocodeState, dataCenters.length, geocodedDCs.length, queryClient]);

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
  const mapControls = (
    <>
      {/* DC / Airport toggle */}
      <div className="heatmap-toggle" style={{ position: "absolute", top: 12, left: 12, zIndex: 10 }}>
        <button
          className={`heatmap-tab-btn${layerMode === "dc" ? " active" : ""}`}
          onClick={() => setLayerMode("dc")}
        >
          🏢 Data Centers
        </button>
        <button
          className={`heatmap-tab-btn${layerMode === "airports" ? " active" : ""}`}
          onClick={() => setLayerMode("airports")}
        >
          ✈ Airports
        </button>
      </div>
      {/* Fullscreen toggle */}
      <button
        className="map-fullscreen-btn"
        onClick={() => setFullscreen((f) => !f)}
        style={{ position: "absolute", top: 12, right: 12, zIndex: 10 }}
        title="Toggle fullscreen"
      >
        ⛶ Fullscreen
      </button>
    </>
  );

  return (
    <>
    <div className={`dc-heatmap-root${fullscreen ? " dc-heatmap-root--fullscreen" : ""}`}>
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
              {geocodedDCs.length}/{dataCenters.length} DCs geocoded
            </div>
          </div>
        </aside>

        {/* ─ Main Map ───────────────────────────────────────────────────────── */}
        <div className="dc-heatmap-map-wrap" style={{ position: "relative" }}>
          <div className="dc-heatmap-map-inner" ref={mapRef} />
          {mapControls}

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
        {layerMode === "airports"
          ? "Airport heatmap shows India's commercial and civil aviation infrastructure. Toggle to Data Centers to switch view."
          : mode === "count"
            ? "Heatmap shows geographic density of data centers. Switch to MW mode to visualise power concentration."
            : "Heatmap intensity is weighted by power capacity (MW). Zoom in past level 9 to reveal individual facilities."}
      </div>
    </div>
    </>
  );
}

export default DataCenterHeatMap;
