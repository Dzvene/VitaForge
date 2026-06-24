"""Profile endpoints."""

from fastapi import APIRouter

from app.core.deps import CurrentUser, DbSession
from app.modules.profile.schemas import ProfileOut, ProfileUpsert
from app.modules.profile.service import ProfileService

router = APIRouter(prefix="/profile", tags=["profile"])


@router.get("", response_model=ProfileOut)
async def get_profile(user: CurrentUser, db: DbSession) -> ProfileOut:
    profile = await ProfileService(db).get_or_404(user.id)
    return ProfileOut.model_validate(profile)


@router.put("", response_model=ProfileOut)
async def upsert_profile(payload: ProfileUpsert, user: CurrentUser, db: DbSession) -> ProfileOut:
    profile = await ProfileService(db).upsert(user.id, payload)
    return ProfileOut.model_validate(profile)
