"""Auth endpoints — register, login, refresh, me."""

from fastapi import APIRouter, Depends, status

from app.core.config import settings
from app.core.deps import CurrentUser, DbSession
from app.core.ratelimit import RateLimiter
from app.modules.auth.schemas import (
    ChangePasswordRequest,
    ForgotPasswordRequest,
    LoginRequest,
    RefreshRequest,
    RegisterRequest,
    ResetPasswordRequest,
    TokenPair,
    UpdateProfileRequest,
    UserOut,
    VerifyEmailRequest,
)
from app.modules.auth.service import AuthService

router = APIRouter(prefix="/auth", tags=["auth"])

# Brute-force guards, per client IP (in-memory; single worker).
_login_limit = RateLimiter("login", settings.LOGIN_RATE_LIMIT, settings.LOGIN_RATE_WINDOW_SECONDS)
_register_limit = RateLimiter(
    "register", settings.REGISTER_RATE_LIMIT, settings.REGISTER_RATE_WINDOW_SECONDS
)
# Each of these triggers an outbound email — throttle harder.
_email_limit = RateLimiter(
    "email_send", settings.EMAIL_SEND_RATE_LIMIT, settings.EMAIL_SEND_RATE_WINDOW_SECONDS
)


@router.post(
    "/register",
    response_model=UserOut,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(_register_limit)],
)
async def register(payload: RegisterRequest, db: DbSession) -> UserOut:
    user = await AuthService(db).register(payload)
    return UserOut.model_validate(user)


@router.post("/login", response_model=TokenPair, dependencies=[Depends(_login_limit)])
async def login(payload: LoginRequest, db: DbSession) -> TokenPair:
    return await AuthService(db).login(payload)


@router.post("/refresh", response_model=TokenPair)
async def refresh(payload: RefreshRequest, db: DbSession) -> TokenPair:
    return await AuthService(db).refresh(payload.refresh_token)


@router.get("/me", response_model=UserOut)
async def me(user: CurrentUser) -> UserOut:
    return UserOut.model_validate(user)


@router.patch("/me", response_model=UserOut)
async def update_me(
    payload: UpdateProfileRequest, user: CurrentUser, db: DbSession
) -> UserOut:
    """Edit the signed-in user's name and/or email. Changing the email resets
    verification and sends a fresh confirmation link to the new address."""
    updated = await AuthService(db).update_profile(user, payload)
    return UserOut.model_validate(updated)


@router.post(
    "/forgot-password",
    status_code=status.HTTP_202_ACCEPTED,
    dependencies=[Depends(_email_limit)],
)
async def forgot_password(payload: ForgotPasswordRequest, db: DbSession) -> dict:
    """Email a reset link if the account exists. Always 202 — never reveals
    whether the address is registered (no account enumeration)."""
    await AuthService(db).forgot_password(payload.email)
    return {"status": "ok"}


@router.post("/change-password")
async def change_password(
    payload: ChangePasswordRequest, user: CurrentUser, db: DbSession
) -> dict:
    """Change the password of the signed-in user. Requires the current password."""
    await AuthService(db).change_password(
        user, payload.current_password, payload.new_password
    )
    return {"status": "ok"}


@router.post("/reset-password")
async def reset_password(payload: ResetPasswordRequest, db: DbSession) -> dict:
    """Set a new password from a valid reset token. The link is single-use; the
    client should send the user to /login afterwards."""
    await AuthService(db).reset_password(payload.token, payload.new_password)
    return {"status": "ok"}


@router.post("/verify-email")
async def verify_email(payload: VerifyEmailRequest, db: DbSession) -> dict:
    await AuthService(db).verify_email(payload.token)
    return {"status": "ok"}


@router.post(
    "/resend-verification",
    status_code=status.HTTP_202_ACCEPTED,
    dependencies=[Depends(_email_limit)],
)
async def resend_verification(user: CurrentUser, db: DbSession) -> dict:
    await AuthService(db).resend_verification(user)
    return {"status": "ok"}
