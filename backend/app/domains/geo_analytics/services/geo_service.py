import json

from geoalchemy2.functions import ST_AsGeoJSON
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domains.geo_analytics.models.spatial import (
    DisasterRiskZone,
    GoogleServiceCredential,
    GridInfrastructure,
    GroundwaterResource,
    SolarPotentialZone,
)
from app.domains.geo_analytics.schemas.geo_analytics import GoogleServiceCredentialCreate


class GeoAnalyticsService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get_solar_potential_zones(
        self,
        state: str | None = None,
        min_irradiance: float | None = None,
        min_suitability: float | None = None,
    ) -> list[SolarPotentialZone]:
        query = select(SolarPotentialZone)
        if state:
            query = query.where(SolarPotentialZone.state == state)
        if min_irradiance:
            query = query.where(SolarPotentialZone.irradiance_kwh_m2 >= min_irradiance)
        if min_suitability:
            query = query.where(SolarPotentialZone.land_suitability_score >= min_suitability)
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def get_grid_infrastructure(
        self, infrastructure_type: str | None = None
    ) -> list[GridInfrastructure]:
        query = select(GridInfrastructure)
        if infrastructure_type:
            query = query.where(GridInfrastructure.infrastructure_type == infrastructure_type)
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def get_disaster_risk_zones(
        self, risk_type: str | None = None, state: str | None = None
    ) -> list[DisasterRiskZone]:
        query = select(DisasterRiskZone)
        if risk_type:
            query = query.where(DisasterRiskZone.risk_type == risk_type)
        if state:
            query = query.where(DisasterRiskZone.state == state)
        result = await self.db.execute(query)
        return list(result.scalars().all())

    # ------------------------------------------------------------------
    # Groundwater Resources
    # ------------------------------------------------------------------

    async def get_groundwater_resources(
        self,
        state: str | None = None,
        classification: str | None = None,
        district: str | None = None,
    ) -> list[dict]:
        """Return groundwater features as a list of GeoJSON Feature dicts."""
        query = select(
            GroundwaterResource,
            ST_AsGeoJSON(GroundwaterResource.geometry).label("geojson"),
        )
        if state:
            query = query.where(GroundwaterResource.state_name.ilike(f"%{state}%"))
        if classification:
            query = query.where(GroundwaterResource.classification.ilike(f"%{classification}%"))
        if district:
            query = query.where(GroundwaterResource.district.ilike(f"%{district}%"))

        result = await self.db.execute(query)
        rows = result.all()

        features = []
        for row, geojson_str in rows:
            geometry = json.loads(geojson_str) if geojson_str else None
            features.append(
                {
                    "type": "Feature",
                    "geometry": geometry,
                    "properties": {
                        "id": str(row.id),
                        "gml_id": row.gml_id,
                        "objectid": row.objectid,
                        "block": row.block,
                        "tehsil": row.tehsil,
                        "district": row.district,
                        "gwr_2011_2": row.gwr_2011_2,
                        "code": row.code,
                        "classification": row.classification,
                        "net_annual_gw_availability": row.net_annual_gw_availability,
                        "annual_gw_draft_irrigation": row.annual_gw_draft_irrigation,
                        "stage_of_gw_development": row.stage_of_gw_development,
                        "annual_gw_draft_domestic_industrial": row.annual_gw_draft_domestic_industrial,
                        "annual_gw_draft_total": row.annual_gw_draft_total,
                        "annual_replenishable_gw_total": row.annual_replenishable_gw_total,
                        "state_name": row.state_name,
                        "natural_discharge_non_monsoon": row.natural_discharge_non_monsoon,
                        "st_area_shape": row.st_area_shape,
                        "st_length_shape": row.st_length_shape,
                    },
                }
            )
        return features

    # ------------------------------------------------------------------
    # Google Service Credentials
    # ------------------------------------------------------------------

    async def get_active_credential(self) -> GoogleServiceCredential | None:
        query = select(GoogleServiceCredential).where(GoogleServiceCredential.is_active.is_(True))
        result = await self.db.execute(query)
        return result.scalars().first()

    async def upsert_credential(
        self, payload: GoogleServiceCredentialCreate
    ) -> GoogleServiceCredential:
        """Deactivate existing active credentials and insert the new one."""
        # Deactivate all existing
        existing = await self.db.execute(
            select(GoogleServiceCredential).where(GoogleServiceCredential.is_active.is_(True))
        )
        for cred in existing.scalars().all():
            cred.is_active = False  # type: ignore[assignment]

        new_cred = GoogleServiceCredential(
            name=payload.name,
            credential_type=payload.credential_type,
            project_id=payload.project_id,
            private_key_id=payload.private_key_id,
            private_key=payload.private_key,
            client_email=payload.client_email,
            client_id=payload.client_id,
            auth_uri=payload.auth_uri,
            token_uri=payload.token_uri,
            auth_provider_x509_cert_url=payload.auth_provider_x509_cert_url,
            client_x509_cert_url=payload.client_x509_cert_url,
        )
        self.db.add(new_cred)
        await self.db.commit()
        await self.db.refresh(new_cred)
        return new_cred
