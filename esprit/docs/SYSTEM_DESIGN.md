# SkyOffice + Sim.ai MVP System Design
**AI-Native Virtual Office with Living NPCs**

## Executive Summary

An AI-native virtual office where NPCs (both AI agents and real employees) visually perform tasks in real-time. NPCs walk to computers, type on keyboards, show work progress, and feel "alive" through animations and status updates. Sim.ai provides the agent builder and execution engine, while SkyOffice creates the immersive virtual office experience.

---

## 🎯 Core Vision & Goals

### What Makes This Special

- **Living NPCs**: Agents don't just execute tasks - they visually perform them
- **Immersive Office**: See NPCs walking, sitting, typing, thinking
- **Real-time Feedback**: Expandable status bars showing actual work progress
- **Natural Interaction**: Click an NPC to see what they're doing, interrupt them, or reassign tasks

### Key Technical Challenges Solved

- **Visual State Synchronization**: NPC animations match actual task execution
- **Progressive Disclosure**: Simple status pills expand to detailed work logs
- **Interruption Handling**: Gracefully pause/resume agent tasks
- **Presence System**: Show who's "at work" vs "away" vs "busy"

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    SkyOffice Frontend                        │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────────┐       │
│  │  3D Office  │  │ NPC Manager │  │ Status Panel │       │
│  │   (Three.js)│  │  (React)    │  │   (React)    │       │
│  └──────┬──────┘  └──────┬──────┘  └──────┬───────┘       │
│         └─────────────────┼─────────────────┘               │
│                           │                                  │
│                    ┌──────▼──────┐                          │
│                    │State Manager│                          │
│                    │   (Zustand) │                          │
│                    └──────┬──────┘                          │
└───────────────────────────┼─────────────────────────────────┘
                            │ WebSocket/SSE
                 ┌──────────▼──────────┐
                 │   Gateway Service   │
                 │     (Node.js)       │
                 └──────────┬──────────┘
                            │
         ┌──────────────────┼──────────────────┐
         │                  │                  │
    ┌────▼─────┐     ┌─────▼──────┐    ┌─────▼──────┐
    │  Sim.ai  │     │  Postgres  │    │   Redis    │
    │   API    │     │  (State)   │    │  (Cache)   │
    └──────────┘     └────────────┘    └────────────┘
```

---

## 🎭 NPC Animation States

### Visual States for NPCs

```typescript
enum NPCState {
  IDLE = "idle",              // Standing, occasional fidget
  WALKING = "walking",        // Moving to destination
  SITTING = "sitting",        // At desk
  TYPING = "typing",          // Active keyboard animation
  THINKING = "thinking",      // Hand on chin, looking up
  MEETING = "meeting",        // In conference room
  COFFEE = "coffee",          // Break time
  ERROR = "error",            // Frustrated animation
  CELEBRATING = "celebrating" // Task complete animation
}

interface NPCVisualState {
  id: string;
  name: string;
  position: Vector3;
  rotation: Quaternion;
  state: NPCState;
  workstation?: string;
  currentTask?: {
    id: string;
    title: string;
    progress: number;
    status: "queued" | "running" | "completed" | "failed";
    startedAt: Date;
    estimatedCompletion?: Date;
    logs: TaskLog[];
  };
  avatar: {
    model: string;
    texture: string;
    accessories: string[];
  };
  mood: "happy" | "focused" | "stressed" | "neutral";
}
```

---

## 🖥️ UI Components Design

### 1. Main Office View (Three.js)

```typescript
// 3D Office Component
const VirtualOffice: React.FC = () => {
  const { npcs, updateNPCPosition } = useNPCStore();

  return (
    <Canvas>
      <ambientLight />
      <Office3DModel />
      {npcs.map(npc => (
        <AnimatedNPC
          key={npc.id}
          npc={npc}
          onClick={() => openNPCPanel(npc.id)}
        />
      ))}
      <CameraController />
    </Canvas>
  );
};
```

### 2. NPC Status Bar (Expandable)

```typescript
// Floating status bar above each NPC
const NPCStatusBar: React.FC<{npc: NPC}> = ({ npc }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={`npc-status ${expanded ? 'expanded' : 'compact'}`}>
      {/* Compact View */}
      <div className="status-pill" onClick={() => setExpanded(!expanded)}>
        <Avatar src={npc.avatar} />
        <span>{npc.name}</span>
        <TaskProgress value={npc.currentTask?.progress} />
        <StatusIcon status={npc.currentTask?.status} />
      </div>

      {/* Expanded View */}
      {expanded && (
        <div className="status-details">
          <h3>{npc.currentTask?.title}</h3>
          <ProgressSteps steps={npc.currentTask?.steps} />
          <LogStream logs={npc.currentTask?.logs} />
          <Actions>
            <Button onClick={() => pauseTask(npc.id)}>Pause</Button>
            <Button onClick={() => reassignTask(npc.id)}>Reassign</Button>
            <Button onClick={() => viewFullDetails(npc.id)}>Details</Button>
          </Actions>
        </div>
      )}
    </div>
  );
};
```

### 3. Work Terminal View (What NPC Sees)

```typescript
// Shows actual work being done
const NPCTerminal: React.FC<{npcId: string}> = ({ npcId }) => {
  const terminal = useNPCTerminal(npcId);

  return (
    <div className="terminal-window">
      <div className="terminal-header">
        <span>{terminal.npc.name}'s Workstation</span>
        <span className="status">{terminal.status}</span>
      </div>

      <div className="terminal-content">
        {/* Simulated typing effect */}
        <TypewriterEffect text={terminal.currentOutput} />

        {/* Show actual agent actions */}
        <div className="action-log">
          {terminal.actions.map(action => (
            <div key={action.id} className="action-item">
              <Icon type={action.type} />
              <span>{action.description}</span>
              <Timestamp time={action.timestamp} />
            </div>
          ))}
        </div>
      </div>

      {/* Mini view of what's on screen */}
      <div className="screen-preview">
        <iframe src={terminal.screenUrl} />
      </div>
    </div>
  );
};
```

### 4. Sim.ai Agent Builder Integration

```typescript
// Embedded Sim.ai builder with custom styling
const AgentBuilder: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <FloatingActionButton
        icon={<RobotIcon />}
        onClick={() => setIsOpen(true)}
        tooltip="Create New Agent"
      />

      <Drawer open={isOpen} onClose={() => setIsOpen(false)} size="large">
        <DrawerHeader>
          <h2>Agent Workshop</h2>
          <span>Powered by Sim.ai</span>
        </DrawerHeader>

        <DrawerContent>
          {/* Custom wrapper around Sim.ai builder */}
          <SimAIBuilderWrapper
            onAgentCreated={handleAgentCreated}
            customTheme={skyOfficeTheme}
            defaultTemplate="office-worker"
          />
        </DrawerContent>
      </Drawer>
    </>
  );
};
```

---

## 🔄 Real-time State Synchronization

### Gateway Service (Node.js/Express)

```typescript
// gateway/src/index.ts
import { Server as SocketIOServer } from 'socket.io';
import { SimAIClient } from './clients/simai';
import { NPCStateManager } from './managers/npc-state';

class GatewayService {
  private io: SocketIOServer;
  private simAI: SimAIClient;
  private npcManager: NPCStateManager;

  async handleAgentExecution(agentId: string, params: any) {
    const npc = await this.npcManager.getNPC(agentId);

    // Update NPC to "walking to desk" state
    await this.updateNPCState(npc.id, {
      state: NPCState.WALKING,
      destination: npc.workstation,
    });

    // Simulate walking time
    await this.animateWalking(npc);

    // Update to "sitting" then "typing"
    await this.updateNPCState(npc.id, {
      state: NPCState.SITTING,
    });

    await sleep(500);

    await this.updateNPCState(npc.id, {
      state: NPCState.TYPING,
    });

    // Start Sim.ai agent execution
    const execution = await this.simAI.executeAgent(agentId, {
      ...params,
      webhooks: {
        onStepStart: (step) => this.handleStepStart(npc.id, step),
        onStepComplete: (step) => this.handleStepComplete(npc.id, step),
        onLog: (log) => this.handleAgentLog(npc.id, log),
      }
    });

    return execution;
  }

  private async handleStepStart(npcId: string, step: AgentStep) {
    // Map agent actions to NPC animations
    const animation = this.mapStepToAnimation(step);

    await this.updateNPCState(npcId, {
      state: animation,
      currentAction: step.description,
    });

    // Broadcast to all connected clients
    this.io.emit('npc:action', {
      npcId,
      action: step.description,
      type: step.type,
      timestamp: Date.now(),
    });
  }

  private mapStepToAnimation(step: AgentStep): NPCState {
    switch(step.type) {
      case 'research':
      case 'analyze':
        return NPCState.THINKING;
      case 'write':
      case 'code':
        return NPCState.TYPING;
      case 'communicate':
        return NPCState.MEETING;
      case 'error':
        return NPCState.ERROR;
      default:
        return NPCState.TYPING;
    }
  }
}
```

---

## 📊 Data Models

### PostgreSQL Schema

```sql
-- NPCs table
CREATE TABLE npcs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  type ENUM('ai_agent', 'human') NOT NULL,
  sim_ai_agent_id VARCHAR(255),
  avatar_config JSONB,
  workstation_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Task executions
CREATE TABLE task_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  npc_id UUID REFERENCES npcs(id),
  task_name VARCHAR(255),
  status VARCHAR(50),
  progress INTEGER DEFAULT 0,
  started_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  logs JSONB DEFAULT '[]',
  result JSONB,
  sim_ai_execution_id VARCHAR(255)
);

-- NPC activity log (for analytics)
CREATE TABLE npc_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  npc_id UUID REFERENCES npcs(id),
  state VARCHAR(50),
  position JSONB,
  metadata JSONB,
  timestamp TIMESTAMP DEFAULT NOW()
);

-- Office layout
CREATE TABLE office_layout (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  object_type VARCHAR(50), -- desk, meeting_room, coffee_machine
  position JSONB,
  rotation JSONB,
  metadata JSONB,
  occupied_by UUID REFERENCES npcs(id)
);
```

---

## 🎨 Visual Design System

### Animation Sequences

```typescript
// Animation definitions for NPC states
const animations = {
  walking: {
    duration: 2000,
    keyframes: [
      { legs: 'step-left', arms: 'swing-right', progress: 0 },
      { legs: 'step-right', arms: 'swing-left', progress: 0.5 },
      { legs: 'step-left', arms: 'swing-right', progress: 1 },
    ]
  },
  typing: {
    duration: 500,
    loop: true,
    keyframes: [
      { fingers: 'rest', progress: 0 },
      { fingers: 'press-keys', progress: 0.3 },
      { fingers: 'lift', progress: 0.6 },
      { fingers: 'move-to-next', progress: 1 },
    ]
  },
  thinking: {
    duration: 3000,
    keyframes: [
      { head: 'tilt-up', hand: 'chin', eyes: 'look-up', progress: 0 },
      { head: 'nod', hand: 'chin', eyes: 'blink', progress: 0.5 },
      { head: 'straight', hand: 'down', eyes: 'forward', progress: 1 },
    ]
  },
  celebrating: {
    duration: 1500,
    keyframes: [
      { arms: 'down', progress: 0 },
      { arms: 'raise', jump: true, progress: 0.3 },
      { arms: 'pump', jump: false, progress: 0.6 },
      { arms: 'down', progress: 1 },
    ]
  }
};
```

### UI Theme

```scss
// styles/skyoffice-theme.scss
:root {
  // Modern office colors
  --primary: #2563eb;      // Bright blue
  --secondary: #7c3aed;     // Purple accent
  --success: #10b981;       // Green
  --warning: #f59e0b;       // Amber
  --danger: #ef4444;        // Red

  // Glass morphism
  --glass-bg: rgba(255, 255, 255, 0.1);
  --glass-border: rgba(255, 255, 255, 0.2);
  --glass-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.37);
  --glass-blur: blur(4px);

  // Animations
  --bounce: cubic-bezier(0.68, -0.55, 0.265, 1.55);
  --smooth: cubic-bezier(0.4, 0.0, 0.2, 1);
}

.npc-status {
  background: var(--glass-bg);
  backdrop-filter: var(--glass-blur);
  border: 1px solid var(--glass-border);
  border-radius: 12px;
  box-shadow: var(--glass-shadow);
  transition: all 0.3s var(--smooth);

  &.expanded {
    transform: scale(1.05);
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  }
}

.status-pill {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  cursor: pointer;

  &:hover {
    background: rgba(255, 255, 255, 0.05);
  }
}

.task-progress {
  width: 100px;
  height: 4px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
  overflow: hidden;

  .progress-bar {
    height: 100%;
    background: linear-gradient(90deg, var(--primary), var(--secondary));
    transition: width 0.3s var(--smooth);
    box-shadow: 0 0 10px var(--primary);
  }
}
```

---

## 🚀 Implementation Roadmap

### Phase 1: Core Infrastructure (Week 1)
- [ ] Set up monorepo structure
- [ ] Configure Docker compose with all services
- [ ] Create basic Gateway service with WebSocket support
- [ ] Set up PostgreSQL schema
- [ ] Initialize Three.js office scene

### Phase 2: NPC System (Week 2)
- [ ] Implement NPC state machine
- [ ] Create basic NPC 3D models and animations
- [ ] Build NPC Manager component
- [ ] Implement position tracking and movement
- [ ] Create status bar UI components

### Phase 3: Sim.ai Integration (Week 3)
- [ ] Integrate Sim.ai SDK
- [ ] Create agent webhook handlers
- [ ] Map agent actions to NPC animations
- [ ] Implement execution tracking
- [ ] Build agent builder wrapper UI

### Phase 4: Real-time Updates (Week 4)
- [ ] Implement WebSocket event system
- [ ] Create live log streaming
- [ ] Build progress tracking
- [ ] Add interrupt/pause functionality
- [ ] Implement task reassignment

### Phase 5: Polish & Testing (Week 5)
- [ ] Refine animations and transitions
- [ ] Add sound effects
- [ ] Optimize performance
- [ ] Add error handling
- [ ] Create demo agents

---

## 🔧 Development Setup

### Prerequisites

```bash
# Required tools
node >= 18.0.0
npm >= 9.0.0
docker >= 20.10.0
docker-compose >= 2.0.0

# Recommended
pnpm >= 8.0.0  # Faster than npm for monorepos
```

### Quick Start

```bash
# Clone repository
git clone https://github.com/yourusername/skyoffice.git
cd skyoffice

# Install dependencies
pnpm install

# Copy environment variables
cp .env.example .env

# Start infrastructure
docker-compose up -d

# Start development servers
pnpm dev

# Open in browser
open http://localhost:3000
```

### Environment Variables

```bash
# Sim.ai Configuration
SIM_AI_API_KEY=your-api-key
SIM_AI_API_URL=https://api.sim.ai
SIM_AI_WEBHOOK_SECRET=webhook-secret

# Database
DATABASE_URL=postgresql://postgres:password@localhost:5432/skyoffice
REDIS_URL=redis://localhost:6379

# Gateway Service
GATEWAY_PORT=4000
GATEWAY_WS_PORT=4001

# Frontend
VITE_API_URL=http://localhost:4000
VITE_WS_URL=ws://localhost:4001
```

---

## 📁 Project Structure

```
skyoffice/
├── apps/
│   ├── web/                 # SkyOffice React app
│   │   ├── src/
│   │   │   ├── components/
│   │   │   │   ├── Office3D/
│   │   │   │   ├── NPCManager/
│   │   │   │   └── StatusPanel/
│   │   │   ├── hooks/
│   │   │   ├── stores/
│   │   │   └── styles/
│   │   └── package.json
│   │
│   └── gateway/            # Node.js backend
│       ├── src/
│       │   ├── controllers/
│       │   ├── services/
│       │   ├── clients/
│       │   └── websocket/
│       └── package.json
│
├── packages/
│   ├── shared/            # Shared types & utils
│   ├── ui/                # Shared UI components
│   └── simai-client/      # Sim.ai SDK wrapper
│
├── docker-compose.yml
├── pnpm-workspace.yaml
└── README.md
```

---

## 🔒 Security Considerations

- **API Authentication**: JWT tokens for user sessions
- **Agent Isolation**: Each agent runs in sandboxed environment
- **Rate Limiting**: Prevent abuse of Sim.ai API
- **Data Encryption**: All sensitive data encrypted at rest
- **Audit Logging**: Track all agent actions and user interactions

---

## 📈 Performance Optimizations

- **3D Scene**: Use LOD (Level of Detail) for NPCs based on camera distance
- **WebSocket**: Implement message batching and compression
- **State Management**: Use Zustand with persistence and devtools
- **Lazy Loading**: Load office sections and NPCs on demand
- **Caching**: Redis for frequently accessed NPC states

---

## 🎯 Success Metrics

- **NPC Response Time**: < 100ms for state updates
- **Animation FPS**: Maintain 60fps with 50+ NPCs
- **Task Completion**: 95% success rate for agent tasks
- **User Engagement**: Average session > 30 minutes
- **Agent Creation**: < 2 minutes to create new agent

---

## 🚧 Future Enhancements

- **Voice Integration**: NPCs respond to voice commands
- **Multiplayer**: Multiple users in same office
- **Mobile App**: Monitor office from phone
- **AR Mode**: View NPCs in real world
- **Custom Avatars**: Upload or create unique NPC appearances
- **Office Designer**: Drag-and-drop office layout editor
- **Performance Reviews**: Analytics on NPC productivity

---

**This MVP design creates an immersive virtual office where AI agents feel truly alive. The combination of Sim.ai's powerful agent capabilities with SkyOffice's visual representation creates a unique and engaging experience for the future of work.**
