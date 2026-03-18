import asyncio
import logging
from contextlib import asynccontextmanager
from collections.abc import AsyncIterator
from datetime import datetime, timedelta, timezone

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.core.config import settings
from app.api.v1.router import api_router
from app.db.base import Base
from app.db.session import engine

# Import all models so they are registered with Base.metadata
from app.domains.dashboard.models.market_overview import InstalledCapacity, FinancialInsight  # noqa: F401
from app.domains.geo_analytics.models.spatial import SolarPotentialZone, GridInfrastructure, DisasterRiskZone, GroundwaterResource, GoogleServiceCredential  # noqa: F401
from app.domains.data_center_intelligence.models.data_center import DataCenterCompany, DataCenterFacility  # noqa: F401
from app.domains.project_intelligence.models.projects import Developer, SolarProject, Tender  # noqa: F401
from app.domains.policy_intelligence.models.policy import Policy, TariffRecord, Subsidy, ComplianceAlert  # noqa: F401
from app.domains.alerts.models.alerts import Alert, Watchlist, Notification, NewsArticle, DailyBrief  # noqa: F401
from app.domains.power_market.models.power_market import (  # noqa: F401
    RenewableCapacity, PowerGeneration, TransmissionLine,
    PowerConsumption, RETariff, InvestmentGuideline, DataRepository,
    DailyREGeneration,
)
from app.domains.dc_assessment.models.report import AssessmentReport  # noqa: F401

logger = logging.getLogger(__name__)


async def _safe_add_column(ddl: str) -> None:
    """Execute a single DDL statement in its own transaction, ignoring errors."""
    try:
        async with engine.begin() as conn:
            await conn.execute(text(ddl))
    except Exception as exc:
        logger.debug("DDL skipped (already applied or table absent): %s — %s", ddl, exc)


# ---------------------------------------------------------------------------
# Twice-daily background scheduler (runs every 12 hours)
# ---------------------------------------------------------------------------

async def _run_daily_brief_scheduler() -> None:
    """Background task: generate daily market brief at 06:00 IST (00:30 UTC) each day."""
    from app.db.session import async_session_factory
    from app.domains.alerts.services.news_service import NewsService

    while True:
        now = datetime.now(timezone.utc)
        # Calculate seconds until next 00:30 UTC
        target = now.replace(hour=0, minute=30, second=0, microsecond=0)
        if target <= now:
            # Next day
            target = target + timedelta(days=1)
        sleep_secs = (target - now).total_seconds()
        logger.info(
            "Daily brief scheduler: sleeping %.0f seconds until 06:00 IST", sleep_secs
        )
        await asyncio.sleep(sleep_secs)

        try:
            async with async_session_factory() as db:
                svc = NewsService(db)
                await svc.generate_daily_brief()
                logger.info("Daily brief generated at 06:00 IST.")
        except Exception as exc:
            logger.warning("Daily brief generation failed: %s", exc)


async def _run_scheduled_scrapes() -> None:
    """Background task: runs news + compliance scrapes every 12 hours (twice daily)."""
    from app.db.session import async_session_factory
    from app.domains.alerts.services.news_service import NewsService
    from app.domains.policy_intelligence.services.compliance_scraper import ComplianceScraperService

    while True:
        await asyncio.sleep(12 * 60 * 60)  # 12 hours
        logger.info("Scheduled twice-daily scrape: refreshing news and compliance alerts...")

        try:
            async with async_session_factory() as db:
                svc = NewsService(db)
                result = await svc.scrape_and_store()
                logger.info("Scheduled news scrape: %s", result)
                enriched = await svc.enrich_missing_articles()
                logger.info("Scheduled news re-enrichment: %d articles", enriched)
        except Exception as exc:
            logger.warning("Scheduled news scrape failed: %s", exc)

        try:
            async with async_session_factory() as db:
                svc = ComplianceScraperService(db)
                result = await svc.scrape_and_store()
                logger.info("Scheduled compliance scrape: %s", result)
                enriched = await svc.enrich_missing_alerts()
                logger.info("Scheduled compliance re-enrichment: %d alerts", enriched)
        except Exception as exc:
            logger.warning("Scheduled compliance scrape failed: %s", exc)


async def _startup_compliance_scrape() -> None:
    """Background task: initial compliance scrape on startup."""
    from app.db.session import async_session_factory
    from app.domains.policy_intelligence.services.compliance_scraper import ComplianceScraperService
    try:
        async with async_session_factory() as db:
            svc = ComplianceScraperService(db)
            result = await svc.scrape_and_store()
            logger.info("Startup compliance scrape: %s", result)
            enriched = await svc.enrich_missing_alerts()
            logger.info("Startup compliance re-enrichment: %d alerts", enriched)
    except Exception as e:
        logger.warning("Startup compliance scrape failed (will retry on schedule): %s", e)


async def _startup_news_scrape() -> None:
    """Background task: initial news scrape on startup."""
    from app.db.session import async_session_factory
    from app.domains.alerts.services.news_service import NewsService
    try:
        async with async_session_factory() as db:
            svc = NewsService(db)
            result = await svc.scrape_and_store()
            logger.info("Startup news scrape: %s", result)
            enriched = await svc.enrich_missing_articles()
            logger.info("Startup news re-enrichment: %d articles", enriched)
    except Exception as e:
        logger.warning("Startup news scrape failed (will retry on schedule): %s", e)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    # Startup: create tables if they don't exist
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("Database tables verified/created.")

    # Ensure re_tariffs has energy_source column (fixes missing column from bad migration)
    await _safe_add_column(
        "ALTER TABLE re_tariffs ADD COLUMN IF NOT EXISTS "
        "energy_source VARCHAR(100) NOT NULL DEFAULT 'solar';"
    )
    logger.info("re_tariffs.energy_source column ensured.")

    # Ensure news_articles has AI intelligence columns (added after initial table creation)
    for ddl in [
        "ALTER TABLE news_articles ADD COLUMN IF NOT EXISTS ai_summary TEXT;",
        "ALTER TABLE news_articles ADD COLUMN IF NOT EXISTS market_impact_score FLOAT;",
        "ALTER TABLE news_articles ADD COLUMN IF NOT EXISTS affected_states JSON;",
        "ALTER TABLE news_articles ADD COLUMN IF NOT EXISTS affected_companies JSON;",
        "ALTER TABLE news_articles ADD COLUMN IF NOT EXISTS ai_analyzed_at TIMESTAMP WITH TIME ZONE;",
    ]:
        await _safe_add_column(ddl)
    logger.info("news_articles AI columns ensured.")

    # Ensure compliance_alerts has AI intelligence columns (added after initial table creation)
    for ddl in [
        "ALTER TABLE compliance_alerts ADD COLUMN IF NOT EXISTS urgency_level VARCHAR(20);",
        "ALTER TABLE compliance_alerts ADD COLUMN IF NOT EXISTS deadline_date TIMESTAMP WITH TIME ZONE;",
        "ALTER TABLE compliance_alerts ADD COLUMN IF NOT EXISTS action_items JSON;",
        "ALTER TABLE compliance_alerts ADD COLUMN IF NOT EXISTS affected_entities JSON;",
        "ALTER TABLE compliance_alerts ADD COLUMN IF NOT EXISTS ai_analyzed_at TIMESTAMP WITH TIME ZONE;",
    ]:
        await _safe_add_column(ddl)
    logger.info("compliance_alerts AI columns ensured.")

    # Ensure assessment_reports has renewable energy score columns (added after initial table creation)
    for ddl in [
        "ALTER TABLE assessment_reports ADD COLUMN IF NOT EXISTS solar_score FLOAT;",
        "ALTER TABLE assessment_reports ADD COLUMN IF NOT EXISTS wind_score FLOAT;",
        "ALTER TABLE assessment_reports ADD COLUMN IF NOT EXISTS water_score FLOAT;",
        "ALTER TABLE assessment_reports ADD COLUMN IF NOT EXISTS overall_score FLOAT;",
        "ALTER TABLE assessment_reports ADD COLUMN IF NOT EXISTS rating VARCHAR(100);",
        "ALTER TABLE assessment_reports ADD COLUMN IF NOT EXISTS analysis_json TEXT;",
        "ALTER TABLE assessment_reports ADD COLUMN IF NOT EXISTS power_mw FLOAT;",
    ]:
        await _safe_add_column(ddl)
    logger.info("assessment_reports score columns ensured.")

    # Seed data centers from CSV if table is empty
    try:
        from app.scripts.seed_data_centers import seed_data_centers
        await seed_data_centers()
    except Exception as e:
        logger.warning("CSV seed skipped: %s", e)

    # Phase 1 geocoding: city-centroid lookup — fast, no network, runs synchronously
    # so all facilities have coordinates before the first API request is served.
    try:
        from app.scripts.geocode_facilities import fast_pass
        result = await fast_pass()
        logger.info("Startup geocoding (fast pass): %s", result)
    except Exception as e:
        logger.warning("Startup geocoding (fast pass) failed: %s", e)

    # Phase 2 geocoding: Nominatim refinement — rate-limited, runs in background
    async def _geocode_nominatim_bg() -> None:
        try:
            from app.scripts.geocode_facilities import nominatim_pass
            result = await nominatim_pass()
            logger.info("Background geocoding (Nominatim pass) finished: %s", result)
        except Exception as exc:
            logger.warning("Background geocoding (Nominatim pass) failed: %s", exc)

    asyncio.create_task(_geocode_nominatim_bg())
    logger.info("Background Nominatim geocoding task started.")

    # Seed power market data if tables are empty
    try:
        from app.scripts.seed_power_market import seed_power_market
        await seed_power_market()
    except Exception as e:
        logger.warning("Power market seed skipped: %s", e)

    # Refresh renewable capacity to MNRE 28.02.2026 data if still on older data
    try:
        from app.db.session import async_session_factory as _cap_asf
        from app.domains.power_market.models.power_market import RenewableCapacity as _RC
        from sqlalchemy import select as _sel, func as _fn
        async with _cap_asf() as _db:
            _result = await _db.execute(
                _sel(_fn.max(_RC.data_month)).where(_RC.data_year == 2026)
            )
            _latest_month = _result.scalar()
        if _latest_month is None or _latest_month < 2:
            from app.scripts.seed_power_market import update_renewable_capacity_feb2026
            await update_renewable_capacity_feb2026()
            logger.info("Renewable capacity refreshed to MNRE 28.02.2026 data.")
    except Exception as e:
        logger.warning("Renewable capacity refresh skipped: %s", e)

    # Seed daily RE generation timeseries from CSV
    try:
        from app.scripts.seed_daily_re_generation import seed
        from app.db.session import async_session_factory as _asf
        async with _asf() as _db:
            await seed(_db)
    except Exception as e:
        logger.warning("Daily RE generation seed skipped: %s", e)

    # Seed policy intelligence data if tables are empty
    try:
        from app.scripts.seed_policy import seed_policy
        await seed_policy()
    except Exception as e:
        logger.warning("Policy seed skipped: %s", e)

    # Seed news articles if table is empty
    try:
        from app.scripts.seed_news import seed_news
        await seed_news()
    except Exception as e:
        logger.warning("News seed skipped: %s", e)

    # Always ensure SHANTI Act + BSMR-200 + Budget 2025-26 policies are present
    try:
        from app.scripts.seed_policy import add_shanti_policies
        await add_shanti_policies()
    except Exception as e:
        logger.warning("SHANTI policy upsert skipped: %s", e)

    # Run compliance + news scrapes in background (non-blocking) so startup
    # completes quickly and health checks pass while data populates in background.
    asyncio.create_task(_startup_compliance_scrape())
    logger.info("Background startup compliance scrape started.")

    asyncio.create_task(_startup_news_scrape())
    logger.info("Background startup news scrape started.")

    # Start twice-daily background scheduler
    scheduler_task = asyncio.create_task(_run_scheduled_scrapes())
    logger.info("Twice-daily scrape scheduler started (12-hour interval).")

    # Start daily brief scheduler (fires at 06:00 IST = 00:30 UTC)
    brief_scheduler_task = asyncio.create_task(_run_daily_brief_scheduler())
    logger.info("Daily brief scheduler started (fires at 06:00 IST).")

    yield

    # Shutdown
    scheduler_task.cancel()
    brief_scheduler_task.cancel()
    try:
        await scheduler_task
    except asyncio.CancelledError:
        pass
    try:
        await brief_scheduler_task
    except asyncio.CancelledError:
        pass
    await engine.dispose()


def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.PROJECT_NAME,
        version=settings.VERSION,
        openapi_url=f"{settings.API_V1_PREFIX}/openapi.json",
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(api_router, prefix=settings.API_V1_PREFIX)

    return app


app = create_app()
