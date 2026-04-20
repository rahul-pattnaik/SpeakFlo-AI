from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from ...dependencies import get_current_user, get_db
from ...schemas.auth import (
    AuthResponse,
    LoginRequest,
    RefreshTokenRequest,
    RefreshTokenResponse,
    RegisterRequest,
)
from ...schemas.user import ProfileResponse
from ...services.auth_service import AuthService

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, db: Session = Depends(get_db)):
    return AuthService(db).register(payload)


@router.post("/login", response_model=AuthResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    return AuthService(db).login(payload)


@router.post("/refresh-token", response_model=RefreshTokenResponse)
def refresh_token(payload: RefreshTokenRequest, db: Session = Depends(get_db)):
    return AuthService(db).refresh_token(payload.refresh_token)


@router.post("/logout")
def logout():
    return {"success": True, "message": "Logged out successfully"}


@router.get("/me", response_model=ProfileResponse)
def read_current_user(current_user=Depends(get_current_user)):
    return current_user
