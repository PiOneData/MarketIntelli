from uuid import UUID

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.domains.data_center_intelligence.models.data_center import (
    DataCenterCompany,
    DataCenterFacility,
)


class DataCenterService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    # --- Company operations ---

    async def list_companies(
        self,
        name: str | None = None,
        page: int = 1,
        page_size: int = 50,
    ) -> tuple[list[DataCenterCompany], int]:
        query = select(DataCenterCompany).options(selectinload(DataCenterCompany.facilities))
        count_query = select(func.count(DataCenterCompany.id))

        if name:
            query = query.where(DataCenterCompany.name.ilike(f"%{name}%"))
            count_query = count_query.where(DataCenterCompany.name.ilike(f"%{name}%"))

        total = (await self.db.execute(count_query)).scalar() or 0
        query = query.order_by(DataCenterCompany.name)
        query = query.offset((page - 1) * page_size).limit(page_size)
        result = await self.db.execute(query)
        return list(result.scalars().unique().all()), total

    async def get_company(self, company_id: UUID) -> DataCenterCompany | None:
        result = await self.db.execute(
            select(DataCenterCompany)
            .options(selectinload(DataCenterCompany.facilities))
            .where(DataCenterCompany.id == company_id)
        )
        return result.scalar_one_or_none()

    async def create_company(self, **kwargs) -> DataCenterCompany:
        company = DataCenterCompany(**kwargs)
        self.db.add(company)
        await self.db.commit()
        await self.db.refresh(company)
        return company

    # --- Facility operations ---

    async def list_facilities(
        self,
        state: str | None = None,
        city: str | None = None,
        status: str | None = None,
        company: str | None = None,
        company_id: UUID | None = None,
        min_power_mw: float | None = None,
        page: int = 1,
        page_size: int = 50,
    ) -> tuple[list[DataCenterFacility], int]:
        query = select(DataCenterFacility).join(DataCenterCompany)
        count_query = select(func.count(DataCenterFacility.id)).join(DataCenterCompany)

        if state:
            query = query.where(DataCenterFacility.state == state)
            count_query = count_query.where(DataCenterFacility.state == state)
        if city:
            query = query.where(DataCenterFacility.city.ilike(f"%{city}%"))
            count_query = count_query.where(DataCenterFacility.city.ilike(f"%{city}%"))
        if status:
            query = query.where(DataCenterFacility.status == status)
            count_query = count_query.where(DataCenterFacility.status == status)
        if company:
            query = query.where(DataCenterCompany.name.ilike(f"%{company}%"))
            count_query = count_query.where(DataCenterCompany.name.ilike(f"%{company}%"))
        if company_id:
            query = query.where(DataCenterFacility.company_id == company_id)
            count_query = count_query.where(DataCenterFacility.company_id == company_id)
        if min_power_mw is not None:
            query = query.where(DataCenterFacility.power_capacity_mw >= min_power_mw)
            count_query = count_query.where(DataCenterFacility.power_capacity_mw >= min_power_mw)

        total = (await self.db.execute(count_query)).scalar() or 0
        query = query.order_by(DataCenterFacility.power_capacity_mw.desc())
        query = query.offset((page - 1) * page_size).limit(page_size)
        result = await self.db.execute(query)
        return list(result.scalars().all()), total

    async def get_facility(self, facility_id: UUID) -> DataCenterFacility | None:
        result = await self.db.execute(
            select(DataCenterFacility).where(DataCenterFacility.id == facility_id)
        )
        return result.scalar_one_or_none()

    async def create_facility(self, **kwargs) -> DataCenterFacility:
        facility = DataCenterFacility(**kwargs)
        self.db.add(facility)
        await self.db.commit()
        await self.db.refresh(facility)
        return facility

    async def update_facility(
        self, facility_id: UUID, **kwargs
    ) -> DataCenterFacility | None:
        facility = await self.get_facility(facility_id)
        if not facility:
            return None
        for key, value in kwargs.items():
            if value is not None:
                setattr(facility, key, value)
        await self.db.commit()
        await self.db.refresh(facility)
        return facility

    async def delete_facility(self, facility_id: UUID) -> bool:
        facility = await self.get_facility(facility_id)
        if not facility:
            return False
        await self.db.delete(facility)
        await self.db.commit()
        return True

    # --- Stats ---

    async def get_stats(self) -> dict:
        # Total facilities and power
        total_result = await self.db.execute(
            select(
                func.count(DataCenterFacility.id),
                func.coalesce(func.sum(DataCenterFacility.power_capacity_mw), 0),
            )
        )
        row = total_result.one()
        total_facilities = row[0]
        total_power = float(row[1])

        # States covered
        states_result = await self.db.execute(
            select(func.count(func.distinct(DataCenterFacility.state)))
        )
        states_covered = states_result.scalar() or 0

        # By status
        status_result = await self.db.execute(
            select(DataCenterFacility.status, func.count(DataCenterFacility.id))
            .group_by(DataCenterFacility.status)
        )
        by_status = {row[0]: row[1] for row in status_result.all()}

        # By state
        state_result = await self.db.execute(
            select(DataCenterFacility.state, func.count(DataCenterFacility.id))
            .group_by(DataCenterFacility.state)
            .order_by(func.count(DataCenterFacility.id).desc())
        )
        by_state = {row[0]: row[1] for row in state_result.all()}

        # By company
        company_result = await self.db.execute(
            select(DataCenterCompany.name, func.count(DataCenterFacility.id))
            .join(DataCenterCompany)
            .group_by(DataCenterCompany.name)
            .order_by(func.count(DataCenterFacility.id).desc())
        )
        by_company = {row[0]: row[1] for row in company_result.all()}

        return {
            "total_facilities": total_facilities,
            "total_power_mw": total_power,
            "states_covered": states_covered,
            "by_status": by_status,
            "by_state": by_state,
            "by_company": by_company,
        }
