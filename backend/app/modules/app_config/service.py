"""App-level parameter resolution (spec §6).

Layering: code defaults → app-level overrides (here) → per-user overrides
(applied in profile.service). This slice owns only the app-level layer.
"""

from dataclasses import asdict

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.params import DEFAULT_PARAMS, Params, merge_params
from app.modules.app_config.models import AppParams


class AppConfigService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def _row(self) -> AppParams | None:
        return (
            await self.db.execute(select(AppParams).where(AppParams.id == 1))
        ).scalar_one_or_none()

    async def get_overrides(self) -> dict:
        row = await self._row()
        return dict(row.overrides) if row and row.overrides else {}

    async def effective_app_params(self) -> Params:
        """Code defaults with the app-level overrides applied."""
        return merge_params(DEFAULT_PARAMS, await self.get_overrides())

    async def set_overrides(self, overrides: dict) -> dict:
        # Keep only keys that actually exist on Params (defensive, §6).
        valid = set(asdict(DEFAULT_PARAMS))
        clean = {k: v for k, v in overrides.items() if k in valid}
        row = await self._row()
        if row is None:
            row = AppParams(id=1, overrides=clean)
            self.db.add(row)
        else:
            row.overrides = clean
        await self.db.commit()
        return clean
