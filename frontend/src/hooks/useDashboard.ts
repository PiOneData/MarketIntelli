import { useQuery } from "@tanstack/react-query";
import {
  getMarketOverview,
  getFinancialInsights,
  getPerformanceMetrics,
} from "../api/dashboard";

export function useMarketOverview() {
  return useQuery({
    queryKey: ["dashboard", "market-overview"],
    queryFn: getMarketOverview,
  });
}

export function useFinancialInsights(category?: string) {
  return useQuery({
    queryKey: ["dashboard", "financial-insights", category],
    queryFn: () => getFinancialInsights(category),
  });
}

export function usePerformanceMetrics() {
  return useQuery({
    queryKey: ["dashboard", "performance-metrics"],
    queryFn: getPerformanceMetrics,
  });
}
