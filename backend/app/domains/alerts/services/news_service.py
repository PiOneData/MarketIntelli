"""News scraping service for India-focused renewable energy and data center news.

AI enrichment added:
- Article enrichment: 2-sentence summary, market impact score (0-10), affected states/companies
- Daily Market Brief: executive synthesis of top-10 news items
- Trend Detection: emerging themes across last 7 days
"""

from __future__ import annotations

import json
import logging
import re
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta, timezone
from email.utils import parsedate_to_datetime
from uuid import UUID

import httpx
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
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
# AI enrichment helpers
# ─────────────────────────────────────────────────────────────────────────────

async def _call_llm(prompt: str, max_tokens: int = 400) -> str:
    """Call Azure OpenAI if configured, else Ollama."""
    if settings.AZURE_OPENAI_API_KEY and settings.AZURE_OPENAI_ENDPOINT:
        try:
            import openai  # lazy import
            client = openai.AsyncAzureOpenAI(
                api_key=settings.AZURE_OPENAI_API_KEY,
                azure_endpoint=settings.AZURE_OPENAI_ENDPOINT,
                api_version=settings.AZURE_OPENAI_API_VERSION,
            )
            resp = await client.chat.completions.create(
                model=settings.AZURE_OPENAI_DEPLOYMENT,
                messages=[
                    {"role": "system", "content": "You are a market intelligence analyst for India's renewable energy sector. Respond only with valid JSON."},
                    {"role": "user", "content": prompt},
                ],
                temperature=0.1,
                max_tokens=max_tokens,
            )
            return resp.choices[0].message.content or ""
        except Exception as exc:
            logger.debug("Azure OpenAI news enrichment failed: %s", exc)
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(
                f"{settings.OLLAMA_URL}/api/generate",
                json={"model": settings.OLLAMA_MODEL, "prompt": prompt, "stream": False, "options": {"temperature": 0.1}},
            )
            resp.raise_for_status()
            return resp.json().get("response", "")
    except Exception as exc:
        logger.debug("Ollama news enrichment failed: %s", exc)
    return ""


async def _enrich_article(title: str, summary: str | None) -> dict:
    """AI-enrich a news article: 2-sentence summary, market impact, states, companies."""
    text = f"Title: {title}\nSummary: {summary or 'No summary available'}"
    prompt = f"""Analyse this India renewable energy / data center news article. Return ONLY a valid JSON object.

{text}

Return JSON with:
- ai_summary: string — exactly 2 sentences summarizing market significance
- market_impact_score: float 0-10 (10 = extremely significant market impact)
- affected_states: array of Indian state names mentioned or implied (empty array if none)
- affected_companies: array of company names mentioned (empty array if none)

Example: {{"ai_summary": "MNRE has extended the RPO compliance deadline. This provides relief to discoms facing shortfalls.", "market_impact_score": 7.5, "affected_states": ["Karnataka", "Tamil Nadu"], "affected_companies": ["NTPC", "Adani Green"]}}

Return only the JSON object."""

    raw = await _call_llm(prompt, max_tokens=300)
    if raw:
        try:
            cleaned = re.sub(r"```(?:json)?", "", raw).strip().strip("`").strip()
            match = re.search(r"\{.*\}", cleaned, re.DOTALL)
            if match:
                parsed = json.loads(match.group())
                score = parsed.get("market_impact_score")
                if isinstance(score, (int, float)):
                    score = max(0.0, min(10.0, float(score)))
                else:
                    score = None
                return {
                    "ai_summary": parsed.get("ai_summary") or None,
                    "market_impact_score": score,
                    "affected_states": parsed.get("affected_states") or [],
                    "affected_companies": parsed.get("affected_companies") or [],
                }
        except Exception as exc:
            logger.debug("LLM article enrichment parse failed: %s", exc)
    return {"ai_summary": None, "market_impact_score": None, "affected_states": [], "affected_companies": []}


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
                    # AI enrichment — best-effort, won't block scrape
                    try:
                        intel = await _enrich_article(art["title"], art["summary"])
                        article.ai_summary          = intel["ai_summary"]
                        article.market_impact_score = intel["market_impact_score"]
                        article.affected_states     = intel["affected_states"] or None
                        article.affected_companies  = intel["affected_companies"] or None
                        article.ai_analyzed_at      = datetime.now(timezone.utc)
                    except Exception as ai_exc:
                        logger.debug("AI enrichment skipped for article: %s", ai_exc)

        await self.db.commit()
        logger.info("News scrape complete: %d new, %d skipped", new_count, skipped)
        return {"new": new_count, "skipped": skipped}

    async def generate_daily_brief(self) -> str:
        """Synthesise top-10 news items from last 24 hours into an executive daily brief.

        Returns a markdown string suitable for display. Called by the 6 AM IST scheduler.
        """
        cutoff = datetime.now(timezone.utc) - timedelta(hours=24)
        query = (
            select(NewsArticle)
            .where(NewsArticle.is_active.is_(True), NewsArticle.published_at >= cutoff)
            .order_by(NewsArticle.market_impact_score.desc().nullslast(), NewsArticle.published_at.desc())
            .limit(10)
        )
        result = await self.db.execute(query)
        articles = list(result.scalars().all())
        if not articles:
            return "No recent news articles available for today's brief."

        items_text = "\n".join(
            f"[{i+1}] ({a.category}) {a.title} — {a.ai_summary or a.summary or 'No summary'}"
            for i, a in enumerate(articles)
        )
        prompt = f"""You are a senior renewable energy market analyst. Based on today's top India RE news, write an executive Daily Market Brief.

Top news items:
{items_text}

Write a structured brief with:
1. **Market Pulse** (2-3 sentences overall assessment)
2. **Policy & Regulation** (key developments)
3. **Solar & Wind** (project/capacity news)
4. **Data Centers** (infrastructure news if any)
5. **Finance & Investment** (funding/deal news if any)
6. **Key Takeaway** (1 sentence)

Keep it professional, concise, under 400 words. Use markdown formatting."""

        raw = await _call_llm(prompt, max_tokens=600)
        return raw or "Daily brief generation failed — LLM unavailable."

    async def get_trending_themes(self, days: int = 7) -> list[dict]:
        """Identify trending themes across the last N days of news.

        Returns a list of theme dicts: {theme, article_count, top_articles, avg_impact}.
        """
        cutoff = datetime.now(timezone.utc) - timedelta(days=days)
        query = (
            select(NewsArticle)
            .where(NewsArticle.is_active.is_(True), NewsArticle.published_at >= cutoff)
            .order_by(NewsArticle.published_at.desc())
            .limit(50)
        )
        result = await self.db.execute(query)
        articles = list(result.scalars().all())
        if not articles:
            return []

        # Group by category as a simple theme proxy
        theme_map: dict[str, list[NewsArticle]] = {}
        for a in articles:
            theme_map.setdefault(a.category, []).append(a)

        themes = []
        for theme, arts in sorted(theme_map.items(), key=lambda x: -len(x[1])):
            scores = [a.market_impact_score for a in arts if a.market_impact_score is not None]
            avg_impact = sum(scores) / len(scores) if scores else 0.0
            themes.append({
                "theme": theme.replace("_", " ").title(),
                "article_count": len(arts),
                "avg_impact_score": round(avg_impact, 1),
                "top_articles": [{"title": a.title, "url": a.url} for a in arts[:3]],
            })
        return themes
