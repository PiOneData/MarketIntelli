import asyncio
import logging
from contextlib import asynccontextmanager
from collections.abc import AsyncIterator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.api.v1.router import api_router
from app.db.base import Base
from app.db.session import engine

# Import all models so they are registered with Base.metadata
from app.domains.dashboard.models.market_overview import InstalledCapacity, FinancialInsight  # noqa: F401
from app.domains.data_center_intelligence.models.data_center import DataCenterCompany, DataCenterFacility  # noqa: F401
from app.domains.project_intelligence.models.projects import Developer, SolarProject, Tender  # noqa: F401
from app.domains.policy_intelligence.models.policy import Policy, TariffRecord, Subsidy, ComplianceAlert  # noqa: F401
from app.domains.alerts.models.alerts import Alert, Watchlist, Notification, NewsArticle  # noqa: F401
from app.domains.power_market.models.power_market import (  # noqa: F401
    RenewableCapacity, PowerGeneration, TransmissionLine,
    PowerConsumption, RETariff, InvestmentGuideline, DataRepository,
)

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Twice-daily background scheduler (runs every 12 hours)
# ---------------------------------------------------------------------------

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
                result = await NewsService(db).scrape_and_store()
                logger.info("Scheduled news scrape: %s", result)
        except Exception as exc:
            logger.warning("Scheduled news scrape failed: %s", exc)

        try:
            async with async_session_factory() as db:
                result = await ComplianceScraperService(db).scrape_and_store()
                logger.info("Scheduled compliance scrape: %s", result)
        except Exception as exc:
            logger.warning("Scheduled compliance scrape failed: %s", exc)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    # Startup: create tables if they don't exist
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("Database tables verified/created.")

    # Seed data centers from CSV if table is empty
    try:
        from app.scripts.seed_data_centers import seed_data_centers
        await seed_data_centers()
    except Exception as e:
        logger.warning("CSV seed skipped: %s", e)

    # Seed power market data if tables are empty
    try:
        from app.scripts.seed_power_market import seed_power_market
        await seed_power_market()
    except Exception as e:
        logger.warning("Power market seed skipped: %s", e)

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

    # Run initial compliance scrape on startup to populate real data
    try:
        from app.db.session import async_session_factory
        from app.domains.policy_intelligence.services.compliance_scraper import ComplianceScraperService
        async with async_session_factory() as db:
            result = await ComplianceScraperService(db).scrape_and_store()
            logger.info("Startup compliance scrape: %s", result)
    except Exception as e:
        logger.warning("Startup compliance scrape failed (will retry on schedule): %s", e)

    # Run initial news scrape on startup to populate/refresh real articles
    try:
        from app.db.session import async_session_factory
        from app.domains.alerts.services.news_service import NewsService
        async with async_session_factory() as db:
            result = await NewsService(db).scrape_and_store()
            logger.info("Startup news scrape: %s", result)
    except Exception as e:
        logger.warning("Startup news scrape failed (will retry on schedule): %s", e)

    # Start twice-daily background scheduler
    scheduler_task = asyncio.create_task(_run_scheduled_scrapes())
    logger.info("Twice-daily scrape scheduler started (12-hour interval).")

    yield

    # Shutdown
    scheduler_task.cancel()
    try:
        await scheduler_task
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
