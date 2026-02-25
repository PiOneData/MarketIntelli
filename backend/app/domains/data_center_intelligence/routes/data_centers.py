from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.domains.data_center_intelligence.schemas.data_center import (
    DataCenterCompanyRead,
    DataCenterCompanyCreate,
    DataCenterFacilityRead,
    DataCenterFacilityCreate,
    DataCenterFacilityUpdate,
    FacilityStats,
)
from app.domains.data_center_intelligence.services.data_center_service import (
    DataCenterService,
)

router = APIRouter()


# --- Company endpoints ---


@router.get("/companies", response_model=list[DataCenterCompanyRead])
async def list_companies(
    name: str | None = None,
    page: int = 1,
    page_size: int = 50,
    db: AsyncSession = Depends(get_db),
) -> list[DataCenterCompanyRead]:
    """List data center companies with facility counts."""
    service = DataCenterService(db)
    companies, _ = await service.list_companies(name, page, page_size)
    return [
        DataCenterCompanyRead(
            id=c.id,
            name=c.name,
            parent_company=c.parent_company,
            headquarters=c.headquarters,
            website=c.website,
            total_investment_usd=c.total_investment_usd,
            annual_revenue_usd=c.annual_revenue_usd,
            employee_count=c.employee_count,
            sustainability_rating=c.sustainability_rating,
            facility_count=len(c.facilities),
            total_capacity_mw=sum(f.power_capacity_mw for f in c.facilities),
        )
        for c in companies
    ]


@router.get("/companies/{company_id}", response_model=DataCenterCompanyRead)
async def get_company(
    company_id: UUID,
    db: AsyncSession = Depends(get_db),
) -> DataCenterCompanyRead:
    """Get company detail with facility summary."""
    service = DataCenterService(db)
    company = await service.get_company(company_id)
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    return DataCenterCompanyRead(
        id=company.id,
        name=company.name,
        parent_company=company.parent_company,
        headquarters=company.headquarters,
        website=company.website,
        total_investment_usd=company.total_investment_usd,
        annual_revenue_usd=company.annual_revenue_usd,
        employee_count=company.employee_count,
        sustainability_rating=company.sustainability_rating,
        facility_count=len(company.facilities),
        total_capacity_mw=sum(f.power_capacity_mw for f in company.facilities),
    )


@router.post("/companies", response_model=DataCenterCompanyRead, status_code=201)
async def create_company(
    data: DataCenterCompanyCreate,
    db: AsyncSession = Depends(get_db),
) -> DataCenterCompanyRead:
    """Create a new data center company."""
    service = DataCenterService(db)
    company = await service.create_company(**data.model_dump())
    return DataCenterCompanyRead(
        id=company.id,
        name=company.name,
        parent_company=company.parent_company,
        headquarters=company.headquarters,
        website=company.website,
        total_investment_usd=company.total_investment_usd,
        annual_revenue_usd=company.annual_revenue_usd,
        employee_count=company.employee_count,
        sustainability_rating=company.sustainability_rating,
    )


# --- Facility endpoints ---


@router.get("/facilities", response_model=list[DataCenterFacilityRead])
async def list_facilities(
    state: str | None = None,
    city: str | None = None,
    status: str | None = None,
    company: str | None = None,
    company_id: UUID | None = None,
    min_power_mw: float | None = None,
    page: int = 1,
    page_size: int = 50,
    db: AsyncSession = Depends(get_db),
) -> list[DataCenterFacilityRead]:
    """List data center facilities with filtering."""
    service = DataCenterService(db)
    facilities, _ = await service.list_facilities(
        state=state, city=city, status=status, company=company,
        company_id=company_id, min_power_mw=min_power_mw,
        page=page, page_size=page_size,
    )
    # Eager-load company names
    result = []
    for f in facilities:
        await db.refresh(f, ["company"])
        result.append(
            DataCenterFacilityRead(
                id=f.id,
                company_id=f.company_id,
                company_name=f.company.name if f.company else "",
                name=f.name,
                city=f.city,
                state=f.state,
                location_detail=f.location_detail,
                latitude=f.latitude,
                longitude=f.longitude,
                power_capacity_mw=f.power_capacity_mw,
                it_load_mw=f.it_load_mw,
                size_sqft=f.size_sqft,
                status=f.status,
                tier_level=f.tier_level,
                pue_target=f.pue_target,
                pue_actual=f.pue_actual,
                current_renewable_pct=f.current_renewable_pct,
                target_renewable_pct=f.target_renewable_pct,
                cooling_type=f.cooling_type,
                water_consumption_kld=f.water_consumption_kld,
                commissioning_date=f.commissioning_date,
                expansion_plans=f.expansion_plans,
                compliance_status=f.compliance_status,
                date_added=f.date_added,
            )
        )
    return result


@router.get("/facilities/geojson")
async def facilities_geojson(
    db: AsyncSession = Depends(get_db),
) -> JSONResponse:
    """Return all facilities that have coordinates as a GeoJSON FeatureCollection.

    The ``address`` property is populated from ``location_detail`` so that
    MapLibre GL filters that test for a non-empty ``address`` field work
    correctly without any client-side changes.
    """
    service = DataCenterService(db)
    # Fetch up to 2000 — adjust if the dataset grows beyond that
    facilities, _ = await service.list_facilities(page=1, page_size=2000)
    features = []
    for f in facilities:
        if f.latitude is None or f.longitude is None:
            continue
        await db.refresh(f, ["company"])
        # Build a meaningful address from whatever is available
        address_parts = [p for p in [f.location_detail, f.city, f.state] if p]
        address = ", ".join(address_parts) if address_parts else ""
        features.append({
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": [f.longitude, f.latitude],
            },
            "properties": {
                "id": str(f.id),
                "name": f.name,
                "company": f.company.name if f.company else "",
                "address": address,
                "tier": f.tier_level or "Tier III",
                "lat": f.latitude,
                "lng": f.longitude,
                "city": f.city,
                "state": f.state,
                "power_mw": f.power_capacity_mw,
                "status": f.status,
            },
        })
    geojson = {"type": "FeatureCollection", "features": features}
    return JSONResponse(
        content=geojson,
        headers={"Cache-Control": "public, max-age=60"},
    )


@router.get("/facilities/stats", response_model=FacilityStats)
async def get_facility_stats(
    db: AsyncSession = Depends(get_db),
) -> FacilityStats:
    """Get aggregate statistics for data center facilities."""
    service = DataCenterService(db)
    stats = await service.get_stats()
    return FacilityStats(**stats)


@router.get("/facilities/{facility_id}", response_model=DataCenterFacilityRead)
async def get_facility(
    facility_id: UUID,
    db: AsyncSession = Depends(get_db),
) -> DataCenterFacilityRead:
    """Get detailed facility information."""
    service = DataCenterService(db)
    f = await service.get_facility(facility_id)
    if not f:
        raise HTTPException(status_code=404, detail="Facility not found")
    await db.refresh(f, ["company"])
    return DataCenterFacilityRead(
        id=f.id,
        company_id=f.company_id,
        company_name=f.company.name if f.company else "",
        name=f.name,
        city=f.city,
        state=f.state,
        location_detail=f.location_detail,
        latitude=f.latitude,
        longitude=f.longitude,
        power_capacity_mw=f.power_capacity_mw,
        it_load_mw=f.it_load_mw,
        size_sqft=f.size_sqft,
        status=f.status,
        tier_level=f.tier_level,
        pue_target=f.pue_target,
        pue_actual=f.pue_actual,
        current_renewable_pct=f.current_renewable_pct,
        target_renewable_pct=f.target_renewable_pct,
        cooling_type=f.cooling_type,
        water_consumption_kld=f.water_consumption_kld,
        commissioning_date=f.commissioning_date,
        expansion_plans=f.expansion_plans,
        compliance_status=f.compliance_status,
        date_added=f.date_added,
    )


@router.post("/facilities", response_model=DataCenterFacilityRead, status_code=201)
async def create_facility(
    data: DataCenterFacilityCreate,
    db: AsyncSession = Depends(get_db),
) -> DataCenterFacilityRead:
    """Create a new data center facility."""
    service = DataCenterService(db)
    # Verify company exists
    company = await service.get_company(data.company_id)
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    f = await service.create_facility(**data.model_dump())
    return DataCenterFacilityRead(
        id=f.id,
        company_id=f.company_id,
        company_name=company.name,
        name=f.name,
        city=f.city,
        state=f.state,
        location_detail=f.location_detail,
        latitude=f.latitude,
        longitude=f.longitude,
        power_capacity_mw=f.power_capacity_mw,
        it_load_mw=f.it_load_mw,
        size_sqft=f.size_sqft,
        status=f.status,
        tier_level=f.tier_level,
        pue_target=f.pue_target,
        pue_actual=f.pue_actual,
        current_renewable_pct=f.current_renewable_pct,
        target_renewable_pct=f.target_renewable_pct,
        cooling_type=f.cooling_type,
        water_consumption_kld=f.water_consumption_kld,
        commissioning_date=f.commissioning_date,
        expansion_plans=f.expansion_plans,
        compliance_status=f.compliance_status,
        date_added=f.date_added,
    )


@router.put("/facilities/{facility_id}", response_model=DataCenterFacilityRead)
async def update_facility(
    facility_id: UUID,
    data: DataCenterFacilityUpdate,
    db: AsyncSession = Depends(get_db),
) -> DataCenterFacilityRead:
    """Update an existing data center facility."""
    service = DataCenterService(db)
    updates = data.model_dump(exclude_unset=True)
    f = await service.update_facility(facility_id, **updates)
    if not f:
        raise HTTPException(status_code=404, detail="Facility not found")
    await db.refresh(f, ["company"])
    return DataCenterFacilityRead(
        id=f.id,
        company_id=f.company_id,
        company_name=f.company.name if f.company else "",
        name=f.name,
        city=f.city,
        state=f.state,
        location_detail=f.location_detail,
        latitude=f.latitude,
        longitude=f.longitude,
        power_capacity_mw=f.power_capacity_mw,
        it_load_mw=f.it_load_mw,
        size_sqft=f.size_sqft,
        status=f.status,
        tier_level=f.tier_level,
        pue_target=f.pue_target,
        pue_actual=f.pue_actual,
        current_renewable_pct=f.current_renewable_pct,
        target_renewable_pct=f.target_renewable_pct,
        cooling_type=f.cooling_type,
        water_consumption_kld=f.water_consumption_kld,
        commissioning_date=f.commissioning_date,
        expansion_plans=f.expansion_plans,
        compliance_status=f.compliance_status,
        date_added=f.date_added,
    )


@router.delete("/facilities/{facility_id}", status_code=204)
async def delete_facility(
    facility_id: UUID,
    db: AsyncSession = Depends(get_db),
) -> None:
    """Delete a data center facility."""
    service = DataCenterService(db)
    deleted = await service.delete_facility(facility_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Facility not found")
