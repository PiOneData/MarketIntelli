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

async function fetchIEXData(): Promise<IEXReMarketData> {
  const { data } = await apiClient.get("/finance/iex/re-market-data");
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

  const items = [
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
              <span className="ticker-val">{item.val}</span>
              {item.extra && <span className="ticker-sep" />}
              {item.extra && <span style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--muted)" }}>{item.extra}</span>}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
