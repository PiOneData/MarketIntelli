import apiClient from "./client";
import type {
  DataCenterCompany,
  DataCenterFacility,
  FacilityStats,
  DataCenterFacilityCreate,
} from "../types/dataCenters";

export async function listCompanies(params?: {
  name?: string;
  page?: number;
  page_size?: number;
}): Promise<DataCenterCompany[]> {
  const { data } = await apiClient.get("/data-centers/companies", { params });
  return data;
}

export async function getCompany(id: string): Promise<DataCenterCompany> {
  const { data } = await apiClient.get(`/data-centers/companies/${id}`);
  return data;
}

export async function listFacilities(params?: {
  state?: string;
  city?: string;
  status?: string;
  company?: string;
  company_id?: string;
  min_power_mw?: number;
  page?: number;
  page_size?: number;
}): Promise<DataCenterFacility[]> {
  const { data } = await apiClient.get("/data-centers/facilities", { params });
  return data;
}

export async function getFacility(id: string): Promise<DataCenterFacility> {
  const { data } = await apiClient.get(`/data-centers/facilities/${id}`);
  return data;
}

export async function getFacilityStats(): Promise<FacilityStats> {
  const { data } = await apiClient.get("/data-centers/facilities/stats");
  return data;
}

export async function createFacility(
  facility: DataCenterFacilityCreate
): Promise<DataCenterFacility> {
  const { data } = await apiClient.post("/data-centers/facilities", facility);
  return data;
}

export async function deleteFacility(id: string): Promise<void> {
  await apiClient.delete(`/data-centers/facilities/${id}`);
}
