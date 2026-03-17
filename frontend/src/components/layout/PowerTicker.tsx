import { useQuery } from "@tanstack/react-query";
import apiClient from "../../api/client";

interface IEXMarketPrices {
  dam_mcp_inr_per_mwh: number;
  rtm_mcp_inr_per_mwh: number;
  gtam_mcp_inr_per_mwh: number;
}

interface RECData {
  solar_cleared_price_inr: number;
  non_solar_cleared_price_inr: number;
  solar_traded_volume: number;
  non_solar_traded_volume: number;
}

interface RTMData {
  re_volume_mu: number;
  re_share_percent: number;
  avg_price_inr_per_mwh: number;
}

interface IEXReMarketData {
  date: string;
  iex_market_prices: IEXMarketPrices;
  market_summary: {
    rec: RECData;
    rtm: RTMData;
    dam_re_injection?: { total_re_volume_mu: number };
  };
  source: string;
  last_updated: string;
}

interface BrentData {
  ticker: string;
  name: string;
  price: number | null;
  prev_close: number | null;
  change: number | null;
  change_pct: number | null;
  currency: string;
  market_state: string;
  unit: string;
  error?: string;
}

interface INRData {
  ticker: string;
  name: string;
  rate: number | null;
  prev_close: number | null;
  change: number | null;
  change_pct: number | null;
  currency: string;
  market_state: string;
  error?: string;
}

async function fetchIEXData(): Promise<IEXReMarketData> {
  const { data } = await apiClient.get("/finance/iex/re-market-data");
  return data;
}

async function fetchBrentData(): Promise<BrentData> {
  const { data } = await apiClient.get("/finance/commodity/brent");
  return data;
}

async function fetchINRData(): Promise<INRData> {
  const { data } = await apiClient.get("/finance/commodity/usdinr");
  return data;
}

function fmt(val: number, decimals = 2): string {
  return val.toLocaleString("en-IN", { maximumFractionDigits: decimals, minimumFractionDigits: decimals });
}

export default function PowerTicker() {
  const { data, isError } = useQuery({
    queryKey: ["finance", "iex-re-market"],
    queryFn: fetchIEXData,
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });

  const { data: brent } = useQuery({
    queryKey: ["finance", "brent-crude"],
    queryFn: fetchBrentData,
    staleTime: 3 * 60 * 1000,
    retry: 2,
  });

  const { data: inr } = useQuery({
    queryKey: ["finance", "usdinr"],
    queryFn: fetchINRData,
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });

  if (isError) {
    return (
      <div className="nav-ticker-row">
        <div className="nav-ticker-band">
          <span className="ticker-error">⚠ Error fetching live market data — IEX India</span>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const p = data.iex_market_prices;
  const rec = data.market_summary.rec;
  const rtm = data.market_summary.rtm;
  const dam = data.market_summary.dam_re_injection;

  const brentLabel = brent?.price != null
    ? `$${brent.price.toFixed(2)}/bbl`
    : "—";
  const brentChange = brent?.change_pct != null
    ? ` ${brent.change_pct >= 0 ? "▲" : "▼"}${Math.abs(brent.change_pct).toFixed(2)}%`
    : "";

  const inrLabel = inr?.rate != null ? `₹${inr.rate.toFixed(2)}` : "—";
  const inrChange = inr?.change_pct != null
    ? ` ${inr.change_pct >= 0 ? "▲" : "▼"}${Math.abs(inr.change_pct).toFixed(3)}%`
    : "";

  const items = [
    { label: "Brent Crude", val: brentLabel, extra: brentChange || "" },
    { label: "USD/INR", val: inrLabel, extra: inrChange || "" },
    { label: "IEX DAM", val: `₹${fmt(p.dam_mcp_inr_per_mwh / 1000)}/kWh`, extra: "" },
    { label: "IEX RTM", val: `₹${fmt(p.rtm_mcp_inr_per_mwh / 1000)}/kWh`, extra: "" },
    { label: "G-TAM MCP", val: `₹${fmt(p.gtam_mcp_inr_per_mwh / 1000)}/kWh`, extra: "" },
    { label: "REC Solar", val: `₹${rec.solar_cleared_price_inr.toLocaleString("en-IN")}`, extra: `Vol ${rec.solar_traded_volume.toLocaleString("en-IN")}` },
    { label: "REC Non-Solar", val: `₹${rec.non_solar_cleared_price_inr.toLocaleString("en-IN")}`, extra: `Vol ${rec.non_solar_traded_volume.toLocaleString("en-IN")}` },
    { label: "RTM RE Share", val: `${fmt(rtm.re_share_percent, 1)}%`, extra: `${fmt(rtm.re_volume_mu, 1)} MU` },
    ...(dam ? [{ label: "DAM RE Inj", val: `${fmt(dam.total_re_volume_mu, 1)} MU`, extra: "" }] : []),
    { label: "Source", val: data.source.includes("live") ? "IEX Live ●" : "IEX Ref ○", extra: "" },
  ];

  // Double items for seamless loop
  const doubled = [...items, ...items];

  return (
    <div className="nav-ticker-row">
      <div className="nav-ticker-band">
        <div className="ticker-track">
          {doubled.map((item, i) => (
            <span className="ticker-item" key={i}>
              <span className="ticker-label">{item.label}</span>
              <span
                className="ticker-val"
                style={
                  item.label === "Brent Crude" && brent?.change_pct != null
                    ? { color: brent.change_pct >= 0 ? "#ef4444" : "#22c55e" }
                    : item.label === "USD/INR" && inr?.change_pct != null
                    ? { color: inr.change_pct >= 0 ? "#ef4444" : "#22c55e" }
                    : undefined
                }
              >
                {item.val}
              </span>
              {item.extra && <span className="ticker-sep" />}
              {item.extra && (
                <span
                  style={{
                    fontFamily: "var(--mono)",
                    fontSize: 10,
                    color: item.label === "Brent Crude" && brent?.change_pct != null
                      ? brent.change_pct >= 0 ? "#ef4444" : "#22c55e"
                      : item.label === "USD/INR" && inr?.change_pct != null
                      ? inr.change_pct >= 0 ? "#ef4444" : "#22c55e"
                      : "var(--muted)",
                  }}
                >
                  {item.extra}
                </span>
              )}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
