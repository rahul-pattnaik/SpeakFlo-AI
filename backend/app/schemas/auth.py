from pydantic import BaseModel

from .user import AuthUserResponse


class RegisterRequest(BaseModel):
    email: str
    password: str
    full_name: str
    phone_number: str | None = None
    auth_provider: str = "email"
    auth_provider_id: str | None = None


class LoginRequest(BaseModel):
    email: str
    password: str


class TokenPair(BaseModel):
    access_token: str
    refresh_token: str
    expires_in: int


class AuthResponse(BaseModel):
    success: bool = True
    user: AuthUserResponse
    tokens: TokenPair


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class RefreshTokenResponse(BaseModel):
    access_token: str
    expires_in: int
