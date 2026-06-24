"""Admin: user management (spec §2 — owner manages partners/clients)."""

from datetime import datetime

from fastapi import APIRouter
from pydantic import Field
from sqlalchemy import select

from app.core.deps import AdminUser, DbSession
from app.modules.identity.models import User
from app.shared.base_schema import APIModel
from app.shared.exceptions import NotFoundError

admin_router = APIRouter(prefix="/admin/users", tags=["admin:users"])


class AdminUserOut(APIModel):
    id: int
    email: str
    full_name: str | None
    role: str
    is_active: bool
    email_verified: bool
    created_at: datetime


class AdminUserPatch(APIModel):
    role: str | None = Field(default=None, pattern="^(admin|user)$")
    is_active: bool | None = None


@admin_router.get("", response_model=list[AdminUserOut])
async def list_users(admin: AdminUser, db: DbSession) -> list[AdminUserOut]:
    users = (await db.execute(select(User).order_by(User.id))).scalars().all()
    return [AdminUserOut.model_validate(u) for u in users]


@admin_router.patch("/{user_id}", response_model=AdminUserOut)
async def patch_user(
    user_id: int, payload: AdminUserPatch, admin: AdminUser, db: DbSession
) -> AdminUserOut:
    user = (await db.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
    if user is None:
        raise NotFoundError("User not found")
    if payload.role is not None:
        user.role = payload.role
    if payload.is_active is not None:
        user.is_active = payload.is_active
    await db.commit()
    await db.refresh(user)
    return AdminUserOut.model_validate(user)
