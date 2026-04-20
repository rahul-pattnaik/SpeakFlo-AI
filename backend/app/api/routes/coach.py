from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ...dependencies import get_current_user, get_db
from ...schemas.coach import (
    CoachRequest,
    CoachResponse,
    VocabularyDailyResponse,
    VocabularyReviewRequest,
    VocabularyReviewResponse,
)
from ...services.coach_service import CoachService

router = APIRouter(prefix="/api/v1/coach", tags=["coach"])


@router.post("/respond", response_model=CoachResponse)
def respond(
    payload: CoachRequest,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return CoachService(db).respond(current_user.id, current_user.english_level, payload)


@router.post("/preview/respond", response_model=CoachResponse)
def preview_respond(payload: CoachRequest, db: Session = Depends(get_db)):
    return CoachService(db).preview_respond("Beginner", payload)


@router.get("/vocabulary/daily", response_model=VocabularyDailyResponse)
def get_daily_vocabulary(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return CoachService(db).get_daily_vocabulary(
        current_user.id, current_user.english_level
    )


@router.get("/preview/vocabulary/daily", response_model=VocabularyDailyResponse)
def preview_daily_vocabulary(db: Session = Depends(get_db)):
    return CoachService(db).preview_daily_vocabulary("Beginner")


@router.post("/vocabulary/review", response_model=VocabularyReviewResponse)
def review_vocabulary(
    payload: VocabularyReviewRequest,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return CoachService(db).review_vocabulary(
        current_user.id, current_user.english_level, payload
    )


@router.post("/preview/vocabulary/review", response_model=VocabularyReviewResponse)
def preview_review_vocabulary(
    payload: VocabularyReviewRequest,
    db: Session = Depends(get_db),
):
    return CoachService(db).preview_review_vocabulary("Beginner", payload)
