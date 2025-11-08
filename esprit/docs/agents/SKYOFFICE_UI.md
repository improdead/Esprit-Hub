# 🎨 SkyOffice UI Integration Guide

**Complete guide to the SkyOffice UI architecture, agent monitoring, and UI customization**

SkyOffice is the visual interface for monitoring and controlling AI agents. This guide covers how it works, how to extend it, and best practices.

---

## 📖 Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Components](#components)
3. [Real-time Monitoring](#real-time-monitoring)
4. [Event Handling](#event-handling)
5. [Customization](#customization)
6. [Integration with Game](#integration-with-game)
7. [Performance Tips](#performance-tips)

---

## Architecture Overview

### UI Stack

- **React 18** - Component framework
- **TypeScript** - Type safety
- **CSS** - Styling (no framework)
- **EventSource API** - SSE streaming
- **Vite** - Build tool

### Component Hierarchy

```
App
├─ NPCPanel (one per agent)
│  ├─ Status indicator
│  ├─ Run button
│  ├─ Log viewer
│  └─ Builder link
└─ Global state
   ├─ Agent list
   └─ Event handlers
```

### Architecture Diagram

```
┌─────────────────────────────────┐
│      SkyOffice UI (React)       │
├─────────────────────────────────┤
│                                 │
│  ┌──────────────────────────┐   │
│  │  App.tsx                 │   │
│  │ (main component)         │   │
│  │                          │   │
│  │  - Agent list state      │   │
│  │  - Global event handler  │   │
│  └───────────┬──────────────┘   │
│              │                  │
│    ┌─────────┴──────────┬──────┐│
│    │                    │      ││
│  ┌─▼────────┐  ┌──────▼─┐  ┌──▼─┐
│  │NPCPanel  │  │NPCPanel│  │...│
│  │scheduler │  │mailops │  │   │
│  └──────────┘  └────────┘  └────┘
│
└─────────────────────────────────┘
         ↓ SSE
┌─────────────────────────────────┐
│  Gateway API                    │
├─────────────────────────────────┤
│  /api/stream?npc=X              │
│  /api/run/:agent                │
└─────────────────────────────────┘
```

---

## Components

### App Component

**Location**: `esprit/apps/skyoffice/src/App.tsx`

**Responsibilities**:
- Manages agent list
- Handles global events
- Renders NPCPanel for each agent
- Connects to Sim.ai Studio

```typescript
import { useState, useEffect } from 'react';

export default function App() {
  // Agent list
  const npcs = [
    { id: 'scheduler', name: 'Scheduler' },
    { id: 'mailops', name: 'MailOps' },
  ];

  const [agents, setAgents] = useState({});

  useEffect(() => {
    // Initialize agent state
    npcs.forEach(npc => {
      setAgents(prev => ({
        ...prev,
        [npc.id]: {
          status: 'idle',
          logs: [],
          lastUpdate: null
        }
      }));
    });
  }, []);

  return (
    <div className="app">
      <header>
        <h1>Esprit-Hub Agents</h1>
        <a href="/studio/" target="_blank">
          Open Sim.ai Studio
        </a>
      </header>

      <main className="agent-grid">
        {npcs.map(npc => (
          <NPCPanel
            key={npc.id}
            id={npc.id}
            name={npc.name}
          />
        ))}
      </main>
    </div>
  );
}
```

---

### NPCPanel Component

**Location**: `esprit/apps/skyoffice/src/components/NPCPanel.tsx`

**Responsibilities**:
- Display agent status
- Show logs
- Handle run button
- Subscribe to SSE events

```typescript
import { useState, useEffect } from 'react';

interface NPCPanelProps {
  id: string;
  name: string;
}

export function NPCPanel({ id, name }: NPCPanelProps) {
  const [status, setStatus] = useState<'idle' | 'running' | 'done' | 'error'>('idle');
  const [logs, setLogs] = useState<string[]>([]);
  const [eventSource, setEventSource] = useState<EventSource | null>(null);

  // Subscribe to SSE stream
  useEffect(() => {
    const es = new EventSource(`/api/stream?npc=${id}`);

    es.addEventListener('started', () => {
      setStatus('running');
      setLogs([]);
    });

    es.addEventListener('step', (event) => {
      const data = JSON.parse(event.data);
      setLogs(prev => [...prev, data.message]);
    });

    es.addEventListener('done', (event) => {
      const data = JSON.parse(event.data);
      setStatus('done');
      setLogs(prev => [...prev, 'Completed successfully']);
    });

    es.addEventListener('error', (event) => {
      const data = JSON.parse(event.data);
      setStatus('error');
      setLogs(prev => [...prev, `Error: ${data.error}`]);
    });

    es.onerror = () => {
      es.close();
    };

    setEventSource(es);

    return () => {
      es.close();
    };
  }, [id]);

  // Handle run button click
  async function handleRun() {
    try {
      const response = await fetch(`/api/run/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payload: {} })
      });

      if (!response.ok) {
        setStatus('error');
        setLogs(prev => [...prev, 'Failed to trigger agent']);
      }
    } catch (error) {
      setStatus('error');
      setLogs(prev => [...prev, `Error: ${error.message}`]);
    }
  }

  return (
    <div className="npc-panel" data-status={status}>
      <h2>{name}</h2>

      {/* Status Indicator */}
      <div className="status">
        <span className={`pill pill-${status}`}>
          {status.toUpperCase()}
        </span>
      </div>

      {/* Run Button */}
      <button
        onClick={handleRun}
        disabled={status === 'running'}
        className="run-button"
      >
        {status === 'running' ? 'Running...' : 'Run'}
      </button>

      {/* Logs */}
      <div className="logs">
        <h3>Logs</h3>
        <div className="log-content">
          {logs.map((log, i) => (
            <div key={i} className="log-line">
              {log}
            </div>
          ))}
        </div>
      </div>

      {/* Builder Link */}
      <a href="/studio/" target="_blank" className="builder-link">
        Edit in Studio
      </a>
    </div>
  );
}
```

---

### API Client

**Location**: `esprit/apps/skyoffice/src/lib/api.ts`

**Responsibilities**:
- API calls to Gateway
- SSE subscription helpers

```typescript
export async function triggerAgent(agentId: string, payload?: any) {
  const response = await fetch(`/api/run/${agentId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ payload: payload || {} })
  });

  if (!response.ok) {
    throw new Error(`Failed to trigger agent: ${response.statusText}`);
  }

  return response.json();
}

export function subscribeToAgent(
  agentId: string,
  callbacks: {
    onStarted?: (data: any) => void;
    onStep?: (data: any) => void;
    onDone?: (data: any) => void;
    onError?: (data: any) => void;
  }
) {
  const es = new EventSource(`/api/stream?npc=${agentId}`);

  if (callbacks.onStarted) {
    es.addEventListener('started', (e) => {
      callbacks.onStarted?.(JSON.parse(e.data));
    });
  }

  if (callbacks.onStep) {
    es.addEventListener('step', (e) => {
      callbacks.onStep?.(JSON.parse(e.data));
    });
  }

  if (callbacks.onDone) {
    es.addEventListener('done', (e) => {
      callbacks.onDone?.(JSON.parse(e.data));
    });
  }

  if (callbacks.onError) {
    es.addEventListener('error', (e) => {
      callbacks.onError?.(JSON.parse(e.data));
    });
  }

  es.onerror = () => {
    es.close();
  };

  return es;
}
```

---

## Real-time Monitoring

### Event Flow

```
Workflow executes
        ↓
Calls /api/events with progress
        ↓
Gateway broadcasts via SSE
        ↓
NPCPanel receives event
        ↓
UI updates in real-time
```

### Event Types and UI Updates

| Event Type | Status | UI Change |
|-----------|--------|-----------|
| `started` | running | Status changes to "RUNNING" |
| `step` | running | New log line added |
| `awaiting` | paused | Show input form |
| `done` | done | Status changes to "DONE" |
| `error` | error | Status changes to "ERROR" |

### Implementing Event Handlers

```typescript
const eventSource = subscribeToAgent('scheduler', {
  onStarted: (data) => {
    console.log('Workflow started');
    setStatus('running');
    setLogs([]); // Clear previous logs
  },

  onStep: (data) => {
    console.log('Progress:', data.message);
    setLogs(prev => [...prev, data.message]);

    // Optional: Show progress percentage
    if (data.progress) {
      setProgress(data.progress);
    }
  },

  onDone: (data) => {
    console.log('Workflow completed:', data.result);
    setStatus('done');
    setLogs(prev => [...prev, 'Completed successfully']);

    // Optional: Show result
    if (data.result) {
      showResult(data.result);
    }
  },

  onError: (data) => {
    console.error('Workflow failed:', data.error);
    setStatus('error');
    setLogs(prev => [...prev, `Error: ${data.error}`]);

    // Optional: Show error details
    if (data.details) {
      showErrorDetails(data.details);
    }
  }
});
```

---

## Event Handling

### Creating Custom Event Handlers

**Example: Alert on error**
```typescript
const eventSource = subscribeToAgent('scheduler', {
  onError: (data) => {
    // Show browser notification
    if (Notification.permission === 'granted') {
      new Notification('Agent Failed', {
        body: data.error,
        icon: '/error-icon.png'
      });
    }

    // Send to analytics
    analytics.trackEvent('agent_error', {
      agentId: 'scheduler',
      error: data.error
    });
  }
});
```

**Example: Auto-retry**
```typescript
async function runWithRetry(agentId: string, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await triggerAgent(agentId);

      // Wait for completion via SSE
      const completed = await waitForCompletion(agentId);

      if (completed.type === 'done') {
        return completed.data;
      }
    } catch (error) {
      if (attempt === maxRetries) throw error;

      // Wait before retry
      await new Promise(resolve =>
        setTimeout(resolve, 1000 * Math.pow(2, attempt - 1))
      );
    }
  }
}
```

---

## Customization

### Adding Custom Styling

**Location**: `esprit/apps/skyoffice/src/App.css`

```css
.npc-panel {
  border: 1px solid #ccc;
  border-radius: 8px;
  padding: 20px;
  margin: 10px;
  flex: 1;
  min-width: 300px;
}

.npc-panel[data-status="idle"] {
  opacity: 0.7;
}

.npc-panel[data-status="running"] {
  border-color: #ffb300;
  background: #fff9e6;
}

.npc-panel[data-status="done"] {
  border-color: #28a745;
  background: #f0fdf4;
}

.npc-panel[data-status="error"] {
  border-color: #dc3545;
  background: #fdf0f0;
}

.status .pill {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: bold;
}

.status .pill-idle {
  background: #e9ecef;
  color: #495057;
}

.status .pill-running {
  background: #ffb300;
  color: white;
  animation: pulse 1s infinite;
}

.status .pill-done {
  background: #28a745;
  color: white;
}

.status .pill-error {
  background: #dc3545;
  color: white;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

.logs {
  margin-top: 15px;
  border-top: 1px solid #e9ecef;
  padding-top: 15px;
}

.log-content {
  background: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  max-height: 200px;
  overflow-y: auto;
  font-family: monospace;
  font-size: 12px;
  padding: 10px;
}

.log-line {
  line-height: 1.5;
  margin: 2px 0;
}
```

---

### Adding New Agent Card

**In App.tsx**:
```typescript
const npcs = [
  { id: 'scheduler', name: 'Scheduler' },
  { id: 'mailops', name: 'MailOps' },
  { id: 'my-new-agent', name: 'My New Agent' }  // Add here
];
```

### Custom Status Indicator

**Create component**:
```typescript
interface StatusProps {
  status: 'idle' | 'running' | 'done' | 'error';
  progress?: number;
}

export function StatusIndicator({ status, progress }: StatusProps) {
  return (
    <div className="status-indicator">
      {status === 'running' && progress && (
        <div className="progress-bar">
          <div
            className="progress-fill"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      <span className={`status-${status}`}>
        {status.toUpperCase()}
      </span>
    </div>
  );
}
```

---

### Advanced: Custom Log Viewer

**Create advanced log viewer**:
```typescript
export function AdvancedLogViewer({ logs }: { logs: any[] }) {
  const [filter, setFilter] = useState('');

  const filtered = logs.filter(log =>
    log.message.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="advanced-logs">
      <input
        type="text"
        placeholder="Filter logs..."
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
      />

      <div className="log-entries">
        {filtered.map((log, i) => (
          <div key={i} className={`log-entry log-${log.level}`}>
            <span className="timestamp">{log.ts}</span>
            <span className="message">{log.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## Integration with Game

### Connecting to Phaser Game

**In game client** (`client/src/`):

```typescript
// Trigger agent from game
async function triggerAgentFromGame(agentId: string, context: any) {
  const response = await fetch('/api/run/' + agentId, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      payload: {
        context: context,
        timestamp: Date.now()
      }
    })
  });

  return response.json();
}

// Listen to agent events in game
function listenToAgentEvents(agentId: string, onUpdate: (event: any) => void) {
  const es = new EventSource(`/api/stream?npc=${agentId}`);

  es.addEventListener('step', (event) => {
    const data = JSON.parse(event.data);
    onUpdate(data);
  });

  es.addEventListener('done', (event) => {
    const data = JSON.parse(event.data);
    onUpdate(data);

    // Update game state based on agent result
    updateGameState(data.result);
  });

  return es;
}
```

**Update game UI**:
```typescript
// Show agent status in game HUD
function updateGameHUD(agentStatus: any) {
  const hud = scene.add.text(10, 10, `Agent: ${agentStatus.status}`);

  if (agentStatus.status === 'done') {
    // Update NPC based on agent result
    npc.setState(agentStatus.result);
  }
}
```

---

## Performance Tips

### 1. Limit Log History

```typescript
// Keep only last 100 logs
const maxLogs = 100;
setLogs(prev => {
  const updated = [...prev, newLog];
  return updated.slice(-maxLogs);
});
```

### 2. Batch DOM Updates

```typescript
// Bad: Updates DOM for each log
logs.forEach(log => addLogElement(log));

// Good: Add all at once
const fragment = document.createDocumentFragment();
logs.forEach(log => {
  fragment.appendChild(createLogElement(log));
});
container.appendChild(fragment);
```

### 3. Unsubscribe Properly

```typescript
useEffect(() => {
  const es = subscribeToAgent('scheduler', {...});

  return () => {
    es.close(); // Clean up SSE connection
  };
}, []);
```

### 4. Debounce Updates

```typescript
// Avoid too frequent re-renders
const [logs, setLogs] = useState([]);
const updateTimeout = useRef<NodeJS.Timeout>();

const addLog = (message: string) => {
  clearTimeout(updateTimeout.current);

  updateTimeout.current = setTimeout(() => {
    setLogs(prev => [...prev, message]);
  }, 100); // Batch updates every 100ms
};
```

---

## Next Steps

- **[Gateway API](./GATEWAY.md)** - Understand API calls
- **[Workflows](./WORKFLOWS.md)** - Build agent workflows
- **[Deployment](./DEPLOYMENT.md)** - Deploy to production

---

**Last Updated**: 2025-11-08
**UI Version**: 1.0.0
