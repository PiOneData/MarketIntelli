import apiClient from "./client";
import type {
  MarketOverview,
  FinancialInsight,
  PerformanceMetric,
} from "../types/dashboard";

export async function getMarketOverview(): Promise<MarketOverview> {
  const { data } = await apiClient.get("/dashboard/market-overview");
  return data;
}

export async function getFinancialInsights(
  category?: string,
): Promise<FinancialInsight[]> {
  const { data } = await apiClient.get("/dashboard/financial-insights", {
    params: { category },
  });
  return data;
}

export async function getPerformanceMetrics(): Promise<PerformanceMetric[]> {
  const { data } = await apiClient.get("/dashboard/performance-metrics");
  return data;
}
