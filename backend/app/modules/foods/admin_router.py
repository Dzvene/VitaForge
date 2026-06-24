"""Admin: food catalog moderation (spec §7)."""

from fastapi import APIRouter, Query, status

from app.core.deps import AdminUser, DbSession
from app.modules.foods.schemas import FoodCreate, FoodOut
from app.modules.foods.service import FoodService

admin_router = APIRouter(prefix="/admin/foods", tags=["admin:foods"])


@admin_router.get("", response_model=list[FoodOut])
async def list_foods(
    admin: AdminUser,
    db: DbSession,
    q: str | None = Query(default=None, max_length=128),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
) -> list[FoodOut]:
    foods = await FoodService(db).admin_list(q, limit, offset)
    return [FoodOut.model_validate(f) for f in foods]


@admin_router.post("", response_model=FoodOut, status_code=status.HTTP_201_CREATED)
async def create_food(payload: FoodCreate, admin: AdminUser, db: DbSession) -> FoodOut:
    food = await FoodService(db).create_shared(payload)
    return FoodOut.model_validate(food)


@admin_router.put("/{food_id}", response_model=FoodOut)
async def update_food(
    food_id: int, payload: FoodCreate, admin: AdminUser, db: DbSession
) -> FoodOut:
    food = await FoodService(db).admin_update(food_id, payload)
    return FoodOut.model_validate(food)


@admin_router.delete("/{food_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_food(food_id: int, admin: AdminUser, db: DbSession) -> None:
    await FoodService(db).admin_delete(food_id)
