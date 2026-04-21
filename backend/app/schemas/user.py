from datetime import datetime

from pydantic import BaseModel, ConfigDict


class AuthUserResponse(BaseModel):
    id: int
    email: str
    full_name: str
    english_level: str
    subscription_tier: str


class ProfileResponse(AuthUserResponse):
    is_active: bool
    email_verified: bool
    created_at: datetime
    updated_at: datetime | None


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    email: str
    level: str
    created_at: datetime


def auth_user_from_user(user) -> AuthUserResponse:
    return AuthUserResponse(
        id=user.id,
        email=user.email,
        full_name=user.name,
        english_level=user.level,
        subscription_tier=user.subscription_tier,
    )


def profile_from_user(user) -> ProfileResponse:
    return ProfileResponse(
        id=user.id,
        email=user.email,
        full_name=user.name,
        english_level=user.level,
        subscription_tier=user.subscription_tier,
        is_active=user.is_active,
        email_verified=user.email_verified,
        created_at=user.created_at,
        updated_at=user.updated_at,
    )
