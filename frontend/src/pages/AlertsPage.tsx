import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import apiClient from "../api/client";
import IpoWatchPage from "./IpoWatchPage";
import {
  useAlerts,
  useNews,
  useNewsFilters,
  useAddNewsToWatchlist,
  useWatchlists,
  useDeleteWatchlist,
  useBulkDeleteWatchlists,
  useDailyBrief,
  useTrendingThemes,
} from "../hooks/useAlerts";
import LoadingSpinner from "../components/common/LoadingSpinner";
import ErrorMessage from "../components/common/ErrorMessage";
import type { NewsArticle, Watchlist } from "../types/alerts";

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

const WATCH_TYPE_META: Record<string, { label: string; icon: string; colorClass: string }> = {
  news_article: { label: "News Article", icon: "📰", colorClass: "news-badge--policy" },
  developer:    { label: "Developer",    icon: "🏗️", colorClass: "news-badge--solar" },
  state:        { label: "State",        icon: "🗺️", colorClass: "news-badge--wind" },
  category:     { label: "Category",     icon: "📂", colorClass: "news-badge--renewable" },
};

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-IN", {
    year: "numeric", month: "short", day: "numeric",
  });
}

function timeAgo(dateStr: string | null | undefined): string {
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

function ImpactScoreBadge({ score }: { score: number }) {
  const color =
    score >= 7 ? "#16a34a" : score >= 4 ? "#d97706" : "#6b7280";
  const bg =
    score >= 7 ? "#dcfce7" : score >= 4 ? "#fef3c7" : "#f3f4f6";
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "3px",
        fontSize: "11px",
        fontWeight: 700,
        color,
        background: bg,
        border: `1px solid ${color}33`,
        borderRadius: "4px",
        padding: "1px 6px",
        whiteSpace: "nowrap",
      }}
      title="Market Impact Score (0–10)"
    >
      ⚡ {score.toFixed(1)}
    </span>
  );
}

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
  const displaySummary = article.ai_summary ?? article.summary;
  const hasAiSummary = !!article.ai_summary;

  return (
    <div className="news-card">
      <div className="news-card-header">
        <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
          <span className={`news-badge ${categoryClass}`}>{categoryLabel}</span>
          {article.market_impact_score != null && (
            <ImpactScoreBadge score={article.market_impact_score} />
          )}
        </div>
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

      {displaySummary && (
        <p className="news-card-summary" style={{ position: "relative" }}>
          {hasAiSummary && (
            <span
              style={{
                display: "inline-block",
                fontSize: "10px",
                fontWeight: 700,
                color: "#7c3aed",
                background: "#ede9fe",
                borderRadius: "3px",
                padding: "1px 4px",
                marginRight: "5px",
                verticalAlign: "middle",
              }}
            >
              AI
            </span>
          )}
          {displaySummary}
        </p>
      )}

      {((article.affected_states?.length ?? 0) > 0 ||
        (article.affected_companies?.length ?? 0) > 0) && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginBottom: "8px" }}>
          {article.affected_states?.map((s) => (
            <span
              key={s}
              style={{
                fontSize: "10px",
                background: "#dbeafe",
                color: "#1d4ed8",
                borderRadius: "3px",
                padding: "1px 5px",
              }}
            >
              {s}
            </span>
          ))}
          {article.affected_companies?.map((c) => (
            <span
              key={c}
              style={{
                fontSize: "10px",
                background: "#fce7f3",
                color: "#9d174d",
                borderRadius: "3px",
                padding: "1px 5px",
              }}
            >
              {c}
            </span>
          ))}
        </div>
      )}

      <div className="news-card-footer">
        <div className="news-card-footer-left">
          <span className="news-source">{article.source}</span>
          <span className="news-date">{formatDate(article.published_at)}</span>
        </div>
        <div className="news-card-footer-right">
          <a
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            className="news-read-btn"
          >
            Read Article ↗
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
/*  Daily Brief Panel                                                  */
/* ------------------------------------------------------------------ */

const THEME_TO_CATEGORY: Record<string, string> = {
  "Data Center": "data_center",
  "Solar": "solar",
  "Wind": "wind",
  "Policy": "policy",
  "Renewable Energy": "renewable_energy",
};

function DailyBriefPanel() {
  const [collapsed, setCollapsed] = useState(false);
  const { data, isLoading } = useDailyBrief();

  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #e2e8f0",
        borderLeft: "4px solid #7c3aed",
        marginBottom: "20px",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 18px",
          background: "#faf5ff",
          cursor: "pointer",
          userSelect: "none",
        }}
        onClick={() => setCollapsed((c) => !c)}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "16px" }}>📊</span>
          <span style={{ fontWeight: 700, fontSize: "14px", color: "#1e293b" }}>
            Today's Market Brief
          </span>
          <span
            style={{
              fontSize: "10px",
              fontWeight: 700,
              color: "#7c3aed",
              background: "#ede9fe",
              borderRadius: "3px",
              padding: "1px 5px",
            }}
          >
            AI
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {data?.generated_at && (
            <span style={{ fontSize: "11px", color: "#94a3b8" }}>
              Generated {new Date(data.generated_at).toLocaleTimeString("en-IN", {
                timeZone: "Asia/Kolkata",
                hour: "2-digit",
                minute: "2-digit",
              })} IST
            </span>
          )}
          <span style={{ fontSize: "12px", color: "#7c3aed", fontWeight: 700 }}>
            {collapsed ? "▶ Show" : "▼ Hide"}
          </span>
        </div>
      </div>

      {/* Body */}
      {!collapsed && (
        <div style={{ padding: "16px 20px" }}>
          {isLoading ? (
            <div style={{ color: "#94a3b8", fontSize: "13px" }}>Generating brief…</div>
          ) : data?.brief ? (
            <pre
              style={{
                margin: 0,
                fontFamily: "inherit",
                fontSize: "13px",
                lineHeight: 1.7,
                color: "#334155",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
              }}
            >
              {data.brief}
            </pre>
          ) : (
            <div style={{ color: "#94a3b8", fontSize: "13px" }}>
              No brief available — will be generated at 06:00 IST or when news articles are present.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Trending Themes Panel                                               */
/* ------------------------------------------------------------------ */

function TrendingThemesPanel({
  onSelectTheme,
  activeTheme,
}: {
  onSelectTheme: (category: string) => void;
  activeTheme: string;
}) {
  const { data: themes = [], isLoading } = useTrendingThemes(7);

  if (isLoading || themes.length === 0) return null;

  return (
    <div style={{ marginBottom: "20px" }}>
      <div
        style={{
          fontSize: "11px",
          fontWeight: 700,
          color: "#64748b",
          textTransform: "uppercase",
          letterSpacing: "0.1em",
          marginBottom: "10px",
        }}
      >
        7-Day Emerging Trends
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
        {themes.map((t) => {
          const catKey = THEME_TO_CATEGORY[t.theme] ?? "";
          const isActive = activeTheme === catKey && catKey !== "";
          const impactColor =
            t.avg_impact_score >= 7 ? "#16a34a" : t.avg_impact_score >= 4 ? "#d97706" : "#6b7280";
          return (
            <button
              key={t.theme}
              onClick={() => catKey && onSelectTheme(isActive ? "" : catKey)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "6px 12px",
                borderRadius: "20px",
                border: `1.5px solid ${isActive ? "#7c3aed" : "#e2e8f0"}`,
                background: isActive ? "#ede9fe" : "#f8fafc",
                color: isActive ? "#7c3aed" : "#334155",
                cursor: catKey ? "pointer" : "default",
                fontSize: "12px",
                fontWeight: 600,
                transition: "all 0.15s",
              }}
            >
              <span>{t.theme}</span>
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 700,
                  background: isActive ? "#ddd6fe" : "#e2e8f0",
                  color: isActive ? "#7c3aed" : "#475569",
                  borderRadius: "10px",
                  padding: "1px 6px",
                }}
              >
                {t.article_count}
              </span>
              <span style={{ fontSize: "10px", color: impactColor, fontWeight: 700 }}>
                ⚡{t.avg_impact_score.toFixed(1)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  News Feed Section                                                   */
/* ------------------------------------------------------------------ */

function NewsFeedSection() {
  const navigate = useNavigate();
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
          navigate("/alerts/custom-watchlists");
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

      <DailyBriefPanel />
      <TrendingThemesPanel
        onSelectTheme={setCategoryFilter}
        activeTheme={categoryFilter}
      />

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
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        <select value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)}>
          <option value="">All Sources</option>
          {availableSources.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        <span className="pm-filter-count">{filtered.length} articles</span>

        {(categoryFilter || stateFilter || sourceFilter) && (
          <button
            className="news-clear-btn"
            onClick={() => { setCategoryFilter(""); setStateFilter(""); setSourceFilter(""); }}
          >
            Clear Filters
          </button>
        )}
      </div>

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

      {filtered.length === 0 ? (
        <div className="news-empty">
          <p>No articles match the current filters.</p>
          <button className="news-clear-btn" onClick={() => { setCategoryFilter(""); setStateFilter(""); setSourceFilter(""); }}>
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
/*  Custom Watchlists Section — full overhaul                          */
/* ------------------------------------------------------------------ */

type SortOption = "date_desc" | "date_asc" | "name_asc" | "name_desc" | "type";

function CustomWatchlistsSection() {
  const { data: watchlists = [], isLoading, isError, refetch } = useWatchlists(DEMO_USER_ID);
  const deleteOne = useDeleteWatchlist(DEMO_USER_ID);
  const deleteBulk = useBulkDeleteWatchlists(DEMO_USER_ID);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<SortOption>("date_desc");
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [confirmBulk, setConfirmBulk] = useState(false);
  const [confirmSingle, setConfirmSingle] = useState<string | null>(null);

  const allTypes = useMemo(
    () => [...new Set(watchlists.map((w) => w.watch_type))].sort(),
    [watchlists]
  );

  const filtered = useMemo(() => {
    let items = watchlists.filter((w) => {
      const matchType = !typeFilter || w.watch_type === typeFilter;
      const matchStatus =
        !statusFilter ||
        (statusFilter === "active" ? w.is_active : !w.is_active);
      const matchSearch =
        !searchQuery ||
        w.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchType && matchStatus && matchSearch;
    });

    switch (sortBy) {
      case "date_desc":
        items = [...items].sort((a, b) =>
          (b.created_at ?? "").localeCompare(a.created_at ?? "")
        );
        break;
      case "date_asc":
        items = [...items].sort((a, b) =>
          (a.created_at ?? "").localeCompare(b.created_at ?? "")
        );
        break;
      case "name_asc":
        items = [...items].sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "name_desc":
        items = [...items].sort((a, b) => b.name.localeCompare(a.name));
        break;
      case "type":
        items = [...items].sort((a, b) => a.watch_type.localeCompare(b.watch_type));
        break;
    }
    return items;
  }, [watchlists, typeFilter, statusFilter, searchQuery, sortBy]);

  const allSelected = filtered.length > 0 && filtered.every((w) => selected.has(w.id));
  const someSelected = selected.size > 0;

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((w) => w.id)));
    }
  };

  const handleUnwatchOne = (id: string) => {
    deleteOne.mutate(id, {
      onSuccess: () => {
        setSelected((prev) => { const n = new Set(prev); n.delete(id); return n; });
        setConfirmSingle(null);
      },
    });
  };

  const handleBulkUnwatch = () => {
    deleteBulk.mutate([...selected], {
      onSuccess: () => {
        setSelected(new Set());
        setConfirmBulk(false);
      },
    });
  };

  if (isLoading) return <LoadingSpinner message="Loading watchlists..." />;
  if (isError) return <ErrorMessage message="Failed to load watchlists" onRetry={() => refetch()} />;

  return (
    <section className="wl-section">
      <div className="wl-header">
        <div>
          <h3>Custom Watchlists</h3>
          <p className="pol-section-desc">
            Articles and topics you are tracking. Add articles to your watchlist from the News Feed.
          </p>
        </div>
        <span className="wl-total-badge">{watchlists.length} items watched</span>
      </div>

      {watchlists.length === 0 ? (
        <div className="news-empty">
          <div className="wl-empty-icon">☆</div>
          <p>No items in your watchlist yet.</p>
          <p className="wl-empty-hint">
            Go to the <strong>News Feed</strong> and click <strong>☆ Watch</strong> on articles you want to track.
          </p>
        </div>
      ) : (
        <>
          {/* Toolbar */}
          <div className="wl-toolbar">
            <div className="wl-search-wrap">
              <svg className="wl-search-icon" width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
              </svg>
              <input
                className="wl-search-input"
                type="text"
                placeholder="Search watchlist…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button className="wl-search-clear" onClick={() => setSearchQuery("")}>✕</button>
              )}
            </div>

            <div className="wl-filters">
              <select className="wl-filter-select" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
                <option value="">All Types</option>
                {allTypes.map((t) => (
                  <option key={t} value={t}>
                    {WATCH_TYPE_META[t]?.label ?? t.replace(/_/g, " ")}
                  </option>
                ))}
              </select>

              <select className="wl-filter-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="">All Statuses</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>

              <select className="wl-filter-select" value={sortBy} onChange={(e) => setSortBy(e.target.value as SortOption)}>
                <option value="date_desc">Newest First</option>
                <option value="date_asc">Oldest First</option>
                <option value="name_asc">Name A → Z</option>
                <option value="name_desc">Name Z → A</option>
                <option value="type">By Type</option>
              </select>

              <span className="pm-filter-count">{filtered.length} items</span>

              {(typeFilter || statusFilter || searchQuery) && (
                <button className="news-clear-btn" onClick={() => { setTypeFilter(""); setStatusFilter(""); setSearchQuery(""); }}>
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Bulk action bar */}
          {someSelected && (
            <div className="wl-bulk-bar">
              <span className="wl-bulk-count">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
                {selected.size} selected
              </span>
              {confirmBulk ? (
                <div className="wl-bulk-confirm">
                  <span>Remove {selected.size} item{selected.size !== 1 ? "s" : ""} from watchlist?</span>
                  <button className="wl-confirm-yes" onClick={handleBulkUnwatch} disabled={deleteBulk.isPending}>
                    {deleteBulk.isPending ? "Removing…" : "Yes, Unwatch"}
                  </button>
                  <button className="wl-confirm-no" onClick={() => setConfirmBulk(false)}>Cancel</button>
                </div>
              ) : (
                <>
                  <button className="wl-bulk-unwatch-btn" onClick={() => setConfirmBulk(true)}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    Unwatch Selected ({selected.size})
                  </button>
                  <button className="wl-bulk-clear" onClick={() => setSelected(new Set())}>Clear Selection</button>
                </>
              )}
            </div>
          )}

          {/* Column header */}
          <div className="wl-list-header">
            <label className="wl-checkbox-label">
              <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} className="wl-checkbox" />
              <span className="wl-select-all-label">{allSelected ? "Deselect All" : "Select All"}</span>
            </label>
            <span className="wl-col-type">Type</span>
            <span className="wl-col-added">Date Added</span>
            <span className="wl-col-status">Status</span>
            <span className="wl-col-actions">Actions</span>
          </div>

          {/* Items */}
          <div className="wl-list">
            {filtered.map((w: Watchlist) => {
              const meta = WATCH_TYPE_META[w.watch_type] ?? {
                label: w.watch_type.replace(/_/g, " "),
                icon: "📌",
                colorClass: "news-badge--renewable",
              };
              const isSelected = selected.has(w.id);
              const isPendingDelete = confirmSingle === w.id;

              return (
                <div
                  key={w.id}
                  className={`wl-item${isSelected ? " wl-item--selected" : ""}${!w.is_active ? " wl-item--inactive" : ""}`}
                >
                  <label className="wl-item-checkbox-label">
                    <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(w.id)} className="wl-checkbox" />
                  </label>

                  <div className="wl-item-body">
                    <div className="wl-item-icon">{meta.icon}</div>
                    <div className="wl-item-info">
                      <p className="wl-item-name">{w.name}</p>
                      <span className="wl-item-hint">
                        {w.watch_type === "news_article" ? `News article · ref: ${w.target_id.slice(0, 8)}…` : `${meta.label} · ${w.target_id}`}
                      </span>
                    </div>
                  </div>

                  <div className="wl-item-type">
                    <span className={`news-badge ${meta.colorClass}`}>{meta.label}</span>
                  </div>

                  <div className="wl-item-date">
                    <span className="wl-date-main">{formatDate(w.created_at)}</span>
                    <span className="wl-date-ago">{timeAgo(w.created_at)}</span>
                  </div>

                  <div className="wl-item-status">
                    <span className={`wl-status-dot wl-status-dot--${w.is_active ? "active" : "inactive"}`} />
                    <span className="wl-status-label">{w.is_active ? "Active" : "Inactive"}</span>
                  </div>

                  <div className="wl-item-actions">
                    {isPendingDelete ? (
                      <div className="wl-inline-confirm">
                        <span>Remove?</span>
                        <button className="wl-confirm-yes wl-confirm-yes--sm" onClick={() => handleUnwatchOne(w.id)} disabled={deleteOne.isPending}>
                          Yes
                        </button>
                        <button className="wl-confirm-no wl-confirm-no--sm" onClick={() => setConfirmSingle(null)}>No</button>
                      </div>
                    ) : (
                      <button className="wl-unwatch-btn" onClick={() => setConfirmSingle(w.id)} title="Remove from watchlist" disabled={deleteOne.isPending}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                        Unwatch
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {filtered.length === 0 && (
            <div className="news-empty"><p>No watchlist items match the current filters.</p></div>
          )}
        </>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Brent Crude Panel                                                   */
/* ------------------------------------------------------------------ */

interface BrentData {
  price: number | null;
  prev_close: number | null;
  change: number | null;
  change_pct: number | null;
  currency: string;
  market_state: string;
  unit: string;
  last_updated: string;
  source: string;
  error?: string;
}

const BRENT_IMPACTS = [
  {
    icon: "⚡",
    label: "INR Pressure",
    detail: "Oil price spikes widen India's current account deficit. Every $10/bbl rise in Brent → ~₹0.40 depreciation pressure on INR/USD.",
    severity: "high",
  },
  {
    icon: "☀️",
    label: "RE Capex Risk",
    detail: "INR depreciation increases imported RE component costs (inverters, trackers, turbines) by 3–5%. Project IRRs erode 80–120 bps.",
    severity: "high",
  },
  {
    icon: "🚢",
    label: "Shipping & Logistics",
    detail: "Elevated crude prices raise freight costs for solar modules (China→India Red Sea route). +15–40% freight inflation possible in conflict scenario.",
    severity: "medium",
  },
  {
    icon: "🏭",
    label: "Gas Power Impact",
    detail: "Correlated LNG price spikes affect India's 8.5 GW gas-fired capacity. Short-term costliness strengthens RE economics.",
    severity: "positive",
  },
];

function BrentCrudePanel() {
  const { data: brent, isLoading, isError } = useQuery<BrentData>({
    queryKey: ["finance", "brent-crude"],
    queryFn: async () => { const { data } = await apiClient.get("/finance/commodity/brent"); return data; },
    staleTime: 3 * 60 * 1000,
    retry: 2,
  });

  const isUp = (brent?.change_pct ?? 0) >= 0;
  const sevColor: Record<string, string> = { high: "#ef4444", medium: "#f59e0b", positive: "#10b981" };

  return (
    <div style={{ background: "#fff", border: "1px solid #e2e8f0", marginBottom: "24px", overflow: "hidden" }}>
      {/* Header */}
      <div style={{ background: "#0f172a", padding: "20px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <div style={{ fontSize: "10px", fontWeight: 700, color: "#ef4444", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: "4px" }}>
            ● LIVE · GEOPOLITICAL COMMODITY ALERT
          </div>
          <h3 style={{ fontSize: "18px", fontWeight: 700, color: "#fff", margin: 0 }}>Brent Crude Oil — Live Price Monitor</h3>
          <p style={{ fontSize: "12px", color: "#94a3b8", marginTop: "4px" }}>
            ICE Brent Futures (BZ=F) · Iran Conflict Watch · India Energy Impact Tracker
          </p>
        </div>
        {brent && !isError && (
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "10px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "4px" }}>
              {brent.market_state === "REGULAR" ? "Market Open" : brent.market_state === "PRE" ? "Pre-Market" : "Market Closed"}
            </div>
            {isLoading ? (
              <div style={{ fontSize: "28px", fontWeight: 800, color: "#94a3b8" }}>Loading…</div>
            ) : brent.price != null ? (
              <>
                <div style={{ fontSize: "32px", fontWeight: 800, color: "#fff", lineHeight: 1, fontFamily: "monospace" }}>
                  ${brent.price.toFixed(2)}
                  <span style={{ fontSize: "14px", color: "#94a3b8", marginLeft: "6px" }}>USD/bbl</span>
                </div>
                {brent.change != null && brent.change_pct != null && (
                  <div style={{ fontSize: "14px", fontWeight: 700, color: isUp ? "#ef4444" : "#22c55e", marginTop: "4px", fontFamily: "monospace" }}>
                    {isUp ? "▲" : "▼"} ${Math.abs(brent.change).toFixed(2)} ({isUp ? "+" : ""}{brent.change_pct.toFixed(2)}%)
                  </div>
                )}
                {brent.prev_close != null && (
                  <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>
                    Prev close: ${brent.prev_close.toFixed(2)}
                  </div>
                )}
              </>
            ) : (
              <div style={{ fontSize: "16px", color: "#64748b" }}>Price unavailable</div>
            )}
          </div>
        )}
      </div>

      {/* Impact cards */}
      <div style={{ padding: "20px 24px" }}>
        <div style={{ fontSize: "10px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "16px" }}>
          India RE Sector Exposure — Key Risk Vectors
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "12px" }}>
          {BRENT_IMPACTS.map((item) => (
            <div key={item.label} style={{ padding: "14px 16px", background: "#f8fafc", border: `1px solid #e2e8f0`, borderLeft: `3px solid ${sevColor[item.severity] ?? "#e2e8f0"}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                <span style={{ fontSize: "16px" }}>{item.icon}</span>
                <span style={{ fontSize: "12px", fontWeight: 700, color: "#1e293b" }}>{item.label}</span>
                <span style={{ marginLeft: "auto", fontSize: "9px", fontWeight: 700, color: sevColor[item.severity], textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  {item.severity === "positive" ? "OPPORTUNITY" : item.severity.toUpperCase()}
                </span>
              </div>
              <p style={{ fontSize: "11px", color: "#64748b", lineHeight: 1.5, margin: 0 }}>{item.detail}</p>
            </div>
          ))}
        </div>

        {/* Scenario table */}
        <div style={{ marginTop: "20px", border: "1px solid #e2e8f0", overflow: "hidden" }}>
          <div style={{ padding: "10px 16px", background: "#f8fafc", borderBottom: "1px solid #e2e8f0", fontSize: "10px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Brent Crude Scenario Projections — India RE Impact
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                {["Scenario", "Brent Range", "INR/USD Est.", "RE Capex Impact", "LNG Price"].map(h => (
                  <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontWeight: 700, color: "#64748b", background: "#f8fafc" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                { s: "Base (No Escalation)", b: "$70–80", inr: "₹83–85", capex: "+0–1%", lng: "$10–13/mmBTU" },
                { s: "Moderate Tension", b: "$85–100", inr: "₹86–89", capex: "+2–4%", lng: "$14–18/mmBTU" },
                { s: "Strait Closure Risk", b: "$110–140", inr: "₹90–95", capex: "+5–8%", lng: "$20–30/mmBTU" },
              ].map((row, i) => (
                <tr key={i} style={{ borderBottom: "1px solid #f1f5f9", background: i % 2 === 0 ? "#fff" : "#f8fafc" }}>
                  <td style={{ padding: "8px 12px", fontWeight: 600, color: "#1e293b" }}>{row.s}</td>
                  <td style={{ padding: "8px 12px", fontFamily: "monospace", color: "#0f766e" }}>{row.b}</td>
                  <td style={{ padding: "8px 12px", fontFamily: "monospace", color: "#475569" }}>{row.inr}</td>
                  <td style={{ padding: "8px 12px", fontFamily: "monospace", color: "#ef4444" }}>{row.capex}</td>
                  <td style={{ padding: "8px 12px", fontFamily: "monospace", color: "#475569" }}>{row.lng}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {brent && (
          <div style={{ marginTop: "12px", fontSize: "10px", color: "#94a3b8" }}>
            Source: {brent.source} · Last updated: {new Date(brent.last_updated).toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata" })} IST · All scenario projections are analytical estimates for informational purposes only.
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Active Alerts Section                                               */
/* ------------------------------------------------------------------ */

function ActiveAlertsSection() {
  const { data: alerts, isLoading, isError, refetch } = useAlerts();

  if (isLoading) return <LoadingSpinner message="Loading alerts..." />;
  if (isError) return <ErrorMessage message="Failed to load alerts" onRetry={() => refetch()} />;

  return (
    <section id="active-alerts">
      <BrentCrudePanel />
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
      {activeSection === "custom-watchlists" && <CustomWatchlistsSection />}
      {activeSection === "ipo-watch" && <IpoWatchPage />}
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
