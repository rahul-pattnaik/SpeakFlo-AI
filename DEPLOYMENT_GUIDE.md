# SpeakFlo AI - Deployment Guide

## Prerequisites

- Node.js 18+
- PostgreSQL 15+
- Redis 7+
- Docker & Docker Compose
- Git
- AWS Account (or equivalent for S3-like storage)
- API Keys: OpenAI, ElevenLabs, SendGrid

---

## Local Development Setup

### 1. Clone & Install

```bash
# Clone repository
git clone https://github.com/yourusername/speakfloai.git
cd speakfloai

# Install dependencies
npm install
cd frontend && npm install
cd ../backend && npm install
cd ..
```

### 2. Environment Setup

```bash
# Frontend
cp frontend/.env.example frontend/.env.local
# Edit: NEXT_PUBLIC_API_URL, NEXT_PUBLIC_WS_URL

# Backend
cp backend/.env.example backend/.env.development
# Edit: DATABASE_URL, REDIS_URL, API keys

# Database
cp database/.env.example database/.env
```

### 3. Database Setup

```bash
# Start PostgreSQL & Redis
docker-compose up -d postgres redis

# Run migrations
cd backend
npm run migrate
npm run seed  # Optional: seed sample data

# Create test database
npm run migrate -- --env test
```

### 4. Run Development Servers

```bash
# Terminal 1: Backend
cd backend
npm run dev
# Runs on http://localhost:8000

# Terminal 2: Frontend
cd frontend
npm run dev
# Runs on http://localhost:3000
```

Visit http://localhost:3000

---

## Production Deployment

### Option 1: Vercel (Frontend) + Railway (Backend)

#### Frontend Deployment (Vercel)

1. **Connect Repository**
   - Go to vercel.com
   - Click "Import Project"
   - Select GitHub repository

2. **Configure Environment**
   - Set `NEXT_PUBLIC_API_URL` to production backend
   - Set `NEXT_PUBLIC_WS_URL` to production WebSocket
   - Set `NEXT_PUBLIC_ANALYTICS_ID`

3. **Deploy**
   ```bash
   vercel --prod
   ```

#### Backend Deployment (Railway)

1. **Create Railway Project**
   - Go to railway.app
   - Click "Create New Project"
   - Select "GitHub Repo"

2. **Configure Services**
   - Add PostgreSQL plugin
   - Add Redis plugin
   - Add Node.js service

3. **Set Environment Variables**
   ```
   NODE_ENV=production
   DATABASE_URL=<Railway PostgreSQL URL>
   REDIS_URL=<Railway Redis URL>
   JWT_SECRET=<generate: openssl rand -hex 32>
   OPENAI_API_KEY=<your key>
   WHISPER_API_KEY=<your key>
   ELEVENLABS_API_KEY=<your key>
   SENDGRID_API_KEY=<your key>
   FRONTEND_URL=<your Vercel URL>
   ```

4. **Deploy**
   - Railway auto-deploys on git push

### Option 2: Docker + AWS / DigitalOcean

#### Create Docker Images

```bash
# Backend Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY backend ./
EXPOSE 8000
CMD ["npm", "start"]
```

```bash
# Frontend Dockerfile
FROM node:18-alpine as builder
WORKDIR /app
COPY frontend/package*.json ./
RUN npm ci
COPY frontend ./
RUN npm run build

FROM node:18-alpine
WORKDIR /app
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/package.json ./
RUN npm install --only=production
EXPOSE 3000
CMD ["npm", "start"]
```

#### Build & Push to Registry

```bash
# Build images
docker build -f backend/Dockerfile -t speakfloai/backend:1.0.0 .
docker build -f frontend/Dockerfile -t speakfloai/frontend:1.0.0 .

# Push to Docker Hub / AWS ECR / DigitalOcean Registry
docker push speakfloai/backend:1.0.0
docker push speakfloai/frontend:1.0.0
```

#### Deploy on DigitalOcean App Platform

```bash
# Create app.yaml
name: speakfloai
services:
- name: backend
  github:
    repo: yourusername/speakfloai
    branch: main
  build_command: cd backend && npm install
  run_command: npm start
  environment_slug: node-js
  envs:
  - key: DATABASE_URL
    scope: RUN_AND_BUILD_TIME
    value: ${db.DATABASE_URL}
  - key: REDIS_URL
    scope: RUN_AND_BUILD_TIME
    value: ${cache.DATABASE_URL}
  - key: JWT_SECRET
    scope: RUN_AND_BUILD_TIME
    value: ${JWT_SECRET}
  http_port: 8000

- name: frontend
  github:
    repo: yourusername/speakfloai
    branch: main
  build_command: cd frontend && npm install && npm run build
  run_command: npm start
  environment_slug: node-js
  envs:
  - key: NEXT_PUBLIC_API_URL
    scope: BUILD_TIME
    value: https://api.speakfloai.com
  http_port: 3000

databases:
- name: db
  engine: PG
  production: true
  version: "15"

- name: cache
  engine: REDIS
  production: true
  version: "7"

# Deploy
doctl apps create --spec app.yaml
```

---

## Database Migration

### Using Knex.js Migrations

```bash
# Create migration
npm run migrate:create add_conversations_table

# Write migration in migrations/
# Up: CREATE TABLE...
# Down: DROP TABLE...

# Run migrations
npm run migrate:up

# Rollback
npm run migrate:rollback
```

### Production Migration Strategy

```bash
# 1. Create backup
pg_dump production_db > backup_$(date +%Y%m%d_%H%M%S).sql

# 2. Test on staging
psql staging_db < migration.sql

# 3. Run on production with zero-downtime
# Use blue-green deployment or read replicas

# 4. Monitor
# Check error logs
# Monitor database performance
# Check application metrics
```

---

## CI/CD Pipeline (GitHub Actions)

### `.github/workflows/deploy.yml`

```yaml
name: Deploy

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
      redis:
        image: redis:7
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
    - uses: actions/checkout@v3

    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'

    - name: Install dependencies
      run: npm ci

    - name: Lint
      run: npm run lint

    - name: Run tests
      run: npm run test -- --coverage
      env:
        DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test
        REDIS_URL: redis://localhost:6379

    - name: Upload coverage
      uses: codecov/codecov-action@v3

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'

    permissions:
      contents: read
      packages: write

    steps:
    - uses: actions/checkout@v3

    - name: Log in to Container Registry
      uses: docker/login-action@v2
      with:
        registry: ${{ env.REGISTRY }}
        username: ${{ github.actor }}
        password: ${{ secrets.GITHUB_TOKEN }}

    - name: Build and push backend
      uses: docker/build-push-action@v4
      with:
        context: backend
        push: true
        tags: ${{ env.REGISTRY }}/speakfloai/backend:latest

    - name: Build and push frontend
      uses: docker/build-push-action@v4
      with:
        context: frontend
        push: true
        tags: ${{ env.REGISTRY }}/speakfloai/frontend:latest

    - name: Deploy to Railway
      run: |
        curl -X POST https://api.railway.app/webhooks/deploy \
          -H "Authorization: Bearer ${{ secrets.RAILWAY_TOKEN }}" \
          -d '{"projectId":"${{ secrets.RAILWAY_PROJECT_ID }}"}'

    - name: Slack Notification
      uses: slackapi/slack-github-action@v1
      with:
        webhook-url: ${{ secrets.SLACK_WEBHOOK }}
        payload: |
          {
            "text": "Deployment successful! 🚀"
          }
```

---

## Monitoring & Observability

### Sentry Setup (Error Tracking)

```bash
# Install
npm install @sentry/node @sentry/tracing

# Configure in backend
import * as Sentry from "@sentry/node";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
});

app.use(Sentry.Handlers.requestHandler());
app.use(Sentry.Handlers.errorHandler());
```

### Datadog/New Relic Setup (Metrics)

```bash
# Install
npm install newrelic

# Configure
require('newrelic');

// Add in app start
```

### Custom Monitoring Dashboard

```bash
# Prometheus metrics
npm install prom-client

# Export metrics
const register = new prometheus.Registry();

// Track requests
const httpRequestDuration = new prometheus.Histogram({
  name: 'http_request_duration_ms',
  help: 'Duration of HTTP requests in ms',
  buckets: [0.1, 5, 15, 50, 100, 500],
});

app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    httpRequestDuration.observe(duration);
  });
  next();
});

// Expose metrics
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});
```

---

## Backup & Disaster Recovery

### Database Backups

```bash
# Automated daily backups
0 2 * * * pg_dump $DATABASE_URL | gzip > /backups/db_$(date +\%Y\%m\%d).sql.gz

# Restore from backup
psql < db_20240101.sql.gz

# Test backup restoration weekly
```

### Redis Backups

```bash
# Configure in Redis
save 900 1      # Save every 15 mins if 1+ key changed
save 300 10     # Save every 5 mins if 10+ keys changed
save 60 10000   # Save every 60 secs if 10k+ keys changed

# Backup RDB file
cp /data/dump.rdb /backups/dump_$(date +%Y%m%d).rdb
```

### File Storage Backups

```bash
# S3/Supabase automatic versioning enabled
# Monthly exports to separate bucket
aws s3 cp s3://speakfloai-files s3://speakfloai-backups-$(date +%Y%m%d) --recursive
```

### Recovery RTO/RPO Targets

- **RTO (Recovery Time Objective)**: < 4 hours
- **RPO (Recovery Point Objective)**: < 1 hour
- **Monthly disaster recovery drills**: Yes

---

## Security Hardening

### SSL/TLS

```bash
# Use Let's Encrypt certificates (auto-renewed)
# Configure in Nginx/Vercel

# Test SSL
curl -I https://api.speakfloai.com
```

### Secrets Management

```bash
# Use environment variables (Railway, Vercel)
# Or HashiCorp Vault for advanced setup

# Never commit secrets
echo ".env*" >> .gitignore
git rm --cached .env.*
```

### DDoS Protection

```bash
# Cloudflare DDoS protection
# Configure DNS through Cloudflare
# Enable WAF rules
```

### SQL Injection Prevention

```bash
# Use parameterized queries (already implemented)
db.query('SELECT * FROM users WHERE id = $1', [userId])

# Never use template strings
// ❌ WRONG: SELECT * FROM users WHERE id = ${id}
// ✅ CORRECT: SELECT * FROM users WHERE id = $1
```

### Rate Limiting Headers

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1705773930
```

---

## Performance Optimization

### Database Query Optimization

```sql
-- Add indexes for common queries
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_conversations_user_created ON conversations(user_id, created_at DESC);
CREATE UNIQUE INDEX idx_user_vocab_pair ON user_vocabulary(user_id, word_id);

-- Enable connection pooling
-- PgBouncer: max_db_connections = 100
```

### Caching Strategy

```bash
# Redis cache layers
- User sessions: 24 hours
- Lesson content: 7 days
- Vocabulary: 30 days
- Assessment results: 1 hour
- API responses: 5 minutes

# Cache invalidation on updates
```

### CDN Configuration

```bash
# Cloudflare CDN for:
- Static assets (JS, CSS, images)
- API responses (with Cache-Control headers)
- Video content (H.264 + adaptive bitrate)

# Cache-Control: public, max-age=86400
```

### Code Splitting

```bash
# Frontend lazy loading
import dynamic from 'next/dynamic'
const ChatComponent = dynamic(() => import('./Chat'), { loading: () => <p>Loading...</p> })

# Bundle analysis
npm run build --analyze
```

---

## Scaling Strategy

### Vertical Scaling
- Increase server resources as needed
- Monitor CPU, memory, disk usage

### Horizontal Scaling
```bash
# Load balancer: Nginx / AWS ELB
# Multiple backend instances: 2-10 replicas
# Database read replicas: 2-3 replicas
# Cache cluster: Redis Cluster mode
```

### Auto-scaling Rules

```yaml
- Scale up if:
  - CPU > 70% for 5 minutes
  - Memory > 80%
  - Response time > 500ms (p95)

- Scale down if:
  - CPU < 30% for 15 minutes
  - Memory < 50%
```

---

## Health Checks

```bash
# Every 30 seconds
GET /health
Response:
{
  "status": "ok",
  "timestamp": "2024-01-20T15:45:30Z",
  "database": "connected",
  "redis": "connected",
  "openai_api": "ok",
  "uptime_seconds": 123456
}
```

---

## Post-Deployment Checklist

- [ ] Health checks passing
- [ ] Error rate < 0.1%
- [ ] Response time < 200ms (p95)
- [ ] Database backups running
- [ ] Monitoring alerts configured
- [ ] SSL certificate installed & valid
- [ ] Rate limiting working
- [ ] Analytics tracking working
- [ ] Email notifications working
- [ ] All tests passing
- [ ] Documentation updated
- [ ] Runbook created for on-call
- [ ] Team notified of deployment

---

## Troubleshooting

### Database Connection Issues

```bash
# Check connection
psql $DATABASE_URL -c "SELECT 1"

# Reset pool
npm run db:reset-pool

# Monitor connections
SELECT count(*) FROM pg_stat_activity;
```

### Memory Leaks

```bash
# Monitor memory usage
node --inspect app.js

# Use Chrome DevTools for profiling
# chrome://inspect
```

### High API Latency

```bash
# Check database query performance
EXPLAIN ANALYZE SELECT ...

# Add missing indexes
CREATE INDEX idx_name ON table(column);

# Monitor OpenAI API
# Check rate limits and response times
```

### WebSocket Connection Issues

```bash
# Check logs
journalctl -u speakfloai -f

# Verify WebSocket endpoint
curl -i -N -H "Connection: Upgrade" -H "Upgrade: websocket" \
  https://api.speakfloai.com/socket.io
```

---

## Support & Maintenance

### On-Call Rotation
- Slack alerts for critical errors
- PagerDuty escalation policy
- 15-minute response SLA

### Maintenance Windows
- Monthly security updates: Sunday 2-3 AM UTC
- Quarterly major updates: First Sunday of quarter
- Database maintenance: Monthly

### Documentation
- Runbooks for common issues
- Architecture diagrams
- API documentation
- Contributing guidelines
