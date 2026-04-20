from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from ...dependencies import get_current_user, get_db
from ...models import User
from ...schemas.user import ProfileResponse, UserCreate, UserResponse

router = APIRouter(tags=["users"])
protected_router = APIRouter(prefix="/api/v1/user", tags=["user"])


@router.post("/users")
def create_user(user: UserCreate, db: Session = Depends(get_db)):
    new_user = User(name=user.name, email=user.email.lower(), level=user.level)
    db.add(new_user)

    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="User with this email already exists",
        ) from exc

    db.refresh(new_user)
    return {"message": "User created successfully", "user_id": new_user.id}


@router.get("/users", response_model=list[UserResponse])
def get_users(db: Session = Depends(get_db)):
    return db.query(User).order_by(User.id).all()


@protected_router.get("/profile", response_model=ProfileResponse)
def get_profile(current_user=Depends(get_current_user)):
    return current_user
