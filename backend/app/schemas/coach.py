from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


CoachMode = Literal["conversation", "grammar", "speaking"]


class CoachRequest(BaseModel):
    mode: CoachMode
    user_input: str = Field(min_length=1, max_length=2_000)


class CoachResponse(BaseModel):
    mode: CoachMode
    reply: str
    corrected_text: str | None = None
    explanation: str | None = None
    examples: list[str] = Field(default_factory=list)
    follow_up_question: str | None = None
    practice_question: str | None = None
    fluency_feedback: str | None = None
    source: str
    generated_at: datetime


class VocabularyWord(BaseModel):
    word: str
    meaning: str
    example: str
    learner_prompt: str
    revision_hint: str
    is_weak: bool = False


class VocabularyDailyResponse(BaseModel):
    focus_date: str
    words: list[VocabularyWord]
    revision_words: list[str] = Field(default_factory=list)
    source: str


class VocabularyReviewRequest(BaseModel):
    word: str = Field(min_length=1, max_length=100)
    user_sentence: str = Field(min_length=1, max_length=500)
    user_meaning: str | None = Field(default=None, max_length=300)
    confident: bool = True


class VocabularyReviewResponse(BaseModel):
    word: str
    feedback: str
    corrected_sentence: str | None = None
    example: str
    should_review_again: bool
    revision_words: list[str] = Field(default_factory=list)
    source: str
