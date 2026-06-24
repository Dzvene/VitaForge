"""Food endpoints — search, barcode lookup, custom products, favorites."""

from fastapi import APIRouter, Query, status

from app.core.deps import CurrentUser, DbSession
from app.modules.foods.schemas import FoodCreate, FoodOut
from app.modules.foods.service import FoodService

router = APIRouter(prefix="/foods", tags=["foods"])


@router.get("/search", response_model=list[FoodOut])
async def search(
    user: CurrentUser,
    db: DbSession,
    q: str = Query(min_length=1, max_length=128),
) -> list[FoodOut]:
    foods = await FoodService(db).search(user.id, q)
    return [FoodOut.model_validate(f) for f in foods]


@router.get("/barcode/{barcode}", response_model=FoodOut)
async def by_barcode(barcode: str, user: CurrentUser, db: DbSession) -> FoodOut:
    food = await FoodService(db).by_barcode(user.id, barcode)
    return FoodOut.model_validate(food)


@router.get("/favorites", response_model=list[FoodOut])
async def favorites(user: CurrentUser, db: DbSession) -> list[FoodOut]:
    foods = await FoodService(db).list_favorites(user.id)
    return [FoodOut.model_validate(f) for f in foods]


@router.post("", response_model=FoodOut, status_code=status.HTTP_201_CREATED)
async def create_custom(payload: FoodCreate, user: CurrentUser, db: DbSession) -> FoodOut:
    food = await FoodService(db).create_custom(user.id, payload)
    return FoodOut.model_validate(food)


@router.get("/{food_id}", response_model=FoodOut)
async def get_food(food_id: int, user: CurrentUser, db: DbSession) -> FoodOut:
    food = await FoodService(db).get(user.id, food_id)
    return FoodOut.model_validate(food)


@router.put("/{food_id}/favorite", status_code=status.HTTP_204_NO_CONTENT)
async def add_favorite(food_id: int, user: CurrentUser, db: DbSession) -> None:
    await FoodService(db).add_favorite(user.id, food_id)


@router.delete("/{food_id}/favorite", status_code=status.HTTP_204_NO_CONTENT)
async def remove_favorite(food_id: int, user: CurrentUser, db: DbSession) -> None:
    await FoodService(db).remove_favorite(user.id, food_id)
