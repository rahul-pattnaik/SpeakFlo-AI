# SpeakFlo AI - API Design Document

## Base URL
```
Development: http://localhost:8000
Production: https://api.speakfloai.com
```

## Authentication
All requests (except auth endpoints) require:
```
Authorization: Bearer {jwt_token}
X-API-Version: v1
```

---

## 1. Authentication Service (Port 8001)

### POST /auth/register
Register new user with email/password or OAuth

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "full_name": "John Doe",
  "auth_provider": "email",
  "phone_number": "+919876543210"
}
```

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "full_name": "John Doe"
  },
  "tokens": {
    "access_token": "jwt",
    "refresh_token": "jwt",
    "expires_in": 900
  }
}
```

### POST /auth/login
Login with email/password

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Response:** Same as register

### POST /auth/oauth-callback
OAuth callback handler

**Request:**
```json
{
  "provider": "google",
  "code": "authorization_code"
}
```

**Response:** Same as register

### POST /auth/refresh-token
Refresh JWT token

**Request:**
```json
{
  "refresh_token": "jwt"
}
```

**Response:**
```json
{
  "access_token": "new_jwt",
  "expires_in": 900
}
```

### POST /auth/logout
Logout user (invalidate refresh token)

**Response:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

### POST /auth/verify-email
Verify email address

**Request:**
```json
{
  "token": "verification_token"
}
```

### POST /auth/forgot-password
Request password reset

**Request:**
```json
{
  "email": "user@example.com"
}
```

### POST /auth/reset-password
Reset password with token

**Request:**
```json
{
  "token": "reset_token",
  "password": "NewPassword123!"
}
```

---

## 2. User Service (Part of Auth Service)

### GET /api/v1/user/profile
Get current user's profile

**Response:**
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "full_name": "John Doe",
  "profile_picture_url": "https://...",
  "english_level": "intermediate",
  "learning_goal": "Daily communication",
  "timezone": "Asia/Kolkata",
  "subscription_tier": "free",
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-20T15:45:00Z"
}
```

### PUT /api/v1/user/profile
Update user profile

**Request:**
```json
{
  "full_name": "John Doe Updated",
  "profile_picture_url": "https://...",
  "learning_goal": "Job interview preparation",
  "preferred_learning_time": "09:00:00",
  "timezone": "Asia/Kolkata"
}
```

### PUT /api/v1/user/english-level
Update English level (requires assessment)

**Request:**
```json
{
  "level": "upper_intermediate"
}
```

### GET /api/v1/user/preferences
Get user learning preferences

**Response:**
```json
{
  "lesson_duration_preference": "15min",
  "preferred_topics": ["business", "daily_conversation"],
  "preferred_accents": "indian",
  "tts_voice_gender": "female",
  "tts_speech_rate": 1.0,
  "daily_reminder_enabled": true,
  "reminder_time": "09:00:00"
}
```

### PUT /api/v1/user/preferences
Update learning preferences

### DELETE /api/v1/user/account
Delete user account (GDPR compliant)

**Query Params:**
- `export_data`: boolean (export data before deletion)

---

## 3. Assessment Service (Port 8007)

### GET /api/v1/assessment/types
Get available assessment types

**Response:**
```json
{
  "assessments": [
    {
      "id": "initial",
      "name": "Initial Level Assessment",
      "duration_minutes": 20,
      "question_count": 40,
      "description": "Comprehensive test to determine your English level"
    }
  ]
}
```

### POST /api/v1/assessment/start
Start a new assessment

**Request:**
```json
{
  "assessment_type": "initial"
}
```

**Response:**
```json
{
  "assessment_id": "uuid",
  "questions": [
    {
      "id": "q1",
      "type": "multiple_choice",
      "question": "Which is correct?",
      "options": ["A) ...", "B) ...", "C) ..."],
      "audio_url": "https://..."
    }
  ]
}
```

### POST /api/v1/assessment/submit-answer
Submit answer to assessment question

**Request:**
```json
{
  "assessment_id": "uuid",
  "question_id": "q1",
  "answer": "A",
  "time_taken_seconds": 15
}
```

### POST /api/v1/assessment/complete
Complete assessment and get results

**Request:**
```json
{
  "assessment_id": "uuid"
}
```

**Response:**
```json
{
  "assessment_id": "uuid",
  "overall_score": 75,
  "level": "intermediate",
  "breakdown": {
    "listening": 80,
    "speaking": 70,
    "grammar": 75,
    "vocabulary": 78,
    "fluency": 68
  },
  "recommendations": [
    "Focus on grammar tenses",
    "Practice speaking with AI daily"
  ],
  "next_steps": "Ready to start lessons"
}
```

### GET /api/v1/assessment/history
Get past assessments

**Query Params:**
- `limit`: 10
- `offset`: 0

---

## 4. Lesson Service (Port 8003)

### GET /api/v1/lessons
Get available lessons

**Query Params:**
- `category`: "daily_conversation" | "job_interview" | "travel" | "business"
- `difficulty`: "beginner" | "elementary" | "intermediate" | "upper_intermediate"
- `topic`: "greetings" | "directions" | ...
- `limit`: 20
- `offset`: 0

**Response:**
```json
{
  "total": 150,
  "lessons": [
    {
      "id": "uuid",
      "title": "Meeting Your Colleague",
      "description": "Learn how to greet and make small talk at work",
      "category": "business",
      "difficulty_level": "beginner",
      "topic": "workplace",
      "estimated_duration_minutes": 15,
      "image_url": "https://...",
      "learning_objectives": ["Greet colleagues", "Make small talk"],
      "is_completed": false,
      "progress_percentage": 0
    }
  ]
}
```

### GET /api/v1/lessons/:lessonId
Get lesson details

**Response:**
```json
{
  "id": "uuid",
  "title": "Meeting Your Colleague",
  "description": "...",
  "category": "business",
  "difficulty_level": "beginner",
  "content": {
    "sections": [
      {
        "section_id": "intro",
        "title": "Introduction",
        "type": "video",
        "video_url": "https://...",
        "duration_seconds": 120
      },
      {
        "section_id": "dialogue",
        "title": "Sample Dialogue",
        "type": "dialogue",
        "dialogue": [
          {"speaker": "Person A", "text": "Hello, nice to meet you!", "audio_url": "https://..."},
          {"speaker": "Person B", "text": "Nice to meet you too!", "audio_url": "https://..."}
        ]
      },
      {
        "section_id": "practice",
        "title": "Practice",
        "type": "practice",
        "prompt": "Greet the person and ask about their day"
      }
    ]
  },
  "grammar_focus": ["present_simple", "polite_forms"],
  "vocabulary_list": ["colleague", "meeting", "nice", "pleasure"],
  "user_progress": {
    "started_at": "2024-01-20T10:00:00Z",
    "completed_at": null,
    "completion_percentage": 45
  }
}
```

### POST /api/v1/lessons/:lessonId/start
Start a lesson

**Response:**
```json
{
  "lesson_id": "uuid",
  "session_id": "uuid",
  "current_section": "intro"
}
```

### POST /api/v1/lessons/:lessonId/progress
Update lesson progress

**Request:**
```json
{
  "section_id": "dialogue",
  "completion_percentage": 50,
  "time_spent_seconds": 120
}
```

### POST /api/v1/lessons/:lessonId/complete
Mark lesson as complete

**Request:**
```json
{
  "score": 85,
  "time_spent_minutes": 15
}
```

---

## 5. AI Chat Service (Port 8002)

### WebSocket: /ws/chat
Establish WebSocket connection for real-time chat

**Connection Headers:**
```
Authorization: Bearer {jwt_token}
```

**Send Message:**
```json
{
  "type": "message",
  "conversation_type": "free_talk",
  "scenario_type": "casual",
  "message": "Hello, how are you?",
  "format": "text"
}
```

**Send Voice Message:**
```json
{
  "type": "message",
  "conversation_type": "free_talk",
  "message": "base64_audio_data",
  "format": "audio",
  "audio_codec": "wav"
}
```

**Receive Response:**
```json
{
  "type": "response",
  "message_id": "uuid",
  "text": "I'm doing well, thank you for asking!",
  "audio_url": "https://...",
  "grammar_corrections": [
    {
      "original": "How are you?",
      "corrected": "How are you?",
      "error_type": "word_order",
      "explanation": "Correct word order for questions",
      "severity": "minor"
    }
  ],
  "pronunciation_feedback": {
    "overall_score": 85,
    "phonemes": [
      {"phoneme": "h", "accuracy": 90},
      {"phoneme": "aʊ", "accuracy": 85}
    ]
  },
  "fluency_score": 82,
  "clarity_score": 88
}
```

### POST /api/v1/chat/start
Start new conversation (REST alternative)

**Request:**
```json
{
  "conversation_type": "roleplay",
  "scenario_type": "job_interview",
  "language_focus": "business_vocabulary"
}
```

**Response:**
```json
{
  "conversation_id": "uuid",
  "initial_message": "Welcome to the mock interview! I'll be your interviewer...",
  "audio_url": "https://...",
  "ws_endpoint": "wss://api.speakfloai.com/ws/chat?conversation_id=uuid"
}
```

### GET /api/v1/chat/conversations
Get conversation history

**Query Params:**
- `limit`: 20
- `offset`: 0
- `type`: "free_talk" | "roleplay" | ...

**Response:**
```json
{
  "conversations": [
    {
      "id": "uuid",
      "type": "roleplay",
      "scenario": "job_interview",
      "started_at": "2024-01-20T10:00:00Z",
      "ended_at": "2024-01-20T10:15:00Z",
      "duration_seconds": 900,
      "quality_score": 82,
      "message_count": 12
    }
  ]
}
```

### GET /api/v1/chat/conversations/:conversationId
Get conversation details with all messages

**Response:**
```json
{
  "id": "uuid",
  "type": "roleplay",
  "started_at": "2024-01-20T10:00:00Z",
  "messages": [
    {
      "id": "msg1",
      "sender": "ai",
      "text": "Welcome to the interview!",
      "timestamp": "2024-01-20T10:00:05Z",
      "audio_url": "https://..."
    },
    {
      "id": "msg2",
      "sender": "user",
      "text": "Thank you for having me",
      "transcript": "Thank you for having me",
      "timestamp": "2024-01-20T10:00:12Z",
      "grammar_corrections": [],
      "fluency_score": 85
    }
  ],
  "summary": {
    "quality_score": 82,
    "strengths": ["Good vocabulary", "Clear pronunciation"],
    "areas_to_improve": ["Practice modal verbs"]
  }
}
```

### DELETE /api/v1/chat/conversations/:conversationId
Delete conversation (with delay for recovery)

---

## 6. Vocabulary Service (Port 8004)

### GET /api/v1/vocabulary/words
Get vocabulary with filters

**Query Params:**
- `status`: "learning" | "familiar" | "mastered"
- `category`: "business" | "daily" | ...
- `difficulty`: "beginner" | "intermediate" | ...
- `limit`: 20
- `offset`: 0

**Response:**
```json
{
  "total": 450,
  "words": [
    {
      "id": "uuid",
      "word": "eloquent",
      "part_of_speech": "adjective",
      "definition": "Fluent or persuasive in speaking or writing",
      "example_sentence": "The speaker delivered an eloquent speech.",
      "pronunciation": "/ˈɛl.ə.kwənt/",
      "audio_url": "https://...",
      "difficulty_level": "intermediate",
      "category": "academic",
      "synonyms": ["articulate", "fluent"],
      "antonyms": ["inarticulate"],
      "user_status": "learning",
      "confidence_score": 0.65,
      "last_reviewed": "2024-01-19T14:30:00Z",
      "next_review": "2024-01-22T14:30:00Z"
    }
  ]
}
```

### GET /api/v1/vocabulary/words/:wordId
Get word details

**Response:**
```json
{
  "id": "uuid",
  "word": "eloquent",
  "part_of_speech": "adjective",
  "definition": "...",
  "definition_hindi": "प्रभावशाली, सुस्पष्ट",
  "example_sentence": "...",
  "example_sentence_hindi": "...",
  "pronunciation": "/ˈɛl.ə.kwənt/",
  "audio_url": "https://...",
  "word_family": ["eloquently", "eloquence", "ineloquent"],
  "etymology": "From Latin eloquens, meaning 'speaking out'",
  "common_mistakes": [
    {"mistake": "eloquence (noun)", "correct": "eloquent (adjective)", "explanation": "Use adjective form to describe someone"}
  ],
  "usage_frequency": 234,
  "image_url": "https://...",
  "user_stats": {
    "times_encountered": 5,
    "times_correct": 3,
    "quiz_attempts": 2,
    "quiz_correct": 1
  }
}
```

### POST /api/v1/vocabulary/words/:wordId/quiz
Start word quiz

**Response:**
```json
{
  "quiz_id": "uuid",
  "word_id": "uuid",
  "questions": [
    {
      "id": "q1",
      "type": "definition",
      "question": "What does 'eloquent' mean?",
      "options": ["A) Silent", "B) Fluent and persuasive", "C) Angry"],
      "correct_option": "B"
    },
    {
      "id": "q2",
      "type": "fill_blank",
      "question": "The politician gave an _____ speech.",
      "options": ["A) eloquent", "B) silent", "C) angry"],
      "correct_option": "A"
    }
  ]
}
```

### POST /api/v1/vocabulary/words/:wordId/quiz/submit
Submit quiz answer

**Request:**
```json
{
  "quiz_id": "uuid",
  "question_id": "q1",
  "selected_option": "B"
}
```

### POST /api/v1/vocabulary/words/:wordId/quiz/complete
Complete quiz

**Response:**
```json
{
  "quiz_id": "uuid",
  "word_id": "uuid",
  "total_questions": 4,
  "correct_answers": 3,
  "score_percentage": 75,
  "status_updated_to": "familiar",
  "confidence_increase": 0.15
}
```

### POST /api/v1/vocabulary/today
Get today's vocabulary focus list

**Response:**
```json
{
  "date": "2024-01-20",
  "total_words": 5,
  "words": [
    {
      "id": "uuid",
      "word": "eloquent",
      "reason_added": "Frequent in business content"
    }
  ]
}
```

### POST /api/v1/vocabulary/add-custom
Add custom word to vocabulary

**Request:**
```json
{
  "word": "synergy",
  "definition": "Interaction of two or more elements producing combined effect",
  "example_sentence": "The synergy between the two teams was remarkable"
}
```

---

## 7. Progress Service (Port 8005)

### GET /api/v1/progress/dashboard
Get user progress dashboard

**Response:**
```json
{
  "user_id": "uuid",
  "daily_stats": {
    "practice_minutes_today": 45,
    "conversations_today": 3,
    "words_learned_today": 2,
    "streak": 15
  },
  "weekly_stats": {
    "practice_minutes": 285,
    "days_practiced": 6,
    "lessons_completed": 2,
    "conversations": 18
  },
  "overall_stats": {
    "total_practice_hours": 48.5,
    "total_lessons_completed": 32,
    "total_words_learned": 450,
    "vocabulary_mastery_count": 120,
    "overall_score": 78
  },
  "skill_scores": {
    "listening": 82,
    "speaking": 75,
    "grammar": 78,
    "vocabulary": 88,
    "fluency": 70
  },
  "level_progression": {
    "current_level": "intermediate",
    "progress_percentage": 65,
    "xp_current": 6500,
    "xp_for_next_level": 10000,
    "estimated_days_to_next_level": 12
  },
  "weak_areas": [
    {
      "area": "Past Perfect Tense",
      "confidence": 45,
      "priority": 8,
      "recommended_lesson": "uuid"
    }
  ]
}
```

### GET /api/v1/progress/timeline
Get progress over time (for charts)

**Query Params:**
- `period`: "weekly" | "monthly" | "all"
- `metric`: "score" | "practice_minutes" | "words_learned"

**Response:**
```json
{
  "metric": "score",
  "period": "monthly",
  "data": [
    {"date": "2024-01-01", "value": 65},
    {"date": "2024-01-08", "value": 68},
    {"date": "2024-01-15", "value": 72},
    {"date": "2024-01-20", "value": 78}
  ]
}
```

### GET /api/v1/progress/weak-areas
Get detailed weak areas analysis

**Response:**
```json
{
  "weak_areas": [
    {
      "id": "uuid",
      "area_type": "grammar_past_perfect",
      "area_name": "Past Perfect Tense",
      "error_count": 12,
      "last_error": "2024-01-19T15:30:00Z",
      "confidence_score": 45,
      "recommended_lesson_id": "uuid",
      "focus_priority": 8
    }
  ]
}
```

### POST /api/v1/progress/reset-streak
Reset daily streak (manual request)

**Response:**
```json
{
  "streak_reset": true,
  "current_streak": 0,
  "longest_streak": 15
}
```

### GET /api/v1/progress/achievements
Get earned badges and achievements

**Response:**
```json
{
  "badges": [
    {
      "id": "first_conversation",
      "name": "First Steps",
      "description": "Complete your first conversation",
      "icon_url": "https://...",
      "earned_at": "2024-01-01T10:00:00Z",
      "progress": 100
    },
    {
      "id": "week_streak",
      "name": "Dedication",
      "description": "Maintain a 7-day practice streak",
      "icon_url": "https://...",
      "progress": 75,
      "days_remaining": 2
    }
  ]
}
```

---

## 8. Speaking Service (Port 8006)

### POST /api/v1/speaking/upload-audio
Upload audio for analysis

**Request:**
```
Content-Type: multipart/form-data
{
  "audio": <file>,
  "format": "wav" | "mp3" | "webm",
  "duration_seconds": 15,
  "context_type": "conversation" | "word_pronunciation" | "dialogue_reading"
}
```

**Response:**
```json
{
  "audio_id": "uuid",
  "upload_url": "https://...",
  "analysis": {
    "transcript": "Hello, how are you?",
    "pronunciation_score": 85,
    "fluency_score": 78,
    "clarity_score": 88,
    "phonemes": [
      {
        "phoneme": "h",
        "accuracy": 90,
        "expected": "hɛ",
        "actual": "hɛ"
      }
    ],
    "stress_patterns": {
      "expected": "HEL-lo, HOW are YOU",
      "actual": "HEL-lo, HOW are YOU",
      "accuracy": 100
    },
    "intonation_analysis": {
      "natural": true,
      "notes": "Good rising intonation for questions"
    }
  }
}
```

### GET /api/v1/speaking/pronunciation/:wordId
Get pronunciation analysis for specific word

**Response:**
```json
{
  "word": "eloquent",
  "phonetic": "/ˈɛl.ə.kwənt/",
  "stress_pattern": "EL-ə-kwənt",
  "audio_native": "https://...",
  "syllables": [
    {
      "syllable": "EL",
      "phoneme": "ɛl",
      "stress": "primary"
    },
    {
      "syllable": "ə",
      "phoneme": "ə",
      "stress": "unstressed"
    },
    {
      "syllable": "kwənt",
      "phoneme": "kwənt",
      "stress": "unstressed"
    }
  ],
  "common_mistakes": ["EL-o-kwent", "e-LO-kwent"],
  "tips": ["Stress the first syllable", "The 'a' sound is schwa"]
}
```

### POST /api/v1/speaking/dialogue-feedback
Get feedback on dialogue reading

**Request:**
```json
{
  "dialogue_id": "uuid",
  "audio_url": "https://...",
  "speaker_role": "person_a"
}
```

**Response:**
```json
{
  "feedback": {
    "overall_score": 82,
    "pronunciation": 85,
    "fluency": 80,
    "expression": 78,
    "timing": 80,
    "strengths": [
      "Clear pronunciation of difficult words",
      "Good pacing"
    ],
    "improvements": [
      "Work on natural intonation in questions",
      "Speak with more confidence"
    ],
    "line_by_line_feedback": [
      {
        "line_number": 1,
        "text": "Hello, nice to meet you",
        "score": 85,
        "feedback": "Good natural delivery"
      }
    ]
  }
}
```

---

## 9. Daily Tasks Service

### GET /api/v1/tasks/today
Get today's daily tasks

**Response:**
```json
{
  "date": "2024-01-20",
  "tasks": [
    {
      "id": "uuid",
      "type": "vocabulary",
      "description": "Learn 3 new business vocabulary words",
      "difficulty_level": "intermediate",
      "vocabulary_word_ids": ["id1", "id2", "id3"],
      "is_completed": false,
      "completion_time_seconds": null
    },
    {
      "id": "uuid",
      "type": "conversation",
      "description": "Have a 10-minute conversation about your day",
      "difficulty_level": "intermediate",
      "conversation_scenario": "casual",
      "is_completed": true,
      "completion_time_seconds": 600,
      "score": 82
    }
  ],
  "completion_summary": {
    "total_tasks": 4,
    "completed": 2,
    "completion_percentage": 50
  }
}
```

### POST /api/v1/tasks/:taskId/complete
Mark task as complete

**Request:**
```json
{
  "score": 85,
  "time_spent_seconds": 600
}
```

---

## 10. Admin API (Separate Auth)

### GET /api/v1/admin/users
Get all users with filters

**Query Params:**
- `search`: email or name
- `subscription_tier`: "free" | "pro" | "premium"
- `english_level`: filter by level
- `limit`: 50
- `offset`: 0

### POST /api/v1/admin/lessons
Create new lesson

**Request:**
```json
{
  "title": "New Lesson",
  "description": "...",
  "category": "business",
  "difficulty_level": "intermediate",
  "content": {},
  "is_published": false
}
```

### PUT /api/v1/admin/lessons/:lessonId
Update lesson

### DELETE /api/v1/admin/lessons/:lessonId
Delete lesson

### GET /api/v1/admin/analytics
Get analytics dashboard

**Response:**
```json
{
  "total_users": 5000,
  "active_users_today": 1200,
  "active_users_week": 3500,
  "avg_practice_minutes_per_user": 45,
  "lesson_completion_rate": 65,
  "top_conversations": ["casual", "job_interview"],
  "total_ai_api_cost": 5200,
  "most_difficult_areas": ["past_perfect", "phrasal_verbs"]
}
```

---

## Error Responses

### Standard Error Format
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

### Common HTTP Status Codes
- **400**: Bad Request (validation error)
- **401**: Unauthorized (missing/invalid token)
- **403**: Forbidden (insufficient permissions)
- **404**: Not Found
- **409**: Conflict (duplicate resource)
- **429**: Too Many Requests (rate limited)
- **500**: Internal Server Error
- **503**: Service Unavailable

### Error Codes
- `VALIDATION_ERROR`: Input validation failed
- `AUTH_REQUIRED`: Authentication required
- `TOKEN_EXPIRED`: JWT token expired
- `INVALID_TOKEN`: Token is invalid or tampered
- `INSUFFICIENT_PERMISSIONS`: User lacks required permissions
- `RESOURCE_NOT_FOUND`: Resource doesn't exist
- `DUPLICATE_RESOURCE`: Resource already exists
- `RATE_LIMIT_EXCEEDED`: Too many requests
- `EXTERNAL_API_ERROR`: OpenAI/Whisper/TTS API error
- `DATABASE_ERROR`: Internal database error
- `INTERNAL_SERVER_ERROR`: Unexpected server error

---

## Rate Limiting

- **Free tier**: 100 requests/minute
- **Pro tier**: 500 requests/minute
- **Premium tier**: 2000 requests/minute

Response headers:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1705773930
```

---

## Pagination

All list endpoints support:
```
?limit=20&offset=0
```

Response includes:
```json
{
  "total": 150,
  "limit": 20,
  "offset": 0,
  "items": []
}
```

---

## Versioning

- Current API version: `v1`
- Deprecation policy: 6-month notice before breaking changes
- Header: `X-API-Version: v1`
