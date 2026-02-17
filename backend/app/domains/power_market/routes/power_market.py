from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.domains.power_market.schemas.power_market import (
    RenewableCapacityRead,
    PowerGenerationRead,
    TransmissionLineRead,
    PowerConsumptionRead,
    RETariffRead,
    InvestmentGuidelineRead,
    DataRepositoryRead,
)
from app.domains.power_market.services.power_market_service import PowerMarketService

router = APIRouter()


@router.get("/renewable-capacity", response_model=list[RenewableCapacityRead])
async def list_renewable_capacity(
    state: str | None = None,
    energy_source: str | None = None,
    data_year: int | None = None,
    db: AsyncSession = Depends(get_db),
) -> list[RenewableCapacityRead]:
    """State-wise installed/available/potential capacity by source, CUF, developer, PPA rates."""
    service = PowerMarketService(db)
    records = await service.list_renewable_capacity(state, energy_source, data_year)
    return [
        RenewableCapacityRead(
            id=r.id, state=r.state, energy_source=r.energy_source,
            installed_capacity_mw=r.installed_capacity_mw,
            available_capacity_mw=r.available_capacity_mw,
            potential_capacity_mw=r.potential_capacity_mw,
            cuf_percent=r.cuf_percent, developer=r.developer,
            ppa_rate_per_kwh=r.ppa_rate_per_kwh,
            data_year=r.data_year, data_month=r.data_month,
            source=r.source, source_url=r.source_url,
        )
        for r in records
    ]


@router.get("/capacity-summary")
async def get_capacity_summary(
    data_year: int | None = None,
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    """Aggregated capacity summary by state and source."""
    service = PowerMarketService(db)
    return await service.get_capacity_summary(data_year)


@router.get("/generation", response_model=list[PowerGenerationRead])
async def list_power_generation(
    state: str | None = None,
    energy_source: str | None = None,
    data_year: int | None = None,
    db: AsyncSession = Depends(get_db),
) -> list[PowerGenerationRead]:
    """Monthly/annual power generation data across all sources."""
    service = PowerMarketService(db)
    records = await service.list_power_generation(state, energy_source, data_year)
    return [
        PowerGenerationRead(
            id=r.id, state=r.state, energy_source=r.energy_source,
            generation_mu=r.generation_mu, period_type=r.period_type,
            data_year=r.data_year, data_month=r.data_month,
            plant_load_factor=r.plant_load_factor,
            source=r.source, source_url=r.source_url,
        )
        for r in records
    ]


@router.get("/transmission-lines", response_model=list[TransmissionLineRead])
async def list_transmission_lines(
    state: str | None = None,
    voltage_kv: int | None = None,
    db: AsyncSession = Depends(get_db),
) -> list[TransmissionLineRead]:
    """Transmission line infrastructure data across India."""
    service = PowerMarketService(db)
    records = await service.list_transmission_lines(state, voltage_kv)
    return [
        TransmissionLineRead(
            id=r.id, name=r.name, from_state=r.from_state, to_state=r.to_state,
            voltage_kv=r.voltage_kv, length_km=r.length_km,
            capacity_mw=r.capacity_mw, status=r.status, owner=r.owner,
            data_year=r.data_year, source=r.source, source_url=r.source_url,
        )
        for r in records
    ]


@router.get("/consumption", response_model=list[PowerConsumptionRead])
async def list_power_consumption(
    state: str | None = None,
    sector: str | None = None,
    data_year: int | None = None,
    db: AsyncSession = Depends(get_db),
) -> list[PowerConsumptionRead]:
    """State-wise power consumption and demand data."""
    service = PowerMarketService(db)
    records = await service.list_power_consumption(state, sector, data_year)
    return [
        PowerConsumptionRead(
            id=r.id, state=r.state, sector=r.sector,
            consumption_mu=r.consumption_mu, peak_demand_mw=r.peak_demand_mw,
            data_year=r.data_year, data_month=r.data_month, source=r.source,
        )
        for r in records
    ]


@router.get("/re-tariffs", response_model=list[RETariffRead])
async def list_re_tariffs(
    state: str | None = None,
    energy_source: str | None = None,
    tariff_type: str | None = None,
    db: AsyncSession = Depends(get_db),
) -> list[RETariffRead]:
    """Solar/wind/hybrid tariff records per state with energy source detail."""
    service = PowerMarketService(db)
    records = await service.list_re_tariffs(state, energy_source, tariff_type)
    return [
        RETariffRead(
            id=r.id, state=r.state, energy_source=r.energy_source,
            tariff_type=r.tariff_type, rate_per_kwh=r.rate_per_kwh,
            currency=r.currency, effective_date=r.effective_date,
            expiry_date=r.expiry_date, ordering_authority=r.ordering_authority,
            tender_id=r.tender_id,
            grid_tariff_comparison=r.grid_tariff_comparison,
            data_year=r.data_year, source=r.source, source_url=r.source_url,
        )
        for r in records
    ]


@router.get("/investment-guidelines", response_model=list[InvestmentGuidelineRead])
async def list_investment_guidelines(
    category: str | None = None,
    institution: str | None = None,
    db: AsyncSession = Depends(get_db),
) -> list[InvestmentGuidelineRead]:
    """FDI, banking, and investment guidelines for renewable energy sector."""
    service = PowerMarketService(db)
    records = await service.list_investment_guidelines(category, institution)
    return [
        InvestmentGuidelineRead(
            id=r.id, title=r.title, category=r.category,
            institution=r.institution, description=r.description,
            interest_rate_range=r.interest_rate_range,
            max_loan_amount=r.max_loan_amount,
            tenure_years=r.tenure_years, eligibility=r.eligibility,
            document_url=r.document_url, data_year=r.data_year,
            source=r.source,
        )
        for r in records
    ]


@router.get("/data-repository", response_model=list[DataRepositoryRead])
async def list_data_repository(
    category: str | None = None,
    organization: str | None = None,
    db: AsyncSession = Depends(get_db),
) -> list[DataRepositoryRead]:
    """Central repository of official data source documents and links."""
    service = PowerMarketService(db)
    records = await service.list_data_repository(category, organization)
    return [
        DataRepositoryRead(
            id=r.id, title=r.title, category=r.category,
            organization=r.organization, document_type=r.document_type,
            url=r.url, description=r.description,
            data_year=r.data_year, last_updated=r.last_updated,
            is_active=r.is_active,
        )
        for r in records
    ]


@router.get("/overview")
async def get_power_market_overview(
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Aggregate overview of the renewable power market."""
    service = PowerMarketService(db)
    return await service.get_power_market_overview()
