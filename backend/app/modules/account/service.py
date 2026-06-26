"""Account self-service: GDPR data export + irreversible account deletion.

A deliberate cross-slice hub (like `admin`): the user's data lives across many
slices, and "export/erase everything about me" must touch each owning table.
Deletion relies on the ``ondelete=CASCADE`` FKs to users.id — removing the
``User`` row wipes profile, targets, calibration, weight, diary, favorites,
custom foods and coaching state in one statement.
"""

import csv
import io
from datetime import UTC, date, datetime
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import verify_password
from app.modules.calibration.models import CalibrationStatus
from app.modules.coaching.models import CoachingWarningState
from app.modules.diary.models import DiaryEntry
from app.modules.foods.models import Food, FoodFavorite
from app.modules.identity.models import User
from app.modules.nutrition.models import NutritionTarget
from app.modules.profile.models import Profile
from app.modules.weight.models import WeightLog
from app.shared.exceptions import NotFoundError, UnauthorizedError

# Columns never exposed in an export.
_REDACT = {"password_hash"}


def _json_safe(value: object) -> object:
    if isinstance(value, datetime | date):
        return value.isoformat()
    if isinstance(value, Decimal):
        return float(value)
    return value


def _dump(obj: object) -> dict:
    """Serialize an ORM row to a plain JSON-safe dict, minus redacted columns."""
    cols = obj.__table__.columns  # type: ignore[attr-defined]
    return {
        c.key: _json_safe(getattr(obj, c.key)) for c in cols if c.key not in _REDACT
    }


class AccountService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def _get_user(self, user_id: int) -> User:
        user = (
            await self.db.execute(select(User).where(User.id == user_id))
        ).scalar_one_or_none()
        if user is None:
            raise NotFoundError("User not found")
        return user

    async def export(self, user_id: int) -> dict:
        """A full, portable snapshot of everything the user owns (GDPR Art. 20)."""
        user = await self._get_user(user_id)

        async def one(model):
            return (
                await self.db.execute(select(model).where(model.user_id == user_id))
            ).scalar_one_or_none()

        async def many(model, order=None):
            stmt = select(model).where(model.user_id == user_id)
            if order is not None:
                stmt = stmt.order_by(order)
            return list((await self.db.execute(stmt)).scalars().all())

        profile = await one(Profile)
        target = await one(NutritionTarget)
        calibration = await one(CalibrationStatus)
        weights = await many(WeightLog, WeightLog.logged_on)
        entries = await many(DiaryEntry, DiaryEntry.entry_date)
        favorites = await many(FoodFavorite)
        coaching = await many(CoachingWarningState)
        custom_foods = list(
            (
                await self.db.execute(select(Food).where(Food.owner_user_id == user_id))
            ).scalars().all()
        )

        return {
            "exported_at": datetime.now(UTC).isoformat(),
            "user": _dump(user),
            "profile": _dump(profile) if profile else None,
            "nutrition_target": _dump(target) if target else None,
            "calibration_status": _dump(calibration) if calibration else None,
            "weight_logs": [_dump(w) for w in weights],
            "diary_entries": [_dump(e) for e in entries],
            "favorites": [_dump(f) for f in favorites],
            "custom_foods": [_dump(f) for f in custom_foods],
            "coaching_state": [_dump(c) for c in coaching],
        }

    async def export_csv(self, user_id: int, dataset: str) -> str:
        """A spreadsheet-friendly CSV of one dataset (diary or weight)."""
        buf = io.StringIO()
        writer = csv.writer(buf)

        if dataset == "weight":
            writer.writerow(["logged_on", "weight_kg"])
            logs = (
                await self.db.execute(
                    select(WeightLog)
                    .where(WeightLog.user_id == user_id)
                    .order_by(WeightLog.logged_on)
                )
            ).scalars().all()
            for w in logs:
                writer.writerow([w.logged_on.isoformat(), w.weight_kg])
        else:  # diary
            writer.writerow(
                ["entry_date", "meal", "food", "grams", "kcal", "protein_g", "fat_g", "carb_g"]
            )
            rows = (
                await self.db.execute(
                    select(DiaryEntry, Food)
                    .join(Food, Food.id == DiaryEntry.food_id)
                    .where(DiaryEntry.user_id == user_id)
                    .order_by(DiaryEntry.entry_date, DiaryEntry.created_at)
                )
            ).all()
            for entry, food in rows:
                f = entry.grams / 100.0
                writer.writerow(
                    [
                        entry.entry_date.isoformat(),
                        entry.meal,
                        food.name,
                        round(entry.grams, 1),
                        round(food.kcal_100g * f, 1),
                        round(food.protein_100g * f, 1),
                        round(food.fat_100g * f, 1),
                        round(food.carb_100g * f, 1),
                    ]
                )
        return buf.getvalue()

    async def delete(self, user_id: int, password: str) -> None:
        """Erase the account after re-authenticating. Cascades to all owned rows."""
        user = await self._get_user(user_id)
        if not verify_password(password, user.password_hash):
            raise UnauthorizedError("Password is incorrect")
        await self.db.delete(user)
        await self.db.commit()
