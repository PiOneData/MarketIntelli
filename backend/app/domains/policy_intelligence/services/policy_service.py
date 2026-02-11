from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domains.policy_intelligence.models.policy import Policy, TariffRecord, Subsidy


class PolicyService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def list_policies(
        self, authority: str | None = None, state: str | None = None
    ) -> list[Policy]:
        query = select(Policy).order_by(Policy.effective_date.desc())
        if authority:
            query = query.where(Policy.authority == authority)
        if state:
            query = query.where(Policy.state == state)
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def list_tariffs(
        self, state: str | None = None, tariff_type: str | None = None
    ) -> list[TariffRecord]:
        query = select(TariffRecord).order_by(TariffRecord.effective_date.desc())
        if state:
            query = query.where(TariffRecord.state == state)
        if tariff_type:
            query = query.where(TariffRecord.tariff_type == tariff_type)
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def list_subsidies(
        self, state: str | None = None, status: str | None = None
    ) -> list[Subsidy]:
        query = select(Subsidy)
        if state:
            query = query.where(Subsidy.state == state)
        if status:
            query = query.where(Subsidy.status == status)
        result = await self.db.execute(query)
        return list(result.scalars().all())
