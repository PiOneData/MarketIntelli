"""
Seed script to migrate the 76 hardcoded data center entries into the database.

Usage:
    python -m app.scripts.seed_data_centers

This script creates DataCenterCompany records (one per unique company name)
and DataCenterFacility records for each facility, linking them via company_id.
"""

import asyncio
from datetime import datetime
import csv
import os

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import async_session_factory
from app.domains.data_center_intelligence.models.data_center import (
    DataCenterCompany,
    DataCenterFacility,
)

# CSV file path
CSV_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "dc_118.csv")

def load_csv_data():
    data = []
    with open(CSV_PATH, encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            # Clean up and handle nulls
            for k, v in row.items():
                if v is not None:
                    v = v.strip()
                row[k] = v if v else None
            data.append(row)
    return data

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
    csv_data = load_csv_data()
    async with async_session_factory() as session:
        # Check if data already exists
        existing = await session.execute(select(DataCenterCompany).limit(1))
        if existing.scalar_one_or_none():
            print("Data center companies already exist. Skipping seed.")
            return

        # Create companies
        company_map = {}
        unique_companies = set(row["Company Name"] for row in csv_data if row["Company Name"])
        for company_name in sorted(unique_companies):
            company = DataCenterCompany(
                name=company_name,
                parent_company=None,
            )
            session.add(company)
            company_map[company_name] = company

        await session.flush()

        # Create facilities
        for row in csv_data:
            company_name = row["Company Name"]
            company = company_map.get(company_name)
            if not company:
                continue
            # Parse date if possible
            date_added = None
            # No date in CSV, so use today
            try:
                date_added = datetime.today()
            except Exception:
                date_added = None
            # Parse numeric fields
            def parse_float(val):
                try:
                    return float(val.replace("MW", "").replace(",", "").strip()) if val else None
                except Exception:
                    return None
            facility = DataCenterFacility(
                company_id=company.id,
                name=row.get("Data Center Name"),
                city=row.get("City"),
                state=row.get("State"),
                location_detail=row.get("Address"),
                power_capacity_mw=parse_float(row.get("Power (MW)")),
                size_sqft=None,  # Not directly mapped, could parse from Whitespace
                status=None,  # Not directly mapped, could use Tier Design or custom logic
                date_added=date_added,
            )
            session.add(facility)

        await session.commit()
        print(f"Seeded {len(unique_companies)} companies and {len(csv_data)} facilities.")


def main() -> None:
    asyncio.run(seed_data_centers())


if __name__ == "__main__":
    main()
