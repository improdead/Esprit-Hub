# SkyOffice + Sim.ai MVP stack

This is a single-product stack that embeds the Sim.ai Studio inside your app, exposes a tiny Gateway API for running agents and streaming live status to the UI, and ships behind one reverse-proxy for a same-origin experience.

What you get in this folder:
- apps/gateway: Fastify/TypeScript API with /api/run, /api/events, /api/stream (SSE)
- apps/skyoffice: Minimal React UI with NPC Panel and Builder Drawer (iframe /studio)
- infra/docker-compose.yml: one command to boot the full product (reverse proxy, AP from source, Postgres, Redis, Nango, LiteLLM)
- infra/nginx.conf: proxies / → UI, /api → Gateway, /studio → Sim.ai UI
- agent-templates/: placeholders for your first flows (Scheduler, MailOps)

## Prerequisites

**Required:**
- [Docker Desktop 4.x+](https://www.docker.com/products/docker-desktop/) - **MUST be installed and running**
- At least 8GB of available RAM
- ~10GB of free disk space

**Optional:**
- Node 18+ (only if you want to develop outside Docker)

## Quick Start (Local Testing)

### Option 1: Using the Startup Script (Recommended)

From the `esprit/` directory:

```bash
./start.sh
```

This will:
- Check if Docker is running
- Create a `.env` file if it doesn't exist
- Build and start all services
- Display access URLs when ready

### Option 2: Manual Docker Compose

```bash
# From esprit/ directory
cd infra
docker compose up -d --build
```

Wait for all services to start (this may take 5-10 minutes on first run).

## Accessing the Application

Once all services are running, access:

- **Main Application**: http://localhost:8080
- **Sim.ai Studio**: http://localhost:8080/studio/
- **Gateway API**: http://localhost:8080/api/

## Configuration

The `.env` file should be in the `esprit/` directory (not in `esprit/infra/`).

1. Copy the example environment file:
   ```bash
   # From the esprit/ directory:
   cp .env.example .env
   ```

2. Edit `.env` and update these values:
   - `BETTER_AUTH_SECRET` - Use a secure random string
   - `ENCRYPTION_KEY` - Must be exactly 32 characters
   - `PUBLIC_ORIGIN` - Your public URL (keep as http://localhost:8080 for local testing)

**Note**: The `start.sh` script will automatically create `.env` from `.env.example` if it doesn't exist.

## Stopping the Application

```bash
# From the esprit/infra directory:
cd esprit/infra
docker compose down
```

**Important**: Always run `docker compose` commands from the `esprit/infra/` directory, as that's where `docker-compose.yml` is located.

To also remove volumes (database data):
```bash
docker compose down -v
```

## Viewing Logs

```bash
# All services
cd esprit/infra
docker compose logs -f

# Specific service
docker compose logs -f sim
docker compose logs -f gateway
```

## Restarting Services

```bash
cd esprit/infra

# Restart a specific service
docker compose restart sim
docker compose restart gateway

# Restart all services
docker compose restart
```

## Setting Up Your First Agents

### 1. Initialize Sim.ai

1. Open http://localhost:8080/studio/
2. Create an admin account on first run
3. Connect your services (Google/Slack via Nango or native connectors)

### 2. Create Agent Flows

Build two example flows in the Sim.ai Studio:

**Scheduler Agent** (webhook-driven):
- Trigger: Webhook – Catch Hook
- Steps:
  1. AI: Parse free text → {title, start, end, attendees}
  2. Google Calendar: Create Event
  3. Slack: Send Message
  4. HTTP Request: POST to `http://skyoffice-gateway:3001/api/events`
     ```json
     { "npc": "scheduler", "type": "done", "data": {...} }
     ```
- Copy the Webhook URL from this flow

**MailOps Agent** (scheduled):
- Trigger: Schedule (e.g., `0 9 * * *`)
- Steps:
  1. Gmail: List Messages (INBOX, unread)
  2. AI: Summarize top 5 emails
  3. Slack: Send Message
  4. HTTP Request: POST to `http://skyoffice-gateway:3001/api/events`
     ```json
     { "npc": "mailops", "type": "done", "data": {...} }
     ```

### 3. Register Agents

Edit `apps/gateway/data/agents.json`:

```json
[
  {
    "agent": "scheduler",
    "npc": "scheduler",
    "webhookUrl": "http://sim:3000/api/v1/webhooks/catch/<your-webhook-id>"
  },
  {
    "agent": "mailops",
    "npc": "mailops",
    "webhookUrl": "http://sim:3000/api/v1/webhooks/catch/<your-webhook-id-or-empty>"
  }
]
```

Restart the gateway:
```bash
cd esprit/infra
docker compose restart gateway
```

### 4. Use the Application

1. Open http://localhost:8080
2. Click "Open Sim.ai" to build/edit flows
3. Click "Run" on an agent (Scheduler/MailOps)
4. Watch live status updates via Server-Sent Events (SSE)

## Architecture

The stack includes:

- **SkyOffice UI** - React-based virtual office interface
- **Gateway API** (Fastify/TypeScript) - Manages agent runs and real-time status
  - `POST /api/run/:agent` - Trigger an agent
  - `POST /api/events` - Receive progress updates from flows
  - `GET /api/stream?npc=` - SSE channel for real-time updates
- **Sim.ai** - AI agent workflow builder and runtime
  - Main app on port 3000
  - Realtime server on port 3002
  - PostgreSQL with pgvector for embeddings
- **Nginx Reverse Proxy** - Routes all traffic through http://localhost:8080

## Important Notes

### For Local Testing (MVP)
- **Security**: This stack is unsecured for local testing. Do NOT deploy to production without adding authentication.
- **LLM**: LiteLLM is included. Point Sim.ai AI steps to `http://litellm:4000` or use your own LLM provider.
- **OAuth**: Use Nango for brokered OAuth, or Sim.ai's built-in connectors.

### For Production
Before deploying:
1. Set strong values for `BETTER_AUTH_SECRET` and `ENCRYPTION_KEY`
2. Add authentication to `/api/*` endpoints
3. Protect `/studio/` with Nginx `auth_request`
4. Use HTTPS with proper SSL certificates
5. Review and configure rate limiting, CORS, CSP headers
6. Set up proper secrets management (not `.env` files)

## Troubleshooting

**Docker not running:**
```
❌ Error: Docker is not running
```
→ Start Docker Desktop and wait for it to be ready.

**Services not starting:**
```bash
cd esprit/infra
docker compose ps
docker compose logs <service-name>
```

**/studio doesn't load:**
- Ensure you're accessing http://localhost:8080/studio/ (with trailing slash)
- Check that the reverse proxy is running: `docker ps | grep skyoffice-proxy`
- Verify X-Frame-Options is set to SAMEORIGIN in nginx.conf

**SSE connection drops:**
- Confirm `proxy_buffering off` is set for `/api/stream` in nginx.conf
- Check that the gateway container is running: `docker ps | grep skyoffice-gateway`

**Database connection errors:**
- Wait for PostgreSQL to be fully initialized (check with `docker compose logs postgres`)
- Verify migrations completed: `docker compose logs sim-migrations`

**Out of memory:**
- Sim.ai requires at least 8GB of RAM
- Reduce memory limits in docker-compose.yml if needed
- Close other memory-intensive applications

## Documentation

- **Agent Guide**: [docs/agent.md](docs/agent.md)
- **Implementation Status**: [docs/implementation-status.md](docs/implementation-status.md)
- **Sim.ai Docs**: https://docs.sim.ai
