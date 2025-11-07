# Esprit-Hub + Sim.ai Implementation Plan
**AI-Native Virtual Office with Living NPCs**

**Last Updated**: 2025-11-07
**Status**: Planning Phase
**Timeline**: 5 Weeks to MVP

---

## 🎯 Vision

Create an **immersive virtual office** where AI agents (NPCs) visually perform tasks in real-time. NPCs walk to their desks, type on keyboards, show thinking animations, and display live progress. This creates a tangible, engaging interface for AI automation that feels alive and human.

### What Makes This Special

- **Living NPCs**: Agents don't just execute tasks - they visually perform them
- **Real-time Feedback**: See exactly what agents are doing through animations and status updates
- **Natural Interaction**: Click an NPC to see details, interrupt tasks, or reassign work
- **Immersive Office**: 3D virtual office where you can see your entire team at work

---

## 📊 Current Stack Analysis

### What Sim.ai Provides

Based on codebase analysis (`esprit/external/sim/packages/db/schema.ts`):

**Core Features:**
- ✅ **Workflow Builder** - Visual workflow creation
- ✅ **Workflow Execution** - Runs workflows with logging
- ✅ **Webhook Triggers** - Trigger workflows via HTTP
- ✅ **Schedule Triggers** - Cron-based execution
- ✅ **Manual Triggers** - User-initiated runs
- ✅ **Chat Triggers** - Conversational interfaces
- ✅ **Knowledge Bases** - Semantic search with embeddings
- ✅ **Document Embeddings** - 1536-dim vectors (text-embedding-3-small)
- ✅ **Vector Search** - pgvector with HNSW indexes
- ✅ **Execution Logs** - Detailed workflow run history
- ✅ **Webhook Deliveries** - Event notifications with retry logic

**Database:**
- ✅ **PostgreSQL 17** with **pgvector** extension
- ✅ **Vector similarity search** for knowledge bases
- ✅ **Full-text search** with tsvector
- ✅ **Workflow versioning** and deployment tracking

### What We're Adding

**SkyOffice Integration:**
- 🆕 **3D Virtual Office** - Three.js/React 3D environment
- 🆕 **Animated NPCs** - Character models with state-based animations
- 🆕 **Visual Task Execution** - NPCs visually perform agent tasks
- 🆕 **Real-time State Sync** - WebSocket updates from Sim.ai to NPCs
- 🆕 **Interactive UI** - Click NPCs, view terminals, manage tasks
- 🆕 **Gateway Service** - Orchestrates Sim.ai ↔ SkyOffice communication

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                  SkyOffice Frontend (React)                  │
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────┐     │
│  │   3D Office  │  │  NPC Manager │  │  Status Panel │     │
│  │  (Three.js)  │  │   (Zustand)  │  │    (React)    │     │
│  └──────┬───────┘  └──────┬───────┘  └───────┬───────┘     │
│         │                  │                   │             │
│         └──────────────────┼───────────────────┘             │
│                            │                                  │
│                     ┌──────▼──────┐                          │
│                     │   WebSocket │                          │
│                     │   Client    │                          │
│                     └──────┬──────┘                          │
└────────────────────────────┼─────────────────────────────────┘
                             │ WS/SSE
                  ┌──────────▼──────────┐
                  │  Gateway Service    │
                  │    (Fastify/TS)     │
                  │                     │
                  │  • NPC State Mgmt   │
                  │  • Animation Mapper │
                  │  • Event Streaming  │
                  │  • Task Orchestrate │
                  └──────────┬──────────┘
                             │
          ┌──────────────────┼──────────────────┐
          │                  │                  │
     ┌────▼─────┐      ┌────▼─────┐     ┌─────▼──────┐
     │  Sim.ai  │      │ Postgres │     │   Redis    │
     │   API    │      │ + pgvector│     │  (Cache)   │
     │          │      │           │     │            │
     │ Workflows│      │ • NPCs    │     │ • Sessions │
     │ Execution│      │ • Tasks   │     │ • NPC State│
     │ Knowledge│      │ • Users   │     └────────────┘
     │ Bases    │      │ • Logs    │
     └──────────┘      └───────────┘
```

---

## 📁 Project Structure (New)

```
esprit/
├── apps/
│   ├── gateway/              # EXISTING - Backend API
│   │   ├── src/
│   │   │   ├── routes/
│   │   │   │   ├── run.ts           # Trigger agents
│   │   │   │   ├── events.ts        # Receive Sim.ai events
│   │   │   │   ├── stream.ts        # SSE for frontend
│   │   │   │   └── npcs.ts          # NEW - NPC CRUD
│   │   │   ├── services/
│   │   │   │   ├── npc-state.ts     # NEW - NPC state management
│   │   │   │   ├── animation.ts     # NEW - Map tasks → animations
│   │   │   │   └── sim-client.ts    # NEW - Sim.ai API client
│   │   │   └── websocket/
│   │   │       └── index.ts         # NEW - WebSocket server
│   │   └── Dockerfile
│   │
│   └── skyoffice/            # EXISTING - Frontend
│       ├── src/
│       │   ├── components/
│       │   │   ├── Office3D/         # NEW - 3D office scene
│       │   │   │   ├── Scene.tsx
│       │   │   │   ├── AnimatedNPC.tsx
│       │   │   │   ├── Office.tsx
│       │   │   │   └── Camera.tsx
│       │   │   ├── NPCManager/       # NEW - NPC UI
│       │   │   │   ├── NPCList.tsx
│       │   │   │   ├── NPCStatusBar.tsx
│       │   │   │   ├── NPCTerminal.tsx
│       │   │   │   └── TaskProgress.tsx
│       │   │   └── NPCPanel.tsx      # EXISTING - Update this
│       │   ├── hooks/
│       │   │   ├── useNPCStore.ts    # NEW - Zustand store
│       │   │   ├── useWebSocket.ts   # NEW - WS connection
│       │   │   └── useSimAI.ts       # NEW - Sim.ai integration
│       │   └── types/
│       │       ├── npc.ts            # NEW - NPC types
│       │       └── animation.ts      # NEW - Animation types
│       └── Dockerfile
│
├── external/
│   └── sim/                  # EXISTING - Sim.ai codebase
│       ├── apps/sim/         # Sim.ai UI
│       ├── packages/db/      # Database schema
│       └── docker/           # Dockerfiles
│
├── infra/
│   ├── docker-compose.yml    # EXISTING - All services
│   └── nginx.conf            # EXISTING - Reverse proxy
│
└── docs/
    ├── IMPLEMENTATION_PLAN.md     # THIS FILE
    ├── ARCHITECTURE.md            # NEW - System architecture
    ├── DEVELOPMENT_RULES.md       # NEW - Development guidelines
    ├── agent.md                   # EXISTING - Updated with new vision
    └── implementation-status.md   # EXISTING
```

---

## 🗄️ Database Schema (New Tables)

We'll add these tables to our existing PostgreSQL database (alongside Sim.ai's tables):

```sql
-- NPCs (AI agents and human employees)
CREATE TABLE npcs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('ai_agent', 'human')),

  -- Sim.ai integration
  sim_workflow_id TEXT,              -- Links to Sim.ai workflow
  sim_webhook_url TEXT,              -- Webhook to trigger this NPC's workflow

  -- Visual representation
  avatar_model VARCHAR(255) DEFAULT 'default',
  avatar_texture VARCHAR(255),
  avatar_accessories JSONB DEFAULT '[]',

  -- Office position
  workstation_id VARCHAR(255),       -- Which desk they sit at
  initial_position JSONB,            -- Starting position in office

  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by TEXT                    -- User ID who created this NPC
);

-- NPC State (real-time state)
CREATE TABLE npc_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  npc_id UUID REFERENCES npcs(id) ON DELETE CASCADE,

  -- Current state
  state VARCHAR(50) NOT NULL,        -- idle, walking, sitting, typing, etc.
  position JSONB,                    -- Current 3D position
  rotation JSONB,                    -- Current rotation
  mood VARCHAR(50) DEFAULT 'neutral', -- happy, focused, stressed, neutral

  -- Current task
  current_task_id UUID,
  task_title TEXT,
  task_progress INTEGER DEFAULT 0,   -- 0-100
  task_status VARCHAR(50),           -- queued, running, completed, failed
  task_started_at TIMESTAMP,
  task_estimated_completion TIMESTAMP,

  -- Logs (recent activity)
  recent_logs JSONB DEFAULT '[]',    -- Last 50 log entries

  -- Timestamps
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create index for fast lookups
CREATE INDEX idx_npc_state_npc_id ON npc_state(npc_id);
CREATE UNIQUE INDEX idx_npc_state_one_per_npc ON npc_state(npc_id);

-- Task Executions (history of all tasks)
CREATE TABLE task_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  npc_id UUID REFERENCES npcs(id) ON DELETE CASCADE,

  -- Task details
  task_name VARCHAR(255),
  task_description TEXT,
  trigger_type VARCHAR(50),          -- manual, webhook, schedule

  -- Sim.ai integration
  sim_execution_id TEXT,             -- Sim.ai's execution ID
  sim_workflow_id TEXT,              -- Sim.ai's workflow ID

  -- Status
  status VARCHAR(50) NOT NULL,       -- queued, running, completed, failed
  progress INTEGER DEFAULT 0,

  -- Timing
  started_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  duration_ms INTEGER,

  -- Results
  result JSONB,                      -- Task output
  error_message TEXT,                -- If failed
  logs JSONB DEFAULT '[]'            -- Full execution logs
);

CREATE INDEX idx_task_executions_npc_id ON task_executions(npc_id);
CREATE INDEX idx_task_executions_status ON task_executions(status);
CREATE INDEX idx_task_executions_started_at ON task_executions(started_at DESC);

-- Office Layout (desks, meeting rooms, etc.)
CREATE TABLE office_layout (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  object_type VARCHAR(50) NOT NULL,  -- desk, meeting_room, coffee_machine, plant
  name VARCHAR(255),                 -- "Sarah's Desk", "Conference Room A"
  position JSONB NOT NULL,           -- 3D position
  rotation JSONB,                    -- 3D rotation
  metadata JSONB,                    -- Custom properties (color, size, etc.)
  occupied_by UUID REFERENCES npcs(id) ON DELETE SET NULL
);

-- Animation Definitions (reusable animations)
CREATE TABLE animations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL UNIQUE,
  state VARCHAR(50) NOT NULL,        -- Maps to NPCState enum
  keyframes JSONB NOT NULL,          -- Animation keyframes
  duration_ms INTEGER NOT NULL,
  loop BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Insert default animations
INSERT INTO animations (name, state, keyframes, duration_ms, loop) VALUES
('walking', 'walking', '[
  {"progress": 0, "legs": "step-left", "arms": "swing-right"},
  {"progress": 0.5, "legs": "step-right", "arms": "swing-left"},
  {"progress": 1, "legs": "step-left", "arms": "swing-right"}
]', 2000, true),
('typing', 'typing', '[
  {"progress": 0, "fingers": "rest"},
  {"progress": 0.3, "fingers": "press-keys"},
  {"progress": 0.6, "fingers": "lift"},
  {"progress": 1, "fingers": "move-to-next"}
]', 500, true),
('thinking', 'thinking', '[
  {"progress": 0, "head": "tilt-up", "hand": "chin", "eyes": "look-up"},
  {"progress": 0.5, "head": "nod", "hand": "chin", "eyes": "blink"},
  {"progress": 1, "head": "straight", "hand": "down", "eyes": "forward"}
]', 3000, false);
```

---

## 🔄 Data Flow

### 1. User Triggers an Agent

```
User clicks "Run" on NPC
       ↓
Frontend → POST /api/run/scheduler
       ↓
Gateway finds NPC by agent name
       ↓
Gateway updates NPC state to "walking"
       ↓
Frontend receives WebSocket update
       ↓
3D NPC starts walking animation
       ↓
Gateway triggers Sim.ai workflow via webhook
       ↓
Sim.ai starts executing workflow
```

### 2. Agent Executes Task

```
Sim.ai workflow runs
       ↓
Each step completion → POST /api/events
       ↓
Gateway receives step event
       ↓
Gateway maps step type to animation
       ↓
Gateway updates NPC state (e.g., "typing")
       ↓
Gateway broadcasts via WebSocket
       ↓
Frontend updates NPC animation in real-time
```

### 3. Task Completion

```
Sim.ai workflow completes
       ↓
POST /api/events with type="done"
       ↓
Gateway updates NPC state to "celebrating"
       ↓
Gateway saves execution to database
       ↓
Frontend shows celebration animation
       ↓
After 2 seconds, NPC returns to "idle"
```

---

## 🎭 NPC Animation State Machine

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

// State transitions
const transitions = {
  idle: ["walking", "coffee"],
  walking: ["sitting", "meeting", "idle"],
  sitting: ["typing", "thinking", "idle", "walking"],
  typing: ["thinking", "celebrating", "error", "idle"],
  thinking: ["typing", "celebrating", "error", "idle"],
  meeting: ["idle", "walking"],
  coffee: ["idle", "walking"],
  error: ["idle", "thinking"],
  celebrating: ["idle"]
};
```

---

## 📋 Implementation Phases

### **Phase 1: Core Infrastructure** (Week 1)

**Goal**: Set up base project structure and integrate Sim.ai

**Tasks:**

- [ ] **1.1 Database Setup**
  - [ ] Create migration for new tables (npcs, npc_state, task_executions, office_layout)
  - [ ] Add seed data (2-3 demo NPCs, office layout)
  - [ ] Test migrations in docker-compose environment

- [ ] **1.2 Gateway Service Updates**
  - [ ] Create `services/npc-state.ts` - NPC state management
  - [ ] Create `services/sim-client.ts` - Sim.ai API wrapper
  - [ ] Add WebSocket server setup
  - [ ] Create `/api/npcs` CRUD endpoints
  - [ ] Update `/api/events` to handle NPC state updates

- [ ] **1.3 Environment Setup**
  - [ ] Add Sim.ai API credentials to `.env`
  - [ ] Update docker-compose.yml if needed
  - [ ] Document new environment variables

**Deliverables:**
- Database with new tables
- Gateway API with NPC endpoints
- WebSocket server running
- API documentation

---

### **Phase 2: 3D Office & NPC Rendering** (Week 2)

**Goal**: Create the visual 3D office with animated NPCs

**Tasks:**

- [ ] **2.1 Three.js Setup**
  - [ ] Install dependencies (@react-three/fiber, @react-three/drei, three)
  - [ ] Create `Office3D/Scene.tsx` - Main 3D canvas
  - [ ] Create `Office3D/Office.tsx` - Office environment (floor, walls, desks)
  - [ ] Add lighting and camera controls

- [ ] **2.2 NPC 3D Models**
  - [ ] Source or create simple NPC 3D models (GLB/GLTF)
  - [ ] Create `Office3D/AnimatedNPC.tsx` component
  - [ ] Implement basic animations (idle, walking)
  - [ ] Add name tags above NPCs

- [ ] **2.3 State Management**
  - [ ] Create Zustand store (`useNPCStore.ts`)
  - [ ] Implement NPC state (position, rotation, animation state)
  - [ ] Create selectors for NPC data

- [ ] **2.4 Basic Interactions**
  - [ ] Implement click-to-select NPC
  - [ ] Show NPC info panel on click
  - [ ] Add camera follow mode

**Deliverables:**
- 3D office environment
- NPCs rendering with basic animations
- Clickable NPCs with info display

---

### **Phase 3: Real-time Sync & Animations** (Week 3)

**Goal**: Connect Sim.ai execution to NPC animations

**Tasks:**

- [ ] **3.1 WebSocket Integration**
  - [ ] Create `hooks/useWebSocket.ts`
  - [ ] Connect to Gateway WebSocket on mount
  - [ ] Handle NPC state update events
  - [ ] Update Zustand store from WS events

- [ ] **3.2 Animation System**
  - [ ] Create `services/animation.ts` in Gateway
  - [ ] Map Sim.ai step types to animation states
  - [ ] Implement animation queue (smooth transitions)
  - [ ] Add animation completion callbacks

- [ ] **3.3 Task Execution Flow**
  - [ ] Implement "walk to desk" sequence
  - [ ] Implement "sit down" animation
  - [ ] Implement "typing" loop during task execution
  - [ ] Add "thinking" animation for AI processing steps
  - [ ] Add "celebrating" for task completion
  - [ ] Add "error" animation for failures

- [ ] **3.4 Live Status Updates**
  - [ ] Create expandable status bar above each NPC
  - [ ] Show current task name and progress
  - [ ] Display recent log entries
  - [ ] Add real-time log streaming

**Deliverables:**
- NPCs animate based on Sim.ai task execution
- Live status bars showing task progress
- Smooth animation transitions

---

### **Phase 4: UI Components & Interactions** (Week 4)

**Goal**: Build rich UI for managing NPCs and tasks

**Tasks:**

- [ ] **4.1 NPC Status Bar Component**
  - [ ] Create compact view (name, avatar, progress bar)
  - [ ] Create expanded view (task details, logs, actions)
  - [ ] Add click-to-expand functionality
  - [ ] Style with glass morphism theme

- [ ] **4.2 NPC Terminal View**
  - [ ] Create `NPCTerminal.tsx` component
  - [ ] Show typewriter effect for logs
  - [ ] Display action history
  - [ ] Add terminal header with NPC name/status

- [ ] **4.3 Task Management**
  - [ ] Add "Pause Task" button
  - [ ] Add "Resume Task" button
  - [ ] Add "Cancel Task" button
  - [ ] Implement task reassignment UI

- [ ] **4.4 Sim.ai Builder Integration**
  - [ ] Embed Sim.ai builder in a drawer/modal
  - [ ] Add "Create Agent" floating action button
  - [ ] Handle workflow creation callback
  - [ ] Auto-create NPC when workflow is created

**Deliverables:**
- Interactive NPC status bars
- Terminal view showing real-time logs
- Task control buttons (pause/resume/cancel)
- Integrated Sim.ai builder

---

### **Phase 5: Polish, Testing & Demo** (Week 5)

**Goal**: Refine UX, fix bugs, create demo workflows

**Tasks:**

- [ ] **5.1 Animation Polish**
  - [ ] Smooth camera transitions
  - [ ] Add particle effects (sparkles on celebration)
  - [ ] Add sound effects (typing sounds, notification pings)
  - [ ] Optimize animation performance (< 60fps target)

- [ ] **5.2 Error Handling**
  - [ ] Handle WebSocket disconnections gracefully
  - [ ] Show error states in UI
  - [ ] Add retry logic for failed tasks
  - [ ] Display user-friendly error messages

- [ ] **5.3 Demo Content**
  - [ ] Create 3 demo workflows in Sim.ai:
    - [ ] Email Summarizer (reads inbox, summarizes)
    - [ ] Meeting Scheduler (parses text, creates calendar events)
    - [ ] Research Assistant (searches web, compiles report)
  - [ ] Create corresponding NPCs for each workflow
  - [ ] Add demo office layout with 3 desks

- [ ] **5.4 Testing & Optimization**
  - [ ] Test with 10+ concurrent NPCs
  - [ ] Load test WebSocket server
  - [ ] Optimize 3D rendering (LOD, culling)
  - [ ] Profile and fix memory leaks

- [ ] **5.5 Documentation**
  - [ ] Update README with setup instructions
  - [ ] Create video walkthrough
  - [ ] Document API endpoints
  - [ ] Write troubleshooting guide

**Deliverables:**
- Polished, production-ready MVP
- 3 working demo agents
- Complete documentation
- Demo video

---

## 🔧 Technical Implementation Details

### WebSocket Events

```typescript
// Client → Server
type ClientEvents = {
  'npc:select': { npcId: string }
  'task:pause': { npcId: string, taskId: string }
  'task:resume': { npcId: string, taskId: string }
  'task:cancel': { npcId: string, taskId: string }
}

// Server → Client
type ServerEvents = {
  'npc:update': NPCStateUpdate
  'npc:action': NPCAction
  'task:progress': TaskProgress
  'task:log': TaskLogEntry
  'task:complete': TaskCompletion
}

interface NPCStateUpdate {
  npcId: string
  state: NPCState
  position?: Vector3
  rotation?: Quaternion
  currentTask?: {
    id: string
    title: string
    progress: number
    status: string
  }
}
```

### Animation Mapping

```typescript
// In gateway/src/services/animation.ts
export class AnimationMapper {
  mapStepToAnimation(step: SimAIStep): NPCState {
    const typeMap: Record<string, NPCState> = {
      'ai_generate': NPCState.THINKING,
      'ai_analyze': NPCState.THINKING,
      'write_file': NPCState.TYPING,
      'send_email': NPCState.TYPING,
      'search_web': NPCState.TYPING,
      'read_data': NPCState.THINKING,
      'api_call': NPCState.TYPING,
      'error': NPCState.ERROR,
      'wait': NPCState.IDLE,
    }

    return typeMap[step.type] || NPCState.TYPING
  }

  async animateSequence(npcId: string, sequence: AnimationStep[]) {
    for (const step of sequence) {
      await this.updateNPCState(npcId, step.state)
      await sleep(step.duration)
    }
  }
}
```

### NPC Movement

```typescript
// In frontend/src/components/Office3D/AnimatedNPC.tsx
const AnimatedNPC: React.FC<{npc: NPC}> = ({ npc }) => {
  const ref = useRef<THREE.Group>()

  // Smooth position interpolation
  useFrame(() => {
    if (!ref.current) return

    const targetPos = new THREE.Vector3(...npc.position)
    ref.current.position.lerp(targetPos, 0.1) // Smooth interpolation

    const targetRot = new THREE.Euler(...npc.rotation)
    ref.current.rotation.lerp(targetRot, 0.1)
  })

  return (
    <group ref={ref}>
      <NPCModel state={npc.state} />
      <NPCNameTag name={npc.name} />
      <NPCStatusBar status={npc.currentTask?.status} />
    </group>
  )
}
```

---

## 🎨 UI/UX Design Guidelines

### Visual Theme: Modern Glass Morphism

```scss
:root {
  --primary: #2563eb;         // Bright blue
  --secondary: #7c3aed;       // Purple
  --success: #10b981;         // Green
  --warning: #f59e0b;         // Amber
  --danger: #ef4444;          // Red

  --glass-bg: rgba(255, 255, 255, 0.1);
  --glass-border: rgba(255, 255, 255, 0.2);
  --glass-shadow: 0 8px 32px rgba(31, 38, 135, 0.37);
  --glass-blur: blur(4px);
}
```

### Interaction Patterns

1. **NPC Selection**: Click NPC → Camera zooms to NPC → Status bar expands
2. **Task Triggering**: Click "Run" → NPC walks to desk → Sits → Starts typing
3. **Status Monitoring**: Hover NPC → Show compact status → Click to expand full details
4. **Task Control**: Expanded status bar → Show Pause/Resume/Cancel buttons

---

## 📊 Success Metrics

**Performance:**
- [ ] 60 FPS with 20+ NPCs on screen
- [ ] < 100ms latency for state updates
- [ ] < 500ms for animation transitions

**Functionality:**
- [ ] 95% success rate for workflow executions
- [ ] All NPC states visually distinct
- [ ] Animations match task execution steps

**User Experience:**
- [ ] Intuitive NPC interaction
- [ ] Clear task progress visibility
- [ ] Responsive on 1080p displays

---

## 🚧 Future Enhancements (Post-MVP)

- [ ] **Voice Commands**: "Hey Sarah, summarize my emails"
- [ ] **Multiplayer**: Multiple users in same office
- [ ] **Mobile App**: View office on phone/tablet
- [ ] **AR Mode**: View NPCs in real world via phone camera
- [ ] **Custom Avatars**: Upload or create unique NPC appearances
- [ ] **Office Designer**: Drag-and-drop office layout editor
- [ ] **Performance Dashboard**: Analytics on NPC productivity
- [ ] **Notifications**: Push notifications when tasks complete
- [ ] **Task Scheduling**: Queue tasks for specific times
- [ ] **Team Collaboration**: Assign tasks to multiple NPCs

---

## 🔒 Security Considerations

- [ ] **API Authentication**: JWT tokens for all API endpoints
- [ ] **WebSocket Auth**: Validate tokens on WS connection
- [ ] **Rate Limiting**: Prevent abuse of Sim.ai API
- [ ] **Data Encryption**: Encrypt sensitive NPC data at rest
- [ ] **Audit Logging**: Track all agent executions and user actions
- [ ] **Sim.ai Sandboxing**: Ensure workflows run in isolated environments

---

## 📚 Learning Resources

**Three.js & React:**
- [React Three Fiber Docs](https://docs.pmnd.rs/react-three-fiber)
- [Three.js Journey](https://threejs-journey.com/)
- [Drei Helpers](https://github.com/pmndrs/drei)

**Sim.ai:**
- [Sim.ai Documentation](https://docs.sim.ai)
- Check `esprit/external/sim/README.md`
- Review `esprit/external/sim/packages/db/schema.ts` for data models

**WebSockets:**
- [Socket.io Guide](https://socket.io/docs/v4/)
- [WebSocket Best Practices](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API)

---

## ✅ Next Steps

1. **Review this plan** with the team
2. **Set up development environment** (already done via `./start.sh`)
3. **Create Phase 1 tasks** in your project management tool
4. **Start with database migrations** (Phase 1.1)
5. **Begin coding!** 🚀

---

**Questions or Concerns?**
See `docs/DEVELOPMENT_RULES.md` for guidelines on safe development practices.
