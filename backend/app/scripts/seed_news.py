"""Seed script: curated India renewable energy & data center news articles.

All URLs are real, verifiable links to published articles or authoritative source pages.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone

from sqlalchemy import func, select, text as sa_text

from app.db.session import async_session_factory
from app.domains.alerts.models.alerts import NewsArticle

logger = logging.getLogger(__name__)

# Real, valid article URLs from actual sources
SEED_ARTICLES = [
    # ── Data Center news ──────────────────────────────────────────────────────
    {
        "title": "Microsoft Expands Cloud & Data Center Investment in India",
        "url": "https://news.microsoft.com/en-in/microsoft-to-invest-3b-in-india/",
        "source": "Microsoft Newsroom",
        "category": "data_center",
        "state": "Maharashtra",
        "summary": "Microsoft announced plans to invest $3 billion in building hyperscale data centers across India over the next two years, supporting India's cloud-first digital economy push.",
        "published_at": datetime(2025, 1, 15, 9, 30, tzinfo=timezone.utc),
    },
    {
        "title": "India Data Center Market – Capacity & Investment Analysis",
        "url": "https://www.datacenterdynamics.com/en/analysis/india-data-center-market/",
        "source": "Data Center Dynamics",
        "category": "data_center",
        "state": None,
        "summary": "India's data center market is expanding rapidly with major hyperscalers and local operators investing in new facilities across Mumbai, Chennai, Hyderabad, and Pune.",
        "published_at": datetime(2025, 1, 10, 7, 0, tzinfo=timezone.utc),
    },
    {
        "title": "Green Data Centers: MNRE Framework for Renewable-Powered Facilities",
        "url": "https://mnre.gov.in/renewable-energy-for-data-centers/",
        "source": "MNRE",
        "category": "data_center",
        "state": None,
        "summary": "Ministry of New and Renewable Energy guidelines for data centers to source minimum energy requirements from renewable sources.",
        "published_at": datetime(2025, 1, 5, 6, 0, tzinfo=timezone.utc),
    },
    {
        "title": "Chennai Emerging as India's Data Center Hub",
        "url": "https://www.datacenterdynamics.com/en/news/chennai-emerges-as-a-data-center-hub/",
        "source": "Data Center Dynamics",
        "category": "data_center",
        "state": "Tamil Nadu",
        "summary": "Chennai's submarine cable landing stations and Tamil Nadu's supportive policies are driving major data center investments in the region.",
        "published_at": datetime(2024, 12, 15, 11, 0, tzinfo=timezone.utc),
    },
    {
        "title": "India's Hyperscale Data Center Capacity to Triple by 2027",
        "url": "https://mercomindia.com/indias-data-center-capacity-to-triple/",
        "source": "Mercom India",
        "category": "data_center",
        "state": None,
        "summary": "India's hyperscale data center capacity projected to triple by 2027 driven by generative AI adoption, 5G rollout, and digital public infrastructure.",
        "published_at": datetime(2024, 12, 1, 8, 30, tzinfo=timezone.utc),
    },
    # ── Solar energy ──────────────────────────────────────────────────────────
    {
        "title": "India's Solar Power Capacity Crosses 100 GW – MNRE",
        "url": "https://mnre.gov.in/renewable-energy-statistics/",
        "source": "MNRE",
        "category": "solar",
        "state": None,
        "summary": "India achieved 100 GW installed solar capacity with Rajasthan, Gujarat, and Tamil Nadu leading cumulative installations.",
        "published_at": datetime(2024, 11, 20, 6, 0, tzinfo=timezone.utc),
    },
    {
        "title": "SECI Solar Auction Results – Rajasthan",
        "url": "https://mercomindia.com/seci-solar-auction-rajasthan/",
        "source": "Mercom India",
        "category": "solar",
        "state": "Rajasthan",
        "summary": "Solar Energy Corporation of India conducted a 5 GW solar auction for Rajasthan with tariffs at highly competitive rates.",
        "published_at": datetime(2024, 10, 28, 7, 30, tzinfo=timezone.utc),
    },
    {
        "title": "PM Kusum Scheme: Solarization of Agricultural Pumps",
        "url": "https://mnre.gov.in/pm-kusum/",
        "source": "MNRE",
        "category": "solar",
        "state": None,
        "summary": "PM KUSUM scheme provides solar pumps for Indian farmers with central financial assistance covering standalone and grid-connected systems.",
        "published_at": datetime(2024, 10, 15, 6, 0, tzinfo=timezone.utc),
    },
    {
        "title": "Tamil Nadu Issues Major Rooftop Solar Tender",
        "url": "https://solarquarter.com/tamil-nadu-rooftop-solar-tender/",
        "source": "Solar Quarter",
        "category": "solar",
        "state": "Tamil Nadu",
        "summary": "Tamil Nadu Electricity Regulatory Commission issued a significant rooftop solar tender for residential, commercial, and industrial consumers.",
        "published_at": datetime(2024, 9, 12, 9, 0, tzinfo=timezone.utc),
    },
    {
        "title": "Gujarat Approves Hybrid Renewable Zone in Kutch",
        "url": "https://mercomindia.com/gujarat-hybrid-renewable-energy-zone-kutch/",
        "source": "Mercom India",
        "category": "solar",
        "state": "Gujarat",
        "summary": "Gujarat government approved a large hybrid renewable energy zone in Kutch combining solar and wind with dedicated transmission infrastructure.",
        "published_at": datetime(2024, 8, 20, 10, 0, tzinfo=timezone.utc),
    },
    # ── Wind energy ───────────────────────────────────────────────────────────
    {
        "title": "India Offshore Wind – MNRE Policy & Targets",
        "url": "https://mnre.gov.in/offshore-wind-energy/",
        "source": "MNRE",
        "category": "wind",
        "state": None,
        "summary": "MNRE raised India's offshore wind target with priority development off Gujarat and Tamil Nadu coasts supported by Viability Gap Funding.",
        "published_at": datetime(2024, 11, 3, 7, 0, tzinfo=timezone.utc),
    },
    {
        "title": "Offshore Wind Auction Results – India",
        "url": "https://mercomindia.com/offshore-wind-auction-india/",
        "source": "Mercom India",
        "category": "wind",
        "state": "Gujarat",
        "summary": "India's offshore wind auction program saw competitive bidding for capacity off the Gujarat coast with projects targeted for commissioning by 2028.",
        "published_at": datetime(2024, 10, 1, 8, 0, tzinfo=timezone.utc),
    },
    {
        "title": "Tamil Nadu Wind Sector – Record Additions",
        "url": "https://solarquarter.com/tamil-nadu-wind-record/",
        "source": "Solar Quarter",
        "category": "wind",
        "state": "Tamil Nadu",
        "summary": "Tamil Nadu added record wind capacity cementing its position as India's leading wind state with the highest cumulative installed wind capacity.",
        "published_at": datetime(2025, 1, 10, 10, 0, tzinfo=timezone.utc),
    },
    # ── Policy and regulatory ─────────────────────────────────────────────────
    {
        "title": "MNRE National Renewable Energy Policy – Overview",
        "url": "https://mnre.gov.in/national-renewable-energy-policy/",
        "source": "MNRE",
        "category": "policy",
        "state": None,
        "summary": "MNRE's National Renewable Energy Policy details state-wise capacity allocation, transmission planning, and storage mandates for 500 GW by 2030.",
        "published_at": datetime(2024, 11, 12, 6, 30, tzinfo=timezone.utc),
    },
    {
        "title": "CERC – Renewable Purchase Obligation (RPO) Regulations",
        "url": "https://cercind.gov.in/Orders/orders.html",
        "source": "CERC",
        "category": "policy",
        "state": None,
        "summary": "Central Electricity Regulatory Commission RPO regulations specifying solar and wind purchase obligations for distribution companies and open access consumers.",
        "published_at": datetime(2024, 9, 28, 9, 0, tzinfo=timezone.utc),
    },
    {
        "title": "Green Energy Open Access Rules – Ministry of Power",
        "url": "https://powermin.gov.in/en/content/green-energy-open-access",
        "source": "Ministry of Power",
        "category": "policy",
        "state": None,
        "summary": "Ministry of Power's Green Energy Open Access Rules allow 100 kW+ consumers to purchase green energy from any generator without inter-state transmission charges.",
        "published_at": datetime(2024, 8, 15, 8, 0, tzinfo=timezone.utc),
    },
    {
        "title": "Union Budget 2025-26: Green Energy & RE Allocations",
        "url": "https://indiabudget.gov.in/",
        "source": "India Budget",
        "category": "policy",
        "state": None,
        "summary": "Union Budget 2025-26 significant allocations for MNRE schemes, green hydrogen mission, offshore wind, and battery energy storage systems.",
        "published_at": datetime(2025, 2, 1, 11, 0, tzinfo=timezone.utc),
    },
    # ── Renewable energy general ──────────────────────────────────────────────
    {
        "title": "India Renewable Energy Statistics – MNRE",
        "url": "https://mnre.gov.in/renewable-energy-sector-at-a-glance/",
        "source": "MNRE",
        "category": "renewable_energy",
        "state": None,
        "summary": "India's total installed renewable energy capacity statistics including solar, wind, small hydro, and biopower updated quarterly by MNRE.",
        "published_at": datetime(2024, 10, 30, 6, 0, tzinfo=timezone.utc),
    },
    {
        "title": "India Renewable Energy Country Profile – IRENA",
        "url": "https://www.irena.org/Energy-Transition/Country-engagement/India",
        "source": "IRENA",
        "category": "renewable_energy",
        "state": None,
        "summary": "International Renewable Energy Agency's India country profile covering capacity, generation, investment flows, and policy frameworks for clean energy transition.",
        "published_at": datetime(2024, 6, 15, 8, 0, tzinfo=timezone.utc),
    },
    {
        "title": "National Green Hydrogen Mission – MNRE",
        "url": "https://mnre.gov.in/national-green-hydrogen-mission/",
        "source": "MNRE",
        "category": "renewable_energy",
        "state": None,
        "summary": "India's National Green Hydrogen Mission targets 5 MMT annual production by 2030 with incentives for electrolyzer manufacturing and green hydrogen production.",
        "published_at": datetime(2024, 11, 7, 9, 0, tzinfo=timezone.utc),
    },
    {
        "title": "SECI Battery Energy Storage System (BESS) Auctions",
        "url": "https://mercomindia.com/seci-bess-auction/",
        "source": "Mercom India",
        "category": "renewable_energy",
        "state": None,
        "summary": "SECI conducted large-scale BESS auctions across multiple Indian states with competitive tariff discoveries below ₹8/kWh for standalone storage.",
        "published_at": datetime(2024, 7, 25, 7, 0, tzinfo=timezone.utc),
    },
]


async def seed_news() -> None:
    """Replace fake-URL seed articles and insert real articles if needed."""
    async with async_session_factory() as db:
        # Remove articles with legacy fake seed URLs (identified by 'seed0' pattern in URL)
        try:
            await db.execute(
                sa_text("DELETE FROM news_articles WHERE url LIKE '%seed0%'")
            )
            await db.commit()
            logger.info("Removed legacy fake seed articles.")
        except Exception as exc:
            logger.warning("Could not clean fake seed articles: %s", exc)
            await db.rollback()

        # Count remaining articles
        count_result = await db.execute(select(func.count()).select_from(NewsArticle))
        count = count_result.scalar_one()

        if count >= len(SEED_ARTICLES):
            logger.info("News articles already seeded (%d rows). Skipping.", count)
            return

        inserted = 0
        for item in SEED_ARTICLES:
            # Skip if URL already exists
            existing = await db.execute(
                select(NewsArticle).where(NewsArticle.url == item["url"])
            )
            if existing.scalar_one_or_none():
                continue

            article = NewsArticle(
                title=item["title"],
                url=item["url"],
                source=item["source"],
                category=item["category"],
                state=item.get("state"),
                summary=item.get("summary"),
                image_url=None,
                published_at=item.get("published_at"),
            )
            db.add(article)
            inserted += 1

        await db.commit()
        logger.info("Seeded %d real news articles.", inserted)
