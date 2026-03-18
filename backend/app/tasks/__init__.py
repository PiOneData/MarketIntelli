"""Celery tasks for MarketIntelli background processing."""
from app.core.celery_app import celery_app


@celery_app.task(name="tasks.generate_daily_brief")
def generate_daily_brief_task() -> None:
    """Celery task: generate and cache the daily market brief.

    Scheduled via Celery beat at 06:00 IST (00:30 UTC) daily.
    Also triggered via asyncio scheduler in main.py as a fallback.
    """
    import asyncio

    from app.db.session import async_session_factory
    from app.domains.alerts.services.news_service import NewsService

    async def _run() -> None:
        async with async_session_factory() as db:
            svc = NewsService(db)
            await svc.generate_daily_brief()

    asyncio.run(_run())
