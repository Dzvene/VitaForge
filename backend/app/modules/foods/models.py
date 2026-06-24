"""Food database models (spec §3, §7).

Owns `foods`, `food_portions`, `food_favorites`. The product DB is populated
from Open Food Facts + USDA dumps (source="off"/"usda"); users can also create
their own products (source="custom", owner_user_id set). Nutrition is stored
per 100 g, the canonical basis for all diary math.
"""

from sqlalchemy import Float, ForeignKey, Index, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.shared.base_model import Base, TimestampMixin


class Food(Base, TimestampMixin):
    __tablename__ = "foods"
    __table_args__ = (Index("ix_foods_name_lower", "name"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    source: Mapped[str] = mapped_column(String(16), default="custom", nullable=False)
    barcode: Mapped[str | None] = mapped_column(String(32), index=True, nullable=True)
    name: Mapped[str] = mapped_column(String(512), nullable=False)
    brand: Mapped[str | None] = mapped_column(String(255), nullable=True)
    # NULL → shared DB product; set → a user's private custom product.
    owner_user_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=True
    )

    # Per 100 g.
    kcal_100g: Mapped[float] = mapped_column(Float, nullable=False)
    protein_100g: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    fat_100g: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    carb_100g: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)

    portions: Mapped[list["FoodPortion"]] = relationship(
        back_populates="food", cascade="all, delete-orphan", lazy="selectin"
    )


class FoodPortion(Base):
    """A named serving size with its weight in grams (spec §3)."""

    __tablename__ = "food_portions"

    id: Mapped[int] = mapped_column(primary_key=True)
    food_id: Mapped[int] = mapped_column(
        ForeignKey("foods.id", ondelete="CASCADE"), index=True, nullable=False
    )
    name: Mapped[str] = mapped_column(String(64), nullable=False)  # slice, cup, package...
    grams: Mapped[float] = mapped_column(Float, nullable=False)

    food: Mapped["Food"] = relationship(back_populates="portions")


class FoodFavorite(Base, TimestampMixin):
    __tablename__ = "food_favorites"
    __table_args__ = (UniqueConstraint("user_id", "food_id", name="uq_favorite_user_food"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    food_id: Mapped[int] = mapped_column(
        ForeignKey("foods.id", ondelete="CASCADE"), index=True, nullable=False
    )
