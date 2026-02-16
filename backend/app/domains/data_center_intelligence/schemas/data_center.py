from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class DataCenterCompanyRead(BaseModel):
    id: UUID
    name: str
    parent_company: str | None = None
    headquarters: str | None = None
    website: str | None = None
    total_investment_usd: float | None = None
    annual_revenue_usd: float | None = None
    employee_count: int | None = None
    sustainability_rating: str | None = None
    facility_count: int = 0
    total_capacity_mw: float = 0.0


class DataCenterCompanyCreate(BaseModel):
    name: str
    parent_company: str | None = None
    headquarters: str | None = None
    website: str | None = None
    total_investment_usd: float | None = None
    annual_revenue_usd: float | None = None
    employee_count: int | None = None
    sustainability_rating: str | None = None


class DataCenterFacilityRead(BaseModel):
    id: UUID
    company_id: UUID
    company_name: str = ""
    name: str
    city: str
    state: str
    location_detail: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    power_capacity_mw: float
    it_load_mw: float | None = None
    size_sqft: float
    status: str
    tier_level: str | None = None
    pue_target: float | None = None
    pue_actual: float | None = None
    current_renewable_pct: float | None = None
    target_renewable_pct: float | None = None
    cooling_type: str | None = None
    water_consumption_kld: float | None = None
    commissioning_date: datetime | None = None
    expansion_plans: str | None = None
    compliance_status: str | None = None
    date_added: datetime | None = None


class DataCenterFacilityCreate(BaseModel):
    company_id: UUID
    name: str
    city: str
    state: str
    location_detail: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    power_capacity_mw: float = 0.0
    it_load_mw: float | None = None
    size_sqft: float = 0.0
    status: str = "planned"
    tier_level: str | None = None
    pue_target: float | None = None
    pue_actual: float | None = None
    current_renewable_pct: float | None = None
    target_renewable_pct: float | None = None
    cooling_type: str | None = None
    water_consumption_kld: float | None = None
    commissioning_date: datetime | None = None
    expansion_plans: str | None = None
    compliance_status: str | None = None


class DataCenterFacilityUpdate(BaseModel):
    name: str | None = None
    city: str | None = None
    state: str | None = None
    location_detail: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    power_capacity_mw: float | None = None
    it_load_mw: float | None = None
    size_sqft: float | None = None
    status: str | None = None
    tier_level: str | None = None
    pue_target: float | None = None
    pue_actual: float | None = None
    current_renewable_pct: float | None = None
    target_renewable_pct: float | None = None
    cooling_type: str | None = None
    water_consumption_kld: float | None = None
    commissioning_date: datetime | None = None
    expansion_plans: str | None = None
    compliance_status: str | None = None


class FacilityStats(BaseModel):
    total_facilities: int
    total_power_mw: float
    states_covered: int
    by_status: dict[str, int]
    by_state: dict[str, int]
    by_company: dict[str, int]


class FacilityListParams(BaseModel):
    state: str | None = None
    city: str | None = None
    status: str | None = None
    company: str | None = None
    company_id: UUID | None = None
    min_power_mw: float | None = None
    page: int = 1
    page_size: int = 50
