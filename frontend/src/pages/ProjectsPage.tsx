import { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import { useProjects } from "../hooks/useProjects";
import LoadingSpinner from "../components/common/LoadingSpinner";
import ErrorMessage from "../components/common/ErrorMessage";
import apiClient from "../api/client";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

interface DcStock {
  dc_company: string;
  parent_company: string;
  ticker: string;
  exchange: string;
  price: number | null;
  prev_close: number | null;
  change_pct: number | null;
  currency: string;
  market_state: string;
  error?: string;
}

interface DcStockResponse {
  stocks: DcStock[];
  fetched_at: string;
}

interface DcCompanyInfo {
  company: string;
  dcCount: number;
  states: string[];
  names: string[];
}

/* ------------------------------------------------------------------ */
/*  DC Company Aggregator (from public GeoJSON)                        */
/* ------------------------------------------------------------------ */

async function fetchDcCompanyInfo(): Promise<Record<string, DcCompanyInfo>> {
  try {
    const res = await fetch("/datacenters.geojson");
    const json = (await res.json()) as {
      features: Array<{ properties: Record<string, unknown> }>;
    };
    const map: Record<string, DcCompanyInfo> = {};
    for (const feat of json.features) {
      const p = feat.properties;
      const company = (p["company"] as string) || "";
      if (!company) continue;
      const state = (p["state"] as string) || "";
      const name  = (p["name"]  as string) || "";
      if (!map[company]) map[company] = { company, dcCount: 0, states: [], names: [] };
      map[company].dcCount += 1;
      if (state && !map[company].states.includes(state)) map[company].states.push(state);
      if (name  && !map[company].names.includes(name))  map[company].names.push(name);
    }
    return map;
  } catch {
    return {};
  }
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */

function formatPrice(price: number | null, currency: string): string {
  if (price == null) return "—";
  const sym =
    currency === "INR" ? "₹" :
    currency === "USD" ? "$" :
    currency === "SGD" ? "S$" :
    currency === "JPY" ? "¥" :
    currency + "\u00a0";
  const decimals = currency === "JPY" ? 0 : 2;
  return `${sym}${price.toLocaleString("en-IN", { maximumFractionDigits: decimals })}`;
}

function ExchangeBadge({ exchange }: { exchange: string }) {
  const colors: Record<string, { bg: string; color: string }> = {
    NSE:    { bg: "#dbeafe", color: "#1d4ed8" },
    NASDAQ: { bg: "#dcfce7", color: "#166534" },
    NYSE:   { bg: "#ede9fe", color: "#5b21b6" },
    SGX:    { bg: "#fce7f3", color: "#9d174d" },
    TSE:    { bg: "#fff7ed", color: "#c2410c" },
  };
  const c = colors[exchange] ?? { bg: "#f3f4f6", color: "#374151" };
  return (
    <span style={{
      background: c.bg, color: c.color,
      padding: "2px 8px", borderRadius: "5px",
      fontSize: "11px", fontWeight: 600, letterSpacing: "0.04em",
    }}>
      {exchange}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Developer Profiles Section                                          */
/* ------------------------------------------------------------------ */

function DeveloperProfilesSection() {
  const [stocks, setStocks]           = useState<DcStock[]>([]);
  const [dcInfo, setDcInfo]           = useState<Record<string, DcCompanyInfo>>({});
  const [loading, setLoading]         = useState(true);
  const [fetchError, setFetchError]   = useState<string | null>(null);
  const [fetchedAt, setFetchedAt]     = useState<string | null>(null);
  const [expanded, setExpanded]       = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const [stockResp, dcInfoMap] = await Promise.all([
        apiClient.get<DcStockResponse>("/projects/dc-stocks"),
        fetchDcCompanyInfo(),
      ]);
      setStocks(stockResp.data.stocks);
      setFetchedAt(stockResp.data.fetched_at);
      setDcInfo(dcInfoMap);
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : "Failed to load stock data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadData(); }, [loadData]);

  const allCompanies = Object.values(dcInfo).sort((a, b) => b.dcCount - a.dcCount);
  const stockByCompany = Object.fromEntries(stocks.map((s) => [s.dc_company, s]));

  const fetchedTime = fetchedAt
    ? new Date(fetchedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })
    : null;

  if (loading) return <LoadingSpinner message="Fetching stock prices…" />;
  if (fetchError) return <ErrorMessage message={fetchError} onRetry={loadData} />;

  const listedCount  = stocks.filter((s) => !s.error && s.price != null).length;
  const totalDcs     = allCompanies.reduce((s, c) => s + c.dcCount, 0);
  const uniqueStates = new Set(allCompanies.flatMap((c) => c.states)).size;

  return (
    <section className="dev-profiles-section">
      {/* Header */}
      <div className="dev-profiles-header">
        <div>
          <h3 className="dev-profiles-title">Data Center Developer Profiles</h3>
          <p className="dev-profiles-desc">
            Operators in our database — publicly listed entities show end-of-day stock prices
            via Yahoo Finance (no API key, free). Prices refresh on page load or on demand.
          </p>
        </div>
        <div className="dev-profiles-toolbar">
          {fetchedTime && (
            <span className="dev-profiles-ts">EOD prices as of {fetchedTime}</span>
          )}
          <button className="dev-profiles-refresh" onClick={loadData} title="Refresh stock prices">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="1 4 1 10 7 10" />
              <path d="M3.51 15a9 9 0 102.13-9.36L1 10" />
            </svg>
            Refresh
          </button>
        </div>
      </div>

      {/* KPI row */}
      <div className="dev-profiles-kpis">
        {[
          { val: allCompanies.length, lbl: "DC Operators" },
          { val: listedCount,         lbl: "Listed & Priced" },
          { val: totalDcs,            lbl: "Total Data Centers" },
          { val: uniqueStates,        lbl: "States Covered" },
        ].map((k) => (
          <div key={k.lbl} className="dev-profiles-kpi">
            <span className="dev-profiles-kpi-val">{k.val}</span>
            <span className="dev-profiles-kpi-lbl">{k.lbl}</span>
          </div>
        ))}
      </div>

      {/* Company cards grid */}
      <div className="dev-profiles-grid">
        {allCompanies.map((info) => {
          const stock    = stockByCompany[info.company];
          const hasStock = !!(stock && !stock.error && stock.price != null);
          const isPos    = (stock?.change_pct ?? 0) > 0;
          const isNeg    = (stock?.change_pct ?? 0) < 0;
          const isExp    = expanded === info.company;

          return (
            <div key={info.company} className={`dev-profile-card${hasStock ? " dev-profile-card--listed" : ""}`}>
              {/* Top */}
              <div className="dev-profile-card-top">
                <div className="dev-profile-avatar">
                  {info.company.replace(/[^a-zA-Z]/g, "").slice(0, 2).toUpperCase()}
                </div>
                <div className="dev-profile-info">
                  <h4 className="dev-profile-name">{info.company}</h4>
                  {stock && <p className="dev-profile-parent">{stock.parent_company}</p>}
                </div>
                {stock && <ExchangeBadge exchange={stock.exchange} />}
              </div>

              {/* DC stats */}
              <div className="dev-profile-stats">
                <div className="dev-profile-stat">
                  <span className="dev-profile-stat-val">{info.dcCount}</span>
                  <span className="dev-profile-stat-lbl">Data Centers</span>
                </div>
                <div className="dev-profile-stat">
                  <span className="dev-profile-stat-val">{info.states.length}</span>
                  <span className="dev-profile-stat-lbl">States</span>
                </div>
                {hasStock && (
                  <>
                    <div className="dev-profile-stat">
                      <span className="dev-profile-stat-val">{stock!.ticker}</span>
                      <span className="dev-profile-stat-lbl">Ticker</span>
                    </div>
                    <div className="dev-profile-stat">
                      <span
                        className="dev-profile-stat-val"
                        style={{ color: isPos ? "#16a34a" : isNeg ? "#dc2626" : "#374151" }}
                      >
                        {stock!.change_pct != null
                          ? `${stock!.change_pct > 0 ? "+" : ""}${stock!.change_pct.toFixed(2)}%`
                          : "—"}
                      </span>
                      <span className="dev-profile-stat-lbl">Day Change</span>
                    </div>
                  </>
                )}
              </div>

              {/* Stock price */}
              {hasStock && (
                <div className="dev-profile-price-row">
                  <div>
                    <span className="dev-profile-price-val">
                      {formatPrice(stock!.price, stock!.currency)}
                    </span>
                    <span className="dev-profile-price-prev">
                      prev close {formatPrice(stock!.prev_close, stock!.currency)}
                    </span>
                  </div>
                  <span
                    className="dev-profile-change-pill"
                    style={{
                      background: isPos ? "#dcfce7" : isNeg ? "#fee2e2" : "#f3f4f6",
                      color:      isPos ? "#16a34a" : isNeg ? "#dc2626" : "#6b7280",
                    }}
                  >
                    {isPos ? "▲" : isNeg ? "▼" : "—"}{" "}
                    {stock!.change_pct != null
                      ? Math.abs(stock!.change_pct).toFixed(2) + "%"
                      : "unchanged"}
                  </span>
                </div>
              )}

              {!stock && (
                <div className="dev-profile-unlisted">
                  <svg width="12" height="12" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"/>
                  </svg>
                  Privately held
                </div>
              )}

              {stock?.error && (
                <div className="dev-profile-unlisted dev-profile-unlisted--warn">
                  <svg width="12" height="12" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
                  </svg>
                  Price unavailable · market may be closed
                </div>
              )}

              {/* Expand / collapse DC list */}
              {info.names.length > 0 && (
                <button
                  className="dev-profile-expand-btn"
                  onClick={() => setExpanded(isExp ? null : info.company)}
                >
                  {isExp ? "Hide facilities" : `Show ${info.dcCount} facilit${info.dcCount !== 1 ? "ies" : "y"}`}
                  <svg
                    width="12" height="12" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2"
                    style={{ transform: isExp ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>
              )}

              {isExp && (
                <ul className="dev-profile-dc-list">
                  {info.names.map((n) => (
                    <li key={n} className="dev-profile-dc-item">
                      <svg width="11" height="11" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 110 2h-3a1 1 0 01-1-1v-2a1 1 0 00-1-1H9a1 1 0 00-1 1v2a1 1 0 01-1 1H4a1 1 0 110-2V4zm3 1h2v2H7V5zm2 4H7v2h2V9zm2-4h2v2h-2V5zm2 4h-2v2h2V9z" clipRule="evenodd"/>
                      </svg>
                      {n}
                    </li>
                  ))}
                  {info.states.length > 0 && (
                    <li className="dev-profile-states">States: {info.states.join(", ")}</li>
                  )}
                </ul>
              )}
            </div>
          );
        })}
      </div>

      <p className="dev-profiles-disclaimer">
        Stock prices from Yahoo Finance (end-of-day, free). NSE/BSE in INR · NASDAQ/NYSE in USD · SGX in SGD · TSE in JPY.
        Not investment advice. Verify on official exchange websites before acting on any price data.
      </p>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Page                                                           */
/* ------------------------------------------------------------------ */

function ProjectsPage() {
  const { section } = useParams<{ section: string }>();
  const activeSection = section || "project-directory";
  const { data: projects, isLoading, isError, refetch } = useProjects();

  if (isLoading) return <LoadingSpinner message="Loading projects..." />;
  if (isError)
    return (
      <ErrorMessage
        message="Failed to load projects"
        onRetry={() => refetch()}
      />
    );

  return (
    <div className="projects-page">
      <h2>Project &amp; Developer Intelligence</h2>

      {activeSection === "project-directory" && (
        <section id="project-directory">
          <h3>Project Directory</h3>
          <p>
            {projects?.length ?? 0} projects loaded. Comprehensive database of
            operational, under-construction, and planned solar projects.
          </p>
        </section>
      )}

      {activeSection === "developer-profiles" && <DeveloperProfilesSection />}

      {activeSection === "tender-intelligence" && (
        <section id="tender-intelligence">
          <h3>Tender Intelligence</h3>
          <p>Real-time updates on upcoming and awarded tenders with bid analytics.</p>
        </section>
      )}

      {activeSection === "land-availability" && (
        <section id="land-availability">
          <h3>Land Availability</h3>
          <p>
            Analyze available land parcels for renewable energy project development with
            satellite-based land classification, proximity to grid infrastructure, and
            suitability scoring. Filter by state, land type, and minimum area.
          </p>
        </section>
      )}
    </div>
  );
}

export default ProjectsPage;
