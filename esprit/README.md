# SkyOffice + Sim.ai MVP stack

This is a single-product stack that embeds the Sim.ai Studio inside your app, exposes a tiny Gateway API for running agents and streaming live status to the UI, and ships behind one reverse-proxy for a same-origin experience.

What you get in this folder:
- apps/gateway: Fastify/TypeScript API with /api/run, /api/events, /api/stream (SSE)
- apps/skyoffice: Minimal React UI with NPC Panel and Builder Drawer (iframe /studio)
- infra/docker-compose.yml: one command to boot the full product (reverse proxy, Sim.ai, PostgreSQL with pgvector, Nango, LiteLLM)
- infra/nginx.conf: proxies / → UI, /api → Gateway, /studio → Sim.ai Studio, /realtime → Sim.ai socket server
- agent-templates/: placeholders for your first flows (Scheduler, MailOps)

Quick start
1) Prereqs
- Docker Desktop 4.x+
- Node 18+ (only if you want to run locally outside Compose)

2) Configure env
- Copy .env.example to .env and edit as needed (or keep defaults for local Compose).
- Required environment variables:
  - BETTER_AUTH_SECRET: Your auth secret (generate with: openssl rand -hex 32)
  - ENCRYPTION_KEY: Your encryption key (generate with: openssl rand -hex 32)
  - PUBLIC_ORIGIN: http://localhost:8080 (or your domain)
  - POSTGRES_PASSWORD: Database password (default: postgres)

3) Boot the stack
- From this folder (esprit/):
  docker compose -f infra/docker-compose.yml up -d --build

4) Initialize Sim.ai
- Open http://localhost:8080/studio/
- Create an admin account on first run
- Configure your AI providers (OpenAI, Anthropic, or local models)

5) Create workflows
- Build two workflows in Sim Studio:
  - Scheduler: webhook trigger → AI processing → actions → HTTP Request (POST http://skyoffice-gateway:3001/api/events)
  - MailOps: scheduled trigger → email processing → AI summarization → HTTP Request (POST http://skyoffice-gateway:3001/api/events)
- Copy the Webhook URL for each workflow

6) Register agents in the Gateway
- Edit apps/gateway/data/agents.json and add your agents:
  [
    { "agent": "scheduler", "npc": "scheduler", "webhookUrl": "<paste webhook from Sim>" },
    { "agent": "mailops",   "npc": "mailops",   "webhookUrl": "<paste webhook from Sim>" }
  ]
- Restart the gateway: docker compose -f infra/docker-compose.yml restart gateway

7) Use the product
- Open http://localhost:8080
- Click Run on an NPC; watch live status via SSE
- Click "Open Sim Studio" to open the Studio inside your product to create more workflows

Notes
- Auth: Sim.ai includes built-in authentication with Better Auth. Configure your auth providers in the Sim Studio settings.
- LLM: Sim.ai supports multiple AI providers (OpenAI, Anthropic, Google, local models via Ollama). Configure in Studio settings.
- LiteLLM: Optional container provided for unified LLM gateway (http://litellm:4000)
- Nango: Optional OAuth broker if you need centralized OAuth management
- Realtime: Sim.ai uses Socket.io for realtime updates, proxied through /realtime

Docs
- Agent guide: docs/agent.md
- Local development: docs/LOCAL_STACK.md
- Sim.ai docs: https://docs.sim.ai

Troubleshooting
- If /studio doesn't render, ensure you're opening http://localhost:8080 (the reverse proxy), not the sim container directly
- SSE drops? Ensure proxy_buffering off is applied to /api/stream in Nginx and that the Gateway stays up
- Database errors? Ensure the migrations container completed successfully: docker logs simstudio-migrations
