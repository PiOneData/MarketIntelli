import apiClient from "./client";

// ── API response type (flat, matches backend AirportRead schema) ───────────────
export interface ApiAirport {
  id: string;
  sno: number | null;
  airport_name: string;
  iata_code: string | null;
  city: string | null;
  state: string | null;
  type: string | null;
  status: string | null;
  latitude: number | null;
  longitude: number | null;
  power_consumption_mw: string | null;
  solar_capacity_mw: string | null;
  pct_green_coverage: string | null;
  green_energy_sources: string | null;
  carbon_neutral_aci_level: string | null;
  is_green: boolean;
  annual_passengers_mn: string | null;
  no_of_runways: string | null;
  operator_concessionaire: string | null;
  developer_id: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface AirportCreate {
  airport_name: string;
  iata_code?: string | null;
  city?: string | null;
  state?: string | null;
  type?: string | null;
  status?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  power_consumption_mw?: string | null;
  solar_capacity_mw?: string | null;
  pct_green_coverage?: string | null;
  green_energy_sources?: string | null;
  carbon_neutral_aci_level?: string | null;
  is_green?: boolean;
  annual_passengers_mn?: string | null;
  no_of_runways?: string | null;
  operator_concessionaire?: string | null;
  developer_id?: string | null;
}

export type AirportUpdate = Partial<AirportCreate>;

export interface AirportsMeta {
  states: string[];
  types: string[];
  statuses: string[];
}

export interface AirportsPowerStats {
  total_airports: number;
  airports_with_power_data: number;
  airports_with_solar_data: number;
  total_power_mw: number;
  total_solar_mw: number;
  grid_power_mw: number;
  green_share_pct: number;
  grid_share_pct: number;
  source: string;
}

export async function fetchAirports(params?: {
  state?: string;
  type?: string;
  status?: string;
  green_only?: boolean;
  search?: string;
  page?: number;
  page_size?: number;
}): Promise<{ airports: ApiAirport[]; total: number }> {
  const res = await apiClient.get("/airport-registry/airports", { params });
  return res.data;
}

export async function fetchAirportsMeta(): Promise<AirportsMeta> {
  const res = await apiClient.get("/airport-registry/airports/meta");
  return res.data;
}

export async function fetchAirport(id: string): Promise<ApiAirport> {
  const res = await apiClient.get(`/airport-registry/airports/${id}`);
  return res.data;
}

export async function createAirport(data: AirportCreate): Promise<ApiAirport> {
  const res = await apiClient.post("/airport-registry/airports", data);
  return res.data;
}

export async function updateAirport(id: string, data: AirportUpdate): Promise<ApiAirport> {
  const res = await apiClient.put(`/airport-registry/airports/${id}`, data);
  return res.data;
}

export async function deleteAirport(id: string): Promise<void> {
  await apiClient.delete(`/airport-registry/airports/${id}`);
}

export async function fetchAirportsPowerStats(): Promise<AirportsPowerStats> {
  const res = await apiClient.get("/airport-registry/airports/power-stats");
  return res.data;
}
