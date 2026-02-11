import apiClient from "./client";
import type {
  SolarPotentialZone,
  GridInfrastructure,
  DisasterRiskZone,
} from "../types/geoAnalytics";

export async function getSolarPotentialZones(params?: {
  state?: string;
  min_irradiance?: number;
  min_suitability?: number;
}): Promise<SolarPotentialZone[]> {
  const { data } = await apiClient.get("/geo-analytics/solar-potential", {
    params,
  });
  return data;
}

export async function getGridInfrastructure(
  infrastructureType?: string,
): Promise<GridInfrastructure[]> {
  const { data } = await apiClient.get("/geo-analytics/grid-infrastructure", {
    params: { infrastructure_type: infrastructureType },
  });
  return data;
}

export async function getDisasterRiskZones(params?: {
  risk_type?: string;
  state?: string;
}): Promise<DisasterRiskZone[]> {
  const { data } = await apiClient.get("/geo-analytics/disaster-risk", {
    params,
  });
  return data;
}
