from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import String, Boolean, DateTime, ForeignKey, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Alert(Base):
    """Geo-targeted alerts for policy changes, project delays, or environmental risks."""

    __tablename__ = "alerts"

    id: Mapped[UUID] = mapped_column(primary_key=True, default_factory=uuid4, init=False)
    title: Mapped[str] = mapped_column(String(500))
    alert_type: Mapped[str] = mapped_column(String(100))  # policy, project, weather, disaster
    severity: Mapped[str] = mapped_column(String(50))  # info, warning, critical
    state: Mapped[str | None] = mapped_column(String(255), nullable=True, default=None)
    message: Mapped[str] = mapped_column(Text, default="")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), init=False
    )
    expires_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True, default=None
    )


class Watchlist(Base):
    """User-defined tracking of developers, states, or project categories."""

    __tablename__ = "watchlists"

    id: Mapped[UUID] = mapped_column(primary_key=True, default_factory=uuid4, init=False)
    user_id: Mapped[UUID] = mapped_column()
    name: Mapped[str] = mapped_column(String(255))
    watch_type: Mapped[str] = mapped_column(String(100))  # developer, state, category
    target_id: Mapped[str] = mapped_column(String(255))  # flexible reference
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), init=False
    )


class Notification(Base):
    """Notification delivery records for users."""

    __tablename__ = "notifications"

    id: Mapped[UUID] = mapped_column(primary_key=True, default_factory=uuid4, init=False)
    user_id: Mapped[UUID] = mapped_column()
    channel: Mapped[str] = mapped_column(String(50))  # email, sms, push, in_app
    alert_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("alerts.id"), nullable=True, default=None
    )
    status: Mapped[str] = mapped_column(String(50), default="pending")  # pending, sent, failed
    read: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), init=False
    )
