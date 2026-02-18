"""News scraping service for India-focused renewable energy and data center news."""

from __future__ import annotations

import logging
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from uuid import UUID

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domains.alerts.models.alerts import NewsArticle

logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────────────────────────────────────
# Indian state name detection helpers
# ─────────────────────────────────────────────────────────────────────────────

INDIA_STATES = [
    "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
    "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka",
    "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram",
    "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu",
    "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
    "Delhi", "Jammu and Kashmir", "Ladakh", "Puducherry", "Chandigarh",
    "Andaman and Nicobar", "Lakshadweep", "Dadra and Nagar Haveli",
]

STATE_ALIASES: dict[str, str] = {
    "AP": "Andhra Pradesh",
    "TN": "Tamil Nadu",
    "MH": "Maharashtra",
    "RJ": "Rajasthan",
    "UP": "Uttar Pradesh",
    "MP": "Madhya Pradesh",
    "KA": "Karnataka",
    "GJ": "Gujarat",
    "HP": "Himachal Pradesh",
    "JH": "Jharkhand",
    "WB": "West Bengal",
    "Orissa": "Odisha",
    "J&K": "Jammu and Kashmir",
    "J and K": "Jammu and Kashmir",
}


def detect_state(text: str) -> str | None:
    """Return the first Indian state name found in *text* (case-insensitive)."""
    text_lower = text.lower()
    for state in INDIA_STATES:
        if state.lower() in text_lower:
            return state
    for alias, canonical in STATE_ALIASES.items():
        if alias.lower() in text_lower:
            return canonical
    return None


# ─────────────────────────────────────────────────────────────────────────────
# Category detection
# ─────────────────────────────────────────────────────────────────────────────

CATEGORY_KEYWORDS: dict[str, list[str]] = {
    "data_center": [
        "data center", "data centre", "hyperscale", "colocation", "server farm",
        "cloud infrastructure", "edge computing", "data park",
    ],
    "solar": [
        "solar", "photovoltaic", "pv", "rooftop solar", "solar park",
        "solar farm", "solar energy",
    ],
    "wind": [
        "wind energy", "wind power", "wind farm", "offshore wind",
        "onshore wind", "wind turbine",
    ],
    "policy": [
        "policy", "regulation", "mnre", "cerc", "serc", "seci", "mop",
        "guideline", "tender", "tariff", "subsidy", "incentive", "notification",
        "amendment", "act", "order", "gazette",
    ],
    "renewable_energy": [
        "renewable", "green energy", "clean energy", "energy transition",
        "net zero", "carbon neutral", "energy storage", "battery storage",
        "pumped hydro", "green hydrogen", "biomass", "hydro power",
    ],
}


def detect_category(title: str, summary: str | None) -> str:
    combined = (title + " " + (summary or "")).lower()
    for category, keywords in CATEGORY_KEYWORDS.items():
        if any(kw in combined for kw in keywords):
            return category
    return "renewable_energy"


# ─────────────────────────────────────────────────────────────────────────────
# RSS feed sources (India-focused)
# ─────────────────────────────────────────────────────────────────────────────

RSS_SOURCES = [
    {
        "url": "https://economictimes.indiatimes.com/industry/energy/power/rssfeeds/13358489.cms",
        "source": "Economic Times - Power",
    },
    {
        "url": "https://economictimes.indiatimes.com/industry/renewables/rssfeeds/20277676.cms",
        "source": "Economic Times - Renewables",
    },
    {
        "url": "https://mercomindia.com/feed/",
        "source": "Mercom India",
    },
    {
        "url": "https://www.thehindubusinessline.com/economy/agri-business/rss?id=423",
        "source": "BusinessLine",
    },
    {
        "url": "https://solarquarter.com/feed/",
        "source": "Solar Quarter",
    },
    {
        "url": "https://www.datacenterdynamics.com/en/rss/",
        "source": "Data Center Dynamics",
    },
    {
        "url": "https://www.livemint.com/rss/economy",
        "source": "Livemint Economy",
    },
    {
        "url": "https://pib.gov.in/RssMain.aspx?ModId=6&Lang=1&Regid=3",
        "source": "PIB India - Renewable Energy",
    },
]

INDIA_KEYWORDS = [
    "india", "indian", "mnre", "seci", "cerc", "serc", "ntpc",
    "adani", "tata power", "greenko", "renew power", "avaada",
]


def _is_india_relevant(title: str, summary: str | None) -> bool:
    combined = (title + " " + (summary or "")).lower()
    return any(kw in combined for kw in INDIA_KEYWORDS)


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


def _parse_rss_feed(xml_text: str, source_name: str) -> list[dict]:
    """Parse an RSS 2.0 XML string and return a list of article dicts."""
    articles: list[dict] = []
    try:
        root = ET.fromstring(xml_text)
    except ET.ParseError as exc:
        logger.warning("RSS parse error for %s: %s", source_name, exc)
        return articles

    # Handle both RSS 2.0 and Atom feeds
    ns = {"atom": "http://www.w3.org/2005/Atom"}

    # RSS 2.0
    for item in root.iter("item"):
        title_el = item.find("title")
        link_el = item.find("link")
        desc_el = item.find("description")
        date_el = item.find("pubDate")
        image_el = item.find("enclosure")

        title = (title_el.text or "").strip() if title_el is not None else ""
        url = (link_el.text or "").strip() if link_el is not None else ""
        summary = (desc_el.text or "").strip() if desc_el is not None else None
        # Strip HTML tags from summary (basic)
        if summary:
            import re
            summary = re.sub(r"<[^>]+>", "", summary).strip()[:500]
        pub_date = _parse_rfc822_date(date_el.text if date_el is not None else None)
        image_url = image_el.get("url") if image_el is not None else None

        if title and url:
            articles.append(
                {
                    "title": title[:1000],
                    "url": url[:2000],
                    "source": source_name,
                    "summary": summary,
                    "image_url": image_url,
                    "published_at": pub_date,
                }
            )

    # Atom feeds
    if not articles:
        for entry in root.iter("{http://www.w3.org/2005/Atom}entry"):
            title_el = entry.find("{http://www.w3.org/2005/Atom}title")
            link_el = entry.find("{http://www.w3.org/2005/Atom}link")
            summary_el = entry.find("{http://www.w3.org/2005/Atom}summary")
            date_el = entry.find("{http://www.w3.org/2005/Atom}published")

            title = (title_el.text or "").strip() if title_el is not None else ""
            url = link_el.get("href", "") if link_el is not None else ""
            summary = (summary_el.text or "").strip() if summary_el is not None else None
            if summary:
                import re
                summary = re.sub(r"<[^>]+>", "", summary).strip()[:500]
            pub_date = _parse_rfc822_date(date_el.text if date_el is not None else None)

            if title and url:
                articles.append(
                    {
                        "title": title[:1000],
                        "url": url[:2000],
                        "source": source_name,
                        "summary": summary,
                        "image_url": None,
                        "published_at": pub_date,
                    }
                )

    return articles


# ─────────────────────────────────────────────────────────────────────────────
# Service class
# ─────────────────────────────────────────────────────────────────────────────


class NewsService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def list_news(
        self,
        category: str | None = None,
        state: str | None = None,
        source: str | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> list[NewsArticle]:
        query = (
            select(NewsArticle)
            .where(NewsArticle.is_active.is_(True))
            .order_by(NewsArticle.published_at.desc().nullslast(), NewsArticle.scraped_at.desc())
        )
        if category:
            query = query.where(NewsArticle.category == category)
        if state:
            query = query.where(NewsArticle.state == state)
        if source:
            query = query.where(NewsArticle.source == source)
        query = query.offset(offset).limit(limit)
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def get_available_states(self) -> list[str]:
        from sqlalchemy import distinct
        result = await self.db.execute(
            select(distinct(NewsArticle.state))
            .where(NewsArticle.state.isnot(None), NewsArticle.is_active.is_(True))
            .order_by(NewsArticle.state)
        )
        return [row for row in result.scalars().all() if row]

    async def get_available_sources(self) -> list[str]:
        from sqlalchemy import distinct
        result = await self.db.execute(
            select(distinct(NewsArticle.source))
            .where(NewsArticle.is_active.is_(True))
            .order_by(NewsArticle.source)
        )
        return list(result.scalars().all())

    async def scrape_and_store(self) -> dict[str, int]:
        """Fetch RSS feeds and upsert new articles. Returns counts."""
        new_count = 0
        skipped = 0

        async with httpx.AsyncClient(timeout=15.0, follow_redirects=True) as client:
            for feed in RSS_SOURCES:
                try:
                    response = await client.get(feed["url"])
                    response.raise_for_status()
                    raw_articles = _parse_rss_feed(response.text, feed["source"])
                except Exception as exc:
                    logger.warning("Failed to fetch %s: %s", feed["url"], exc)
                    continue

                for art in raw_articles:
                    # Only store India-relevant articles
                    if not _is_india_relevant(art["title"], art["summary"]):
                        skipped += 1
                        continue

                    # Check deduplication by URL
                    existing = await self.db.execute(
                        select(NewsArticle).where(NewsArticle.url == art["url"])
                    )
                    if existing.scalar_one_or_none():
                        skipped += 1
                        continue

                    category = detect_category(art["title"], art["summary"])
                    state = detect_state(art["title"] + " " + (art["summary"] or ""))

                    article = NewsArticle(
                        title=art["title"],
                        url=art["url"],
                        source=art["source"],
                        category=category,
                        state=state,
                        summary=art["summary"],
                        image_url=art["image_url"],
                        published_at=art["published_at"],
                    )
                    self.db.add(article)
                    new_count += 1

        await self.db.commit()
        logger.info("News scrape complete: %d new, %d skipped", new_count, skipped)
        return {"new": new_count, "skipped": skipped}
