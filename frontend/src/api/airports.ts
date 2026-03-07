import apiClient from "./client";

export interface Airport {
  "S.No": number;
  "Airport Name": string;
  "IATA Code": string;
  "Official Website": string | null;
  "Full Address": string | null;
  City: string;
  "State / UT": string;
  Pincode: string | null;
  Type: string;
  Status: string;
  "Annual Passengers (Mn)": string | number | null;
  "Annual Flight Movements": string | number | null;
  "Avg Daily Departures": string | number | null;
  "Avg Daily Arrivals": string | number | null;
  "Cargo Capacity (MTPA)": string | number | null;
  "Actual Cargo Handled (MT)": string | number | null;
  "No. of Runways": number | null;
  "No. of Terminals": number | null;
  "Check-In Counters": string | number | null;
  "Immigration Desks": string | number | null;
  "Baggage Carousels": string | number | null;
  Lounges: string | number | null;
  "Wi-Fi": string | null;
  "Power Consumption (MW)": string | number | null;
  "Power Mode / Renewables": string | null;
  "Special Assistance Services": string | null;
  "Key Vendors & Operators": string | null;
  "Operator / Concessionaire": string | null;
  "Solar Capacity Installed (MW)": string | number | null;
  "Annual Generation (Million Units)": string | number | null;
  "Annual Consumption (Million Units)": string | number | null;
  "% Green Energy Coverage": string | number | null;
  "Green Energy Sources": string | null;
  "Carbon Neutral / ACI Level": string | null;
  "Data Source": string | null;
  "Last Updated": string | null;
  is_green: boolean;
  latitude: number | null;
  longitude: number | null;
}

export interface AirportsMeta {
  states: string[];
  types: string[];
  statuses: string[];
}

export async function fetchAirports(params?: {
  state?: string;
  type?: string;
  status?: string;
  green_only?: boolean;
  search?: string;
}): Promise<{ airports: Airport[]; total: number }> {
  const res = await apiClient.get("/airport-registry/airports", { params });
  return res.data;
}

export async function fetchAirportsMeta(): Promise<AirportsMeta> {
  const res = await apiClient.get("/airport-registry/airports/meta");
  return res.data;
}

export async function fetchAirport(id: number): Promise<Airport> {
  const res = await apiClient.get(`/airport-registry/airports/${id}`);
  return res.data;
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

export async function fetchAirportsPowerStats(): Promise<AirportsPowerStats> {
  const res = await apiClient.get("/airport-registry/airports/power-stats");
  return res.data;
}
