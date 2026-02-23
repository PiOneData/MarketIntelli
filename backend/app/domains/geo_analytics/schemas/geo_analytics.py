from uuid import UUID

from pydantic import BaseModel


class SolarPotentialZoneRead(BaseModel):
    id: UUID
    name: str
    state: str
    irradiance_kwh_m2: float
    land_suitability_score: float
    area_sq_km: float


class GridInfrastructureRead(BaseModel):
    id: UUID
    name: str
    infrastructure_type: str
    capacity_mva: float | None = None
    congestion_level: int | None = None


class DisasterRiskZoneRead(BaseModel):
    id: UUID
    risk_type: str
    severity: int
    state: str
    description: str


class SolarPotentialQuery(BaseModel):
    state: str | None = None
    min_irradiance: float | None = None
    min_suitability: float | None = None


# ---------------------------------------------------------------------------
# Groundwater Resource Assessment (SolarWindAssessment integration)
# ---------------------------------------------------------------------------

class GroundwaterResourceRead(BaseModel):
    id: UUID
    gml_id: str
    objectid: int | None = None
    block: str
    tehsil: str
    district: str
    gwr_2011_2: float | None = None
    code: float | None = None
    classification: str
    net_annual_gw_availability: float | None = None
    annual_gw_draft_irrigation: float | None = None
    stage_of_gw_development: float | None = None
    annual_gw_draft_domestic_industrial: float | None = None
    annual_gw_draft_total: float | None = None
    annual_replenishable_gw_total: float | None = None
    state_name: str
    natural_discharge_non_monsoon: float | None = None
    st_area_shape: float | None = None
    st_length_shape: float | None = None
    # GeoJSON geometry as a plain dict so it can be serialised directly to the frontend
    geometry: dict | None = None


class GroundwaterResourceFeatureCollection(BaseModel):
    """GeoJSON FeatureCollection wrapper returned by the API."""

    type: str = "FeatureCollection"
    features: list[dict]


# ---------------------------------------------------------------------------
# Google Service Credentials (SolarWindAssessment integration)
# ---------------------------------------------------------------------------

class GoogleServiceCredentialRead(BaseModel):
    """Public view – private_key is intentionally omitted."""

    id: UUID
    name: str
    credential_type: str
    project_id: str
    private_key_id: str
    client_email: str
    client_id: str
    auth_uri: str
    token_uri: str
    auth_provider_x509_cert_url: str
    client_x509_cert_url: str
    is_active: bool


class GoogleServiceCredentialCreate(BaseModel):
    name: str
    credential_type: str = "service_account"
    project_id: str
    private_key_id: str
    private_key: str
    client_email: str
    client_id: str
    auth_uri: str = "https://accounts.google.com/o/oauth2/auth"
    token_uri: str = "https://oauth2.googleapis.com/token"
    auth_provider_x509_cert_url: str = "https://www.googleapis.com/oauth2/v1/certs"
    client_x509_cert_url: str = ""
