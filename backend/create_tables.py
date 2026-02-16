#!/usr/bin/env python3
"""Script to create all backend tables using SQLAlchemy models."""

import asyncio
import sys
import os

# Add current directory to Python path
sys.path.append(os.getcwd())

from app.db.base import Base
from app.db.session import engine

# Import all models so they are registered with Base.metadata
from app.domains.dashboard.models.market_overview import InstalledCapacity, FinancialInsight
from app.domains.data_center_intelligence.models.data_center import DataCenterCompany, DataCenterFacility
from app.domains.project_intelligence.models.projects import Developer, SolarProject, Tender
from app.domains.policy_intelligence.models.policy import Policy, TariffRecord, Subsidy
from app.domains.alerts.models.alerts import Alert, Watchlist, Notification
from app.domains.geo_analytics.models import spatial


async def create_tables():
    """Create all tables in the database."""
    print("Creating database tables...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("✅ All tables created successfully!")
    
    # Seed data centers from CSV if table is empty
    try:
        from app.scripts.seed_data_centers import seed_data_centers
        print("Seeding data centers from CSV...")
        await seed_data_centers()
        print("✅ Data centers seeded successfully!")
    except Exception as e:
        print(f"⚠️  CSV seed skipped: {e}")

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(create_tables())