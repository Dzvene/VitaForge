"""Auth schemas."""

from pydantic import EmailStr, Field

from app.shared.base_schema import APIModel


class RegisterRequest(APIModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    full_name: str | None = Field(default=None, max_length=255)


class LoginRequest(APIModel):
    email: EmailStr
    password: str = Field(min_length=8)


class TokenPair(APIModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshRequest(APIModel):
    refresh_token: str


class ForgotPasswordRequest(APIModel):
    email: EmailStr


class ResetPasswordRequest(APIModel):
    token: str = Field(min_length=8)
    new_password: str = Field(min_length=8, max_length=128)


class VerifyEmailRequest(APIModel):
    token: str = Field(min_length=8)


class ChangePasswordRequest(APIModel):
    current_password: str = Field(min_length=1)
    new_password: str = Field(min_length=8, max_length=128)


class UserOut(APIModel):
    id: int
    email: EmailStr
    full_name: str | None
    role: str
    is_active: bool
    email_verified: bool = False
