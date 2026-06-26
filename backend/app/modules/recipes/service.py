"""Recipe CRUD + one-tap logging into the diary."""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.diary.schemas import DiaryAddIn, Nutrients
from app.modules.diary.service import DiaryService
from app.modules.foods.service import FoodService
from app.modules.recipes.models import Recipe, RecipeComponent
from app.modules.recipes.schemas import (
    RecipeComponentOut,
    RecipeCreate,
    RecipeLogIn,
    RecipeOut,
)
from app.shared.exceptions import NotFoundError, ValidationError


def _nutrients(food, grams: float) -> Nutrients:
    factor = grams / 100.0
    return Nutrients(
        kcal=round(food.kcal_100g * factor, 1),
        protein_g=round(food.protein_100g * factor, 1),
        fat_g=round(food.fat_100g * factor, 1),
        carb_g=round(food.carb_100g * factor, 1),
    )


class RecipeService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.foods = FoodService(db)
        self.diary = DiaryService(db)

    async def _row(self, user_id: int, recipe_id: int) -> Recipe:
        row = (
            await self.db.execute(
                select(Recipe).where(
                    Recipe.id == recipe_id, Recipe.owner_user_id == user_id
                )
            )
        ).scalar_one_or_none()
        if row is None:
            raise NotFoundError("Recipe not found")
        return row

    async def _to_out(self, recipe: Recipe) -> RecipeOut:
        ids = [c.food_id for c in recipe.components]
        foods = await self.foods.get_many(recipe.owner_user_id, ids)
        comps: list[RecipeComponentOut] = []
        tk = tp = tf = tc = 0.0
        for c in sorted(recipe.components, key=lambda x: x.position):
            food = foods.get(c.food_id)
            if food is None:  # food was deleted from the catalog — skip gracefully
                continue
            n = _nutrients(food, c.grams)
            tk += n.kcal
            tp += n.protein_g
            tf += n.fat_g
            tc += n.carb_g
            comps.append(
                RecipeComponentOut(
                    food_id=c.food_id, food_name=food.name, grams=c.grams, nutrients=n
                )
            )
        totals = Nutrients(
            kcal=round(tk, 1), protein_g=round(tp, 1), fat_g=round(tf, 1), carb_g=round(tc, 1)
        )
        return RecipeOut(id=recipe.id, name=recipe.name, totals=totals, components=comps)

    async def list(self, user_id: int) -> list[RecipeOut]:
        rows = (
            await self.db.execute(
                select(Recipe).where(Recipe.owner_user_id == user_id).order_by(Recipe.name)
            )
        ).scalars().all()
        return [await self._to_out(r) for r in rows]

    async def get(self, user_id: int, recipe_id: int) -> RecipeOut:
        return await self._to_out(await self._row(user_id, recipe_id))

    async def _validate(self, user_id: int, payload: RecipeCreate) -> None:
        ids = [c.food_id for c in payload.components]
        foods = await self.foods.get_many(user_id, ids)
        missing = sorted({i for i in ids if i not in foods})
        if missing:
            raise ValidationError(f"Unknown food id(s): {missing}")

    @staticmethod
    def _components(payload: RecipeCreate) -> list[RecipeComponent]:
        return [
            RecipeComponent(food_id=c.food_id, grams=c.grams, position=i)
            for i, c in enumerate(payload.components)
        ]

    async def create(self, user_id: int, payload: RecipeCreate) -> RecipeOut:
        await self._validate(user_id, payload)
        recipe = Recipe(
            owner_user_id=user_id, name=payload.name, components=self._components(payload)
        )
        self.db.add(recipe)
        await self.db.commit()
        await self.db.refresh(recipe)
        return await self._to_out(recipe)

    async def update(self, user_id: int, recipe_id: int, payload: RecipeCreate) -> RecipeOut:
        await self._validate(user_id, payload)
        recipe = await self._row(user_id, recipe_id)
        recipe.name = payload.name
        recipe.components = self._components(payload)  # delete-orphan replaces the set
        await self.db.commit()
        await self.db.refresh(recipe)
        return await self._to_out(recipe)

    async def delete(self, user_id: int, recipe_id: int) -> None:
        recipe = await self._row(user_id, recipe_id)
        await self.db.delete(recipe)
        await self.db.commit()

    async def log(self, user_id: int, recipe_id: int, payload: RecipeLogIn) -> int:
        """Expand the recipe into one diary entry per component for (date, meal)."""
        recipe = await self._row(user_id, recipe_id)
        items = [
            DiaryAddIn(
                entry_date=payload.entry_date,
                meal=payload.meal,
                food_id=c.food_id,
                grams=c.grams,
            )
            for c in sorted(recipe.components, key=lambda x: x.position)
        ]
        if not items:
            raise ValidationError("Recipe has no components")
        return await self.diary.add_batch(user_id, items)
