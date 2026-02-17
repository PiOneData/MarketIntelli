from dataclasses import dataclass
from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import String, Float, DateTime, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


@dataclass
class Policy(Base):
    """Central and state-level solar policies, regulations from MNRE, SECI, SERC."""

    __tablename__ = "policies"

    id: Mapped[UUID] = mapped_column(primary_key=True, default_factory=uuid4, init=False)
    title: Mapped[str] = mapped_column(String(500))
    authority: Mapped[str] = mapped_column(String(255))  # MNRE, SECI, SERC, etc.
    category: Mapped[str] = mapped_column(String(100))  # regulation, guideline, amendment
    state: Mapped[str | None] = mapped_column(String(255), nullable=True, default=None)
    summary: Mapped[str] = mapped_column(Text, default="")
    effective_date: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True, default=None
    )
    document_url: Mapped[str | None] = mapped_column(String(1000), nullable=True, default=None)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), init=False
    )


@dataclass
class TariffRecord(Base):
    """Historical and current feed-in tariffs, auction results, and PPA rates."""

    __tablename__ = "tariff_records"

    id: Mapped[UUID] = mapped_column(primary_key=True, default_factory=uuid4, init=False)
    state: Mapped[str] = mapped_column(String(255))
    tariff_type: Mapped[str] = mapped_column(String(100))  # feed_in, auction, ppa
    rate_per_kwh: Mapped[float] = mapped_column(Float)
    effective_date: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    energy_source: Mapped[str] = mapped_column(
        String(100), default="solar"
    )  # solar, wind, hybrid, biomass, small_hydro
    currency: Mapped[str] = mapped_column(String(10), default="INR")
    expiry_date: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True, default=None
    )
    source: Mapped[str] = mapped_column(String(255), default="")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), init=False
    )


@dataclass
class Subsidy(Base):
    """Central and state-level subsidy tracking."""

    __tablename__ = "subsidies"

    id: Mapped[UUID] = mapped_column(primary_key=True, default_factory=uuid4, init=False)
    name: Mapped[str] = mapped_column(String(500))
    authority: Mapped[str] = mapped_column(String(255))
    state: Mapped[str | None] = mapped_column(String(255), nullable=True, default=None)
    amount: Mapped[float | None] = mapped_column(Float, nullable=True, default=None)
    unit: Mapped[str] = mapped_column(String(50), default="INR/kW")
    status: Mapped[str] = mapped_column(String(50), default="active")  # active, expired, pending
    disbursement_date: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True, default=None
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), init=False
    )
