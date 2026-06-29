"""Food search + custom product management.

Search hits the local DB only (dumps are imported ahead of time), so it never
depends on Open Food Facts / USDA uptime (spec §7).
"""

from sqlalchemy import case, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.i18n import tr
from app.modules.foods.models import Food, FoodFavorite, FoodPortion
from app.modules.foods.schemas import FoodCreate
from app.shared.exceptions import NotFoundError


class FoodService:
    def __init__(self, db: AsyncSession):
        self.db = db

    def _visible(self, user_id: int | None):
        # Shared products (owner NULL) + this user's own custom products. A guest
        # (user_id is None) sees the shared catalog only.
        if user_id is None:
            return Food.owner_user_id.is_(None)
        return or_(Food.owner_user_id.is_(None), Food.owner_user_id == user_id)

    async def get(self, user_id: int | None, food_id: int) -> Food:
        food = (
            await self.db.execute(
                select(Food).where(Food.id == food_id, self._visible(user_id))
            )
        ).scalar_one_or_none()
        if food is None:
            raise NotFoundError("Food not found")
        return food

    async def get_many(self, user_id: int | None, ids: list[int]) -> dict[int, Food]:
        """Visible foods for the given ids, keyed by id (bulk — used by recipes)."""
        if not ids:
            return {}
        rows = (
            await self.db.execute(
                select(Food).where(Food.id.in_(set(ids)), self._visible(user_id))
            )
        ).scalars().all()
        return {f.id: f for f in rows}

    async def by_barcode(self, user_id: int | None, barcode: str) -> Food:
        food = (
            await self.db.execute(
                select(Food).where(Food.barcode == barcode, self._visible(user_id))
            )
        ).scalars().first()
        if food is None:
            raise NotFoundError(tr("error.barcode_not_found"))
        return food

    async def search(self, user_id: int | None, query: str, limit: int = 30) -> list[Food]:
        q = query.strip()
        if not q:
            return []
        # Match across the English name AND the curated RU/DE names + aliases, so
        # "творог"/"Quark" find the same staple as "cottage cheese". The localized
        # columns are NULL for the USDA bulk rows, so ILIKE just no-ops there.
        like = f"%{q}%"
        prefix = f"{q}%"
        matches = or_(
            Food.name.ilike(like),
            Food.name_ru.ilike(like),
            Food.name_de.ilike(like),
            Food.aliases.ilike(like),
        )
        # Relevance, not alphabetical (the catalog is ~2M rows; "chicken" must not
        # surface "Abc chicken brand X" before plain "Chicken"). Portable ordering
        # that works on both Postgres (prod, trigram GIN indexes) and SQLite
        # (tests): curated/region-relevant tier first (so the worldwide OFF bulk
        # never outranks the local catalog), then prefix match, then generic foods
        # (no brand) over branded, then the shorter / more canonical name.
        prefix_first = case(
            (
                or_(
                    Food.name.ilike(prefix),
                    Food.name_ru.ilike(prefix),
                    Food.name_de.ilike(prefix),
                ),
                0,
            ),
            else_=1,
        )
        generic_first = case((Food.brand.is_(None), 0), else_=1)
        stmt = (
            select(Food)
            .where(self._visible(user_id), matches)
            .order_by(
                Food.priority.desc(),
                prefix_first,
                generic_first,
                func.length(Food.name),
                Food.name,
            )
            .limit(limit)
        )
        return list((await self.db.execute(stmt)).scalars().all())

    async def create_custom(self, user_id: int, payload: FoodCreate) -> Food:
        food = Food(
            source="custom",
            owner_user_id=user_id,
            name=payload.name,
            brand=payload.brand,
            barcode=payload.barcode,
            kcal_100g=payload.kcal_100g,
            protein_100g=payload.protein_100g,
            fat_100g=payload.fat_100g,
            carb_100g=payload.carb_100g,
            portions=[FoodPortion(name=p.name, grams=p.grams) for p in payload.portions],
        )
        self.db.add(food)
        await self.db.commit()
        await self.db.refresh(food)
        return food

    # ----- admin moderation (any food, regardless of owner) -----
    async def admin_list(self, q: str | None, limit: int = 50, offset: int = 0) -> list[Food]:
        stmt = select(Food)
        if q:
            stmt = stmt.where(Food.name.ilike(f"%{q.strip()}%"))
        stmt = stmt.order_by(Food.id.desc()).limit(limit).offset(offset)
        return list((await self.db.execute(stmt)).scalars().all())

    async def admin_get(self, food_id: int) -> Food:
        food = (
            await self.db.execute(select(Food).where(Food.id == food_id))
        ).scalar_one_or_none()
        if food is None:
            raise NotFoundError("Food not found")
        return food

    async def create_shared(self, payload: FoodCreate) -> Food:
        """Create a shared (owner-less) catalog product from the admin panel."""
        food = Food(
            source="manual",
            owner_user_id=None,
            name=payload.name,
            brand=payload.brand,
            barcode=payload.barcode,
            kcal_100g=payload.kcal_100g,
            protein_100g=payload.protein_100g,
            fat_100g=payload.fat_100g,
            carb_100g=payload.carb_100g,
            portions=[FoodPortion(name=p.name, grams=p.grams) for p in payload.portions],
        )
        self.db.add(food)
        await self.db.commit()
        await self.db.refresh(food)
        return food

    async def admin_update(self, food_id: int, payload: FoodCreate) -> Food:
        food = await self.admin_get(food_id)
        food.name = payload.name
        food.brand = payload.brand
        food.barcode = payload.barcode
        food.kcal_100g = payload.kcal_100g
        food.protein_100g = payload.protein_100g
        food.fat_100g = payload.fat_100g
        food.carb_100g = payload.carb_100g
        await self.db.commit()
        await self.db.refresh(food)
        return food

    async def admin_delete(self, food_id: int) -> None:
        food = await self.admin_get(food_id)
        await self.db.delete(food)
        await self.db.commit()

    async def list_favorites(self, user_id: int) -> list[Food]:
        stmt = (
            select(Food)
            .join(FoodFavorite, FoodFavorite.food_id == Food.id)
            .where(FoodFavorite.user_id == user_id)
            .order_by(FoodFavorite.created_at.desc())
        )
        return list((await self.db.execute(stmt)).scalars().all())

    async def add_favorite(self, user_id: int, food_id: int) -> None:
        await self.get(user_id, food_id)  # 404 if not visible
        exists = (
            await self.db.execute(
                select(FoodFavorite.id).where(
                    FoodFavorite.user_id == user_id, FoodFavorite.food_id == food_id
                )
            )
        ).scalar_one_or_none()
        if exists is None:
            self.db.add(FoodFavorite(user_id=user_id, food_id=food_id))
            await self.db.commit()

    async def remove_favorite(self, user_id: int, food_id: int) -> None:
        fav = (
            await self.db.execute(
                select(FoodFavorite).where(
                    FoodFavorite.user_id == user_id, FoodFavorite.food_id == food_id
                )
            )
        ).scalar_one_or_none()
        if fav is not None:
            await self.db.delete(fav)
            await self.db.commit()
