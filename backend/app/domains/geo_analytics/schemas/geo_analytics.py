from uuid import UUID

from pydantic import BaseModel


class SolarPotentialZoneRead(BaseModel):
    id: UUID
    name: str
    state: str
    irradiance_kwh_m2: float
    land_suitability_score: float
    area_sq_km: float


class GridInfrastructureRead(BaseModel):
    id: UUID
    name: str
    infrastructure_type: str
    capacity_mva: float | None = None
    congestion_level: int | None = None


class DisasterRiskZoneRead(BaseModel):
    id: UUID
    risk_type: str
    severity: int
    state: str
    description: str


class SolarPotentialQuery(BaseModel):
    state: str | None = None
    min_irradiance: float | None = None
    min_suitability: float | None = None
