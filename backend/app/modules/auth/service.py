"""Auth business logic."""

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.i18n import tr
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.modules.auth.schemas import LoginRequest, RegisterRequest, TokenPair
from app.modules.identity.models import User
from app.shared.exceptions import ConflictError, UnauthorizedError


class AuthService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def register(self, payload: RegisterRequest) -> User:
        email = payload.email.lower()
        exists = (
            await self.db.execute(select(User.id).where(User.email == email))
        ).scalar_one_or_none()
        if exists is not None:
            raise ConflictError(tr("error.email_exists"))

        # First account to register becomes the owner/admin (spec §2).
        count = (await self.db.execute(select(func.count(User.id)))).scalar_one()
        user = User(
            email=email,
            password_hash=hash_password(payload.password),
            full_name=payload.full_name,
            role="admin" if count == 0 else "user",
        )
        self.db.add(user)
        await self.db.commit()
        await self.db.refresh(user)
        return user

    def _issue(self, user: User) -> TokenPair:
        return TokenPair(
            access_token=create_access_token(str(user.id), role=user.role),
            refresh_token=create_refresh_token(str(user.id)),
        )

    async def login(self, payload: LoginRequest) -> TokenPair:
        user = (
            await self.db.execute(select(User).where(User.email == payload.email.lower()))
        ).scalar_one_or_none()
        if user is None or not user.is_active or not verify_password(
            payload.password, user.password_hash
        ):
            raise UnauthorizedError(tr("error.invalid_credentials"))
        return self._issue(user)

    async def refresh(self, refresh_token: str) -> TokenPair:
        payload = decode_token(refresh_token)
        if not payload or payload.get("type") != "refresh":
            raise UnauthorizedError("Invalid refresh token")
        user = (
            await self.db.execute(select(User).where(User.id == int(payload["sub"])))
        ).scalar_one_or_none()
        if user is None or not user.is_active:
            raise UnauthorizedError("User not found")
        return self._issue(user)
