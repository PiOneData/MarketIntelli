from fastapi import APIRouter, Depends, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.domains.policy_intelligence.schemas.policy import (
    PolicyRead,
    TariffRecordRead,
    SubsidyRead,
    ComplianceAlertRead,
)
from app.domains.policy_intelligence.services.policy_service import PolicyService
from app.domains.policy_intelligence.services.compliance_scraper import ComplianceScraperService

router = APIRouter()


@router.get("/policies", response_model=list[PolicyRead])
async def list_policies(
    authority: str | None = None,
    state: str | None = None,
    db: AsyncSession = Depends(get_db),
) -> list[PolicyRead]:
    """Centralized access to MNRE, SECI, and SERC regulations."""
    service = PolicyService(db)
    policies = await service.list_policies(authority, state)
    return [
        PolicyRead(
            id=p.id, title=p.title, authority=p.authority, state=p.state,
            category=p.category, summary=p.summary,
            effective_date=p.effective_date, document_url=p.document_url,
        )
        for p in policies
    ]


@router.get("/tariffs", response_model=list[TariffRecordRead])
async def list_tariffs(
    state: str | None = None,
    tariff_type: str | None = None,
    db: AsyncSession = Depends(get_db),
) -> list[TariffRecordRead]:
    """Historical and current feed-in tariffs, auction results, and PPA rates."""
    service = PolicyService(db)
    tariffs = await service.list_tariffs(state, tariff_type)
    return [
        TariffRecordRead(
            id=t.id, state=t.state, energy_source=t.energy_source,
            tariff_type=t.tariff_type,
            rate_per_kwh=t.rate_per_kwh, currency=t.currency,
            effective_date=t.effective_date, expiry_date=t.expiry_date,
            source=t.source,
        )
        for t in tariffs
    ]


@router.get("/subsidies", response_model=list[SubsidyRead])
async def list_subsidies(
    state: str | None = None,
    status: str | None = None,
    db: AsyncSession = Depends(get_db),
) -> list[SubsidyRead]:
    """Real-time tracking of central and state-level subsidy disbursements."""
    service = PolicyService(db)
    subsidies = await service.list_subsidies(state, status)
    return [
        SubsidyRead(
            id=s.id, name=s.name, authority=s.authority, state=s.state,
            amount=s.amount, unit=s.unit, status=s.status,
            disbursement_date=s.disbursement_date,
        )
        for s in subsidies
    ]


@router.get("/compliance-alerts", response_model=list[ComplianceAlertRead])
async def list_compliance_alerts(
    authority: str | None = None,
    category: str | None = None,
    db: AsyncSession = Depends(get_db),
) -> list[ComplianceAlertRead]:
    """Real-time compliance alerts from MNRE Notifications, MoP Gazette, CERC/SERC Orders.

    Data is refreshed twice daily from live RSS feeds.
    Sources:
    - MNRE Notifications: PIB India (https://pib.gov.in)
    - MoP Gazette: PIB India (https://pib.gov.in)
    - CERC/SERC Orders: Mercom India (https://mercomindia.com), Solar Quarter (https://solarquarter.com)
    """
    service = ComplianceScraperService(db)
    alerts = await service.list_compliance_alerts(authority=authority, category=category)
    return [
        ComplianceAlertRead(
            id=a.id,
            title=a.title,
            authority=a.authority,
            data_source=a.data_source,
            source_name=a.source_name,
            source_url=a.source_url,
            category=a.category,
            summary=a.summary,
            published_at=a.published_at,
            scraped_at=a.scraped_at,
            is_active=a.is_active,
        )
        for a in alerts
    ]


@router.post("/compliance-alerts/scrape", response_model=dict)
async def trigger_compliance_scrape(
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Manually trigger a compliance alert scrape from MNRE/MoP/CERC/SERC sources."""
    service = ComplianceScraperService(db)
    background_tasks.add_task(service.scrape_and_store)
    return {"status": "compliance scrape triggered"}
