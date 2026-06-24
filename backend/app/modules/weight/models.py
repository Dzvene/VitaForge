"""Weight log model (spec §3, §4.3). Owns the `weight_logs` table."""

from datetime import date

from sqlalchemy import Date, Float, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.shared.base_model import Base, TimestampMixin


class WeightLog(Base, TimestampMixin):
    __tablename__ = "weight_logs"
    __table_args__ = (UniqueConstraint("user_id", "logged_on", name="uq_weight_user_day"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    logged_on: Mapped[date] = mapped_column(Date, nullable=False)
    weight_kg: Mapped[float] = mapped_column(Float, nullable=False)
