import apiClient from "./client";
import type {
  RenewableCapacity,
  PowerGeneration,
  TransmissionLine,
  PowerConsumption,
  RETariff,
  InvestmentGuideline,
  DataRepositoryEntry,
  PowerMarketOverview,
} from "../types/powerMarket";

export async function getOverview(): Promise<PowerMarketOverview> {
  const { data } = await apiClient.get("/power-market/overview");
  return data;
}

export async function listRenewableCapacity(params?: {
  state?: string;
  energy_source?: string;
  data_year?: number;
}): Promise<RenewableCapacity[]> {
  const { data } = await apiClient.get("/power-market/renewable-capacity", { params });
  return data;
}

export async function getCapacitySummary(params?: {
  data_year?: number;
}): Promise<RenewableCapacity[]> {
  const { data } = await apiClient.get("/power-market/capacity-summary", { params });
  return data;
}

export async function listPowerGeneration(params?: {
  state?: string;
  energy_source?: string;
  data_year?: number;
}): Promise<PowerGeneration[]> {
  const { data } = await apiClient.get("/power-market/generation", { params });
  return data;
}

export async function listTransmissionLines(params?: {
  state?: string;
  voltage_kv?: number;
}): Promise<TransmissionLine[]> {
  const { data } = await apiClient.get("/power-market/transmission-lines", { params });
  return data;
}

export async function listPowerConsumption(params?: {
  state?: string;
  sector?: string;
  data_year?: number;
}): Promise<PowerConsumption[]> {
  const { data } = await apiClient.get("/power-market/consumption", { params });
  return data;
}

export async function listRETariffs(params?: {
  state?: string;
  energy_source?: string;
  tariff_type?: string;
}): Promise<RETariff[]> {
  const { data } = await apiClient.get("/power-market/re-tariffs", { params });
  return data;
}

export async function listInvestmentGuidelines(params?: {
  category?: string;
  institution?: string;
}): Promise<InvestmentGuideline[]> {
  const { data } = await apiClient.get("/power-market/investment-guidelines", { params });
  return data;
}

export async function listDataRepository(params?: {
  category?: string;
  organization?: string;
}): Promise<DataRepositoryEntry[]> {
  const { data } = await apiClient.get("/power-market/data-repository", { params });
  return data;
}
