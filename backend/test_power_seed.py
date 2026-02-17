#!/usr/bin/env python3
"""Test script to debug power market seeding issues."""

import asyncio
import sys
import os

# Add current directory to Python path
sys.path.append(os.getcwd())

from app.scripts.seed_power_market import seed_power_market
from app.db.session import engine
from app.db.base import Base

# Import all models so they are registered with Base.metadata
from app.domains.dashboard.models.market_overview import InstalledCapacity, FinancialInsight
from app.domains.data_center_intelligence.models.data_center import DataCenterCompany, DataCenterFacility
from app.domains.project_intelligence.models.projects import Developer, SolarProject, Tender
from app.domains.policy_intelligence.models.policy import Policy, TariffRecord, Subsidy
from app.domains.alerts.models.alerts import Alert, Watchlist, Notification
from app.domains.power_market.models.power_market import (
    RenewableCapacity, PowerGeneration, TransmissionLine,
    PowerConsumption, RETariff, InvestmentGuideline, DataRepository,
)


async def test_power_market_seed():
    """Test power market seeding with detailed error reporting."""
    print("🔧 Testing power market seeding...")
    
    # Ensure tables exist
    print("Creating tables...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("✅ Tables created successfully!")
    
    try:
        print("🌱 Starting power market data seeding...")
        await seed_power_market()
        print("✅ Power market seeding completed!")
    except Exception as e:
        print(f"❌ Power market seeding failed: {e}")
        import traceback
        traceback.print_exc()
    
    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(test_power_market_seed())