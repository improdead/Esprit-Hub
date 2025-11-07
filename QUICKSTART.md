# Esprit-Hub Quick Start Guide

## What is Esprit-Hub?

Esprit-Hub combines a virtual office interface (SkyOffice) with AI agent workflows (Sim.ai) to create an immersive collaborative workspace with intelligent automation.

## Prerequisites

✅ **Docker Desktop MUST be installed and running**
- Download from: https://www.docker.com/products/docker-desktop/
- Minimum 8GB RAM available
- ~10GB free disk space

## Running the Application

### Step 1: Navigate to the esprit folder

```bash
cd esprit
```

### Step 2: Start the application

**Option A: Use the startup script (recommended)**
```bash
./start.sh
```

**Option B: Manual start**
```bash
cd infra
docker compose up -d --build
```

### Step 3: Wait for services to start

First-time startup takes 5-10 minutes while Docker:
- Downloads base images
- Builds custom images
- Initializes databases
- Runs migrations

### Step 4: Access the application

Open your browser to:
- **Main App**: http://localhost:8080
- **Sim.ai Studio**: http://localhost:8080/studio/

## What's Running?

Your local environment includes:

| Service | Description | Internal Port |
|---------|-------------|---------------|
| **reverse-proxy** | Nginx routing all traffic | 8080 (public) |
| **skyoffice** | Virtual office UI | 80 |
| **gateway** | Agent orchestration API | 3001 |
| **sim** | Sim.ai workflow builder | 3000 |
| **sim-realtime** | WebSocket server | 3002 |
| **postgres** | Database with pgvector | 5432 |
| **redis** | Cache | 6379 |
| **litellm** | LLM proxy | 4000 |
| **nango** | OAuth broker | 3003 |

## Stopping the Application

```bash
cd esprit/infra
docker compose down
```

## Next Steps

1. **Set up authentication** - Create an admin account at http://localhost:8080/studio/
2. **Create your first agent** - Follow the guide in `esprit/README.md`
3. **Configure integrations** - Connect Google Calendar, Slack, Gmail, etc.
4. **Test the workflow** - Run agents from the SkyOffice UI

## Need Help?

- **Full documentation**: See `esprit/README.md`
- **Agent creation guide**: See `esprit/docs/agent.md`
- **Sim.ai documentation**: https://docs.sim.ai
- **Logs**: `docker compose -f esprit/infra/docker-compose.yml logs -f`

## Common Issues

**"Docker is not running"**
→ Start Docker Desktop and wait for the whale icon to stop animating

**"Port 8080 already in use"**
→ Stop other services using port 8080, or edit `esprit/infra/docker-compose.yml` to use a different port

**"Out of memory"**
→ Increase Docker Desktop memory limit to 8GB+ in Settings → Resources

**Services won't start**
→ Check logs: `docker compose -f esprit/infra/docker-compose.yml logs`
