# 🤖 Esprit-Hub Agent Documentation

**Master guide for building, deploying, and monitoring AI agents in Esprit-Hub**

Welcome! This is your central hub for everything related to agents in Esprit-Hub. Whether you're building new workflows, integrating agents with the game, or troubleshooting issues, you'll find detailed guides below.

---

## 📚 Documentation Structure

### Core Agent Guides

These guides cover the Sim.ai integration and agent management system:

1. **[Getting Started with Agents](../esprit/docs/agent.md)**
   - Quick overview of the agent system
   - First steps with Sim.ai Studio
   - Running your first workflows
   - Agent mapping basics

2. **[Workflow Building Patterns](../esprit/docs/agents/WORKFLOWS.md)** ⭐ Start here if building workflows
   - Workflow structure and anatomy
   - Trigger types (webhooks, schedules, manual)
   - Common step patterns
   - Error handling strategies
   - Best practices for automation

3. **[Gateway API Reference](../esprit/docs/agents/GATEWAY.md)** ⭐ Start here if integrating with external systems
   - Complete API endpoint documentation
   - Agent triggering (`POST /api/run/:agent`)
   - Event streaming (`GET /api/stream?npc=X`)
   - Agent mapping configuration
   - Webhook management

4. **[SkyOffice UI Integration](../esprit/docs/agents/SKYOFFICE_UI.md)** ⭐ Start here if building the UI
   - UI architecture and components
   - Real-time status updates
   - Log streaming and display
   - Builder drawer integration
   - Extending the interface

5. **[Agent Templates & Examples](../esprit/docs/agents/TEMPLATES.md)**
   - Pre-built agent templates
   - Scheduler workflow (calendar integration)
   - MailOps workflow (email automation)
   - Content generation agents
   - Custom template creation guide

6. **[Deployment & Testing](../esprit/docs/agents/DEPLOYMENT.md)** ⭐ Start here for going to production
   - Local development setup
   - Testing agents in isolation
   - Docker deployment
   - Agent monitoring and logging
   - Performance optimization
   - Production checklist

7. **[Troubleshooting & FAQ](../esprit/docs/agents/TROUBLESHOOTING.md)**
   - Common issues and solutions
   - Debugging workflows
   - Network and connectivity issues
   - SSE streaming problems
   - Workflow execution errors

---

## 🎮 Game Integration Guides

Integrating agents with the Esprit-Hub game world:

8. **[Game Client Agent Integration](../client/docs/AGENT_INTEGRATION.md)**
   - How agents affect game state
   - Triggering agents from game events
   - Real-time agent updates in-game
   - NPC behavior agents

9. **[Game Server Agent Integration](../server/docs/AGENT_INTEGRATION.md)**
   - Server-side agent execution
   - Colyseus event broadcasting
   - Agent state synchronization
   - Multiplayer agent coordination

---

## 🗂️ Related Documentation

- **[System Architecture](../esprit/docs/ARCHITECTURE.md)** - Deep dive into how all components connect
- **[Project README](../README.md)** - Project overview and quick start
- **[Local Development Setup](./LOCAL_STACK.md)** - How to run everything locally
- **[Running the App](./RUNNING_THE_APP.md)** - Step-by-step guide to start the full stack

---

## 🚀 Quick Start Paths

### "I want to build an agent workflow"
1. Read: [Workflow Building Patterns](../esprit/docs/agents/WORKFLOWS.md)
2. Review: [Agent Templates & Examples](../esprit/docs/agents/TEMPLATES.md)
3. Follow: Getting started guide in [Workflow Building Patterns](../esprit/docs/agents/WORKFLOWS.md)
4. Test with: [Deployment & Testing](../esprit/docs/agents/DEPLOYMENT.md)

### "I want to integrate agents into the game"
1. Read: [Game Client Agent Integration](../client/docs/AGENT_INTEGRATION.md)
2. Read: [Game Server Agent Integration](../server/docs/AGENT_INTEGRATION.md)
3. Reference: [Gateway API Reference](../esprit/docs/agents/GATEWAY.md)
4. Test with: [Deployment & Testing](../esprit/docs/agents/DEPLOYMENT.md)

### "I need to connect external systems to agents"
1. Read: [Gateway API Reference](../esprit/docs/agents/GATEWAY.md)
2. Review: Webhook trigger section in [Workflow Building Patterns](../esprit/docs/agents/WORKFLOWS.md)
3. Examples: [Agent Templates & Examples](../esprit/docs/agents/TEMPLATES.md)

### "I'm having agent issues"
1. Check: [Troubleshooting & FAQ](../esprit/docs/agents/TROUBLESHOOTING.md)
2. Review: [Deployment & Testing](../esprit/docs/agents/DEPLOYMENT.md) debugging section
3. Reference: [Gateway API Reference](../esprit/docs/agents/GATEWAY.md) for endpoint issues

### "I need to deploy to production"
1. Read: [Deployment & Testing](../esprit/docs/agents/DEPLOYMENT.md) - full guide
2. Security: Check security checklist in deployment guide
3. Monitor: Review monitoring section in [Deployment & Testing](../esprit/docs/agents/DEPLOYMENT.md)
4. Reference: [System Architecture](../esprit/docs/ARCHITECTURE.md) for scaling info

---

## 🎯 Key Concepts

### What is an Agent?
An agent is an automated workflow in Sim.ai that performs a specific task. It can be triggered by:
- **Webhooks** - External system calls or manual triggers
- **Schedules** - Cron-like scheduling (e.g., daily at 9 AM)
- **Events** - Internal system events

### Agent Lifecycle
```
Webhook/Schedule → Agent Triggered → Gateway → Sim.ai Execution → Events Posted → UI Updated
```

### Event Streaming
Agents report progress via Server-Sent Events (SSE). The frontend subscribes to an agent's channel and receives real-time updates:
- `started` - Agent began execution
- `step` - Progress checkpoint reached
- `awaiting` - Agent waiting for user input
- `done` - Agent completed successfully
- `error` - Agent encountered an error

---

## 💡 Common Tasks

### Create a new agent workflow
See: [Workflow Building Patterns](../esprit/docs/agents/WORKFLOWS.md) → "Creating Your First Workflow"

### Run an agent from code
See: [Gateway API Reference](../esprit/docs/agents/GATEWAY.md) → "Triggering Agents"

### Monitor agent execution
See: [SkyOffice UI Integration](../esprit/docs/agents/SKYOFFICE_UI.md) → "Real-time Monitoring"

### Add error handling to a workflow
See: [Workflow Building Patterns](../esprit/docs/agents/WORKFLOWS.md) → "Error Handling"

### Test an agent locally
See: [Deployment & Testing](../esprit/docs/agents/DEPLOYMENT.md) → "Local Testing"

### Debug a failing workflow
See: [Troubleshooting & FAQ](../esprit/docs/agents/TROUBLESHOOTING.md) → "Debugging Workflows"

---

## 📊 Component Overview

```
┌────────────────────────────────────────────────────┐
│            Esprit-Hub Agent System                 │
├────────────────────────────────────────────────────┤
│                                                    │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────┐ │
│  │   SkyOffice  │  │   Sim.ai     │  │ Gateway │ │
│  │   UI         │  │   Builder    │  │   API   │ │
│  │              │  │              │  │         │ │
│  │ • Monitor    │  │ • Create     │  │ • Route │ │
│  │   agents     │  │   workflows  │  │ • Stream│ │
│  │ • View logs  │  │ • Deploy     │  │ • Trigger
│  │ • Trigger    │  │ • Test       │  │         │ │
│  │   runs       │  │              │  │         │ │
│  └──────────────┘  └──────────────┘  └─────────┘ │
│         ↑                 ↓               ↓        │
│         └─────────────────┴───────────────┘        │
│                  (API + SSE)                       │
│                                                    │
└────────────────────────────────────────────────────┘

External Systems ↔ Webhooks ↔ Agent Workflows
Game Client ↔ Agent Status ↔ Real-time Updates
```

---

## 🔒 Security & Best Practices

- **Never commit secrets**: Use environment variables (see `.env.example`)
- **Protect Studio**: In production, require authentication for `/studio/`
- **Validate webhooks**: Check request signatures when agents call external endpoints
- **Rate limit**: Add rate limiting to agent triggers in production
- **Monitor**: Enable detailed logging for agent execution

See [Deployment & Testing](../esprit/docs/agents/DEPLOYMENT.md) for production security checklist.

---

## 🆘 Need Help?

1. **Check the docs**: Start with the relevant guide above
2. **Search troubleshooting**: [Troubleshooting & FAQ](../esprit/docs/agents/TROUBLESHOOTING.md)
3. **Check logs**: `docker compose logs gateway` or `docker compose logs sim`
4. **Review examples**: [Agent Templates & Examples](../esprit/docs/agents/TEMPLATES.md)

---

## 📖 Table of Contents by Topic

### Building & Development
- [Getting Started](../esprit/docs/agent.md)
- [Workflow Building Patterns](../esprit/docs/agents/WORKFLOWS.md)
- [Agent Templates & Examples](../esprit/docs/agents/TEMPLATES.md)

### Integration & APIs
- [Gateway API Reference](../esprit/docs/agents/GATEWAY.md)
- [SkyOffice UI Integration](../esprit/docs/agents/SKYOFFICE_UI.md)
- [Game Client Integration](../client/docs/AGENT_INTEGRATION.md)
- [Game Server Integration](../server/docs/AGENT_INTEGRATION.md)

### Operations & Deployment
- [Deployment & Testing](../esprit/docs/agents/DEPLOYMENT.md)
- [System Architecture](../esprit/docs/ARCHITECTURE.md)
- [Troubleshooting & FAQ](../esprit/docs/agents/TROUBLESHOOTING.md)

---

**Last Updated**: 2025-11-08
**Maintained by**: Esprit-Hub Team
