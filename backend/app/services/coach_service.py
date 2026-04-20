import json
from datetime import date, datetime, timezone
from urllib import error, request

from sqlalchemy.orm import Session

from ..core.config import settings
from ..models import CoachInteraction, WeakWord
from ..schemas.coach import (
    CoachRequest,
    CoachResponse,
    VocabularyDailyResponse,
    VocabularyReviewRequest,
    VocabularyReviewResponse,
    VocabularyWord,
)

VOCABULARY_BANK = {
    "Beginner": [
        ("fresh", "recently made or picked; not old", "These vegetables are fresh from the farm."),
        ("basket", "a container used to carry things", "She put tomatoes in her basket."),
        ("vendor", "a person who sells things", "The vendor smiled and showed the prices."),
        ("bargain", "a good deal at a low price", "I found a bargain on green chilies."),
        ("carry", "to hold and take something somewhere", "I carried the bag home carefully."),
        ("choose", "to pick one thing from many options", "Please choose the ripest bananas."),
        ("crowded", "full of many people", "The market was crowded in the evening."),
    ],
    "Intermediate": [
        ("purchase", "to buy something", "She purchased vegetables for the whole week."),
        ("affordable", "not too expensive", "The fruit at this shop is affordable."),
        ("arrange", "to put things in order", "The shopkeeper arranged the vegetables neatly."),
        ("compare", "to look at differences between things", "I compare prices before I buy."),
        ("seasonal", "available during a particular time of year", "Mangoes are seasonal fruits."),
        ("negotiate", "to discuss in order to reach an agreement", "He negotiated the final price politely."),
        ("ingredient", "an item used to make a dish", "Onions are an important ingredient in this curry."),
    ],
    "Advanced": [
        ("nourishing", "helpful for health and growth", "A nourishing meal starts with good produce."),
        ("meticulous", "very careful and precise", "She was meticulous when selecting vegetables."),
        ("evaluate", "to judge the quality or value of something", "Consumers evaluate freshness before paying."),
        ("abundant", "available in large amounts", "Fresh herbs were abundant in the market today."),
        ("sustainable", "able to continue without harming the future", "We should support sustainable farming."),
        ("procure", "to obtain something with effort", "Restaurants procure vegetables every morning."),
        ("versatile", "useful in many different ways", "Potatoes are versatile ingredients in cooking."),
    ],
}


class CoachService:
    def __init__(self, db: Session):
        self.db = db

    def preview_respond(self, user_level: str, payload: CoachRequest) -> CoachResponse:
        generator = {
            "conversation": self._conversation_response,
            "grammar": self._grammar_response,
            "speaking": self._speaking_response,
        }[payload.mode]
        result = generator(user_level, payload.user_input)
        return CoachResponse(
            mode=payload.mode,
            reply=result["reply"],
            corrected_text=result.get("corrected_text"),
            explanation=result.get("explanation"),
            examples=result.get("examples", []),
            follow_up_question=result.get("follow_up_question"),
            practice_question=result.get("practice_question"),
            fluency_feedback=result.get("fluency_feedback"),
            source=result["source"],
            generated_at=datetime.now(timezone.utc),
        )

    def respond(self, user_id: int, user_level: str, payload: CoachRequest) -> CoachResponse:
        generator = {
            "conversation": self._conversation_response,
            "grammar": self._grammar_response,
            "speaking": self._speaking_response,
        }[payload.mode]

        result = generator(user_level, payload.user_input)
        response = CoachResponse(
            mode=payload.mode,
            reply=result["reply"],
            corrected_text=result.get("corrected_text"),
            explanation=result.get("explanation"),
            examples=result.get("examples", []),
            follow_up_question=result.get("follow_up_question"),
            practice_question=result.get("practice_question"),
            fluency_feedback=result.get("fluency_feedback"),
            source=result["source"],
            generated_at=datetime.now(timezone.utc),
        )
        self._log_interaction(user_id, payload.mode, payload.user_input, response.model_dump())
        return response

    def get_daily_vocabulary(self, user_id: int, user_level: str) -> VocabularyDailyResponse:
        words = self._pick_daily_words(user_level)
        revision_words = self._get_revision_words(user_id)
        return self._build_vocabulary_response(words, revision_words)

    def preview_daily_vocabulary(self, user_level: str) -> VocabularyDailyResponse:
        words = self._pick_daily_words(user_level)
        return self._build_vocabulary_response(words, [])

    def _build_vocabulary_response(
        self, words: list[tuple[str, str, str]], revision_words: list[str]
    ) -> VocabularyDailyResponse:
        payload_words = [
            VocabularyWord(
                word=word,
                meaning=meaning,
                example=example,
                learner_prompt=f"What does '{word}' mean in easy English?",
                revision_hint=f"Make your own sentence with '{word}'.",
                is_weak=word in revision_words,
            )
            for word, meaning, example in words
        ]

        return VocabularyDailyResponse(
            focus_date=date.today().isoformat(),
            words=payload_words,
            revision_words=revision_words,
            source="local-curated",
        )

    def review_vocabulary(
        self, user_id: int, user_level: str, payload: VocabularyReviewRequest
    ) -> VocabularyReviewResponse:
        source = "local-curated"
        feedback_data = self._fallback_vocabulary_review(payload.word, payload.user_sentence)

        if settings.openai_api_key:
            model_result = self._generate_with_openai(
                instructions=(
                    "You are SpeakFlo AI, an English coach for Indian learners. "
                    "Review the learner's vocabulary usage and respond with strict JSON: "
                    '{"feedback":"string","corrected_sentence":"string","example":"string","should_review_again":true}. '
                    "Use easy English, be kind, and keep each field concise."
                ),
                user_input=(
                    f"Learner level: {user_level}\n"
                    f"Word: {payload.word}\n"
                    f"Meaning attempt: {payload.user_meaning or 'not provided'}\n"
                    f"Sentence: {payload.user_sentence}\n"
                    f"Confidence: {'high' if payload.confident else 'low'}"
                ),
            )
            if model_result:
                feedback_data = model_result
                source = "openai"

        should_review_again = bool(
            feedback_data.get("should_review_again", not payload.confident)
        )
        self._upsert_weak_word(user_id, payload.word, should_review_again)

        response = VocabularyReviewResponse(
            word=payload.word,
            feedback=feedback_data["feedback"],
            corrected_sentence=feedback_data.get("corrected_sentence"),
            example=feedback_data["example"],
            should_review_again=should_review_again,
            revision_words=self._get_revision_words(user_id),
            source=source,
        )
        self._log_interaction(
            user_id,
            "vocabulary",
            payload.user_sentence,
            response.model_dump(),
        )
        return response

    def preview_review_vocabulary(
        self, user_level: str, payload: VocabularyReviewRequest
    ) -> VocabularyReviewResponse:
        feedback_data = self._fallback_vocabulary_review(payload.word, payload.user_sentence)
        source = "local-curated"

        if settings.openai_api_key:
            model_result = self._generate_with_openai(
                instructions=(
                    "You are SpeakFlo AI, an English coach for Indian learners. "
                    "Review the learner's vocabulary usage and respond with strict JSON: "
                    '{"feedback":"string","corrected_sentence":"string","example":"string","should_review_again":true}. '
                    "Use easy English, be kind, and keep each field concise."
                ),
                user_input=(
                    f"Learner level: {user_level}\n"
                    f"Word: {payload.word}\n"
                    f"Meaning attempt: {payload.user_meaning or 'not provided'}\n"
                    f"Sentence: {payload.user_sentence}\n"
                    f"Confidence: {'high' if payload.confident else 'low'}"
                ),
            )
            if model_result:
                feedback_data = model_result
                source = "openai"

        return VocabularyReviewResponse(
            word=payload.word,
            feedback=feedback_data["feedback"],
            corrected_sentence=feedback_data.get("corrected_sentence"),
            example=feedback_data["example"],
            should_review_again=bool(
                feedback_data.get("should_review_again", not payload.confident)
            ),
            revision_words=[],
            source=source,
        )

    def _conversation_response(self, user_level: str, user_input: str) -> dict:
        fallback = self._fallback_conversation(user_input)
        if not settings.openai_api_key:
            return {**fallback, "source": "local-fallback"}

        result = self._generate_with_openai(
            instructions=(
                "You are SpeakFlo AI, a friendly spoken-English coach. "
                "For conversation mode, reply naturally, softly correct the sentence, "
                "explain the correction in easy English, and ask one follow-up question. "
                "Return strict JSON with keys: reply, corrected_text, explanation, follow_up_question."
            ),
            user_input=f"Learner level: {user_level}\nLearner sentence: {user_input}",
        )
        if not result:
            return {**fallback, "source": "local-fallback"}

        return {
            "reply": result["reply"],
            "corrected_text": result.get("corrected_text"),
            "explanation": result.get("explanation"),
            "follow_up_question": result.get("follow_up_question"),
            "source": "openai",
        }

    def _grammar_response(self, user_level: str, user_input: str) -> dict:
        fallback = self._fallback_grammar(user_input)
        if not settings.openai_api_key:
            return {**fallback, "source": "local-fallback"}

        result = self._generate_with_openai(
            instructions=(
                "You are SpeakFlo AI in grammar mode. "
                "Check the sentence, explain the mistake in easy English, provide exactly two similar examples, "
                "and give one short practice question. "
                "Return strict JSON with keys: reply, corrected_text, explanation, examples, practice_question."
            ),
            user_input=f"Learner level: {user_level}\nSentence: {user_input}",
        )
        if not result:
            return {**fallback, "source": "local-fallback"}

        return {
            "reply": result["reply"],
            "corrected_text": result.get("corrected_text"),
            "explanation": result.get("explanation"),
            "examples": result.get("examples", []),
            "practice_question": result.get("practice_question"),
            "source": "openai",
        }

    def _speaking_response(self, user_level: str, user_input: str) -> dict:
        fallback = self._fallback_speaking(user_input)
        if not settings.openai_api_key:
            return {**fallback, "source": "local-fallback"}

        result = self._generate_with_openai(
            instructions=(
                "You are SpeakFlo AI in speaking mode. "
                "The transcript comes from speech-to-text. Analyze grammar and fluency, "
                "suggest a smoother corrected version, explain briefly, and ask one next speaking prompt. "
                "Return strict JSON with keys: reply, corrected_text, explanation, fluency_feedback, follow_up_question."
            ),
            user_input=f"Learner level: {user_level}\nTranscript: {user_input}",
        )
        if not result:
            return {**fallback, "source": "local-fallback"}

        return {
            "reply": result["reply"],
            "corrected_text": result.get("corrected_text"),
            "explanation": result.get("explanation"),
            "fluency_feedback": result.get("fluency_feedback"),
            "follow_up_question": result.get("follow_up_question"),
            "source": "openai",
        }

    def _generate_with_openai(self, instructions: str, user_input: str) -> dict | None:
        body = {
            "model": settings.openai_text_model,
            "input": [
                {"role": "system", "content": instructions},
                {"role": "user", "content": user_input},
            ],
        }
        req = request.Request(
            f"{settings.openai_base_url.rstrip('/')}/responses",
            data=json.dumps(body).encode("utf-8"),
            headers={
                "Authorization": f"Bearer {settings.openai_api_key}",
                "Content-Type": "application/json",
            },
            method="POST",
        )

        try:
            with request.urlopen(req, timeout=30) as response:
                payload = json.loads(response.read().decode("utf-8"))
        except (error.URLError, error.HTTPError, TimeoutError, json.JSONDecodeError):
            return None

        output_text = self._extract_output_text(payload)
        if not output_text:
            return None

        return self._parse_json_object(output_text)

    def _extract_output_text(self, payload: dict) -> str | None:
        for item in payload.get("output", []):
            if item.get("type") != "message":
                continue
            for content in item.get("content", []):
                if content.get("type") == "output_text" and content.get("text"):
                    return content["text"]
        return None

    def _parse_json_object(self, content: str) -> dict | None:
        try:
            return json.loads(content)
        except json.JSONDecodeError:
            pass

        start = content.find("{")
        end = content.rfind("}")
        if start == -1 or end == -1 or end <= start:
            return None

        try:
            return json.loads(content[start : end + 1])
        except json.JSONDecodeError:
            return None

    def _pick_daily_words(self, user_level: str) -> list[tuple[str, str, str]]:
        bank = VOCABULARY_BANK.get(user_level, VOCABULARY_BANK["Beginner"])
        offset = date.today().toordinal() % len(bank)
        words = []
        for index in range(5):
            words.append(bank[(offset + index) % len(bank)])
        return words

    def _get_revision_words(self, user_id: int) -> list[str]:
        weak_words = (
            self.db.query(WeakWord)
            .filter(WeakWord.user_id == user_id, WeakWord.error_count > 0)
            .order_by(WeakWord.updated_at.desc())
            .limit(5)
            .all()
        )
        return [item.word for item in weak_words]

    def _upsert_weak_word(self, user_id: int, word: str, should_review_again: bool) -> None:
        normalized_word = word.strip().lower()
        record = (
            self.db.query(WeakWord)
            .filter(WeakWord.user_id == user_id, WeakWord.word == normalized_word)
            .first()
        )

        if not record:
            record = WeakWord(user_id=user_id, word=normalized_word, error_count=0)
            self.db.add(record)

        if should_review_again:
            record.error_count += 1
        else:
            record.error_count = max(record.error_count - 1, 0)

        self.db.commit()

    def _log_interaction(self, user_id: int, mode: str, user_input: str, response_payload: dict) -> None:
        event = CoachInteraction(
            user_id=user_id,
            mode=mode,
            user_input=user_input,
            agent_response=json.dumps(response_payload),
        )
        self.db.add(event)
        self.db.commit()

    def _fallback_conversation(self, user_input: str) -> dict:
        corrected = self._simple_sentence_cleanup(user_input)
        explanation = "Use 'went to the market' for the place, and 'bought' for the past tense of 'buy'."
        return {
            "reply": f"Good try. A better sentence is: '{corrected}'",
            "corrected_text": corrected,
            "explanation": explanation,
            "follow_up_question": "What did you buy there?",
        }

    def _fallback_grammar(self, user_input: str) -> dict:
        corrected = self._simple_sentence_cleanup(user_input)
        return {
            "reply": f"Let's improve it: '{corrected}'",
            "corrected_text": corrected,
            "explanation": "Your idea is clear. The main fix is using the correct past tense and adding the right preposition when needed.",
            "examples": [
                "Yesterday I went to the park and met my friend.",
                "Last night she cooked dinner and watched a movie.",
            ],
            "practice_question": "Change this into correct past tense: 'Today I go school and meet teacher.'",
        }

    def _fallback_speaking(self, user_input: str) -> dict:
        corrected = self._simple_sentence_cleanup(user_input)
        return {
            "reply": f"I understood your idea well. A smoother version is: '{corrected}'",
            "corrected_text": corrected,
            "explanation": "Try speaking in short chunks and finish one idea before starting the next one.",
            "fluency_feedback": "Your message is understandable. Work on past tense and adding small linking words like 'to' and 'and'.",
            "follow_up_question": "Can you say the same idea again in one smooth sentence?",
        }

    def _fallback_vocabulary_review(self, word: str, user_sentence: str) -> dict:
        corrected = self._simple_sentence_cleanup(user_sentence)
        return {
            "feedback": f"Nice effort. Your sentence with '{word}' is close, and this version sounds more natural.",
            "corrected_sentence": corrected,
            "example": f"I used the word '{word}' in my English practice today.",
            "should_review_again": corrected != user_sentence,
        }

    def _simple_sentence_cleanup(self, sentence: str) -> str:
        fixed = " ".join(sentence.strip().split())
        replacements = {
            "went market": "went to the market",
            "buy vegetables": "bought vegetables",
            "go school": "went to school",
            "meet teacher": "met the teacher",
        }
        lowered = fixed.lower()
        for old, new in replacements.items():
            lowered = lowered.replace(old, new)

        if lowered:
            lowered = lowered[0].upper() + lowered[1:]
        if lowered and lowered[-1] not in ".!?":
            lowered += "."
        return lowered
