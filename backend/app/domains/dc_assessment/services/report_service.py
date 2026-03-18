from __future__ import annotations

import logging
from datetime import UTC, datetime

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.domains.dc_assessment.models.report import AssessmentReport

logger = logging.getLogger(__name__)


class ReportService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get_by_asset_key(self, asset_key: str) -> AssessmentReport | None:
        result = await self.db.execute(
            select(AssessmentReport).where(AssessmentReport.asset_key == asset_key)
        )
        return result.scalar_one_or_none()

    async def upsert(
        self,
        asset_key: str,
        asset_name: str,
        asset_type: str,
        city: str,
        state: str,
        lat: float,
        lon: float,
        markdown_content: str,
        html_content: str,
        power_mw: float | None = None,
    ) -> AssessmentReport:
        existing = await self.get_by_asset_key(asset_key)
        if existing:
            existing.markdown_content = markdown_content
            existing.html_content = html_content
            existing.generated_at = datetime.now(UTC)
            if power_mw is not None:
                existing.power_mw = power_mw
            await self.db.commit()
            await self.db.refresh(existing)
            return existing

        report = AssessmentReport(
            asset_key=asset_key,
            asset_name=asset_name,
            asset_type=asset_type,
            city=city,
            state=state,
            lat=lat,
            lon=lon,
            markdown_content=markdown_content,
            html_content=html_content,
            power_mw=power_mw,
        )
        self.db.add(report)
        await self.db.commit()
        await self.db.refresh(report)
        return report

    async def generate_markdown(self, prompt: str) -> str:
        """Call Azure OpenAI if configured, otherwise fall back to Ollama.

        When Azure credentials are present, Azure is used exclusively — errors are
        raised immediately so the caller returns a clear 503 rather than silently
        attempting Ollama (which is not available in production).
        """
        if settings.AZURE_OPENAI_API_KEY and settings.AZURE_OPENAI_ENDPOINT:
            try:
                return await self._call_azure(prompt)
            except Exception as exc:
                logger.error("Azure OpenAI report generation failed: %s", exc)
                raise
        return await self._call_ollama(prompt)

    async def _call_azure(self, prompt: str) -> str:
        import openai  # lazy import — optional dependency

        logger.info(
            "Calling Azure OpenAI: endpoint=%s deployment=%s api_version=%s",
            settings.AZURE_OPENAI_ENDPOINT,
            settings.AZURE_OPENAI_DEPLOYMENT,
            settings.AZURE_OPENAI_API_VERSION,
        )
        client = openai.AsyncAzureOpenAI(
            api_key=settings.AZURE_OPENAI_API_KEY,
            azure_endpoint=settings.AZURE_OPENAI_ENDPOINT,
            api_version=settings.AZURE_OPENAI_API_VERSION,
        )
        response = await client.chat.completions.create(
            model=settings.AZURE_OPENAI_DEPLOYMENT,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are an expert Environmental Engineer specializing in renewable energy "
                        "infrastructure assessment in India. Write formal, data-driven reports in Markdown."
                    ),
                },
                {"role": "user", "content": prompt},
            ],
            temperature=0.1,
            max_tokens=4000,
        )
        content = response.choices[0].message.content or ""
        logger.info("Azure OpenAI returned %d chars", len(content))
        return content

    async def _call_ollama(self, prompt: str) -> str:
        async with httpx.AsyncClient(timeout=120.0) as client:
            resp = await client.post(
                f"{settings.OLLAMA_URL}/api/generate",
                json={
                    "model": settings.OLLAMA_MODEL,
                    "prompt": prompt,
                    "stream": False,
                    "options": {"temperature": 0.1},
                },
            )
            resp.raise_for_status()
            return resp.json().get("response", "")
