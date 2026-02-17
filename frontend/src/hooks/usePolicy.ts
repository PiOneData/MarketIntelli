import { useQuery } from "@tanstack/react-query";
import { listPolicies, listTariffs, listSubsidies } from "../api/policy";

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
