from datetime import datetime
from uuid import UUID, uuid4

from geoalchemy2 import Geometry
from sqlalchemy import String, Float, DateTime, Integer, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class SolarPotentialZone(Base):
    """High-resolution irradiance and land suitability zones."""

    __tablename__ = "solar_potential_zones"

    id: Mapped[UUID] = mapped_column(primary_key=True, default_factory=uuid4, init=False)
    name: Mapped[str] = mapped_column(String(255))
    state: Mapped[str] = mapped_column(String(255))
    irradiance_kwh_m2: Mapped[float] = mapped_column(Float)
    land_suitability_score: Mapped[float] = mapped_column(Float)  # 0.0 - 1.0
    area_sq_km: Mapped[float] = mapped_column(Float)
    geometry: Mapped[str] = mapped_column(Geometry("POLYGON", srid=4326), init=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), init=False
    )


class GridInfrastructure(Base):
    """Substations, transmission corridors, and grid congestion zones."""

    __tablename__ = "grid_infrastructure"

    id: Mapped[UUID] = mapped_column(primary_key=True, default_factory=uuid4, init=False)
    name: Mapped[str] = mapped_column(String(255))
    infrastructure_type: Mapped[str] = mapped_column(String(100))  # substation, corridor, etc.
    capacity_mva: Mapped[float] = mapped_column(Float, nullable=True, default=None)
    congestion_level: Mapped[int] = mapped_column(Integer, nullable=True, default=None)  # 1-5
    geometry: Mapped[str] = mapped_column(Geometry("GEOMETRY", srid=4326), init=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), init=False
    )


class DisasterRiskZone(Base):
    """Flood, cyclone, and heatwave risk zones for project resilience planning."""

    __tablename__ = "disaster_risk_zones"

    id: Mapped[UUID] = mapped_column(primary_key=True, default_factory=uuid4, init=False)
    risk_type: Mapped[str] = mapped_column(String(100))  # flood, cyclone, heatwave
    severity: Mapped[int] = mapped_column(Integer)  # 1-5
    state: Mapped[str] = mapped_column(String(255))
    description: Mapped[str] = mapped_column(String(1000), default="")
    geometry: Mapped[str] = mapped_column(Geometry("POLYGON", srid=4326), init=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), init=False
    )
