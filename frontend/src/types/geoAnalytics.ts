export interface SolarPotentialZone {
  id: string;
  name: string;
  state: string;
  irradiance_kwh_m2: number;
  land_suitability_score: number;
  area_sq_km: number;
}

export interface GridInfrastructure {
  id: string;
  name: string;
  infrastructure_type: string;
  capacity_mva: number | null;
  congestion_level: number | null;
}

export interface DisasterRiskZone {
  id: string;
  risk_type: string;
  severity: number;
  state: string;
  description: string;
}
