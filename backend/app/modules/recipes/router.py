"""Recipe endpoints — per-user CRUD + one-tap logging."""

from fastapi import APIRouter, status

from app.core.deps import CurrentUser, DbSession
from app.modules.recipes.schemas import RecipeCreate, RecipeLogIn, RecipeOut
from app.modules.recipes.service import RecipeService

router = APIRouter(prefix="/recipes", tags=["recipes"])


@router.get("", response_model=list[RecipeOut])
async def list_recipes(user: CurrentUser, db: DbSession) -> list[RecipeOut]:
    return await RecipeService(db).list(user.id)


@router.post("", response_model=RecipeOut, status_code=status.HTTP_201_CREATED)
async def create_recipe(payload: RecipeCreate, user: CurrentUser, db: DbSession) -> RecipeOut:
    return await RecipeService(db).create(user.id, payload)


@router.get("/{recipe_id}", response_model=RecipeOut)
async def get_recipe(recipe_id: int, user: CurrentUser, db: DbSession) -> RecipeOut:
    return await RecipeService(db).get(user.id, recipe_id)


@router.put("/{recipe_id}", response_model=RecipeOut)
async def update_recipe(
    recipe_id: int, payload: RecipeCreate, user: CurrentUser, db: DbSession
) -> RecipeOut:
    return await RecipeService(db).update(user.id, recipe_id, payload)


@router.delete("/{recipe_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_recipe(recipe_id: int, user: CurrentUser, db: DbSession) -> None:
    await RecipeService(db).delete(user.id, recipe_id)


@router.post("/{recipe_id}/log", status_code=status.HTTP_200_OK)
async def log_recipe(
    recipe_id: int, payload: RecipeLogIn, user: CurrentUser, db: DbSession
) -> dict:
    added = await RecipeService(db).log(user.id, recipe_id, payload)
    return {"added": added}
