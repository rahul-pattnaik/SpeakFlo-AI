# SpeakFlo AI - Testing Strategy & Test Cases

## Testing Pyramid

```
        △
       /E\         E2E Tests (10%)
      /───\        Critical user journeys
     /E2E \       
    ├─────┤
   /       \
  /Integration\ (30%)      API contracts, Database, Services
 /─────────────\
├───────────────┤
/               \
/   Unit Tests   \ (60%)    Functions, Classes, Utilities
/─────────────────\
└─────────────────┘
```

---

## Unit Tests (60%)

### Authentication Service Tests

```typescript
// backend/tests/unit/services/AuthService.test.ts

import { AuthService, RegisterInput, LoginInput } from '../../../src/services/auth/AuthService';
import db from '../../../src/config/database';
import redis from '../../../src/config/redis';
import bcrypt from 'bcryptjs';

jest.mock('../../../src/config/database');
jest.mock('../../../src/config/redis');
jest.mock('bcryptjs');

describe('AuthService', () => {
  let authService: AuthService;

  beforeEach(() => {
    authService = new AuthService();
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should register a new user with valid input', async () => {
      const input: RegisterInput = {
        email: 'test@example.com',
        password: 'SecurePass123!',
        full_name: 'John Doe',
        auth_provider: 'email',
      };

      (db.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [] }) // User doesn't exist
        .mockResolvedValueOnce({ rows: [{ id: 'uuid', email: input.email }] }) // User created
        .mockResolvedValueOnce({ rows: [] }); // Preferences created

      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_password');

      const result = await authService.register(input);

      expect(result.success).toBe(true);
      expect(result.user.email).toBe(input.email);
      expect(result.tokens.access_token).toBeDefined();
      expect(result.tokens.refresh_token).toBeDefined();
    });

    it('should reject duplicate email', async () => {
      const input: RegisterInput = {
        email: 'existing@example.com',
        password: 'SecurePass123!',
        full_name: 'John Doe',
        auth_provider: 'email',
      };

      (db.query as jest.Mock).mockResolvedValueOnce({ rows: [{ id: 'uuid' }] });

      await expect(authService.register(input)).rejects.toThrow(
        'User with this email already exists'
      );
    });

    it('should reject weak password', async () => {
      const input: RegisterInput = {
        email: 'test@example.com',
        password: 'weak',
        full_name: 'John Doe',
        auth_provider: 'email',
      };

      (db.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      await expect(authService.register(input)).rejects.toThrow(
        'Password must be at least 8 characters'
      );
    });

    it('should reject invalid email', async () => {
      const input: RegisterInput = {
        email: 'invalid-email',
        password: 'SecurePass123!',
        full_name: 'John Doe',
        auth_provider: 'email',
      };

      await expect(authService.register(input)).rejects.toThrow(
        'Invalid email format'
      );
    });
  });

  describe('login', () => {
    it('should login user with valid credentials', async () => {
      const input: LoginInput = {
        email: 'test@example.com',
        password: 'SecurePass123!',
      };

      (db.query as jest.Mock).mockResolvedValueOnce({
        rows: [{
          id: 'uuid',
          email: input.email,
          full_name: 'John Doe',
          password_hash: await bcrypt.hash(input.password, 12),
          is_active: true,
          english_level: 'beginner',
          subscription_tier: 'free',
        }],
      });

      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await authService.login(input);

      expect(result.success).toBe(true);
      expect(result.tokens.access_token).toBeDefined();
    });

    it('should reject incorrect password', async () => {
      (db.query as jest.Mock).mockResolvedValueOnce({
        rows: [{
          id: 'uuid',
          email: 'test@example.com',
          password_hash: 'hashed',
          is_active: true,
        }],
      });

      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(authService.login({
        email: 'test@example.com',
        password: 'WrongPassword123!',
      })).rejects.toThrow('Invalid email or password');
    });

    it('should reject non-existent user', async () => {
      (db.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      await expect(authService.login({
        email: 'nonexistent@example.com',
        password: 'SecurePass123!',
      })).rejects.toThrow('Invalid email or password');
    });
  });

  describe('refreshToken', () => {
    it('should refresh access token with valid refresh token', async () => {
      const refreshToken = 'valid_refresh_token';

      (redis.get as jest.Mock).mockResolvedValue(refreshToken);

      const jwtService = { verifyRefreshToken: jest.fn(), generateAccessToken: jest.fn() };
      authService.jwtService = jwtService as any;

      jwtService.verifyRefreshToken.mockReturnValue({
        userId: 'uuid',
        email: 'test@example.com',
      });
      jwtService.generateAccessToken.mockReturnValue('new_access_token');

      const result = await authService.refreshToken(refreshToken);

      expect(result.access_token).toBe('new_access_token');
      expect(result.expires_in).toBe(15 * 60);
    });

    it('should reject invalid refresh token', async () => {
      await expect(authService.refreshToken('invalid_token')).rejects.toThrow(
        'Invalid refresh token'
      );
    });
  });

  describe('logout', () => {
    it('should invalidate refresh token on logout', async () => {
      const userId = 'uuid';

      (redis.del as jest.Mock).mockResolvedValue(1);

      await authService.logout(userId);

      expect(redis.del).toHaveBeenCalledWith(`refresh_token:${userId}`);
    });
  });
});
```

### Chat Service Tests

```typescript
// backend/tests/unit/services/ChatService.test.ts

import { ChatService } from '../../../src/services/chat/ChatService';
import { OpenAIService } from '../../../src/services/chat/OpenAIService';

jest.mock('../../../src/services/chat/OpenAIService');

describe('ChatService', () => {
  let chatService: ChatService;
  let openAIService: jest.Mocked<OpenAIService>;

  beforeEach(() => {
    openAIService = new OpenAIService() as jest.Mocked<OpenAIService>;
    chatService = new ChatService(openAIService);
  });

  describe('sendMessage', () => {
    it('should send message and get AI response', async () => {
      const conversationId = 'conv-123';
      const message = 'Hello, how are you?';

      openAIService.getResponse.mockResolvedValue({
        text: 'I\'m doing well, thank you for asking!',
        tokens_used: 50,
      });

      const response = await chatService.sendMessage(
        conversationId,
        message,
        'casual'
      );

      expect(response.text).toBeDefined();
      expect(response.tokens_used).toBe(50);
    });

    it('should handle API errors gracefully', async () => {
      openAIService.getResponse.mockRejectedValue(
        new Error('API rate limit exceeded')
      );

      await expect(
        chatService.sendMessage('conv-123', 'Hello', 'casual')
      ).rejects.toThrow('API rate limit exceeded');
    });

    it('should extract grammar errors from AI response', async () => {
      const conversationId = 'conv-123';
      const message = 'He go to school';

      const mockAIResponse = {
        text: 'I think you meant "He goes to school"',
        tokens_used: 45,
        grammar_errors: [{
          original: 'He go',
          corrected: 'He goes',
          error_type: 'subject_verb_agreement',
          explanation: 'Third person singular requires "goes"'
        }]
      };

      openAIService.getResponse.mockResolvedValue(mockAIResponse);

      const response = await chatService.sendMessage(
        conversationId,
        message,
        'casual'
      );

      expect(response.grammar_errors).toHaveLength(1);
      expect(response.grammar_errors?.[0].error_type).toBe('subject_verb_agreement');
    });
  });

  describe('getConversationContext', () => {
    it('should retrieve recent conversation history', async () => {
      const conversationId = 'conv-123';
      const limit = 5;

      chatService.getConversationContext = jest.fn().mockResolvedValue([
        { sender: 'user', text: 'Hello' },
        { sender: 'ai', text: 'Hi! How are you?' },
      ]);

      const context = await chatService.getConversationContext(conversationId, limit);

      expect(context).toHaveLength(2);
    });
  });

  describe('calculateQualityScore', () => {
    it('should calculate conversation quality score', () => {
      const score = chatService.calculateQualityScore({
        fluency_score: 80,
        clarity_score: 85,
        grammar_score: 75,
        vocabulary_score: 88,
      });

      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(100);
    });
  });
});
```

### Progress Service Tests

```typescript
// backend/tests/unit/services/ProgressService.test.ts

describe('ProgressService', () => {
  describe('updateStreak', () => {
    it('should increment streak if practiced today', async () => {
      const userId = 'user-123';
      const lastPracticeDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // Yesterday

      const streak = await progressService.updateStreak(userId, lastPracticeDate);

      expect(streak).toBe(2); // Yesterday's 1 + today's 1
    });

    it('should reset streak if more than 24 hours since last practice', async () => {
      const userId = 'user-123';
      const lastPracticeDate = new Date(Date.now() - 48 * 60 * 60 * 1000); // 2 days ago

      const streak = await progressService.updateStreak(userId, lastPracticeDate);

      expect(streak).toBe(1); // Reset to 1
    });

    it('should not change streak if already practiced today', async () => {
      const userId = 'user-123';
      const lastPracticeDate = new Date(Date.now() - 1 * 60 * 60 * 1000); // 1 hour ago

      const streak = await progressService.updateStreak(userId, lastPracticeDate);

      expect(streak).toBe(5); // Same as before
    });
  });

  describe('calculateOverallScore', () => {
    it('should calculate weighted average of skill scores', () => {
      const scores = {
        listening: 80,
        speaking: 75,
        grammar: 85,
        vocabulary: 90,
        fluency: 70,
      };

      const overall = progressService.calculateOverallScore(scores);

      expect(overall).toBeGreaterThan(70);
      expect(overall).toBeLessThan(90);
    });
  });

  describe('detectWeakAreas', () => {
    it('should identify areas below proficiency threshold', async () => {
      const userId = 'user-123';

      const weakAreas = await progressService.detectWeakAreas(userId);

      expect(weakAreas).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            area_type: expect.any(String),
            confidence_score: expect.any(Number),
          })
        ])
      );

      // All weak areas should have low confidence
      weakAreas.forEach(area => {
        expect(area.confidence_score).toBeLessThan(70);
      });
    });
  });
});
```

---

## Integration Tests (30%)

### Authentication Flow Tests

```typescript
// backend/tests/integration/auth.test.ts

import request from 'supertest';
import { app, httpServer } from '../../../src/app';
import db from '../../../src/config/database';

describe('Authentication Integration Tests', () => {
  beforeAll(async () => {
    await db.query('DELETE FROM users WHERE email LIKE $1', ['%test%']);
  });

  afterAll(async () => {
    await httpServer.close();
  });

  describe('POST /api/v1/auth/register', () => {
    it('should register new user and return tokens', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'newuser@example.com',
          password: 'SecurePass123!',
          full_name: 'New User',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.user.email).toBe('newuser@example.com');
      expect(response.body.tokens.access_token).toBeDefined();
      expect(response.body.tokens.refresh_token).toBeDefined();
    });

    it('should return 409 for duplicate email', async () => {
      // Register first user
      await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'duplicate@example.com',
          password: 'SecurePass123!',
          full_name: 'User 1',
        });

      // Try to register with same email
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'duplicate@example.com',
          password: 'SecurePass123!',
          full_name: 'User 2',
        });

      expect(response.status).toBe(409);
      expect(response.body.error.code).toBe('DUPLICATE_RESOURCE');
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('should login user with valid credentials', async () => {
      const email = 'logintest@example.com';
      const password = 'SecurePass123!';

      // Register user first
      await request(app)
        .post('/api/v1/auth/register')
        .send({
          email,
          password,
          full_name: 'Login Test User',
        });

      // Login
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({ email, password });

      expect(response.status).toBe(200);
      expect(response.body.tokens.access_token).toBeDefined();
    });

    it('should return 401 for invalid credentials', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'WrongPassword123!',
        });

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('AUTH_REQUIRED');
    });
  });

  describe('POST /api/v1/auth/refresh-token', () => {
    it('should return new access token with valid refresh token', async () => {
      // Register and get tokens
      const registerResponse = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'refreshtest@example.com',
          password: 'SecurePass123!',
          full_name: 'Refresh Test',
        });

      const refreshToken = registerResponse.body.tokens.refresh_token;

      // Refresh token
      const response = await request(app)
        .post('/api/v1/auth/refresh-token')
        .send({ refresh_token: refreshToken });

      expect(response.status).toBe(200);
      expect(response.body.access_token).toBeDefined();
      expect(response.body.access_token).not.toBe(
        registerResponse.body.tokens.access_token
      );
    });
  });
});
```

### Chat API Tests

```typescript
// backend/tests/integration/chat.test.ts

describe('Chat API Integration Tests', () => {
  let authToken: string;
  let conversationId: string;

  beforeAll(async () => {
    // Register and login user
    const registerResponse = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'chattest@example.com',
        password: 'SecurePass123!',
        full_name: 'Chat Test User',
      });

    authToken = registerResponse.body.tokens.access_token;
  });

  describe('POST /api/v1/chat/start', () => {
    it('should start new conversation', async () => {
      const response = await request(app)
        .post('/api/v1/chat/start')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          conversation_type: 'roleplay',
          scenario_type: 'job_interview',
        });

      expect(response.status).toBe(201);
      expect(response.body.conversation_id).toBeDefined();
      expect(response.body.initial_message).toBeDefined();

      conversationId = response.body.conversation_id;
    });
  });

  describe('POST /api/v1/chat/conversations/:id/messages', () => {
    it('should send message and receive response', async () => {
      const response = await request(app)
        .post(`/api/v1/chat/conversations/${conversationId}/messages`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          message: 'Hello, I am interested in this position',
          format: 'text',
        });

      expect(response.status).toBe(200);
      expect(response.body.message_id).toBeDefined();
      expect(response.body.text).toBeDefined();
      expect(response.body.grammar_corrections).toBeDefined();
    });

    it('should reject unauthorized request', async () => {
      const response = await request(app)
        .post(`/api/v1/chat/conversations/${conversationId}/messages`)
        .send({
          message: 'Hello',
          format: 'text',
        });

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/v1/chat/conversations/:id', () => {
    it('should retrieve conversation details', async () => {
      const response = await request(app)
        .get(`/api/v1/chat/conversations/${conversationId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(conversationId);
      expect(response.body.messages).toBeInstanceOf(Array);
    });
  });
});
```

---

## E2E Tests (10%)

### Critical User Journeys

```typescript
// frontend/tests/e2e/onboarding.e2e.ts

import { test, expect } from '@playwright/test';

test.describe('Onboarding Flow', () => {
  test('should complete user onboarding from registration to first conversation', async ({ page }) => {
    // 1. Navigate to landing page
    await page.goto('http://localhost:3000');
    await expect(page).toHaveTitle('SpeakFlo AI');

    // 2. Click Register button
    await page.click('button:has-text("Get Started")');
    await page.waitForURL('**/register');

    // 3. Fill registration form
    await page.fill('input[name="email"]', `test-${Date.now()}@example.com`);
    await page.fill('input[name="password"]', 'SecurePass123!');
    await page.fill('input[name="full_name"]', 'E2E Test User');
    await page.click('button[type="submit"]');

    // 4. Wait for redirect to onboarding
    await page.waitForURL('**/onboarding/step-1');
    await expect(page.locator('text=Let\'s get to know you')).toBeVisible();

    // 5. Complete step 1 (Basic info)
    await page.fill('input[name="learning_goal"]', 'Daily communication');
    await page.click('button:has-text("Next")');

    // 6. Complete step 2 (Preferences)
    await page.selectOption('select[name="lesson_duration"]', '15min');
    await page.click('button:has-text("Next")');

    // 7. Take assessment
    await page.waitForURL('**/onboarding/assessment');
    
    // Answer 5 assessment questions
    for (let i = 0; i < 5; i++) {
      await page.click('label:has-text("Option A")');
      if (i < 4) {
        await page.click('button:has-text("Next Question")');
      }
    }
    
    await page.click('button:has-text("Complete Assessment")');

    // 8. View results
    await page.waitForURL('**/onboarding/success');
    await expect(page.locator('text=You are intermediate level')).toBeVisible();

    // 9. Go to dashboard
    await page.click('button:has-text("Start Learning")');
    await page.waitForURL('**/dashboard');
    await expect(page.locator('text=Welcome back')).toBeVisible();

    // 10. Start a conversation
    await page.click('a:has-text("Chat")');
    await page.waitForURL('**/chat');

    await page.click('button:has-text("Start Conversation")');
    await page.waitForSelector('[data-test="chat-window"]');

    // 11. Send a message
    const messageInput = page.locator('input[placeholder="Type your message..."]');
    await messageInput.fill('Hello, how are you today?');
    await page.click('button[aria-label="Send message"]');

    // 12. Wait for AI response
    await page.waitForSelector('[data-test="ai-response"]', { timeout: 10000 });
    const aiResponse = await page.locator('[data-test="ai-response"]').first();
    await expect(aiResponse).toContainText(/how|doing|you/i);
  });
});
```

### Chat Conversation E2E

```typescript
// frontend/tests/e2e/conversation.e2e.ts

test.describe('Chat Conversation', () => {
  let authToken: string;
  let conversationId: string;

  test.beforeAll(async () => {
    // Get auth token via API
    const response = await fetch(`${API_URL}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: `test-${Date.now()}@example.com`,
        password: 'SecurePass123!',
        full_name: 'E2E Chat Test',
      }),
    });

    const data = await response.json();
    authToken = data.tokens.access_token;
  });

  test('should send voice message and receive response', async ({ page, context }) => {
    // Set auth token in cookies
    await context.addCookies([
      {
        name: 'auth_token',
        value: authToken,
        domain: 'localhost',
        path: '/',
      },
    ]);

    await page.goto('http://localhost:3000/chat');

    // Start conversation
    await page.click('button:has-text("Start New Conversation")');
    await page.selectOption('select[name="scenario"]', 'casual');

    // Record voice message
    await page.click('button[aria-label="Start recording"]');
    await page.waitForTimeout(3000); // Simulate 3 second recording
    await page.click('button[aria-label="Stop recording"]');

    // Check for grammar corrections
    await expect(
      page.locator('[data-test="grammar-corrections"]')
    ).toBeVisible({ timeout: 5000 });

    // Check pronunciation feedback
    await expect(
      page.locator('[data-test="pronunciation-score"]')
    ).toBeVisible();

    // Send text message
    await page.fill('input[placeholder="Type message..."]', 'That was great!');
    await page.click('button:has-text("Send")');

    // Verify response
    await expect(
      page.locator('[data-test="ai-message"]:last-child')
    ).toContainText(/great|wonderful|excellent/i);
  });
});
```

---

## Test Coverage Goals

| Layer | Target | Current |
|-------|--------|---------|
| Unit Tests | 80%+ | - |
| Integration Tests | 70%+ | - |
| E2E Tests | Critical paths | - |
| **Overall** | **80%** | - |

## Running Tests

```bash
# Unit tests
npm run test:unit

# Integration tests (requires database)
npm run test:integration

# E2E tests (requires running app)
npm run test:e2e

# All tests
npm run test

# With coverage
npm run test:coverage

# Watch mode
npm run test:watch

# Test specific file
npm run test -- auth.test.ts

# Test specific suite
npm run test -- --testNamePattern="AuthService"
```

## CI/CD Integration

Tests run automatically on:
- Every git push (unit + integration)
- Pull requests (all tests)
- Deployment (all tests must pass)
- Scheduled nightly (all tests + performance)

## Performance Testing

```typescript
// backend/tests/performance/load.test.ts

import k6 from 'k6';
import http from 'k6/http';

export const options = {
  stages: [
    { duration: '30s', target: 20 },   // Ramp up to 20 VUs
    { duration: '1m30s', target: 10 }, // Ramp down to 10 VUs
    { duration: '20s', target: 0 },    // Ramp down to 0 VUs
  ],
};

export default function () {
  const response = http.post('http://localhost:8000/api/v1/chat/start', {
    conversation_type: 'free_talk',
  }, {
    headers: { 'Content-Type': 'application/json' },
  });

  k6.check(response, {
    'status is 201': (r) => r.status === 201,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });
}
```

Run: `k6 run load.test.ts`

---

## Accessibility Testing

```typescript
// frontend/tests/a11y/accessibility.test.ts

import { injectAxe, getViolations } from 'axe-playwright';

test('should have no accessibility violations', async ({ page }) => {
  await page.goto('http://localhost:3000/dashboard');
  await injectAxe(page);
  
  const violations = await getViolations(page);
  expect(violations).toEqual([]);
});
```
