import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listAlerts,
  getWatchlists,
  createWatchlist,
  getNotifications,
} from "../api/alerts";

export function useAlerts(params?: {
  alert_type?: string;
  state?: string;
  active_only?: boolean;
}) {
  return useQuery({
    queryKey: ["alerts", params],
    queryFn: () => listAlerts(params),
  });
}

export function useWatchlists(userId: string) {
  return useQuery({
    queryKey: ["watchlists", userId],
    queryFn: () => getWatchlists(userId),
    enabled: !!userId,
  });
}

export function useCreateWatchlist(userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      name: string;
      watch_type: string;
      target_id: string;
    }) => createWatchlist(userId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["watchlists", userId] });
    },
  });
}

export function useNotifications(userId: string, unreadOnly?: boolean) {
  return useQuery({
    queryKey: ["notifications", userId, unreadOnly],
    queryFn: () => getNotifications(userId, unreadOnly),
    enabled: !!userId,
  });
}
