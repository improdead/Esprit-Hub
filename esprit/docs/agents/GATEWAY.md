# 🚀 Gateway API Reference

**Complete guide to the Esprit-Hub Gateway API for triggering agents and streaming events**

The Gateway Service is the backbone of agent communication in Esprit-Hub. It bridges the SkyOffice UI with Sim.ai workflows, handles webhook routing, and streams real-time execution updates via Server-Sent Events (SSE).

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [API Endpoints](#api-endpoints)
3. [Agent Triggering](#agent-triggering)
4. [Event Streaming](#event-streaming)
5. [Agent Mapping](#agent-mapping)
6. [Webhook Management](#webhook-management)
7. [Error Handling](#error-handling)
8. [Examples](#examples)
9. [Configuration](#configuration)

---

## Overview

### What is the Gateway?

The Gateway is a Fastify/TypeScript service that:
- **Routes agent triggers** from the UI to Sim.ai workflows via webhooks
- **Broadcasts events** from Sim.ai back to the UI in real-time via SSE
- **Manages agent mappings** that connect agent IDs to Sim.ai webhook URLs
- **Handles SSE connections** for live status updates per agent

### Architecture

```
┌──────────────┐
│  SkyOffice   │ (Web UI)
│     UI       │
└──────┬───────┘
       │ HTTP + SSE
       │
┌──────▼──────────────────┐
│   Gateway Service       │
│  (Fastify + Node.js)    │
├─────────────────────────┤
│ • POST /api/run/:agent  │  Trigger agents
│ • POST /api/events      │  Receive progress
│ • GET /api/stream?npc=X │  Subscribe to updates
└──────┬────────────────┬─┘
       │ Webhooks       │ SSE
       │                │
┌──────▼──────────┐  ┌──▼────────────┐
│   Sim.ai        │  │  Connected    │
│   Workflows     │  │   Clients     │
└─────────────────┘  └───────────────┘
```

### Key Features

- ✅ **Fast webhook routing** - Minimal latency between UI and workflow execution
- ✅ **Real-time SSE** - Live status updates without polling
- ✅ **Agent mapping** - Easy configuration of agent IDs to workflows
- ✅ **Error resilience** - Handles failures gracefully
- ✅ **Multi-channel support** - Each agent has its own SSE channel

---

## API Endpoints

### 1. Trigger an Agent

**Request**: Trigger a workflow by agent ID

```http
POST /api/run/:agent
Content-Type: application/json

{
  "payload": {
    "any": "data",
    "you": "want"
  }
}
```

**Parameters**:
- `:agent` (string) - Agent ID from `agents.json` (e.g., `scheduler`, `mailops`)
- `payload` (object) - Any data to pass to the workflow

**Response**:
```http
200 OK
Content-Type: application/json

{
  "success": true,
  "agent": "scheduler",
  "npc": "scheduler",
  "message": "Agent triggered"
}
```

**Error Responses**:
```http
404 Not Found
{ "error": "Agent 'unknown' not found in mapping" }

500 Internal Server Error
{ "error": "Failed to trigger webhook" }
```

**What happens**:
1. Gateway looks up agent ID in `agents.json`
2. Gets the Sim.ai webhook URL
3. Sends the payload to the webhook
4. Emits `started` event via SSE to the agent's channel
5. Returns success response

**Example**:
```bash
curl -X POST http://localhost:8080/api/run/scheduler \
  -H "Content-Type: application/json" \
  -d '{
    "payload": {
      "title": "Team meeting",
      "time": "2025-11-08T14:00:00Z"
    }
  }'
```

---

### 2. Receive Agent Events

**Request**: Post event updates from a Sim.ai workflow

```http
POST /api/events
Content-Type: application/json

{
  "npc": "scheduler",
  "type": "done",
  "data": {
    "eventId": "evt_123",
    "result": "Event created successfully"
  }
}
```

**Parameters**:
- `npc` (string) - NPC/agent ID (must match agents.json)
- `type` (string) - Event type: `started`, `step`, `awaiting`, `done`, `error`
- `data` (object) - Event-specific data

**Response**:
```http
200 OK
Content-Type: application/json

{ "success": true }
```

**Event Types**:

| Type | When | Example Data |
|------|------|--------------|
| `started` | Workflow begins | `{ "ts": "2025-11-08T12:00:00Z" }` |
| `step` | Progress update | `{ "message": "Creating calendar event..." }` |
| `awaiting` | Waiting for input | `{ "question": "Confirm event?" }` |
| `done` | Completed successfully | `{ "result": {...} }` |
| `error` | Failed/errored | `{ "error": "API rate limit exceeded" }` |

**What happens**:
1. Gateway receives the event
2. Broadcasts it to all SSE clients subscribed to that agent's channel
3. UI updates in real-time

**Example from Sim.ai workflow**:
```javascript
// In Sim.ai: HTTP Request step
POST http://skyoffice-gateway:3001/api/events
{
  "npc": "scheduler",
  "type": "step",
  "data": {
    "message": "Parsing calendar event...",
    "ts": "2025-11-08T12:00:05Z"
  }
}
```

---

### 3. Subscribe to Agent Events (SSE)

**Request**: Open a Server-Sent Events stream for an agent

```http
GET /api/stream?npc=scheduler
Accept: text/event-stream
```

**Parameters**:
- `npc` (query) - Agent ID to subscribe to

**Response**:
```http
200 OK
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive

event: started
data: {"ts":"2025-11-08T12:00:00Z","npc":"scheduler"}

event: step
data: {"message":"Creating event...","ts":"2025-11-08T12:00:05Z"}

event: done
data: {"result":{"eventId":"evt_123"},"ts":"2025-11-08T12:00:15Z"}
```

**What happens**:
1. Client connects to SSE stream for specific agent
2. Connection remains open (keep-alive)
3. Events are sent as they occur
4. Client automatically reconnects if connection drops

**Example (JavaScript)**:
```javascript
const eventSource = new EventSource('/api/stream?npc=scheduler');

eventSource.addEventListener('started', (event) => {
  const data = JSON.parse(event.data);
  console.log('Agent started:', data);
});

eventSource.addEventListener('step', (event) => {
  const data = JSON.parse(event.data);
  console.log('Progress:', data.message);
});

eventSource.addEventListener('done', (event) => {
  const data = JSON.parse(event.data);
  console.log('Result:', data.result);
});

eventSource.addEventListener('error', (event) => {
  const data = JSON.parse(event.data);
  console.error('Failed:', data.error);
});
```

---

## Agent Triggering

### How Agent Triggering Works

```
User clicks "Run" button
       ↓
UI calls POST /api/run/scheduler
       ↓
Gateway looks up webhook URL
       ↓
Gateway emits 'started' event via SSE
       ↓
Gateway POST to Sim.ai webhook URL
       ↓
Sim.ai workflow starts executing
       ↓
Workflow posts events to /api/events
       ↓
Gateway broadcasts to SSE clients
       ↓
UI updates in real-time
```

### Request/Response Flow

**1. User Triggers Agent**
```javascript
// From SkyOffice UI
async function runAgent(agentId) {
  const response = await fetch(`/api/run/${agentId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      payload: { /* agent-specific data */ }
    })
  });
  return response.json();
}
```

**2. Gateway Routes to Webhook**
```javascript
// Gateway receives request
app.post('/api/run/:agent', async (request, reply) => {
  const { agent } = request.params;
  const { payload } = request.body;

  // 1. Look up agent in mapping
  const agentConfig = agents.find(a => a.agent === agent);
  if (!agentConfig) {
    return reply.code(404).send({ error: 'Agent not found' });
  }

  // 2. Emit SSE started event
  sseHub.emit('started', {
    npc: agentConfig.npc,
    ts: new Date().toISOString()
  });

  // 3. Forward to Sim.ai webhook
  try {
    await fetch(agentConfig.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  } catch (error) {
    sseHub.emit('error', {
      npc: agentConfig.npc,
      error: error.message
    });
  }

  return reply.send({ success: true });
});
```

**3. Workflow Posts Progress**
```javascript
// From within Sim.ai workflow (HTTP Request step)
const response = await fetch('http://skyoffice-gateway:3001/api/events', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    npc: 'scheduler',
    type: 'step',
    data: {
      message: 'Event created successfully',
      eventId: 'evt_123'
    }
  })
});
```

**4. Gateway Broadcasts to Clients**
```javascript
// Gateway /api/events endpoint
app.post('/api/events', (request, reply) => {
  const { npc, type, data } = request.body;

  // Broadcast to all SSE clients subscribed to this NPC
  sseHub.broadcast(npc, type, data);

  return reply.send({ success: true });
});
```

---

## Event Streaming

### SSE Event Format

Each event follows this structure:

```
event: <event-type>
data: <json-data>

```

**Event Example**:
```
event: step
data: {"npc":"scheduler","message":"Creating event...","ts":"2025-11-08T12:00:05Z"}
```

### Event Types and Data

#### `started`
Emitted when agent begins execution

```json
{
  "npc": "scheduler",
  "ts": "2025-11-08T12:00:00Z"
}
```

#### `step`
Emitted as workflow progresses (multiple times)

```json
{
  "npc": "scheduler",
  "message": "Parsing calendar input...",
  "ts": "2025-11-08T12:00:05Z",
  "progress": 25
}
```

#### `awaiting`
Emitted when workflow needs user input

```json
{
  "npc": "scheduler",
  "question": "Confirm creating this event?",
  "ts": "2025-11-08T12:00:10Z",
  "actionId": "action_123"
}
```

#### `done`
Emitted when workflow completes successfully

```json
{
  "npc": "scheduler",
  "result": {
    "eventId": "evt_123",
    "title": "Team meeting",
    "attendees": 5
  },
  "ts": "2025-11-08T12:00:15Z"
}
```

#### `error`
Emitted when workflow fails

```json
{
  "npc": "scheduler",
  "error": "Failed to connect to Google Calendar API",
  "code": "API_ERROR",
  "ts": "2025-11-08T12:00:10Z"
}
```

### Subscribing to Events (Client-Side)

```javascript
// Create SSE connection
const eventSource = new EventSource('/api/stream?npc=scheduler');

// Listen to all event types
const events = ['started', 'step', 'awaiting', 'done', 'error'];

events.forEach(eventType => {
  eventSource.addEventListener(eventType, (event) => {
    const data = JSON.parse(event.data);
    handleEvent(eventType, data);
  });
});

// Handle connection errors
eventSource.addEventListener('error', () => {
  console.error('SSE connection lost');
  // Reconnect logic here
});

// Close connection
function closeStream() {
  eventSource.close();
}
```

### SkyOffice Implementation

```typescript
// From esprit/apps/skyoffice/src/lib/api.ts
export function subscribeToAgent(npc: string, callbacks: {
  onStarted: (data) => void;
  onStep: (data) => void;
  onDone: (data) => void;
  onError: (data) => void;
}) {
  const es = new EventSource(`/api/stream?npc=${npc}`);

  es.addEventListener('started', (e) => callbacks.onStarted(JSON.parse(e.data)));
  es.addEventListener('step', (e) => callbacks.onStep(JSON.parse(e.data)));
  es.addEventListener('done', (e) => callbacks.onDone(JSON.parse(e.data)));
  es.addEventListener('error', (e) => callbacks.onError(JSON.parse(e.data)));

  return es;
}
```

---

## Agent Mapping

### Overview

Agent mapping connects agent IDs to Sim.ai webhook URLs. It's stored in `agents.json` and reloaded on Gateway restart.

### Location

```
esprit/apps/gateway/data/agents.json
```

### File Format

```json
[
  {
    "agent": "scheduler",
    "npc": "scheduler",
    "webhookUrl": "http://sim:3000/api/v1/webhooks/catch/abc123def456"
  },
  {
    "agent": "mailops",
    "npc": "mailops",
    "webhookUrl": "http://sim:3000/api/v1/webhooks/catch/xyz789uvw012"
  },
  {
    "agent": "content-gen",
    "npc": "content-generator",
    "webhookUrl": "http://sim:3000/api/v1/webhooks/catch/mnop345qrst678"
  }
]
```

### Fields

| Field | Type | Description |
|-------|------|-------------|
| `agent` | string | Agent ID used in `/api/run/:agent` |
| `npc` | string | NPC ID for SSE channel filtering |
| `webhookUrl` | string | Sim.ai webhook URL to trigger |

### Adding a New Agent

1. **Create workflow in Sim.ai**
   - Open `http://localhost:8080/studio/`
   - Create new flow with webhook trigger
   - Deploy the flow
   - Copy the webhook URL

2. **Add to agents.json**
   ```json
   {
     "agent": "my-new-agent",
     "npc": "my-new-agent",
     "webhookUrl": "http://sim:3000/api/v1/webhooks/catch/YOUR_WEBHOOK_ID"
   }
   ```

3. **Restart Gateway**
   ```bash
   docker compose -f infra/docker-compose.yml restart gateway
   ```

4. **Verify mapping**
   ```bash
   curl http://localhost:8080/api/run/my-new-agent -X POST \
     -H "Content-Type: application/json" \
     -d '{"payload": {}}'
   ```

### Updating Webhook URLs

If you redeploy a workflow and get a new webhook URL:

1. Update `agents.json` with new URL
2. Restart Gateway
3. Test with `/api/run/:agent`

---

## Webhook Management

### Getting Webhook URLs from Sim.ai

**Method 1: Via Studio UI**
1. Open `http://localhost:8080/studio/`
2. Select your workflow
3. Find the "Webhook" trigger
4. Click to copy the webhook URL

**Method 2: Via Sim.ai API** (advanced)
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:8080/api/v1/webhooks \
  -X GET
```

### Webhook URL Structure

```
http://sim:3000/api/v1/webhooks/catch/[WEBHOOK_ID]
```

- `sim:3000` - Sim.ai service inside Docker network
- `[WEBHOOK_ID]` - Unique identifier for the webhook trigger

### Testing Webhooks

**Direct webhook test** (from outside Docker):
```bash
curl -X POST http://localhost:8080/api/v1/webhooks/catch/abc123 \
  -H "Content-Type: application/json" \
  -d '{"test": "payload"}'
```

**Via Gateway**:
```bash
curl -X POST http://localhost:8080/api/run/scheduler \
  -H "Content-Type: application/json" \
  -d '{"payload": {"test": "data"}}'
```

---

## Error Handling

### Common Errors

#### 404: Agent Not Found
```json
{
  "error": "Agent 'unknown' not found in mapping"
}
```

**Causes**:
- Agent ID doesn't exist in `agents.json`
- Typo in agent ID
- `agents.json` not reloaded after changes

**Solution**:
1. Check `agents.json` for the agent
2. Verify agent ID matches exactly (case-sensitive)
3. Restart Gateway: `docker compose restart gateway`

#### 500: Webhook Failed
```json
{
  "error": "Failed to trigger webhook"
}
```

**Causes**:
- Sim.ai service not running
- Webhook URL incorrect
- Network issue between Gateway and Sim.ai

**Solution**:
1. Check Sim.ai is healthy: `docker compose ps sim`
2. Verify webhook URL in `agents.json`
3. Test network: `docker exec gateway ping sim`

#### SSE Connection Lost
**Symptoms**: Real-time updates stop, status stuck on "running"

**Causes**:
- Gateway crashed or restarted
- Network issue
- Browser tab backgrounded (some browsers pause SSE)

**Solution**:
1. Check Gateway logs: `docker compose logs gateway`
2. Restart Gateway: `docker compose restart gateway`
3. Refresh browser tab

### Error Propagation

Errors in workflows are sent via `/api/events`:

```json
{
  "npc": "scheduler",
  "type": "error",
  "data": {
    "error": "Failed to create calendar event",
    "code": "CALENDAR_API_ERROR",
    "details": {
      "message": "Invalid credentials"
    }
  }
}
```

---

## Examples

### Example 1: Simple Webhook Trigger

**Create a basic agent workflow**:

1. In Sim.ai Studio, create a workflow with:
   - Trigger: Webhook → Catch Hook
   - Step 1: Log message "Agent started"
   - Step 2: HTTP Request → POST to `/api/events`
     ```json
     {
       "npc": "demo",
       "type": "done",
       "data": { "message": "Hello from Sim.ai!" }
     }
     ```
   - Deploy

2. Copy webhook URL from trigger

3. Add to `agents.json`:
   ```json
   { "agent": "demo", "npc": "demo", "webhookUrl": "..." }
   ```

4. Trigger from CLI:
   ```bash
   curl -X POST http://localhost:8080/api/run/demo \
     -H "Content-Type: application/json" \
     -d '{"payload": {}}'
   ```

### Example 2: Passing Data to Workflow

**Workflow with input parameters**:

1. In Sim.ai, add a webhook trigger with variable extraction
   - Extract `message` from payload

2. Use the variable in workflow steps

3. From UI:
   ```javascript
   await fetch('/api/run/echo', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({
       payload: {
         message: "Hello, Agent!"
       }
     })
   });
   ```

### Example 3: Multi-Step Workflow with Progress

**Workflow that reports progress**:

```javascript
// Step 1: HTTP Request
POST http://skyoffice-gateway:3001/api/events
{
  "npc": "processor",
  "type": "step",
  "data": { "message": "Processing started" }
}

// Step 2: Process data...

// Step 3: HTTP Request
POST http://skyoffice-gateway:3001/api/events
{
  "npc": "processor",
  "type": "step",
  "data": { "message": "Processing 50% complete" }
}

// Step 4: More processing...

// Step 5: HTTP Request
POST http://skyoffice-gateway:3001/api/events
{
  "npc": "processor",
  "type": "done",
  "data": { "result": "Processing complete!" }
}
```

---

## Configuration

### Environment Variables

**Location**: `esprit/.env`

```bash
# Gateway Port
PORT=3001

# Agent mapping file
AGENT_MAP_FILE=/app/data/agents.json

# Optional: Sim.ai API integration
AP_BASE=http://sim:3000
AP_TOKEN=
AP_PROJECT=

# Logging
LOG_LEVEL=info  # debug, info, warn, error
```

### Docker Environment

When running in Docker Compose, use:
- `http://sim:3000` - Sim.ai internal address
- `http://skyoffice-gateway:3001` - Gateway internal address (from workflow perspective)

When accessing from browser:
- `http://localhost:8080/api/run/:agent` - Gateway via proxy

### Nginx Configuration

**Location**: `esprit/infra/nginx.conf`

```nginx
# Gateway routing
location /api/ {
  proxy_pass http://gateway:3001;

  # SSE: disable buffering for /api/stream
  location /api/stream {
    proxy_buffering off;
    proxy_cache off;
  }
}
```

### Restart After Changes

```bash
# Reload agents.json
docker compose -f infra/docker-compose.yml restart gateway

# Or for full reset
docker compose -f infra/docker-compose.yml down
docker compose -f infra/docker-compose.yml up -d
```

---

## Next Steps

- **[Workflow Building Patterns](./WORKFLOWS.md)** - Build more complex workflows
- **[Deployment & Testing](./DEPLOYMENT.md)** - Deploy to production
- **[Troubleshooting](./TROUBLESHOOTING.md)** - Solve common issues

---

**Last Updated**: 2025-11-08
**Gateway Version**: 1.0.0
