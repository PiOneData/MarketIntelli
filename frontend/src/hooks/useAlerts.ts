import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listAlerts,
  getWatchlists,
  createWatchlist,
  deleteWatchlist,
  bulkDeleteWatchlists,
  getNotifications,
  listNews,
  getNewsFilters,
  addNewsToWatchlist,
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

export function useNews(params?: {
  category?: string;
  state?: string;
  source?: string;
  limit?: number;
  offset?: number;
}) {
  return useQuery({
    queryKey: ["news", params],
    queryFn: () => listNews(params),
    staleTime: 5 * 60 * 1000,
  });
}

export function useNewsFilters() {
  return useQuery({
    queryKey: ["news-filters"],
    queryFn: getNewsFilters,
    staleTime: 10 * 60 * 1000,
  });
}

export function useAddNewsToWatchlist(userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ articleId, articleTitle }: { articleId: string; articleTitle: string }) =>
      addNewsToWatchlist(articleId, userId, articleTitle),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["watchlists", userId] });
    },
  });
}

export function useDeleteWatchlist(userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (watchlistId: string) => deleteWatchlist(userId, watchlistId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["watchlists", userId] });
    },
  });
}

export function useBulkDeleteWatchlists(userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (watchlistIds: string[]) => bulkDeleteWatchlists(userId, watchlistIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["watchlists", userId] });
    },
  });
}
