from datetime import datetime
from uuid import UUID, uuid4

from geoalchemy2 import Geometry
from sqlalchemy import Boolean, String, Float, DateTime, Integer, Text, func
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
    geometry: Mapped[str] = mapped_column(Geometry("GEOMETRY", srid=4326), init=False)
    capacity_mva: Mapped[float] = mapped_column(Float, nullable=True, default=None)
    congestion_level: Mapped[int] = mapped_column(Integer, nullable=True, default=None)  # 1-5
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
    geometry: Mapped[str] = mapped_column(Geometry("POLYGON", srid=4326), init=False)
    description: Mapped[str] = mapped_column(String(1000), default="")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), init=False
    )


class GroundwaterResource(Base):
    """Groundwater resource assessment zones from groundwater.geojson (SolarWindAssessment).

    Each row represents one block-level assessment unit as defined by the Central
    Ground Water Board (CGWB).  The geometry is stored as a MultiPolygon in EPSG:4326.
    You can insert rows from the original GeoJSON using the SQL script at
    backend/app/scripts/groundwater_init.sql.
    """

    __tablename__ = "groundwater_resources"

    id: Mapped[UUID] = mapped_column(primary_key=True, default_factory=uuid4, init=False)
    gml_id: Mapped[str] = mapped_column(String(255), default="")
    objectid: Mapped[int] = mapped_column(Integer, nullable=True, default=None)
    block: Mapped[str] = mapped_column(String(255), default="")
    tehsil: Mapped[str] = mapped_column(String(255), default="")
    district: Mapped[str] = mapped_column(String(255), default="")
    gwr_2011_2: Mapped[float] = mapped_column(Float, nullable=True, default=None)
    code: Mapped[float] = mapped_column(Float, nullable=True, default=None)
    # "Over Exploited" | "Critical" | "Semi-Critical" | "Safe" | "Saline"
    classification: Mapped[str] = mapped_column(String(100), default="")
    net_annual_gw_availability: Mapped[float] = mapped_column(Float, nullable=True, default=None)
    annual_gw_draft_irrigation: Mapped[float] = mapped_column(Float, nullable=True, default=None)
    stage_of_gw_development: Mapped[float] = mapped_column(Float, nullable=True, default=None)
    annual_gw_draft_domestic_industrial: Mapped[float] = mapped_column(
        Float, nullable=True, default=None
    )
    annual_gw_draft_total: Mapped[float] = mapped_column(Float, nullable=True, default=None)
    annual_replenishable_gw_total: Mapped[float] = mapped_column(Float, nullable=True, default=None)
    state_name: Mapped[str] = mapped_column(String(255), default="")
    natural_discharge_non_monsoon: Mapped[float] = mapped_column(Float, nullable=True, default=None)
    st_area_shape: Mapped[float] = mapped_column(Float, nullable=True, default=None)
    st_length_shape: Mapped[float] = mapped_column(Float, nullable=True, default=None)
    geometry: Mapped[str] = mapped_column(
        Geometry("MULTIPOLYGON", srid=4326), nullable=True, init=False, default=None
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), init=False
    )


class GoogleServiceCredential(Base):
    """Stores Google Cloud service account credentials for the SolarWindAssessment app.

    Rather than embedding a JSON key file in the repository, credentials are persisted
    here.  The backend reconstructs the service-account dict from these columns when an
    authenticated Google API call is required.

    Security note: The private_key column holds the RSA private key.  It is stored in
    plaintext here for simplicity; in production you SHOULD encrypt it at rest (e.g. via
    PostgreSQL column encryption, AWS KMS, or Vault).  See CREDENTIAL_STORAGE.md for
    recommended approaches.
    """

    __tablename__ = "google_service_credentials"

    id: Mapped[UUID] = mapped_column(primary_key=True, default_factory=uuid4, init=False)
    name: Mapped[str] = mapped_column(String(255))  # human-readable label
    credential_type: Mapped[str] = mapped_column(String(50), default="service_account")
    project_id: Mapped[str] = mapped_column(String(255), default="")
    private_key_id: Mapped[str] = mapped_column(String(255), default="")
    # RSA private key – store encrypted in production
    private_key: Mapped[str] = mapped_column(Text, default="")
    client_email: Mapped[str] = mapped_column(String(255), default="")
    client_id: Mapped[str] = mapped_column(String(255), default="")
    auth_uri: Mapped[str] = mapped_column(
        String(500), default="https://accounts.google.com/o/oauth2/auth"
    )
    token_uri: Mapped[str] = mapped_column(
        String(500), default="https://oauth2.googleapis.com/token"
    )
    auth_provider_x509_cert_url: Mapped[str] = mapped_column(
        String(500), default="https://www.googleapis.com/oauth2/v1/certs"
    )
    client_x509_cert_url: Mapped[str] = mapped_column(String(500), default="")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), init=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), init=False
    )
