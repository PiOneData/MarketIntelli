from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.domains.alerts.schemas.alerts import (
    AlertRead,
    WatchlistRead,
    WatchlistCreate,
    NotificationRead,
)
from app.domains.alerts.services.alert_service import AlertService

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
            is_active=w.is_active,
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
