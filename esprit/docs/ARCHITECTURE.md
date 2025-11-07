# Esprit-Hub Architecture Guide
**Understanding How Everything Works Together**

**Last Updated**: 2025-11-07

---

## 🎯 Overview

Esprit-Hub is a **hybrid system** that combines:
1. **SkyOffice** - Virtual office 3D environment (React + Three.js)
2. **Sim.ai** - AI agent workflow builder and execution engine
3. **Gateway Service** - Orchestration layer connecting the two

This document explains how these pieces work together, what each component does, and why we need PostgreSQL with pgvector.

---

## 📦 Component Overview

### 1. SkyOffice Frontend (React + Three.js)

**Location**: `esprit/apps/skyoffice/`

**Purpose**: Visual 3D interface where users see and interact with NPCs

**Key Responsibilities:**
- Render 3D office environment
- Display animated NPC characters
- Show real-time task status
- Handle user interactions (click NPCs, trigger tasks)
- Connect to Gateway via WebSocket for live updates

**Tech Stack:**
- React 18+ (UI framework)
- Three.js + React Three Fiber (3D rendering)
- Zustand (state management)
- WebSocket client (real-time updates)

**Key Files:**
```
skyoffice/src/
├── components/
│   ├── Office3D/        # 3D scene components
│   ├── NPCManager/      # NPC UI components
│   └── NPCPanel.tsx     # Existing NPC panel
├── hooks/
│   ├── useNPCStore.ts   # Global NPC state
│   └── useWebSocket.ts  # WebSocket connection
└── App.tsx              # Main app component
```

---

### 2. Gateway Service (Fastify + TypeScript)

**Location**: `esprit/apps/gateway/`

**Purpose**: Orchestration layer that connects SkyOffice ↔ Sim.ai

**Key Responsibilities:**
- Manage NPC state in PostgreSQL
- Trigger Sim.ai workflows via webhooks
- Receive execution events from Sim.ai
- Map Sim.ai steps to NPC animations
- Broadcast state updates via WebSocket
- Provide REST API for NPC CRUD operations

**Tech Stack:**
- Fastify (web framework)
- TypeScript (type safety)
- Socket.io or native WebSocket (real-time)
- PostgreSQL client (pg/drizzle)
- Redis (optional caching)

**Key Files:**
```
gateway/src/
├── routes/
│   ├── run.ts      # EXISTING: Trigger agents (POST /api/run/:agent)
│   ├── events.ts   # EXISTING: Receive Sim.ai events (POST /api/events)
│   ├── stream.ts   # EXISTING: SSE for frontend (GET /api/stream)
│   └── npcs.ts     # NEW: NPC CRUD (GET/POST/PUT/DELETE /api/npcs)
├── services/
│   ├── npc-state.ts    # NEW: Manage NPC state
│   ├── animation.ts    # NEW: Map tasks → animations
│   └── sim-client.ts   # NEW: Sim.ai API wrapper
└── websocket/
    └── index.ts        # NEW: WebSocket server
```

---

### 3. Sim.ai (AI Agent Platform)

**Location**: `esprit/external/sim/`

**Purpose**: Build and execute AI agent workflows

**Key Responsibilities:**
- Provide visual workflow builder UI
- Execute workflows (agents) with logging
- Store workflow definitions and executions
- Maintain knowledge bases with vector embeddings
- Trigger webhooks on workflow events
- Manage user authentication and permissions

**Tech Stack:**
- Next.js (frontend)
- Bun runtime (backend)
- PostgreSQL + pgvector (database)
- Drizzle ORM (database queries)
- WebSocket server (realtime features)

**Exposes:**
- `/studio/` - Workflow builder UI (iframe'd in SkyOffice)
- Webhook triggers - Execute workflows via HTTP
- Event webhooks - Notify Gateway of execution progress

---

### 4. PostgreSQL + pgvector

**Purpose**: Unified database for all data

**What Sim.ai Uses It For:**
1. **User Authentication** - Users, sessions, accounts
2. **Workflow Storage** - Workflow definitions, versions, deployments
3. **Execution Logs** - Workflow run history and logs
4. **Knowledge Bases** - Semantic search with vector embeddings
5. **Document Embeddings** - 1536-dimensional vectors (text-embedding-3-small)
6. **Vector Similarity Search** - HNSW indexes for fast semantic search

**What We Add:**
1. **NPCs Table** - AI agents and their configurations
2. **NPC State** - Real-time NPC state (position, animation, current task)
3. **Task Executions** - History of all tasks run by NPCs
4. **Office Layout** - 3D office furniture and layout

**Why pgvector?**
- Sim.ai uses embeddings for **knowledge bases** (semantic search over documents)
- When you create a knowledge base in Sim.ai, it converts documents into vectors
- These vectors are stored in PostgreSQL using the `pgvector` extension
- HNSW (Hierarchical Navigable Small World) indexes enable fast similarity search

**Example: Knowledge Base Flow**
```
User uploads document to knowledge base
       ↓
Sim.ai chunks the document into paragraphs
       ↓
Each chunk is converted to embedding via OpenAI API
       ↓
Embeddings stored in `docs_embeddings` table
       ↓
When workflow searches knowledge base:
       ↓
Query is converted to embedding
       ↓
pgvector finds most similar document chunks
       ↓
Results returned to workflow
```

---

### 5. Nginx Reverse Proxy

**Purpose**: Route all HTTP traffic through one domain

**Routes:**
- `/` → SkyOffice UI (port 80 in container)
- `/api/` → Gateway API (port 3001)
- `/studio/` → Sim.ai UI (port 3000)
- `/socket.io/` → Sim.ai realtime server (port 3002)

**Why?**
- **Same-origin policy** - Avoids CORS issues
- **Single entry point** - http://localhost:8080 for everything
- **Simplified deployment** - One domain, multiple services

---

## 🔄 Complete Data Flow Example

### Scenario: User triggers "Email Summarizer" agent

#### **Step 1: User Clicks "Run" on NPC**

```
User clicks "Run" button on "Sarah" NPC
       ↓
Frontend: onClick={() => triggerAgent('email-summarizer')}
       ↓
Frontend sends: POST /api/run/email-summarizer
```

#### **Step 2: Gateway Prepares NPC**

```
Gateway receives: POST /api/run/email-summarizer
       ↓
Gateway looks up NPC from agents.json:
  { "agent": "email-summarizer", "npc": "sarah", "webhookUrl": "..." }
       ↓
Gateway updates database:
  UPDATE npc_state SET
    state = 'walking',
    destination = 'desk-3'
  WHERE npc_id = 'sarah-id'
       ↓
Gateway broadcasts via WebSocket:
  emit('npc:update', { npcId: 'sarah-id', state: 'walking' })
```

#### **Step 3: Frontend Animates NPC**

```
Frontend WebSocket client receives:
  { npcId: 'sarah-id', state: 'walking' }
       ↓
Zustand store updates:
  setNPCState('sarah-id', { state: 'walking' })
       ↓
React Three Fiber re-renders:
  <AnimatedNPC state="walking" />
       ↓
Sarah's 3D model plays walking animation
       ↓
Camera smoothly follows Sarah to her desk
```

#### **Step 4: Gateway Triggers Sim.ai Workflow**

```
After 2 seconds (walking duration):
       ↓
Gateway updates NPC: state = 'sitting'
       ↓
After 0.5 seconds:
       ↓
Gateway updates NPC: state = 'typing'
       ↓
Gateway triggers Sim.ai:
  POST sim-webhook-url
  {
    "payload": {},
    "npc": "sarah",
    "agent": "email-summarizer"
  }
```

#### **Step 5: Sim.ai Executes Workflow**

```
Sim.ai receives webhook trigger
       ↓
Workflow starts executing:
  Step 1: Connect to Gmail API
  Step 2: Fetch unread emails
  Step 3: Generate summary with AI
  Step 4: Send to Gateway
       ↓
For each step, Sim.ai sends:
  POST /api/events
  {
    "npc": "sarah",
    "type": "step",
    "data": {
      "step": "Fetching emails...",
      "progress": 33
    }
  }
```

#### **Step 6: Gateway Maps Steps to Animations**

```
Gateway receives: POST /api/events
       ↓
Animation Mapper checks step type:
  "Fetching emails" → NPCState.TYPING
  "AI generating summary" → NPCState.THINKING
  "Sending notification" → NPCState.TYPING
       ↓
Gateway updates database and broadcasts:
  emit('npc:update', {
    npcId: 'sarah-id',
    state: 'thinking',
    currentTask: {
      title: 'Email Summarizer',
      progress: 66,
      status: 'running'
    }
  })
```

#### **Step 7: Frontend Shows Real-time Updates**

```
Frontend receives state updates
       ↓
NPC switches from 'typing' → 'thinking'
       ↓
Progress bar updates: 33% → 66% → 100%
       ↓
Status bar shows: "AI generating summary..."
       ↓
Logs stream in real-time:
  ✓ Connected to Gmail
  ✓ Found 12 unread emails
  ⏳ Generating summary...
```

#### **Step 8: Task Completion**

```
Sim.ai workflow completes
       ↓
Final event: POST /api/events
  {
    "npc": "sarah",
    "type": "done",
    "data": {
      "summary": "12 emails summarized...",
      "duration": "8.5s"
    }
  }
       ↓
Gateway updates NPC: state = 'celebrating'
       ↓
Gateway saves to database:
  INSERT INTO task_executions (...)
       ↓
Frontend shows celebration animation (2 seconds)
       ↓
NPC returns to 'idle' state
```

---

## 🗄️ Database Schema Details

### Sim.ai Tables (Already Exist)

**Core Tables:**
- `user` - Users who can create workflows
- `session` - Auth sessions
- `workflow` - Workflow definitions
- `workflow_blocks` - Individual steps in workflows
- `webhook` - Webhook triggers for workflows
- `workflow_log` - Execution logs
- `embedding` - Knowledge base embeddings (uses pgvector)
- `docs_embeddings` - Document chunk embeddings (uses pgvector)

**Vector Columns:**
```sql
-- In embedding table
embedding vector(1536)  -- 1536-dimensional vector

-- In docs_embeddings table
embedding vector(1536) NOT NULL

-- HNSW index for fast similarity search
CREATE INDEX embedding_vector_hnsw_idx
  ON embedding
  USING hnsw (embedding vector_cosine_ops);
```

### Our Tables (We Add)

**npcs** - AI agents configuration
```sql
CREATE TABLE npcs (
  id UUID PRIMARY KEY,
  name VARCHAR(255),              -- "Sarah", "John", etc.
  type VARCHAR(50),               -- "ai_agent" or "human"
  sim_workflow_id TEXT,           -- Links to Sim.ai workflow
  sim_webhook_url TEXT,           -- URL to trigger workflow
  avatar_model VARCHAR(255),      -- 3D model filename
  workstation_id VARCHAR(255),    -- Which desk they use
  created_at TIMESTAMP
);
```

**npc_state** - Real-time NPC state
```sql
CREATE TABLE npc_state (
  npc_id UUID PRIMARY KEY,        -- One row per NPC
  state VARCHAR(50),              -- "idle", "typing", etc.
  position JSONB,                 -- {"x": 5, "y": 0, "z": 3}
  rotation JSONB,                 -- {"x": 0, "y": 90, "z": 0}
  current_task_id UUID,           -- Currently running task
  task_progress INTEGER,          -- 0-100
  recent_logs JSONB,              -- Last 50 log entries
  updated_at TIMESTAMP
);
```

**task_executions** - Task history
```sql
CREATE TABLE task_executions (
  id UUID PRIMARY KEY,
  npc_id UUID,
  task_name VARCHAR(255),
  sim_execution_id TEXT,          -- Links to Sim.ai's execution
  status VARCHAR(50),             -- "running", "completed", "failed"
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  logs JSONB,                     -- Full execution logs
  result JSONB                    -- Task output
);
```

---

## 🔌 API Endpoints

### Gateway API (Our Code)

**NPC Management:**
```
GET    /api/npcs              # List all NPCs
GET    /api/npcs/:id          # Get NPC details
POST   /api/npcs              # Create new NPC
PUT    /api/npcs/:id          # Update NPC
DELETE /api/npcs/:id          # Delete NPC
GET    /api/npcs/:id/state    # Get real-time state
```

**Task Execution:**
```
POST   /api/run/:agent        # Trigger agent (EXISTING)
POST   /api/events            # Receive Sim.ai events (EXISTING)
GET    /api/stream?npc=:id    # SSE for real-time updates (EXISTING)
```

**Task Control:**
```
POST   /api/tasks/:id/pause   # Pause task
POST   /api/tasks/:id/resume  # Resume task
POST   /api/tasks/:id/cancel  # Cancel task
```

### Sim.ai API (Their Code)

We interact with Sim.ai via:
- **Webhook triggers** - POST to workflow webhook URL
- **Event webhooks** - They POST to our `/api/events` endpoint
- **Builder UI** - iframe `/studio/` in our app

---

## 🌐 WebSocket Events

### Server → Client (Gateway → Frontend)

```typescript
// NPC state changed
socket.emit('npc:update', {
  npcId: string
  state: NPCState
  position?: {x, y, z}
  currentTask?: {
    id: string
    title: string
    progress: number
    status: string
  }
})

// NPC performed an action
socket.emit('npc:action', {
  npcId: string
  action: string           // "Fetching emails..."
  type: string             // "api_call", "ai_generate", etc.
  timestamp: number
})

// Task progress update
socket.emit('task:progress', {
  npcId: string
  taskId: string
  progress: number         // 0-100
  currentStep: string
})

// New log entry
socket.emit('task:log', {
  npcId: string
  taskId: string
  level: string            // "info", "error", "success"
  message: string
  timestamp: number
})

// Task completed
socket.emit('task:complete', {
  npcId: string
  taskId: string
  status: string           // "completed" or "failed"
  result: any
  duration: number
})
```

### Client → Server (Frontend → Gateway)

```typescript
// User clicked on NPC
socket.emit('npc:select', {
  npcId: string
})

// User paused task
socket.emit('task:pause', {
  npcId: string
  taskId: string
})

// User resumed task
socket.emit('task:resume', {
  npcId: string
  taskId: string
})

// User canceled task
socket.emit('task:cancel', {
  npcId: string
  taskId: string
})
```

---

## 🎭 Animation System

### Animation States

```typescript
enum NPCState {
  IDLE = "idle",              // Standing, idle animation
  WALKING = "walking",        // Walking to destination
  SITTING = "sitting",        // Sitting at desk
  TYPING = "typing",          // Typing on keyboard
  THINKING = "thinking",      // Hand on chin, pondering
  MEETING = "meeting",        // In conference room
  COFFEE = "coffee",          // Getting coffee
  ERROR = "error",            // Frustrated/confused
  CELEBRATING = "celebrating" // Jumping, celebrating
}
```

### Mapping Sim.ai Steps to Animations

```typescript
// In gateway/src/services/animation.ts
const stepToAnimationMap = {
  // Data operations
  'read_file': NPCState.TYPING,
  'write_file': NPCState.TYPING,
  'api_call': NPCState.TYPING,

  // AI operations
  'ai_generate': NPCState.THINKING,
  'ai_analyze': NPCState.THINKING,
  'ai_classify': NPCState.THINKING,

  // Communication
  'send_email': NPCState.TYPING,
  'send_slack': NPCState.TYPING,

  // Errors
  'error': NPCState.ERROR,

  // Waiting
  'wait': NPCState.IDLE,
  'schedule': NPCState.IDLE
}
```

### Animation Sequences

Some tasks require multiple animations in sequence:

```typescript
// Task start sequence
async function startTask(npcId: string) {
  await animate(npcId, NPCState.WALKING, 2000)  // Walk to desk
  await animate(npcId, NPCState.SITTING, 500)   // Sit down
  await animate(npcId, NPCState.TYPING, -1)     // Start typing (loop)
}

// Task complete sequence
async function completeTask(npcId: string) {
  await animate(npcId, NPCState.CELEBRATING, 2000)  // Celebrate!
  await animate(npcId, NPCState.IDLE, -1)           // Back to idle
}
```

---

## 🚀 Deployment Architecture

### Development (Local)

```
http://localhost:8080
       ↓
    Nginx (port 8080)
       ↓
    ├── / → SkyOffice (port 80 in container)
    ├── /api → Gateway (port 3001)
    └── /studio → Sim.ai (port 3000)

Database: PostgreSQL (port 5432)
Cache: Redis (port 6379) [optional]
```

### Production (Future)

```
https://esprit.yourdomain.com
       ↓
    Nginx / Cloudflare
       ↓
    Load Balancer
       ↓
    ├── SkyOffice (3+ instances)
    ├── Gateway (3+ instances)
    └── Sim.ai (managed instance)

Database: Managed PostgreSQL (RDS/Supabase)
Cache: Redis (ElastiCache/Upstash)
```

---

## 🔒 Security Architecture

### Authentication Flow

```
User logs in via Sim.ai
       ↓
Sim.ai creates session with JWT
       ↓
Frontend stores JWT in httpOnly cookie
       ↓
All API requests include JWT cookie
       ↓
Gateway validates JWT with Sim.ai's auth
       ↓
Request proceeds if valid
```

### Data Isolation

- Each user can only see their own NPCs
- Workflows are scoped to user/workspace
- WebSocket connections are authenticated
- Database queries use user_id filters

---

## 📊 Performance Considerations

### Frontend Optimization

1. **Level of Detail (LOD)** - Use simpler NPC models when far from camera
2. **Frustum Culling** - Don't render NPCs outside camera view
3. **Lazy Loading** - Load office sections on demand
4. **Animation Batching** - Update multiple NPCs in single frame

### Backend Optimization

1. **Database Indexes** - Indexed on npc_id, status, timestamps
2. **Connection Pooling** - Reuse database connections
3. **Redis Caching** - Cache frequently accessed NPC states
4. **WebSocket Batching** - Batch multiple updates into single message

### Database Optimization

1. **HNSW Indexes** - Fast vector similarity search (already in Sim.ai)
2. **Partial Indexes** - Index only active tasks
3. **Materialized Views** - Pre-compute NPC summaries
4. **Query Optimization** - Use EXPLAIN ANALYZE to optimize

---

## 🐛 Debugging Guide

### Check if services are running

```bash
cd esprit/infra
docker compose ps
```

Expected output:
```
NAME                    STATUS          PORTS
sim                     healthy         3000/tcp
sim-realtime            healthy         3002/tcp
skyoffice-gateway       running         3001/tcp
skyoffice-ui            running         80/tcp
postgres                healthy         5432/tcp
```

### View logs

```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f sim
docker compose logs -f gateway
docker compose logs -f skyoffice-ui
```

### Check database

```bash
# Connect to PostgreSQL
docker compose exec postgres psql -U postgres -d simstudio

# List tables
\dt

# Check NPCs
SELECT * FROM npcs;

# Check NPC state
SELECT * FROM npc_state;
```

### Test WebSocket connection

```javascript
// In browser console
const ws = new WebSocket('ws://localhost:8080/api/stream');
ws.onmessage = (msg) => console.log('Received:', msg.data);
ws.onopen = () => console.log('Connected!');
```

---

## 📚 Key Concepts

### Why pgvector?

**Sim.ai uses pgvector for knowledge bases:**
- Documents are chunked and converted to embeddings
- Embeddings are 1536-dimensional vectors (OpenAI's text-embedding-3-small)
- When an agent searches the knowledge base, it converts the query to an embedding
- pgvector finds the most similar document chunks using cosine similarity
- HNSW indexes make this search very fast (< 100ms for millions of vectors)

**We don't need to use pgvector directly**, but it's required for Sim.ai to work.

### Why WebSockets?

**Real-time updates are critical:**
- NPCs must animate in sync with Sim.ai execution
- Users see live progress (don't want to refresh)
- Multiple users might watch same office
- SSE (Server-Sent Events) is one-way; WebSocket is bidirectional

### Why Nginx Reverse Proxy?

**Same-origin policy:**
- Frontend at `http://localhost:8080/`
- API at `http://localhost:8080/api/`
- Sim.ai at `http://localhost:8080/studio/`
- All same origin → No CORS issues
- Easier cookie/session management

---

## 🎓 Further Reading

- [Sim.ai Database Schema](../external/sim/packages/db/schema.ts)
- [Three.js Documentation](https://threejs.org/docs/)
- [React Three Fiber](https://docs.pmnd.rs/react-three-fiber)
- [pgvector Documentation](https://github.com/pgvector/pgvector)
- [WebSocket API](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)

---

**Next Steps:**
1. Read [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md) for development roadmap
2. Read [DEVELOPMENT_RULES.md](./DEVELOPMENT_RULES.md) for coding guidelines
3. Start with Phase 1: Database Setup
