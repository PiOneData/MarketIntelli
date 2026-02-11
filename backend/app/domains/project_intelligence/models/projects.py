from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import String, Float, DateTime, Integer, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Developer(Base):
    """Solar project developer profiles with performance history."""

    __tablename__ = "developers"

    id: Mapped[UUID] = mapped_column(primary_key=True, default_factory=uuid4, init=False)
    name: Mapped[str] = mapped_column(String(255))
    headquarters: Mapped[str] = mapped_column(String(255))
    total_capacity_mw: Mapped[float] = mapped_column(Float, default=0.0)
    risk_score: Mapped[float] = mapped_column(Float, default=0.0)  # 0.0 - 10.0
    projects_completed: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), init=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), init=False
    )


class SolarProject(Base):
    """Comprehensive database of solar projects."""

    __tablename__ = "solar_projects"

    id: Mapped[UUID] = mapped_column(primary_key=True, default_factory=uuid4, init=False)
    name: Mapped[str] = mapped_column(String(255))
    state: Mapped[str] = mapped_column(String(255))
    capacity_mw: Mapped[float] = mapped_column(Float)
    status: Mapped[str] = mapped_column(String(50))  # operational, under_construction, planned
    developer_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("developers.id"), nullable=True, default=None
    )
    commissioning_date: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True, default=None
    )
    latitude: Mapped[float | None] = mapped_column(Float, nullable=True, default=None)
    longitude: Mapped[float | None] = mapped_column(Float, nullable=True, default=None)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), init=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), init=False
    )


class Tender(Base):
    """Solar project tenders with bid analytics."""

    __tablename__ = "tenders"

    id: Mapped[UUID] = mapped_column(primary_key=True, default_factory=uuid4, init=False)
    title: Mapped[str] = mapped_column(String(500))
    issuing_authority: Mapped[str] = mapped_column(String(255))
    state: Mapped[str] = mapped_column(String(255))
    capacity_mw: Mapped[float] = mapped_column(Float)
    status: Mapped[str] = mapped_column(String(50))  # upcoming, open, awarded, cancelled
    deadline: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True, default=None
    )
    awarded_to: Mapped[str | None] = mapped_column(String(255), nullable=True, default=None)
    winning_tariff: Mapped[float | None] = mapped_column(Float, nullable=True, default=None)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), init=False
    )
