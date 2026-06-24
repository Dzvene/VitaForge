"""Coaching state model (spec §5.2 experience de-escalation).

Owns `coaching_warning_state` — per (user, warning_type) it tracks how many
times the user accepted that warning and whether they muted it. Together with
the experience-days counter this decides whether a warning still auto-pops.
"""

from sqlalchemy import Boolean, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.shared.base_model import Base, TimestampMixin


class CoachingWarningState(Base, TimestampMixin):
    __tablename__ = "coaching_warning_state"
    __table_args__ = (
        UniqueConstraint("user_id", "warning_type", name="uq_coaching_user_type"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    warning_type: Mapped[str] = mapped_column(String(48), nullable=False)
    accepted_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    dismissed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
