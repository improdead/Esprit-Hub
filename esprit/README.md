# SkyOffice + Activepieces MVP stack

This is a single-product stack that embeds the Activepieces Studio inside your app, exposes a tiny Gateway API for running agents and streaming live status to the UI, and ships behind one reverse-proxy for a same-origin experience.

What you get in this folder:
- apps/gateway: Fastify/TypeScript API with /api/run, /api/events, /api/stream (SSE)
- apps/skyoffice: Minimal React UI with NPC Panel and Builder Drawer (iframe /studio)
- infra/docker-compose.yml: one command to boot the full product (reverse proxy, AP from source, Postgres, Redis, Nango, LiteLLM)
- infra/nginx.conf: proxies / → UI, /api → Gateway, /studio → Activepieces UI
- agent-templates/: placeholders for your first flows (Scheduler, MailOps)

Quick start
1) Prereqs
- Docker Desktop 4.x+
- Node 18+ (only if you want to run locally outside Compose)

2) Configure env
- Copy .env.example to .env and edit as needed (or keep defaults for local Compose).

3) Boot the stack
- From this folder (esprit/):
  docker compose -f infra/docker-compose.yml up -d --build

4) Initialize Activepieces (built from the cloned source under external/activepieces)
- Open http://localhost:8080/studio/
- Create an admin account (first-run flow), then connect Google/Slack (Nango or AP-native connectors).

5) Create flows
- Build two flows in Studio:
  - Scheduler (webhook trigger) → AI parse → Google Calendar → Slack → HTTP Request (POST http://skyoffice-gateway:3001/api/events)
  - MailOps (cron trigger) → Gmail → AI summarize → Slack → HTTP Request (POST http://skyoffice-gateway:3001/api/events)
- Copy the Webhook URL of the Scheduler flow.

6) Register agents in the Gateway
- Edit apps/gateway/data/agents.json and add your agents:
  [
    { "agent": "scheduler", "npc": "scheduler", "webhookUrl": "<paste webhook>" },
    { "agent": "mailops",   "npc": "mailops",   "webhookUrl": "<optional if webhook>" }
  ]
- Rebuild the gateway (Compose will hot-restart on change), or run: docker compose -f infra/docker-compose.yml restart gateway

7) Use the product
- Open http://localhost:8080
- Click Run on an NPC; watch live status via SSE.
- Click “Build Agent” to open the Studio inside your product to make more agents.

Notes
- Auth: For MVP this stack is unsecured locally. Put it behind your SSO or add cookie auth via the Gateway + Nginx auth_request before going public.
- LLM: LiteLLM is provided; point Activepieces AI steps to it (http://litellm:4000) or connect directly to your LLM vendor.
- Nango: If you prefer brokered OAuth, configure Nango and use its connection IDs in your flows; or use AP’s built-in Google/Slack connectors.
- Optional /api/build is stubbed for later (AI → flow synthesis). You can add it once you decide on prompts/models.

Docs
- Agent guide: docs/agent.md
- Implementation status: docs/implementation-status.md

Troubleshooting
- If /studio doesn’t render in the drawer, ensure X-Frame-Options is SAMEORIGIN (Nginx config already sets this) and you’re opening http://localhost:8080 (the reverse proxy), not the AP container directly.
- SSE drops? Ensure proxy_buffering off is applied to /api/stream in Nginx and that the Gateway stays up.
