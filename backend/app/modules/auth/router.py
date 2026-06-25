"""Auth endpoints — register, login, refresh, me."""

from fastapi import APIRouter, Depends, status

from app.core.config import settings
from app.core.deps import CurrentUser, DbSession
from app.core.ratelimit import RateLimiter
from app.modules.auth.schemas import (
    LoginRequest,
    RefreshRequest,
    RegisterRequest,
    TokenPair,
    UserOut,
)
from app.modules.auth.service import AuthService

router = APIRouter(prefix="/auth", tags=["auth"])

# Brute-force guards, per client IP (in-memory; single worker).
_login_limit = RateLimiter("login", settings.LOGIN_RATE_LIMIT, settings.LOGIN_RATE_WINDOW_SECONDS)
_register_limit = RateLimiter(
    "register", settings.REGISTER_RATE_LIMIT, settings.REGISTER_RATE_WINDOW_SECONDS
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
