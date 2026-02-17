import { useQuery } from "@tanstack/react-query";
import {
  getOverview,
  listRenewableCapacity,
  listPowerGeneration,
  listTransmissionLines,
  listPowerConsumption,
  listRETariffs,
  listInvestmentGuidelines,
  listDataRepository,
} from "../api/powerMarket";

export function usePowerMarketOverview() {
  return useQuery({
    queryKey: ["power-market", "overview"],
    queryFn: getOverview,
  });
}

export function useRenewableCapacity(params?: {
  state?: string;
  energy_source?: string;
  data_year?: number;
}) {
  return useQuery({
    queryKey: ["power-market", "renewable-capacity", params],
    queryFn: () => listRenewableCapacity(params),
  });
}

export function usePowerGeneration(params?: {
  state?: string;
  energy_source?: string;
  data_year?: number;
}) {
  return useQuery({
    queryKey: ["power-market", "generation", params],
    queryFn: () => listPowerGeneration(params),
  });
}

export function useTransmissionLines(params?: {
  state?: string;
  voltage_kv?: number;
}) {
  return useQuery({
    queryKey: ["power-market", "transmission-lines", params],
    queryFn: () => listTransmissionLines(params),
  });
}

export function usePowerConsumption(params?: {
  state?: string;
  sector?: string;
  data_year?: number;
}) {
  return useQuery({
    queryKey: ["power-market", "consumption", params],
    queryFn: () => listPowerConsumption(params),
  });
}

export function useRETariffs(params?: {
  state?: string;
  energy_source?: string;
  tariff_type?: string;
}) {
  return useQuery({
    queryKey: ["power-market", "re-tariffs", params],
    queryFn: () => listRETariffs(params),
  });
}

export function useInvestmentGuidelines(params?: {
  category?: string;
  institution?: string;
}) {
  return useQuery({
    queryKey: ["power-market", "investment-guidelines", params],
    queryFn: () => listInvestmentGuidelines(params),
  });
}

export function useDataRepository(params?: {
  category?: string;
  organization?: string;
}) {
  return useQuery({
    queryKey: ["power-market", "data-repository", params],
    queryFn: () => listDataRepository(params),
  });
}
