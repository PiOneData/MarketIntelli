import { useQuery } from "@tanstack/react-query";
import apiClient from "../api/client";
import LoadingSpinner from "../components/common/LoadingSpinner";
import ErrorMessage from "../components/common/ErrorMessage";

interface GtamSegment {
  segment: string;
  buy_volume_mu: number;
  sell_volume_mu: number;
  mcp_inr_per_mwh: number;
  cleared_volume_mu: number;
}

interface IexREData {
  date: string;
  market_summary: {
    gtam: {
      description: string;
      total_buy_volume_mu: number;
      total_sell_volume_mu: number;
      mcp_inr_per_mwh: number;
      segments: GtamSegment[];
    };
    rec: {
      description: string;
      solar_floor_price_inr: number;
      solar_forbearance_price_inr: number;
      solar_traded_volume: number;
      solar_cleared_price_inr: number;
      non_solar_floor_price_inr: number;
      non_solar_forbearance_price_inr: number;
      non_solar_traded_volume: number;
      non_solar_cleared_price_inr: number;
    };
    dam_re_injection: {
      description: string;
      total_re_volume_mu: number;
      solar_mu: number;
      wind_mu: number;
      hydro_mu: number;
    };
    rtm: {
      description: string;
      re_volume_mu: number;
      re_share_percent: number;
      avg_price_inr_per_mwh: number;
    };
  };
  iex_market_prices: {
    dam_mcp_inr_per_mwh: number;
    rtm_mcp_inr_per_mwh: number;
    gtam_mcp_inr_per_mwh: number;
  };
  source: string;
  iex_url: string;
  last_updated: string;
  data_note: string;
}

async function fetchIexREData(): Promise<IexREData> {
  const { data } = await apiClient.get("/finance/iex/re-market-data");
  return data;
}

function fmt(n: number | null | undefined, decimals = 2): string {
  if (n == null) return "—";
  return n.toLocaleString("en-IN", { maximumFractionDigits: decimals });
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function PowerTradingPage() {
  const { data, isLoading, isError, refetch, dataUpdatedAt } = useQuery({
    queryKey: ["finance", "iex-re-market"],
    queryFn: fetchIexREData,
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });

  if (isLoading) return <LoadingSpinner message="Fetching live RE market data from IEX India..." />;
  if (isError || !data)
    return (
      <ErrorMessage
        message="Failed to load IEX India power trading data"
        onRetry={() => refetch()}
      />
    );

  const { market_summary: ms, iex_market_prices: prices } = data;

  return (
    <div className="pm-page">
      <header className="pm-header">
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem" }}>
          <div>
            <h2>Power Trading – Renewable Energy Market</h2>
            <p>
              Live renewable energy trading data from{" "}
              <a href={data.iex_url} target="_blank" rel="noopener noreferrer" className="pol-link">
                IEX India (iexindia.com)
              </a>
              . Exclusively renewable energy data — GTAM, REC, DAM RE injection, RTM.
            </p>
          </div>
          <div style={{ textAlign: "right", fontSize: "0.78rem", color: "var(--color-gray-400)" }}>
            <div>Date: <strong>{data.date}</strong></div>
            {dataUpdatedAt > 0 && (
              <div>Fetched: {formatDate(new Date(dataUpdatedAt).toISOString())}</div>
            )}
            <button
              onClick={() => refetch()}
              className="pm-source-badge"
              style={{ marginTop: "0.25rem", cursor: "pointer", border: "none" }}
            >
              Refresh
            </button>
          </div>
        </div>
        <div className="pol-data-source" style={{ marginTop: "0.5rem" }}>
          Source: {data.source}
        </div>
      </header>

      <div className="pm-content">
        {/* Market Price Summary */}
        <section className="pm-section">
          <h3>Market Clearing Prices</h3>
          <div className="pm-stats-grid">
            <div className="pm-stat-card pm-stat-card--accent">
              <span className="pm-stat-label">GTAM MCP</span>
              <span className="pm-stat-value">₹{fmt(prices.gtam_mcp_inr_per_mwh)} /MWh</span>
            </div>
            <div className="pm-stat-card">
              <span className="pm-stat-label">DAM MCP</span>
              <span className="pm-stat-value">₹{fmt(prices.dam_mcp_inr_per_mwh)} /MWh</span>
            </div>
            <div className="pm-stat-card">
              <span className="pm-stat-label">RTM MCP</span>
              <span className="pm-stat-value">₹{fmt(prices.rtm_mcp_inr_per_mwh)} /MWh</span>
            </div>
          </div>
        </section>

        {/* GTAM – Green Term Ahead Market */}
        <section className="pm-section">
          <h3>Green Term Ahead Market (GTAM)</h3>
          <p className="pol-section-desc">{ms.gtam.description}</p>
          <div className="pm-stats-grid" style={{ marginBottom: "1rem" }}>
            <div className="pm-stat-card pm-stat-card--accent">
              <span className="pm-stat-label">Total Buy Volume</span>
              <span className="pm-stat-value">{fmt(ms.gtam.total_buy_volume_mu)} MU</span>
            </div>
            <div className="pm-stat-card">
              <span className="pm-stat-label">Total Sell Volume</span>
              <span className="pm-stat-value">{fmt(ms.gtam.total_sell_volume_mu)} MU</span>
            </div>
            <div className="pm-stat-card">
              <span className="pm-stat-label">GTAM MCP</span>
              <span className="pm-stat-value">₹{fmt(ms.gtam.mcp_inr_per_mwh)} /MWh</span>
            </div>
          </div>
          <div className="pm-table-wrapper">
            <table className="pm-table">
              <thead>
                <tr>
                  <th>Segment</th>
                  <th style={{ textAlign: "right" }}>Buy Volume (MU)</th>
                  <th style={{ textAlign: "right" }}>Sell Volume (MU)</th>
                  <th style={{ textAlign: "right" }}>Cleared (MU)</th>
                  <th style={{ textAlign: "right" }}>MCP (₹/MWh)</th>
                </tr>
              </thead>
              <tbody>
                {ms.gtam.segments.map((seg) => (
                  <tr key={seg.segment}>
                    <td><strong>{seg.segment}</strong></td>
                    <td className="pm-num">{fmt(seg.buy_volume_mu)}</td>
                    <td className="pm-num">{fmt(seg.sell_volume_mu)}</td>
                    <td className="pm-num">{fmt(seg.cleared_volume_mu)}</td>
                    <td className="pm-num pm-rate">₹{fmt(seg.mcp_inr_per_mwh)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* REC – Renewable Energy Certificates */}
        <section className="pm-section">
          <h3>Renewable Energy Certificates (REC)</h3>
          <p className="pol-section-desc">{ms.rec.description}</p>
          <div className="pm-table-wrapper">
            <table className="pm-table">
              <thead>
                <tr>
                  <th>Type</th>
                  <th style={{ textAlign: "right" }}>Floor Price (₹)</th>
                  <th style={{ textAlign: "right" }}>Forbearance Price (₹)</th>
                  <th style={{ textAlign: "right" }}>Traded Volume</th>
                  <th style={{ textAlign: "right" }}>Cleared Price (₹)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <span className="pm-source-badge pm-source-badge--solar">Solar REC</span>
                  </td>
                  <td className="pm-num">{fmt(ms.rec.solar_floor_price_inr, 0)}</td>
                  <td className="pm-num">{fmt(ms.rec.solar_forbearance_price_inr, 0)}</td>
                  <td className="pm-num">{ms.rec.solar_traded_volume.toLocaleString("en-IN")}</td>
                  <td className="pm-num pm-rate">{fmt(ms.rec.solar_cleared_price_inr, 0)}</td>
                </tr>
                <tr>
                  <td>
                    <span className="pm-source-badge pm-source-badge--wind">Non-Solar REC</span>
                  </td>
                  <td className="pm-num">{fmt(ms.rec.non_solar_floor_price_inr, 0)}</td>
                  <td className="pm-num">{fmt(ms.rec.non_solar_forbearance_price_inr, 0)}</td>
                  <td className="pm-num">{ms.rec.non_solar_traded_volume.toLocaleString("en-IN")}</td>
                  <td className="pm-num pm-rate">{fmt(ms.rec.non_solar_cleared_price_inr, 0)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* DAM RE Injection */}
        <section className="pm-section">
          <h3>Day-Ahead Market – RE Injection</h3>
          <p className="pol-section-desc">{ms.dam_re_injection.description}</p>
          <div className="pm-stats-grid">
            <div className="pm-stat-card pm-stat-card--accent">
              <span className="pm-stat-label">Total RE Volume</span>
              <span className="pm-stat-value">{fmt(ms.dam_re_injection.total_re_volume_mu)} MU</span>
            </div>
            <div className="pm-stat-card">
              <span className="pm-stat-label">Solar</span>
              <span className="pm-stat-value">{fmt(ms.dam_re_injection.solar_mu)} MU</span>
            </div>
            <div className="pm-stat-card">
              <span className="pm-stat-label">Wind</span>
              <span className="pm-stat-value">{fmt(ms.dam_re_injection.wind_mu)} MU</span>
            </div>
            <div className="pm-stat-card">
              <span className="pm-stat-label">Hydro</span>
              <span className="pm-stat-value">{fmt(ms.dam_re_injection.hydro_mu)} MU</span>
            </div>
          </div>
        </section>

        {/* RTM */}
        <section className="pm-section">
          <h3>Real-Time Market (RTM) – RE Contribution</h3>
          <p className="pol-section-desc">{ms.rtm.description}</p>
          <div className="pm-stats-grid">
            <div className="pm-stat-card pm-stat-card--accent">
              <span className="pm-stat-label">RE Volume</span>
              <span className="pm-stat-value">{fmt(ms.rtm.re_volume_mu)} MU</span>
            </div>
            <div className="pm-stat-card">
              <span className="pm-stat-label">RE Share</span>
              <span className="pm-stat-value">{fmt(ms.rtm.re_share_percent)}%</span>
            </div>
            <div className="pm-stat-card">
              <span className="pm-stat-label">Avg Price</span>
              <span className="pm-stat-value">₹{fmt(ms.rtm.avg_price_inr_per_mwh)} /MWh</span>
            </div>
          </div>
        </section>

        {/* Data note */}
        <section className="pm-section" style={{ borderTop: "1px solid var(--color-gray-700)", paddingTop: "1rem" }}>
          <p style={{ fontSize: "0.8rem", color: "var(--color-gray-400)", lineHeight: 1.6 }}>
            <strong>Note:</strong> {data.data_note}
          </p>
          <p style={{ fontSize: "0.8rem", color: "var(--color-gray-400)", marginTop: "0.25rem" }}>
            All data is renewable energy only. For full market depth, visit{" "}
            <a href="https://www.iexindia.com/marketdata/REmarket.aspx" target="_blank" rel="noopener noreferrer" className="pol-link">
              IEX India RE Market
            </a>.
          </p>
        </section>
      </div>
    </div>
  );
}
