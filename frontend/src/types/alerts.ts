export interface Alert {
  id: string;
  title: string;
  alert_type: string;
  severity: string;
  state: string | null;
  message: string;
  is_active: boolean;
  created_at: string;
  expires_at: string | null;
}

export interface Watchlist {
  id: string;
  user_id: string;
  name: string;
  watch_type: string;
  target_id: string;
  is_active: boolean;
}

export interface Notification {
  id: string;
  user_id: string;
  alert_id: string | null;
  channel: string;
  status: string;
  read: boolean;
  created_at: string;
}

export interface NewsArticle {
  id: string;
  title: string;
  url: string;
  source: string;
  category: string;
  state: string | null;
  summary: string | null;
  image_url: string | null;
  published_at: string | null;
  scraped_at: string;
  is_active: boolean;
}

export interface NewsFilters {
  states: string[];
  sources: string[];
}
