import { useQuery } from "@tanstack/react-query";
import { listPolicies, listTariffs, listSubsidies, listComplianceAlerts } from "../api/policy";

export function usePolicies(params?: { authority?: string; state?: string }) {
  return useQuery({
    queryKey: ["policy", "policies", params],
    queryFn: () => listPolicies(params),
  });
}

export function useTariffs(params?: { state?: string; tariff_type?: string }) {
  return useQuery({
    queryKey: ["policy", "tariffs", params],
    queryFn: () => listTariffs(params),
  });
}

export function useSubsidies(params?: { state?: string; status?: string }) {
  return useQuery({
    queryKey: ["policy", "subsidies", params],
    queryFn: () => listSubsidies(params),
  });
}

export function useComplianceAlerts(params?: { authority?: string; category?: string }) {
  return useQuery({
    queryKey: ["policy", "compliance-alerts", params],
    queryFn: () => listComplianceAlerts(params),
    staleTime: 5 * 60 * 1000, // 5 min cache — backend refreshes twice daily
    refetchOnWindowFocus: true,
  });
}
