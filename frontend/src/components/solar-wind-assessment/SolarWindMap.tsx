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
}

// ── Constants ────────────────────────────────────────────────────────────────
const LAYER_GROUPS = ["wind", "solar", "dc"] as const;
type LayerGroup = (typeof LAYER_GROUPS)[number];

const TOGGLE_GROUPS: {
  key: LayerGroup;
  label: string;
  icon: React.ReactNode;
  bgOn: string;
  borderOn: string;
}[] = [
  {
    key: "wind",
    label: "Wind",
    icon: <Wind size={12} />,
    bgOn: "bg-cyan-500",
    borderOn: "border-cyan-400",
  },
  {
    key: "solar",
    label: "Solar",
    icon: <Sun size={12} />,
    bgOn: "bg-yellow-400",
    borderOn: "border-yellow-300",
  },
  {
    key: "dc",
    label: "Data Centers",
    icon: <Server size={12} />,
    bgOn: "bg-violet-500",
    borderOn: "border-violet-400",
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
];

// ── Component ────────────────────────────────────────────────────────────────
export default function SolarWindMap({ onDatacenterClick }: Props) {
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
          // Data centers glow
          {
            id: "dc-glow",
            type: "circle",
            source: "datacenters",
            paint: {
              "circle-radius": ["interpolate", ["linear"], ["zoom"], 4, 10, 10, 22, 14, 32],
              "circle-color": "#a855f7",
              "circle-opacity": 0.3,
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
              "circle-color": "#c084fc",
              "circle-stroke-color": "#ffffff",
              "circle-stroke-width": 2.5,
              "circle-opacity": 1,
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
    <div className="w-full h-full absolute top-0 left-0 bg-slate-950 overflow-hidden font-sans">
      <div ref={mapContainer} className="w-full h-full" />

      {/* Left top: Jump to coords */}
      <div className="absolute top-6 left-6 z-10 w-64">
        <form
          onSubmit={handleSearch}
          className="bg-white/95 backdrop-blur-md p-4 rounded-3xl shadow-2xl border border-slate-200/50 space-y-3 ring-1 ring-black/[0.03]"
        >
          <div className="flex items-center gap-2 mb-1 px-1">
            <Navigation size={12} className="text-blue-500" />
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
              Jump to Coords
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              placeholder="Lat (8.25)"
              value={searchCoords.lat}
              onChange={(e) =>
                setSearchCoords((p) => ({ ...p, lat: e.target.value }))
              }
              className="bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/15"
            />
            <input
              type="text"
              placeholder="Lng (77.51)"
              value={searchCoords.lng}
              onChange={(e) =>
                setSearchCoords((p) => ({ ...p, lng: e.target.value }))
              }
              className="bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/15"
            />
          </div>
          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-2.5 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-200"
          >
            <Search size={14} /> Analyze Location
          </button>
        </form>
      </div>

      {/* Center top: DC search */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 z-10 w-96">
        <div className="relative">
          <div className="bg-white/95 backdrop-blur-xl px-6 py-4 rounded-full shadow-2xl border border-slate-200/50 flex items-center gap-4 ring-1 ring-violet-500/10 transition-all focus-within:ring-violet-500/30">
            <Server size={18} className="text-violet-500" />
            <input
              type="text"
              placeholder="SEARCH DATA CENTERS..."
              value={dcSearch}
              onChange={(e) => setDcSearch(e.target.value)}
              className="bg-transparent border-none focus:outline-none text-[11px] font-black text-slate-700 w-full placeholder:text-slate-300 tracking-wider"
            />
            {dcSearch && (
              <X
                size={16}
                className="text-slate-400 cursor-pointer hover:text-slate-600 transition-colors"
                onClick={() => setDcSearch("")}
              />
            )}
          </div>
          <AnimatePresence>
            {filteredDcs.length > 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                className="absolute top-full mt-3 left-0 right-0 bg-white/98 backdrop-blur-2xl shadow-2xl rounded-3xl border border-slate-200 overflow-hidden divide-y divide-slate-100 z-50 ring-1 ring-black/[0.05]"
              >
                {filteredDcs.map((dc) => (
                  <button
                    key={String(dc.id ?? dc.name)}
                    onClick={() => flyToDc(dc)}
                    className="w-full px-6 py-4 flex items-center gap-4 hover:bg-violet-50 transition-colors text-left"
                  >
                    <div className="p-2 bg-violet-100 rounded-xl">
                      <MapPin size={14} className="text-violet-600" />
                    </div>
                    <div>
                      <div className="text-[11px] font-black text-slate-800 uppercase tracking-tight">
                        {dc.name}
                      </div>
                      <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                        {dc.company}
                      </div>
                    </div>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Right top: Layer toggles */}
      <div className="absolute top-6 right-6 z-10 w-56">
        <div className="bg-white/95 backdrop-blur-md rounded-[2rem] shadow-2xl border border-slate-200/50 overflow-hidden ring-1 ring-black/[0.03]">
          <div className="px-5 py-3.5 flex items-center justify-between border-b border-slate-100 bg-slate-50/50">
            <div className="flex items-center gap-2">
              <Layers size={12} className="text-slate-400" />
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                Overlays
              </span>
            </div>
          </div>
          <div className="p-2 space-y-1.5">
            {TOGGLE_GROUPS.map(({ key, label, icon, bgOn, borderOn }) => (
              <button
                key={key}
                onClick={() => toggleGroup(key)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl border text-[10px] font-black uppercase tracking-widest transition-all ${
                  layerVis[key]
                    ? `${bgOn} text-white ${borderOn} shadow-md`
                    : "bg-slate-50/50 text-slate-400 border-slate-50 hover:border-slate-200"
                }`}
              >
                {icon}
                <span>{label}</span>
                <div
                  className={`ml-auto w-1.5 h-1.5 rounded-full ${
                    layerVis[key]
                      ? "bg-white shadow-[0_0_8px_rgba(255,255,255,1)]"
                      : "bg-slate-200"
                  }`}
                />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Datacenter popup card */}
      <AnimatePresence>
        {dcPopup && (
          <motion.div
            key="dc-popup"
            initial={{ opacity: 0, y: 100, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 100, scale: 0.9 }}
            className="absolute bottom-10 left-1/2 -translate-x-1/2 z-20 w-[600px] max-w-[95vw]"
          >
            <div className="bg-white/95 backdrop-blur-2xl rounded-[3rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.3)] border border-white/50 overflow-hidden ring-1 ring-black/[0.05]">
              {/* Satellite image */}
              <div className="relative h-48 w-full overflow-hidden bg-slate-900">
                <img
                  src={`https://services.arcgisonline.com/arcgis/rest/services/World_Imagery/MapServer/export?bbox=${dcPopup.lng - 0.005},${dcPopup.lat - 0.002},${dcPopup.lng + 0.005},${dcPopup.lat + 0.002}&bboxSR=4326&imageSR=4326&size=800,320&format=jpg&f=image`}
                  alt="Building Satellite View"
                  className="w-full h-full object-cover grayscale-[0.2] contrast-[1.1]"
                />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="relative flex items-center justify-center">
                    <div className="absolute w-12 h-12 rounded-full border border-white/30 animate-pulse" />
                    <div className="w-4 h-4 rounded-full bg-violet-500 border-2 border-white shadow-[0_0_15px_rgba(139,92,246,0.8)] z-10" />
                  </div>
                </div>
                <button
                  onClick={() => setDcPopup(null)}
                  className="absolute top-5 right-5 w-10 h-10 flex items-center justify-center bg-black/20 hover:bg-black/60 text-white rounded-full transition-all backdrop-blur-md"
                >
                  <X size={18} />
                </button>
                <div className="absolute top-5 left-5 px-4 py-1.5 bg-black/40 backdrop-blur-md text-white/90 text-[10px] font-black uppercase tracking-tighter rounded-full border border-white/10">
                  SITE ID: {String(dcPopup.dc["id"] ?? "").toUpperCase()}
                </div>
              </div>

              {/* Info section */}
              <div className="p-8 pt-6 space-y-6">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="text-[10px] font-black text-violet-500 uppercase tracking-[0.2em] mb-1.5">
                      {String(dcPopup.dc["company"] ?? "")}
                    </div>
                    <h3 className="text-2xl font-black text-slate-800 leading-none">
                      {String(dcPopup.dc["name"] ?? "")}
                    </h3>
                  </div>
                  <div className="px-4 py-2 bg-slate-100 rounded-2xl text-[10px] font-black text-slate-500 uppercase tracking-widest border border-slate-200">
                    {String(dcPopup.dc["tier"] ?? "Tier III")}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50/80 rounded-[1.5rem] p-5 border border-slate-100 group hover:border-violet-200 transition-colors">
                    <div className="flex items-center gap-2 mb-2">
                      <MapPin size={12} className="text-slate-400" />
                      <span className="font-black text-slate-400 uppercase tracking-widest text-[9px]">
                        Location Verified
                      </span>
                    </div>
                    <div className="font-bold text-slate-600 text-[11px] leading-relaxed line-clamp-2">
                      {String(dcPopup.dc["address"] ?? "")}
                    </div>
                  </div>
                  <div className="bg-violet-50/50 rounded-[1.5rem] p-5 border border-violet-100">
                    <div className="flex items-center gap-2 mb-2">
                      <Navigation size={12} className="text-violet-400" />
                      <span className="font-black text-violet-400 uppercase tracking-widest text-[9px]">
                        Precision Coords
                      </span>
                    </div>
                    <div className="font-mono font-bold text-violet-700 text-[11px] tabular-nums">
                      LAT: {dcPopup.lat.toFixed(6)}
                      <br />
                      LNG: {dcPopup.lng.toFixed(6)}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setDcPopup(null);
                    onDatacenterClick(dcPopup.lat, dcPopup.lng, dcPopup.dc);
                  }}
                  className="w-full bg-gradient-to-br from-violet-600 via-violet-700 to-indigo-800 hover:from-violet-500 hover:to-indigo-700 text-white rounded-2xl py-4 text-[11px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 transition-all shadow-[0_10px_30px_-10px_rgba(124,58,237,0.5)] hover:shadow-[0_15px_40px_-10px_rgba(124,58,237,0.6)] hover:-translate-y-0.5 active:scale-[0.98] group"
                >
                  <ExternalLink
                    size={16}
                    className="group-hover:rotate-12 transition-transform duration-300"
                  />
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
