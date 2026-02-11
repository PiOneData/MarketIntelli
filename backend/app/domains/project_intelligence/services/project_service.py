from uuid import UUID

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.domains.project_intelligence.models.projects import SolarProject, Developer, Tender


class ProjectService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def list_projects(
        self,
        state: str | None = None,
        status: str | None = None,
        developer_id: UUID | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[list[SolarProject], int]:
        query = select(SolarProject)
        count_query = select(func.count(SolarProject.id))

        if state:
            query = query.where(SolarProject.state == state)
            count_query = count_query.where(SolarProject.state == state)
        if status:
            query = query.where(SolarProject.status == status)
            count_query = count_query.where(SolarProject.status == status)
        if developer_id:
            query = query.where(SolarProject.developer_id == developer_id)
            count_query = count_query.where(SolarProject.developer_id == developer_id)

        total = (await self.db.execute(count_query)).scalar() or 0
        query = query.offset((page - 1) * page_size).limit(page_size)
        result = await self.db.execute(query)
        return list(result.scalars().all()), total

    async def get_project(self, project_id: UUID) -> SolarProject | None:
        result = await self.db.execute(
            select(SolarProject).where(SolarProject.id == project_id)
        )
        return result.scalar_one_or_none()

    async def list_developers(self) -> list[Developer]:
        result = await self.db.execute(select(Developer).order_by(Developer.name))
        return list(result.scalars().all())

    async def get_developer(self, developer_id: UUID) -> Developer | None:
        result = await self.db.execute(
            select(Developer).where(Developer.id == developer_id)
        )
        return result.scalar_one_or_none()

    async def list_tenders(self, status: str | None = None) -> list[Tender]:
        query = select(Tender).order_by(Tender.deadline.desc())
        if status:
            query = query.where(Tender.status == status)
        result = await self.db.execute(query)
        return list(result.scalars().all())
