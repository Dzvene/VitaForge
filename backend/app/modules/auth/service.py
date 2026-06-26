"""Auth business logic."""

import hashlib
import secrets
from datetime import UTC, datetime, timedelta

from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.i18n import tr
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.modules.auth.emails import send_password_reset_email, send_verification_email
from app.modules.auth.models import (
    PURPOSE_EMAIL_VERIFICATION,
    PURPOSE_PASSWORD_RESET,
    EmailToken,
)
from app.modules.auth.schemas import LoginRequest, RegisterRequest, TokenPair
from app.modules.identity.models import User
from app.shared.exceptions import ConflictError, UnauthorizedError, ValidationError


def _hash_token(raw: str) -> str:
    return hashlib.sha256(raw.encode()).hexdigest()


def _aware(dt: datetime) -> datetime:
    """Treat a naive datetime (SQLite round-trips lose tzinfo) as UTC."""
    return dt if dt.tzinfo is not None else dt.replace(tzinfo=UTC)


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
        # Best-effort: kick off email verification. A mail failure never blocks
        # signup (send_email swallows its own errors).
        await self._issue_verification(user)
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

    # ----- email tokens (verification + password reset) -----

    async def _new_token(self, user_id: int, purpose: str, ttl: timedelta) -> str:
        """Create a single-use token row, return the raw secret to email out.

        Any earlier unused token of the same purpose for this user is voided so a
        fresh request always supersedes a stale link.
        """
        await self.db.execute(
            update(EmailToken)
            .where(
                EmailToken.user_id == user_id,
                EmailToken.purpose == purpose,
                EmailToken.used_at.is_(None),
            )
            .values(used_at=datetime.now(UTC))
        )
        raw = secrets.token_urlsafe(32)
        self.db.add(
            EmailToken(
                user_id=user_id,
                purpose=purpose,
                token_hash=_hash_token(raw),
                expires_at=datetime.now(UTC) + ttl,
            )
        )
        await self.db.commit()
        return raw

    async def _consume_token(self, raw: str, purpose: str) -> User:
        """Validate + atomically burn a token; return its user. Raises on bad/expired."""
        token = (
            await self.db.execute(
                select(EmailToken).where(
                    EmailToken.token_hash == _hash_token(raw),
                    EmailToken.purpose == purpose,
                )
            )
        ).scalar_one_or_none()
        if (
            token is None
            or token.used_at is not None
            or _aware(token.expires_at) < datetime.now(UTC)
        ):
            raise ValidationError(tr("error.invalid_or_expired_token"))
        token.used_at = datetime.now(UTC)
        user = (
            await self.db.execute(select(User).where(User.id == token.user_id))
        ).scalar_one_or_none()
        if user is None:
            raise ValidationError(tr("error.invalid_or_expired_token"))
        return user

    async def _issue_verification(self, user: User) -> None:
        raw = await self._new_token(
            user.id,
            PURPOSE_EMAIL_VERIFICATION,
            timedelta(hours=settings.EMAIL_VERIFICATION_TTL_HOURS),
        )
        await send_verification_email(user.email, raw)

    async def verify_email(self, raw: str) -> None:
        user = await self._consume_token(raw, PURPOSE_EMAIL_VERIFICATION)
        if not user.email_verified:
            user.email_verified = True
            user.email_verified_at = datetime.now(UTC)
        await self.db.commit()

    async def resend_verification(self, user: User) -> None:
        """Re-send to the current (authenticated) user. No-op if already verified."""
        if user.email_verified:
            raise ConflictError(tr("error.email_already_verified"))
        await self._issue_verification(user)

    async def forgot_password(self, email: str) -> None:
        """Email a reset link if the account exists. Always silent (no enumeration)."""
        user = (
            await self.db.execute(select(User).where(User.email == email.lower()))
        ).scalar_one_or_none()
        if user is None or not user.is_active:
            return
        raw = await self._new_token(
            user.id,
            PURPOSE_PASSWORD_RESET,
            timedelta(minutes=settings.PASSWORD_RESET_TTL_MINUTES),
        )
        await send_password_reset_email(user.email, raw)

    async def change_password(
        self, user: User, current_password: str, new_password: str
    ) -> None:
        """Change the password of an authenticated user.

        Requires the current password (re-auth), so a hijacked session can't
        silently lock the owner out. Rejects a no-op change. Any outstanding
        reset tokens are voided — the password just changed deliberately.
        """
        if not verify_password(current_password, user.password_hash):
            raise UnauthorizedError(tr("error.current_password_wrong"))
        if verify_password(new_password, user.password_hash):
            raise ValidationError(tr("error.password_unchanged"))
        user.password_hash = hash_password(new_password)
        await self.db.execute(
            update(EmailToken)
            .where(
                EmailToken.user_id == user.id,
                EmailToken.purpose == PURPOSE_PASSWORD_RESET,
                EmailToken.used_at.is_(None),
            )
            .values(used_at=datetime.now(UTC))
        )
        await self.db.commit()

    async def reset_password(self, raw: str, new_password: str) -> None:
        user = await self._consume_token(raw, PURPOSE_PASSWORD_RESET)
        user.password_hash = hash_password(new_password)
        # Any other outstanding reset tokens for this user are now void.
        await self.db.execute(
            update(EmailToken)
            .where(
                EmailToken.user_id == user.id,
                EmailToken.purpose == PURPOSE_PASSWORD_RESET,
                EmailToken.used_at.is_(None),
            )
            .values(used_at=datetime.now(UTC))
        )
        await self.db.commit()
