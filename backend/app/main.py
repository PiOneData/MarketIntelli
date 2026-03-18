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


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    # Startup: create tables if they don't exist
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("Database tables verified/created.")

    # Ensure re_tariffs has energy_source column (fixes missing column from bad migration)
    try:
        async with engine.begin() as conn:
            await conn.execute(
                __import__("sqlalchemy", fromlist=["text"]).text(
                    "ALTER TABLE re_tariffs ADD COLUMN IF NOT EXISTS "
                    "energy_source VARCHAR(100) NOT NULL DEFAULT 'solar';"
                )
            )
        logger.info("re_tariffs.energy_source column ensured.")
    except Exception as e:
        logger.warning("re_tariffs schema check skipped: %s", e)

    # Ensure news_articles has AI intelligence columns (added after initial table creation)
    try:
        _text = __import__("sqlalchemy", fromlist=["text"]).text
        async with engine.begin() as conn:
            await conn.execute(_text(
                "ALTER TABLE news_articles ADD COLUMN IF NOT EXISTS ai_summary TEXT;"
            ))
            await conn.execute(_text(
                "ALTER TABLE news_articles ADD COLUMN IF NOT EXISTS market_impact_score FLOAT;"
            ))
            await conn.execute(_text(
                "ALTER TABLE news_articles ADD COLUMN IF NOT EXISTS affected_states JSON;"
            ))
            await conn.execute(_text(
                "ALTER TABLE news_articles ADD COLUMN IF NOT EXISTS affected_companies JSON;"
            ))
            await conn.execute(_text(
                "ALTER TABLE news_articles ADD COLUMN IF NOT EXISTS ai_analyzed_at TIMESTAMP WITH TIME ZONE;"
            ))
        logger.info("news_articles AI columns ensured.")
    except Exception as e:
        logger.warning("news_articles schema check skipped: %s", e)

    # Ensure compliance_alerts has AI intelligence columns (added after initial table creation)
    try:
        _text = __import__("sqlalchemy", fromlist=["text"]).text
        async with engine.begin() as conn:
            await conn.execute(_text(
                "ALTER TABLE compliance_alerts ADD COLUMN IF NOT EXISTS urgency_level VARCHAR(20);"
            ))
            await conn.execute(_text(
                "ALTER TABLE compliance_alerts ADD COLUMN IF NOT EXISTS deadline_date TIMESTAMP WITH TIME ZONE;"
            ))
            await conn.execute(_text(
                "ALTER TABLE compliance_alerts ADD COLUMN IF NOT EXISTS action_items JSON;"
            ))
            await conn.execute(_text(
                "ALTER TABLE compliance_alerts ADD COLUMN IF NOT EXISTS affected_entities JSON;"
            ))
            await conn.execute(_text(
                "ALTER TABLE compliance_alerts ADD COLUMN IF NOT EXISTS ai_analyzed_at TIMESTAMP WITH TIME ZONE;"
            ))
        logger.info("compliance_alerts AI columns ensured.")
    except Exception as e:
        logger.warning("compliance_alerts schema check skipped: %s", e)

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

    # Run initial compliance scrape on startup to populate real data
    try:
        from app.db.session import async_session_factory
        from app.domains.policy_intelligence.services.compliance_scraper import ComplianceScraperService
        async with async_session_factory() as db:
            svc = ComplianceScraperService(db)
            result = await svc.scrape_and_store()
            logger.info("Startup compliance scrape: %s", result)
            enriched = await svc.enrich_missing_alerts()
            logger.info("Startup compliance re-enrichment: %d alerts", enriched)
    except Exception as e:
        logger.warning("Startup compliance scrape failed (will retry on schedule): %s", e)

    # Run initial news scrape on startup to populate/refresh real articles
    try:
        from app.db.session import async_session_factory
        from app.domains.alerts.services.news_service import NewsService
        async with async_session_factory() as db:
            svc = NewsService(db)
            result = await svc.scrape_and_store()
            logger.info("Startup news scrape: %s", result)
            enriched = await svc.enrich_missing_articles()
            logger.info("Startup news re-enrichment: %d articles", enriched)
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
