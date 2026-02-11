import apiClient from "./client";
import type { Policy, TariffRecord, Subsidy } from "../types/policy";

export async function listPolicies(params?: {
  authority?: string;
  state?: string;
}): Promise<Policy[]> {
  const { data } = await apiClient.get("/policy/policies", { params });
  return data;
}

export async function listTariffs(params?: {
  state?: string;
  tariff_type?: string;
}): Promise<TariffRecord[]> {
  const { data } = await apiClient.get("/policy/tariffs", { params });
  return data;
}

export async function listSubsidies(params?: {
  state?: string;
  status?: string;
}): Promise<Subsidy[]> {
  const { data } = await apiClient.get("/policy/subsidies", { params });
  return data;
}
