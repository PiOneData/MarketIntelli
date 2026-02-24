from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.domains.geo_analytics.schemas.geo_analytics import (
    DisasterRiskZoneRead,
    GoogleServiceCredentialCreate,
    GoogleServiceCredentialRead,
    GridInfrastructureRead,
    GroundwaterResourceFeatureCollection,
    SolarPotentialZoneRead,
)
from app.domains.geo_analytics.services.geo_service import GeoAnalyticsService

router = APIRouter()


@router.get("/solar-potential", response_model=list[SolarPotentialZoneRead])
async def get_solar_potential_zones(
    state: str | None = None,
    min_irradiance: float | None = None,
    min_suitability: float | None = None,
    db: AsyncSession = Depends(get_db),
) -> list[SolarPotentialZoneRead]:
    """High-resolution irradiance and land suitability analysis."""
    service = GeoAnalyticsService(db)
    zones = await service.get_solar_potential_zones(state, min_irradiance, min_suitability)
    return [
        SolarPotentialZoneRead(
            id=z.id,
            name=z.name,
            state=z.state,
            irradiance_kwh_m2=z.irradiance_kwh_m2,
            land_suitability_score=z.land_suitability_score,
            area_sq_km=z.area_sq_km,
        )
        for z in zones
    ]


@router.get("/grid-infrastructure", response_model=list[GridInfrastructureRead])
async def get_grid_infrastructure(
    infrastructure_type: str | None = None,
    db: AsyncSession = Depends(get_db),
) -> list[GridInfrastructureRead]:
    """Visualization of substations, transmission corridors, and grid congestion zones."""
    service = GeoAnalyticsService(db)
    items = await service.get_grid_infrastructure(infrastructure_type)
    return [
        GridInfrastructureRead(
            id=i.id,
            name=i.name,
            infrastructure_type=i.infrastructure_type,
            capacity_mva=i.capacity_mva,
            congestion_level=i.congestion_level,
        )
        for i in items
    ]


@router.get("/disaster-risk", response_model=list[DisasterRiskZoneRead])
async def get_disaster_risk_zones(
    risk_type: str | None = None,
    state: str | None = None,
    db: AsyncSession = Depends(get_db),
) -> list[DisasterRiskZoneRead]:
    """Flood, cyclone, and heatwave risk zones for project resilience planning."""
    service = GeoAnalyticsService(db)
    zones = await service.get_disaster_risk_zones(risk_type, state)
    return [
        DisasterRiskZoneRead(
            id=z.id, risk_type=z.risk_type, severity=z.severity,
            state=z.state, description=z.description,
        )
        for z in zones
    ]


# ---------------------------------------------------------------------------
# Groundwater Resource Assessment (SolarWindAssessment integration)
# ---------------------------------------------------------------------------

@router.get("/groundwater", response_model=GroundwaterResourceFeatureCollection)
async def get_groundwater_resources(
    state: str | None = None,
    classification: str | None = None,
    district: str | None = None,
    db: AsyncSession = Depends(get_db),
) -> GroundwaterResourceFeatureCollection:
    """Return groundwater assessment zones as a GeoJSON FeatureCollection.

    Filter by state, exploitation classification (e.g. 'Over Exploited'), or district.
    """
    service = GeoAnalyticsService(db)
    features = await service.get_groundwater_resources(state, classification, district)
    return GroundwaterResourceFeatureCollection(features=features)


# ---------------------------------------------------------------------------
# Google Service Credentials (SolarWindAssessment integration)
# ---------------------------------------------------------------------------

@router.get("/google-credentials", response_model=GoogleServiceCredentialRead)
async def get_active_google_credential(
    db: AsyncSession = Depends(get_db),
) -> GoogleServiceCredentialRead:
    """Retrieve the active Google service-account credential (private_key excluded)."""
    service = GeoAnalyticsService(db)
    cred = await service.get_active_credential()
    if not cred:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active Google service credential found.",
        )
    return GoogleServiceCredentialRead(
        id=cred.id,
        name=cred.name,
        credential_type=cred.credential_type,
        project_id=cred.project_id,
        private_key_id=cred.private_key_id,
        client_email=cred.client_email,
        client_id=cred.client_id,
        auth_uri=cred.auth_uri,
        token_uri=cred.token_uri,
        auth_provider_x509_cert_url=cred.auth_provider_x509_cert_url,
        client_x509_cert_url=cred.client_x509_cert_url,
        is_active=cred.is_active,
    )


@router.post(
    "/google-credentials",
    response_model=GoogleServiceCredentialRead,
    status_code=status.HTTP_201_CREATED,
)
async def upsert_google_credential(
    payload: GoogleServiceCredentialCreate,
    db: AsyncSession = Depends(get_db),
) -> GoogleServiceCredentialRead:
    """Store a new Google service-account credential, deactivating any previous one."""
    service = GeoAnalyticsService(db)
    cred = await service.upsert_credential(payload)
    return GoogleServiceCredentialRead(
        id=cred.id,
        name=cred.name,
        credential_type=cred.credential_type,
        project_id=cred.project_id,
        private_key_id=cred.private_key_id,
        client_email=cred.client_email,
        client_id=cred.client_id,
        auth_uri=cred.auth_uri,
        token_uri=cred.token_uri,
        auth_provider_x509_cert_url=cred.auth_provider_x509_cert_url,
        client_x509_cert_url=cred.client_x509_cert_url,
        is_active=cred.is_active,
    )
