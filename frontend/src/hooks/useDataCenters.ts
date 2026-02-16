import { useQuery } from "@tanstack/react-query";
import {
  listCompanies,
  listFacilities,
  getFacilityStats,
} from "../api/dataCenters";

export function useCompanies(params?: {
  name?: string;
  page?: number;
  page_size?: number;
}) {
  return useQuery({
    queryKey: ["dc-companies", params],
    queryFn: () => listCompanies(params),
  });
}

export function useFacilities(params?: {
  state?: string;
  city?: string;
  status?: string;
  company?: string;
  company_id?: string;
  min_power_mw?: number;
  page?: number;
  page_size?: number;
}) {
  return useQuery({
    queryKey: ["dc-facilities", params],
    queryFn: () => listFacilities(params),
  });
}

export function useFacilityStats() {
  return useQuery({
    queryKey: ["dc-facility-stats"],
    queryFn: getFacilityStats,
  });
}
