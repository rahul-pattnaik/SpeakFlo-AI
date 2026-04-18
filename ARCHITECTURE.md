# SpeakFlo AI - Complete Architecture Documentation

## 1. System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         User Layer (Web/Mobile)                 │
│                       Next.js Frontend (React)                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ • Onboarding Flow  • Assessment Test  • Dashboard         │   │
│  │ • Conversation UI  • Lessons           • Progress Tracking│   │
│  │ • Vocabulary       • Roleplay          • User Settings    │   │
│  └──────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────┘
                            │
                    [REST API + WebSocket]
                            │
┌──────────────────────────────────────────────────────────────────┐
│                    API Gateway & Load Balancing                  │
│                        (Reverse Proxy)                           │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
                            │
┌──────────────────────────────────────────────────────────────────┐
│                      Backend Services Layer                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │
│  │  Auth        │  │  Lesson      │  │  Vocabulary  │           │
│  │  Service     │  │  Service     │  │  Service     │           │
│  └──────────────┘  └──────────────┘  └──────────────┘           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │
│  │  AI Chat     │  │  Progress    │  │  Speaking    │           │
│  │  Service     │  │  Service     │  │  Service     │           │
│  └──────────────┘  └──────────────┘  └──────────────┘           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │
│  │  Assessment  │  │  Adaptive    │  │  Analytics   │           │
│  │  Service     │  │  Engine      │  │  Service     │           │
│  └──────────────┘  └──────────────┘  └──────────────┘           │
└──────────────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        ▼                   ▼                   ▼
   ┌─────────┐         ┌─────────┐       ┌──────────┐
   │PostgreSQL│         │  Redis  │       │ Supabase │
   │Database  │         │  Cache  │       │ Storage  │
   │          │         │ Sessions│       │ (Audio)  │
   └─────────┘         └─────────┘       └──────────┘
        │
        └─────────────────────────┬────────────────────────┐
                                  │                        │
                            ┌─────────────┐        ┌──────────────┐
                            │  OpenAI API │        │  Whisper API │
                            │  (Chat/Text)│        │  (STT)       │
                            └─────────────┘        └──────────────┘
                                  │
                            ┌─────────────┐
                            │  TTS Provider│
                            │  (ElevenLabs)│
                            └─────────────┘
```

## 2. Microservices Architecture

### Service Boundaries

| Service | Responsibility | Port | Database |
|---------|---|---|---|
| Auth Service | User registration, login, JWT tokens, OAuth | 8001 | PostgreSQL |
| AI Chat Service | Conversation with OpenAI, context management | 8002 | PostgreSQL + Redis |
| Lesson Service | Daily lessons, content delivery | 8003 | PostgreSQL |
| Vocabulary Service | Word management, definitions, examples | 8004 | PostgreSQL |
| Progress Service | User progress tracking, analytics | 8005 | PostgreSQL + Redis |
| Speaking Service | Speech-to-text, pronunciation checking | 8006 | PostgreSQL + Supabase |
| Assessment Service | Level testing, diagnostic analysis | 8007 | PostgreSQL |
| Adaptive Engine | Algorithm for difficulty adjustment | 8008 | Redis + PostgreSQL |
| API Gateway | Request routing, rate limiting, auth validation | 8000 | - |

## 3. Technology Stack

### Frontend
- **Framework**: Next.js 14+ (React 18, TypeScript)
- **Styling**: Tailwind CSS + CSS Modules
- **State Management**: Zustand + React Query
- **Forms**: React Hook Form + Zod validation
- **Charts**: Recharts for progress dashboards
- **Audio**: Web Audio API + React Audio Recorder
- **HTTP Client**: Axios with retry logic
- **Real-time**: Socket.io for chat streaming

### Backend
- **Runtime**: Node.js 18+ or Python 3.11+
- **Framework**: Express.js (Node.js) or FastAPI (Python)
- **Database**: PostgreSQL 15+
- **Cache**: Redis 7+
- **Auth**: Clerk or Firebase Auth
- **Task Queue**: Bull (Redis-based job queue)
- **Logging**: Winston + ELK Stack
- **Monitoring**: Prometheus + Grafana

### External APIs
- **LLM**: OpenAI GPT-4 or Anthropic Claude
- **Speech-to-Text**: OpenAI Whisper API
- **Text-to-Speech**: ElevenLabs or Google Cloud TTS
- **Storage**: Supabase (PostgreSQL + S3-like storage)
- **Email**: SendGrid or Mailgun

### DevOps & Hosting
- **Frontend Hosting**: Vercel
- **Backend Hosting**: Railway.app or Render.com
- **Database**: Neon (PostgreSQL) or Supabase
- **CDN**: Cloudflare
- **Monitoring**: Sentry + LogRocket
- **CI/CD**: GitHub Actions
- **Container**: Docker + Docker Compose

## 4. Data Flow

### User Registration & Onboarding
```
User → Frontend → Auth Service → PostgreSQL
                ↓
            JWT Token + Refresh Token
                ↓
            User Profile Created
                ↓
            Redirect to Assessment Test
```

### Daily Conversation Flow
```
User Input (Text/Voice) → Frontend
    ↓
  [Speech-to-Text if voice]
    ↓
  API Gateway → AI Chat Service
    ↓
  Get conversation context from Redis
    ↓
  Call OpenAI API with context
    ↓
  Parse response + extract grammar errors
    ↓
  Generate TTS audio
    ↓
  Update user progress in PostgreSQL
    ↓
  Return response + audio + corrections
    ↓
  Frontend renders + streams audio
```

### Progress Tracking
```
User completes lesson/quiz
    ↓
Progress Service stores metrics
    ↓
Adaptive Engine recalculates level
    ↓
Updates user profiling
    ↓
Dashboard refreshes with new data
    ↓
Notifications sent if milestones hit
```

## 5. Database Schema

See DATABASE_SCHEMA.md for complete schema documentation.

## 6. API Design

See API_DESIGN.md for detailed endpoint specifications.

## 7. Security Architecture

### Authentication & Authorization
- **OAuth 2.0** with Clerk/Firebase for third-party login
- **JWT** tokens with 15-minute expiry + 7-day refresh
- **Rate Limiting**: 100 requests per minute per user
- **CORS**: Configured for frontend domains only
- **HTTPS**: TLS 1.3 enforced
- **API Keys**: Hashed with bcrypt, rotated monthly

### Data Protection
- **PII Encryption**: AES-256 for sensitive fields
- **Password**: Bcrypt with 12 salt rounds
- **Audio Files**: Encrypted in transit and at rest
- **Secrets**: Environment variables via dotenv + HashiCorp Vault
- **SQL Injection**: Parameterized queries via ORM

### Audit & Compliance
- **Audit Logs**: All user actions logged with timestamps
- **GDPR**: Right to export/delete user data
- **Data Retention**: Audio files deleted after 30 days unless user opts-in
- **Backup**: Nightly encrypted backups to S3

## 8. Scalability Strategy

### Caching Layer
- **Redis**: User sessions, conversation context, leaderboards
- **CDN**: Static assets, lesson materials
- **HTTP Caching**: ETag-based client caching

### Database Optimization
- **Connection Pooling**: PgBouncer (100 connections per service)
- **Indexing**: Composite indexes on foreign keys, user_id filters
- **Partitioning**: Conversation history by month
- **Read Replicas**: For analytics queries

### Horizontal Scaling
- **Stateless Services**: Each microservice can scale independently
- **Load Balancing**: Round-robin + health checks
- **Message Queue**: Bull jobs for async tasks (email, audio processing)
- **Auto-scaling**: 2-10 instances per service based on CPU/memory

### Performance Targets
- **API Response**: < 200ms (p95)
- **Chat Response**: < 500ms (excluding OpenAI latency)
- **Frontend Load**: < 3s (Lighthouse score 90+)
- **Concurrent Users**: 10,000+ with 99.9% uptime

## 9. Monitoring & Observability

### Metrics
- Request latency, error rates, throughput
- API quota usage (OpenAI, ElevenLabs)
- Database query performance
- Cache hit rate
- Active user sessions

### Logging
- **Structured Logging**: JSON format with trace IDs
- **Log Levels**: ERROR, WARN, INFO, DEBUG
- **Retention**: 30 days in ELK, 1 year in S3 archive

### Alerting
- **PagerDuty**: Critical errors and SLA breaches
- **Slack**: Daily metrics summary + anomalies
- **Health Checks**: 5-minute interval for all services

## 10. Future Architecture Enhancements

1. **Video Recording**: Integrate with Mux for live mock interviews
2. **Offline Mode**: Service Workers + IndexedDB for offline conversations
3. **Mobile App**: React Native version with native audio handling
4. **WebRTC**: Real-time peer sessions with pronunciation scoring
5. **Blockchain**: Certificate issuance for completed milestones
6. **ML Pipeline**: Fine-tune local models for faster inference
