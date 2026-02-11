from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.domains.dashboard.models.market_overview import InstalledCapacity, FinancialInsight
from app.domains.dashboard.schemas.dashboard import MarketOverviewResponse, InstalledCapacityRead


class DashboardService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get_market_overview(self) -> MarketOverviewResponse:
        total_query = select(func.sum(InstalledCapacity.capacity_mw))
        total_result = await self.db.execute(total_query)
        total_capacity = total_result.scalar() or 0.0

        regional_query = select(InstalledCapacity).order_by(
            InstalledCapacity.capacity_mw.desc()
        )
        regional_result = await self.db.execute(regional_query)
        records = regional_result.scalars().all()

        return MarketOverviewResponse(
            total_capacity_mw=total_capacity,
            regional_distribution=[
                InstalledCapacityRead(
                    id=r.id,
                    region=r.region,
                    state=r.state,
                    capacity_mw=r.capacity_mw,
                    year=r.year,
                    quarter=r.quarter,
                )
                for r in records
            ],
            upcoming_projects_count=0,  # TODO: integrate with project_intelligence domain
        )

    async def get_financial_insights(self, category: str | None = None) -> list[FinancialInsight]:
        query = select(FinancialInsight)
        if category:
            query = query.where(FinancialInsight.category == category)
        result = await self.db.execute(query)
        return list(result.scalars().all())
