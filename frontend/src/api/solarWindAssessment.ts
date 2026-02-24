import apiClient from "./client";

export interface AnalysisRequest {
  lat: number;
  lon: number;
}

export interface WindResource {
  grade: string;
  label: string;
  wind_speed: number;
  power_density: number;
  air_density: number;
}

export interface WindData {
  score?: number;
  resource?: WindResource;
  feasibility?: {
    rix: number;
    slope: number;
    elevation: number;
    status: string;
  };
  insights?: string[];
  turbine?: {
    best_fit: string;
    cf_iec1: number;
    cf_iec2: number;
    cf_iec3: number;
  };
  terrain?: { slope: number; elevation: number };
  metadata?: Record<string, unknown>;
}

export interface SolarResource {
  grade: string;
  label: string;
  ghi: number;
  dni: number;
  dif: number;
  pvout: number;
  ltdi: number;
}

export interface SolarData {
  score?: number;
  resource?: SolarResource;
  metadata?: Record<string, unknown>;
}

export interface WaterData {
  composite_risk_score?: number;
  grace_anomaly?: number;
  pdsi?: number;
  interpretation?: string;
  metadata?: Record<string, unknown>;
}

export interface SuitabilityData {
  overall_score: number;
  rating: string;
  insights: string[];
  components: { solar: number; wind: number; water: number };
}

export interface AnalysisResult {
  wind: WindData;
  solar: SolarData;
  water: WaterData;
  suitability: SuitabilityData;
  location: { lat: number; lon: number };
  timestamp: string;
}

export interface LiveWeatherData {
  wind_speed_80m: number;
  wind_speed_120m: number;
  wind_speed_180m: number;
  wind_direction_80m: number;
  wind_direction_120m: number;
  wind_direction_180m: number;
  temperature_120m: number;
  air_density_120m: number;
  pressure_msl: number;
  humidity: number;
  precipitation: number;
  cloud_cover: number;
  visibility: number;
  apparent_temp: number;
}

export const DEFAULT_LIVE_WEATHER: LiveWeatherData = {
  wind_speed_80m: 0,
  wind_speed_120m: 0,
  wind_speed_180m: 0,
  wind_direction_80m: 0,
  wind_direction_120m: 0,
  wind_direction_180m: 0,
  temperature_120m: 0,
  air_density_120m: 1.225,
  pressure_msl: 1013,
  humidity: 0,
  precipitation: 0,
  cloud_cover: 0,
  visibility: 0,
  apparent_temp: 0,
};

export async function analyzeLocation(
  lat: number,
  lon: number,
): Promise<AnalysisResult> {
  const { data } = await apiClient.post<AnalysisResult>(
    "/solar-assessment/analyze",
    { lat, lon },
  );
  return data;
}

export async function getLiveWeather(
  lat: number,
  lon: number,
): Promise<LiveWeatherData> {
  const { data } = await apiClient.post<LiveWeatherData>(
    "/solar-assessment/live-weather",
    { lat, lon },
  );
  return data;
}
