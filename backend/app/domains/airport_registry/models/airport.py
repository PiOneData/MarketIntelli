from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import String, Float, Integer, Boolean, DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Airport(Base):
    """India airport registry — DB-backed for full CRUD support."""

    __tablename__ = "airports"

    id: Mapped[UUID] = mapped_column(primary_key=True, default_factory=uuid4, init=False)
    airport_name: Mapped[str] = mapped_column(String(500))
    sno: Mapped[int | None] = mapped_column(Integer, nullable=True, default=None)
    iata_code: Mapped[str | None] = mapped_column(String(10), nullable=True, default=None)
    city: Mapped[str | None] = mapped_column(String(255), nullable=True, default=None)
    state: Mapped[str | None] = mapped_column(String(255), nullable=True, default=None)
    type: Mapped[str | None] = mapped_column(String(100), nullable=True, default=None)
    status: Mapped[str | None] = mapped_column(String(100), nullable=True, default=None)
    latitude: Mapped[float | None] = mapped_column(Float, nullable=True, default=None)
    longitude: Mapped[float | None] = mapped_column(Float, nullable=True, default=None)
    # Power & green energy (stored as strings to preserve "N/A", "~" prefixes from source data)
    power_consumption_mw: Mapped[str | None] = mapped_column(String(50), nullable=True, default=None)
    solar_capacity_mw: Mapped[str | None] = mapped_column(String(50), nullable=True, default=None)
    pct_green_coverage: Mapped[str | None] = mapped_column(String(50), nullable=True, default=None)
    green_energy_sources: Mapped[str | None] = mapped_column(String(500), nullable=True, default=None)
    carbon_neutral_aci_level: Mapped[str | None] = mapped_column(String(100), nullable=True, default=None)
    is_green: Mapped[bool] = mapped_column(Boolean, default=False)
    # Operations
    annual_passengers_mn: Mapped[str | None] = mapped_column(String(50), nullable=True, default=None)
    no_of_runways: Mapped[str | None] = mapped_column(String(20), nullable=True, default=None)
    operator_concessionaire: Mapped[str | None] = mapped_column(String(500), nullable=True, default=None)
    # Optional link to a developer profile
    developer_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("developers.id", ondelete="SET NULL"),
        nullable=True,
        default=None,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), init=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), init=False
    )
