# Agent Builder/Runner Guide (Activepieces + SkyOffice)

This end-to-end guide shows how to run the full stack, build flows in Activepieces, map them to in‑app agents, and use live status in SkyOffice. It also covers local dev without Docker, environment variables, and troubleshooting.

Quick links
- Open the builder: click “Open Activepieces” (header) → `/studio/`
- Event callback from flows (inside Docker network): `http://skyoffice-gateway:3001/api/events`
- Agent mapping file: `esprit/apps/gateway/data/agents.json`

—

1) What you ship (scope)
- SkyOffice UI (React/TS)
  - NPC Panel (run buttons, live status, logs)
  - Builder Drawer (iframe of `/studio/`, optional; we also offer an “Open Activepieces” link)
- Gateway API (Fastify/TS)
  - `POST /api/run/:agent` — trigger an agent, forward to AP webhook, emit `started`
  - `POST /api/events` — flows post progress; Gateway rebroadcasts over SSE
  - `GET /api/stream?npc=` — SSE live status per NPC
  - `POST /api/build` — optional, stubbed for AI Builder
- Activepieces (self-hosted) — runtime + visual builder (embedded at `/studio/`)
- Optional services — Nango (OAuth broker), LiteLLM (LLM gateway), Postgres, Redis

All services run behind one Nginx reverse proxy on `http://localhost:8080` when using Docker Compose.

—

2) Run the stack

Option A — Docker Compose (recommended)
- Prereqs: Docker Desktop 4.x+
- From `esprit/` root:
  - `cp .env.example .env` (edit if needed)
  - `docker compose -f infra/docker-compose.yml up -d --build`
- Open:
  - App: `http://localhost:8080`
  - Studio: `http://localhost:8080/studio/` (create account on first run)

Option B — Local dev (no Docker)
- Run Gateway:
  - `cd esprit/apps/gateway && yarn && yarn dev`
  - Gateway listens on `http://localhost:3001`
- Run UI:
  - `cd esprit/apps/skyoffice && yarn && yarn dev`
  - Vite prints the local URL (e.g., `http://localhost:5173`)
- Run Activepieces separately:
  - Use a managed AP, or run AP locally (Docker or `pnpm dev` in `esprit/external/activepieces`)
  - Set `VITE` proxy or CORS as needed; in local dev, the Studio may not be same-origin, so open it in a new tab.
- See `docs/LOCAL_STACK.md` for a step-by-step “everything on localhost with no Docker” runbook.

—

3) Configure environment

Core variables (Compose reads `.env` in `esprit/`):
- `PUBLIC_ORIGIN` — public base URL of the proxy (default `http://localhost:8080`)
- `AP_BASE` — internal AP base URL for Gateway (default `http://activepieces` in Compose)
- `AP_TOKEN`, `AP_PROJECT` — if you use authenticated AP API calls later
- `PORT` — Gateway port (default 3001)
- `AGENT_MAP_FILE` — mapping file path (default `/app/data/agents.json`)
- Client-side (Vite) env: create `client/.env.local` if you need to override the builder link, e.g.,
  - `VITE_STUDIO_URL=http://localhost:8080/studio/` (useful when UI runs on `5173` but Activepieces lives behind another origin)

—

4) Build your first two agents (flows)

A) Scheduler (webhook-driven)
- In `/studio/` create a new flow:
  - Trigger: Webhook – Catch Hook
  - Steps:
    - AI: parse free text → `{title, start, end, attendees[]}`
    - Google Calendar: Create Event (with Meet)
    - Slack: Send Message (event summary + link)
    - HTTP Request: `POST http://skyoffice-gateway:3001/api/events`
      - Body JSON: `{ "npc":"scheduler", "type":"done", "data": { /* details */ } }`
- Copy the Webhook URL for this flow.

B) MailOps (scheduled)
- In `/studio/` create a new flow:
  - Trigger: Schedule (e.g., `0 9 * * *`)
  - Steps:
    - Gmail: List Messages (INBOX, unread)
    - AI: summarize top 5 with action items
    - Slack: Send Message (digest)
    - HTTP Request: `POST http://skyoffice-gateway:3001/api/events`
      - Body JSON: `{ "npc":"mailops", "type":"done", "data": { /* details */ } }`

Tips
- For AI steps, you may use LiteLLM at `http://litellm:4000` or vendor API directly.
- For Google/Slack, connect via AP’s built-in connectors or broker using Nango.

—

5) Map agents to flows (Gateway)
- Edit `esprit/apps/gateway/data/agents.json` and paste webhook URLs:
```
[
  { "agent":"scheduler", "npc":"scheduler", "webhookUrl":"http://activepieces/api/v1/webhooks/catch/<paste-from-studio>" },
  { "agent":"mailops",   "npc":"mailops",   "webhookUrl":"http://activepieces/api/v1/webhooks/catch/<optional-if-cron>" }
]
```
- Restart Gateway to reload mapping:
  - Compose: `docker compose -f infra/docker-compose.yml restart gateway`
  - Local dev: stop/start `yarn dev`

How it works
- UI calls `POST /api/run/:agent` → Gateway forwards to AP webhook, emits `started` SSE.
- Your flow calls `POST /api/events` as it progresses → UI shows pills/logs live via SSE.

—

6) Use the product
- Proxy mode (Compose): `http://localhost:8080`
  - Header button “Open Activepieces” opens the Studio.
  - Click Run on Scheduler/MailOps panels and watch logs.
- Local dev: open UI and Studio separately; ensure CORS/proxy rules allow API calls.

—

7) Integrate into Esprit-Hub client (Phaser UI)
- A “Build Agent” floating-action button already lives in the Helper panel (`client/src/components/HelperButtonGroup.tsx:1`); click it to open `/studio/` in a new tab while staying inside the game.
- For live status in the Phaser UI, reuse the SSE pattern from `esprit/apps/skyoffice/src/components/NPCPanel.tsx:12` and display event pills/logs in your HUD (still TODO in the Phaser client).
- If you’re running the client without the reverse proxy, point the FAB at the correct Studio origin by adding `VITE_STUDIO_URL=http://localhost:8080/studio/` to `client/.env.local`.

—

8) Security & auth (MVP)
- Protect `/api/*` with a session (signed cookie) in Gateway; add Nginx `auth_request` for `/studio/` and `/ap/`.
- Store only connection IDs (Nango) and keep vendor tokens out of the app.

—

9) Troubleshooting
- Studio not loading in drawer? Use `/studio/` (trailing slash) and access via the proxy origin `http://localhost:8080`.
- SSE drops? Proxy buffering must be disabled for `/api/stream` (already configured in Nginx) and Gateway must stay up.
- Flow can’t reach Gateway? Inside Compose use Docker DNS `http://skyoffice-gateway:3001`.
- 404 on `POST /api/run/:agent`? Ensure `agents.json` contains your agent and correct webhook URL.
