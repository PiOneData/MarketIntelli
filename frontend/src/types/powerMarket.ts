export interface RenewableCapacity {
  id: string;
  state: string;
  energy_source: string;
  installed_capacity_mw: number;
  available_capacity_mw: number | null;
  potential_capacity_mw: number | null;
  cuf_percent: number | null;
  developer: string | null;
  ppa_rate_per_kwh: number | null;
  data_year: number;
  data_month: number | null;
  source: string;
  source_url: string | null;
}

export interface RenewableCapacitySummary {
  state: string;
  energy_source: string;
  total_installed_mw: number;
  total_potential_mw: number | null;
  avg_cuf_percent: number | null;
  data_year: number;
}

export interface PowerGeneration {
  id: string;
  state: string;
  energy_source: string;
  generation_mu: number;
  period_type: string;
  data_year: number;
  data_month: number | null;
  plant_load_factor: number | null;
  source: string;
  source_url: string | null;
}

export interface TransmissionLine {
  id: string;
  name: string;
  from_state: string;
  to_state: string | null;
  voltage_kv: number;
  length_km: number | null;
  capacity_mw: number | null;
  status: string;
  owner: string;
  data_year: number;
  source: string;
  source_url: string | null;
}

export interface PowerConsumption {
  id: string;
  state: string;
  sector: string;
  consumption_mu: number;
  peak_demand_mw: number | null;
  data_year: number;
  data_month: number | null;
  source: string;
}

export interface RETariff {
  id: string;
  state: string;
  energy_source: string;
  tariff_type: string;
  rate_per_kwh: number;
  currency: string;
  effective_date: string;
  expiry_date: string | null;
  ordering_authority: string;
  tender_id: string | null;
  grid_tariff_comparison: number | null;
  data_year: number;
  source: string;
  source_url: string | null;
}

export interface InvestmentGuideline {
  id: string;
  title: string;
  category: string;
  institution: string;
  description: string;
  interest_rate_range: string | null;
  max_loan_amount: string | null;
  tenure_years: string | null;
  eligibility: string | null;
  document_url: string | null;
  data_year: number;
  source: string;
}

export interface DataRepositoryEntry {
  id: string;
  title: string;
  category: string;
  organization: string;
  document_type: string;
  url: string;
  description: string;
  data_year: number | null;
  last_updated: string | null;
  is_active: boolean;
}

export interface PowerMarketOverview {
  total_installed_re_mw: number;
  total_solar_mw: number;
  total_wind_mw: number;
  total_small_hydro_mw: number;
  total_biomass_mw: number;
  total_generation_mu: number;
  data_year: number;
}
