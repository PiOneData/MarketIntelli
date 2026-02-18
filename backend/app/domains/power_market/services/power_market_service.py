from sqlalchemy import select, func as sa_func
from sqlalchemy.ext.asyncio import AsyncSession

from app.domains.power_market.models.power_market import (
    RenewableCapacity,
    PowerGeneration,
    TransmissionLine,
    PowerConsumption,
    RETariff,
    InvestmentGuideline,
    DataRepository,
)


class PowerMarketService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def list_renewable_capacity(
        self,
        state: str | None = None,
        energy_source: str | None = None,
        data_year: int | None = None,
    ) -> list[RenewableCapacity]:
        stmt = select(RenewableCapacity)
        if state:
            stmt = stmt.where(RenewableCapacity.state == state)
        if energy_source:
            stmt = stmt.where(RenewableCapacity.energy_source == energy_source)
        if data_year:
            stmt = stmt.where(RenewableCapacity.data_year == data_year)
        stmt = stmt.order_by(RenewableCapacity.state, RenewableCapacity.energy_source)
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def get_capacity_summary(
        self, data_year: int | None = None
    ) -> list[dict]:
        stmt = (
            select(
                RenewableCapacity.state,
                RenewableCapacity.energy_source,
                sa_func.sum(RenewableCapacity.installed_capacity_mw).label("total_installed_mw"),
                sa_func.sum(RenewableCapacity.potential_capacity_mw).label("total_potential_mw"),
                sa_func.avg(RenewableCapacity.cuf_percent).label("avg_cuf_percent"),
                sa_func.max(RenewableCapacity.data_year).label("data_year"),
            )
            .group_by(RenewableCapacity.state, RenewableCapacity.energy_source)
        )
        if data_year:
            stmt = stmt.where(RenewableCapacity.data_year == data_year)
        result = await self.db.execute(stmt)
        return [dict(row._mapping) for row in result.all()]

    async def list_power_generation(
        self,
        state: str | None = None,
        energy_source: str | None = None,
        data_year: int | None = None,
    ) -> list[PowerGeneration]:
        stmt = select(PowerGeneration)
        if state:
            stmt = stmt.where(PowerGeneration.state == state)
        if energy_source:
            stmt = stmt.where(PowerGeneration.energy_source == energy_source)
        if data_year:
            stmt = stmt.where(PowerGeneration.data_year == data_year)
        stmt = stmt.order_by(PowerGeneration.state, PowerGeneration.energy_source)
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def list_transmission_lines(
        self,
        state: str | None = None,
        voltage_kv: int | None = None,
    ) -> list[TransmissionLine]:
        stmt = select(TransmissionLine)
        if state:
            stmt = stmt.where(
                (TransmissionLine.from_state == state)
                | (TransmissionLine.to_state == state)
            )
        if voltage_kv:
            stmt = stmt.where(TransmissionLine.voltage_kv == voltage_kv)
        stmt = stmt.order_by(TransmissionLine.voltage_kv.desc())
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def list_power_consumption(
        self,
        state: str | None = None,
        sector: str | None = None,
        data_year: int | None = None,
    ) -> list[PowerConsumption]:
        stmt = select(PowerConsumption)
        if state:
            stmt = stmt.where(PowerConsumption.state == state)
        if sector:
            stmt = stmt.where(PowerConsumption.sector == sector)
        if data_year:
            stmt = stmt.where(PowerConsumption.data_year == data_year)
        stmt = stmt.order_by(PowerConsumption.state)
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def list_re_tariffs(
        self,
        state: str | None = None,
        energy_source: str | None = None,
        tariff_type: str | None = None,
    ) -> list[RETariff]:
        stmt = select(RETariff)
        if state:
            stmt = stmt.where(RETariff.state == state)
        if energy_source:
            stmt = stmt.where(RETariff.energy_source == energy_source)
        if tariff_type:
            stmt = stmt.where(RETariff.tariff_type == tariff_type)
        stmt = stmt.order_by(RETariff.effective_date.desc())
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def list_investment_guidelines(
        self,
        category: str | None = None,
        institution: str | None = None,
    ) -> list[InvestmentGuideline]:
        stmt = select(InvestmentGuideline)
        if category:
            stmt = stmt.where(InvestmentGuideline.category == category)
        if institution:
            stmt = stmt.where(InvestmentGuideline.institution == institution)
        stmt = stmt.order_by(InvestmentGuideline.category, InvestmentGuideline.institution)
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def list_data_repository(
        self,
        category: str | None = None,
        organization: str | None = None,
    ) -> list[DataRepository]:
        stmt = select(DataRepository).where(DataRepository.is_active.is_(True))
        if category:
            stmt = stmt.where(DataRepository.category == category)
        if organization:
            stmt = stmt.where(DataRepository.organization == organization)
        stmt = stmt.order_by(DataRepository.category, DataRepository.organization)
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def get_power_market_overview(self) -> dict:
        """Aggregate overview of the renewable power market."""
        # Get latest year with data
        year_stmt = select(sa_func.max(RenewableCapacity.data_year))
        year_result = await self.db.execute(year_stmt)
        latest_year = year_result.scalar() or 2025

        # Get capacity totals by source
        cap_stmt = (
            select(
                RenewableCapacity.energy_source,
                sa_func.sum(RenewableCapacity.installed_capacity_mw).label("total_mw"),
            )
            .where(RenewableCapacity.data_year == latest_year)
            .group_by(RenewableCapacity.energy_source)
        )
        cap_result = await self.db.execute(cap_stmt)
        source_totals = {row.energy_source: row.total_mw for row in cap_result.all()}

        # Get generation total
        gen_stmt = (
            select(sa_func.sum(PowerGeneration.generation_mu))
            .where(PowerGeneration.data_year == latest_year)
        )
        gen_result = await self.db.execute(gen_stmt)
        total_gen = gen_result.scalar() or 0

        total_re = sum(source_totals.values())

        return {
            "total_installed_re_mw": total_re,
            "total_solar_mw": source_totals.get("solar", 0),
            "total_wind_mw": source_totals.get("wind", 0),
            "total_small_hydro_mw": source_totals.get("small_hydro", 0),
            "total_biomass_mw": source_totals.get("biomass", 0),
            "total_large_hydro_mw": source_totals.get("large_hydro", 0),
            "total_generation_mu": total_gen,
            "data_year": latest_year,
        }
