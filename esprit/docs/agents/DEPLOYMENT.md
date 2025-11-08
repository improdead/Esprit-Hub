# 🚀 Deployment & Testing Guide

**Complete guide to testing, deploying, and monitoring agents in production**

This guide covers local testing, Docker deployment, monitoring, performance optimization, and production readiness.

---

## 📖 Table of Contents

1. [Local Development](#local-development)
2. [Testing Strategies](#testing-strategies)
3. [Docker Deployment](#docker-deployment)
4. [Monitoring & Logging](#monitoring--logging)
5. [Performance Tuning](#performance-tuning)
6. [Production Checklist](#production-checklist)
7. [Scaling](#scaling)

---

## Local Development

### Quick Start

**Prerequisites**:
- Node.js 16+
- Docker Desktop (optional)
- Yarn or npm

### Option 1: Full Docker Compose (Recommended)

**Setup**:
```bash
cd esprit/

# Copy environment template
cp .env.example .env

# Start all services
docker compose -f infra/docker-compose.yml up -d --build

# Wait for services to be ready (30-60 seconds)
docker compose -f infra/docker-compose.yml logs -f

# When all services are healthy, open in browser
open http://localhost:8080
```

**What you get**:
- SkyOffice UI on `http://localhost:8080`
- Sim.ai Studio on `http://localhost:8080/studio/`
- Gateway API on `http://localhost:8080/api/`
- All services properly networked

**Stopping**:
```bash
docker compose -f infra/docker-compose.yml down
```

**Viewing logs**:
```bash
# All services
docker compose -f infra/docker-compose.yml logs -f

# Specific service
docker compose -f infra/docker-compose.yml logs -f gateway
docker compose -f infra/docker-compose.yml logs -f sim
```

---

### Option 2: Local Development (No Docker)

**Useful for**: Rapid development, debugging

**Prerequisites**:
- Sim.ai running separately (Docker or managed)
- PostgreSQL running
- Redis running

**Setup Gateway**:
```bash
cd esprit/apps/gateway

# Install dependencies
yarn install

# Create .env file
cat > .env << EOF
PORT=3001
AGENT_MAP_FILE=./data/agents.json
LOG_LEVEL=debug
EOF

# Run in development mode
yarn dev

# Output: Server listening on http://localhost:3001
```

**Setup SkyOffice UI**:
```bash
cd esprit/apps/skyoffice

# Install dependencies
yarn install

# Create .env.local (optional)
cat > .env.local << EOF
VITE_STUDIO_URL=http://localhost:8080/studio/
EOF

# Run in development mode
yarn dev

# Output: http://localhost:5173
```

**Connect to services**:
- SkyOffice: `http://localhost:5173`
- Gateway: `http://localhost:3001`
- Sim.ai: Run separately and configure CORS

---

## Testing Strategies

### 1. Unit Testing Workflows

**Test in Sim.ai Studio**:

1. Open workflow in Studio
2. Click "Test" button
3. Provide test payload:
   ```json
   {
     "title": "Team meeting",
     "time": "2025-11-08T14:00:00Z"
   }
   ```
4. Check execution results
5. Review logs for errors

**Automate workflow tests** (Advanced):
```bash
# Using Sim.ai API to test
curl -X POST http://localhost:3000/api/v1/workflows/test \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "workflowId": "wf_123",
    "payload": {
      "title": "Test Event"
    }
  }'
```

---

### 2. Integration Testing

**Test via Gateway**:

```bash
# Test agent triggering
curl -X POST http://localhost:8080/api/run/scheduler \
  -H "Content-Type: application/json" \
  -d '{
    "payload": {
      "title": "Integration Test Event",
      "time": "2025-11-08T14:00:00Z"
    }
  }'

# Expected response:
# { "success": true, "agent": "scheduler", "npc": "scheduler" }
```

**Test SSE streaming**:
```bash
# In one terminal, subscribe to SSE
curl -N http://localhost:8080/api/stream?npc=scheduler

# In another terminal, trigger agent
curl -X POST http://localhost:8080/api/run/scheduler \
  -H "Content-Type: application/json" \
  -d '{"payload": {}}'

# You should see events appear in the SSE terminal
```

---

### 3. End-to-End Testing

**Manual E2E test**:

1. Open `http://localhost:8080` in browser
2. Click on an agent card
3. Click "Run" button
4. Watch logs update in real-time
5. Verify workflow completes successfully

**Automated E2E test** (Playwright):

```javascript
// tests/agent.spec.ts
import { test, expect } from '@playwright/test';

test('scheduler agent workflow', async ({ page }) => {
  // Navigate to app
  await page.goto('http://localhost:8080');

  // Find and click scheduler card
  const schedulerCard = page.locator('text=Scheduler');
  await expect(schedulerCard).toBeVisible();

  // Click run button
  const runButton = schedulerCard.locator('button:has-text("Run")');
  await runButton.click();

  // Wait for 'done' status
  const doneStatus = schedulerCard.locator('text=done');
  await expect(doneStatus).toBeVisible({ timeout: 30000 });

  // Verify logs
  const logs = schedulerCard.locator('[data-test="logs"]');
  await expect(logs).toContainText('Event created');
});
```

---

### 4. Load Testing

**Test with concurrent requests**:

```bash
# Using Apache Bench
ab -n 100 -c 10 -p payload.json \
  -T application/json \
  http://localhost:8080/api/run/scheduler

# Using wrk
wrk -t4 -c100 -d30s \
  -s test.lua \
  http://localhost:8080/api/run/scheduler
```

**Verify under load**:
- Gateway stays responsive
- SSE connections remain stable
- No memory leaks
- Workflow execution times consistent

---

## Docker Deployment

### Building for Production

**Create optimized Docker image**:

```dockerfile
# Dockerfile for Gateway
FROM node:18-alpine

WORKDIR /app

COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile --production

COPY . .

EXPOSE 3001

CMD ["node", "dist/index.js"]
```

**Build**:
```bash
docker build -t esprit-gateway:1.0.0 esprit/apps/gateway/
```

---

### Docker Compose Configuration

**Location**: `esprit/infra/docker-compose.yml`

**Key services**:
- `gateway` - API gateway
- `skyoffice` - React UI
- `sim` - Sim.ai runtime
- `postgres` - Database
- `redis` - Cache
- `reverse-proxy` - Nginx

**Example production docker-compose.yml**:
```yaml
version: '3.8'

services:
  reverse-proxy:
    image: nginx:latest
    ports:
      - "8080:80"
    volumes:
      - ./infra/nginx.conf:/etc/nginx/nginx.conf
    depends_on:
      - gateway
      - skyoffice
      - sim
    healthcheck:
      test: ["CMD", "wget", "-q", "--spider", "http://localhost"]
      interval: 10s
      timeout: 5s
      retries: 3

  gateway:
    build: ./apps/gateway
    environment:
      PORT: 3001
      AGENT_MAP_FILE: /app/data/agents.json
      LOG_LEVEL: info
    volumes:
      - ./apps/gateway/data:/app/data
    depends_on:
      - sim
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001/health"]
      interval: 10s
      timeout: 5s
      retries: 3

  skyoffice:
    build: ./apps/skyoffice
    environment:
      VITE_STUDIO_URL: http://localhost:8080/studio/
    ports:
      - "80:80"

  sim:
    image: sim-ai:latest
    environment:
      DATABASE_URL: postgresql://postgres:postgres@postgres:5432/simstudio
      REDIS_URL: redis://redis:6379
    depends_on:
      - postgres
      - redis
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 10s
      timeout: 5s
      retries: 3

  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: simstudio
      POSTGRES_PASSWORD: postgres
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 3

volumes:
  postgres_data:
```

---

### Environment Variables for Production

**Create `.env` file**:
```bash
# Network
PUBLIC_ORIGIN=https://agents.example.com

# Gateway
PORT=3001
AGENT_MAP_FILE=/app/data/agents.json
LOG_LEVEL=warn  # warn in production

# Sim.ai
DATABASE_URL=postgresql://user:pass@postgres:5432/simstudio
REDIS_URL=redis://redis:6379
BETTER_AUTH_SECRET=generate-random-secret-here
ENCRYPTION_KEY=generate-32-char-key-here
SOCKET_SERVER_URL=https://agents.example.com

# Optional: LLM Integration
LITELLM_API_BASE=https://litellm.example.com
LITELLM_API_KEY=your_litellm_key

# Optional: OAuth Integration
NANGO_API_KEY=your_nango_key
```

---

## Monitoring & Logging

### Health Checks

**Check service health**:
```bash
# All services
docker compose -f infra/docker-compose.yml ps

# Specific health check
curl http://localhost:8080/health
curl http://localhost:3001/health
curl http://localhost:3000/health
```

**Expected healthy output**:
```
NAME              STATUS      HEALTH
gateway           running     healthy
skyoffice         running     healthy
sim               running     healthy
postgres          running     healthy
redis             running     healthy
```

---

### Logging Strategy

**Log levels**:
- `debug` - Detailed info for debugging
- `info` - General operational info
- `warn` - Warnings (recoverable issues)
- `error` - Errors (unrecoverable)

**Set log level**:
```bash
# In .env
LOG_LEVEL=info

# Or via environment
docker compose -f infra/docker-compose.yml up -d \
  -e LOG_LEVEL=debug
```

**View logs**:
```bash
# Recent logs for gateway
docker compose -f infra/docker-compose.yml logs --tail=100 gateway

# Follow logs in real-time
docker compose -f infra/docker-compose.yml logs -f gateway

# Logs from multiple services
docker compose -f infra/docker-compose.yml logs -f gateway sim
```

---

### Monitoring Metrics

**Key metrics to monitor**:

1. **Response Time**
   - `/api/run/:agent` should complete < 100ms
   - SSE latency < 50ms

2. **Error Rate**
   - Webhook failures
   - Database connection errors
   - External API errors

3. **Resource Usage**
   - CPU usage
   - Memory consumption
   - Disk I/O

4. **Workflow Metrics**
   - Execution time per workflow
   - Success rate
   - Average payload size

**Monitor with Prometheus** (Optional):
```yaml
# prometheus.yml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'gateway'
    static_configs:
      - targets: ['gateway:3001']
    metrics_path: '/metrics'

  - job_name: 'sim'
    static_configs:
      - targets: ['sim:3000']
```

---

### Alerting

**Set up alerts for**:
- Service down (health check fails)
- High error rate (> 5%)
- High latency (> 500ms)
- Database connection failures
- Disk space low

**Example Slack alert**:
```bash
#!/bin/bash
ERROR_RATE=$(docker exec gateway curl -s http://localhost:3001/metrics | grep api_errors | grep -oP '=\K[0-9.]+')

if [ $(echo "$ERROR_RATE > 0.05" | bc) -eq 1 ]; then
  curl -X POST https://hooks.slack.com/services/YOUR_WEBHOOK \
    -d '{"text":"⚠️  Gateway error rate high: '${ERROR_RATE}'"}'
fi
```

---

## Performance Tuning

### 1. Gateway Optimization

**Increase worker threads**:
```javascript
// gateway/src/index.ts
const workers = os.cpus().length;
app.register(require('@fastify/multicore'), { workers });
```

**Enable compression**:
```javascript
app.register(require('@fastify/compress'));
```

**Enable caching**:
```javascript
app.register(require('@fastify/caching'), {
  cache: {
    expiresIn: 300 // 5 minutes
  }
});
```

---

### 2. Database Optimization

**Add indexes**:
```sql
CREATE INDEX idx_workflow_status ON workflows(status);
CREATE INDEX idx_events_npc_timestamp ON events(npc, created_at);
```

**Optimize queries**:
- Use `LIMIT` when fetching logs
- Archive old logs regularly
- Use connection pooling

---

### 3. SSE Optimization

**Reduce message size**:
```javascript
// Before: Large JSON object
{
  "npc": "scheduler",
  "type": "step",
  "timestamp": "2025-11-08T12:00:00Z",
  "fullWorkflowState": {...},
  "allPreviousLogs": [...]
}

// After: Minimal payload
{
  "npc": "scheduler",
  "message": "Creating event..."
}
```

**Batch events**:
```javascript
// Send events every 100ms instead of immediately
// Reduces overhead, slight latency trade-off
```

---

### 4. Workflow Optimization

**See**: [Workflows.md - Performance Optimization](./WORKFLOWS.md#performance-optimization)

---

## Production Checklist

### Security

- [ ] Enable HTTPS/TLS on reverse proxy
- [ ] Require authentication for `/studio/`
- [ ] Require authentication for `/api/*`
- [ ] Rate limiting enabled
- [ ] CORS configured properly
- [ ] Secrets stored in environment variables (not committed)
- [ ] API keys rotated regularly
- [ ] Database encrypted at rest
- [ ] Backup strategy implemented

### Performance

- [ ] Load testing completed
- [ ] Caching enabled
- [ ] Database indexes created
- [ ] Worker threads optimized
- [ ] SSE buffering disabled for `/api/stream`
- [ ] Compression enabled
- [ ] CDN configured for static assets

### Monitoring

- [ ] Health checks configured
- [ ] Logging enabled
- [ ] Error tracking (Sentry, etc.)
- [ ] Metrics collection (Prometheus)
- [ ] Alerting configured
- [ ] Log retention policy set
- [ ] Uptime monitoring enabled

### Operations

- [ ] Backup strategy documented
- [ ] Disaster recovery plan
- [ ] Update strategy (blue-green deployment)
- [ ] Runbook for common issues
- [ ] On-call escalation procedures
- [ ] Database migration process
- [ ] Secret rotation process

### Documentation

- [ ] API documentation
- [ ] Workflow examples
- [ ] Troubleshooting guide
- [ ] Deployment procedures
- [ ] Emergency contacts list
- [ ] Configuration reference

---

## Scaling

### For < 10 Concurrent Users

**Current architecture is fine**:
- Single Gateway instance
- Single Sim.ai instance
- In-memory SSE hub

---

### For 10-100 Concurrent Users

**Improvements needed**:

```
// 1. Add load balancer
Load Balancer
├─ Gateway instance 1
├─ Gateway instance 2
└─ Gateway instance 3

// 2. Use Redis for SSE pub/sub
Gateways → Redis → SSE connections

// 3. Persist logs to database
Workflows → Database → Log retrieval

// 4. Connection pooling
Gateways → PgBouncer → PostgreSQL
```

**Example docker-compose**:
```yaml
load-balancer:
  image: nginx:latest
  ports:
    - "3001:3001"
  depends_on:
    - gateway1
    - gateway2
    - gateway3

gateway1:
  build: ./apps/gateway
  environment:
    REDIS_URL: redis://redis:6379

gateway2:
  build: ./apps/gateway
  environment:
    REDIS_URL: redis://redis:6379

gateway3:
  build: ./apps/gateway
  environment:
    REDIS_URL: redis://redis:6379
```

---

### For 100+ Concurrent Users

**Enterprise setup**:

```
                    CDN
                     ↓
            ┌────────────────┐
            │  Cloudflare    │
            └────────┬───────┘
                     ↓
            ┌────────────────┐
            │ Load Balancer  │
            │  (AWS ALB)     │
            └────────┬───────┘
                     ↓
    ┌────────────────┼────────────────┐
    ↓                ↓                ↓
  Gateway      Gateway           Gateway
   Pod1         Pod2              Pod3
   (K8s)        (K8s)             (K8s)

    └────────────────┼────────────────┘
                     ↓
    ┌────────────────────────────────┐
    │  Redis Cluster (HA)            │
    └────────────┬───────────────────┘
                 ↓
    ┌────────────────────────────────┐
    │  PostgreSQL (with replicas)    │
    └────────────────────────────────┘
```

**Use Kubernetes**:
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: gateway
spec:
  replicas: 5
  template:
    spec:
      containers:
      - name: gateway
        image: esprit-gateway:1.0.0
        resources:
          requests:
            cpu: 500m
            memory: 512Mi
          limits:
            cpu: 1000m
            memory: 1Gi
        env:
        - name: REDIS_URL
          value: redis-cluster:6379
```

---

## Next Steps

- **[Troubleshooting Guide](./TROUBLESHOOTING.md)** - Fix issues
- **[System Architecture](../ARCHITECTURE.md)** - Understand components
- **[Gateway API](./GATEWAY.md)** - API reference

---

**Last Updated**: 2025-11-08
**Production Version**: 1.0.0
