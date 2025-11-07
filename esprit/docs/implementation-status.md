# Implementation Status (SkyOffice + Activepieces MVP)

Last updated: 2025-11-07

## Done ✅
- Monorepo scaffolding under `esprit/` with UI, Gateway, infra
- Reverse-proxy (Nginx) maps:
  - `/` → SkyOffice UI
  - `/api` → Gateway API
  - `/studio/` and `/ap/` → Activepieces Studio/API (same-origin)
- Gateway API (Fastify/TS):
  - `POST /api/run/:agent` (forwards to AP webhook + emits SSE started)
  - `POST /api/events` (receives progress pings from flows, rebroadcasts via SSE)
  - `GET /api/stream?npc=` (SSE per-NPC channel)
  - In-memory SSE hub
- SkyOffice UI (React/Vite):
  - NPC Panel: Run button, live status, logs (SSE)
  - Header button: “Open Activepieces” → `/studio/` (new tab)
  - Builder Drawer component present (iframe `/studio/`) — kept for later if you want inline
- Activepieces cloned to `external/activepieces`
  - Compose builds AP from source (port 80 in-container)
  - Postgres + Redis wired
- Agent mapping file: `apps/gateway/data/agents.json`
- Docs: README, Implementation Status, Agent guide

## In Progress 🛠️
- Flows: Create Scheduler (webhook) and MailOps (cron) in Studio
- Populate `agents.json` with real webhooks from Studio
- Configure connectors (Google, Slack) via Studio (or brokered via Nango)
- LiteLLM routing (optional) — point AP AI steps to `http://litellm:4000` if desired

## To Finish 🔜
- Auth (MVP):
  - Session cookie and auth gate `/api/*` in Gateway
  - Nginx `auth_request` to protect `/studio/` and `/ap/`
- Optional Builder Agent endpoint `POST /api/build` (LLM → AP flow synthesis)
- Approvals pattern (AP Respond & Wait + webhook back)
- Persistence for logs/events (DB) instead of in-memory SSE-only
- Secrets management (.env, production overrides, rotation)
- Observability (structured logs, traces); health checks
- CI/CD: build multi-arch Docker images; tag and push
- Hardening: CSP, CORS policy, rate limiting, request size limits
- UX: Dynamic agent list fetched from Gateway instead of static list
- Error surfaces in UI (failed run, AP errors) with retry

## Risks/Notes 📌
- Keep `/studio/` trailing slash in links/iframe to avoid routing conflicts
- Internal URLs from AP flows to Gateway should use Docker DNS: `http://skyoffice-gateway:3001`
- Current SSE hub is ephemeral; a restart clears subscriptions/logs
- Running AP in `UNSANDBOXED` for local; review sandboxing before production
