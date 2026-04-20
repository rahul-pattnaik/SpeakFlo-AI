# SpeakFlo AI - API Design Document

## Base URL
```txt
Development: http://localhost:8000
Production: https://api.speakfloai.com
```

## V1 Scope Freeze

This document defines the **v1 API contract** for the next implementation milestone.

### In Scope for V1
- Email/password authentication
- Authenticated learner profile bootstrap
- Session-based learning for `conversation`, `grammar`, `vocabulary`, and `speaking`
- Transcript-first speaking workflow
- Progress dashboard, weak areas, and recommendations
- Basic admin analytics and user/session visibility

### Explicitly Out of Scope for V1
- OAuth providers
- Email verification
- Forgot/reset password
- Full lesson platform
- Realtime WebRTC voice sessions
- Advanced phoneme-level pronunciation scoring
- Payments/subscription billing
- Rich content CMS

### Product Rule
Real learner usage is authenticated only. Preview/demo endpoints may exist during development, but they are not part of the v1 product contract.

## Authentication
All requests except auth endpoints require:
```txt
Authorization: Bearer {jwt_token}
X-API-Version: v1
```

---

## 1. Authentication Service

### POST /api/v1/auth/register
Register a learner with email/password.

**Request**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "full_name": "John Doe"
}
```

**Response**
```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "full_name": "John Doe",
    "english_level": "beginner",
    "subscription_tier": "free"
  },
  "tokens": {
    "access_token": "jwt",
    "refresh_token": "jwt",
    "expires_in": 900
  }
}
```

### POST /api/v1/auth/login
Login with email/password.

**Request**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Response**
Same as `POST /api/v1/auth/register`.

### POST /api/v1/auth/refresh-token
Refresh the access token.

**Request**
```json
{
  "refresh_token": "jwt"
}
```

**Response**
```json
{
  "access_token": "new_jwt",
  "expires_in": 900
}
```

### POST /api/v1/auth/logout
Logout the current learner.

**Response**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

### GET /api/v1/auth/me
Bootstrap the authenticated frontend session.

**Response**
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "full_name": "John Doe",
  "english_level": "beginner",
  "subscription_tier": "free",
  "is_active": true,
  "email_verified": false,
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-20T15:45:00Z"
}
```

### Deferred Auth Capabilities
- OAuth callback
- Verify email
- Forgot password
- Reset password

---

## 2. User Service

### GET /api/v1/user/profile
Get the learner profile.

**Response**
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "full_name": "John Doe",
  "english_level": "intermediate",
  "learning_goal": "Daily communication",
  "timezone": "Asia/Kolkata",
  "subscription_tier": "free",
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-20T15:45:00Z"
}
```

### PUT /api/v1/user/profile
Update the learner profile.

**Request**
```json
{
  "full_name": "John Doe Updated",
  "learning_goal": "Job interview preparation",
  "timezone": "Asia/Kolkata"
}
```

### PUT /api/v1/user/english-level
Update learner level after onboarding or assessment.

**Request**
```json
{
  "level": "intermediate"
}
```

### GET /api/v1/user/preferences
Get learner preferences.

**Response**
```json
{
  "lesson_duration_preference": "15min",
  "preferred_topics": ["daily_conversation", "job_interview"],
  "tts_voice_gender": "female",
  "tts_speech_rate": 1.0,
  "daily_reminder_enabled": true,
  "reminder_time": "09:00:00"
}
```

### PUT /api/v1/user/preferences
Update learner preferences.

---

## 3. Coach Sessions Service

All learning happens inside a session. Each learner interaction is stored as a session event so progress updates can be derived consistently.

### Supported Session Modes
- `conversation`
- `grammar`
- `vocabulary`
- `speaking`

### POST /api/v1/coach/sessions
Start a new learning session.

**Request**
```json
{
  "mode": "conversation",
  "title": "Daily market conversation",
  "topic": "daily_life"
}
```

**Response**
```json
{
  "session_id": "uuid",
  "mode": "conversation",
  "status": "active",
  "started_at": "2024-01-20T10:00:00Z"
}
```

### GET /api/v1/coach/sessions
List the authenticated learner's sessions.

**Query Params**
- `mode`: optional
- `limit`: 20
- `offset`: 0

**Response**
```json
{
  "total": 24,
  "limit": 20,
  "offset": 0,
  "items": [
    {
      "id": "uuid",
      "mode": "grammar",
      "status": "completed",
      "started_at": "2024-01-20T10:00:00Z",
      "ended_at": "2024-01-20T10:08:00Z",
      "score": 78,
      "source": "openai"
    }
  ]
}
```

### GET /api/v1/coach/sessions/:sessionId
Get full session detail with event history.

**Response**
```json
{
  "id": "uuid",
  "mode": "conversation",
  "status": "active",
  "started_at": "2024-01-20T10:00:00Z",
  "ended_at": null,
  "events": [
    {
      "id": "evt1",
      "event_type": "coach_feedback",
      "user_input": "Today I went market and buy vegetables.",
      "agent_output": "Good try. A better sentence is: 'Today I went to the market and bought vegetables.'",
      "corrected_text": "Today I went to the market and bought vegetables.",
      "explanation": "Use 'to the market' and the past tense 'bought'.",
      "metrics": {
        "grammar_score": 72
      },
      "created_at": "2024-01-20T10:01:00Z"
    }
  ],
  "summary": {
    "strengths": ["Clear message"],
    "weak_areas": ["past_tense", "prepositions"],
    "recommended_next_mode": "grammar"
  }
}
```

### POST /api/v1/coach/sessions/:sessionId/respond
Submit one learner interaction inside an active session.

**Request**
```json
{
  "input_type": "text",
  "user_input": "Today I went market and buy vegetables."
}
```

**Response**
```json
{
  "event_id": "evt1",
  "mode": "conversation",
  "reply": "Good try. A better sentence is: 'Today I went to the market and bought vegetables.'",
  "corrected_text": "Today I went to the market and bought vegetables.",
  "explanation": "Use 'to the market' and 'bought' because the action happened in the past.",
  "examples": [],
  "follow_up_question": "What vegetables did you buy?",
  "practice_question": null,
  "fluency_feedback": null,
  "source": "openai",
  "generated_at": "2024-01-20T10:01:00Z"
}
```

### POST /api/v1/coach/sessions/:sessionId/complete
Complete a session and trigger progress updates.

**Request**
```json
{
  "ended_reason": "user_finished"
}
```

**Response**
```json
{
  "session_id": "uuid",
  "status": "completed",
  "ended_at": "2024-01-20T10:10:00Z",
  "summary": {
    "overall_score": 76,
    "strengths": ["Clear communication"],
    "weak_areas": ["past_tense"],
    "recommended_next_mode": "grammar"
  }
}
```

### GET /api/v1/coach/vocabulary/daily
Get the learner's daily 5-word vocabulary set.

**Response**
```json
{
  "focus_date": "2024-01-20",
  "words": [
    {
      "word": "fresh",
      "meaning": "recently made or picked; not old",
      "example": "These vegetables are fresh from the farm.",
      "learner_prompt": "What does 'fresh' mean in easy English?",
      "revision_hint": "Make your own sentence with 'fresh'.",
      "is_weak": false
    }
  ],
  "revision_words": ["vendor"],
  "source": "openai"
}
```

### POST /api/v1/coach/vocabulary/review
Review one learner vocabulary attempt.

**Request**
```json
{
  "word": "fresh",
  "user_meaning": "It means new and good to eat.",
  "user_sentence": "I bought fresh tomatoes from the market.",
  "confident": true
}
```

**Response**
```json
{
  "word": "fresh",
  "feedback": "Nice effort. Your sentence is natural and clear.",
  "corrected_sentence": "I bought fresh tomatoes from the market.",
  "example": "Fresh vegetables are usually healthy and tasty.",
  "should_review_again": false,
  "revision_words": ["vendor"],
  "source": "openai"
}
```

---

## 4. Progress Service

### GET /api/v1/progress/dashboard
Get the learner dashboard rollup.

**Response**
```json
{
  "user_id": "uuid",
  "daily_stats": {
    "practice_minutes_today": 25,
    "sessions_completed_today": 3,
    "words_reviewed_today": 5,
    "streak": 15
  },
  "weekly_stats": {
    "practice_minutes": 160,
    "days_practiced": 5,
    "sessions_completed": 11,
    "words_reviewed": 18
  },
  "overall_stats": {
    "total_practice_hours": 18.5,
    "total_sessions_completed": 42,
    "total_words_reviewed": 96,
    "weak_words_count": 14,
    "overall_score": 74
  },
  "skill_scores": {
    "speaking": 68,
    "grammar": 76,
    "vocabulary": 79,
    "fluency": 66
  },
  "level_progression": {
    "current_level": "beginner",
    "progress_percentage": 38,
    "estimated_days_to_next_level": 21
  },
  "weak_areas": [
    {
      "area": "Past Tense",
      "confidence": 45,
      "priority": 8,
      "recommended_mode": "grammar"
    }
  ],
  "recommended_next_task": {
    "mode": "grammar",
    "reason": "You are repeatedly making past tense mistakes."
  }
}
```

### GET /api/v1/progress/timeline
Get progress data for charts.

**Query Params**
- `period`: `weekly` | `monthly` | `all`
- `metric`: `score` | `practice_minutes` | `words_reviewed`

**Response**
```json
{
  "metric": "score",
  "period": "monthly",
  "data": [
    {"date": "2024-01-01", "value": 65},
    {"date": "2024-01-08", "value": 68},
    {"date": "2024-01-15", "value": 72},
    {"date": "2024-01-20", "value": 74}
  ]
}
```

### GET /api/v1/progress/weak-areas
Get detailed weak-area analysis.

**Response**
```json
{
  "weak_areas": [
    {
      "id": "uuid",
      "area_type": "grammar",
      "area_name": "Past Tense",
      "error_count": 12,
      "last_error": "2024-01-19T15:30:00Z",
      "confidence_score": 45,
      "recommended_mode": "grammar",
      "focus_priority": 8
    }
  ]
}
```

### GET /api/v1/progress/recommendations
Get next recommended activities.

**Response**
```json
{
  "items": [
    {
      "mode": "vocabulary",
      "priority": 9,
      "reason": "You have 5 weak words waiting for revision."
    },
    {
      "mode": "speaking",
      "priority": 7,
      "reason": "Your fluency score is improving slowly and needs more practice."
    }
  ]
}
```

---

## 5. Speaking Service

### POST /api/v1/speaking/upload-audio
Upload learner audio for transcript-first speaking analysis.

**Request**
```txt
Content-Type: multipart/form-data
{
  "audio": <file>,
  "format": "wav" | "mp3" | "webm",
  "duration_seconds": 15,
  "context_type": "conversation" | "speaking_practice"
}
```

**Response**
```json
{
  "audio_id": "uuid",
  "transcript": "Today I went to the market and bought vegetables.",
  "duration_seconds": 15,
  "created_at": "2024-01-20T10:00:00Z"
}
```

### POST /api/v1/speaking/analyze-transcript
Run speaking-mode coaching on a transcript.

**Request**
```json
{
  "session_id": "uuid",
  "transcript": "Today I went market and buy vegetables."
}
```

**Response**
```json
{
  "reply": "I understood your idea well. A smoother version is: 'Today I went to the market and bought vegetables.'",
  "corrected_text": "Today I went to the market and bought vegetables.",
  "explanation": "Use 'bought' because the action happened in the past.",
  "fluency_feedback": "Your message is understandable. Work on past tense and linking words.",
  "follow_up_question": "Can you say that again in one smooth sentence?",
  "source": "openai"
}
```

### POST /api/v1/speaking/tts
Convert coach feedback text into playable audio.

**Request**
```json
{
  "text": "Good try. A better sentence is: Today I went to the market and bought vegetables.",
  "voice": "alloy"
}
```

**Response**
```json
{
  "audio_url": "https://...",
  "duration_seconds": 6
}
```

---

## 6. Admin API

### GET /api/v1/admin/users
Get users with filters.

**Query Params**
- `search`: email or name
- `subscription_tier`: `free` | `pro` | `premium`
- `english_level`: optional
- `limit`: 50
- `offset`: 0

### GET /api/v1/admin/sessions
Get learning sessions with filters.

**Query Params**
- `mode`: optional
- `status`: optional
- `limit`: 50
- `offset`: 0

### GET /api/v1/admin/analytics
Get admin analytics dashboard.

**Response**
```json
{
  "total_users": 5000,
  "active_users_today": 1200,
  "active_users_week": 3500,
  "avg_practice_minutes_per_user": 24,
  "session_completion_rate": 71,
  "top_modes": ["conversation", "vocabulary"],
  "total_ai_api_cost": 5200,
  "most_difficult_areas": ["past_tense", "prepositions"]
}
```

### GET /api/v1/admin/errors
Get recent platform and AI integration failures.

**Response**
```json
{
  "items": [
    {
      "id": "uuid",
      "service": "coach",
      "error_code": "EXTERNAL_API_ERROR",
      "message": "OpenAI request timed out",
      "created_at": "2024-01-20T10:35:00Z"
    }
  ]
}
```

---

## Standard Error Format
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request parameters",
    "details": [
      {
        "field": "email",
        "message": "Invalid email format"
      }
    ],
    "trace_id": "uuid",
    "timestamp": "2024-01-20T15:45:30Z"
  }
}
```

## Common HTTP Status Codes
- `400`: Bad Request
- `401`: Unauthorized
- `403`: Forbidden
- `404`: Not Found
- `409`: Conflict
- `429`: Too Many Requests
- `500`: Internal Server Error
- `503`: Service Unavailable

## Error Codes
- `VALIDATION_ERROR`
- `AUTH_REQUIRED`
- `TOKEN_EXPIRED`
- `INVALID_TOKEN`
- `INSUFFICIENT_PERMISSIONS`
- `RESOURCE_NOT_FOUND`
- `DUPLICATE_RESOURCE`
- `RATE_LIMIT_EXCEEDED`
- `EXTERNAL_API_ERROR`
- `DATABASE_ERROR`
- `INTERNAL_SERVER_ERROR`

## Rate Limiting
- Free tier: `100 requests/minute`
- Pro tier: `500 requests/minute`
- Premium tier: `2000 requests/minute`

Response headers:
```txt
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1705773930
```

## Pagination
All list endpoints support:
```txt
?limit=20&offset=0
```

Response format:
```json
{
  "total": 150,
  "limit": 20,
  "offset": 0,
  "items": []
}
```

## Versioning
- Current API version: `v1`
- Deprecation policy: 6-month notice before breaking changes
- Header: `X-API-Version: v1`

## Deferred Post-V1 Areas
- Assessment service
- Full lesson service
- Full vocabulary catalog and quiz engine
- Daily tasks service
- Achievements and badges
- Realtime chat WebSocket service
- Advanced pronunciation analysis and phoneme scoring
- Admin lesson/content management
