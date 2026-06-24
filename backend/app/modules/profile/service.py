"""Profile business logic + per-user effective params."""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.event_topics import PROFILE_UPDATED
from app.core.events import publish
from app.core.params import Params, merge_params
from app.modules.app_config.service import AppConfigService
from app.modules.profile.models import Profile
from app.modules.profile.schemas import ProfileUpsert
from app.shared.exceptions import NotFoundError


class ProfileService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get(self, user_id: int) -> Profile | None:
        return (
            await self.db.execute(select(Profile).where(Profile.user_id == user_id))
        ).scalar_one_or_none()

    async def get_or_404(self, user_id: int) -> Profile:
        profile = await self.get(user_id)
        if profile is None:
            raise NotFoundError("Profile not set up yet")
        return profile

    async def upsert(self, user_id: int, payload: ProfileUpsert) -> Profile:
        profile = await self.get(user_id)
        data = payload.model_dump()
        if profile is None:
            profile = Profile(user_id=user_id, **data)
            self.db.add(profile)
        else:
            for key, value in data.items():
                setattr(profile, key, value)
        await self.db.commit()
        await self.db.refresh(profile)
        publish(PROFILE_UPDATED, user_id=user_id)
        return profile

    async def effective_params(self, user_id: int) -> Params:
        """Resolve params: defaults → app-level → this user's overrides (§6)."""
        app_params = await AppConfigService(self.db).effective_app_params()
        profile = await self.get(user_id)
        overrides = profile.param_overrides if profile else None
        return merge_params(app_params, overrides)
