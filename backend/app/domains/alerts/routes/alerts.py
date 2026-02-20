from uuid import UUID

from fastapi import APIRouter, Depends, BackgroundTasks, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.domains.alerts.schemas.alerts import (
    AlertRead,
    WatchlistRead,
    WatchlistCreate,
    BulkUnwatchRequest,
    NotificationRead,
    NewsArticleRead,
    NewsWatchlistCreate,
)
from app.domains.alerts.services.alert_service import AlertService
from app.domains.alerts.services.news_service import NewsService

router = APIRouter()


@router.get("/", response_model=list[AlertRead])
async def list_alerts(
    alert_type: str | None = None,
    state: str | None = None,
    active_only: bool = True,
    db: AsyncSession = Depends(get_db),
) -> list[AlertRead]:
    """Real-time notifications on policy changes, project delays, or environmental risks."""
    service = AlertService(db)
    alerts = await service.list_alerts(alert_type, state, active_only)
    return [
        AlertRead(
            id=a.id, title=a.title, alert_type=a.alert_type,
            severity=a.severity, state=a.state, message=a.message,
            is_active=a.is_active, created_at=a.created_at,
            expires_at=a.expires_at,
        )
        for a in alerts
    ]


@router.get("/watchlists/{user_id}", response_model=list[WatchlistRead])
async def get_watchlists(
    user_id: UUID,
    db: AsyncSession = Depends(get_db),
) -> list[WatchlistRead]:
    """User-defined tracking of developers, states, or project categories."""
    service = AlertService(db)
    watchlists = await service.get_user_watchlists(user_id)
    return [
        WatchlistRead(
            id=w.id, user_id=w.user_id, name=w.name,
            watch_type=w.watch_type, target_id=w.target_id,
            is_active=w.is_active, created_at=w.created_at,
        )
        for w in watchlists
    ]


@router.post("/watchlists/{user_id}", response_model=WatchlistRead, status_code=201)
async def create_watchlist(
    user_id: UUID,
    payload: WatchlistCreate,
    db: AsyncSession = Depends(get_db),
) -> WatchlistRead:
    service = AlertService(db)
    w = await service.create_watchlist(user_id, payload.name, payload.watch_type, payload.target_id)
    return WatchlistRead(
        id=w.id, user_id=w.user_id, name=w.name,
        watch_type=w.watch_type, target_id=w.target_id,
        is_active=w.is_active,
    )


@router.delete("/watchlists/{user_id}/{watchlist_id}", status_code=204)
async def delete_watchlist(
    user_id: UUID,
    watchlist_id: UUID,
    db: AsyncSession = Depends(get_db),
) -> None:
    """Remove a single item from the user's watchlist (soft delete)."""
    service = AlertService(db)
    deleted = await service.delete_watchlist(user_id, watchlist_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Watchlist item not found")


@router.post("/watchlists/{user_id}/bulk-unwatch", response_model=dict)
async def bulk_unwatch(
    user_id: UUID,
    payload: BulkUnwatchRequest,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Remove multiple items from the user's watchlist in one request."""
    service = AlertService(db)
    count = await service.bulk_delete_watchlists(user_id, payload.watchlist_ids)
    return {"removed": count}


@router.get("/notifications/{user_id}", response_model=list[NotificationRead])
async def get_notifications(
    user_id: UUID,
    unread_only: bool = False,
    db: AsyncSession = Depends(get_db),
) -> list[NotificationRead]:
    """Notification feed for users."""
    service = AlertService(db)
    notifications = await service.get_user_notifications(user_id, unread_only)
    return [
        NotificationRead(
            id=n.id, user_id=n.user_id, alert_id=n.alert_id,
            channel=n.channel, status=n.status, read=n.read,
            created_at=n.created_at,
        )
        for n in notifications
    ]


# ─────────────────────────────────────────────────────────────────────────────
# News Feed endpoints
# ─────────────────────────────────────────────────────────────────────────────


@router.get("/news", response_model=list[NewsArticleRead])
async def list_news(
    category: str | None = None,
    state: str | None = None,
    source: str | None = None,
    limit: int = 50,
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
) -> list[NewsArticleRead]:
    """India-focused renewable energy and data center news feed with optional filters."""
    service = NewsService(db)
    articles = await service.list_news(category=category, state=state, source=source,
                                       limit=limit, offset=offset)
    return [
        NewsArticleRead(
            id=a.id, title=a.title, url=a.url, source=a.source,
            category=a.category, state=a.state, summary=a.summary,
            image_url=a.image_url, published_at=a.published_at,
            scraped_at=a.scraped_at, is_active=a.is_active,
        )
        for a in articles
    ]


@router.get("/news/filters", response_model=dict)
async def get_news_filters(
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Return available filter values for the news feed."""
    service = NewsService(db)
    states = await service.get_available_states()
    sources = await service.get_available_sources()
    return {"states": states, "sources": sources}


@router.post("/news/scrape", response_model=dict)
async def trigger_scrape(
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Trigger a background RSS scrape for new articles."""
    service = NewsService(db)
    background_tasks.add_task(service.scrape_and_store)
    return {"status": "scrape triggered"}


@router.post("/news/{article_id}/watchlist/{user_id}", response_model=WatchlistRead, status_code=201)
async def add_news_to_watchlist(
    article_id: UUID,
    user_id: UUID,
    payload: NewsWatchlistCreate,
    db: AsyncSession = Depends(get_db),
) -> WatchlistRead:
    """Add a news article to the user's watchlist."""
    service = AlertService(db)
    w = await service.create_watchlist(
        user_id=user_id,
        name=payload.article_title[:255],
        watch_type="news_article",
        target_id=str(article_id),
    )
    return WatchlistRead(
        id=w.id, user_id=w.user_id, name=w.name,
        watch_type=w.watch_type, target_id=w.target_id,
        is_active=w.is_active,
    )
