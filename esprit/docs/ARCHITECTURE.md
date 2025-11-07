# Esprit-Hub Architecture
**SkyOffice + Sim.ai Integration**

**Last Updated**: 2025-11-07

---

## 🎯 Overview

Esprit-Hub combines **SkyOffice** (a 2D web UI for monitoring AI agents) with **Sim.ai** (a visual workflow builder and execution engine) to create a simple, effective interface for managing and monitoring AI-powered automation.

**What it does:**
- Display AI agents as cards with real-time status
- Show live execution logs via Server-Sent Events (SSE)
- Trigger agent workflows with a click
- Integrate Sim.ai's workflow builder for creating new agents

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    User's Browser                            │
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────┐     │
│  │  SkyOffice   │  │  Sim.ai      │  │  Event        │     │
│  │  UI (React)  │  │  Builder     │  │  Stream (SSE) │     │
│  │              │  │  (iframe)    │  │               │     │
│  └──────┬───────┘  └──────┬───────┘  └───────┬───────┘     │
│         │                  │                   │             │
└─────────┼──────────────────┼───────────────────┼─────────────┘
          │                  │                   │
          │ HTTP             │ HTTP              │ SSE
          │                  │                   │
┌─────────▼──────────────────▼───────────────────▼─────────────┐
│              Nginx Reverse Proxy (port 8080)                  │
│                                                                │
│  Routes:                                                       │
│  /           → SkyOffice UI                                   │
│  /api/*      → Gateway Service                                │
│  /studio/*   → Sim.ai Studio                                  │
│  /socket.io/ → Sim.ai Realtime                                │
└────────────────────────┬─────────────────────────────────────┘
                         │
        ┌────────────────┼────────────────┐
        │                │                │
   ┌────▼─────┐    ┌────▼──────┐   ┌────▼─────┐
   │SkyOffice │    │  Gateway  │   │  Sim.ai  │
   │   UI     │    │  Service  │   │  Stack   │
   │(port 80) │    │(port 3001)│   │          │
   └──────────┘    │           │   │  - sim   │
                   │ • SSE Hub │   │  - redis │
                   │ • Events  │   │  - pg    │
                   │ • Routing │   │          │
                   └───────────┘   └──────────┘
```

---

## 📦 Components

### 1. SkyOffice UI (React)

**Location**: `esprit/apps/skyoffice/`

**Purpose**: Simple 2D web interface for monitoring AI agents

**Key Features:**
- Card-based layout showing each NPC/agent
- Status pills (idle, running, done, error)
- Real-time log streaming via SSE
- "Run" buttons to trigger agents
- Links to Sim.ai builder

**Tech Stack:**
- React 18
- TypeScript
- CSS (no frameworks)
- SSE (EventSource API)

**Key Files:**
```
skyoffice/src/
├── App.tsx              # Main app with NPC grid
├── components/
│   └── NPCPanel.tsx     # Individual agent card
└── lib/
    └── api.ts           # API client
```

**Component Structure:**
```typescript
<App>
  └── <NPCPanel> (for each agent)
      ├── Status pill
      ├── Run button
      └── Log display (SSE stream)
```

---

### 2. Gateway Service (Node.js/Fastify)

**Location**: `esprit/apps/gateway/`

**Purpose**: Backend API that connects SkyOffice ↔ Sim.ai

**Key Responsibilities:**
- Route agent execution requests to Sim.ai webhooks
- Receive workflow progress events from Sim.ai
- Broadcast events to frontend via SSE
- Manage agent mappings (agent ID → Sim.ai webhook URL)

**Tech Stack:**
- Fastify (web framework)
- TypeScript
- Server-Sent Events (SSE)
- In-memory event hub

**Key Files:**
```
gateway/src/
├── index.ts         # Main server
├── routes/
│   ├── run.ts       # POST /api/run/:agent
│   ├── events.ts    # POST /api/events (from Sim.ai)
│   └── stream.ts    # GET /api/stream?npc=X (SSE)
├── sse.ts           # SSE hub implementation
└── env.ts           # Environment config
```

**API Endpoints:**

```typescript
// Trigger an agent workflow
POST /api/run/:agent
Body: { payload: any }
→ Looks up webhook URL in agents.json
→ Sends webhook to Sim.ai
→ Emits 'started' event via SSE

// Receive workflow progress from Sim.ai
POST /api/events
Body: { npc: string, type: string, data: any }
→ Emits event to specific NPC channel via SSE

// Subscribe to agent updates (SSE)
GET /api/stream?npc=scheduler
→ Returns SSE stream with events:
   - started
   - step
   - awaiting
   - done
   - error
```

---

### 3. Sim.ai Stack

**Location**: `esprit/external/sim/`

**Purpose**: Visual workflow builder and execution engine

**What it provides:**
- Web-based workflow builder UI (`/studio/`)
- Workflow execution engine
- Webhook triggers
- Knowledge bases with vector search
- Realtime collaboration via WebSockets

**Services:**
- `sim` - Main app (port 3000)
- `sim-realtime` - WebSocket server (port 3002)
- `postgres` - Database with pgvector
- `redis` - Cache/session store
- `sim-migrations` - Database setup

**Integration Points:**

1. **Studio UI**: Embedded at `/studio/` via iframe
2. **Webhook Triggers**: Sim.ai calls Gateway's `/api/events` endpoint
3. **API**: Not currently used (could be added for programmatic workflow creation)

---

### 4. Nginx Reverse Proxy

**Purpose**: Single entry point for all services

**Configuration** (`esprit/infra/nginx.conf`):

```nginx
/           → skyoffice:80     # SkyOffice UI
/api/*      → gateway:3001     # Gateway API
/api/stream → gateway:3001     # SSE (no buffering)
/studio/*   → sim:3000         # Sim.ai builder
/sim/*      → sim:3000         # Sim.ai API
/socket.io/ → sim-realtime:3002 # Sim.ai WebSockets
```

**Why?**
- Same-origin policy (no CORS issues)
- Single URL: `http://localhost:8080`
- SSL termination point (in production)

---

## 🔄 Data Flow

### User Triggers an Agent

```
1. User clicks "Run" on Scheduler card
   └→ SkyOffice: POST /api/run/scheduler

2. Gateway receives request
   ├→ Looks up webhook URL in agents.json
   ├→ Emits 'started' event via SSE to 'scheduler' channel
   └→ POST to Sim.ai webhook URL

3. Sim.ai workflow starts executing
   └→ Each step posts progress to Gateway: POST /api/events

4. Gateway receives events
   └→ Emits to specific NPC's SSE channel

5. Frontend (NPCPanel) receives SSE events
   └→ Updates status pill and log display in real-time
```

### Event Flow Diagram

```
User Action
     │
     ▼
┌─────────┐  POST /api/run/scheduler  ┌─────────┐
│SkyOffice│ ────────────────────────→  │ Gateway │
└────┬────┘                            └────┬────┘
     │                                      │
     │                    ┌─────────────────┼─────────────────┐
     │                    │                 │                 │
     │              1. Emit 'started'  2. Lookup     3. POST webhook
     │                    │              webhook            │
     │                    ▼                URL              ▼
     │              ┌──────────┐                      ┌─────────┐
     │◀─────────────│ SSE Hub  │                      │ Sim.ai  │
     │  SSE stream  └──────────┘                      └────┬────┘
     │                    ▲                                │
     │                    │                                │
     │                    └───── 4. POST /api/events ──────┘
     │                              (progress updates)
     │
     ▼
  Updates UI
  (status, logs)
```

---

## 📊 Data Models

### Agent Mapping

**File**: `esprit/apps/gateway/data/agents.json`

```json
[
  {
    "agent": "scheduler",
    "npc": "scheduler",
    "webhookUrl": "http://sim:3000/api/v1/webhooks/catch/abc123"
  },
  {
    "agent": "mailops",
    "npc": "mailops",
    "webhookUrl": "http://sim:3000/api/v1/webhooks/catch/def456"
  }
]
```

**Fields:**
- `agent` - Agent ID used in API (`/api/run/:agent`)
- `npc` - NPC ID for SSE channel filtering
- `webhookUrl` - Sim.ai webhook to trigger

### SSE Event Format

**Frontend subscribes:**
```javascript
const es = new EventSource('/api/stream?npc=scheduler');
es.addEventListener('started', handleStarted);
es.addEventListener('step', handleStep);
es.addEventListener('done', handleDone);
```

**Events:**
```typescript
// started - workflow began
{
  type: 'started',
  data: {
    ts: '2025-11-07T12:00:00Z',
    npc: 'scheduler'
  }
}

// step - workflow progress
{
  type: 'step',
  data: {
    ts: '2025-11-07T12:00:05Z',
    npc: 'scheduler',
    message: 'Parsing calendar event...'
  }
}

// done - workflow completed
{
  type: 'done',
  data: {
    ts: '2025-11-07T12:00:15Z',
    npc: 'scheduler',
    result: { eventId: 'evt_123' }
  }
}

// error - workflow failed
{
  type: 'error',
  data: {
    ts: '2025-11-07T12:00:10Z',
    npc: 'scheduler',
    error: 'API rate limit exceeded'
  }
}
```

---

## 🔧 Configuration

### Environment Variables

**Gateway** (`.env`):
```bash
PORT=3001
AGENT_MAP_FILE=/app/data/agents.json

# Optional: Direct Sim.ai API integration
AP_BASE=http://sim:3000
AP_TOKEN=
AP_PROJECT=
```

**Sim.ai**:
```bash
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/simstudio
BETTER_AUTH_URL=http://localhost:8080
BETTER_AUTH_SECRET=change-me-in-production
ENCRYPTION_KEY=change-me-in-production-32-char
SOCKET_SERVER_URL=http://sim-realtime:3002
NEXT_PUBLIC_SOCKET_URL=http://localhost:8080
```

### Docker Compose Services

```yaml
services:
  reverse-proxy   # Nginx (port 8080)
  skyoffice       # React UI
  gateway         # Fastify API
  sim             # Sim.ai main app
  sim-realtime    # Sim.ai WebSocket server
  sim-migrations  # Database setup
  postgres        # PostgreSQL + pgvector
  redis           # Cache
  nango           # OAuth broker (optional)
  litellm         # LLM gateway (optional)
```

**Dependencies:**
```
reverse-proxy → depends on → skyoffice, gateway, sim, sim-realtime
gateway → depends on → sim
sim → depends on → postgres, sim-migrations, sim-realtime
sim-realtime → depends on → postgres
sim-migrations → depends on → postgres
```

---

## 🚀 Development Workflow

### Creating a New Agent

1. **Build workflow in Sim.ai:**
   - Open `http://localhost:8080/studio/`
   - Create new workflow
   - Add trigger: Webhook
   - Add steps: Your automation logic
   - Add final step: HTTP Request → `POST http://skyoffice-gateway:3001/api/events`
     ```json
     {
       "npc": "my-agent",
       "type": "done",
       "data": { "result": "..." }
     }
     ```
   - Deploy workflow
   - Copy webhook URL

2. **Register in Gateway:**
   - Edit `esprit/apps/gateway/data/agents.json`
   - Add entry:
     ```json
     {
       "agent": "my-agent",
       "npc": "my-agent",
       "webhookUrl": "http://sim:3000/api/v1/webhooks/catch/YOUR_WEBHOOK_ID"
     }
     ```
   - Restart gateway: `docker compose restart gateway`

3. **Add to UI:**
   - Edit `esprit/apps/skyoffice/src/App.tsx`
   - Add to npcs array:
     ```typescript
     { id: 'my-agent', name: 'My Agent' }
     ```

4. **Test:**
   - Refresh SkyOffice
   - Click "Run" on new agent card
   - Watch logs stream in real-time

---

## 🔒 Security

### Current State (MVP)
- ⚠️ No authentication on Gateway API
- ⚠️ No authorization checks
- ⚠️ Sim.ai Studio is publicly accessible

### Production Recommendations
1. **Authentication:**
   - Add session middleware to Gateway
   - Protect `/api/*` endpoints with JWT/session
   - Use Sim.ai's built-in auth

2. **Authorization:**
   - User can only trigger their own agents
   - Role-based access (admin, user)

3. **Nginx:**
   - Use `auth_request` to protect `/studio/`
   - SSL/TLS termination
   - Rate limiting

4. **Secrets:**
   - Use environment variables
   - Never commit `.env` files
   - Rotate ENCRYPTION_KEY regularly

---

## 📈 Performance

### Current Architecture
- **SSE**: One persistent connection per NPC per client
- **In-memory Hub**: Events stored in RAM (lost on restart)
- **No persistence**: Logs not saved to database

### Scaling Considerations

**For < 10 concurrent users:**
- Current architecture is fine
- Single Gateway instance handles load

**For 10-100 users:**
- Add Redis for SSE pub/sub
- Persist logs to PostgreSQL
- Run multiple Gateway instances behind load balancer

**For 100+ users:**
- Separate SSE server
- Use Redis Streams for event distribution
- Add database replicas
- CDN for static assets

### Performance Metrics

**Current (MVP):**
- SSE latency: ~50ms
- Event throughput: ~100 events/sec
- Max concurrent connections: ~100

**Optimization opportunities:**
- Batch events (send every 100ms instead of immediately)
- Compress SSE messages
- Add client-side caching
- Lazy-load log history

---

## 🐛 Troubleshooting

### SSE Connection Drops

**Symptoms**: Logs stop updating, status stuck on "running"

**Causes:**
- Nginx buffering enabled
- Browser tab backgrounded (some browsers pause SSE)
- Gateway crashed/restarted

**Solutions:**
- Check `nginx.conf` has `proxy_buffering off` for `/api/stream`
- Refresh page to reconnect
- Check Gateway logs: `docker compose logs gateway`

### Agent Not Triggering

**Symptoms**: Click "Run" but nothing happens

**Causes:**
- Webhook URL incorrect in `agents.json`
- Sim.ai workflow not deployed
- Network issue (Gateway can't reach Sim.ai)

**Solutions:**
- Check Gateway logs for errors
- Test webhook URL directly: `curl -X POST <webhook-url>`
- Verify Sim.ai workflow is deployed in `/studio/`

### Sim.ai Studio Not Loading

**Symptoms**: `/studio/` shows error or blank page

**Causes:**
- Trailing slash missing (use `/studio/` not `/studio`)
- `sim` service not healthy
- Database migrations not run

**Solutions:**
- Always use `/studio/` with trailing slash
- Check service status: `docker compose ps`
- Check sim logs: `docker compose logs sim`
- Re-run migrations: `docker compose restart sim-migrations`

---

## 🔍 Monitoring

### Health Checks

```bash
# Check all services
docker compose ps

# Expected output:
# sim           healthy
# sim-realtime  healthy
# postgres      healthy
# gateway       running
# skyoffice     running
```

### Logs

```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f gateway
docker compose logs -f sim

# Last 100 lines
docker compose logs --tail=100 gateway
```

### Debug Mode

**Gateway debug logging:**
```bash
# Add to .env
LOG_LEVEL=debug

# Restart
docker compose restart gateway
```

---

## 📚 Further Reading

- [Sim.ai Integration Guide](./agent.md)
- [Implementation Status](./implementation-status.md)
- [Sim.ai Database Schema](../external/sim/packages/db/schema.ts)
- [Fastify Documentation](https://www.fastify.io/)
- [Server-Sent Events (SSE)](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events)

---

**This architecture prioritizes simplicity and real-time feedback, making it easy to monitor AI agents at a glance.**
