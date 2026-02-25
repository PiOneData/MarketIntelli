import asyncio
import json
import logging
import urllib.request
from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.domains.project_intelligence.schemas.projects import (
    SolarProjectRead,
    DeveloperRead,
    TenderRead,
)
from app.domains.project_intelligence.services.project_service import ProjectService

logger = logging.getLogger(__name__)

router = APIRouter()

# ── DC company → listed stock mapping ──────────────────────────────────────────
# Maps the "company" field from datacenters.geojson to the parent listed entity.
_DC_TICKERS: dict[str, dict[str, str]] = {
    "Nxtra by Airtel":           {"parent": "Bharti Airtel Ltd",        "ticker": "BHARTIARTL.NS", "exchange": "NSE"},
    "Reliance Data Center":       {"parent": "Reliance Industries Ltd",  "ticker": "RELIANCE.NS",   "exchange": "NSE"},
    "Tata Communications":        {"parent": "Tata Communications Ltd",  "ticker": "TATACOMM.NS",   "exchange": "NSE"},
    "L&T Cloudfiniti":            {"parent": "Larsen & Toubro Ltd",      "ticker": "LT.NS",         "exchange": "NSE"},
    "Equinix":                    {"parent": "Equinix Inc",              "ticker": "EQIX",          "exchange": "NASDAQ"},
    "Digital Realty":             {"parent": "Digital Realty Trust",     "ticker": "DLR",           "exchange": "NYSE"},
    "Iron Mountain Data Centers": {"parent": "Iron Mountain Inc",        "ticker": "IRM",           "exchange": "NYSE"},
    "Anant Raj Cloud":            {"parent": "Anant Raj Ltd",            "ticker": "ANANTRAJ.NS",   "exchange": "NSE"},
    "ITI Limited":                {"parent": "ITI Ltd (GoI)",            "ticker": "ITI.NS",        "exchange": "NSE"},
    "AdaniConneX":                {"parent": "Adani Enterprises Ltd",    "ticker": "ADANIENT.NS",   "exchange": "NSE"},
    "Sify Technologies Ltd":      {"parent": "Sify Technologies Ltd",    "ticker": "SIFY",          "exchange": "NASDAQ"},
    "NTT DATA, Inc.":             {"parent": "NTT Group",                "ticker": "9432.T",        "exchange": "TSE"},
    "CapitaLand Data Centre":     {"parent": "CapitaLand Investment",    "ticker": "9CI.SI",        "exchange": "SGX"},
    "STT GDC India":              {"parent": "Singapore Telecom Ltd",    "ticker": "Z74.SI",        "exchange": "SGX"},
}


def _yahoo_quote(ticker: str) -> dict:
    """Blocking Yahoo Finance chart API call — run inside thread pool."""
    url = (
        f"https://query1.finance.yahoo.com/v8/finance/chart/{ticker}"
        "?interval=1d&range=5d"
    )
    headers = {
        "User-Agent": "Mozilla/5.0 (compatible; MarketIntelli/2.0; +https://refex.com)",
        "Accept": "application/json",
    }
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=12) as resp:
            data = json.loads(resp.read().decode())
        result = (data.get("chart", {}).get("result") or [{}])[0]
        meta = result.get("meta", {})
        return {
            "price":        meta.get("regularMarketPrice"),
            "prev_close":   meta.get("chartPreviousClose"),
            "currency":     meta.get("currency", ""),
            "market_state": meta.get("marketState", "CLOSED"),
        }
    except Exception as exc:
        logger.warning(f"[dc-stocks] Yahoo Finance {ticker}: {type(exc).__name__}: {exc}")
        return {"error": str(exc)}


@router.get("/", response_model=list[SolarProjectRead])
async def list_projects(
    state: str | None = None,
    status: str | None = None,
    developer_id: UUID | None = None,
    page: int = 1,
    page_size: int = 20,
    db: AsyncSession = Depends(get_db),
) -> list[SolarProjectRead]:
    """Comprehensive database of operational, under-construction, and planned solar projects."""
    service = ProjectService(db)
    projects, _ = await service.list_projects(state, status, developer_id, page, page_size)
    return [
        SolarProjectRead(
            id=p.id, name=p.name, state=p.state, capacity_mw=p.capacity_mw,
            status=p.status, developer_id=p.developer_id,
            commissioning_date=p.commissioning_date,
            latitude=p.latitude, longitude=p.longitude,
        )
        for p in projects
    ]


@router.get("/developers/", response_model=list[DeveloperRead])
async def list_developers(db: AsyncSession = Depends(get_db)) -> list[DeveloperRead]:
    """Developer profiles with historical performance and risk scoring."""
    service = ProjectService(db)
    developers = await service.list_developers()
    return [
        DeveloperRead(
            id=d.id, name=d.name, headquarters=d.headquarters,
            total_capacity_mw=d.total_capacity_mw, risk_score=d.risk_score,
            projects_completed=d.projects_completed,
        )
        for d in developers
    ]


@router.get("/tenders/", response_model=list[TenderRead])
async def list_tenders(
    status: str | None = None,
    db: AsyncSession = Depends(get_db),
) -> list[TenderRead]:
    """Real-time updates on upcoming and awarded tenders with bid analytics."""
    service = ProjectService(db)
    tenders = await service.list_tenders(status)
    return [
        TenderRead(
            id=t.id, title=t.title, issuing_authority=t.issuing_authority,
            state=t.state, capacity_mw=t.capacity_mw, status=t.status,
            deadline=t.deadline, awarded_to=t.awarded_to,
            winning_tariff=t.winning_tariff,
        )
        for t in tenders
    ]


@router.get("/dc-stocks")
async def get_dc_company_stocks() -> dict:
    """
    Fetch end-of-day stock prices for publicly listed datacenter companies
    from our datacenter database.  Uses Yahoo Finance (free, no API key).
    Called on page load / explicit refresh — results are not cached server-side
    so the frontend always gets the latest EOD price.
    """
    # Fire all Yahoo Finance requests concurrently
    dc_names = list(_DC_TICKERS.keys())
    coroutines = [
        asyncio.to_thread(_yahoo_quote, _DC_TICKERS[name]["ticker"])
        for name in dc_names
    ]
    results = await asyncio.gather(*coroutines, return_exceptions=True)
    quotes: dict[str, dict] = {}
    for name, result in zip(dc_names, results):
        if isinstance(result, Exception):
            quotes[name] = {"error": str(result)}
        else:
            quotes[name] = result

    stocks = []
    for dc_company, info in _DC_TICKERS.items():
        q = quotes.get(dc_company, {})
        price = q.get("price")
        prev_close = q.get("prev_close")
        change_pct: float | None = None
        if price is not None and prev_close and prev_close != 0:
            change_pct = round(((price - prev_close) / prev_close) * 100, 2)
        stocks.append({
            "dc_company":     dc_company,
            "parent_company": info["parent"],
            "ticker":         info["ticker"],
            "exchange":       info["exchange"],
            "price":          price,
            "prev_close":     prev_close,
            "change_pct":     change_pct,
            "currency":       q.get("currency", ""),
            "market_state":   q.get("market_state", ""),
            "error":          q.get("error"),
        })

    return {
        "stocks": stocks,
        "fetched_at": datetime.now(tz=timezone.utc).isoformat(),
    }


@router.get("/{project_id}", response_model=SolarProjectRead)
async def get_project(
    project_id: UUID,
    db: AsyncSession = Depends(get_db),
) -> SolarProjectRead:
    service = ProjectService(db)
    project = await service.get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return SolarProjectRead(
        id=project.id, name=project.name, state=project.state,
        capacity_mw=project.capacity_mw, status=project.status,
        developer_id=project.developer_id,
        commissioning_date=project.commissioning_date,
        latitude=project.latitude, longitude=project.longitude,
    )
