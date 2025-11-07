# AI NPC Implementation Plan
**Step-by-Step Guide to Building Living NPCs**

**Last Updated**: 2025-11-07
**Timeline**: 6-8 Weeks to Production-Ready MVP

---

## 🎯 Executive Summary

This implementation plan provides a detailed roadmap for building AI-powered NPCs (Non-Player Characters) that visually perform tasks in a 3D virtual office environment. NPCs will walk, sit, type, think, and show real-time work progress synchronized with Sim.ai workflow execution.

**Key Deliverable**: A working virtual office where users can:
- See NPCs performing AI-automated tasks visually
- Click NPCs to view detailed work progress
- Create new AI agents via Sim.ai builder
- Monitor and control running tasks

---

## 📋 Prerequisites

### Technical Requirements
- Docker Desktop installed and running
- Node.js >= 18.0.0
- pnpm >= 8.0.0 (recommended) or npm >= 9.0.0
- Git
- 8GB+ RAM (16GB recommended)
- Modern GPU for Three.js rendering

### Knowledge Requirements
- React and TypeScript
- Three.js basics (or willingness to learn)
- REST API and WebSocket concepts
- Docker and docker-compose
- Basic PostgreSQL

### Existing Codebase
This plan assumes you have:
- ✅ SkyOffice frontend (React)
- ✅ Gateway backend (Node.js)
- ✅ Sim.ai integrated and running
- ✅ PostgreSQL + Redis infrastructure
- ✅ Nginx reverse proxy configured

---

## 🗓️ Implementation Timeline

| Phase | Duration | Deliverable |
|-------|----------|-------------|
| Phase 1: Database & State Management | Week 1-2 | Database schema, NPC CRUD API |
| Phase 2: 3D Office Environment | Week 2-3 | Basic 3D office with static NPCs |
| Phase 3: NPC Animation System | Week 3-4 | Animated NPCs with state machine |
| Phase 4: Sim.ai Integration | Week 4-5 | NPCs sync with Sim.ai execution |
| Phase 5: UI Components | Week 5-6 | Status bars, terminals, controls |
| Phase 6: Polish & Testing | Week 6-8 | Performance, bugs, demo agents |

---

## Phase 1: Database & State Management (Weeks 1-2)

### Goal
Create the data layer for NPC management and state tracking.

### Tasks

#### 1.1 Database Schema Design

**File**: `esprit/apps/gateway/db/migrations/001_create_npc_tables.sql`

```sql
-- NPCs table (AI agents configuration)
CREATE TABLE npcs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('ai_agent', 'human')),

  -- Sim.ai integration
  sim_workflow_id TEXT,
  sim_webhook_url TEXT,

  -- Visual configuration
  avatar_model VARCHAR(255) DEFAULT 'default',
  avatar_texture VARCHAR(255),
  avatar_accessories JSONB DEFAULT '[]',

  -- Office position
  workstation_id VARCHAR(255),
  default_position JSONB, -- {x, y, z}

  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by UUID
);

-- NPC state (real-time state - one row per NPC)
CREATE TABLE npc_state (
  npc_id UUID PRIMARY KEY REFERENCES npcs(id) ON DELETE CASCADE,

  -- Current visual state
  state VARCHAR(50) NOT NULL DEFAULT 'idle',
  position JSONB, -- {x, y, z}
  rotation JSONB, -- {x, y, z}
  mood VARCHAR(50) DEFAULT 'neutral',

  -- Current task
  current_task_id UUID,
  task_title TEXT,
  task_progress INTEGER DEFAULT 0,
  task_status VARCHAR(50),
  task_started_at TIMESTAMP,

  -- Logs (recent activity)
  recent_logs JSONB DEFAULT '[]',

  -- Timestamps
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Task executions (history)
CREATE TABLE task_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  npc_id UUID REFERENCES npcs(id) ON DELETE CASCADE,

  -- Task info
  task_name VARCHAR(255),
  task_description TEXT,
  trigger_type VARCHAR(50), -- manual, webhook, schedule

  -- Sim.ai linkage
  sim_execution_id TEXT,
  sim_workflow_id TEXT,

  -- Status
  status VARCHAR(50) NOT NULL,
  progress INTEGER DEFAULT 0,

  -- Timing
  started_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  duration_ms INTEGER,

  -- Results
  result JSONB,
  error_message TEXT,
  logs JSONB DEFAULT '[]'
);

-- Office layout
CREATE TABLE office_layout (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  object_type VARCHAR(50) NOT NULL,
  name VARCHAR(255),
  position JSONB NOT NULL,
  rotation JSONB,
  metadata JSONB,
  occupied_by UUID REFERENCES npcs(id) ON DELETE SET NULL
);

-- Indexes
CREATE INDEX idx_npc_state_npc_id ON npc_state(npc_id);
CREATE INDEX idx_task_executions_npc_id ON task_executions(npc_id);
CREATE INDEX idx_task_executions_status ON task_executions(status);
CREATE INDEX idx_task_executions_started_at ON task_executions(started_at DESC);
```

**Action Items**:
- [ ] Create migration file
- [ ] Test migration locally
- [ ] Add rollback migration
- [ ] Update database docs

#### 1.2 Database Migration Script

**File**: `esprit/apps/gateway/db/migrate.js`

```javascript
import { readFileSync } from 'fs';
import { join } from 'path';
import pkg from 'pg';
const { Client } = pkg;

const client = new Client({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/simstudio'
});

async function migrate() {
  await client.connect();

  console.log('Running migrations...');

  const migration = readFileSync(
    join(process.cwd(), 'db/migrations/001_create_npc_tables.sql'),
    'utf-8'
  );

  await client.query(migration);

  console.log('✅ Migrations complete');
  await client.end();
}

migrate().catch(console.error);
```

**Action Items**:
- [ ] Create migrate.js script
- [ ] Add migration npm script: `"db:migrate": "node db/migrate.js"`
- [ ] Test migration execution
- [ ] Add to docker-compose as init script

#### 1.3 NPC Data Access Layer

**File**: `esprit/apps/gateway/src/db/npc-repository.ts`

```typescript
import { Pool } from 'pg';

export interface NPC {
  id: string;
  name: string;
  type: 'ai_agent' | 'human';
  simWorkflowId?: string;
  simWebhookUrl?: string;
  avatarModel: string;
  avatarTexture?: string;
  avatarAccessories: string[];
  workstationId?: string;
  defaultPosition?: { x: number; y: number; z: number };
  createdAt: Date;
  updatedAt: Date;
}

export interface NPCState {
  npcId: string;
  state: string;
  position?: { x: number; y: number; z: number };
  rotation?: { x: number; y: number; z: number };
  mood: string;
  currentTaskId?: string;
  taskTitle?: string;
  taskProgress: number;
  taskStatus?: string;
  taskStartedAt?: Date;
  recentLogs: any[];
  updatedAt: Date;
}

export class NPCRepository {
  constructor(private pool: Pool) {}

  async createNPC(data: Partial<NPC>): Promise<NPC> {
    const result = await this.pool.query(
      `INSERT INTO npcs (name, type, sim_workflow_id, sim_webhook_url, avatar_model, workstation_id, default_position)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        data.name,
        data.type,
        data.simWorkflowId,
        data.simWebhookUrl,
        data.avatarModel || 'default',
        data.workstationId,
        data.defaultPosition ? JSON.stringify(data.defaultPosition) : null
      ]
    );

    // Create initial state
    await this.pool.query(
      `INSERT INTO npc_state (npc_id, state, position)
       VALUES ($1, 'idle', $2)`,
      [result.rows[0].id, JSON.stringify(data.defaultPosition || { x: 0, y: 0, z: 0 })]
    );

    return this.mapToNPC(result.rows[0]);
  }

  async getNPC(id: string): Promise<NPC | null> {
    const result = await this.pool.query('SELECT * FROM npcs WHERE id = $1', [id]);
    return result.rows[0] ? this.mapToNPC(result.rows[0]) : null;
  }

  async getAllNPCs(): Promise<NPC[]> {
    const result = await this.pool.query('SELECT * FROM npcs ORDER BY created_at DESC');
    return result.rows.map(this.mapToNPC);
  }

  async updateNPCState(npcId: string, state: Partial<NPCState>): Promise<void> {
    const fields = [];
    const values = [];
    let paramCount = 1;

    if (state.state !== undefined) {
      fields.push(`state = $${paramCount++}`);
      values.push(state.state);
    }
    if (state.position !== undefined) {
      fields.push(`position = $${paramCount++}`);
      values.push(JSON.stringify(state.position));
    }
    if (state.currentTaskId !== undefined) {
      fields.push(`current_task_id = $${paramCount++}`);
      values.push(state.currentTaskId);
    }
    if (state.taskProgress !== undefined) {
      fields.push(`task_progress = $${paramCount++}`);
      values.push(state.taskProgress);
    }

    fields.push(`updated_at = NOW()`);
    values.push(npcId);

    await this.pool.query(
      `UPDATE npc_state SET ${fields.join(', ')} WHERE npc_id = $${paramCount}`,
      values
    );
  }

  async getNPCState(npcId: string): Promise<NPCState | null> {
    const result = await this.pool.query('SELECT * FROM npc_state WHERE npc_id = $1', [npcId]);
    return result.rows[0] ? this.mapToNPCState(result.rows[0]) : null;
  }

  private mapToNPC(row: any): NPC {
    return {
      id: row.id,
      name: row.name,
      type: row.type,
      simWorkflowId: row.sim_workflow_id,
      simWebhookUrl: row.sim_webhook_url,
      avatarModel: row.avatar_model,
      avatarTexture: row.avatar_texture,
      avatarAccessories: row.avatar_accessories || [],
      workstationId: row.workstation_id,
      defaultPosition: row.default_position,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  private mapToNPCState(row: any): NPCState {
    return {
      npcId: row.npc_id,
      state: row.state,
      position: row.position,
      rotation: row.rotation,
      mood: row.mood,
      currentTaskId: row.current_task_id,
      taskTitle: row.task_title,
      taskProgress: row.task_progress,
      taskStatus: row.task_status,
      taskStartedAt: row.task_started_at,
      recentLogs: row.recent_logs || [],
      updatedAt: row.updated_at
    };
  }
}
```

**Action Items**:
- [ ] Create npc-repository.ts
- [ ] Write unit tests
- [ ] Test database operations
- [ ] Add error handling

#### 1.4 REST API Endpoints

**File**: `esprit/apps/gateway/src/routes/npcs.ts`

```typescript
import { FastifyInstance } from 'fastify';
import { NPCRepository } from '../db/npc-repository.js';

export async function npcRoutes(app: FastifyInstance) {
  const npcRepo = new NPCRepository(app.pg.pool);

  // List all NPCs
  app.get('/npcs', async (request, reply) => {
    const npcs = await npcRepo.getAllNPCs();

    // Include current state for each NPC
    const npcsWithState = await Promise.all(
      npcs.map(async (npc) => {
        const state = await npcRepo.getNPCState(npc.id);
        return { ...npc, currentState: state };
      })
    );

    return npcsWithState;
  });

  // Get single NPC
  app.get('/npcs/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const npc = await npcRepo.getNPC(id);

    if (!npc) {
      return reply.code(404).send({ error: 'NPC not found' });
    }

    const state = await npcRepo.getNPCState(id);
    return { ...npc, currentState: state };
  });

  // Create NPC
  app.post('/npcs', async (request, reply) => {
    const data = request.body as any;
    const npc = await npcRepo.createNPC(data);
    return reply.code(201).send(npc);
  });

  // Update NPC state
  app.patch('/npcs/:id/state', async (request, reply) => {
    const { id } = request.params as { id: string };
    const state = request.body as any;

    await npcRepo.updateNPCState(id, state);

    // Broadcast state change via WebSocket
    app.websocketServer.broadcast({
      type: 'npc:state-update',
      npcId: id,
      state
    });

    return { success: true };
  });

  // Delete NPC
  app.delete('/npcs/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    await npcRepo.deleteNPC(id);
    return { success: true };
  });
}
```

**Action Items**:
- [ ] Create npcs.ts routes
- [ ] Register routes in main app
- [ ] Test with Postman/curl
- [ ] Add request validation
- [ ] Add authentication middleware

### Phase 1 Deliverables

- [x] Database schema designed and tested
- [x] Migration scripts created
- [x] Data access layer implemented
- [x] REST API endpoints working
- [ ] API documentation written
- [ ] Unit tests passing

---

## Phase 2: 3D Office Environment (Weeks 2-3)

### Goal
Create a basic 3D office scene with clickable NPCs.

### Tasks

#### 2.1 Install Three.js Dependencies

```bash
cd esprit/apps/skyoffice
pnpm add three @react-three/fiber @react-three/drei
pnpm add -D @types/three
```

#### 2.2 Create 3D Office Scene

**File**: `esprit/apps/skyoffice/src/components/Office3D/Scene.tsx`

```typescript
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Sky, Grid } from '@react-three/drei';
import { Office } from './Office';
import { NPCManager } from './NPCManager';

export function Scene() {
  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <Canvas camera={{ position: [10, 10, 10], fov: 50 }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1} />

        <Sky sunPosition={[100, 20, 100]} />
        <Grid args={[20, 20]} />

        <Office />
        <NPCManager />

        <OrbitControls />
      </Canvas>
    </div>
  );
}
```

#### 2.3 Create Office Layout

**File**: `esprit/apps/skyoffice/src/components/Office3D/Office.tsx`

```typescript
import { Box } from '@react-three/drei';

export function Office() {
  return (
    <group>
      {/* Floor */}
      <Box args={[20, 0.1, 20]} position={[0, -0.05, 0]}>
        <meshStandardMaterial color="#e0e0e0" />
      </Box>

      {/* Desks */}
      <Desk position={[2, 0.4, 0]} />
      <Desk position={[-2, 0.4, 0]} />
      <Desk position={[2, 0.4, -4]} />

      {/* Walls */}
      <Box args={[0.2, 3, 20]} position={[-10, 1.5, 0]}>
        <meshStandardMaterial color="#ffffff" />
      </Box>
      <Box args={[20, 3, 0.2]} position={[0, 1.5, -10]}>
        <meshStandardMaterial color="#ffffff" />
      </Box>
    </group>
  );
}

function Desk({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Desk surface */}
      <Box args={[1.2, 0.05, 0.8]}>
        <meshStandardMaterial color="#8B4513" />
      </Box>

      {/* Desk legs */}
      <Box args={[0.05, 0.8, 0.05]} position={[-0.5, -0.4, -0.35]}>
        <meshStandardMaterial color="#654321" />
      </Box>
      <Box args={[0.05, 0.8, 0.05]} position={[0.5, -0.4, -0.35]}>
        <meshStandardMaterial color="#654321" />
      </Box>
    </group>
  );
}
```

#### 2.4 Create Basic NPC Model

**File**: `esprit/apps/skyoffice/src/components/Office3D/NPC.tsx`

```typescript
import { useRef } from 'react';
import { Box, Sphere } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface NPCProps {
  position: [number, number, number];
  name: string;
  state: string;
  onClick?: () => void;
}

export function NPC({ position, name, state, onClick }: NPCProps) {
  const groupRef = useRef<THREE.Group>(null);

  // Idle animation
  useFrame(({ clock }) => {
    if (groupRef.current && state === 'idle') {
      groupRef.current.position.y = position[1] + Math.sin(clock.elapsedTime * 2) * 0.02;
    }
  });

  return (
    <group ref={groupRef} position={position} onClick={onClick}>
      {/* Head */}
      <Sphere args={[0.2, 16, 16]} position={[0, 1.6, 0]}>
        <meshStandardMaterial color="#ffdbac" />
      </Sphere>

      {/* Body */}
      <Box args={[0.4, 0.6, 0.3]} position={[0, 1.1, 0]}>
        <meshStandardMaterial color="#4a90e2" />
      </Box>

      {/* Arms */}
      <Box args={[0.1, 0.5, 0.1]} position={[-0.3, 1.1, 0]}>
        <meshStandardMaterial color="#ffdbac" />
      </Box>
      <Box args={[0.1, 0.5, 0.1]} position={[0.3, 1.1, 0]}>
        <meshStandardMaterial color="#ffdbac" />
      </Box>

      {/* Legs */}
      <Box args={[0.15, 0.6, 0.15]} position={[-0.1, 0.5, 0]}>
        <meshStandardMaterial color="#2c3e50" />
      </Box>
      <Box args={[0.15, 0.6, 0.15]} position={[0.1, 0.5, 0]}>
        <meshStandardMaterial color="#2c3e50" />
      </Box>

      {/* Name tag */}
      <Text
        position={[0, 2, 0]}
        fontSize={0.2}
        color="black"
        anchorX="center"
        anchorY="middle"
      >
        {name}
      </Text>
    </group>
  );
}
```

**Action Items**:
- [ ] Install Three.js dependencies
- [ ] Create Scene component
- [ ] Create Office component
- [ ] Create basic NPC model
- [ ] Test 3D rendering
- [ ] Add camera controls
- [ ] Optimize performance

### Phase 2 Deliverables

- [ ] 3D office scene rendering
- [ ] Multiple NPCs visible
- [ ] Camera controls working
- [ ] NPCs are clickable
- [ ] Performance > 30 FPS

---

## Phase 3: NPC Animation System (Weeks 3-4)

### Goal
Implement state-based animations for NPCs.

### Tasks

#### 3.1 NPC State Machine

**File**: `esprit/apps/skyoffice/src/components/Office3D/animations.ts`

```typescript
export enum NPCState {
  IDLE = 'idle',
  WALKING = 'walking',
  SITTING = 'sitting',
  TYPING = 'typing',
  THINKING = 'thinking',
  CELEBRATING = 'celebrating',
  ERROR = 'error'
}

export interface Animation {
  duration: number;
  loop: boolean;
  keyframes: Keyframe[];
}

export interface Keyframe {
  progress: number; // 0-1
  transform: {
    position?: [number, number, number];
    rotation?: [number, number, number];
    scale?: [number, number, number];
  };
}

export const animations: Record<NPCState, Animation> = {
  [NPCState.IDLE]: {
    duration: 2000,
    loop: true,
    keyframes: [
      { progress: 0, transform: { position: [0, 0, 0] } },
      { progress: 0.5, transform: { position: [0, 0.05, 0] } },
      { progress: 1, transform: { position: [0, 0, 0] } }
    ]
  },
  [NPCState.WALKING]: {
    duration: 1000,
    loop: true,
    keyframes: [
      { progress: 0, transform: { rotation: [0, 0, 0.05] } },
      { progress: 0.5, transform: { rotation: [0, 0, -0.05] } },
      { progress: 1, transform: { rotation: [0, 0, 0.05] } }
    ]
  },
  [NPCState.TYPING]: {
    duration: 500,
    loop: true,
    keyframes: [
      { progress: 0, transform: { position: [0, 0, 0] } },
      { progress: 0.3, transform: { position: [0, -0.02, 0] } },
      { progress: 1, transform: { position: [0, 0, 0] } }
    ]
  },
  [NPCState.THINKING]: {
    duration: 3000,
    loop: true,
    keyframes: [
      { progress: 0, transform: { rotation: [0.1, 0, 0] } },
      { progress: 0.5, transform: { rotation: [-0.1, 0, 0] } },
      { progress: 1, transform: { rotation: [0.1, 0, 0] } }
    ]
  },
  [NPCState.CELEBRATING]: {
    duration: 1500,
    loop: false,
    keyframes: [
      { progress: 0, transform: { position: [0, 0, 0], scale: [1, 1, 1] } },
      { progress: 0.3, transform: { position: [0, 0.5, 0], scale: [1.1, 0.9, 1.1] } },
      { progress: 0.6, transform: { position: [0, 0.2, 0], scale: [0.9, 1.1, 0.9] } },
      { progress: 1, transform: { position: [0, 0, 0], scale: [1, 1, 1] } }
    ]
  },
  [NPCState.SITTING]: {
    duration: 500,
    loop: false,
    keyframes: [
      { progress: 0, transform: { position: [0, 1, 0] } },
      { progress: 1, transform: { position: [0, 0.6, 0] } }
    ]
  },
  [NPCState.ERROR]: {
    duration: 1000,
    loop: true,
    keyframes: [
      { progress: 0, transform: { rotation: [0, 0, 0] } },
      { progress: 0.25, transform: { rotation: [0, 0, -0.2] } },
      { progress: 0.75, transform: { rotation: [0, 0, 0.2] } },
      { progress: 1, transform: { rotation: [0, 0, 0] } }
    ]
  }
};
```

#### 3.2 Animated NPC Component

**File**: `esprit/apps/skyoffice/src/components/Office3D/AnimatedNPC.tsx`

```typescript
import { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { NPC } from './NPC';
import { NPCState, animations } from './animations';

interface AnimatedNPCProps {
  id: string;
  name: string;
  position: [number, number, number];
  state: NPCState;
  onClick?: () => void;
}

export function AnimatedNPC({ id, name, position, state, onClick }: AnimatedNPCProps) {
  const groupRef = useRef<THREE.Group>(null);
  const animationState = useRef({
    currentState: state,
    startTime: Date.now(),
    loop: 0
  });

  useEffect(() => {
    animationState.current = {
      currentState: state,
      startTime: Date.now(),
      loop: 0
    };
  }, [state]);

  useFrame(() => {
    if (!groupRef.current) return;

    const animation = animations[animationState.current.currentState];
    const elapsed = Date.now() - animationState.current.startTime;
    const progress = (elapsed % animation.duration) / animation.duration;

    // Find current keyframe
    let currentKeyframe = animation.keyframes[0];
    let nextKeyframe = animation.keyframes[1] || currentKeyframe;

    for (let i = 0; i < animation.keyframes.length - 1; i++) {
      if (progress >= animation.keyframes[i].progress &&
          progress < animation.keyframes[i + 1].progress) {
        currentKeyframe = animation.keyframes[i];
        nextKeyframe = animation.keyframes[i + 1];
        break;
      }
    }

    // Interpolate between keyframes
    const localProgress = (progress - currentKeyframe.progress) /
                         (nextKeyframe.progress - currentKeyframe.progress);

    if (currentKeyframe.transform.position && nextKeyframe.transform.position) {
      const pos = new THREE.Vector3().lerpVectors(
        new THREE.Vector3(...currentKeyframe.transform.position),
        new THREE.Vector3(...nextKeyframe.transform.position),
        localProgress
      );
      groupRef.current.position.copy(pos.add(new THREE.Vector3(...position)));
    }

    if (currentKeyframe.transform.rotation && nextKeyframe.transform.rotation) {
      const rot = new THREE.Euler().setFromVector3(
        new THREE.Vector3().lerpVectors(
          new THREE.Vector3(...currentKeyframe.transform.rotation),
          new THREE.Vector3(...nextKeyframe.transform.rotation),
          localProgress
        )
      );
      groupRef.current.rotation.copy(rot);
    }
  });

  return (
    <group ref={groupRef}>
      <NPC name={name} position={[0, 0, 0]} state={state} onClick={onClick} />
    </group>
  );
}
```

**Action Items**:
- [ ] Create animation definitions
- [ ] Implement animation interpolation
- [ ] Create AnimatedNPC component
- [ ] Test all animation states
- [ ] Optimize animation loop
- [ ] Add animation blending

### Phase 3 Deliverables

- [ ] NPC state machine implemented
- [ ] All animation states working
- [ ] Smooth transitions between states
- [ ] Performance maintained
- [ ] Animation system documented

---

## Phase 4: Sim.ai Integration (Weeks 4-5)

### Goal
Sync NPC animations with Sim.ai workflow execution.

### Tasks

#### 4.1 Sim.ai Event Handler

**File**: `esprit/apps/gateway/src/services/sim-event-handler.ts`

```typescript
import { NPCRepository } from '../db/npc-repository.js';
import { NPCState } from '../types/npc.js';

interface SimAIEvent {
  type: 'workflow.started' | 'workflow.step' | 'workflow.completed' | 'workflow.failed';
  workflowId: string;
  executionId: string;
  data: any;
}

export class SimEventHandler {
  constructor(
    private npcRepo: NPCRepository,
    private websocketServer: any
  ) {}

  async handleEvent(event: SimAIEvent) {
    // Find NPC by workflow ID
    const npc = await this.npcRepo.findByWorkflowId(event.workflowId);
    if (!npc) {
      console.warn(`No NPC found for workflow ${event.workflowId}`);
      return;
    }

    switch (event.type) {
      case 'workflow.started':
        await this.handleWorkflowStarted(npc.id, event);
        break;
      case 'workflow.step':
        await this.handleWorkflowStep(npc.id, event);
        break;
      case 'workflow.completed':
        await this.handleWorkflowCompleted(npc.id, event);
        break;
      case 'workflow.failed':
        await this.handleWorkflowFailed(npc.id, event);
        break;
    }
  }

  private async handleWorkflowStarted(npcId: string, event: SimAIEvent) {
    // NPC walks to desk
    await this.updateNPCState(npcId, {
      state: NPCState.WALKING,
      taskTitle: event.data.workflowName,
      taskStatus: 'running',
      taskStartedAt: new Date()
    });

    // After 2 seconds, sit down and start typing
    setTimeout(async () => {
      await this.updateNPCState(npcId, {
        state: NPCState.SITTING
      });

      setTimeout(async () => {
        await this.updateNPCState(npcId, {
          state: NPCState.TYPING
        });
      }, 500);
    }, 2000);
  }

  private async handleWorkflowStep(npcId: string, event: SimAIEvent) {
    const stepType = event.data.stepType;
    const state = this.mapStepTypeToAnimation(stepType);

    await this.updateNPCState(npcId, {
      state,
      taskProgress: event.data.progress || 0
    });

    // Add log entry
    const currentState = await this.npcRepo.getNPCState(npcId);
    const logs = currentState?.recentLogs || [];
    logs.push({
      timestamp: new Date(),
      message: event.data.stepName,
      type: 'info'
    });

    await this.npcRepo.updateNPCState(npcId, {
      recentLogs: logs.slice(-50) // Keep last 50 logs
    });
  }

  private async handleWorkflowCompleted(npcId: string, event: SimAIEvent) {
    await this.updateNPCState(npcId, {
      state: NPCState.CELEBRATING,
      taskProgress: 100,
      taskStatus: 'completed'
    });

    // Return to idle after celebration
    setTimeout(async () => {
      await this.updateNPCState(npcId, {
        state: NPCState.IDLE,
        currentTaskId: null,
        taskTitle: null,
        taskProgress: 0
      });
    }, 2000);
  }

  private async handleWorkflowFailed(npcId: string, event: SimAIEvent) {
    await this.updateNPCState(npcId, {
      state: NPCState.ERROR,
      taskStatus: 'failed'
    });
  }

  private mapStepTypeToAnimation(stepType: string): NPCState {
    const mapping: Record<string, NPCState> = {
      'ai_generate': NPCState.THINKING,
      'ai_analyze': NPCState.THINKING,
      'write_file': NPCState.TYPING,
      'api_call': NPCState.TYPING,
      'search': NPCState.TYPING,
      'wait': NPCState.IDLE
    };

    return mapping[stepType] || NPCState.TYPING;
  }

  private async updateNPCState(npcId: string, state: Partial<any>) {
    await this.npcRepo.updateNPCState(npcId, state);

    // Broadcast via WebSocket
    this.websocketServer.broadcast({
      type: 'npc:state-update',
      npcId,
      state
    });
  }
}
```

**Action Items**:
- [ ] Create SimEventHandler class
- [ ] Add webhook endpoint for Sim.ai events
- [ ] Map workflow steps to animations
- [ ] Test with real Sim.ai workflows
- [ ] Add error handling
- [ ] Add retry logic

### Phase 4 Deliverables

- [ ] Sim.ai events trigger NPC animations
- [ ] Step types correctly mapped
- [ ] WebSocket broadcasts working
- [ ] End-to-end test passing
- [ ] Event logging implemented

---

## Phase 5: UI Components (Weeks 5-6)

### Goal
Build status bars, terminals, and control panels.

### Tasks

#### 5.1 NPC Status Bar

**File**: `esprit/apps/skyoffice/src/components/UI/NPCStatusBar.tsx`

```typescript
import { useState } from 'react';
import { NPC, NPCState } from '../../types/npc';

interface NPCStatusBarProps {
  npc: NPC;
}

export function NPCStatusBar({ npc }: NPCStatusBarProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={`npc-status-bar ${expanded ? 'expanded' : 'compact'}`}>
      <div
        className="status-pill"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="avatar">
          {npc.name.charAt(0)}
        </div>
        <span className="name">{npc.name}</span>

        {npc.currentState?.taskProgress !== undefined && (
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${npc.currentState.taskProgress}%` }}
            />
          </div>
        )}

        <StatusIcon state={npc.currentState?.state} />
      </div>

      {expanded && (
        <div className="status-details">
          <h3>{npc.currentState?.taskTitle || 'Idle'}</h3>

          <div className="task-info">
            <span>Status: {npc.currentState?.taskStatus}</span>
            <span>Progress: {npc.currentState?.taskProgress}%</span>
          </div>

          <div className="logs">
            {npc.currentState?.recentLogs.map((log, i) => (
              <div key={i} className="log-entry">
                <span className="timestamp">
                  {new Date(log.timestamp).toLocaleTimeString()}
                </span>
                <span className="message">{log.message}</span>
              </div>
            ))}
          </div>

          <div className="actions">
            <button onClick={() => handlePause(npc.id)}>Pause</button>
            <button onClick={() => handleStop(npc.id)}>Stop</button>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusIcon({ state }: { state?: string }) {
  const icons = {
    idle: '🟢',
    walking: '🚶',
    typing: '⌨️',
    thinking: '🤔',
    celebrating: '🎉',
    error: '❌'
  };

  return <span className="status-icon">{icons[state as keyof typeof icons] || '⚪'}</span>;
}
```

**Action Items**:
- [ ] Create NPCStatusBar component
- [ ] Add expand/collapse functionality
- [ ] Style with CSS
- [ ] Add pause/stop controls
- [ ] Test responsiveness

### Phase 5 Deliverables

- [ ] Status bar component complete
- [ ] Terminal view working
- [ ] Control buttons functional
- [ ] UI is responsive
- [ ] Styled and polished

---

## Phase 6: Polish & Testing (Weeks 6-8)

### Goal
Optimize performance, fix bugs, create demo content.

### Tasks

- [ ] **Performance Optimization**
  - [ ] Profile 3D rendering
  - [ ] Implement LOD for NPCs
  - [ ] Optimize WebSocket messages
  - [ ] Add lazy loading

- [ ] **Bug Fixes**
  - [ ] Test all user flows
  - [ ] Fix animation glitches
  - [ ] Handle edge cases
  - [ ] Add error boundaries

- [ ] **Demo Content**
  - [ ] Create 3 demo workflows
  - [ ] Set up 3 demo NPCs
  - [ ] Write demo script
  - [ ] Record demo video

- [ ] **Documentation**
  - [ ] Update README
  - [ ] API documentation
  - [ ] User guide
  - [ ] Troubleshooting guide

### Phase 6 Deliverables

- [ ] Performance goals met (60 FPS)
- [ ] No critical bugs
- [ ] 3 working demo agents
- [ ] Complete documentation
- [ ] Demo video published

---

## 🎯 Success Criteria

### Technical Metrics
- [ ] 60 FPS with 10+ NPCs
- [ ] < 100ms WebSocket latency
- [ ] < 500ms animation transitions
- [ ] 95%+ test coverage

### User Experience
- [ ] NPCs feel "alive"
- [ ] Tasks visually obvious
- [ ] Easy to create new agents
- [ ] Intuitive controls

### Business Goals
- [ ] Working MVP in 8 weeks
- [ ] 3 demo agents running
- [ ] Positive user feedback
- [ ] Ready for beta testing

---

## 🚧 Risk Mitigation

### Technical Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Three.js performance | High | Use LOD, frustum culling, lazy loading |
| WebSocket reliability | Medium | Add reconnection logic, offline mode |
| Sim.ai API changes | Medium | Version API, add adapter layer |
| Database bottlenecks | Low | Add indexes, use Redis cache |

### Schedule Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Underestimated complexity | High | Start with simple models, iterate |
| Dependency issues | Medium | Lock versions, test early |
| Team availability | Low | Clear documentation, async work |

---

## 📚 Resources

### Learning Materials
- [Three.js Documentation](https://threejs.org/docs/)
- [React Three Fiber](https://docs.pmnd.rs/react-three-fiber)
- [Sim.ai API Docs](https://docs.sim.ai)
- [WebSocket Best Practices](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API)

### Tools
- [Three.js Inspector](https://chrome.google.com/webstore/detail/threejs-inspector)
- [React DevTools](https://react.dev/learn/react-developer-tools)
- [Postman](https://www.postman.com/) for API testing
- [Blender](https://www.blender.org/) for 3D models (optional)

---

## 🔄 Next Steps

1. **Week 1**: Start Phase 1 - Create database schema
2. **Daily Standups**: Track progress, blockers
3. **Weekly Demos**: Show progress to stakeholders
4. **Code Reviews**: Maintain quality standards
5. **User Testing**: Get feedback early and often

---

**Ready to build living NPCs? Let's make AI feel alive! 🚀**
