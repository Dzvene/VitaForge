"""Admin: overview stats facade."""

from fastapi import APIRouter
from sqlalchemy import func, select

from app.core.deps import AdminUser, DbSession
from app.modules.diary.models import DiaryEntry
from app.modules.foods.models import Food
from app.modules.identity.models import User
from app.modules.weight.models import WeightLog
from app.shared.base_schema import APIModel

admin_router = APIRouter(prefix="/admin", tags=["admin:stats"])


class AdminStats(APIModel):
    users: int
    active_users: int
    admins: int
    foods: int
    custom_foods: int
    diary_entries: int
    weight_logs: int


async def _count(db, stmt) -> int:
    return (await db.execute(stmt)).scalar_one()


@admin_router.get("/stats", response_model=AdminStats)
async def stats(admin: AdminUser, db: DbSession) -> AdminStats:
    return AdminStats(
        users=await _count(db, select(func.count(User.id))),
        active_users=await _count(db, select(func.count(User.id)).where(User.is_active.is_(True))),
        admins=await _count(db, select(func.count(User.id)).where(User.role == "admin")),
        foods=await _count(db, select(func.count(Food.id))),
        custom_foods=await _count(
            db, select(func.count(Food.id)).where(Food.owner_user_id.is_not(None))
        ),
        diary_entries=await _count(db, select(func.count(DiaryEntry.id))),
        weight_logs=await _count(db, select(func.count(WeightLog.id))),
    )
