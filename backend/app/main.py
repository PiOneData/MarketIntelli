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
from app.domains.policy_intelligence.models.policy import Policy, TariffRecord, Subsidy  # noqa: F401
from app.domains.alerts.models.alerts import Alert, Watchlist, Notification  # noqa: F401
from app.domains.power_market.models.power_market import (  # noqa: F401
    RenewableCapacity, PowerGeneration, TransmissionLine,
    PowerConsumption, RETariff, InvestmentGuideline, DataRepository,
)

logger = logging.getLogger(__name__)


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

    yield
    # Shutdown
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
