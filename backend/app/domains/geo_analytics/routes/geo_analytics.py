from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.domains.geo_analytics.schemas.geo_analytics import (
    SolarPotentialZoneRead,
    GridInfrastructureRead,
    DisasterRiskZoneRead,
)
from app.domains.geo_analytics.services.geo_service import GeoAnalyticsService

router = APIRouter()


@router.get("/solar-potential", response_model=list[SolarPotentialZoneRead])
async def get_solar_potential_zones(
    state: str | None = None,
    min_irradiance: float | None = None,
    min_suitability: float | None = None,
    db: AsyncSession = Depends(get_db),
) -> list[SolarPotentialZoneRead]:
    """High-resolution irradiance and land suitability analysis."""
    service = GeoAnalyticsService(db)
    zones = await service.get_solar_potential_zones(state, min_irradiance, min_suitability)
    return [
        SolarPotentialZoneRead(
            id=z.id,
            name=z.name,
            state=z.state,
            irradiance_kwh_m2=z.irradiance_kwh_m2,
            land_suitability_score=z.land_suitability_score,
            area_sq_km=z.area_sq_km,
        )
        for z in zones
    ]


@router.get("/grid-infrastructure", response_model=list[GridInfrastructureRead])
async def get_grid_infrastructure(
    infrastructure_type: str | None = None,
    db: AsyncSession = Depends(get_db),
) -> list[GridInfrastructureRead]:
    """Visualization of substations, transmission corridors, and grid congestion zones."""
    service = GeoAnalyticsService(db)
    items = await service.get_grid_infrastructure(infrastructure_type)
    return [
        GridInfrastructureRead(
            id=i.id,
            name=i.name,
            infrastructure_type=i.infrastructure_type,
            capacity_mva=i.capacity_mva,
            congestion_level=i.congestion_level,
        )
        for i in items
    ]


@router.get("/disaster-risk", response_model=list[DisasterRiskZoneRead])
async def get_disaster_risk_zones(
    risk_type: str | None = None,
    state: str | None = None,
    db: AsyncSession = Depends(get_db),
) -> list[DisasterRiskZoneRead]:
    """Flood, cyclone, and heatwave risk zones for project resilience planning."""
    service = GeoAnalyticsService(db)
    zones = await service.get_disaster_risk_zones(risk_type, state)
    return [
        DisasterRiskZoneRead(
            id=z.id, risk_type=z.risk_type, severity=z.severity,
            state=z.state, description=z.description,
        )
        for z in zones
    ]
