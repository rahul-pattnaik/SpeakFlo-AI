# SpeakFlo AI - Database Schema

## Overview
Production-ready PostgreSQL schema supporting user management, lessons, vocabulary, conversations, and progress tracking.

## Tables

### 1. users
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    phone_number VARCHAR(20),
    profile_picture_url VARCHAR(500),
    auth_provider VARCHAR(50) NOT NULL, -- 'clerk', 'firebase', 'google', 'github'
    auth_provider_id VARCHAR(255) NOT NULL,
    english_level VARCHAR(50) NOT NULL, -- 'beginner', 'elementary', 'intermediate', 'upper_intermediate'
    learning_goal VARCHAR(500), -- "Daily communication", "Job interview", etc.
    preferred_learning_time TIME,
    timezone VARCHAR(100) DEFAULT 'Asia/Kolkata',
    country_code VARCHAR(2),
    language_preference VARCHAR(10) DEFAULT 'en-IN',
    is_active BOOLEAN DEFAULT true,
    email_verified BOOLEAN DEFAULT false,
    phone_verified BOOLEAN DEFAULT false,
    subscription_tier VARCHAR(50) DEFAULT 'free', -- 'free', 'pro', 'premium'
    subscription_started_at TIMESTAMP,
    subscription_ends_at TIMESTAMP,
    last_login_at TIMESTAMP,
    last_activity_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP -- Soft delete for GDPR
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_auth_provider_id ON users(auth_provider, auth_provider_id);
CREATE INDEX idx_users_created_at ON users(created_at DESC);
CREATE INDEX idx_users_subscription_tier ON users(subscription_tier);
```

### 2. user_assessments
```sql
CREATE TABLE user_assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    assessment_type VARCHAR(50) NOT NULL, -- 'initial', 'monthly', 'level_check'
    english_level_before VARCHAR(50),
    english_level_after VARCHAR(50) NOT NULL,
    listening_score INTEGER, -- 0-100
    speaking_score INTEGER, -- 0-100
    grammar_score INTEGER, -- 0-100
    vocabulary_score INTEGER, -- 0-100
    fluency_score INTEGER, -- 0-100
    overall_score INTEGER, -- 0-100
    test_duration_minutes INTEGER,
    questions_attempted INTEGER,
    questions_correct INTEGER,
    accuracy_percentage DECIMAL(5,2),
    feedback_text TEXT,
    test_data JSONB, -- Store detailed question responses
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_assessments_user_id ON user_assessments(user_id);
CREATE INDEX idx_assessments_type ON user_assessments(assessment_type);
CREATE INDEX idx_assessments_created_at ON user_assessments(created_at DESC);
```

### 3. lessons
```sql
CREATE TABLE lessons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100) NOT NULL, -- 'daily_conversation', 'job_interview', 'travel', 'business'
    difficulty_level VARCHAR(50) NOT NULL, -- 'beginner', 'elementary', 'intermediate', 'upper_intermediate'
    english_level_requirement VARCHAR(50),
    topic VARCHAR(100), -- 'greetings', 'directions', 'dining', 'meetings'
    content JSONB NOT NULL, -- Structured lesson content
    learning_objectives TEXT[], -- Array of objectives
    estimated_duration_minutes INTEGER,
    lesson_order INTEGER, -- Order within category
    is_published BOOLEAN DEFAULT false,
    is_featured BOOLEAN DEFAULT false,
    sample_dialog TEXT, -- Example conversation
    pronunciation_focus VARCHAR(255), -- Specific sounds/words to practice
    grammar_focus TEXT[], -- Array of grammar points
    vocabulary_list TEXT[], -- Array of new words
    video_url VARCHAR(500),
    image_url VARCHAR(500),
    created_by_admin_id UUID,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

CREATE INDEX idx_lessons_category ON lessons(category);
CREATE INDEX idx_lessons_difficulty ON lessons(difficulty_level);
CREATE INDEX idx_lessons_published ON lessons(is_published);
CREATE INDEX idx_lessons_topic ON lessons(topic);
```

### 4. user_lessons
```sql
CREATE TABLE user_lessons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    completion_percentage DECIMAL(5,2) DEFAULT 0,
    time_spent_minutes INTEGER DEFAULT 0,
    score INTEGER, -- 0-100
    is_completed BOOLEAN DEFAULT false,
    is_favorited BOOLEAN DEFAULT false,
    retry_count INTEGER DEFAULT 0,
    notes TEXT,
    lesson_progress JSONB, -- Track progress through lesson sections
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, lesson_id)
);

CREATE INDEX idx_user_lessons_user_id ON user_lessons(user_id);
CREATE INDEX idx_user_lessons_lesson_id ON user_lessons(lesson_id);
CREATE INDEX idx_user_lessons_completed ON user_lessons(completed_at DESC);
CREATE INDEX idx_user_lessons_score ON user_lessons(score DESC);
```

### 5. conversations
```sql
CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    lesson_id UUID REFERENCES lessons(id),
    conversation_type VARCHAR(50) NOT NULL, -- 'free_talk', 'lesson_based', 'roleplay', 'interview'
    scenario_type VARCHAR(100), -- 'casual', 'job_interview', 'meeting', 'travel'
    topic VARCHAR(255),
    language_focus VARCHAR(255), -- e.g., 'present_tense', 'business_vocabulary'
    started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP,
    duration_seconds INTEGER,
    total_exchanges INTEGER DEFAULT 0,
    ai_response_time_ms FLOAT,
    is_completed BOOLEAN DEFAULT false,
    quality_score INTEGER, -- 0-100, auto-calculated
    metadata JSONB, -- Additional conversation data
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_conversations_user_id ON conversations(user_id);
CREATE INDEX idx_conversations_type ON conversations(conversation_type);
CREATE INDEX idx_conversations_created_at ON conversations(created_at DESC);
CREATE INDEX idx_conversations_quality_score ON conversations(quality_score DESC);
```

### 6. conversation_messages
```sql
CREATE TABLE conversation_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    message_sequence INTEGER NOT NULL, -- Order within conversation
    sender VARCHAR(20) NOT NULL, -- 'user' or 'ai'
    message_type VARCHAR(50) NOT NULL, -- 'text', 'audio', 'voice_note'
    text_content TEXT,
    audio_url VARCHAR(500),
    audio_duration_seconds FLOAT,
    transcript TEXT, -- For voice input, transcribed text
    timestamp_ms BIGINT, -- When message was sent
    
    -- Grammar & Corrections
    grammar_errors JSONB, -- Array of {position, error, correction, explanation}
    pronunciation_analysis JSONB, -- {phoneme_accuracy, stress_errors, intonation_score}
    fluency_score FLOAT, -- 0-100
    clarity_score FLOAT, -- 0-100
    
    -- Metadata
    response_latency_ms FLOAT, -- Time to generate AI response
    tokens_used INTEGER,
    model_version VARCHAR(100),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_messages_conversation_id ON conversation_messages(conversation_id);
CREATE INDEX idx_messages_sender ON conversation_messages(sender);
CREATE INDEX idx_messages_created_at ON conversation_messages(created_at);
```

### 7. vocabulary_words
```sql
CREATE TABLE vocabulary_words (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    word VARCHAR(255) NOT NULL,
    part_of_speech VARCHAR(50), -- 'noun', 'verb', 'adjective', etc.
    definition TEXT NOT NULL,
    definition_hindi TEXT, -- For Indian users
    example_sentence TEXT NOT NULL,
    example_sentence_hindi TEXT,
    pronunciation VARCHAR(255), -- IPA or phonetic
    word_audio_url VARCHAR(500),
    synonyms TEXT[],
    antonyms TEXT[],
    difficulty_level VARCHAR(50), -- 'beginner', 'intermediate', 'advanced'
    category VARCHAR(100), -- 'business', 'daily', 'academic'
    word_family TEXT[], -- Related words: 'run', 'runs', 'running', 'runner'
    etymology TEXT, -- Word origin
    common_mistakes TEXT[], -- Common errors made with this word
    usage_frequency INTEGER, -- Usage rank (0-10000)
    image_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(word)
);

CREATE INDEX idx_words_difficulty ON vocabulary_words(difficulty_level);
CREATE INDEX idx_words_category ON vocabulary_words(category);
CREATE INDEX idx_words_word ON vocabulary_words(word);
```

### 8. user_vocabulary
```sql
CREATE TABLE user_vocabulary (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    word_id UUID NOT NULL REFERENCES vocabulary_words(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'learning', -- 'learning', 'familiar', 'mastered'
    times_encountered INTEGER DEFAULT 1,
    times_correct INTEGER DEFAULT 0,
    last_reviewed_at TIMESTAMP,
    next_review_at TIMESTAMP, -- Spaced repetition
    confidence_score FLOAT DEFAULT 0, -- 0-1
    quiz_attempts INTEGER DEFAULT 0,
    quiz_correct INTEGER DEFAULT 0,
    in_current_focus BOOLEAN DEFAULT false, -- Part of today's focus list
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, word_id)
);

CREATE INDEX idx_user_vocab_user_id ON user_vocabulary(user_id);
CREATE INDEX idx_user_vocab_status ON user_vocabulary(status);
CREATE INDEX idx_user_vocab_next_review ON user_vocabulary(next_review_at);
CREATE INDEX idx_user_vocab_in_focus ON user_vocabulary(in_current_focus);
```

### 9. user_progress
```sql
CREATE TABLE user_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    
    -- Daily Stats
    daily_streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    last_practice_date DATE,
    total_practice_days INTEGER DEFAULT 0,
    
    -- Cumulative Stats
    total_conversation_hours DECIMAL(10,2) DEFAULT 0,
    total_lessons_completed INTEGER DEFAULT 0,
    total_words_learned INTEGER DEFAULT 0,
    vocabulary_mastery_count INTEGER DEFAULT 0,
    
    -- Skill Scores (0-100)
    listening_score FLOAT DEFAULT 0,
    speaking_score FLOAT DEFAULT 0,
    grammar_score FLOAT DEFAULT 0,
    vocabulary_score FLOAT DEFAULT 0,
    fluency_score FLOAT DEFAULT 0,
    overall_score FLOAT DEFAULT 0,
    
    -- Level Progression
    current_level VARCHAR(50), -- 'beginner', 'elementary', etc.
    level_progress_percentage DECIMAL(5,2) DEFAULT 0,
    xp_current INTEGER DEFAULT 0,
    xp_for_next_level INTEGER DEFAULT 1000,
    levels_completed INTEGER DEFAULT 0,
    
    -- Badges & Achievements
    badges_earned TEXT[], -- Array of badge IDs
    last_updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_progress_user_id ON user_progress(user_id);
CREATE INDEX idx_progress_daily_streak ON user_progress(daily_streak DESC);
CREATE INDEX idx_progress_overall_score ON user_progress(overall_score DESC);
```

### 10. daily_tasks
```sql
CREATE TABLE daily_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    task_date DATE NOT NULL,
    task_type VARCHAR(50) NOT NULL, -- 'vocabulary', 'conversation', 'lesson', 'quiz'
    difficulty_level VARCHAR(50),
    
    -- Task Details
    lesson_id UUID REFERENCES lessons(id),
    vocabulary_word_id UUID REFERENCES vocabulary_words(id),
    task_description TEXT,
    task_parameters JSONB, -- Custom params for task generation
    
    -- Status
    is_completed BOOLEAN DEFAULT false,
    completed_at TIMESTAMP,
    score INTEGER,
    time_spent_minutes INTEGER,
    
    -- Adaptive Difficulty
    previous_performance FLOAT, -- Score from similar task
    recommended_difficulty VARCHAR(50),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, task_date, task_type)
);

CREATE INDEX idx_daily_tasks_user_id_date ON daily_tasks(user_id, task_date);
CREATE INDEX idx_daily_tasks_completed ON daily_tasks(is_completed);
```

### 11. grammar_corrections
```sql
CREATE TABLE grammar_corrections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL REFERENCES conversation_messages(id) ON DELETE CASCADE,
    original_text TEXT NOT NULL,
    corrected_text TEXT NOT NULL,
    error_type VARCHAR(100), -- 'tense', 'subject_verb_agreement', 'article', 'preposition', 'word_order'
    severity VARCHAR(50), -- 'critical', 'major', 'minor'
    explanation TEXT,
    example_correct TEXT,
    rule_reference VARCHAR(255),
    user_acknowledged BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_corrections_message_id ON grammar_corrections(message_id);
CREATE INDEX idx_corrections_error_type ON grammar_corrections(error_type);
```

### 12. user_weak_areas
```sql
CREATE TABLE user_weak_areas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    area_type VARCHAR(100) NOT NULL, -- 'grammar_tense', 'articles', 'pronunciation_sounds', 'vocabulary_business'
    area_name VARCHAR(255) NOT NULL,
    error_count INTEGER DEFAULT 0,
    last_error_at TIMESTAMP,
    confidence_score FLOAT DEFAULT 0, -- 0-100
    recommended_lesson_id UUID REFERENCES lessons(id),
    focus_priority INTEGER, -- 1-10, higher = more focus needed
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, area_type)
);

CREATE INDEX idx_weak_areas_user_id ON user_weak_areas(user_id);
CREATE INDEX idx_weak_areas_priority ON user_weak_areas(focus_priority DESC);
```

### 13. user_preferences
```sql
CREATE TABLE user_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    
    -- Learning Preferences
    lesson_duration_preference VARCHAR(50), -- '5min', '15min', '30min'
    preferred_topics TEXT[], -- Array of topic IDs
    preferred_accents VARCHAR(50), -- 'british', 'american', 'indian'
    tts_voice_gender VARCHAR(20), -- 'male', 'female', 'neutral'
    tts_speech_rate FLOAT DEFAULT 1.0, -- 0.5 to 2.0
    
    -- Notifications
    daily_reminder_enabled BOOLEAN DEFAULT true,
    reminder_time TIME DEFAULT '09:00:00',
    email_notifications BOOLEAN DEFAULT true,
    push_notifications BOOLEAN DEFAULT true,
    
    -- Privacy
    profile_visibility VARCHAR(50) DEFAULT 'private', -- 'public', 'friends', 'private'
    share_progress_publicly BOOLEAN DEFAULT false,
    allow_analytics BOOLEAN DEFAULT true,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_preferences_user_id ON user_preferences(user_id);
```

### 14. analytics_events
```sql
CREATE TABLE analytics_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    event_type VARCHAR(100) NOT NULL, -- 'lesson_started', 'conversation_completed', 'quiz_passed'
    event_name VARCHAR(255) NOT NULL,
    event_properties JSONB,
    session_id VARCHAR(255),
    device_info VARCHAR(255),
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_date DATE DEFAULT CURRENT_DATE
);

CREATE INDEX idx_events_user_id ON analytics_events(user_id);
CREATE INDEX idx_events_type ON analytics_events(event_type);
CREATE INDEX idx_events_created_date ON analytics_events(created_date);
```

### 15. admin_users
```sql
CREATE TABLE admin_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL, -- 'super_admin', 'content_manager', 'support', 'analyst'
    permissions TEXT[], -- Array of permission strings
    is_active BOOLEAN DEFAULT true,
    last_login_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_admin_email ON admin_users(email);
CREATE INDEX idx_admin_role ON admin_users(role);
```

## Views for Common Queries

```sql
-- User dashboard summary
CREATE VIEW user_dashboard_view AS
SELECT 
    u.id,
    u.full_name,
    u.english_level,
    up.daily_streak,
    up.overall_score,
    up.total_lessons_completed,
    up.total_words_learned,
    COALESCE((SELECT COUNT(*) FROM conversations WHERE user_id = u.id AND created_at::date = CURRENT_DATE), 0) as today_conversations,
    (SELECT COUNT(*) FROM daily_tasks WHERE user_id = u.id AND task_date = CURRENT_DATE AND is_completed), as today_completed_tasks
FROM users u
LEFT JOIN user_progress up ON u.id = up.user_id;

-- Weekly progress summary
CREATE VIEW weekly_progress_view AS
SELECT 
    user_id,
    DATE_TRUNC('week', created_at)::date as week_start,
    COUNT(DISTINCT DATE(created_at)) as days_practiced,
    COUNT(*) as total_conversations,
    AVG(quality_score) as avg_quality_score,
    SUM(EXTRACT(EPOCH FROM (CASE WHEN ended_at IS NOT NULL THEN ended_at ELSE NOW() END - started_at)) / 3600) as hours_practiced
FROM conversations
GROUP BY user_id, DATE_TRUNC('week', created_at);
```

## Indexes Summary

Total indexes: 60+
- Performance targets: Queries < 100ms for 1M users
- Foreign key indexes for referential integrity
- Composite indexes for common filter combinations
- Partial indexes for soft-deleted records

## Constraints & Rules

1. **Cascade Deletes**: User deletion cascades to all related records
2. **Soft Deletes**: Lessons and users support soft deletion
3. **Unique Constraints**: Email, word names, user-word combinations
4. **Check Constraints**: Scores 0-100, percentages 0-100
5. **Foreign Keys**: Enforced with ON DELETE CASCADE/RESTRICT
