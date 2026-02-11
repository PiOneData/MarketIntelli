from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.domains.dashboard.schemas.dashboard import (
    MarketOverviewResponse,
    FinancialInsightRead,
    PerformanceMetricRead,
)
from app.domains.dashboard.services.dashboard_service import DashboardService

router = APIRouter()


@router.get("/market-overview", response_model=MarketOverviewResponse)
async def get_market_overview(db: AsyncSession = Depends(get_db)) -> MarketOverviewResponse:
    """Real-time visualization of installed capacity, upcoming projects, and regional distribution."""
    service = DashboardService(db)
    return await service.get_market_overview()


@router.get("/financial-insights", response_model=list[FinancialInsightRead])
async def get_financial_insights(
    category: str | None = None,
    db: AsyncSession = Depends(get_db),
) -> list[FinancialInsightRead]:
    """Tracking of investments, funding rounds, and cost trends."""
    service = DashboardService(db)
    insights = await service.get_financial_insights(category=category)
    return [
        FinancialInsightRead(
            id=i.id,
            category=i.category,
            metric_name=i.metric_name,
            value=i.value,
            unit=i.unit,
            period=i.period,
            source=i.source,
        )
        for i in insights
    ]


@router.get("/performance-metrics", response_model=list[PerformanceMetricRead])
async def get_performance_metrics(
    db: AsyncSession = Depends(get_db),
) -> list[PerformanceMetricRead]:
    """Benchmarking of generation efficiency and plant uptime using satellite-derived data."""
    # TODO: implement with satellite data integration
    return []
