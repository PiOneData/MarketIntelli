"""
Airport Registry Routes — DB-backed CRUD via AirportService.
"""
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.domains.airport_registry.schemas.airports import AirportCreate, AirportRead, AirportUpdate
from app.domains.airport_registry.services.airport_service import AirportService

router = APIRouter()


def _to_read(a) -> AirportRead:
    return AirportRead(
        id=a.id,
        sno=a.sno,
        airport_name=a.airport_name,
        iata_code=a.iata_code,
        city=a.city,
        state=a.state,
        type=a.type,
        status=a.status,
        latitude=a.latitude,
        longitude=a.longitude,
        power_consumption_mw=a.power_consumption_mw,
        solar_capacity_mw=a.solar_capacity_mw,
        pct_green_coverage=a.pct_green_coverage,
        green_energy_sources=a.green_energy_sources,
        carbon_neutral_aci_level=a.carbon_neutral_aci_level,
        is_green=a.is_green,
        annual_passengers_mn=a.annual_passengers_mn,
        no_of_runways=a.no_of_runways,
        operator_concessionaire=a.operator_concessionaire,
        developer_id=a.developer_id,
        created_at=a.created_at,
        updated_at=a.updated_at,
    )


@router.get("/airports", response_model=dict)
async def list_airports(
    state: str | None = Query(None),
    type: str | None = Query(None),
    status: str | None = Query(None),
    green_only: bool = Query(False),
    search: str | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(200, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
) -> dict:
    service = AirportService(db)
    airports, total = await service.list_airports(
        state=state,
        type_filter=type,
        status=status,
        green_only=green_only,
        search=search,
        page=page,
        page_size=page_size,
    )
    return {"airports": [_to_read(a).model_dump() for a in airports], "total": total}


@router.get("/airports/meta")
async def get_airports_meta(db: AsyncSession = Depends(get_db)) -> dict:
    service = AirportService(db)
    return await service.get_meta()


@router.get("/airports/power-stats")
async def get_airports_power_stats(db: AsyncSession = Depends(get_db)) -> dict:
    service = AirportService(db)
    return await service.get_power_stats()


@router.post("/airports", response_model=AirportRead, status_code=201)
async def create_airport(
    payload: AirportCreate,
    db: AsyncSession = Depends(get_db),
) -> AirportRead:
    service = AirportService(db)
    airport = await service.create_airport(**payload.model_dump())
    return _to_read(airport)


@router.get("/airports/{airport_id}", response_model=AirportRead)
async def get_airport(
    airport_id: UUID,
    db: AsyncSession = Depends(get_db),
) -> AirportRead:
    service = AirportService(db)
    airport = await service.get_airport(airport_id)
    if not airport:
        raise HTTPException(status_code=404, detail="Airport not found")
    return _to_read(airport)


@router.put("/airports/{airport_id}", response_model=AirportRead)
async def update_airport(
    airport_id: UUID,
    payload: AirportUpdate,
    db: AsyncSession = Depends(get_db),
) -> AirportRead:
    service = AirportService(db)
    updates = {k: v for k, v in payload.model_dump().items() if v is not None}
    # Allow explicitly setting is_green=False
    if payload.is_green is not None:
        updates["is_green"] = payload.is_green
    airport = await service.update_airport(airport_id, **updates)
    if not airport:
        raise HTTPException(status_code=404, detail="Airport not found")
    return _to_read(airport)


@router.delete("/airports/{airport_id}", status_code=204)
async def delete_airport(
    airport_id: UUID,
    db: AsyncSession = Depends(get_db),
) -> None:
    service = AirportService(db)
    deleted = await service.delete_airport(airport_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Airport not found")
