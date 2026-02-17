from dataclasses import dataclass
from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import String, Float, DateTime, Integer, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


@dataclass
class RenewableCapacity(Base):
    """State-wise installed, available, and potential renewable energy capacity by source.

    Data sourced from MNRE dashboard, CEA monthly reports, National Power Portal.
    """

    __tablename__ = "renewable_capacity"

    id: Mapped[UUID] = mapped_column(primary_key=True, default_factory=uuid4, init=False)
    state: Mapped[str] = mapped_column(String(255))
    energy_source: Mapped[str] = mapped_column(String(100))  # solar, wind, small_hydro, biomass, hybrid
    installed_capacity_mw: Mapped[float] = mapped_column(Float)
    data_year: Mapped[int] = mapped_column(Integer)
    available_capacity_mw: Mapped[float | None] = mapped_column(Float, nullable=True, default=None)
    potential_capacity_mw: Mapped[float | None] = mapped_column(Float, nullable=True, default=None)
    cuf_percent: Mapped[float | None] = mapped_column(Float, nullable=True, default=None)
    developer: Mapped[str | None] = mapped_column(String(500), nullable=True, default=None)
    ppa_rate_per_kwh: Mapped[float | None] = mapped_column(Float, nullable=True, default=None)
    data_month: Mapped[int | None] = mapped_column(Integer, nullable=True, default=None)
    source: Mapped[str] = mapped_column(String(500), default="")
    source_url: Mapped[str | None] = mapped_column(String(1000), nullable=True, default=None)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), init=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), init=False
    )


@dataclass
class PowerGeneration(Base):
    """Monthly/annual power generation data across all sources.

    Data sourced from CEA monthly generation reports, National Power Portal.
    """

    __tablename__ = "power_generation"

    id: Mapped[UUID] = mapped_column(primary_key=True, default_factory=uuid4, init=False)
    state: Mapped[str] = mapped_column(String(255))
    energy_source: Mapped[str] = mapped_column(String(100))  # solar, wind, thermal, hydro, nuclear, biomass
    generation_mu: Mapped[float] = mapped_column(Float)  # Million Units (MU)
    period_type: Mapped[str] = mapped_column(String(20))  # monthly, quarterly, annual
    data_year: Mapped[int] = mapped_column(Integer)
    data_month: Mapped[int | None] = mapped_column(Integer, nullable=True, default=None)
    plant_load_factor: Mapped[float | None] = mapped_column(Float, nullable=True, default=None)
    source: Mapped[str] = mapped_column(String(500), default="")
    source_url: Mapped[str | None] = mapped_column(String(1000), nullable=True, default=None)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), init=False
    )


@dataclass
class TransmissionLine(Base):
    """Transmission line infrastructure data across India.

    Data sourced from CEA, NITI Aayog ICED portal, PowerGrid Corporation.
    """

    __tablename__ = "transmission_lines"

    id: Mapped[UUID] = mapped_column(primary_key=True, default_factory=uuid4, init=False)
    name: Mapped[str] = mapped_column(String(500))
    from_state: Mapped[str] = mapped_column(String(255))
    voltage_kv: Mapped[int] = mapped_column(Integer)
    data_year: Mapped[int] = mapped_column(Integer)
    to_state: Mapped[str | None] = mapped_column(String(255), nullable=True, default=None)
    length_km: Mapped[float | None] = mapped_column(Float, nullable=True, default=None)
    capacity_mw: Mapped[float | None] = mapped_column(Float, nullable=True, default=None)
    status: Mapped[str] = mapped_column(String(100), default="operational")
    owner: Mapped[str] = mapped_column(String(255), default="")
    source: Mapped[str] = mapped_column(String(500), default="")
    source_url: Mapped[str | None] = mapped_column(String(1000), nullable=True, default=None)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), init=False
    )


@dataclass
class PowerConsumption(Base):
    """State-wise power consumption and demand data.

    Data sourced from CEA, Load Dispatch Centers.
    """

    __tablename__ = "power_consumption"

    id: Mapped[UUID] = mapped_column(primary_key=True, default_factory=uuid4, init=False)
    state: Mapped[str] = mapped_column(String(255))
    sector: Mapped[str] = mapped_column(String(100))  # domestic, industrial, commercial, agriculture
    consumption_mu: Mapped[float] = mapped_column(Float)  # Million Units
    data_year: Mapped[int] = mapped_column(Integer)
    data_month: Mapped[int | None] = mapped_column(Integer, nullable=True, default=None)
    peak_demand_mw: Mapped[float | None] = mapped_column(Float, nullable=True, default=None)
    source: Mapped[str] = mapped_column(String(500), default="")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), init=False
    )


@dataclass
class RETariff(Base):
    """Solar/wind/hybrid tariff records per state with energy source granularity.

    Data sourced from SERC/CERC tariff orders, SECI auction results.
    """

    __tablename__ = "re_tariffs"

    id: Mapped[UUID] = mapped_column(primary_key=True, default_factory=uuid4, init=False)
    state: Mapped[str] = mapped_column(String(255))
    energy_source: Mapped[str] = mapped_column(String(100))  # solar, wind, hybrid, solar_wind_hybrid
    tariff_type: Mapped[str] = mapped_column(String(100))  # feed_in, auction, ppa, green_energy_open_access
    rate_per_kwh: Mapped[float] = mapped_column(Float)
    effective_date: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    data_year: Mapped[int] = mapped_column(Integer)
    currency: Mapped[str] = mapped_column(String(10), default="INR")
    expiry_date: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True, default=None
    )
    ordering_authority: Mapped[str] = mapped_column(String(255), default="")
    tender_id: Mapped[str | None] = mapped_column(String(255), nullable=True, default=None)
    grid_tariff_comparison: Mapped[float | None] = mapped_column(Float, nullable=True, default=None)
    source: Mapped[str] = mapped_column(String(500), default="")
    source_url: Mapped[str | None] = mapped_column(String(1000), nullable=True, default=None)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), init=False
    )


@dataclass
class InvestmentGuideline(Base):
    """FDI, banking, and investment guidelines for renewable energy sector.

    Data sourced from RBI, DPIIT, IREDA, various banks.
    """

    __tablename__ = "investment_guidelines"

    id: Mapped[UUID] = mapped_column(primary_key=True, default_factory=uuid4, init=False)
    title: Mapped[str] = mapped_column(String(500))
    category: Mapped[str] = mapped_column(String(100))  # fdi, project_finance, green_bond, subsidy, tax_incentive
    institution: Mapped[str] = mapped_column(String(255))  # RBI, SBI, PNB, IREDA, etc.
    description: Mapped[str] = mapped_column(Text, default="")
    interest_rate_range: Mapped[str | None] = mapped_column(String(100), nullable=True, default=None)
    max_loan_amount: Mapped[str | None] = mapped_column(String(100), nullable=True, default=None)
    tenure_years: Mapped[str | None] = mapped_column(String(50), nullable=True, default=None)
    eligibility: Mapped[str | None] = mapped_column(Text, nullable=True, default=None)
    document_url: Mapped[str | None] = mapped_column(String(1000), nullable=True, default=None)
    data_year: Mapped[int] = mapped_column(Integer)
    source: Mapped[str] = mapped_column(String(500), default="")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), init=False
    )


@dataclass
class DataRepository(Base):
    """Central repository of all official data source documents and links.

    Catalogues reports, PDFs, and dashboards from CEA, MNRE, SECI, CERC, etc.
    """

    __tablename__ = "data_repository"

    id: Mapped[UUID] = mapped_column(primary_key=True, default_factory=uuid4, init=False)
    title: Mapped[str] = mapped_column(String(500))
    category: Mapped[str] = mapped_column(String(100))  # generation, capacity, tariff, transmission, policy, investment
    organization: Mapped[str] = mapped_column(String(255))
    document_type: Mapped[str] = mapped_column(String(100))  # report, dashboard, pdf, dataset, map
    url: Mapped[str] = mapped_column(String(1000))
    description: Mapped[str] = mapped_column(Text, default="")
    data_year: Mapped[int | None] = mapped_column(Integer, nullable=True, default=None)
    last_updated: Mapped[str | None] = mapped_column(String(100), nullable=True, default=None)
    is_active: Mapped[bool] = mapped_column(default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), init=False
    )
