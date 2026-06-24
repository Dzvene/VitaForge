"""Profile domain model (spec §3).

One profile per user: the physical inputs, the goal, optional macro overrides,
and optional per-user parameter overrides (spec §6 — params can be overridden
per user). Owns the `profiles` table.
"""

from sqlalchemy import JSON, Float, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.shared.base_model import Base, TimestampMixin


class Profile(Base, TimestampMixin):
    __tablename__ = "profiles"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), unique=True, index=True, nullable=False
    )

    # ----- Physical inputs (§4.1) -----
    sex: Mapped[str] = mapped_column(String(16), nullable=False)  # male | female
    age: Mapped[int] = mapped_column(Integer, nullable=False)
    height_cm: Mapped[float] = mapped_column(Float, nullable=False)
    current_weight_kg: Mapped[float] = mapped_column(Float, nullable=False)
    activity_level: Mapped[str] = mapped_column(String(16), nullable=False)

    # ----- Goal (§3) -----
    goal: Mapped[str] = mapped_column(String(16), default="maintain", nullable=False)
    target_rate_kg_per_week: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)

    # ----- Macro overrides (§4.2) — all optional, free of charge -----
    protein_g_per_kg: Mapped[float | None] = mapped_column(Float, nullable=True)
    protein_g_abs: Mapped[float | None] = mapped_column(Float, nullable=True)
    fat_g_per_kg: Mapped[float | None] = mapped_column(Float, nullable=True)

    # Per-user parameter overrides (§6). Whitelisted keys merged onto defaults.
    param_overrides: Mapped[dict | None] = mapped_column(JSON, nullable=True)
