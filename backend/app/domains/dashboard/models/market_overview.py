from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import String, Float, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class InstalledCapacity(Base):
    """Tracks installed solar capacity by region."""

    __tablename__ = "installed_capacity"

    id: Mapped[UUID] = mapped_column(primary_key=True, default_factory=uuid4, init=False)
    region: Mapped[str] = mapped_column(String(255))
    state: Mapped[str] = mapped_column(String(255))
    capacity_mw: Mapped[float] = mapped_column(Float)
    year: Mapped[int]
    quarter: Mapped[int]
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), init=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), init=False
    )


class FinancialInsight(Base):
    """Tracks investment flows and cost trends in the solar sector."""

    __tablename__ = "financial_insights"

    id: Mapped[UUID] = mapped_column(primary_key=True, default_factory=uuid4, init=False)
    category: Mapped[str] = mapped_column(String(100))  # modules, inverters, epc
    metric_name: Mapped[str] = mapped_column(String(255))
    value: Mapped[float] = mapped_column(Float)
    unit: Mapped[str] = mapped_column(String(50))
    period: Mapped[str] = mapped_column(String(20))  # e.g. "2026-Q1"
    source: Mapped[str] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), init=False
    )
