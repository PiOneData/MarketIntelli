from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class RenewableCapacityRead(BaseModel):
    id: UUID
    state: str
    energy_source: str
    installed_capacity_mw: float
    available_capacity_mw: float | None = None
    potential_capacity_mw: float | None = None
    cuf_percent: float | None = None
    developer: str | None = None
    ppa_rate_per_kwh: float | None = None
    data_year: int
    data_month: int | None = None
    source: str
    source_url: str | None = None


class RenewableCapacitySummary(BaseModel):
    state: str
    energy_source: str
    total_installed_mw: float
    total_potential_mw: float | None = None
    avg_cuf_percent: float | None = None
    data_year: int


class PowerGenerationRead(BaseModel):
    id: UUID
    state: str
    energy_source: str
    generation_mu: float
    period_type: str
    data_year: int
    data_month: int | None = None
    plant_load_factor: float | None = None
    source: str
    source_url: str | None = None


class TransmissionLineRead(BaseModel):
    id: UUID
    name: str
    from_state: str
    to_state: str | None = None
    voltage_kv: int
    length_km: float | None = None
    capacity_mw: float | None = None
    status: str
    owner: str
    data_year: int
    source: str
    source_url: str | None = None


class PowerConsumptionRead(BaseModel):
    id: UUID
    state: str
    sector: str
    consumption_mu: float
    peak_demand_mw: float | None = None
    data_year: int
    data_month: int | None = None
    source: str


class RETariffRead(BaseModel):
    id: UUID
    state: str
    energy_source: str
    tariff_type: str
    rate_per_kwh: float
    currency: str
    effective_date: datetime
    expiry_date: datetime | None = None
    ordering_authority: str
    tender_id: str | None = None
    grid_tariff_comparison: float | None = None
    data_year: int
    source: str
    source_url: str | None = None


class InvestmentGuidelineRead(BaseModel):
    id: UUID
    title: str
    category: str
    institution: str
    description: str
    interest_rate_range: str | None = None
    max_loan_amount: str | None = None
    tenure_years: str | None = None
    eligibility: str | None = None
    document_url: str | None = None
    data_year: int
    source: str


class DataRepositoryRead(BaseModel):
    id: UUID
    title: str
    category: str
    organization: str
    document_type: str
    url: str
    description: str
    data_year: int | None = None
    last_updated: str | None = None
    is_active: bool


class PowerMarketOverview(BaseModel):
    total_installed_re_mw: float
    total_solar_mw: float
    total_wind_mw: float
    total_small_hydro_mw: float
    total_biomass_mw: float
    total_generation_mu: float
    re_share_percent: float
    top_states: list[RenewableCapacitySummary]
    data_year: int
    source: str
