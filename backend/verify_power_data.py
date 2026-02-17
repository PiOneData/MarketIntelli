#!/usr/bin/env python3
"""Verify power market data in database."""

import asyncio
import sys
import os

sys.path.append(os.getcwd())

from sqlalchemy import select, text
from app.db.session import async_session_factory
from app.domains.power_market.models.power_market import RenewableCapacity, PowerGeneration


async def verify_power_market_data():
    """Verify power market data exists in database."""
    async with async_session_factory() as session:
        # Check renewable capacity
        capacity_stmt = select(RenewableCapacity).limit(5)
        capacity_result = await session.execute(capacity_stmt)
        capacity_data = capacity_result.scalars().all()
        
        print(f"📊 Renewable Capacity Records: {len(capacity_data)}")
        for record in capacity_data:
            print(f"  - {record.state}: {record.energy_source} = {record.installed_capacity_mw} MW")
        
        # Count all power market tables
        tables = [
            "renewable_capacity", "power_generation", "transmission_lines",
            "power_consumption", "re_tariffs", "investment_guidelines", "data_repository"
        ]
        
        print(f"\n📈 Power Market Table Counts:")
        for table in tables:
            count_stmt = text(f"SELECT COUNT(*) FROM {table}")
            result = await session.execute(count_stmt)
            count = result.scalar()
            print(f"  - {table}: {count} records")


if __name__ == "__main__":
    asyncio.run(verify_power_market_data())