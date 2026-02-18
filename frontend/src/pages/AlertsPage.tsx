import { useState, useMemo } from "react";
import { useParams } from "react-router-dom";
import { useAlerts, useNews, useNewsFilters, useAddNewsToWatchlist } from "../hooks/useAlerts";
import LoadingSpinner from "../components/common/LoadingSpinner";
import ErrorMessage from "../components/common/ErrorMessage";
import type { NewsArticle } from "../types/alerts";

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */

const DEMO_USER_ID = "00000000-0000-0000-0000-000000000001";

const CATEGORY_LABELS: Record<string, string> = {
  data_center: "Data Center",
  solar: "Solar",
  wind: "Wind",
  policy: "Policy",
  renewable_energy: "Renewable Energy",
};

const CATEGORY_COLORS: Record<string, string> = {
  data_center: "news-badge--data-center",
  solar: "news-badge--solar",
  wind: "news-badge--wind",
  policy: "news-badge--policy",
  renewable_energy: "news-badge--renewable",
};

function formatNewsDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days}d ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

/* ------------------------------------------------------------------ */
/*  News Card                                                           */
/* ------------------------------------------------------------------ */

function NewsCard({
  article,
  onAddToWatchlist,
  watchlistAdded,
}: {
  article: NewsArticle;
  onAddToWatchlist: (article: NewsArticle) => void;
  watchlistAdded: boolean;
}) {
  const categoryLabel = CATEGORY_LABELS[article.category] ?? article.category;
  const categoryClass = CATEGORY_COLORS[article.category] ?? "news-badge--renewable";

  return (
    <div className="news-card">
      <div className="news-card-header">
        <span className={`news-badge ${categoryClass}`}>{categoryLabel}</span>
        <div className="news-card-meta-top">
          {article.state && <span className="news-state-tag">{article.state}</span>}
          <span className="news-time-ago">{timeAgo(article.published_at)}</span>
        </div>
      </div>

      <h4 className="news-card-title">
        <a href={article.url} target="_blank" rel="noopener noreferrer">
          {article.title}
        </a>
      </h4>

      {article.summary && <p className="news-card-summary">{article.summary}</p>}

      <div className="news-card-footer">
        <div className="news-card-footer-left">
          <span className="news-source">{article.source}</span>
          <span className="news-date">{formatNewsDate(article.published_at)}</span>
        </div>
        <div className="news-card-footer-right">
          <a
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            className="news-read-btn"
          >
            Read Article
          </a>
          <button
            className={`news-watchlist-btn ${watchlistAdded ? "news-watchlist-btn--added" : ""}`}
            onClick={() => onAddToWatchlist(article)}
            disabled={watchlistAdded}
            title={watchlistAdded ? "Added to watchlist" : "Add to watchlist"}
          >
            {watchlistAdded ? "★ Watching" : "☆ Watch"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  News Feed Section                                                   */
/* ------------------------------------------------------------------ */

function NewsFeedSection() {
  const [categoryFilter, setCategoryFilter] = useState("");
  const [stateFilter, setStateFilter] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [watchedArticles, setWatchedArticles] = useState<Set<string>>(new Set());

  const { data: articles = [], isLoading, error } = useNews({
    category: categoryFilter || undefined,
    state: stateFilter || undefined,
    source: sourceFilter || undefined,
    limit: 100,
  });

  const { data: filters } = useNewsFilters();
  const addToWatchlist = useAddNewsToWatchlist(DEMO_USER_ID);

  const availableStates = filters?.states ?? [];
  const availableSources = filters?.sources ?? [];

  // Client-side filtering for immediate responsiveness
  const filtered = useMemo(() => {
    return articles.filter(
      (a) =>
        (!categoryFilter || a.category === categoryFilter) &&
        (!stateFilter || a.state === stateFilter) &&
        (!sourceFilter || a.source === sourceFilter)
    );
  }, [articles, categoryFilter, stateFilter, sourceFilter]);

  const handleAddToWatchlist = (article: NewsArticle) => {
    addToWatchlist.mutate(
      { articleId: article.id, articleTitle: article.title },
      {
        onSuccess: () => {
          setWatchedArticles((prev) => new Set(prev).add(article.id));
        },
      }
    );
  };

  if (isLoading) return <LoadingSpinner message="Loading news feed..." />;
  if (error) return <ErrorMessage message="Failed to load news articles" />;

  return (
    <section className="news-section">
      <div className="news-section-header">
        <div>
          <h3>India Renewable Energy &amp; Data Center News</h3>
          <p className="news-section-desc">
            Curated news from MNRE, Economic Times, Mercom India, Solar Quarter, Data Center
            Dynamics, and other leading sources — filtered for India-specific coverage.
          </p>
        </div>
        <div className="news-sources-tag">
          Sources: MNRE · Mercom India · Economic Times · Solar Quarter · PIB · Data Center Dynamics
        </div>
      </div>

      {/* Filters */}
      <div className="pm-filters">
        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
          <option value="">All Categories</option>
          <option value="data_center">Data Center</option>
          <option value="solar">Solar</option>
          <option value="wind">Wind</option>
          <option value="policy">Policy</option>
          <option value="renewable_energy">Renewable Energy</option>
        </select>

        <select value={stateFilter} onChange={(e) => setStateFilter(e.target.value)}>
          <option value="">All States</option>
          {availableStates.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        <select value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)}>
          <option value="">All Sources</option>
          {availableSources.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        <span className="pm-filter-count">{filtered.length} articles</span>

        {(categoryFilter || stateFilter || sourceFilter) && (
          <button
            className="news-clear-btn"
            onClick={() => {
              setCategoryFilter("");
              setStateFilter("");
              setSourceFilter("");
            }}
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Category quick-filter chips */}
      <div className="news-category-chips">
        {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
          <button
            key={key}
            className={`news-chip ${categoryFilter === key ? "news-chip--active" : ""}`}
            onClick={() => setCategoryFilter(categoryFilter === key ? "" : key)}
          >
            {label}
            <span className="news-chip-count">
              {articles.filter((a) => a.category === key).length}
            </span>
          </button>
        ))}
      </div>

      {/* Article grid */}
      {filtered.length === 0 ? (
        <div className="news-empty">
          <p>No articles match the current filters.</p>
          <button
            className="news-clear-btn"
            onClick={() => {
              setCategoryFilter("");
              setStateFilter("");
              setSourceFilter("");
            }}
          >
            Clear Filters
          </button>
        </div>
      ) : (
        <div className="news-cards-grid">
          {filtered.map((article) => (
            <NewsCard
              key={article.id}
              article={article}
              onAddToWatchlist={handleAddToWatchlist}
              watchlistAdded={watchedArticles.has(article.id)}
            />
          ))}
        </div>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Active Alerts Section                                               */
/* ------------------------------------------------------------------ */

function ActiveAlertsSection() {
  const { data: alerts, isLoading, isError, refetch } = useAlerts();

  if (isLoading) return <LoadingSpinner message="Loading alerts..." />;
  if (isError)
    return <ErrorMessage message="Failed to load alerts" onRetry={() => refetch()} />;

  return (
    <section id="active-alerts">
      <h3>Active Alerts ({alerts?.length ?? 0})</h3>
      <p>Real-time notifications on policy changes, project delays, or environmental risks.</p>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Alerts Page                                                    */
/* ------------------------------------------------------------------ */

function AlertsPage() {
  const { section } = useParams<{ section: string }>();
  const activeSection = section || "active-alerts";

  return (
    <div className="alerts-page">
      <h2>Alert &amp; Notification Engine</h2>

      {activeSection === "active-alerts" && <ActiveAlertsSection />}

      {activeSection === "custom-watchlists" && (
        <section id="custom-watchlists">
          <h3>Custom Watchlists</h3>
          <p>User-defined tracking of developers, states, or project categories.</p>
        </section>
      )}

      {activeSection === "disaster-response-integration" && (
        <section id="disaster-response-integration">
          <h3>Disaster Response Integration</h3>
          <p>Early warnings for extreme weather events affecting solar assets.</p>
        </section>
      )}

      {activeSection === "news-feed" && <NewsFeedSection />}
    </div>
  );
}

export default AlertsPage;
