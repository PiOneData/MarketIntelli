"""
Script to enrich DataCenterCompany records with researched public data.

Usage:
    python -m app.scripts.enrich_company_profiles           # dry-run preview
    python -m app.scripts.enrich_company_profiles --apply   # write to database

This script uses UPDATE (not INSERT) — safe to run multiple times.
Only updates fields that are currently NULL or differ from enrichment data.
"""

import asyncio
import sys

from sqlalchemy import select, update

from app.db.session import async_session_factory
from app.domains.data_center_intelligence.models.data_center import DataCenterCompany


# ─────────────────────────────────────────────────────────────────────────────
# Enrichment data
# Sources: company websites, Tracxn, Crunchbase, press releases (2024–2026)
# ─────────────────────────────────────────────────────────────────────────────
ENRICHMENTS: list[dict] = [
    {
        "name": "CtrlS Datacenters Pvt Ltd",
        "parent_company": None,
        "headquarters": "Hyderabad, Telangana",
        "website": "https://www.ctrls.in",
        "employee_count": 2000,
        "total_investment_usd": None,
        "annual_revenue_usd": None,
        "sustainability_rating": "Tier IV Certified (Uptime Institute)",
    },
    {
        "name": "CtrlS Datacenters Ltd",
        "parent_company": None,
        "headquarters": "Hyderabad, Telangana",
        "website": "https://www.ctrls.in",
        "employee_count": 2000,
        "total_investment_usd": None,
        "annual_revenue_usd": None,
        "sustainability_rating": "Tier IV Certified (Uptime Institute)",
    },
    {
        "name": "STT GDC India",
        "parent_company": "ST Telemedia Global Data Centres",
        "headquarters": "Mumbai, Maharashtra (HQ: Singapore)",
        "website": "https://www.sttgdc.com",
        "employee_count": None,
        "total_investment_usd": 2_000_000_000,
        "annual_revenue_usd": None,
        "sustainability_rating": "ISO 14001, LEED Certified",
    },
    {
        "name": "Nxtra by Airtel",
        "parent_company": "Bharti Airtel",
        "headquarters": "New Delhi, Delhi",
        "website": "https://www.nxtra.in",
        "employee_count": None,
        "total_investment_usd": None,
        "annual_revenue_usd": None,
        "sustainability_rating": "Uptime Tier III / Tier IV",
    },
    {
        "name": "Sify Technologies Ltd",
        "parent_company": "Raju Vegesna Group",
        "headquarters": "Chennai, Tamil Nadu",
        "website": "https://www.sify.com",
        "employee_count": 5000,
        "total_investment_usd": None,
        "annual_revenue_usd": 300_000_000,
        "sustainability_rating": "Tier III / LEED Gold",
    },
    {
        "name": "NTT DATA, Inc.",
        "parent_company": "NTT Group Japan",
        "headquarters": "Plano, Texas (India ops: Mumbai, Chennai)",
        "website": "https://www.global.ntt",
        "employee_count": None,
        "total_investment_usd": None,
        "annual_revenue_usd": None,
        "sustainability_rating": "ISO 50001 Energy Management",
    },
    {
        "name": "AdaniConneX",
        "parent_company": "Adani Enterprises / EdgeConneX JV",
        "headquarters": "Ahmedabad, Gujarat",
        "website": "https://www.adaniconnex.com",
        "employee_count": None,
        "total_investment_usd": 4_900_000_000,
        "annual_revenue_usd": None,
        "sustainability_rating": "100% Renewable Energy Target 2030",
    },
    {
        "name": "Equinix",
        "parent_company": "Equinix Inc",
        "headquarters": "Redwood City, California, USA",
        "website": "https://www.equinix.in",
        "employee_count": None,
        "total_investment_usd": 7_000_000_000,
        "annual_revenue_usd": None,
        "sustainability_rating": "100% Renewable Energy (RE100 Member)",
    },
    {
        "name": "Digital Realty",
        "parent_company": "Digital Realty Trust",
        "headquarters": "Austin, Texas, USA",
        "website": "https://www.digitalrealty.com",
        "employee_count": None,
        "total_investment_usd": None,
        "annual_revenue_usd": None,
        "sustainability_rating": "REIT — LEED Certified, Science-Based Targets",
    },
    {
        "name": "Yotta Data Services",
        "parent_company": "Hiranandani Group",
        "headquarters": "Mumbai, Maharashtra",
        "website": "https://yotta.com",
        "employee_count": None,
        "total_investment_usd": 2_000_000_000,
        "annual_revenue_usd": None,
        "sustainability_rating": "Tier IV, IGBC Green DC Platinum",
    },
    {
        "name": "Tata Communications",
        "parent_company": "Tata Group",
        "headquarters": "Mumbai, Maharashtra",
        "website": "https://www.tatacommunications.com",
        "employee_count": None,
        "total_investment_usd": None,
        "annual_revenue_usd": None,
        "sustainability_rating": "Tier III / ISO 27001 / Net Zero 2035",
    },
    {
        "name": "Reliance Data Center",
        "parent_company": "Reliance Industries Ltd",
        "headquarters": "Mumbai, Maharashtra",
        "website": "https://www.ril.com",
        "employee_count": None,
        "total_investment_usd": 5_000_000_000,
        "annual_revenue_usd": None,
        "sustainability_rating": "Green Rated Facilities",
    },
    {
        "name": "CapitaLand Data Centre",
        "parent_company": "CapitaLand Investment",
        "headquarters": "Singapore",
        "website": "https://www.capitaland.com",
        "employee_count": None,
        "total_investment_usd": 1_500_000_000,
        "annual_revenue_usd": None,
        "sustainability_rating": "BCA Green Mark Certified",
    },
    {
        "name": "Iron Mountain Data Centers",
        "parent_company": "Iron Mountain Inc",
        "headquarters": "Boston, Massachusetts, USA",
        "website": "https://www.ironmountain.com/data-centers",
        "employee_count": None,
        "total_investment_usd": None,
        "annual_revenue_usd": None,
        "sustainability_rating": "RE100 — 100% Renewable by 2025",
    },
    {
        "name": "L&T Cloudfiniti",
        "parent_company": "Larsen & Toubro",
        "headquarters": "Mumbai, Maharashtra",
        "website": "https://www.ltts.com",
        "employee_count": None,
        "total_investment_usd": None,
        "annual_revenue_usd": None,
        "sustainability_rating": "ISO 27001 Certified",
    },
    {
        "name": "Anant Raj Cloud",
        "parent_company": "Anant Raj Ltd",
        "headquarters": "New Delhi, Delhi",
        "website": "https://www.anantraj.com",
        "employee_count": None,
        "total_investment_usd": None,
        "annual_revenue_usd": None,
        "sustainability_rating": "Tier III",
    },
    {
        "name": "Pi Datacenters",
        "parent_company": None,
        "headquarters": "Amaravati, Andhra Pradesh",
        "website": "https://www.pidatacenters.com",
        "employee_count": None,
        "total_investment_usd": None,
        "annual_revenue_usd": None,
        "sustainability_rating": "Tier IV Certified",
    },
    {
        "name": "ESDS Software Solution Pvt. Ltd.",
        "parent_company": None,
        "headquarters": "Nashik, Maharashtra",
        "website": "https://www.esds.co.in",
        "employee_count": None,
        "total_investment_usd": None,
        "annual_revenue_usd": None,
        "sustainability_rating": "ISO 27001",
    },
    {
        "name": "Rackbank Datacenters Pvt. Ltd.",
        "parent_company": None,
        "headquarters": "Indore, Madhya Pradesh",
        "website": "https://www.rackbank.com",
        "employee_count": None,
        "total_investment_usd": None,
        "annual_revenue_usd": None,
        "sustainability_rating": "Tier III",
    },
    {
        "name": "BSNL IDC",
        "parent_company": "BSNL",
        "headquarters": "New Delhi, Delhi",
        "website": "https://www.bsnl.in",
        "employee_count": None,
        "total_investment_usd": None,
        "annual_revenue_usd": None,
        "sustainability_rating": "Government Operated",
    },
    {
        "name": "RailTel Corporation of India Ltd.",
        "parent_company": "Indian Railways (Ministry of Railways)",
        "headquarters": "New Delhi, Delhi",
        "website": "https://www.railtelindia.com",
        "employee_count": None,
        "total_investment_usd": None,
        "annual_revenue_usd": None,
        "sustainability_rating": "Government Operated",
    },
]

# Fields to check and update
_UPDATABLE_FIELDS = [
    "parent_company",
    "headquarters",
    "website",
    "employee_count",
    "total_investment_usd",
    "annual_revenue_usd",
    "sustainability_rating",
]


async def enrich_company_profiles(apply: bool = False) -> None:
    """
    Match companies by name and update enrichment fields.

    Args:
        apply: When False (default), prints what would change without writing.
               When True, executes UPDATE statements.
    """
    async with async_session_factory() as session:
        updated_count = 0
        skipped_count = 0
        not_found_count = 0

        for entry in ENRICHMENTS:
            name = entry["name"]

            # Exact match first
            result = await session.execute(
                select(DataCenterCompany).where(DataCenterCompany.name == name)
            )
            company = result.scalar_one_or_none()

            if company is None:
                # Fallback: case-insensitive partial match
                result_ilike = await session.execute(
                    select(DataCenterCompany).where(
                        DataCenterCompany.name.ilike(f"%{name}%")
                    )
                )
                candidates = list(result_ilike.scalars().all())
                if candidates:
                    print(
                        f"  [WARN] '{name}' not found exactly — "
                        f"candidates: {[c.name for c in candidates]}"
                    )
                else:
                    print(f"  [NOT FOUND] '{name}' — no match in database")
                not_found_count += 1
                continue

            # Determine fields that need updating
            updates: dict[str, object] = {}
            for field in _UPDATABLE_FIELDS:
                new_val = entry.get(field)
                current_val = getattr(company, field, None)
                if new_val is not None and new_val != current_val:
                    updates[field] = new_val

            if not updates:
                print(f"  [SKIP] '{name}' — already up to date")
                skipped_count += 1
                continue

            mode = "APPLY" if apply else "DRY-RUN"
            print(f"  [{mode}] '{name}' — updating: {list(updates.keys())}")

            if apply:
                await session.execute(
                    update(DataCenterCompany)
                    .where(DataCenterCompany.id == company.id)
                    .values(**updates)
                )
                updated_count += 1
            else:
                updated_count += 1

        if apply:
            await session.commit()
            print(
                f"\nDone: {updated_count} updated, "
                f"{skipped_count} skipped, {not_found_count} not found."
            )
        else:
            print(
                f"\nDry-run: {updated_count} would update, "
                f"{skipped_count} already current, {not_found_count} not found. "
                f"Pass --apply to write changes."
            )


def main() -> None:
    apply = "--apply" in sys.argv
    asyncio.run(enrich_company_profiles(apply=apply))


if __name__ == "__main__":
    main()
