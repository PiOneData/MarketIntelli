export interface DataCenterCompany {
  id: string;
  name: string;
  parent_company: string | null;
  headquarters: string | null;
  website: string | null;
  total_investment_usd: number | null;
  annual_revenue_usd: number | null;
  employee_count: number | null;
  sustainability_rating: string | null;
  facility_count: number;
  total_capacity_mw: number;
}

export interface DataCenterFacility {
  id: string;
  company_id: string;
  company_name: string;
  name: string;
  city: string;
  state: string;
  location_detail: string | null;
  latitude: number | null;
  longitude: number | null;
  power_capacity_mw: number;
  it_load_mw: number | null;
  size_sqft: number;
  status: string;
  tier_level: string | null;
  pue_target: number | null;
  pue_actual: number | null;
  current_renewable_pct: number | null;
  target_renewable_pct: number | null;
  cooling_type: string | null;
  water_consumption_kld: number | null;
  commissioning_date: string | null;
  expansion_plans: string | null;
  compliance_status: string | null;
  date_added: string | null;
}

export interface FacilityStats {
  total_facilities: number;
  total_power_mw: number;
  states_covered: number;
  by_status: Record<string, number>;
  by_state: Record<string, number>;
  by_company: Record<string, number>;
}

export interface DataCenterFacilityCreate {
  company_id: string;
  name: string;
  city: string;
  state: string;
  location_detail?: string;
  power_capacity_mw?: number;
  size_sqft?: number;
  status?: string;
}
