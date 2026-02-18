from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class PolicyRead(BaseModel):
    id: UUID
    title: str
    authority: str
    state: str | None = None
    category: str
    summary: str
    effective_date: datetime | None = None
    document_url: str | None = None


class TariffRecordRead(BaseModel):
    id: UUID
    state: str
    energy_source: str = "solar"
    tariff_type: str
    rate_per_kwh: float
    currency: str
    effective_date: datetime
    expiry_date: datetime | None = None
    source: str


class SubsidyRead(BaseModel):
    id: UUID
    name: str
    authority: str
    state: str | None = None
    amount: float | None = None
    unit: str
    status: str
    disbursement_date: datetime | None = None


class ComplianceAlertRead(BaseModel):
    id: UUID
    title: str
    authority: str
    data_source: str
    source_name: str
    source_url: str
    category: str
    summary: str | None = None
    published_at: datetime | None = None
    scraped_at: datetime
    is_active: bool = True
