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

// ---------------------------------------------------------------------------
// Groundwater Resource Assessment (SolarWindAssessment integration)
// ---------------------------------------------------------------------------

export interface GroundwaterFeatureCollection {
  type: "FeatureCollection";
  features: Array<{
    type: "Feature";
    geometry: object | null;
    properties: {
      id: string;
      gml_id: string;
      objectid: number | null;
      block: string;
      tehsil: string;
      district: string;
      gwr_2011_2: number | null;
      code: number | null;
      classification: string;
      net_annual_gw_availability: number | null;
      annual_gw_draft_irrigation: number | null;
      stage_of_gw_development: number | null;
      annual_gw_draft_domestic_industrial: number | null;
      annual_gw_draft_total: number | null;
      annual_replenishable_gw_total: number | null;
      state_name: string;
      natural_discharge_non_monsoon: number | null;
      st_area_shape: number | null;
      st_length_shape: number | null;
    };
  }>;
}

// ---------------------------------------------------------------------------
// Google Service Credential (SolarWindAssessment integration)
// ---------------------------------------------------------------------------

export interface GoogleServiceCredential {
  id: string;
  name: string;
  credential_type: string;
  project_id: string;
  private_key_id: string;
  client_email: string;
  client_id: string;
  auth_uri: string;
  token_uri: string;
  auth_provider_x509_cert_url: string;
  client_x509_cert_url: string;
  is_active: boolean;
}
