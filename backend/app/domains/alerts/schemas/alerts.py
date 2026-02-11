from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class AlertRead(BaseModel):
    id: UUID
    title: str
    alert_type: str
    severity: str
    state: str | None = None
    message: str
    is_active: bool
    created_at: datetime
    expires_at: datetime | None = None


class WatchlistRead(BaseModel):
    id: UUID
    user_id: UUID
    name: str
    watch_type: str
    target_id: str
    is_active: bool


class WatchlistCreate(BaseModel):
    name: str
    watch_type: str
    target_id: str


class NotificationRead(BaseModel):
    id: UUID
    user_id: UUID
    alert_id: UUID | None = None
    channel: str
    status: str
    read: bool
    created_at: datetime
