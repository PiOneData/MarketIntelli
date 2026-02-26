import { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import { useProjects } from "../hooks/useProjects";
import { useCompanies, useFacilityStats } from "../hooks/useDataCenters";
import LoadingSpinner from "../components/common/LoadingSpinner";
import ErrorMessage from "../components/common/ErrorMessage";
import apiClient from "../api/client";
import type { DataCenterCompany } from "../types/dataCenters";

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
/*  Stock price link helper                                             */
/* ------------------------------------------------------------------ */

function getStockLink(ticker: string): string {
  return `https://finance.yahoo.com/quote/${encodeURIComponent(ticker)}/`;
}

function getExchangeDisplayName(exchange: string): string {
  const names: Record<string, string> = {
    NSE: "National Stock Exchange (NSE)",
    BSE: "Bombay Stock Exchange (BSE)",
    NASDAQ: "NASDAQ",
    NYSE: "New York Stock Exchange (NYSE)",
    SGX: "Singapore Exchange (SGX)",
    TSE: "Tokyo Stock Exchange (TSE)",
  };
  return names[exchange] ?? exchange;
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

function formatMillions(val: number | null): string {
  if (val == null) return "—";
  if (val >= 1_000_000_000) return `$${(val / 1_000_000_000).toFixed(1)}B`;
  if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(0)}M`;
  return `$${val.toLocaleString()}`;
}

function ExchangeBadge({ exchange }: { exchange: string }) {
  const colors: Record<string, { bg: string; color: string }> = {
    NSE:    { bg: "#f0f0f0", color: "#1a1a1a" },
    BSE:    { bg: "#f0f0f0", color: "#1a1a1a" },
    NASDAQ: { bg: "#f0f0f0", color: "#1a1a1a" },
    NYSE:   { bg: "#f0f0f0", color: "#1a1a1a" },
    SGX:    { bg: "#f0f0f0", color: "#1a1a1a" },
    TSE:    { bg: "#f0f0f0", color: "#1a1a1a" },
  };
  const c = colors[exchange] ?? { bg: "#f0f0f0", color: "#1a1a1a" };
  return (
    <span style={{
      background: c.bg, color: c.color,
      padding: "2px 8px", borderRadius: "2px",
      fontSize: "10px", fontWeight: 700, letterSpacing: "0.06em",
      border: "1px solid #d1d5db",
    }}>
      {exchange}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Company Profile Modal                                               */
/* ------------------------------------------------------------------ */

type ModalTab = "overview" | "specs" | "ecosystem" | "location" | "stock";

interface CompanyProfileModalProps {
  company: DataCenterCompany;
  stock: DcStock | undefined;
  dcInfo: DcCompanyInfo | undefined;
  onClose: () => void;
}

function CompanyProfileModal({ company, stock, dcInfo, onClose }: CompanyProfileModalProps) {
  const [tab, setTab] = useState<ModalTab>("overview");

  const hasStock = !!(stock && !stock.error && stock.price != null);
  const isPos = (stock?.change_pct ?? 0) > 0;
  const isNeg = (stock?.change_pct ?? 0) < 0;

  const TABS: { id: ModalTab; label: string }[] = [
    { id: "overview",   label: "Overview" },
    { id: "specs",      label: "Specs" },
    { id: "ecosystem",  label: "Ecosystem" },
    { id: "location",   label: "Location" },
    { id: "stock",      label: "Stock Price" },
  ];

  const initials = company.name.replace(/[^a-zA-Z]/g, "").slice(0, 2).toUpperCase();

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)",
          zIndex: 1000,
        }}
      />

      {/* Panel */}
      <div style={{
        position: "fixed", top: 0, right: 0, bottom: 0, width: "560px",
        background: "#fff", zIndex: 1001,
        borderLeft: "1px solid #e5e7eb",
        display: "flex", flexDirection: "column",
        fontFamily: "var(--font-family, 'Inter', system-ui, sans-serif)",
        overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{
          padding: "24px 24px 0",
          borderBottom: "1px solid #e5e7eb",
          background: "#f9fafb",
        }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: "16px", marginBottom: "20px" }}>
            <div style={{
              width: "52px", height: "52px", background: "#0f766e",
              color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "18px", fontWeight: 700, flexShrink: 0,
            }}>
              {initials}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h2 style={{ margin: 0, fontSize: "18px", fontWeight: 700, color: "#111827", lineHeight: 1.3 }}>
                {company.name}
              </h2>
              {company.parent_company && (
                <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#6b7280" }}>
                  {company.parent_company}
                </p>
              )}
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "6px", flexWrap: "wrap" }}>
                {stock && <ExchangeBadge exchange={stock.exchange} />}
                {hasStock && stock && (
                  <a
                    href={getStockLink(stock.ticker)}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ fontSize: "12px", color: "#1e293b", textDecoration: "underline" }}
                  >
                    {stock.ticker} on Yahoo Finance ↗
                  </a>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              style={{
                border: "1px solid #e5e7eb", background: "#fff",
                width: "32px", height: "32px", display: "flex",
                alignItems: "center", justifyContent: "center",
                cursor: "pointer", flexShrink: 0, fontSize: "16px",
                color: "#6b7280",
              }}
            >
              ✕
            </button>
          </div>

          {/* Tab bar */}
          <div style={{ display: "flex", gap: 0, overflowX: "auto" }}>
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                style={{
                  padding: "10px 16px",
                  border: "none",
                  borderBottom: tab === t.id ? "2px solid #0f766e" : "2px solid transparent",
                  background: "transparent",
                  cursor: "pointer",
                  fontSize: "13px",
                  fontWeight: tab === t.id ? 600 : 400,
                  color: tab === t.id ? "#0f766e" : "#6b7280",
                  whiteSpace: "nowrap",
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflow: "auto", padding: "24px" }}>

          {/* Overview Tab */}
          {tab === "overview" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                {[
                  { lbl: "Facilities", val: company.facility_count.toString() },
                  { lbl: "Total Capacity", val: company.total_capacity_mw > 0 ? `${company.total_capacity_mw} MW` : "—" },
                  { lbl: "Headquarters", val: company.headquarters ?? "—" },
                  { lbl: "Sustainability", val: company.sustainability_rating ?? "—" },
                ].map((item) => (
                  <div key={item.lbl} style={{
                    padding: "14px 16px", border: "1px solid #e5e7eb",
                    background: "#f9fafb",
                  }}>
                    <div style={{ fontSize: "11px", color: "#6b7280", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      {item.lbl}
                    </div>
                    <div style={{ fontSize: "15px", fontWeight: 600, color: "#111827" }}>{item.val}</div>
                  </div>
                ))}
              </div>
              {company.website && (
                <div>
                  <div style={{ fontSize: "11px", color: "#6b7280", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Website
                  </div>
                  <a
                    href={company.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ fontSize: "14px", color: "#1e293b", textDecoration: "underline" }}
                  >
                    {company.website}
                  </a>
                </div>
              )}
              {dcInfo && dcInfo.names.length > 0 && (
                <div>
                  <div style={{ fontSize: "11px", color: "#6b7280", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Facilities in Database
                  </div>
                  <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: "4px" }}>
                    {dcInfo.names.map((n) => (
                      <li key={n} style={{
                        padding: "8px 12px", border: "1px solid #e5e7eb",
                        fontSize: "13px", color: "#374151", background: "#fff",
                        display: "flex", alignItems: "center", gap: "8px",
                      }}>
                        <span style={{ color: "#9ca3af" }}>▪</span>
                        {n}
                      </li>
                    ))}
                    {dcInfo.states.length > 0 && (
                      <li style={{ padding: "8px 12px", fontSize: "12px", color: "#6b7280", fontStyle: "italic" }}>
                        States: {dcInfo.states.join(", ")}
                      </li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Specs Tab */}
          {tab === "specs" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {[
                { lbl: "Total Facilities", val: company.facility_count.toString() },
                { lbl: "Total Capacity (MW)", val: company.total_capacity_mw > 0 ? `${company.total_capacity_mw} MW` : "—" },
                { lbl: "Total Investment", val: formatMillions(company.total_investment_usd) },
                { lbl: "Annual Revenue", val: formatMillions(company.annual_revenue_usd) },
                { lbl: "Employee Count", val: company.employee_count ? company.employee_count.toLocaleString() : "—" },
                { lbl: "Sustainability Rating", val: company.sustainability_rating ?? "—" },
              ].map((row) => (
                <div key={row.lbl} style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "12px 16px", border: "1px solid #e5e7eb", background: "#f9fafb",
                }}>
                  <span style={{ fontSize: "13px", color: "#6b7280" }}>{row.lbl}</span>
                  <span style={{ fontSize: "14px", fontWeight: 600, color: "#111827" }}>{row.val}</span>
                </div>
              ))}
            </div>
          )}

          {/* Ecosystem Tab */}
          {tab === "ecosystem" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <p style={{ fontSize: "13px", color: "#6b7280", margin: 0 }}>
                Ecosystem information for {company.name} — related subsidiaries, partnerships, and data center facilities.
              </p>
              {dcInfo && (
                <div>
                  <div style={{ fontSize: "11px", color: "#6b7280", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Geographic Presence
                  </div>
                  {dcInfo.states.length > 0 ? (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                      {dcInfo.states.map((s) => (
                        <span key={s} style={{
                          padding: "4px 10px", border: "1px solid #d1d5db",
                          fontSize: "12px", color: "#374151", background: "#f9fafb",
                        }}>
                          {s}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p style={{ fontSize: "13px", color: "#9ca3af", margin: 0 }}>No state data available.</p>
                  )}
                </div>
              )}
              {company.parent_company && (
                <div>
                  <div style={{ fontSize: "11px", color: "#6b7280", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Parent Company
                  </div>
                  <div style={{ padding: "12px 16px", border: "1px solid #e5e7eb", background: "#f9fafb", fontSize: "14px", color: "#111827" }}>
                    {company.parent_company}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Location Tab */}
          {tab === "location" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ padding: "14px 16px", border: "1px solid #e5e7eb", background: "#f9fafb" }}>
                <div style={{ fontSize: "11px", color: "#6b7280", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Headquarters
                </div>
                <div style={{ fontSize: "15px", fontWeight: 600, color: "#111827" }}>
                  {company.headquarters ?? "Not specified"}
                </div>
              </div>
              {dcInfo && dcInfo.states.length > 0 && (
                <div>
                  <div style={{ fontSize: "11px", color: "#6b7280", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    States with Data Centers
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                    {dcInfo.states.map((s) => (
                      <span key={s} style={{
                        padding: "6px 12px", border: "1px solid #d1d5db",
                        fontSize: "13px", color: "#111827", background: "#fff", fontWeight: 500,
                      }}>
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {dcInfo && dcInfo.names.length > 0 && (
                <div>
                  <div style={{ fontSize: "11px", color: "#6b7280", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Facility Locations
                  </div>
                  <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: "4px" }}>
                    {dcInfo.names.map((n) => (
                      <li key={n} style={{
                        padding: "8px 12px", border: "1px solid #e5e7eb",
                        fontSize: "13px", color: "#374151", background: "#fff",
                      }}>
                        {n}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Stock Price Tab */}
          {tab === "stock" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {hasStock && stock ? (
                <>
                  {/* Main price block */}
                  <div style={{
                    padding: "20px", border: "1px solid #e5e7eb", background: "#f9fafb",
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div>
                        <div style={{ fontSize: "11px", color: "#6b7280", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                          Current Price
                        </div>
                        <div style={{ fontSize: "28px", fontWeight: 700, color: "#111827" }}>
                          {formatPrice(stock.price, stock.currency)}
                        </div>
                        <div style={{ fontSize: "13px", color: "#6b7280", marginTop: "4px" }}>
                          Prev close: {formatPrice(stock.prev_close, stock.currency)}
                        </div>
                      </div>
                      <div style={{
                        padding: "8px 14px",
                        background: isPos ? "#f0fdf4" : isNeg ? "#fef2f2" : "#f9fafb",
                        border: `1px solid ${isPos ? "#bbf7d0" : isNeg ? "#fecaca" : "#e5e7eb"}`,
                        textAlign: "right",
                      }}>
                        <div style={{
                          fontSize: "18px", fontWeight: 700,
                          color: isPos ? "#16a34a" : isNeg ? "#dc2626" : "#374151",
                        }}>
                          {isPos ? "▲" : isNeg ? "▼" : "—"}{" "}
                          {stock.change_pct != null ? `${Math.abs(stock.change_pct).toFixed(2)}%` : "0.00%"}
                        </div>
                        <div style={{ fontSize: "11px", color: "#6b7280", marginTop: "2px" }}>Day change</div>
                      </div>
                    </div>
                  </div>

                  {/* Details */}
                  {[
                    { lbl: "Ticker", val: stock.ticker },
                    { lbl: "Exchange", val: getExchangeDisplayName(stock.exchange) },
                    { lbl: "Currency", val: stock.currency },
                    { lbl: "Market State", val: stock.market_state },
                    { lbl: "Parent Company", val: stock.parent_company },
                  ].map((row) => (
                    <div key={row.lbl} style={{
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                      padding: "10px 14px", border: "1px solid #e5e7eb", background: "#fff",
                    }}>
                      <span style={{ fontSize: "13px", color: "#6b7280" }}>{row.lbl}</span>
                      <span style={{ fontSize: "13px", fontWeight: 500, color: "#111827" }}>{row.val}</span>
                    </div>
                  ))}

                  <a
                    href={getStockLink(stock.ticker)}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                      padding: "12px 20px", background: "#0f766e", color: "#fff",
                      textDecoration: "none", fontSize: "14px", fontWeight: 600,
                      border: "none", borderRadius: "0.375rem",
                    }}
                  >
                    View {stock.ticker} on Yahoo Finance ↗
                  </a>

                  <p style={{ fontSize: "11px", color: "#9ca3af", margin: 0 }}>
                    Prices from Yahoo Finance (end-of-day). Not investment advice.
                  </p>
                </>
              ) : stock?.error ? (
                <div style={{ padding: "20px", border: "1px solid #e5e7eb", background: "#fefce8", textAlign: "center" }}>
                  <div style={{ fontSize: "14px", color: "#713f12", fontWeight: 500 }}>Price unavailable</div>
                  <div style={{ fontSize: "12px", color: "#92400e", marginTop: "4px" }}>Market may be closed or data temporarily unavailable.</div>
                </div>
              ) : (
                <div style={{ padding: "20px", border: "1px solid #e5e7eb", background: "#f9fafb", textAlign: "center" }}>
                  <div style={{ fontSize: "14px", color: "#6b7280" }}>Not publicly listed</div>
                  <div style={{ fontSize: "12px", color: "#9ca3af", marginTop: "4px" }}>This company does not have a public stock listing in our database.</div>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Developer Profiles Section                                          */
/* ------------------------------------------------------------------ */

function DeveloperProfilesSection() {
  const [stocks, setStocks]           = useState<DcStock[]>([]);
  const [dcInfo, setDcInfo]           = useState<Record<string, DcCompanyInfo>>({});
  const [stockLoading, setStockLoading] = useState(true);
  const [fetchError, setFetchError]   = useState<string | null>(null);
  const [fetchedAt, setFetchedAt]     = useState<string | null>(null);
  const [viewMode, setViewMode]       = useState<"grid" | "list">("grid");
  const [search, setSearch]           = useState("");
  const [selectedCompany, setSelectedCompany] = useState<DataCenterCompany | null>(null);

  const { data: companiesData, isLoading: companiesLoading } = useCompanies({ page_size: 500 });
  const { data: facilityStats } = useFacilityStats();

  const loadStockData = useCallback(async () => {
    setStockLoading(true);
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
      setStockLoading(false);
    }
  }, []);

  useEffect(() => { void loadStockData(); }, [loadStockData]);

  const companies = companiesData ?? [];
  const stockByCompany = Object.fromEntries(stocks.map((s) => [s.dc_company, s]));
  const listedCount = stocks.filter((s) => !s.error && s.price != null).length;
  const totalDcs = facilityStats?.total_facilities ?? 0;

  const fetchedTime = fetchedAt
    ? new Date(fetchedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })
    : null;

  const filtered = companies.filter((c) =>
    !search || c.name.toLowerCase().includes(search.toLowerCase())
  );

  if (companiesLoading || stockLoading) return <LoadingSpinner message="Loading developer profiles…" />;
  if (fetchError) return <ErrorMessage message={fetchError} onRetry={loadStockData} />;

  return (
    <section style={{ fontFamily: "var(--font-family, 'Inter', system-ui, sans-serif)" }}>
      {/* Header */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "flex-start",
        marginBottom: "20px", flexWrap: "wrap", gap: "12px",
      }}>
        <div>
          <h3 style={{ margin: 0, fontSize: "20px", fontWeight: 700, color: "#111827" }}>
            Data Center Developer Profiles
          </h3>
          <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#6b7280" }}>
            {companies.length} operators · publicly listed entities show end-of-day stock prices via Yahoo Finance
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          {fetchedTime && (
            <span style={{ fontSize: "12px", color: "#9ca3af" }}>EOD as of {fetchedTime}</span>
          )}
          <button
            onClick={loadStockData}
            style={{
              display: "flex", alignItems: "center", gap: "6px",
              padding: "7px 12px", border: "1px solid #d1d5db",
              background: "#fff", cursor: "pointer", fontSize: "12px",
              color: "#374151", fontWeight: 500,
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="1 4 1 10 7 10" />
              <path d="M3.51 15a9 9 0 102.13-9.36L1 10" />
            </svg>
            Refresh
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "20px", marginBottom: "24px" }}>
        {[
          { val: companies.length, lbl: "DC Operators",       topColor: "#0f766e" },
          { val: listedCount,      lbl: "Listed & Priced",    topColor: "#f59e0b" },
          { val: totalDcs,         lbl: "Total Data Centers", topColor: "#16a34a" },
        ].map((k) => (
          <div key={k.lbl}
            style={{
              padding: "20px", background: "#fff",
              border: "1px solid #e2e8f0",
              borderTop: `3px solid ${k.topColor}`,
              borderRadius: "0.75rem",
              boxShadow: "0 1px 3px rgba(0,0,0,0.07)",
              display: "flex", flexDirection: "column", gap: "6px",
              transition: "transform 0.2s ease, box-shadow 0.2s ease",
              cursor: "default",
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)"; (e.currentTarget as HTMLDivElement).style.boxShadow = "0 4px 12px rgba(0,0,0,0.1)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)"; (e.currentTarget as HTMLDivElement).style.boxShadow = "0 1px 3px rgba(0,0,0,0.07)"; }}
          >
            <span style={{ fontSize: "1.875rem", fontWeight: 700, color: "#0f172a", lineHeight: 1 }}>{k.val}</span>
            <span style={{ fontSize: "0.875rem", color: "#64748b", fontWeight: 500 }}>{k.lbl}</span>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "20px", flexWrap: "wrap" }}>
        <input
          type="text"
          placeholder="Search companies…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            flex: 1, minWidth: "200px", padding: "8px 12px",
            border: "1px solid #d1d5db", background: "#fff",
            fontSize: "13px", color: "#111827", outline: "none",
          }}
        />
        <div style={{ display: "flex", border: "1px solid #d1d5db" }}>
          {(["grid", "list"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setViewMode(m)}
              style={{
                padding: "8px 14px", border: "none",
                background: viewMode === m ? "#0f766e" : "#fff",
                color: viewMode === m ? "#fff" : "#6b7280",
                cursor: "pointer", fontSize: "12px", fontWeight: 500,
              }}
            >
              {m === "grid" ? "⊞ Grid" : "☰ List"}
            </button>
          ))}
        </div>
      </div>

      {/* Company cards */}
      {viewMode === "grid" ? (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
          gap: "12px",
        }}>
          {filtered.map((co) => {
            const stock = stockByCompany[co.name];
            const hasStock = !!(stock && !stock.error && stock.price != null);
            const isPos = (stock?.change_pct ?? 0) > 0;
            const isNeg = (stock?.change_pct ?? 0) < 0;

            return (
              <div
                key={co.id}
                onClick={() => setSelectedCompany(co)}
                style={{
                  border: "1px solid #e5e7eb", background: "#fff",
                  cursor: "pointer", padding: "16px",
                  transition: "border-color 0.15s",
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = "#1e293b"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = "#e5e7eb"; }}
              >
                {/* Top */}
                <div style={{ display: "flex", alignItems: "flex-start", gap: "12px", marginBottom: "10px" }}>
                  <div style={{
                    width: "40px", height: "40px", background: "#0f766e",
                    color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "14px", fontWeight: 700, flexShrink: 0,
                  }}>
                    {co.name.replace(/[^a-zA-Z]/g, "").slice(0, 2).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: "14px", fontWeight: 600, color: "#111827", lineHeight: 1.3 }}>
                      {co.name}
                    </div>
                    {co.headquarters && (
                      <div style={{ fontSize: "11px", color: "#9ca3af", marginTop: "2px" }}>
                        {co.headquarters}
                      </div>
                    )}
                  </div>
                  {stock && <ExchangeBadge exchange={stock.exchange} />}
                </div>

                {/* Website + Tier */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px", flexWrap: "wrap", gap: "4px" }}>
                  {co.website ? (
                    <a
                      href={co.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      style={{ fontSize: "11px", color: "#0f766e", textDecoration: "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "160px" }}
                      title={co.website}
                    >
                      ↗ {co.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                    </a>
                  ) : (
                    <span style={{ fontSize: "11px", color: "#d1d5db" }}>No website</span>
                  )}
                  <span style={{ fontSize: "10px", color: "#6b7280", background: "#f3f4f6", padding: "2px 6px", border: "1px solid #e5e7eb" }}>
                    {co.sustainability_rating ?? "Tier: N/A"}
                  </span>
                </div>

                {/* Facility count from DB */}
                <div style={{
                  fontSize: "12px", color: "#6b7280",
                  borderTop: "1px solid #f3f4f6", paddingTop: "10px",
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                }}>
                  <span>{co.facility_count} {co.facility_count === 1 ? "facility" : "facilities"}</span>
                  {hasStock && stock ? (
                    <span style={{
                      fontSize: "12px", fontWeight: 600,
                      color: isPos ? "#16a34a" : isNeg ? "#dc2626" : "#374151",
                    }}>
                      {isPos ? "▲" : isNeg ? "▼" : ""}{" "}
                      {formatPrice(stock.price, stock.currency)}
                    </span>
                  ) : (
                    <span style={{ fontSize: "11px", color: "#d1d5db" }}>Private</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1px", border: "1px solid #e5e7eb" }}>
          {/* List header */}
          <div style={{
            display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr",
            padding: "10px 16px", background: "#f9fafb",
            fontSize: "11px", color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em",
            fontWeight: 600,
          }}>
            <span>Company</span>
            <span>Facilities</span>
            <span>Website</span>
            <span>Exchange</span>
            <span style={{ textAlign: "right" }}>Price</span>
          </div>

          {filtered.map((co) => {
            const stock = stockByCompany[co.name];
            const hasStock = !!(stock && !stock.error && stock.price != null);
            const isPos = (stock?.change_pct ?? 0) > 0;
            const isNeg = (stock?.change_pct ?? 0) < 0;

            return (
              <div
                key={co.id}
                onClick={() => setSelectedCompany(co)}
                style={{
                  display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr",
                  padding: "12px 16px", background: "#fff", cursor: "pointer",
                  borderTop: "1px solid #f3f4f6", alignItems: "center",
                  transition: "background 0.1s",
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = "#f9fafb"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = "#fff"; }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div style={{
                    width: "32px", height: "32px", background: "#0f766e",
                    color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "11px", fontWeight: 700, flexShrink: 0,
                  }}>
                    {co.name.replace(/[^a-zA-Z]/g, "").slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontSize: "13px", fontWeight: 600, color: "#111827" }}>{co.name}</div>
                    {co.headquarters && (
                      <div style={{ fontSize: "11px", color: "#9ca3af" }}>{co.headquarters}</div>
                    )}
                  </div>
                </div>
                <span style={{ fontSize: "13px", color: "#374151" }}>{co.facility_count}</span>
                <span>
                  {co.website ? (
                    <a
                      href={co.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      style={{ fontSize: "11px", color: "#0f766e", textDecoration: "none" }}
                      title={co.website}
                    >
                      ↗ {co.website.replace(/^https?:\/\//, "").split("/")[0]}
                    </a>
                  ) : (
                    <span style={{ fontSize: "11px", color: "#d1d5db" }}>—</span>
                  )}
                </span>
                <span>{stock ? <ExchangeBadge exchange={stock.exchange} /> : <span style={{ fontSize: "12px", color: "#d1d5db" }}>—</span>}</span>
                <div style={{ textAlign: "right" }}>
                  {hasStock && stock ? (
                    <>
                      <div style={{ fontSize: "13px", fontWeight: 600, color: "#111827" }}>
                        {formatPrice(stock.price, stock.currency)}
                      </div>
                      <div style={{
                        fontSize: "11px",
                        color: isPos ? "#16a34a" : isNeg ? "#dc2626" : "#9ca3af",
                      }}>
                        {isPos ? "▲" : isNeg ? "▼" : ""} {stock.change_pct != null ? `${Math.abs(stock.change_pct).toFixed(2)}%` : "—"}
                      </div>
                    </>
                  ) : (
                    <span style={{ fontSize: "12px", color: "#d1d5db" }}>—</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {filtered.length === 0 && (
        <div style={{ textAlign: "center", padding: "40px", color: "#9ca3af", fontSize: "14px" }}>
          No companies match your search.
        </div>
      )}

      <p style={{ fontSize: "11px", color: "#9ca3af", marginTop: "16px" }}>
        Stock prices from Yahoo Finance (end-of-day, free). NSE/BSE in INR · NASDAQ/NYSE in USD · SGX in SGD · TSE in JPY.
        Not investment advice.
      </p>

      {/* Company profile modal */}
      {selectedCompany && (
        <CompanyProfileModal
          company={selectedCompany}
          stock={stockByCompany[selectedCompany.name]}
          dcInfo={dcInfo[selectedCompany.name]}
          onClose={() => setSelectedCompany(null)}
        />
      )}
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
