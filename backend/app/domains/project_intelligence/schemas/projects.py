from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class DeveloperRead(BaseModel):
    id: UUID
    name: str
    headquarters: str
    total_capacity_mw: float
    risk_score: float
    projects_completed: int


class DeveloperCreate(BaseModel):
    name: str
    headquarters: str
    total_capacity_mw: float = 0.0
    risk_score: float = 0.0
    projects_completed: int = 0


class SolarProjectRead(BaseModel):
    id: UUID
    name: str
    state: str
    capacity_mw: float
    status: str
    developer_id: UUID | None = None
    commissioning_date: datetime | None = None
    latitude: float | None = None
    longitude: float | None = None


class SolarProjectCreate(BaseModel):
    name: str
    state: str
    capacity_mw: float
    status: str
    developer_id: UUID | None = None
    commissioning_date: datetime | None = None
    latitude: float | None = None
    longitude: float | None = None


class TenderRead(BaseModel):
    id: UUID
    title: str
    issuing_authority: str
    state: str
    capacity_mw: float
    status: str
    deadline: datetime | None = None
    awarded_to: str | None = None
    winning_tariff: float | None = None


class ProjectListParams(BaseModel):
    state: str | None = None
    status: str | None = None
    developer_id: UUID | None = None
    page: int = 1
    page_size: int = 20
