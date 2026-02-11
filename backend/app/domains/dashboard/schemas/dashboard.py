from uuid import UUID

from pydantic import BaseModel


class InstalledCapacityRead(BaseModel):
    id: UUID
    region: str
    state: str
    capacity_mw: float
    year: int
    quarter: int


class MarketOverviewResponse(BaseModel):
    total_capacity_mw: float
    regional_distribution: list[InstalledCapacityRead]
    upcoming_projects_count: int


class FinancialInsightRead(BaseModel):
    id: UUID
    category: str
    metric_name: str
    value: float
    unit: str
    period: str
    source: str


class PerformanceMetricRead(BaseModel):
    plant_id: UUID
    plant_name: str
    generation_efficiency: float
    uptime_percentage: float
    benchmark_efficiency: float
