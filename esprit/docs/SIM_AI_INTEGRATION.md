# How Sim.ai Works & NPC Integration Guide
**Deep Dive into Sim.ai Architecture & Wiring NPCs**

**Last Updated**: 2025-11-07

---

## 🎯 Overview

This document explains:
1. How Sim.ai's workflow builder works internally
2. How workflow execution happens
3. How to wire each Sim.ai workflow as an NPC
4. How to make NPCs move based on workflow execution
5. When/how to modify Sim.ai code (carefully!)

---

## 🏗️ Sim.ai Architecture (How It Actually Works)

### Core Components

```
┌─────────────────────────────────────────────────────────────┐
│                    Sim.ai Frontend (Next.js)                 │
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────┐     │
│  │   Canvas UI  │  │  Block Store │  │  Socket Client│     │
│  │  (Workflow   │  │   (Zustand)  │  │ (Real-time    │     │
│  │   Builder)   │  │              │  │  Collab)      │     │
│  └──────┬───────┘  └──────┬───────┘  └───────┬───────┘     │
│         │                  │                   │             │
│         └──────────────────┼───────────────────┘             │
│                            │ HTTP/WebSocket                  │
└────────────────────────────┼─────────────────────────────────┘
                             │
                  ┌──────────▼──────────┐
                  │   API Routes        │
                  │  (Next.js API)      │
                  │                     │
                  │  • /api/workflows   │
                  │  • /api/webhooks    │
                  │  • /api/logs        │
                  └──────────┬──────────┘
                             │
          ┌──────────────────┼──────────────────┐
          │                  │                  │
     ┌────▼─────┐      ┌────▼─────┐     ┌─────▼──────┐
     │ Executor │      │ Postgres │     │   Socket   │
     │ (Bun)    │      │ + pgvector│    │   Server   │
     │          │      │           │     │ (Realtime) │
     │ Runs     │      │ • workflows│    │            │
     │ Workflows│      │ • blocks   │     │ • Presence │
     │          │      │ • logs     │     │ • Updates  │
     └──────────┘      │ • embeddings│    └────────────┘
                       └───────────┘
```

### Key Concepts

**1. Workflows**
- Visual flowcharts made of "blocks" connected by "edges"
- Stored in `workflow` table (metadata) + `workflow_blocks` + `workflow_edges`
- Each workflow has a unique ID

**2. Blocks**
- Individual steps in a workflow (AI generate, API call, condition, loop, etc.)
- Stored in `workflow_blocks` table
- Each block has inputs and outputs

**3. Triggers**
- How workflows start execution
- Types: `webhook`, `schedule`, `manual`, `api`, `chat`
- Stored in `webhook` table for webhook triggers

**4. Execution**
- When a workflow runs, it creates an execution log
- Stored in `workflow_execution_logs` table
- Contains full execution trace, timing, costs, outputs

**5. Real-time Updates**
- WebSocket server broadcasts execution progress
- Used for live UI updates in the builder
- We can tap into this for NPC animations!

---

## 📋 Workflow Lifecycle

### 1. Creating a Workflow

**User Action**: User opens Sim.ai builder at `/studio/`

**What Happens:**

```typescript
// 1. User drags blocks onto canvas
// Frontend: apps/sim/stores/workflows/workflow/store.ts
const addBlock = (blockType: string) => {
  const newBlock = {
    id: generateId(),
    type: blockType,
    position: { x, y },
    inputs: {},
    outputs: {}
  }

  // Save to database via API
  await fetch('/api/workflows/[id]/blocks', {
    method: 'POST',
    body: JSON.stringify(newBlock)
  })
}

// 2. Workflow saved to database
// Database: workflow table + workflow_blocks table
INSERT INTO workflow (id, name, user_id, workspace_id) VALUES (...)
INSERT INTO workflow_blocks (id, workflow_id, type, metadata) VALUES (...)
```

### 2. Deploying a Workflow

**User Action**: User clicks "Deploy" in Sim.ai

**What Happens:**

```typescript
// apps/sim/app/api/workflows/[id]/deploy/route.ts
export async function POST(request, { params }) {
  const { id: workflowId } = params

  // 1. Save current state as deployed version
  await db.update(workflow)
    .set({
      isDeployed: true,
      deployedAt: new Date(),
      deployedState: workflowSnapshot
    })
    .where(eq(workflow.id, workflowId))

  // 2. Create webhook trigger if needed
  const webhookPath = generateWebhookPath()

  await db.insert(webhook).values({
    id: generateId(),
    path: webhookPath,
    workflowId: workflowId,
    // ...
  })

  return {
    webhookUrl: `${BASE_URL}/api/webhooks/trigger/${webhookPath}`
  }
}
```

**Result**: Workflow gets a webhook URL like:
```
https://sim.ai/api/webhooks/trigger/abc123def456
```

### 3. Triggering a Workflow

**External System**: POST to webhook URL

**What Happens:**

```typescript
// apps/sim/app/api/webhooks/trigger/[path]/route.ts
export async function POST(request, { params }) {
  const { path } = params
  const body = await request.json()

  // 1. Find webhook and workflow
  const webhook = await db.query.webhook.findFirst({
    where: eq(webhook.path, path)
  })

  const workflow = await db.query.workflow.findFirst({
    where: eq(workflow.id, webhook.workflowId)
  })

  // 2. Queue execution (async via job queue)
  await queueWebhookExecution(webhook, workflow, body, request)

  return NextResponse.json({ status: 'queued' })
}
```

### 4. Executing a Workflow

**Background**: Job worker picks up execution

**What Happens:**

```typescript
// executor/handlers/workflow/workflow-handler.ts
export class WorkflowBlockHandler {
  async execute(block, inputs, context) {
    // 1. Load workflow definition
    const workflowData = await loadWorkflow(workflowId)

    // 2. Create execution context
    const executionId = generateId()
    const executor = new Executor()

    // 3. Execute blocks in order
    for (const block of workflowData.blocks) {
      const blockHandler = getHandlerForBlock(block.type)
      const result = await blockHandler.execute(block, inputs, context)

      // 4. Emit progress events via WebSocket
      socketServer.to(workflowId).emit('execution-progress', {
        executionId,
        blockId: block.id,
        status: 'completed',
        output: result
      })
    }

    // 5. Save execution log
    await db.insert(workflowExecutionLogs).values({
      id: executionId,
      workflowId,
      trigger: 'webhook',
      level: 'success',
      startedAt,
      endedAt,
      executionData: fullTrace
    })
  }
}
```

### 5. Getting Execution Results

**Options for tracking execution:**

**A) WebSocket (Real-time)**
```typescript
// Connect to realtime server
const socket = io('http://localhost:8080/socket.io/')

socket.emit('join-workflow', { workflowId })

socket.on('execution-progress', (data) => {
  console.log('Block completed:', data.blockId, data.output)
})
```

**B) Polling API (HTTP)**
```typescript
// Poll execution logs
const response = await fetch(`/api/logs/execution/${executionId}`)
const execution = await response.json()

console.log('Execution status:', execution.level) // 'success' or 'error'
console.log('Duration:', execution.totalDurationMs)
console.log('Full trace:', execution.executionData)
```

**C) Webhook Notifications (Push)**
```typescript
// In Sim.ai: Configure webhook subscription
// Database: workflow_log_webhook table
await db.insert(workflowLogWebhook).values({
  workflowId,
  url: 'http://skyoffice-gateway:3001/api/sim-events',
  triggers: ['completed', 'failed']
})

// Sim.ai will POST to this URL when execution completes
```

---

## 🔌 Wiring Workflows to NPCs

### Strategy: One Workflow = One NPC

Each NPC in SkyOffice represents a Sim.ai workflow.

**Database Design:**

```sql
CREATE TABLE npcs (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL,              -- "Sarah the Scheduler"

  -- Sim.ai Integration
  sim_workflow_id TEXT NOT NULL,           -- Sim.ai workflow ID
  sim_webhook_url TEXT NOT NULL,           -- Webhook to trigger workflow
  sim_webhook_path TEXT NOT NULL,          -- Path part of webhook

  -- Visual
  avatar_model VARCHAR(255),
  workstation_id VARCHAR(255),
  initial_position JSONB,

  -- Metadata
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Workflow → NPC Mapping:**

```typescript
// In Gateway: apps/gateway/src/services/npc-manager.ts
export class NPCManager {
  // Create NPC from deployed workflow
  async createNPCFromWorkflow(workflowId: string) {
    // 1. Fetch workflow details from Sim.ai
    const workflow = await this.simClient.getWorkflow(workflowId)

    if (!workflow.isDeployed) {
      throw new Error('Workflow must be deployed first')
    }

    // 2. Get webhook URL from workflow
    const webhook = await this.simClient.getWorkflowWebhook(workflowId)

    // 3. Create NPC in our database
    const npc = await db.insert(npcs).values({
      id: generateId(),
      name: workflow.name,
      sim_workflow_id: workflowId,
      sim_webhook_url: webhook.url,
      sim_webhook_path: webhook.path,
      avatar_model: 'default',
      workstation_id: 'desk-1'
    }).returning()

    // 4. Subscribe to workflow execution events
    await this.simClient.subscribeToWorkflowEvents(workflowId, {
      url: `${GATEWAY_URL}/api/sim-events`,
      events: ['execution.started', 'execution.completed', 'block.executed']
    })

    return npc
  }
}
```

---

## 🎬 Making NPCs Move (The Fun Part!)

### Step 1: User Triggers NPC

```typescript
// Frontend: User clicks "Run" on NPC
const triggerNPC = async (npcId: string) => {
  // POST to Gateway
  await fetch(`/api/npcs/${npcId}/run`, {
    method: 'POST',
    body: JSON.stringify({ input: {} })
  })
}
```

### Step 2: Gateway Orchestrates Movement

```typescript
// Gateway: apps/gateway/src/routes/npcs.ts
app.post('/api/npcs/:id/run', async (req, reply) => {
  const npcId = req.params.id
  const npc = await db.query.npcs.findFirst({ where: eq(npcs.id, npcId) })

  // 1. Update NPC state: Start walking to desk
  await updateNPCState(npcId, {
    state: 'walking',
    destination: npc.workstation_id
  })

  // 2. Broadcast to frontend via WebSocket
  websocket.broadcast({
    type: 'npc:state-change',
    npcId,
    state: 'walking',
    destination: npc.workstation_id
  })

  // 3. Wait for animation duration
  await sleep(2000) // Walking animation is 2 seconds

  // 4. Update: Sitting down
  await updateNPCState(npcId, { state: 'sitting' })
  websocket.broadcast({ type: 'npc:state-change', npcId, state: 'sitting' })

  await sleep(500)

  // 5. Update: Start typing (workflow is starting)
  await updateNPCState(npcId, { state: 'typing' })
  websocket.broadcast({ type: 'npc:state-change', npcId, state: 'typing' })

  // 6. Trigger Sim.ai workflow
  const execution = await fetch(npc.sim_webhook_url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      npcId: npc.id,
      triggeredBy: req.user.id
    })
  })

  const { executionId } = await execution.json()

  // 7. Store execution reference
  await db.insert(npc_executions).values({
    id: generateId(),
    npc_id: npcId,
    sim_execution_id: executionId,
    status: 'running',
    started_at: new Date()
  })

  return reply.send({ executionId })
})
```

### Step 3: Receive Execution Events from Sim.ai

**Option A: WebSocket Subscription (Fastest)**

```typescript
// Gateway: Connect to Sim.ai's realtime server
import { io } from 'socket.io-client'

const simSocket = io('http://sim:3002')

simSocket.emit('join-workflow', { workflowId: npc.sim_workflow_id })

simSocket.on('execution-progress', async (data) => {
  // Map execution events to NPC animations
  const animation = mapBlockToAnimation(data.blockType)

  await updateNPCState(npc.id, {
    state: animation,
    currentAction: data.blockName,
    progress: data.progress
  })

  // Broadcast to frontend
  websocket.broadcast({
    type: 'npc:action',
    npcId: npc.id,
    action: data.blockName,
    animation,
    progress: data.progress
  })
})

simSocket.on('execution-complete', async (data) => {
  // Celebrate!
  await updateNPCState(npc.id, { state: 'celebrating' })
  websocket.broadcast({
    type: 'npc:celebration',
    npcId: npc.id
  })

  await sleep(2000)

  // Back to idle
  await updateNPCState(npc.id, { state: 'idle' })
  websocket.broadcast({
    type: 'npc:state-change',
    npcId: npc.id,
    state: 'idle'
  })
})
```

**Option B: HTTP Webhook (Reliable)**

```typescript
// Gateway: Receive events from Sim.ai
app.post('/api/sim-events', async (req, reply) => {
  const event = req.body

  // Example event:
  // {
  //   type: 'execution.block.completed',
  //   executionId: 'exec_123',
  //   workflowId: 'wf_456',
  //   blockId: 'block_789',
  //   blockType: 'ai_generate',
  //   blockName: 'Generate email summary',
  //   output: { ... }
  // }

  // Find NPC by workflow ID
  const npc = await db.query.npcs.findFirst({
    where: eq(npcs.sim_workflow_id, event.workflowId)
  })

  if (!npc) return reply.code(404).send()

  // Map block type to animation
  const animation = mapBlockToAnimation(event.blockType)

  await updateNPCState(npc.id, {
    state: animation,
    currentAction: event.blockName
  })

  websocket.broadcast({
    type: 'npc:action',
    npcId: npc.id,
    action: event.blockName,
    animation
  })

  return reply.send({ received: true })
})
```

### Step 4: Frontend Animates NPC

```typescript
// Frontend: apps/skyoffice/src/components/Office3D/AnimatedNPC.tsx
const AnimatedNPC = ({ npc }) => {
  const [currentState, setCurrentState] = useState(npc.state)

  useEffect(() => {
    // Subscribe to WebSocket updates
    socket.on('npc:state-change', (data) => {
      if (data.npcId === npc.id) {
        setCurrentState(data.state)
      }
    })

    socket.on('npc:action', (data) => {
      if (data.npcId === npc.id) {
        setCurrentState(data.animation)
        showActionBubble(data.action)
      }
    })
  }, [npc.id])

  return (
    <group>
      <NPCModel state={currentState} />
      <ActionBubble text={npc.currentAction} />
      <StatusBar progress={npc.progress} />
    </group>
  )
}
```

---

## 🗺️ Block Type → Animation Mapping

```typescript
// Gateway: apps/gateway/src/services/animation-mapper.ts
export function mapBlockToAnimation(blockType: string): NPCState {
  const animationMap: Record<string, NPCState> = {
    // AI blocks
    'ai_generate': NPCState.THINKING,
    'ai_analyze': NPCState.THINKING,
    'ai_classify': NPCState.THINKING,
    'ai_extract': NPCState.THINKING,

    // Data blocks
    'read_file': NPCState.TYPING,
    'write_file': NPCState.TYPING,
    'http_request': NPCState.TYPING,
    'api_call': NPCState.TYPING,
    'database_query': NPCState.TYPING,

    // Communication blocks
    'send_email': NPCState.TYPING,
    'slack_message': NPCState.TYPING,
    'discord_message': NPCState.TYPING,

    // Logic blocks
    'condition': NPCState.THINKING,
    'loop': NPCState.THINKING,
    'parallel': NPCState.THINKING,

    // Wait blocks
    'wait': NPCState.IDLE,
    'schedule': NPCState.IDLE,

    // Workflow blocks
    'workflow': NPCState.MEETING, // Calling another workflow = meeting

    // Error
    'error': NPCState.ERROR
  }

  return animationMap[blockType] || NPCState.TYPING
}
```

---

## 🔧 When to Modify Sim.ai Code

### What You Can Modify Safely

✅ **Adding New API Endpoints** (inside `/api/` folder)
```typescript
// apps/sim/app/api/custom/npc-sync/route.ts
export async function POST(request) {
  // Your custom logic
  return NextResponse.json({ ok: true })
}
```

✅ **Adding Database Tables** (new migrations)
```sql
-- Won't conflict with Sim.ai's tables
CREATE TABLE npcs (...);
CREATE TABLE npc_state (...);
```

✅ **Adding Webhook Event Types**
```typescript
// Modify: apps/sim/lib/webhooks/processor.ts
// Add custom event emission for NPC tracking
```

✅ **Custom UI Components** (in your own folder)
```typescript
// apps/sim/components/custom/NPCManager.tsx
```

### What You Should NOT Modify

❌ **Core Executor Logic** - Will break workflow execution
❌ **Database Schema for Existing Tables** - Data corruption risk
❌ **Authentication System** - Security risk
❌ **Block Handlers** - Breaks existing workflows

### Modification Strategy

**1. Fork with Purpose**
```bash
# Instead of modifying external/sim directly:
cd esprit/external
git remote add upstream https://github.com/simstudioai/sim.git
git checkout -b esprit-customizations
```

**2. Keep Changes Minimal**
- Only add, don't modify existing code
- Use hooks/plugins where possible
- Document all changes in `CUSTOMIZATIONS.md`

**3. Merge Upstream Updates**
```bash
git fetch upstream
git merge upstream/main
# Resolve conflicts (mostly in your added files)
```

**4. Environment Variables for Customization**
```bash
# .env
ENABLE_NPC_SYNC=true
NPC_WEBHOOK_URL=http://skyoffice-gateway:3001/api/sim-events
```

---

## 🎯 Complete Integration Example

### Scenario: "Email Summarizer" NPC

**1. Create Workflow in Sim.ai**

```
[Webhook Trigger]
    ↓
[Gmail: Get Unread Emails]
    ↓
[Loop: For each email]
    ↓
[AI: Summarize Email]
    ↓
[End Loop]
    ↓
[AI: Create Combined Summary]
    ↓
[Slack: Send Summary]
    ↓
[HTTP: Notify Gateway] → POST http://skyoffice-gateway:3001/api/sim-events
```

**2. Deploy Workflow & Create NPC**

```typescript
// User clicks "Create NPC" in SkyOffice
// Frontend sends workflow ID to Gateway

await fetch('/api/npcs/create-from-workflow', {
  method: 'POST',
  body: JSON.stringify({
    workflowId: 'wf_email_summarizer',
    name: 'Sarah the Email Assistant',
    avatarModel: 'female_professional',
    workstationId: 'desk-2'
  })
})

// Gateway creates NPC and links to workflow
const npc = {
  id: 'npc_sarah',
  name: 'Sarah the Email Assistant',
  sim_workflow_id: 'wf_email_summarizer',
  sim_webhook_url: 'http://sim:3000/api/webhooks/trigger/abc123',
  avatar_model: 'female_professional',
  workstation_id: 'desk-2'
}
```

**3. User Triggers NPC**

```typescript
// User clicks "Run" button on Sarah
// Sarah walks to desk → sits → starts typing
// Gateway triggers workflow
// Sim.ai starts execution
```

**4. Workflow Executes & NPC Animates**

```
Block: Gmail Get Emails
  → NPC: TYPING animation + "Fetching emails..."

Block: AI Summarize (1st email)
  → NPC: THINKING animation + "Summarizing email 1/5..."

Block: AI Summarize (2nd email)
  → NPC: THINKING animation + "Summarizing email 2/5..."

... (repeat for each email)

Block: AI Create Combined Summary
  → NPC: THINKING animation + "Creating final summary..."

Block: Slack Send
  → NPC: TYPING animation + "Sending to Slack..."

Block: HTTP Notify Gateway
  → NPC: CELEBRATING animation + "Done! ✨"
  → After 2s → IDLE
```

**5. User Sees Results**

- NPCs returns to idle state
- User can click NPC to see execution log
- Slack channel has the email summary
- Execution saved in database for history

---

## 🚀 Next Steps

1. **Set up NPC database tables** (from IMPLEMENTATION_PLAN.md)
2. **Create Gateway NPC service** for workflow → NPC mapping
3. **Connect to Sim.ai realtime server** for live updates
4. **Implement animation mapper** for block types → animations
5. **Build NPC UI** for creating NPCs from workflows
6. **Test with simple workflow** (e.g., HTTP request that logs to console)

---

**Read Next:**
- [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md) - Week-by-week implementation guide
- [ARCHITECTURE.md](./ARCHITECTURE.md) - System architecture deep dive
- [DEVELOPMENT_RULES.md](./DEVELOPMENT_RULES.md) - Coding guidelines
