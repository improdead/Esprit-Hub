# Agent Builder/Runner Guide (Sim.ai + SkyOffice)

This guide explains how to build, map, and run agents using Sim.ai embedded inside your product, with live status in SkyOffice.

Quick links
- Open the builder: click "Open Sim.ai" (header) → `/studio/`
- Event callback from flows (inside Docker network): `http://skyoffice-gateway:3001/api/events`
- Agent mapping file: `apps/gateway/data/agents.json`

---

1) What you ship (scope)
- SkyOffice UI (React/TS)
  - NPC Panel (run buttons, live status, logs)
  - Builder Drawer (iframe of /studio/, optional since we also open new tab)
- Gateway API (Fastify/TS)
  - POST /api/run/:agent
  - POST /api/events
  - GET /api/stream?npc=
  - POST /api/build (optional, not implemented yet)
- Sim.ai (self-hosted) — runtime + visual builder (embedded at /studio/)
- Nango (OAuth broker) for Google/Slack (optional)
- LiteLLM (LLM gateway) for AI steps (optional)
- Postgres (metadata), Redis (Sim.ai)

All services run behind one Nginx reverse proxy on http://localhost:8080.

---

2) High-level architecture
- UI ↔ Gateway via REST + SSE
- Gateway ↔ Sim.ai via internal Docker network
- Sim.ai flows call Gateway /api/events to broadcast progress
- Reverse proxy exposes UI (/), API (/api), and Studio (/studio/)

---

3) Create your first two agents
A) Scheduler (webhook-driven)
- In `/studio/` create a new flow:
  - Trigger: Webhook – Catch Hook
  - Steps:
    - AI: parse free text to {title, start, end, attendees[]}
    - Google Calendar: Create Event (with Meet)
    - Slack: Send Message (event summary + link)
    - HTTP Request: POST to `http://skyoffice-gateway:3001/api/events`
      - Body JSON: `{ "npc":"scheduler", "type":"done", "data": { /* your details */ } }`
- Copy the Webhook URL; you’ll paste it into the agent mapping (next section).

B) MailOps (scheduled)
- In `/studio/` create a new flow:
  - Trigger: Schedule (e.g., `0 9 * * *`)
  - Steps:
    - Gmail: List Messages (INBOX, unread)
    - AI: summarize top 5 emails with action items
    - Slack: Send Message (digest)
    - HTTP Request: POST to `http://skyoffice-gateway:3001/api/events`
      - Body JSON: `{ "npc":"mailops", "type":"done", "data": { /* your details */ } }`

Tips
- For AI steps you can point to LiteLLM at `http://litellm:4000` or use vendor directly.
- For Google/Slack, either connect via Sim.ai's built-in connectors or broker with Nango.

---

4) Map agents to flows (Gateway)
- Edit `apps/gateway/data/agents.json` and set webhook URLs:
```
[
  { "agent":"scheduler", "npc":"scheduler", "webhookUrl":"http://sim/api/v1/webhooks/catch/<paste-from-studio>" },
  { "agent":"mailops",   "npc":"mailops",   "webhookUrl":"http://sim/api/v1/webhooks/catch/<optional-if-cron>" }
]
```
- Restart the Gateway to reload mapping:
  - `docker compose -f infra/docker-compose.yml restart gateway`

How it works
- The UI calls `POST /api/run/:agent` → Gateway looks up the `webhookUrl` and forwards payload.
- Gateway immediately emits `started` over SSE for the NPC’s channel.
- Your flow posts `POST /api/events` as it progresses; the UI updates pills/logs in real-time.

---

5) Use the product
- Open `http://localhost:8080`
- Click "Open Sim.ai" to build/edit flows
- Back in SkyOffice, click Run on Scheduler/MailOps; watch logs update via SSE.

---

6) Optional: AI Builder endpoint
- `POST /api/build` is stubbed. When implemented, it will:
  - Accept `{ brief, defaults? }`
  - Call LLM (via LiteLLM) to classify/extract settings
  - Create & publish flow via Sim.ai API
  - Return `{ agentId, name, webhookUrl }` and register mapping

---

7) Security & auth (MVP)
- Put the stack behind a session (signed cookie) and enforce auth on `/api/*`.
- Protect `/studio/` and `/ap/` using Nginx `auth_request` → Gateway.
- Store only connection IDs (e.g., with Nango) — avoid storing vendor tokens in our app.

---

8) Troubleshooting
- Studio not loading in drawer? Use `/studio/` (trailing slash) and ensure you're on `http://localhost:8080` (the proxy), not Sim.ai directly.
- SSE drops: confirm proxy buffering is disabled for `/api/stream` and Gateway remains healthy.
- Flow can't reach Gateway: use Docker DNS inside flows (`http://skyoffice-gateway:3001`).
- 404 on run: ensure `agents.json` is populated with the correct webhook URL(s).
