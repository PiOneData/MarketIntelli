from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domains.geo_analytics.models.spatial import (
    SolarPotentialZone,
    GridInfrastructure,
    DisasterRiskZone,
)


class GeoAnalyticsService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get_solar_potential_zones(
        self,
        state: str | None = None,
        min_irradiance: float | None = None,
        min_suitability: float | None = None,
    ) -> list[SolarPotentialZone]:
        query = select(SolarPotentialZone)
        if state:
            query = query.where(SolarPotentialZone.state == state)
        if min_irradiance:
            query = query.where(SolarPotentialZone.irradiance_kwh_m2 >= min_irradiance)
        if min_suitability:
            query = query.where(SolarPotentialZone.land_suitability_score >= min_suitability)
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def get_grid_infrastructure(
        self, infrastructure_type: str | None = None
    ) -> list[GridInfrastructure]:
        query = select(GridInfrastructure)
        if infrastructure_type:
            query = query.where(GridInfrastructure.infrastructure_type == infrastructure_type)
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def get_disaster_risk_zones(
        self, risk_type: str | None = None, state: str | None = None
    ) -> list[DisasterRiskZone]:
        query = select(DisasterRiskZone)
        if risk_type:
            query = query.where(DisasterRiskZone.risk_type == risk_type)
        if state:
            query = query.where(DisasterRiskZone.state == state)
        result = await self.db.execute(query)
        return list(result.scalars().all())
