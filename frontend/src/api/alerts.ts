import apiClient from "./client";
import type { Alert, Watchlist, Notification } from "../types/alerts";

export async function listAlerts(params?: {
  alert_type?: string;
  state?: string;
  active_only?: boolean;
}): Promise<Alert[]> {
  const { data } = await apiClient.get("/alerts/", { params });
  return data;
}

export async function getWatchlists(userId: string): Promise<Watchlist[]> {
  const { data } = await apiClient.get(`/alerts/watchlists/${userId}`);
  return data;
}

export async function createWatchlist(
  userId: string,
  payload: { name: string; watch_type: string; target_id: string },
): Promise<Watchlist> {
  const { data } = await apiClient.post(
    `/alerts/watchlists/${userId}`,
    payload,
  );
  return data;
}

export async function getNotifications(
  userId: string,
  unreadOnly?: boolean,
): Promise<Notification[]> {
  const { data } = await apiClient.get(`/alerts/notifications/${userId}`, {
    params: { unread_only: unreadOnly },
  });
  return data;
}
