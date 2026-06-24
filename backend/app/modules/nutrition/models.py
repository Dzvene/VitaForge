"""Norm/Target model (spec §3 "Норма", §4.6).

Owns `nutrition_targets` (one per user). Holds the maintenance basis and the
derived daily calorie + macro goals. `maintenance_source` records whether the
basis is still the formula guess (§4.1) or a real calibrated TDEE (§4.4);
`calibrated` gates whether the user's loss/gain goal is applied yet — during
the baseline phase the target equals maintenance (eat at maintenance, §4.4).

The `calibration` slice updates this row's maintenance via
NutritionService.set_maintenance — that one-directional write is why
`nutrition` itself depends on nothing but `profile`.
"""

from sqlalchemy import Boolean, Float, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.shared.base_model import Base, TimestampMixin


class NutritionTarget(Base, TimestampMixin):
    __tablename__ = "nutrition_targets"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), unique=True, index=True, nullable=False
    )

    maintenance_kcal: Mapped[float] = mapped_column(Float, nullable=False)
    maintenance_source: Mapped[str] = mapped_column(
        String(16), default="formula", nullable=False
    )  # formula | calibrated
    calibrated: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    target_calories: Mapped[float] = mapped_column(Float, nullable=False)
    protein_g: Mapped[float] = mapped_column(Float, nullable=False)
    fat_g: Mapped[float] = mapped_column(Float, nullable=False)
    carb_g: Mapped[float] = mapped_column(Float, nullable=False)
