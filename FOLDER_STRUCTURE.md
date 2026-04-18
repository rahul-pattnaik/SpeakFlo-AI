# SpeakFlo AI - Project Folder Structure

## Frontend (Next.js) Structure

```
frontend/
├── public/
│   ├── images/
│   │   ├── logo.png
│   │   ├── hero.png
│   │   └── mascot.png
│   ├── audio/
│   │   ├── example-words/
│   │   └── lesson-samples/
│   └── fonts/
│       └── anthropic-sans.woff2
│
├── src/
│   ├── app/
│   │   ├── layout.tsx              # Root layout with providers
│   │   ├── page.tsx                # Landing page
│   │   ├── globals.css             # Global styles
│   │   │
│   │   ├── (auth)/
│   │   │   ├── register/
│   │   │   │   └── page.tsx
│   │   │   ├── login/
│   │   │   │   └── page.tsx
│   │   │   ├── reset-password/
│   │   │   │   └── page.tsx
│   │   │   └── layout.tsx
│   │   │
│   │   ├── (app)/
│   │   │   ├── layout.tsx          # App layout with sidebar
│   │   │   │
│   │   │   ├── onboarding/
│   │   │   │   ├── page.tsx        # Onboarding flow
│   │   │   │   ├── step-1/
│   │   │   │   ├── step-2/
│   │   │   │   ├── assessment/
│   │   │   │   └── success/
│   │   │   │
│   │   │   ├── dashboard/
│   │   │   │   ├── page.tsx
│   │   │   │   ├── components/
│   │   │   │   │   ├── StatsCards.tsx
│   │   │   │   │   ├── ProgressChart.tsx
│   │   │   │   │   ├── DailyTasks.tsx
│   │   │   │   │   └── WeakAreas.tsx
│   │   │   │   └── page.module.css
│   │   │   │
│   │   │   ├── chat/
│   │   │   │   ├── page.tsx        # Chat interface
│   │   │   │   ├── components/
│   │   │   │   │   ├── ChatWindow.tsx
│   │   │   │   │   ├── MessageItem.tsx
│   │   │   │   │   ├── InputArea.tsx
│   │   │   │   │   ├── AudioRecorder.tsx
│   │   │   │   │   ├── ScenarioSelector.tsx
│   │   │   │   │   └── CorrectionPanel.tsx
│   │   │   │   ├── hooks/
│   │   │   │   │   ├── useChat.ts
│   │   │   │   │   ├── useWebSocket.ts
│   │   │   │   │   └── useAudioRecorder.ts
│   │   │   │   └── page.module.css
│   │   │   │
│   │   │   ├── lessons/
│   │   │   │   ├── page.tsx        # Lessons list
│   │   │   │   ├── [id]/
│   │   │   │   │   ├── page.tsx    # Lesson details
│   │   │   │   │   ├── components/
│   │   │   │   │   │   ├── LessonContent.tsx
│   │   │   │   │   │   ├── LessonProgress.tsx
│   │   │   │   │   │   ├── DialogueSection.tsx
│   │   │   │   │   │   └── PracticeSection.tsx
│   │   │   │   │   └── page.module.css
│   │   │   │   ├── components/
│   │   │   │   │   ├── LessonCard.tsx
│   │   │   │   │   ├── FilterBar.tsx
│   │   │   │   │   └── CategoryTabs.tsx
│   │   │   │   └── page.module.css
│   │   │   │
│   │   │   ├── vocabulary/
│   │   │   │   ├── page.tsx        # Vocabulary list
│   │   │   │   ├── [id]/
│   │   │   │   │   ├── page.tsx    # Word details
│   │   │   │   │   ├── components/
│   │   │   │   │   │   ├── WordDetail.tsx
│   │   │   │   │   │   ├── Quiz.tsx
│   │   │   │   │   │   └── Pronunciation.tsx
│   │   │   │   │   └── page.module.css
│   │   │   │   ├── components/
│   │   │   │   │   ├── WordCard.tsx
│   │   │   │   │   ├── VocabularyStats.tsx
│   │   │   │   │   ├── SpacedRepetition.tsx
│   │   │   │   │   └── QuickQuiz.tsx
│   │   │   │   └── page.module.css
│   │   │   │
│   │   │   ├── progress/
│   │   │   │   ├── page.tsx
│   │   │   │   ├── components/
│   │   │   │   │   ├── SkillChart.tsx
│   │   │   │   │   ├── Timeline.tsx
│   │   │   │   │   ├── Achievements.tsx
│   │   │   │   │   ├── LevelProgression.tsx
│   │   │   │   │   └── WeakAreasDetail.tsx
│   │   │   │   └── page.module.css
│   │   │   │
│   │   │   ├── settings/
│   │   │   │   ├── page.tsx
│   │   │   │   ├── components/
│   │   │   │   │   ├── ProfileSettings.tsx
│   │   │   │   │   ├── PreferencesSettings.tsx
│   │   │   │   │   ├── NotificationSettings.tsx
│   │   │   │   │   ├── PrivacySettings.tsx
│   │   │   │   │   └── DangerZone.tsx
│   │   │   │   └── page.module.css
│   │   │   │
│   │   │   └── pricing/
│   │   │       ├── page.tsx
│   │   │       ├── components/
│   │   │       │   └── PricingCards.tsx
│   │   │       └── page.module.css
│   │   │
│   │   ├── api/ (API routes for server actions)
│   │   │   ├── auth/
│   │   │   ├── chat/
│   │   │   └── upload/
│   │   │
│   │   └── error.tsx               # Error boundary
│   │
│   ├── components/
│   │   ├── common/
│   │   │   ├── Header.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   ├── Footer.tsx
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── Loading.tsx
│   │   │   ├── Toast.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Select.tsx
│   │   │   ├── Badge.tsx
│   │   │   ├── Avatar.tsx
│   │   │   └── Skeleton.tsx
│   │   │
│   │   ├── audio/
│   │   │   ├── AudioPlayer.tsx
│   │   │   ├── AudioRecorder.tsx
│   │   │   ├── WaveformVisualizer.tsx
│   │   │   └── AudioUploader.tsx
│   │   │
│   │   ├── forms/
│   │   │   ├── LoginForm.tsx
│   │   │   ├── RegisterForm.tsx
│   │   │   ├── ResetPasswordForm.tsx
│   │   │   ├── OnboardingForm.tsx
│   │   │   └── PreferencesForm.tsx
│   │   │
│   │   ├── charts/
│   │   │   ├── LineChart.tsx
│   │   │   ├── BarChart.tsx
│   │   │   ├── PieChart.tsx
│   │   │   └── SkillRadar.tsx
│   │   │
│   │   └── icons/
│   │       ├── MicIcon.tsx
│   │       ├── PlayIcon.tsx
│   │       ├── PauseIcon.tsx
│   │       ├── SettingsIcon.tsx
│   │       └── ... (other icons)
│   │
│   ├── hooks/
│   │   ├── useAuth.ts              # Auth context hook
│   │   ├── useUser.ts              # User data hook
│   │   ├── useApi.ts               # API request hook
│   │   ├── useChat.ts              # Chat hook
│   │   ├── useAudioRecorder.ts     # Audio recording hook
│   │   ├── useNotification.ts      # Toast notifications
│   │   ├── useLocalStorage.ts      # Local storage hook
│   │   ├── usePagination.ts        # Pagination hook
│   │   ├── useDebounce.ts          # Debounce hook
│   │   └── useIntersectionObserver.ts
│   │
│   ├── lib/
│   │   ├── api.ts                  # Axios instance + interceptors
│   │   ├── auth.ts                 # Auth utilities
│   │   ├── storage.ts              # Storage utilities
│   │   ├── formatters.ts           # Data formatters
│   │   ├── validators.ts           # Input validators
│   │   ├── audio-processor.ts      # Audio utilities
│   │   ├── constants.ts            # App constants
│   │   ├── errors.ts               # Error handling
│   │   └── types.ts                # TypeScript types
│   │
│   ├── context/
│   │   ├── AuthContext.tsx
│   │   ├── ThemeContext.tsx
│   │   └── ChatContext.tsx
│   │
│   ├── store/
│   │   ├── authStore.ts            # Zustand auth store
│   │   ├── userStore.ts            # User data store
│   │   ├── chatStore.ts            # Chat state
│   │   └── uiStore.ts              # UI state (modals, toasts)
│   │
│   ├── types/
│   │   ├── api.ts                  # API response types
│   │   ├── models.ts               # Data model types
│   │   ├── forms.ts                # Form types
│   │   └── index.ts                # Type exports
│   │
│   └── styles/
│       ├── variables.css           # CSS variables (colors, spacing)
│       ├── tailwind.css            # Tailwind imports
│       ├── animations.css          # Animations
│       └── utilities.css           # Utility classes
│
├── tests/
│   ├── unit/
│   │   ├── hooks/
│   │   ├── utils/
│   │   └── components/
│   ├── integration/
│   │   ├── auth.test.ts
│   │   ├── chat.test.ts
│   │   └── lessons.test.ts
│   └── e2e/
│       ├── onboarding.e2e.ts
│       ├── conversation.e2e.ts
│       └── progress.e2e.ts
│
├── .env.example
├── .env.local
├── .env.production
├── next.config.js
├── tsconfig.json
├── tailwind.config.js
├── postcss.config.js
├── jest.config.js
├── package.json
├── package-lock.json
└── README.md
```

## Backend (Node.js + Express) Structure

```
backend/
├── src/
│   ├── config/
│   │   ├── database.ts             # PostgreSQL connection
│   │   ├── redis.ts                # Redis client
│   │   ├── env.ts                  # Environment validation
│   │   └── constants.ts            # App constants
│   │
│   ├── services/
│   │   ├── auth/
│   │   │   ├── AuthService.ts
│   │   │   ├── JWTService.ts
│   │   │   ├── OAuthService.ts
│   │   │   └── PasswordService.ts
│   │   │
│   │   ├── user/
│   │   │   ├── UserService.ts
│   │   │   ├── ProfileService.ts
│   │   │   └── PreferencesService.ts
│   │   │
│   │   ├── chat/
│   │   │   ├── ChatService.ts
│   │   │   ├── OpenAIService.ts
│   │   │   ├── ContextManager.ts
│   │   │   └── ResponseProcessor.ts
│   │   │
│   │   ├── lesson/
│   │   │   ├── LessonService.ts
│   │   │   └── ProgressService.ts
│   │   │
│   │   ├── vocabulary/
│   │   │   ├── VocabularyService.ts
│   │   │   ├── SpacedRepetition.ts
│   │   │   └── QuizService.ts
│   │   │
│   │   ├── assessment/
│   │   │   ├── AssessmentService.ts
│   │   │   ├── ScoringEngine.ts
│   │   │   └── LevelDetection.ts
│   │   │
│   │   ├── speaking/
│   │   │   ├── WhisperService.ts    # Speech-to-text
│   │   │   ├── PronunciationService.ts
│   │   │   ├── TTSService.ts        # Text-to-speech
│   │   │   └── AudioAnalysis.ts
│   │   │
│   │   ├── adaptive/
│   │   │   ├── AdaptiveEngine.ts
│   │   │   └── DifficultySetter.ts
│   │   │
│   │   ├── progress/
│   │   │   ├── ProgressService.ts
│   │   │   ├── StreakManager.ts
│   │   │   └── BadgeService.ts
│   │   │
│   │   ├── analytics/
│   │   │   ├── AnalyticsService.ts
│   │   │   ├── EventLogger.ts
│   │   │   └── MetricsAggregator.ts
│   │   │
│   │   └── email/
│   │       ├── EmailService.ts
│   │       ├── TemplateEngine.ts
│   │       └── ReminderScheduler.ts
│   │
│   ├── controllers/
│   │   ├── AuthController.ts
│   │   ├── UserController.ts
│   │   ├── ChatController.ts
│   │   ├── LessonController.ts
│   │   ├── VocabularyController.ts
│   │   ├── ProgressController.ts
│   │   ├── SpeakingController.ts
│   │   ├── AssessmentController.ts
│   │   ├── AdminController.ts
│   │   └── HealthController.ts
│   │
│   ├── routes/
│   │   ├── auth.ts
│   │   ├── user.ts
│   │   ├── chat.ts
│   │   ├── lessons.ts
│   │   ├── vocabulary.ts
│   │   ├── progress.ts
│   │   ├── speaking.ts
│   │   ├── assessment.ts
│   │   ├── admin.ts
│   │   └── health.ts
│   │
│   ├── middleware/
│   │   ├── auth.ts                 # JWT verification
│   │   ├── errorHandler.ts         # Global error handler
│   │   ├── logging.ts              # Request/response logging
│   │   ├── validation.ts           # Input validation
│   │   ├── rateLimit.ts            # Rate limiting
│   │   ├── cors.ts                 # CORS setup
│   │   ├── requestId.ts            # Trace ID injection
│   │   └── wsAuth.ts               # WebSocket auth
│   │
│   ├── websocket/
│   │   ├── ChatGateway.ts          # Socket.io namespace
│   │   ├── ChatHandler.ts
│   │   ├── MessageQueue.ts
│   │   └── ConnectionManager.ts
│   │
│   ├── models/
│   │   ├── User.ts
│   │   ├── Lesson.ts
│   │   ├── Conversation.ts
│   │   ├── VocabularyWord.ts
│   │   ├── Progress.ts
│   │   ├── Assessment.ts
│   │   ├── GrammarCorrection.ts
│   │   └── ... (other models/repositories)
│   │
│   ├── migrations/
│   │   ├── 001_create_users.ts
│   │   ├── 002_create_lessons.ts
│   │   ├── 003_create_conversations.ts
│   │   ├── 004_create_vocabulary.ts
│   │   ├── 005_create_progress.ts
│   │   └── ... (other migrations)
│   │
│   ├── seeders/
│   │   ├── userSeeder.ts
│   │   ├── lessonSeeder.ts
│   │   ├── vocabularySeeder.ts
│   │   └── assessmentSeeder.ts
│   │
│   ├── jobs/
│   │   ├── DailyReminderJob.ts      # Bull job queue
│   │   ├── StreakCalculator.ts
│   │   ├── EmailDigest.ts
│   │   ├── Analytics.ts
│   │   └── CleanupExpiredSessions.ts
│   │
│   ├── utils/
│   │   ├── logger.ts               # Winston logger
│   │   ├── errorHandler.ts         # Error formatting
│   │   ├── validators.ts           # Input validators
│   │   ├── formatters.ts           # Response formatters
│   │   ├── cache.ts                # Caching utilities
│   │   ├── encryption.ts           # Encryption utilities
│   │   ├── jwt.ts                  # JWT utilities
│   │   ├── pagination.ts           # Pagination helpers
│   │   └── helpers.ts              # Common helpers
│   │
│   ├── types/
│   │   ├── api.ts
│   │   ├── models.ts
│   │   ├── services.ts
│   │   └── index.ts
│   │
│   ├── app.ts                       # Express app setup
│   └── server.ts                    # Server entry point
│
├── tests/
│   ├── unit/
│   │   ├── services/
│   │   │   ├── AuthService.test.ts
│   │   │   ├── ChatService.test.ts
│   │   │   └── VocabularyService.test.ts
│   │   ├── utils/
│   │   └── middleware/
│   ├── integration/
│   │   ├── auth.test.ts
│   │   ├── lessons.test.ts
│   │   ├── chat.test.ts
│   │   └── progress.test.ts
│   ├── fixtures/
│   │   └── mockData.ts
│   └── jest.config.js
│
├── docker/
│   ├── Dockerfile
│   ├── docker-compose.yml
│   ├── .dockerignore
│   └── entrypoint.sh
│
├── scripts/
│   ├── setup-db.ts                 # Database setup
│   ├── seed-db.ts                  # Database seeding
│   ├── migrate.ts                  # Run migrations
│   └── dev-setup.ts                # Development setup
│
├── .env.example
├── .env.development
├── .env.production
├── .env.test
├── tsconfig.json
├── jest.config.js
├── .eslintrc.json
├── .prettierrc
├── package.json
├── package-lock.json
└── README.md
```

## Shared/Monorepo Structure (Optional)

```
packages/
├── shared/
│   ├── types/
│   │   ├── api.ts
│   │   ├── models.ts
│   │   └── index.ts
│   ├── constants/
│   │   ├── errorCodes.ts
│   │   ├── routes.ts
│   │   └── index.ts
│   ├── utils/
│   │   ├── validators.ts
│   │   ├── formatters.ts
│   │   └── index.ts
│   └── package.json
│
└── ui/
    ├── components/
    │   ├── Button.tsx
    │   ├── Card.tsx
    │   ├── Input.tsx
    │   └── index.ts
    ├── styles/
    │   └── index.css
    ├── package.json
    └── tsconfig.json
```

## Project Root

```
/.github/
  ├── workflows/
  │   ├── frontend-tests.yml
  │   ├── backend-tests.yml
  │   ├── deploy-frontend.yml
  │   ├── deploy-backend.yml
  │   └── lint-and-format.yml
  └── ISSUE_TEMPLATE/

/docs/
  ├── ARCHITECTURE.md              (moved to main docs)
  ├── DATABASE.md
  ├── API.md
  ├── DEPLOYMENT.md
  ├── CONTRIBUTING.md
  └── TESTING.md

/terraform/                         (IaC)
  ├── main.tf
  ├── variables.tf
  ├── outputs.tf
  └── environments/

.dockerignore
.gitignore
.prettierrc
.eslintrc.json
docker-compose.yml                 (local development)
package.json                       (monorepo root)
tsconfig.json                      (root tsconfig)
README.md
CHANGELOG.md
LICENSE
```

## Development Environment Setup

### Environment Variables Files

**frontend/.env.local**
```
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_WS_URL=ws://localhost:8000
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=...
NEXT_PUBLIC_GA_ID=...
```

**backend/.env.development**
```
NODE_ENV=development
PORT=8000
DATABASE_URL=postgresql://user:password@localhost:5432/speakfloai
REDIS_URL=redis://localhost:6379
JWT_SECRET=dev-secret
OPENAI_API_KEY=...
WHISPER_API_KEY=...
ELEVENLABS_API_KEY=...
```

This structure provides:
- ✅ Clear separation of concerns
- ✅ Scalable microservices setup
- ✅ Easy to test each layer
- ✅ Monorepo-ready
- ✅ Docker-friendly
- ✅ CI/CD ready
- ✅ Production-grade organization
