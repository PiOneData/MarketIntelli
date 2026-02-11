from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.domains.project_intelligence.schemas.projects import (
    SolarProjectRead,
    DeveloperRead,
    TenderRead,
)
from app.domains.project_intelligence.services.project_service import ProjectService

router = APIRouter()


@router.get("/", response_model=list[SolarProjectRead])
async def list_projects(
    state: str | None = None,
    status: str | None = None,
    developer_id: UUID | None = None,
    page: int = 1,
    page_size: int = 20,
    db: AsyncSession = Depends(get_db),
) -> list[SolarProjectRead]:
    """Comprehensive database of operational, under-construction, and planned solar projects."""
    service = ProjectService(db)
    projects, _ = await service.list_projects(state, status, developer_id, page, page_size)
    return [
        SolarProjectRead(
            id=p.id, name=p.name, state=p.state, capacity_mw=p.capacity_mw,
            status=p.status, developer_id=p.developer_id,
            commissioning_date=p.commissioning_date,
            latitude=p.latitude, longitude=p.longitude,
        )
        for p in projects
    ]


@router.get("/{project_id}", response_model=SolarProjectRead)
async def get_project(
    project_id: UUID,
    db: AsyncSession = Depends(get_db),
) -> SolarProjectRead:
    service = ProjectService(db)
    project = await service.get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return SolarProjectRead(
        id=project.id, name=project.name, state=project.state,
        capacity_mw=project.capacity_mw, status=project.status,
        developer_id=project.developer_id,
        commissioning_date=project.commissioning_date,
        latitude=project.latitude, longitude=project.longitude,
    )


@router.get("/developers/", response_model=list[DeveloperRead])
async def list_developers(db: AsyncSession = Depends(get_db)) -> list[DeveloperRead]:
    """Developer profiles with historical performance and risk scoring."""
    service = ProjectService(db)
    developers = await service.list_developers()
    return [
        DeveloperRead(
            id=d.id, name=d.name, headquarters=d.headquarters,
            total_capacity_mw=d.total_capacity_mw, risk_score=d.risk_score,
            projects_completed=d.projects_completed,
        )
        for d in developers
    ]


@router.get("/tenders/", response_model=list[TenderRead])
async def list_tenders(
    status: str | None = None,
    db: AsyncSession = Depends(get_db),
) -> list[TenderRead]:
    """Real-time updates on upcoming and awarded tenders with bid analytics."""
    service = ProjectService(db)
    tenders = await service.list_tenders(status)
    return [
        TenderRead(
            id=t.id, title=t.title, issuing_authority=t.issuing_authority,
            state=t.state, capacity_mw=t.capacity_mw, status=t.status,
            deadline=t.deadline, awarded_to=t.awarded_to,
            winning_tariff=t.winning_tariff,
        )
        for t in tenders
    ]
