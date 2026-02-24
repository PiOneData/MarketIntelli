
import React, { useState } from 'react';
import Map from './components/Map';
import ReportView from './components/ReportView';
import { AnimatePresence, motion } from 'framer-motion';
import { Loader2, Server, Zap } from 'lucide-react';
import axios from 'axios';

const DC_CACHE_VERSION = 'v1'; // bump this to invalidate old cache entries
const getCacheKey = (dcId) => `dc_analysis_${DC_CACHE_VERSION}_${dcId}`;

function App() {
  const [view, setView] = useState('map');
  const [data, setData] = useState({ analysis: null, live: null, lat: 0, lng: 0, datacenter: null });
  const [loadingFromCache, setLoadingFromCache] = useState(false);

  const fetchAnalysis = async (lat, lng, datacenter = null) => {
    // ── Check if analysis is pre-embedded in GeoJSON (Rich GeoJSON) ──
    if (datacenter?.analysis) {
      try {
        const analysis = typeof datacenter.analysis === 'string'
          ? JSON.parse(datacenter.analysis)
          : datacenter.analysis;

        setLoadingFromCache(true);
        setView('loading');

        // Fetch LIVE data even for pre-loaded sites (keep it fresh)
        const liveUrl = 'http://localhost:8000/live-weather';
        const liveRes = await axios.post(liveUrl, { lat, lon: lng }).catch(() => ({ data: null }));
        const liveData = liveRes.data || {
          wind_speed_80m: 0, wind_speed_120m: 0, wind_speed_180m: 0,
          wind_direction_80m: 0, wind_direction_120m: 0, wind_direction_180m: 0,
          temperature_120m: 0, air_density_120m: 1.225, pressure_msl: 1013,
          humidity: 0, precipitation: 0, cloud_cover: 0, visibility: 0, apparent_temp: 0
        };

        setData({ analysis, live: liveData, lat, lng, datacenter });
        setView('report');
        setLoadingFromCache(false);
        return;
      } catch (e) {
        console.warn('[RichGeoJSON] Failed to parse embedded analysis', e);
      }
    }

    // ── Check localStorage cache (Backup for fresh clicks) ──
    if (datacenter?.id) {
      const cached = localStorage.getItem(getCacheKey(datacenter.id));
      if (cached) {
        try {
          const { analysis, live } = JSON.parse(cached);
          setLoadingFromCache(true);
          setView('loading');
          await new Promise(r => setTimeout(r, 300));
          setData({ analysis, live, lat, lng, datacenter });
          setView('report');
          setLoadingFromCache(false);
          return;
        } catch (e) {
          localStorage.removeItem(getCacheKey(datacenter.id));
        }
      }
    }

    // ── Fresh API fetch ──
    setView('loading');
    setLoadingFromCache(false);
    setData(prev => ({ ...prev, lat, lng, datacenter }));

    try {
      const analyzeUrl = 'http://localhost:8000/analyze';
      const liveUrl = 'http://localhost:8000/live-weather';

      const [analysisRes, liveRes] = await Promise.allSettled([
        axios.post(analyzeUrl, { lat, lon: lng }),
        axios.post(liveUrl, { lat, lon: lng })
      ]);

      const analysisData = analysisRes.status === 'fulfilled' ? analysisRes.value.data : null;
      const liveData = liveRes.status === 'fulfilled' ? liveRes.value.data : {
        wind_speed_80m: 0, wind_speed_120m: 0, wind_speed_180m: 0,
        wind_direction_80m: 0, wind_direction_120m: 0, wind_direction_180m: 0,
        temperature_120m: 0, air_density_120m: 1.225, pressure_msl: 1013,
        humidity: 0, precipitation: 0, cloud_cover: 0, visibility: 0, apparent_temp: 0
      };

      if (!analysisData) throw new Error('Analysis failed. Please try again.');

      // ── Save to cache if this is a datacenter click ──
      if (datacenter?.id) {
        try {
          localStorage.setItem(getCacheKey(datacenter.id), JSON.stringify({
            analysis: analysisData,
            live: liveData,
            cachedAt: Date.now(),
          }));
          console.log(`[Cache] Saved analysis for DC: ${datacenter.id}`);
        } catch (e) {
          console.warn('[Cache] Could not write to localStorage:', e);
        }
      }

      setData({ analysis: analysisData, live: liveData, lat, lng, datacenter });
      setView('report');

    } catch (err) {
      console.error(err);
      setView('map');
      alert('Error: ' + err.message);
    }
  };

  const handleDatacenterClick = (lat, lng, dcProps) => fetchAnalysis(lat, lng, dcProps);

  return (
    <div className="w-full h-full relative">
      {/* MAP LAYER */}
      <Map onDatacenterClick={handleDatacenterClick} />

      {/* LOADING OVERLAY */}
      <AnimatePresence>
        {view === 'loading' && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center"
          >
            <div className="bg-white p-8 rounded-2xl shadow-xl flex flex-col items-center border border-slate-100 max-w-sm w-full mx-4">
              {loadingFromCache ? (
                <>
                  <div className="w-12 h-12 rounded-2xl bg-violet-100 border border-violet-200 flex items-center justify-center mb-4">
                    <Zap className="w-6 h-6 text-violet-500" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-800 uppercase tracking-tight">Accessing Neural Cache</h3>
                  <p className="text-slate-500 text-sm italic mt-1 text-center">Syncing Live Weather & Telemetry...</p>
                  {data.datacenter && (
                    <div className="mt-3 text-[10px] font-black text-violet-500 uppercase tracking-widest">{data.datacenter.name}</div>
                  )}
                </>
              ) : (
                <>
                  <Loader2 className="w-10 h-10 text-violet-500 animate-spin mb-4" />
                  <h3 className="text-lg font-bold text-slate-800 uppercase tracking-tight">
                    {data.datacenter ? 'Analysing Data Center Site...' : 'Mapping Site Intelligence...'}
                  </h3>
                  <p className="text-slate-500 text-sm italic mt-1 text-center">
                    {data.datacenter
                      ? `${data.datacenter.name}`
                      : `${data.lat.toFixed(4)}, ${data.lng.toFixed(4)}`}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-2">{data.lat.toFixed(5)}°N · {data.lng.toFixed(5)}°E</p>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* REPORT VIEW */}
      <AnimatePresence>
        {view === 'report' && (
          <ReportView
            key="report"
            analysis={data.analysis}
            live={data.live}
            lat={data.lat}
            lng={data.lng}
            datacenter={data.datacenter}
            onClose={() => setView('map')}
            onClearCache={data.datacenter?.id ? () => {
              localStorage.removeItem(getCacheKey(data.datacenter.id));
              console.log('[Cache] Cleared for', data.datacenter.id);
            } : null}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;
