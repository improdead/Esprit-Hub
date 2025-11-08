# 🎮 Game Server Agent Integration

**Guide to integrating AI agents with the Colyseus game server**

This document explains how agents interact with the game server, triggering multiplayer state changes and coordinating gameplay.

---

## 📖 Table of Contents

1. [Overview](#overview)
2. [Agent Events in Server](#agent-events-in-server)
3. [Triggering Agents from Server](#triggering-agents-from-server)
4. [Broadcasting State Changes](#broadcasting-state-changes)
5. [Multiplayer Coordination](#multiplayer-coordination)
6. [Examples](#examples)

---

## Overview

### What Can Server Agents Do?

- **Trigger world events** (boss spawns, weather changes)
- **Manage NPC behavior** (coordinate multiple NPCs)
- **Update game state** (resources, objectives, leaderboards)
- **Spawn items/enemies** (loot drops, encounters)
- **Broadcast messages** (announcements, notifications)
- **Handle time-based events** (day/night cycles, scheduled events)

### Server Architecture

```
┌──────────────────────────┐
│  Colyseus Game Server    │
├──────────────────────────┤
│  - SkyOffice Room        │
│  - Game State (Room)     │
│  - NPC Manager           │
│  - Event Handler         │
└─────────┬────────────────┘
          │
          │ HTTP
          │
┌─────────▼────────────────┐
│  Gateway                 │
├──────────────────────────┤
│  - /api/run/:agent       │
│  - /api/events           │
│  - /api/stream           │
└─────────┬────────────────┘
          │
          │ Webhooks
          │
┌─────────▼────────────────┐
│  Sim.ai                  │
├──────────────────────────┤
│  - Workflows             │
│  - Execution             │
└──────────────────────────┘
```

---

## Agent Events in Server

### Event Types

**Server-Level Events**:
- `server_started` - Server initialization
- `world_event` - World-affecting event
- `spawn_event` - Enemy/item spawn
- `boss_defeated` - Boss defeated
- `server_announcement` - Global message

**Room/Multiplayer Events**:
- `player_join` - Player enters
- `player_leave` - Player exits
- `state_update` - Game state changed
- `npc_spawn` - NPC created
- `resource_change` - Resources updated

### Broadcasting Events

Events are broadcast to all connected clients:

```typescript
// Server triggers agent
await triggerAgent('world-event');

// Agent calls /api/events
{
  "npc": "world-event",
  "type": "done",
  "data": {
    "eventType": "boss_spawn",
    "location": { "x": 100, "y": 200 },
    "bossId": "dragon_001"
  }
}

// Server receives and broadcasts to all clients
room.broadcast('agent_event', data);
```

---

## Triggering Agents from Server

### Basic Server Agent Trigger

**In Colyseus room handler**:

```typescript
import { Room, Client } from 'colyseus';

export class SkyOfficeRoom extends Room {
  async triggerAgent(
    agentId: string,
    payload: any,
    context?: string
  ) {
    try {
      const response = await fetch(`/api/run/${agentId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payload: {
            ...payload,
            serverId: this.roomId,
            timestamp: Date.now(),
            context: context
          }
        })
      });

      if (!response.ok) {
        console.error('Failed to trigger agent:', response.statusText);
        return null;
      }

      return await response.json();
    } catch (error) {
      console.error('Agent trigger error:', error);
      return null;
    }
  }

  async onMessage(client: Client, message: any) {
    if (message.type === 'trigger_agent') {
      // Trigger server-side agent
      await this.triggerAgent(message.agentId, message.payload);
    }
  }
}
```

---

### Example: Boss Spawn Event

**Trigger when world time reaches boss time**:

```typescript
export class SkyOfficeRoom extends Room {
  private worldTime: number = 0;
  private bossSpawnTime: number = 300; // 5 minutes

  onUpdate(deltaTime: number) {
    this.worldTime += deltaTime / 1000;

    // Check if time to spawn boss
    if (this.worldTime >= this.bossSpawnTime && !this.bossActive) {
      this.spawnBoss();
    }
  }

  async spawnBoss() {
    console.log('Triggering boss spawn agent');

    await this.triggerAgent('boss-spawn', {
      difficulty: this.getAverageDifficulty(),
      playerCount: this.clients.length,
      location: 'forest'
    });

    this.bossActive = true;
  }
}
```

---

## Broadcasting State Changes

### Update Game State from Agent

**Listen to agent events and update room state**:

```typescript
export class SkyOfficeRoom extends Room {
  private eventSource: EventSource;

  onInit() {
    this.initAgentListener();
  }

  private initAgentListener() {
    // Subscribe to agent events
    this.eventSource = new EventSource('/api/stream?npc=world-event');

    this.eventSource.addEventListener('done', (event) => {
      const data = JSON.parse(event.data);
      this.handleAgentEvent(data.result);
    });

    this.eventSource.onerror = () => {
      console.error('Agent stream error');
      // Try to reconnect
      setTimeout(() => this.initAgentListener(), 5000);
    };
  }

  private handleAgentEvent(eventData: any) {
    console.log('Agent event received:', eventData);

    switch (eventData.type) {
      case 'boss_spawn':
        this.handleBossSpawn(eventData);
        break;

      case 'item_spawn':
        this.handleItemSpawn(eventData);
        break;

      case 'weather_change':
        this.handleWeatherChange(eventData);
        break;

      case 'announcement':
        this.broadcast('announcement', { text: eventData.message });
        break;
    }
  }

  private handleBossSpawn(data: any) {
    // Create NPC for boss
    const boss = {
      id: data.bossId,
      type: 'boss',
      name: data.bossName,
      health: data.health,
      position: data.location,
      damage: data.damage
    };

    // Add to game state
    this.state.npcs[data.bossId] = boss;

    // Broadcast to all clients
    this.broadcast('boss_spawn', boss);
  }

  private handleItemSpawn(data: any) {
    // Create item in world
    const item = {
      id: data.itemId,
      type: data.itemType,
      position: data.location,
      quantity: data.quantity
    };

    this.state.items[data.itemId] = item;
    this.broadcast('item_spawn', item);
  }

  private handleWeatherChange(data: any) {
    // Update room weather
    this.state.weather = data.weather;

    // Broadcast to all players
    this.broadcast('weather', { weather: data.weather });
  }

  onDispose() {
    if (this.eventSource) {
      this.eventSource.close();
    }
  }
}
```

---

## Multiplayer Coordination

### Coordinating Multiple Players

**Example: Cooperative quest using agents**:

```typescript
export class SkyOfficeRoom extends Room {
  private questState: Map<string, any> = new Map();

  async startCooperativeQuest(
    questId: string,
    players: Client[]
  ) {
    console.log(`Starting quest ${questId} with ${players.length} players`);

    // Trigger quest generation agent with player info
    await this.triggerAgent('quest-generator', {
      questType: 'cooperative',
      playerCount: players.length,
      playerLevels: players.map(p => p.userData.level)
    });

    // Track quest state
    this.questState.set(questId, {
      started: Date.now(),
      players: players.map(p => p.sessionId),
      progress: 0,
      completed: false
    });
  }

  async onPlayerProgress(sessionId: string, progress: any) {
    // Check if quest is complete
    const allPlayers = Array.from(this.questState.values())[0].players;
    const completionCount = allPlayers.filter(
      pid => this.getPlayerProgress(pid) >= 100
    ).length;

    if (completionCount === allPlayers.length) {
      // All players completed - trigger reward
      await this.completeCooperativeQuest();
    }
  }

  private async completeCooperativeQuest() {
    // Trigger reward generation
    await this.triggerAgent('cooperative-reward', {
      playerCount: this.clients.length
    });

    // Broadcast completion to all
    this.broadcast('quest_complete', { bonusReward: true });
  }
}
```

---

### Synchronizing NPC Behavior

**Coordinate NPCs across all clients**:

```typescript
export class SkyOfficeRoom extends Room {
  private npcManager: NPCManager;

  async syncNPCBehavior() {
    // For each NPC, trigger behavior agent
    for (const npc of this.npcManager.getNPCs()) {
      await this.triggerAgent('npc-behavior', {
        npcId: npc.id,
        npcType: npc.type,
        playersNearby: this.getPlayersNear(npc),
        timeOfDay: this.state.timeOfDay
      });
    }
  }

  private async onNPCBehaviorUpdate(npcId: string, behavior: any) {
    // Update NPC in game state
    const npc = this.npcManager.getNPC(npcId);

    if (behavior.move) {
      npc.setTargetPosition(behavior.move.target);
    }

    if (behavior.animation) {
      npc.playAnimation(behavior.animation);
    }

    if (behavior.dialogue) {
      // Broadcast dialogue to nearby clients
      this.broadcast('npc_dialogue', {
        npcId: npc.id,
        text: behavior.dialogue,
        emotion: behavior.emotion
      });
    }

    // Persist NPC state for new clients
    this.state.npcs[npcId] = npc.serialize();
  }
}
```

---

## Examples

### Example 1: Scheduled World Events

**Run agents on schedule from server**:

```typescript
import cron from 'node-cron';

export class SkyOfficeRoom extends Room {
  private scheduler = cron;

  onInit() {
    // Run boss spawn every hour
    this.scheduler.schedule('0 * * * *', async () => {
      await this.triggerAgent('scheduled-boss-spawn', {
        difficulty: 'hard'
      });
    });

    // Run day/night cycle every 10 minutes
    this.scheduler.schedule('*/10 * * * *', async () => {
      await this.triggerAgent('day-night-cycle', {
        currentTime: this.state.timeOfDay
      });
    });

    // Run resource regeneration every 5 minutes
    this.scheduler.schedule('*/5 * * * *', async () => {
      await this.triggerAgent('resource-regen', {
        playerCount: this.clients.length
      });
    });
  }
}
```

---

### Example 2: Dynamic Difficulty Scaling

**Adjust difficulty based on player performance**:

```typescript
export class SkyOfficeRoom extends Room {
  private playerStats = {
    victories: 0,
    defeats: 0
  };

  async onBossDefeated() {
    this.playerStats.victories++;

    // If players are winning too easily, increase difficulty
    const winRate = this.playerStats.victories /
      (this.playerStats.victories + this.playerStats.defeats);

    if (winRate > 0.8) {
      console.log('Players winning too often, increasing difficulty');

      await this.triggerAgent('difficulty-scale', {
        difficulty: 'hard',
        bossType: 'elite',
        playerCount: this.clients.length
      });
    }
  }

  async onBossDefeated() {
    this.playerStats.defeats++;

    // If players are losing too often, decrease difficulty
    const winRate = this.playerStats.victories /
      (this.playerStats.victories + this.playerStats.defeats);

    if (winRate < 0.2) {
      console.log('Players losing too often, decreasing difficulty');

      await this.triggerAgent('difficulty-scale', {
        difficulty: 'easy',
        bossType: 'regular',
        playerCount: this.clients.length
      });
    }
  }
}
```

---

### Example 3: Player Event Triggered Agents

**Trigger agents from player actions**:

```typescript
export class SkyOfficeRoom extends Room {
  onMessage(client: Client, message: any) {
    if (message.type === 'player_action') {
      this.handlePlayerAction(client, message);
    }
  }

  private async handlePlayerAction(client: Client, action: any) {
    switch (action.action) {
      case 'use_spell':
        // Trigger spell effect agent
        await this.triggerAgent('spell-effect', {
          spellId: action.spellId,
          casterLevel: client.userData.level,
          targetPosition: action.target
        });
        break;

      case 'interact_npc':
        // Trigger NPC interaction agent
        await this.triggerAgent('npc-interact', {
          npcId: action.npcId,
          playerId: client.sessionId,
          playerLevel: client.userData.level
        });
        break;

      case 'open_chest':
        // Trigger loot generation agent
        await this.triggerAgent('loot-gen', {
          chestId: action.chestId,
          chestRarity: action.rarity,
          playerLevel: client.userData.level
        });
        break;
    }
  }
}
```

---

## Best Practices

### 1. Handle Agent Responses Gracefully

```typescript
// Always have fallback behavior
const result = await this.triggerAgent('world-event', payload);

if (!result) {
  // Use default/fallback event
  console.warn('Agent failed, using default event');
  this.executeDefaultEvent();
  return;
}

// Proceed with agent result
this.applyAgentEvent(result);
```

---

### 2. Manage SSE Connections Lifecycle

```typescript
onInit() {
  this.initAgentListener();
}

private initAgentListener() {
  this.eventSource = new EventSource('/api/stream?npc=world-event');
  // ... setup
}

onDispose() {
  // Cleanup on room disposal
  if (this.eventSource) {
    this.eventSource.close();
  }
}
```

---

### 3. Log Agent Activity

```typescript
private handleAgentEvent(eventData: any) {
  // Log for debugging
  console.log(`[${new Date().toISOString()}] Agent Event:`, {
    type: eventData.type,
    data: eventData
  });

  // Store event history (optional)
  this.eventHistory.push({
    timestamp: Date.now(),
    event: eventData
  });

  // Process event
  this.applyEvent(eventData);
}
```

---

### 4. Rate Limit Agent Triggers

```typescript
private lastAgentTrigger: Map<string, number> = new Map();
private triggerCooldown: number = 1000; // 1 second

async triggerAgent(
  agentId: string,
  payload: any
): Promise<any> {
  const lastTime = this.lastAgentTrigger.get(agentId) || 0;
  const now = Date.now();

  if (now - lastTime < this.triggerCooldown) {
    console.warn(`Agent ${agentId} still cooling down`);
    return null;
  }

  this.lastAgentTrigger.set(agentId, now);
  return await this._triggerAgent(agentId, payload);
}
```

---

## Configuration

### Environment Variables

```bash
# .env
GATEWAY_BASE=http://localhost:8080
AGENT_TIMEOUT=30000  # 30 seconds
AGENT_COOLDOWN=1000  # 1 second between same agent
```

### Register Agents

```typescript
const SERVER_AGENTS = {
  WORLD_EVENT: 'world-event',
  BOSS_SPAWN: 'boss-spawn',
  REWARD_GEN: 'reward-gen',
  NPC_BEHAVIOR: 'npc-behavior',
  LOOT_GEN: 'loot-gen'
};

// Use: triggerAgent(SERVER_AGENTS.BOSS_SPAWN, payload)
```

---

## Debugging

### Check Agent Execution

```bash
# View Gateway logs
docker compose logs -f gateway

# View Sim.ai logs
docker compose logs -f sim

# Check server logs
npm run dev -- --log-level debug
```

### Test Agent from Server

```typescript
// Add debugging route
if (process.env.DEBUG) {
  this.onMessage('test_agent', async (client, message) => {
    const result = await this.triggerAgent(
      message.agentId,
      message.payload
    );
    client.send('test_result', result);
  });
}
```

---

## Next Steps

- **[Client Agent Integration](../client/docs/AGENT_INTEGRATION.md)** - Client-side integration
- **[Gateway API](../esprit/docs/agents/GATEWAY.md)** - API reference
- **[Deployment Guide](../esprit/docs/agents/DEPLOYMENT.md)** - Deploy to production

---

**Last Updated**: 2025-11-08
**Server Integration Version**: 1.0.0
