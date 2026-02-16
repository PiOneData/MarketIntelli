from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import String, Float, DateTime, Integer, Text, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class DataCenterCompany(Base):
    """Data center company/group profiles."""

    __tablename__ = "data_center_companies"

    id: Mapped[UUID] = mapped_column(primary_key=True, default_factory=uuid4, init=False)
    name: Mapped[str] = mapped_column(String(255))
    parent_company: Mapped[str | None] = mapped_column(String(255), nullable=True, default=None)
    headquarters: Mapped[str | None] = mapped_column(String(255), nullable=True, default=None)
    website: Mapped[str | None] = mapped_column(String(500), nullable=True, default=None)
    total_investment_usd: Mapped[float | None] = mapped_column(Float, nullable=True, default=None)
    annual_revenue_usd: Mapped[float | None] = mapped_column(Float, nullable=True, default=None)
    employee_count: Mapped[int | None] = mapped_column(Integer, nullable=True, default=None)
    sustainability_rating: Mapped[str | None] = mapped_column(String(50), nullable=True, default=None)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), init=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), init=False
    )

    facilities: Mapped[list["DataCenterFacility"]] = relationship(
        back_populates="company", init=False, default_factory=list
    )


class DataCenterFacility(Base):
    """Individual data center facility records."""

    __tablename__ = "data_center_facilities"

    id: Mapped[UUID] = mapped_column(primary_key=True, default_factory=uuid4, init=False)
    company_id: Mapped[UUID] = mapped_column(ForeignKey("data_center_companies.id"))
    name: Mapped[str] = mapped_column(String(500))
    city: Mapped[str] = mapped_column(String(255))
    state: Mapped[str] = mapped_column(String(255))
    location_detail: Mapped[str | None] = mapped_column(String(500), nullable=True, default=None)
    latitude: Mapped[float | None] = mapped_column(Float, nullable=True, default=None)
    longitude: Mapped[float | None] = mapped_column(Float, nullable=True, default=None)
    power_capacity_mw: Mapped[float] = mapped_column(Float, default=0.0)
    it_load_mw: Mapped[float | None] = mapped_column(Float, nullable=True, default=None)
    status: Mapped[str] = mapped_column(String(50), default="unknown")  # planned, under_construction, operational
    size_sqft: Mapped[float] = mapped_column(Float, default=0.0)
    tier_level: Mapped[str | None] = mapped_column(String(20), nullable=True, default=None)
    pue_target: Mapped[float | None] = mapped_column(Float, nullable=True, default=None)
    pue_actual: Mapped[float | None] = mapped_column(Float, nullable=True, default=None)
    current_renewable_pct: Mapped[float | None] = mapped_column(Float, nullable=True, default=None)
    target_renewable_pct: Mapped[float | None] = mapped_column(Float, nullable=True, default=None)
    cooling_type: Mapped[str | None] = mapped_column(String(50), nullable=True, default=None)
    water_consumption_kld: Mapped[float | None] = mapped_column(Float, nullable=True, default=None)
    commissioning_date: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True, default=None
    )
    expansion_plans: Mapped[str | None] = mapped_column(Text, nullable=True, default=None)
    compliance_status: Mapped[str | None] = mapped_column(
        String(50), nullable=True, default=None
    )  # compliant, non_compliant, partial, unknown
    date_added: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True, default=None
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), init=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), init=False
    )

    company: Mapped["DataCenterCompany"] = relationship(
        back_populates="facilities", init=False
    )
