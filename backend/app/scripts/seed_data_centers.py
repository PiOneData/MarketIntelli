"""
Seed script to import data center entries from dc-extracted-19022026-final.csv into PostgreSQL.

Usage:
    python -m app.scripts.seed_data_centers

This script:
1. Reads dc-extracted-19022026-final.csv — the authoritative full dataset (~287 data centers)
2. Creates DataCenterCompany records (one per unique company name)
3. Creates DataCenterFacility records for each facility, linking them via company_id
"""

import asyncio
import csv
import os
import re
from datetime import datetime

from sqlalchemy import select

from app.db.session import async_session_factory
from app.domains.data_center_intelligence.models.data_center import (
    DataCenterCompany,
    DataCenterFacility,
)

# CSV file path — always use the authoritative extracted dataset
_SCRIPT_DIR = os.path.dirname(__file__)
_CANDIDATES = [
    os.path.join(_SCRIPT_DIR, "..", "..", "..", "dc-extracted-19022026-final.csv"),  # project root
    os.path.join(_SCRIPT_DIR, "..", "..", "dc-extracted-19022026-final.csv"),        # backend/
    "/app/dc-extracted-19022026-final.csv",                                          # Docker mount
]
CSV_PATH = next((p for p in _CANDIDATES if os.path.exists(p)), _CANDIDATES[0])

# Map known company names to parent companies
COMPANY_PARENTS = {
    "AdaniConneX": "Adani Group",
    "Sify Technologies Ltd": "Sify Technologies",
    "STT GDC India": "ST Telemedia",
    "NTT DATA, Inc.": "NTT Group",
    "Yotta Data Services": "Hiranandani Group",
    "Yotta": "Hiranandani Group",
    "Nxtra by Airtel": "Bharti Airtel",
    "CtrlS Datacenters Ltd": None,
    "CtrlS Datacenters Pvt Ltd": None,
    "Tata Communications": "Tata Group",
    "Equinix": "Equinix Inc",
    "Microsoft": "Microsoft Corporation",
    "Amazon AWS": "Amazon",
    "Reliance Data Center": "Reliance Industries Ltd",
    "Iron Mountain Data Centers": "Iron Mountain Inc",
    "CapitaLand Data Centre": "CapitaLand Investment",
    "Digital Realty": "Digital Realty Trust",
    "L&T Cloudfiniti": "Larsen & Toubro",
    "Anant Raj Cloud": "Anant Raj Ltd",
    "BSNL IDC": "BSNL",
    "RailTel Corporation of India Ltd.": "Indian Railways",
    "ESDS Software Solution Pvt. Ltd.": None,
    "Rackbank Datacenters Pvt. Ltd.": None,
    "Colt Technology Services": "Fidelity Investments",
    "Pi Datacenters": None,
}


def _parse_power_mw(val: str | None) -> float | None:
    """Parse power value from CSV (e.g. '1.2 MW', '16 MW', 'Not Listed')."""
    if not val or val.strip().lower() in ("not listed", "not publicly disclosed", ""):
        return None
    match = re.search(r"([\d.]+)", val.replace(",", ""))
    if match:
        try:
            return float(match.group(1))
        except ValueError:
            return None
    return None


def _parse_whitespace(val: str | None) -> float | None:
    """Parse whitespace/size field to approximate sq ft."""
    if not val or val.strip().lower() in ("not listed", ""):
        return None
    val = val.strip()
    if "acre" in val.lower():
        match = re.search(r"([\d,.]+)", val.replace(",", ""))
        if match:
            return round(float(match.group(1)) * 43560, 2)
    if "sq.m" in val.lower() or "sq. m" in val.lower():
        match = re.search(r"([\d,.]+)", val.replace(",", ""))
        if match:
            return round(float(match.group(1)) * 10.764, 2)
    if "sq" in val.lower():
        match = re.search(r"([\d,.]+)", val.replace(",", ""))
        if match:
            return float(match.group(1).replace(",", ""))
    if "rack" in val.lower():
        match = re.search(r"([\d,.]+)", val.replace(",", ""))
        if match:
            return float(match.group(1).replace(",", ""))
    return None


def _parse_tier(val: str | None) -> str | None:
    """Normalize tier design field."""
    if not val or val.strip().lower() in ("not listed", ""):
        return None
    val = val.strip()
    val = (
        val.replace("Tier 4", "Tier IV")
        .replace("Tier 3", "Tier III")
        .replace("Tier 2", "Tier II")
    )
    return val


def load_csv_data() -> list[dict]:
    """Load and parse the CSV file, handling multiline fields."""
    rows = []
    with open(CSV_PATH, encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            cleaned = {}
            for k, v in row.items():
                if k and v:
                    v = " ".join(v.split())  # collapse multiline into single line
                    cleaned[k.strip()] = v.strip() if v.strip() else None
                elif k:
                    cleaned[k.strip()] = None
            rows.append(cleaned)
    return rows


async def seed_data_centers() -> None:
    """Seed data centers from CSV into the database."""
    csv_data = load_csv_data()

    async with async_session_factory() as session:
        # Check if data already exists
        existing = await session.execute(select(DataCenterCompany).limit(1))
        if existing.scalar_one_or_none():
            print("Data center companies already exist. Skipping seed.")
            return

        # Create companies
        company_map: dict[str, DataCenterCompany] = {}
        for row in csv_data:
            name = row.get("Company Name")
            if name and name not in company_map:
                website = row.get("URL to Website")
                parent = COMPANY_PARENTS.get(name)
                company = DataCenterCompany(
                    name=name,
                    parent_company=parent,
                    website=website,
                )
                session.add(company)
                company_map[name] = company

        await session.flush()

        # Create facilities
        for row in csv_data:
            company_name = row.get("Company Name")
            company = company_map.get(company_name)
            if not company:
                continue

            city = row.get("City") or row.get("Market") or "Unknown"
            state = row.get("State") or "Unknown"
            state = state.strip().strip(",").strip()

            address = row.get("Address")
            postal = row.get("Postal")
            location_parts = []
            if address:
                location_parts.append(address)
            if postal:
                location_parts.append(f"Postal: {postal}")
            location_detail = ", ".join(location_parts) if location_parts else None

            facility = DataCenterFacility(
                company_id=company.id,
                name=row.get("Data Center Name") or "Unknown",
                city=city,
                state=state,
                location_detail=location_detail,
                power_capacity_mw=_parse_power_mw(row.get("Power (MW)")) or 0.0,
                size_sqft=_parse_whitespace(row.get("Whitespace")) or 0.0,
                status="operational",
                tier_level=_parse_tier(row.get("Tier Design")),
                date_added=datetime.now(),
            )
            session.add(facility)

        await session.commit()
        print(f"Seeded {len(company_map)} companies and {len(csv_data)} facilities.")


def main() -> None:
    asyncio.run(seed_data_centers())


if __name__ == "__main__":
    main()
