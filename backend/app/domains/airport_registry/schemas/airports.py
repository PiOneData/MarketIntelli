from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class AirportRead(BaseModel):
    id: UUID
    sno: int | None = None
    airport_name: str
    iata_code: str | None = None
    city: str | None = None
    state: str | None = None
    type: str | None = None
    status: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    power_consumption_mw: str | None = None
    solar_capacity_mw: str | None = None
    pct_green_coverage: str | None = None
    green_energy_sources: str | None = None
    carbon_neutral_aci_level: str | None = None
    is_green: bool = False
    annual_passengers_mn: str | None = None
    no_of_runways: str | None = None
    operator_concessionaire: str | None = None
    developer_id: UUID | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None


class AirportCreate(BaseModel):
    airport_name: str
    iata_code: str | None = None
    city: str | None = None
    state: str | None = None
    type: str | None = None
    status: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    power_consumption_mw: str | None = None
    solar_capacity_mw: str | None = None
    pct_green_coverage: str | None = None
    green_energy_sources: str | None = None
    carbon_neutral_aci_level: str | None = None
    is_green: bool = False
    annual_passengers_mn: str | None = None
    no_of_runways: str | None = None
    operator_concessionaire: str | None = None
    developer_id: UUID | None = None


class AirportUpdate(BaseModel):
    airport_name: str | None = None
    iata_code: str | None = None
    city: str | None = None
    state: str | None = None
    type: str | None = None
    status: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    power_consumption_mw: str | None = None
    solar_capacity_mw: str | None = None
    pct_green_coverage: str | None = None
    green_energy_sources: str | None = None
    carbon_neutral_aci_level: str | None = None
    is_green: bool | None = None
    annual_passengers_mn: str | None = None
    no_of_runways: str | None = None
    operator_concessionaire: str | None = None
    developer_id: UUID | None = None
