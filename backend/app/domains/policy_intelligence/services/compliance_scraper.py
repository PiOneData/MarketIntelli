"""Compliance alert scraper — fetches real regulatory notices from MNRE, MoP Gazette,
CERC/SERC orders via RSS feeds and stores them as compliance alerts.

Sources (India-only):
- PIB India (Press Information Bureau): covers MNRE Notifications
  https://pib.gov.in/RssMain.aspx?ModId=6&Lang=1&Regid=3
- PIB India: covers Ministry of Power Gazette
  https://pib.gov.in/RssMain.aspx?ModId=6&Lang=1&Regid=33
- Mercom India: covers CERC/SERC regulatory orders for Indian power sector
  https://mercomindia.com/feed/
- Solar Quarter India Policy & Regulation section
  https://solarquarter.com/feed/
- Economic Times India Energy/Power
  https://economictimes.indiatimes.com/industry/energy/power/rssfeeds/13358489.cms

All content is filtered for India-specific regulatory relevance before storage.
Scheduled to run twice daily (every 12 hours).
"""

from __future__ import annotations

import logging
import re
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from uuid import uuid4

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domains.policy_intelligence.models.policy import ComplianceAlert

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# RSS sources specifically for regulatory / compliance content
# ---------------------------------------------------------------------------

COMPLIANCE_RSS_SOURCES = [
    {
        "url": "https://pib.gov.in/RssMain.aspx?ModId=6&Lang=1&Regid=3",
        "source": "PIB India – MNRE Notifications",
        "data_source_label": "MNRE Notifications",
        "base_url": "https://pib.gov.in",
    },
    {
        "url": "https://pib.gov.in/RssMain.aspx?ModId=6&Lang=1&Regid=33",
        "source": "PIB India – MoP Gazette",
        "data_source_label": "MoP Gazette",
        "base_url": "https://pib.gov.in",
    },
    {
        "url": "https://mercomindia.com/feed/",
        "source": "Mercom India – CERC/SERC Orders",
        "data_source_label": "CERC/SERC Orders",
        "base_url": "https://mercomindia.com",
    },
    {
        "url": "https://solarquarter.com/feed/",
        "source": "Solar Quarter – India RE Regulations",
        "data_source_label": "Solar Quarter India",
        "base_url": "https://solarquarter.com",
    },
    {
        "url": "https://economictimes.indiatimes.com/industry/energy/power/rssfeeds/13358489.cms",
        "source": "Economic Times – India Energy Policy",
        "data_source_label": "ET Energy India",
        "base_url": "https://economictimes.indiatimes.com",
    },
]

# Keywords indicating compliance-relevant content for India's power/RE sector
COMPLIANCE_KEYWORDS = [
    "regulation", "regulatory", "notification", "gazette", "amendment",
    "cerc", "serc", "mnre", "mop", "tariff order", "compliance",
    "deadline", "penalty", "enforcement", "rpo", "renewable purchase",
    "open access", "grid code", "order", "directive", "circular",
    "ministry of power", "ministry of new", "renewable energy",
    "electricity act", "electricity rules", "approval", "clearance",
]

# Keywords that confirm India-specific content — at least one must be present
INDIA_KEYWORDS = [
    "india", "indian", "mnre", "cerc", "serc", "mop", "ministry of power",
    "ministry of new and renewable energy", "seci", "ntpc", "ireda", "discoms",
    "discom", "electricity act", "central electricity", "state electricity",
    "rajasthan", "gujarat", "karnataka", "maharashtra", "tamil nadu",
    "andhra pradesh", "telangana", "madhya pradesh", "uttar pradesh",
    "odisha", "haryana", "punjab", "chhattisgarh", "jharkhand", "bihar",
    "renewable purchase obligation", "pm-kusum", "pm surya ghar",
    "national solar mission", "green hydrogen mission", "bess",
    "solar energy corporation", "power finance corporation",
    "rural electrification", "pfc", "rec ltd", "iex", "energy exchange",
]


def _is_compliance_relevant(title: str, summary: str | None) -> bool:
    combined = (title + " " + (summary or "")).lower()
    return any(kw in combined for kw in COMPLIANCE_KEYWORDS)


def _is_india_specific(title: str, summary: str | None) -> bool:
    """Return True only if the article is clearly about India's energy/power sector."""
    combined = (title + " " + (summary or "")).lower()
    return any(kw in combined for kw in INDIA_KEYWORDS)


def _detect_compliance_category(title: str, summary: str | None) -> str:
    combined = (title + " " + (summary or "")).lower()
    if any(kw in combined for kw in ["amendment", "amend", "revised", "revision"]):
        return "amendment"
    if any(kw in combined for kw in ["deadline", "due date", "expires", "schedule", "timeline"]):
        return "deadline"
    if any(kw in combined for kw in ["tariff", "rate", "price", "auction", "bid"]):
        return "tariff_order"
    if any(kw in combined for kw in ["notification", "gazette", "notify", "notified"]):
        return "notification"
    if any(kw in combined for kw in ["order", "directive", "circular", "ruling"]):
        return "regulatory_order"
    return "regulation"


def _detect_authority(title: str, summary: str | None, source: str) -> str:
    combined = (title + " " + (summary or "")).lower()
    if "cerc" in combined:
        return "CERC"
    if "serc" in combined or "state electricity" in combined:
        return "SERC"
    if "mnre" in combined or "ministry of new and renewable" in combined:
        return "MNRE"
    if "mop" in combined or "ministry of power" in combined:
        return "MoP"
    if "seci" in combined or "solar energy corporation" in combined:
        return "SECI"
    if "moef" in combined or "ministry of environment" in combined:
        return "MoEFCC"
    if "ireda" in combined:
        return "IREDA"
    if "pib" in source.lower() and "mnre" in source.lower():
        return "MNRE"
    if "pib" in source.lower() and "mop" in source.lower():
        return "MoP"
    if "pib" in source.lower():
        return "MNRE/MoP"
    if "mercom" in source.lower() or "solar quarter" in source.lower():
        return "CERC/SERC"
    if "economic times" in source.lower():
        return "MNRE/MoP"
    return "MNRE"


def _parse_rfc822_date(date_str: str | None) -> datetime | None:
    if not date_str:
        return None
    try:
        return parsedate_to_datetime(date_str)
    except Exception:
        try:
            return datetime.fromisoformat(date_str.replace("Z", "+00:00"))
        except Exception:
            return None


def _strip_html(text: str) -> str:
    return re.sub(r"<[^>]+>", "", text).strip()


def _parse_feed(xml_text: str, source_name: str, data_source_label: str) -> list[dict]:
    articles: list[dict] = []
    try:
        root = ET.fromstring(xml_text)
    except ET.ParseError as exc:
        logger.warning("RSS parse error for %s: %s", source_name, exc)
        return articles

    # RSS 2.0
    for item in root.iter("item"):
        title_el = item.find("title")
        link_el = item.find("link")
        desc_el = item.find("description")
        date_el = item.find("pubDate")

        title = (title_el.text or "").strip() if title_el is not None else ""
        url = (link_el.text or "").strip() if link_el is not None else ""
        summary_raw = (desc_el.text or "").strip() if desc_el is not None else None
        summary = _strip_html(summary_raw)[:600] if summary_raw else None
        pub_date = _parse_rfc822_date(date_el.text if date_el is not None else None)

        if (title and url
                and _is_compliance_relevant(title, summary)
                and _is_india_specific(title, summary)):
            articles.append({
                "title": title[:500],
                "url": url[:2000],
                "source": source_name,
                "data_source_label": data_source_label,
                "summary": summary,
                "published_at": pub_date,
            })

    # Atom feeds
    if not articles:
        for entry in root.iter("{http://www.w3.org/2005/Atom}entry"):
            title_el = entry.find("{http://www.w3.org/2005/Atom}title")
            link_el = entry.find("{http://www.w3.org/2005/Atom}link")
            summary_el = entry.find("{http://www.w3.org/2005/Atom}summary")
            date_el = entry.find("{http://www.w3.org/2005/Atom}published")

            title = (title_el.text or "").strip() if title_el is not None else ""
            url = link_el.get("href", "") if link_el is not None else ""
            summary_raw = (summary_el.text or "").strip() if summary_el is not None else None
            summary = _strip_html(summary_raw)[:600] if summary_raw else None
            pub_date = _parse_rfc822_date(date_el.text if date_el is not None else None)

            if (title and url
                    and _is_compliance_relevant(title, summary)
                    and _is_india_specific(title, summary)):
                articles.append({
                    "title": title[:500],
                    "url": url[:2000],
                    "source": source_name,
                    "data_source_label": data_source_label,
                    "summary": summary,
                    "published_at": pub_date,
                })

    return articles


class ComplianceScraperService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def scrape_and_store(self) -> dict[str, int]:
        """Fetch compliance RSS feeds and upsert new compliance alerts."""
        new_count = 0
        skipped = 0

        async with httpx.AsyncClient(timeout=20.0, follow_redirects=True) as client:
            for feed in COMPLIANCE_RSS_SOURCES:
                try:
                    response = await client.get(feed["url"])
                    response.raise_for_status()
                    raw_items = _parse_feed(
                        response.text,
                        feed["source"],
                        feed["data_source_label"],
                    )
                except Exception as exc:
                    logger.warning(
                        "Failed to fetch compliance feed %s: %s", feed["url"], exc
                    )
                    continue

                for item in raw_items:
                    # Deduplicate by URL
                    existing = await self.db.execute(
                        select(ComplianceAlert).where(ComplianceAlert.source_url == item["url"])
                    )
                    if existing.scalar_one_or_none():
                        skipped += 1
                        continue

                    category = _detect_compliance_category(item["title"], item["summary"])
                    authority = _detect_authority(
                        item["title"], item["summary"], item["source"]
                    )

                    alert = ComplianceAlert(
                        title=item["title"],
                        authority=authority,
                        data_source=item["data_source_label"],
                        source_name=item["source"],
                        source_url=item["url"],
                        category=category,
                        summary=item["summary"],
                        published_at=item["published_at"],
                    )
                    self.db.add(alert)
                    new_count += 1

        await self.db.commit()
        logger.info(
            "Compliance scrape complete: %d new alerts, %d skipped", new_count, skipped
        )
        return {"new": new_count, "skipped": skipped}

    async def list_compliance_alerts(
        self,
        authority: str | None = None,
        category: str | None = None,
        limit: int = 100,
    ) -> list[ComplianceAlert]:
        query = (
            select(ComplianceAlert)
            .where(ComplianceAlert.is_active.is_(True))
            .order_by(
                ComplianceAlert.published_at.desc().nullslast(),
                ComplianceAlert.scraped_at.desc(),
            )
        )
        if authority:
            query = query.where(ComplianceAlert.authority == authority)
        if category:
            query = query.where(ComplianceAlert.category == category)
        query = query.limit(limit)
        result = await self.db.execute(query)
        return list(result.scalars().all())
