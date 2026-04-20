from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from ..core.config import settings
from ..core.security import (
    create_access_token,
    create_refresh_token,
    decode_refresh_token,
    hash_password,
    validate_password_strength,
    verify_password,
)
from ..models import User
from ..schemas.auth import AuthResponse, LoginRequest, RegisterRequest, TokenPair
from ..schemas.user import auth_user_from_user


class AuthService:
    def __init__(self, db: Session):
        self.db = db

    def register(self, payload: RegisterRequest) -> AuthResponse:
        email = payload.email.lower()

        if payload.auth_provider == "email" and not validate_password_strength(
            payload.password
        ):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    "Password must be at least 8 characters with uppercase, "
                    "lowercase, number and special character"
                ),
            )

        existing_user = self.db.query(User).filter(User.email == email).first()
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="User with this email already exists",
            )

        new_user = User(
            name=payload.full_name,
            email=email,
            level="Beginner",
            password_hash=hash_password(payload.password),
            email_verified=payload.auth_provider != "email",
            is_active=True,
            subscription_tier="free",
        )

        self.db.add(new_user)
        try:
            self.db.commit()
        except IntegrityError as exc:
            self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="User with this email already exists",
            ) from exc

        self.db.refresh(new_user)

        return AuthResponse(
            user=auth_user_from_user(new_user),
            tokens=TokenPair(
                access_token=create_access_token(new_user.id, new_user.email),
                refresh_token=create_refresh_token(new_user.id, new_user.email),
                expires_in=settings.access_token_expire_seconds,
            ),
        )

    def login(self, payload: LoginRequest) -> AuthResponse:
        email = payload.email.lower()
        user = self.db.query(User).filter(User.email == email).first()

        if not user or not verify_password(payload.password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password",
            )

        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Account has been deactivated",
            )

        user.last_login_at = datetime.now(timezone.utc)
        self.db.commit()
        self.db.refresh(user)

        return AuthResponse(
            user=auth_user_from_user(user),
            tokens=TokenPair(
                access_token=create_access_token(user.id, user.email),
                refresh_token=create_refresh_token(user.id, user.email),
                expires_in=settings.access_token_expire_seconds,
            ),
        )

    def refresh_token(self, refresh_token: str) -> dict:
        payload = decode_refresh_token(refresh_token)
        user = self.db.get(User, int(payload["sub"]))

        if not user or not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid refresh token",
            )

        return {
            "access_token": create_access_token(user.id, user.email),
            "expires_in": settings.access_token_expire_seconds,
        }
