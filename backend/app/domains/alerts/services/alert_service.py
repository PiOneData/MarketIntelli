from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domains.alerts.models.alerts import Alert, Watchlist, Notification


class AlertService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def list_alerts(
        self,
        alert_type: str | None = None,
        state: str | None = None,
        active_only: bool = True,
    ) -> list[Alert]:
        query = select(Alert).order_by(Alert.created_at.desc())
        if alert_type:
            query = query.where(Alert.alert_type == alert_type)
        if state:
            query = query.where(Alert.state == state)
        if active_only:
            query = query.where(Alert.is_active.is_(True))
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def get_user_watchlists(self, user_id: UUID) -> list[Watchlist]:
        result = await self.db.execute(
            select(Watchlist).where(Watchlist.user_id == user_id, Watchlist.is_active.is_(True))
        )
        return list(result.scalars().all())

    async def create_watchlist(
        self, user_id: UUID, name: str, watch_type: str, target_id: str
    ) -> Watchlist:
        watchlist = Watchlist(user_id=user_id, name=name, watch_type=watch_type, target_id=target_id)
        self.db.add(watchlist)
        await self.db.commit()
        await self.db.refresh(watchlist)
        return watchlist

    async def get_user_notifications(
        self, user_id: UUID, unread_only: bool = False
    ) -> list[Notification]:
        query = select(Notification).where(
            Notification.user_id == user_id
        ).order_by(Notification.created_at.desc())
        if unread_only:
            query = query.where(Notification.read.is_(False))
        result = await self.db.execute(query)
        return list(result.scalars().all())
