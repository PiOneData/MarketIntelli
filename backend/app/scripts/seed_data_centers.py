"""
Seed script to migrate the 76 hardcoded data center entries into the database.

Usage:
    python -m app.scripts.seed_data_centers

This script creates DataCenterCompany records (one per unique company name)
and DataCenterFacility records for each facility, linking them via company_id.
"""

import asyncio
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import async_session_factory
from app.domains.data_center_intelligence.models.data_center import (
    DataCenterCompany,
    DataCenterFacility,
)

# All 76 data center entries from the frontend
SEED_DATA = [
    {"company": "AdaniConneX", "city": "Navi Mumbai", "location": "Navi Mumbai Campus", "state": "Maharashtra", "powerMW": 1000, "sizeSqFt": 4000000, "status": "Under Construction", "dateAdded": "2025-01-15"},
    {"company": "AdaniConneX", "city": "Hyderabad", "location": "Hyderabad Campus", "state": "Telangana", "powerMW": 600, "sizeSqFt": 2400000, "status": "Planned", "dateAdded": "2025-03-10"},
    {"company": "AdaniConneX", "city": "Pune", "location": "Pune Campus", "state": "Maharashtra", "powerMW": 250, "sizeSqFt": 1000000, "status": "Planned", "dateAdded": "2025-02-20"},
    {"company": "AdaniConneX", "city": "Noida", "location": "Noida Campus", "state": "Uttar Pradesh", "powerMW": 150, "sizeSqFt": 600000, "status": "Under Construction", "dateAdded": "2025-04-05"},
    {"company": "AdaniConneX", "city": "Chennai", "location": "Chennai 1", "state": "Tamil Nadu", "powerMW": 33, "sizeSqFt": 132000, "status": "Operational", "dateAdded": "2025-06-12"},
    {"company": "Reliance Industries", "city": "Jamnagar", "location": "Jamnagar AI Data Center", "state": "Gujarat", "powerMW": 1000, "sizeSqFt": 4500000, "status": "Planned", "dateAdded": "2025-01-20"},
    {"company": "Google (with AdaniConneX & Airtel)", "city": "Visakhapatnam", "location": "AI & Data Center Hub", "state": "Andhra Pradesh", "powerMW": 500, "sizeSqFt": 2000000, "status": "Planned", "dateAdded": "2026-01-15"},
    {"company": "NTT Global Data Centers", "city": "Navi Mumbai", "location": "NAV2 Campus", "state": "Maharashtra", "powerMW": 500, "sizeSqFt": 2000000, "status": "Under Construction", "dateAdded": "2025-06-01"},
    {"company": "NTT Global Data Centers", "city": "Navi Mumbai", "location": "NAV1 Campus (NAV1A)", "state": "Maharashtra", "powerMW": 30, "sizeSqFt": 398000, "status": "Operational", "dateAdded": "2024-03-15"},
    {"company": "NTT Global Data Centers", "city": "Chennai", "location": "Chennai 2 Campus, Ambattur", "state": "Tamil Nadu", "powerMW": 35, "sizeSqFt": 180000, "status": "Operational", "dateAdded": "2024-06-20"},
    {"company": "NTT Global Data Centers", "city": "Bengaluru", "location": "Bengaluru 4 Campus", "state": "Karnataka", "powerMW": 67, "sizeSqFt": 300000, "status": "Under Construction", "dateAdded": "2025-08-10"},
    {"company": "NTT Global Data Centers", "city": "Noida", "location": "Noida Campus", "state": "Uttar Pradesh", "powerMW": 53, "sizeSqFt": 300000, "status": "Operational", "dateAdded": "2024-09-15"},
    {"company": "NTT DATA & Neysa Networks", "city": "Hyderabad", "location": "AI Data Center Cluster", "state": "Telangana", "powerMW": 400, "sizeSqFt": 1600000, "status": "Planned", "dateAdded": "2025-04-23"},
    {"company": "NTT Global Data Centers", "city": "Mumbai", "location": "Mumbai 9, Chandivali Campus", "state": "Maharashtra", "powerMW": 40, "sizeSqFt": 200000, "status": "Operational", "dateAdded": "2025-07-01"},
    {"company": "CtrlS Datacenters", "city": "Mumbai", "location": "Mumbai DC1", "state": "Maharashtra", "powerMW": 42, "sizeSqFt": 200000, "status": "Operational", "dateAdded": "2024-01-10"},
    {"company": "CtrlS Datacenters", "city": "Mumbai", "location": "Mumbai DC2", "state": "Maharashtra", "powerMW": 8, "sizeSqFt": 40000, "status": "Operational", "dateAdded": "2024-01-10"},
    {"company": "CtrlS Datacenters", "city": "Mumbai", "location": "Mumbai DC3", "state": "Maharashtra", "powerMW": 36, "sizeSqFt": 170000, "status": "Operational", "dateAdded": "2024-01-10"},
    {"company": "CtrlS Datacenters", "city": "Mumbai", "location": "Mumbai DC4", "state": "Maharashtra", "powerMW": 30, "sizeSqFt": 140000, "status": "Operational", "dateAdded": "2024-01-10"},
    {"company": "CtrlS Datacenters", "city": "Chennai", "location": "Chennai DC1", "state": "Tamil Nadu", "powerMW": 20, "sizeSqFt": 100000, "status": "Operational", "dateAdded": "2024-03-01"},
    {"company": "CtrlS Datacenters", "city": "Chennai", "location": "Chennai DC2", "state": "Tamil Nadu", "powerMW": 20, "sizeSqFt": 100000, "status": "Operational", "dateAdded": "2024-03-01"},
    {"company": "CtrlS Datacenters", "city": "Chennai", "location": "Chennai DC3", "state": "Tamil Nadu", "powerMW": 20, "sizeSqFt": 100000, "status": "Operational", "dateAdded": "2024-03-01"},
    {"company": "CtrlS Datacenters", "city": "Chennai", "location": "Chennai DC4", "state": "Tamil Nadu", "powerMW": 20, "sizeSqFt": 100000, "status": "Operational", "dateAdded": "2024-03-01"},
    {"company": "CtrlS Datacenters", "city": "Chennai", "location": "Chennai Data Center Park", "state": "Tamil Nadu", "powerMW": 72, "sizeSqFt": 1000000, "status": "Planned", "dateAdded": "2025-06-01"},
    {"company": "CtrlS Datacenters", "city": "Noida", "location": "Noida DC1", "state": "Uttar Pradesh", "powerMW": 20, "sizeSqFt": 100000, "status": "Operational", "dateAdded": "2024-05-01"},
    {"company": "CtrlS Datacenters", "city": "Noida", "location": "Noida DC2", "state": "Uttar Pradesh", "powerMW": 20, "sizeSqFt": 100000, "status": "Operational", "dateAdded": "2024-05-01"},
    {"company": "CtrlS Datacenters", "city": "Noida", "location": "Noida DC3", "state": "Uttar Pradesh", "powerMW": 20, "sizeSqFt": 100000, "status": "Operational", "dateAdded": "2024-05-01"},
    {"company": "CtrlS Datacenters", "city": "Noida", "location": "Noida DC4", "state": "Uttar Pradesh", "powerMW": 20, "sizeSqFt": 100000, "status": "Operational", "dateAdded": "2024-05-01"},
    {"company": "CtrlS Datacenters", "city": "Bengaluru", "location": "Bengaluru DC1", "state": "Karnataka", "powerMW": 20, "sizeSqFt": 100000, "status": "Operational", "dateAdded": "2024-04-01"},
    {"company": "CtrlS Datacenters", "city": "Bengaluru", "location": "Bengaluru DC2", "state": "Karnataka", "powerMW": 20, "sizeSqFt": 100000, "status": "Operational", "dateAdded": "2024-04-01"},
    {"company": "CtrlS Datacenters", "city": "Bengaluru", "location": "Bengaluru DC3", "state": "Karnataka", "powerMW": 20, "sizeSqFt": 100000, "status": "Operational", "dateAdded": "2024-04-01"},
    {"company": "CtrlS Datacenters", "city": "Bengaluru", "location": "Bengaluru DC4", "state": "Karnataka", "powerMW": 20, "sizeSqFt": 100000, "status": "Operational", "dateAdded": "2024-04-01"},
    {"company": "CtrlS Datacenters", "city": "Kolkata", "location": "Kolkata DC1", "state": "West Bengal", "powerMW": 20, "sizeSqFt": 100000, "status": "Operational", "dateAdded": "2024-06-15"},
    {"company": "CtrlS Datacenters", "city": "Kolkata", "location": "Kolkata DC2", "state": "West Bengal", "powerMW": 20, "sizeSqFt": 100000, "status": "Operational", "dateAdded": "2024-06-15"},
    {"company": "CtrlS Datacenters", "city": "Kolkata", "location": "Kolkata DC3", "state": "West Bengal", "powerMW": 20, "sizeSqFt": 100000, "status": "Operational", "dateAdded": "2024-06-15"},
    {"company": "CtrlS Datacenters", "city": "Kolkata", "location": "Kolkata DC4", "state": "West Bengal", "powerMW": 20, "sizeSqFt": 100000, "status": "Operational", "dateAdded": "2024-06-15"},
    {"company": "CtrlS Datacenters", "city": "Hyderabad", "location": "Chandan Valley Industrial Park", "state": "Telangana", "powerMW": 612, "sizeSqFt": 2500000, "status": "Under Construction", "dateAdded": "2025-02-15"},
    {"company": "CtrlS Datacenters", "city": "Bhopal", "location": "Badwai IT Park", "state": "Madhya Pradesh", "powerMW": 12, "sizeSqFt": 60000, "status": "Under Construction", "dateAdded": "2025-04-10"},
    {"company": "Yotta Infrastructure", "city": "Navi Mumbai", "location": "Yotta NM1, Panvel Hyperscale Campus", "state": "Maharashtra", "powerMW": 250, "sizeSqFt": 900000, "status": "Operational", "dateAdded": "2023-06-10"},
    {"company": "Tulip Data City", "city": "Bengaluru", "location": "Tulip Data City Campus", "state": "Karnataka", "powerMW": 80, "sizeSqFt": 400000, "status": "Operational", "dateAdded": "2024-07-01"},
    {"company": "Nxtra (Airtel)", "city": "Mumbai", "location": "Nxtra Mumbai Campus", "state": "Maharashtra", "powerMW": 120, "sizeSqFt": 500000, "status": "Operational", "dateAdded": "2024-06-01"},
    {"company": "Nxtra (Airtel)", "city": "Hyderabad", "location": "Nxtra Hyderabad Campus", "state": "Telangana", "powerMW": 60, "sizeSqFt": 250000, "status": "Operational", "dateAdded": "2024-06-01"},
    {"company": "Nxtra (Airtel)", "city": "Bengaluru", "location": "Nxtra Bengaluru Campus", "state": "Karnataka", "powerMW": 60, "sizeSqFt": 250000, "status": "Operational", "dateAdded": "2024-06-01"},
    {"company": "Nxtra (Airtel)", "city": "Delhi", "location": "Nxtra Delhi-NCR Campus", "state": "Delhi", "powerMW": 80, "sizeSqFt": 350000, "status": "Operational", "dateAdded": "2024-06-01"},
    {"company": "Nxtra (Airtel)", "city": "Chennai", "location": "Nxtra Chennai Campus", "state": "Tamil Nadu", "powerMW": 40, "sizeSqFt": 180000, "status": "Operational", "dateAdded": "2024-06-01"},
    {"company": "STT GDC India", "city": "Chennai", "location": "STT Chennai 2, Ambattur", "state": "Tamil Nadu", "powerMW": 25, "sizeSqFt": 150000, "status": "Operational", "dateAdded": "2024-09-20"},
    {"company": "STT GDC India", "city": "Chennai", "location": "Siruseri Campus", "state": "Tamil Nadu", "powerMW": 50, "sizeSqFt": 250000, "status": "Under Construction", "dateAdded": "2025-01-10"},
    {"company": "STT GDC India", "city": "Kolkata", "location": "New Town Campus", "state": "West Bengal", "powerMW": 25, "sizeSqFt": 243500, "status": "Operational", "dateAdded": "2025-04-20"},
    {"company": "STT GDC India", "city": "Navi Mumbai", "location": "MIDC Mahape Campus", "state": "Maharashtra", "powerMW": 100, "sizeSqFt": 500000, "status": "Under Construction", "dateAdded": "2025-10-15"},
    {"company": "STT GDC India", "city": "Mumbai", "location": "STT Mumbai DC 3, BKC", "state": "Maharashtra", "powerMW": 20, "sizeSqFt": 100000, "status": "Operational", "dateAdded": "2024-06-01"},
    {"company": "STT GDC India", "city": "Pune", "location": "Pune 5-Building Campus", "state": "Maharashtra", "powerMW": 40, "sizeSqFt": 200000, "status": "Operational", "dateAdded": "2024-09-25"},
    {"company": "STT GDC India", "city": "Bengaluru", "location": "STT Bengaluru Campus", "state": "Karnataka", "powerMW": 30, "sizeSqFt": 150000, "status": "Operational", "dateAdded": "2024-08-01"},
    {"company": "STT GDC India", "city": "Hyderabad", "location": "STT Hyderabad Campus", "state": "Telangana", "powerMW": 20, "sizeSqFt": 100000, "status": "Operational", "dateAdded": "2024-08-01"},
    {"company": "Equinix / GPX", "city": "Navi Mumbai", "location": "Thane-Belapur Corridor, Hyperscale Facilities", "state": "Maharashtra", "powerMW": 100, "sizeSqFt": 500000, "status": "Operational", "dateAdded": "2024-02-15"},
    {"company": "Lumina CloudInfra (Blackstone)", "city": "Navi Mumbai", "location": "Airoli & Mahape Campuses", "state": "Maharashtra", "powerMW": 500, "sizeSqFt": 2000000, "status": "Planned", "dateAdded": "2025-05-10"},
    {"company": "Digital Edge (Stonepeak) / NIIF", "city": "Navi Mumbai", "location": "BOM1 Greenfield Hyperscale Campus", "state": "Maharashtra", "powerMW": 300, "sizeSqFt": 1200000, "status": "Under Construction", "dateAdded": "2024-08-15"},
    {"company": "Sify Infinit Spaces", "city": "Visakhapatnam", "location": "Rushikonda-Madhurawada IT Park", "state": "Andhra Pradesh", "powerMW": 50, "sizeSqFt": 200000, "status": "Under Construction", "dateAdded": "2025-09-01"},
    {"company": "Sify Technologies", "city": "Lucknow", "location": "AI Hub Data Center", "state": "Uttar Pradesh", "powerMW": 30, "sizeSqFt": 120000, "status": "Under Construction", "dateAdded": "2025-02-10"},
    {"company": "RackBank", "city": "Raipur", "location": "AI Data Center Complex", "state": "Chhattisgarh", "powerMW": 80, "sizeSqFt": 350000, "status": "Under Construction", "dateAdded": "2025-06-20"},
    {"company": "Anant Raj", "city": "Gurugram", "location": "Haryana Data Center Campus", "state": "Haryana", "powerMW": 300, "sizeSqFt": 1200000, "status": "Planned", "dateAdded": "2025-07-15"},
    {"company": "Colt DCS & RMZ Digital", "city": "Mumbai", "location": "Mumbai Hyperscale Campus", "state": "Maharashtra", "powerMW": 150, "sizeSqFt": 600000, "status": "Planned", "dateAdded": "2025-05-20"},
    {"company": "Colt DCS & RMZ Digital", "city": "Bengaluru", "location": "Bengaluru Hyperscale Campus", "state": "Karnataka", "powerMW": 100, "sizeSqFt": 400000, "status": "Planned", "dateAdded": "2025-05-20"},
    {"company": "Lodha Developers", "city": "Mumbai", "location": "Green Integrated Data Center Park", "state": "Maharashtra", "powerMW": 200, "sizeSqFt": 1000000, "status": "Planned", "dateAdded": "2025-11-10"},
    {"company": "AWS India (Amazon)", "city": "Navi Mumbai", "location": "AWS Asia Pacific (Mumbai) Region, Rabale & Airoli MIDC", "state": "Maharashtra", "powerMW": 150, "sizeSqFt": 600000, "status": "Operational", "dateAdded": "2024-01-15"},
    {"company": "AWS India (Amazon)", "city": "Hyderabad", "location": "AWS Asia Pacific (Hyderabad) Region", "state": "Telangana", "powerMW": 100, "sizeSqFt": 400000, "status": "Operational", "dateAdded": "2024-11-01"},
    {"company": "Microsoft Azure", "city": "Pune", "location": "Azure Central India Region, Pimpri Chinchwad & Hinjewadi", "state": "Maharashtra", "powerMW": 100, "sizeSqFt": 500000, "status": "Operational", "dateAdded": "2024-02-01"},
    {"company": "Microsoft Azure", "city": "Chennai", "location": "Azure South India Region", "state": "Tamil Nadu", "powerMW": 50, "sizeSqFt": 250000, "status": "Operational", "dateAdded": "2024-02-01"},
    {"company": "Microsoft Azure", "city": "Mumbai", "location": "Azure West India Region", "state": "Maharashtra", "powerMW": 50, "sizeSqFt": 250000, "status": "Operational", "dateAdded": "2024-02-01"},
    {"company": "Reliance Jio", "city": "Mumbai", "location": "Reliance IDC, Dhirubhai Ambani Knowledge City", "state": "Maharashtra", "powerMW": 80, "sizeSqFt": 250000, "status": "Operational", "dateAdded": "2024-03-01"},
    {"company": "Reliance Jio", "city": "Hyderabad", "location": "Reliance IDC, Hitech City", "state": "Telangana", "powerMW": 50, "sizeSqFt": 150000, "status": "Operational", "dateAdded": "2024-03-01"},
    {"company": "Reliance Jio", "city": "Bengaluru", "location": "Reliance IDC Bengaluru", "state": "Karnataka", "powerMW": 40, "sizeSqFt": 120000, "status": "Operational", "dateAdded": "2024-03-01"},
    {"company": "Reliance Jio", "city": "Chennai", "location": "Reliance IDC Chennai", "state": "Tamil Nadu", "powerMW": 30, "sizeSqFt": 100000, "status": "Operational", "dateAdded": "2024-03-01"},
    {"company": "Reliance Jio", "city": "Noida", "location": "Uttar Pradesh 200 MW Campus (6 buildings, 30,000 racks)", "state": "Uttar Pradesh", "powerMW": 200, "sizeSqFt": 800000, "status": "Planned", "dateAdded": "2025-06-01"},
    {"company": "Tata Communications", "city": "Chennai", "location": "Tata Communications Chennai DC", "state": "Tamil Nadu", "powerMW": 25, "sizeSqFt": 120000, "status": "Operational", "dateAdded": "2024-01-10"},
    {"company": "Tata Communications", "city": "Pune", "location": "Tata Communications Pune DC, Alandi Rd", "state": "Maharashtra", "powerMW": 20, "sizeSqFt": 100000, "status": "Operational", "dateAdded": "2024-01-10"},
    {"company": "Tata Communications", "city": "Mumbai", "location": "Tata Communications Mumbai DC", "state": "Maharashtra", "powerMW": 30, "sizeSqFt": 150000, "status": "Operational", "dateAdded": "2024-01-10"},
    {"company": "Hypervault AI (Tata Group)", "city": "Mumbai", "location": "Hypervault AI Sovereign Data Center", "state": "Maharashtra", "powerMW": 1000, "sizeSqFt": 4000000, "status": "Planned", "dateAdded": "2025-10-01"},
]

# Map company names to parent companies for enrichment
COMPANY_PARENTS = {
    "AdaniConneX": "Adani Group",
    "Reliance Industries": "Reliance Industries Ltd",
    "Google (with AdaniConneX & Airtel)": None,
    "NTT Global Data Centers": "NTT Group",
    "NTT DATA & Neysa Networks": "NTT Group",
    "CtrlS Datacenters": None,
    "Yotta Infrastructure": "Hiranandani Group",
    "Tulip Data City": None,
    "Nxtra (Airtel)": "Bharti Airtel",
    "STT GDC India": "ST Telemedia",
    "Equinix / GPX": "Equinix",
    "Lumina CloudInfra (Blackstone)": "Blackstone",
    "Digital Edge (Stonepeak) / NIIF": "Stonepeak / NIIF",
    "Sify Infinit Spaces": "Sify Technologies",
    "Sify Technologies": "Sify Technologies",
    "RackBank": None,
    "Anant Raj": "Anant Raj Ltd",
    "Colt DCS & RMZ Digital": "Colt Technology Services",
    "Lodha Developers": "Macrotech Developers",
    "AWS India (Amazon)": "Amazon",
    "Microsoft Azure": "Microsoft",
    "Reliance Jio": "Reliance Industries Ltd",
    "Tata Communications": "Tata Group",
    "Hypervault AI (Tata Group)": "Tata Group",
}


def _parse_status(status: str) -> str:
    """Normalize status to lowercase with underscores."""
    return status.lower().replace(" ", "_")


async def seed_data_centers() -> None:
    async with async_session_factory() as session:
        # Check if data already exists
        existing = await session.execute(
            select(DataCenterCompany).limit(1)
        )
        if existing.scalar_one_or_none():
            print("Data center companies already exist. Skipping seed.")
            return

        # Create companies
        company_map: dict[str, DataCenterCompany] = {}
        unique_companies = set(entry["company"] for entry in SEED_DATA)

        for company_name in sorted(unique_companies):
            company = DataCenterCompany(
                name=company_name,
                parent_company=COMPANY_PARENTS.get(company_name),
            )
            session.add(company)
            company_map[company_name] = company

        await session.flush()  # Get IDs assigned

        # Create facilities
        for entry in SEED_DATA:
            company = company_map[entry["company"]]
            date_added = datetime.strptime(entry["dateAdded"], "%Y-%m-%d")
            facility = DataCenterFacility(
                company_id=company.id,
                name=entry["location"],
                city=entry["city"],
                state=entry["state"],
                location_detail=entry["location"],
                power_capacity_mw=float(entry["powerMW"]),
                size_sqft=float(entry["sizeSqFt"]),
                status=_parse_status(entry["status"]),
                date_added=date_added,
            )
            session.add(facility)

        await session.commit()
        print(f"Seeded {len(unique_companies)} companies and {len(SEED_DATA)} facilities.")


def main() -> None:
    asyncio.run(seed_data_centers())


if __name__ == "__main__":
    main()
