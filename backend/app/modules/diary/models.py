"""Diary model (spec §3). Owns the `diary_entries` table.

Quantity is stored canonically in grams. If the user logged by portion we keep
the portion reference for display, but grams is the source of truth for all math.
"""

from datetime import date

from sqlalchemy import Date, Float, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.shared.base_model import Base, TimestampMixin


class DiaryEntry(Base, TimestampMixin):
    __tablename__ = "diary_entries"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    entry_date: Mapped[date] = mapped_column(Date, index=True, nullable=False)
    meal: Mapped[str] = mapped_column(String(16), nullable=False)  # breakfast|lunch|dinner|snack
    food_id: Mapped[int] = mapped_column(
        ForeignKey("foods.id", ondelete="RESTRICT"), index=True, nullable=False
    )
    grams: Mapped[float] = mapped_column(Float, nullable=False)

    # Optional portion reference, for display only.
    portion_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    portion_count: Mapped[float | None] = mapped_column(Float, nullable=True)
