"""Calibration status model (spec §3 "Статус калибровки", §4.4).

Owns `calibration_status` (one per user). Tracks whether the baseline phase is
running or done, when it started, and the last real-TDEE estimate produced.
"""

from datetime import date, datetime

from sqlalchemy import Date, DateTime, Float, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.shared.base_model import Base, TimestampMixin


class CalibrationStatus(Base, TimestampMixin):
    __tablename__ = "calibration_status"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), unique=True, index=True, nullable=False
    )
    # calibrating | completed
    phase: Mapped[str] = mapped_column(String(16), default="calibrating", nullable=False)
    started_on: Mapped[date] = mapped_column(Date, nullable=False)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_real_tdee: Mapped[float | None] = mapped_column(Float, nullable=True)
