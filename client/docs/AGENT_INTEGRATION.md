# 🎮 Game Client Agent Integration

**Guide to integrating AI agents with the Phaser game client**

This document explains how agents interact with the 2D game client, triggering gameplay changes and receiving real-time updates.

---

## 📖 Table of Contents

1. [Overview](#overview)
2. [Agent Events in Game](#agent-events-in-game)
3. [Triggering Agents from Game](#triggering-agents-from-game)
4. [Real-time Updates](#real-time-updates)
5. [NPC Agent Integration](#npc-agent-integration)
6. [Examples](#examples)

---

## Overview

### What Can Agents Do in the Game?

Agents can:
- **Trigger gameplay events** (quest completion, item drops)
- **Control NPCs** (movement, dialogue, behavior)
- **Modify game state** (weather, time of day, resource changes)
- **Send notifications** (achievements, system messages)
- **Update player inventory** (add items, currency)

### Architecture

```
┌─────────────────┐
│  Phaser Game    │
│  Client         │
├─────────────────┤
│  - Game state   │
│  - NPCs         │
│  - Players      │
└────────┬────────┘
         │
         │ HTTP + SSE
         │
┌────────▼────────┐
│  Gateway        │
├─────────────────┤
│  - Route agents │
│  - Stream events│
└────────┬────────┘
         │
         │ Webhooks
         │
┌────────▼────────┐
│  Sim.ai         │
├─────────────────┤
│  - Execute      │
│  - Report       │
└─────────────────┘
```

---

## Agent Events in Game

### Event Types

**Gameplay Events**:
- `agent_quest_complete` - Quest completion
- `agent_item_drop` - Item reward
- `agent_npc_move` - NPC movement
- `agent_dialogue` - NPC dialogue
- `agent_weather` - Weather change
- `agent_notification` - System notification

### Event Flow

```
Agent workflow completes
        ↓
Calls /api/events with result
        ↓
Gateway broadcasts via SSE
        ↓
Game client receives event
        ↓
Game state updates
        ↓
UI/NPCs reflect change
```

---

## Triggering Agents from Game

### Basic Trigger

**From Phaser scene**:

```typescript
// In your scene (e.g., MainScene)
async function triggerAgent(agentId: string, context: any) {
  try {
    const response = await fetch('/api/run/' + agentId, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        payload: {
          playerId: this.playerId,
          context: context,
          timestamp: Date.now()
        }
      })
    });

    const data = await response.json();
    console.log('Agent triggered:', data);
  } catch (error) {
    console.error('Failed to trigger agent:', error);
  }
}
```

**Use in game**:

```typescript
// When player completes a task
this.events.emit('task_complete', { taskId: 'collect_items' });

// In task handler
this.events.on('task_complete', (task) => {
  triggerAgent('quest-reward', {
    taskId: task.taskId,
    playerLevel: this.playerLevel
  });
});
```

---

### Example: Quest Trigger

```typescript
// Trigger agent when player reaches NPC
if (player.x === npc.x && player.y === npc.y) {
  triggerAgent('quest-starter', {
    npcId: npc.id,
    playerId: player.id
  });
}
```

**Agent workflow**:
1. Receives NPC and player info
2. Generates dynamic quest
3. Calls `/api/events` with quest data
4. Game receives event and starts quest

---

## Real-time Updates

### Listening to Agent Events

**Subscribe to agent in game**:

```typescript
class MainScene extends Phaser.Scene {
  eventSource: EventSource;

  create() {
    // Subscribe to agent events
    this.eventSource = new EventSource('/api/stream?npc=quest-agent');

    this.eventSource.addEventListener('done', (event) => {
      const data = JSON.parse(event.data);
      this.handleAgentComplete(data);
    });

    this.eventSource.addEventListener('error', (event) => {
      const data = JSON.parse(event.data);
      this.handleAgentError(data);
    });
  }

  handleAgentComplete(data: any) {
    console.log('Quest agent complete:', data.result);

    // Update game state
    if (data.result.questId) {
      this.startQuest(data.result.questId);
    }

    if (data.result.reward) {
      this.giveReward(data.result.reward);
    }
  }

  handleAgentError(data: any) {
    console.error('Quest agent error:', data.error);
    this.showNotification('Quest creation failed');
  }

  shutdown() {
    // Cleanup
    if (this.eventSource) {
      this.eventSource.close();
    }
  }
}
```

---

### Event Data Structure

**Quest Agent Result**:
```json
{
  "npc": "quest-agent",
  "type": "done",
  "data": {
    "questId": "quest_123",
    "title": "Collect 10 items",
    "description": "Find items in the forest",
    "reward": {
      "experience": 100,
      "currency": 50,
      "items": ["sword_001"]
    },
    "difficulty": "medium"
  }
}
```

---

## NPC Agent Integration

### What Are NPC Agents?

NPC Agents control NPC behavior:
- **Dialogue** - What NPCs say
- **Movement** - Where NPCs go
- **Behavior** - NPC actions
- **State** - NPC emotions/status

### NPC Agent Workflow Example

```
Workflow: npc-ai
├─ Input: npc_id, player_nearby, time_of_day
├─ AI Step: Generate NPC dialogue/action
├─ Conditional: Is player nearby?
│  ├─ Yes → Move towards player, generate dialogue
│  └─ No → Patrol or rest
├─ HTTP Request: POST /api/events
│  └─ type: "done", data: { action, dialogue }
└─ Game receives and updates NPC
```

### Implementing NPC Agent

**In game**:

```typescript
class NPC extends Phaser.Physics.Sprite {
  private agentId: string = 'npc-ai';
  private lastUpdateTime: number = 0;
  private updateInterval: number = 5000; // 5 seconds

  update(time: number) {
    // Update NPC AI periodically
    if (time - this.lastUpdateTime > this.updateInterval) {
      this.updateWithAgent();
      this.lastUpdateTime = time;
    }
  }

  async updateWithAgent() {
    const context = {
      npcId: this.id,
      position: { x: this.x, y: this.y },
      playerDistance: this.getPlayerDistance(),
      timeOfDay: this.scene.getTimeOfDay()
    };

    // Trigger NPC behavior agent
    await triggerAgent(this.agentId, context);
  }

  applyAgentBehavior(behavior: any) {
    if (behavior.action === 'move') {
      this.moveTowards(behavior.target);
    }

    if (behavior.dialogue) {
      this.showDialogue(behavior.dialogue);
    }

    if (behavior.animation) {
      this.play(behavior.animation);
    }
  }
}
```

**Subscribe to NPC agent events**:

```typescript
// In main scene
subscribeToNPCAgent(npcId: string) {
  const es = new EventSource(`/api/stream?npc=npc-${npcId}`);

  es.addEventListener('done', (event) => {
    const data = JSON.parse(event.data);
    const npc = this.getNPC(npcId);

    if (npc) {
      npc.applyAgentBehavior(data.result);
    }
  });

  return es;
}
```

---

## Examples

### Example 1: Dynamic Quest Generation

**Trigger when player talks to quest-giver**:

```typescript
// In game, when player talks to NPC
async function startQuestDialog(npc: NPC) {
  // Trigger quest generation agent
  const response = await fetch('/api/run/quest-generator', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      payload: {
        playerId: this.player.id,
        playerLevel: this.player.level,
        npcId: npc.id,
        availableTypes: ['collect', 'combat', 'fetch']
      }
    })
  });

  // Subscribe to completion
  const es = new EventSource('/api/stream?npc=quest-generator');

  es.addEventListener('done', (event) => {
    const data = JSON.parse(event.data);

    // Show quest to player
    this.showQuestDialog(data.result);

    // Start quest
    this.startQuest(data.result.quest);

    es.close();
  });

  // Show "generating quest..." animation
  this.showLoadingSpinner('Generating quest...');
}
```

### Example 2: Dynamic NPC Dialogue

**Generate NPC responses**:

```typescript
async function generateNPCResponse(npc: NPC, playerMessage: string) {
  // Send player message to dialogue agent
  const response = await fetch('/api/run/npc-dialogue', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      payload: {
        npcId: npc.id,
        npcName: npc.name,
        playerMessage: playerMessage,
        context: npc.relationship // friendship level
      }
    })
  });

  // Wait for dialogue generation
  const es = new EventSource('/api/stream?npc=npc-dialogue');

  es.addEventListener('done', (event) => {
    const data = JSON.parse(event.data);

    // Show generated dialogue
    this.showDialogueBox({
      speaker: npc.name,
      text: data.result.dialogue,
      emotion: data.result.emotion
    });

    es.close();
  });
}
```

### Example 3: Real-time Event Updates

**Listen for game-changing events**:

```typescript
class GameEventListener {
  private eventSource: EventSource;

  connect() {
    // Listen to all game events
    this.eventSource = new EventSource('/api/stream?npc=game-events');

    this.eventSource.addEventListener('step', (event) => {
      const data = JSON.parse(event.data);
      console.log('Game event:', data.message);
    });

    this.eventSource.addEventListener('done', (event) => {
      const data = JSON.parse(event.data);
      this.applyGameEvent(data.result);
    });
  }

  applyGameEvent(event: any) {
    switch (event.type) {
      case 'weather_change':
        this.scene.setWeather(event.weather);
        break;

      case 'time_advance':
        this.scene.advanceTime(event.hours);
        break;

      case 'item_spawn':
        this.scene.spawnItem(event.itemId, event.position);
        break;

      case 'achievement':
        this.scene.showAchievement(event.achievement);
        break;

      case 'message':
        this.scene.showSystemMessage(event.message);
        break;
    }
  }

  disconnect() {
    if (this.eventSource) {
      this.eventSource.close();
    }
  }
}
```

---

## Best Practices

### 1. Don't Block Game Loop

```typescript
// Bad: Game freezes waiting for response
const result = await fetch('/api/run/agent');
const data = result.json();

// Good: Use callbacks
fetch('/api/run/agent').then(response => {
  // Handle when ready
});
```

### 2. Show Feedback

```typescript
// Always show player something is happening
this.showLoadingSpinner('Generating quest...');

// When done
es.addEventListener('done', () => {
  this.hideLoadingSpinner();
  this.showResult(data);
});
```

### 3. Handle Errors Gracefully

```typescript
es.addEventListener('error', (event) => {
  const data = JSON.parse(event.data);

  // Show error to player
  this.showNotification('⚠️ ' + data.error);

  // Log for debugging
  console.error('Agent error:', data);

  // Fallback behavior
  this.useDefaultBehavior();
});
```

### 4. Cleanup Connections

```typescript
shutdown() {
  // Always close SSE connections
  if (this.eventSource) {
    this.eventSource.close();
  }
}
```

---

## Configuration

### Base URL

By default, assumes Gateway on same origin. For different setup:

```typescript
const GATEWAY_BASE = 'http://localhost:3001';

function triggerAgent(agentId: string, payload: any) {
  return fetch(`${GATEWAY_BASE}/api/run/${agentId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ payload })
  });
}
```

### Agent IDs

Define all available agents:

```typescript
const AGENTS = {
  QUEST_GENERATOR: 'quest-generator',
  NPC_DIALOGUE: 'npc-dialogue',
  REWARD_GENERATOR: 'reward-generator',
  WORLD_EVENT: 'world-event'
};

// Use: triggerAgent(AGENTS.QUEST_GENERATOR, ...)
```

---

## Next Steps

- **[Server Agent Integration](../server/AGENT_INTEGRATION.md)** - Server-side agent handling
- **[Gateway API](../esprit/docs/agents/GATEWAY.md)** - API reference
- **[Deployment Guide](../esprit/docs/agents/DEPLOYMENT.md)** - Deploy to production

---

**Last Updated**: 2025-11-08
**Client Integration Version**: 1.0.0
