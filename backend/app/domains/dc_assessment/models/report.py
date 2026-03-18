from dataclasses import dataclass
from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import DateTime, Float, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


@dataclass
class AssessmentReport(Base):
    """Persisted AI-generated environmental assessment reports for DC and airport assets.

    Reports are keyed by asset_key = "{asset_type}_{slno}" (e.g. "datacenter_42").
    On regeneration the existing row is updated in-place (upsert).
    """

    __tablename__ = "assessment_reports"

    id: Mapped[UUID] = mapped_column(primary_key=True, default_factory=uuid4, init=False)
    asset_key: Mapped[str] = mapped_column(String(100), unique=True)
    asset_name: Mapped[str] = mapped_column(String(500))
    asset_type: Mapped[str] = mapped_column(String(50))  # "datacenter" | "airport"
    city: Mapped[str] = mapped_column(String(255), default="")
    state: Mapped[str] = mapped_column(String(255), default="")
    lat: Mapped[float] = mapped_column(Float, default=0.0)
    lon: Mapped[float] = mapped_column(Float, default=0.0)
    markdown_content: Mapped[str] = mapped_column(Text, default="")
    html_content: Mapped[str] = mapped_column(Text, default="")
    # Renewable energy assessment scores (populated when user saves from SolarWindReport)
    solar_score: Mapped[float | None] = mapped_column(Float, nullable=True, default=None)
    wind_score: Mapped[float | None] = mapped_column(Float, nullable=True, default=None)
    water_score: Mapped[float | None] = mapped_column(Float, nullable=True, default=None)
    overall_score: Mapped[float | None] = mapped_column(Float, nullable=True, default=None)
    rating: Mapped[str | None] = mapped_column(String(100), nullable=True, default=None)
    generated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), init=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), init=False
    )
