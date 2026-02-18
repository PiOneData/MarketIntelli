import apiClient from "./client";
import type { Policy, TariffRecord, Subsidy, ComplianceAlert } from "../types/policy";

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

export async function listComplianceAlerts(params?: {
  authority?: string;
  category?: string;
}): Promise<ComplianceAlert[]> {
  const { data } = await apiClient.get("/policy/compliance-alerts", { params });
  return data;
}

export async function triggerComplianceScrape(): Promise<{ status: string }> {
  const { data } = await apiClient.post("/policy/compliance-alerts/scrape");
  return data;
}
