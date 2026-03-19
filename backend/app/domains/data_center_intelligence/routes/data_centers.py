from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from pydantic import BaseModel
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


class LinkDeveloperPayload(BaseModel):
    developer_id: UUID

router = APIRouter()

_OPERATIONAL_STATUSES = {"operational", "active", "live"}
_PLANNED_STATUSES = {"planned", "under construction", "under development", "approved", "announced"}


def _build_company_read(c: object) -> DataCenterCompanyRead:
    facilities = c.facilities  # type: ignore[attr-defined]
    operational_count = sum(
        1 for f in facilities if (f.status or "").lower() in _OPERATIONAL_STATUSES
    )
    planned_count = sum(
        1 for f in facilities if (f.status or "").lower() in _PLANNED_STATUSES
    )
    states = sorted({f.state for f in facilities if f.state})
    renewable_vals = [f.current_renewable_pct for f in facilities if f.current_renewable_pct is not None]
    avg_renewable_pct = sum(renewable_vals) / len(renewable_vals) if renewable_vals else None
    return DataCenterCompanyRead(
        id=c.id,  # type: ignore[attr-defined]
        name=c.name,  # type: ignore[attr-defined]
        parent_company=c.parent_company,  # type: ignore[attr-defined]
        headquarters=c.headquarters,  # type: ignore[attr-defined]
        website=c.website,  # type: ignore[attr-defined]
        total_investment_usd=c.total_investment_usd,  # type: ignore[attr-defined]
        annual_revenue_usd=c.annual_revenue_usd,  # type: ignore[attr-defined]
        employee_count=c.employee_count,  # type: ignore[attr-defined]
        sustainability_rating=c.sustainability_rating,  # type: ignore[attr-defined]
        developer_id=c.developer_id,  # type: ignore[attr-defined]
        facility_count=len(facilities),
        total_capacity_mw=sum(f.power_capacity_mw for f in facilities),
        operational_count=operational_count,
        planned_count=planned_count,
        states=states,
        avg_renewable_pct=avg_renewable_pct,
    )


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
    return [_build_company_read(c) for c in companies]


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
    return _build_company_read(company)


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
        developer_id=company.developer_id,
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
                company_developer_id=f.company.developer_id if f.company else None,
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


@router.get("/facilities/stats", response_model=FacilityStats)
async def get_facility_stats(
    db: AsyncSession = Depends(get_db),
) -> FacilityStats:
    """Get aggregate statistics for data center facilities."""
    service = DataCenterService(db)
    stats = await service.get_stats()
    return FacilityStats(**stats)


@router.post("/facilities/geocode")
async def geocode_facilities() -> dict[str, int]:
    """Trigger fast (city-centroid) geocoding for facilities missing coordinates.

    Returns counts of resolved / skipped / total rows processed.
    Safe to call repeatedly — skips rows that already have coordinates.
    """
    from app.scripts.geocode_facilities import fast_pass  # lazy import
    result = await fast_pass()
    return result


@router.post("/facilities/geocode-address")
async def geocode_facilities_by_address(
    background_tasks: BackgroundTasks,
    force: bool = True,
) -> dict[str, str]:
    """Trigger precise address-level geocoding using each facility's location_detail field.

    Calls the Nominatim (OpenStreetMap) API with the full street address to obtain
    building-level coordinates, replacing any existing city-centroid values when
    force=True (default).

    Rate-limited to 1 req / 1.2 s to comply with Nominatim's Terms of Service.
    Runs as a background task so it returns immediately — large datasets may take
    several minutes. Poll /facilities to observe coordinates being updated.
    """
    from app.scripts.geocode_facilities import address_precise_pass  # lazy import

    background_tasks.add_task(address_precise_pass, force=force)
    return {
        "status": "started",
        "message": (
            "Address-level geocoding is running in the background via Nominatim. "
            "Refresh facilities in a few minutes to see updated coordinates."
        ),
    }


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
        company_developer_id=f.company.developer_id if f.company else None,
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
        company_developer_id=company.developer_id,
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
        company_developer_id=f.company.developer_id if f.company else None,
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


@router.patch("/companies/{company_id}/link-developer", response_model=DataCenterCompanyRead)
async def link_developer_to_company(
    company_id: UUID,
    payload: LinkDeveloperPayload,
    db: AsyncSession = Depends(get_db),
) -> DataCenterCompanyRead:
    """Link a data center company to a developer profile."""
    service = DataCenterService(db)
    company = await service.link_developer(company_id, payload.developer_id)
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    return _build_company_read(company)
