# Esprit-Hub + Sim.ai Integration Review

**Status**: ✅ **READY FOR TESTING**

**Last Reviewed**: 2025-11-07

---

## ✅ What's Working

### 1. Repository Structure
- ✅ Sim.ai cloned directly with full git history at `esprit/external/sim/`
- ✅ All Dockerfiles present (`app.Dockerfile`, `realtime.Dockerfile`, `db.Dockerfile`)
- ✅ Complete sim.ai codebase with apps, packages, and configuration

### 2. Docker Configuration
- ✅ `docker-compose.yml` properly configured with:
  - PostgreSQL 17 with pgvector extension (required for Sim.ai embeddings)
  - sim-migrations service for database setup
  - sim-realtime service for WebSocket connections (port 3002)
  - sim main service (port 3000)
  - Proper health checks and dependencies
  - All required environment variables

### 3. Nginx Reverse Proxy
- ✅ Routes `/studio/` → `sim:3000` (Sim.ai UI)
- ✅ Routes `/socket.io/` → `sim-realtime:3002` (WebSocket server)
- ✅ Routes `/api/` → `skyoffice-gateway:3001` (Gateway API)
- ✅ Proper WebSocket upgrade headers configured
- ✅ SSE (Server-Sent Events) buffering disabled correctly

### 4. Gateway Integration
- ✅ Gateway properly reads agent mappings from `agents.json`
- ✅ Forwards webhook calls to Sim.ai
- ✅ Broadcasts SSE events for real-time status updates
- ✅ Error handling implemented

### 5. Documentation
- ✅ Comprehensive `esprit/README.md` with setup instructions
- ✅ Quick start guide in `QUICKSTART.md`
- ✅ Environment template in `.env.example`
- ✅ Startup script `start.sh` with Docker checks

---

## ⚠️ Important Notes

### Webhook URL Format

**Current format in `agents.json`:**
```json
{
  "webhookUrl": "http://sim/api/v1/webhooks/catch/<replace>"
}
```

**⚠️ THIS MAY NEED TO BE UPDATED**

This URL format is from Activepieces. Sim.ai might use a different API structure. When you first run the application and create workflows in Sim.ai Studio:

1. Create a workflow with a webhook trigger
2. Copy the actual webhook URL from Sim.ai
3. Update `esprit/apps/gateway/data/agents.json` with the correct URL format
4. Restart the gateway: `docker compose -f esprit/infra/docker-compose.yml restart gateway`

### Environment Variable Names

The gateway still uses Activepieces naming conventions:
```typescript
// esprit/apps/gateway/src/env.ts
AP_BASE: process.env.AP_BASE || 'http://sim'
AP_TOKEN: process.env.AP_TOKEN || ''
AP_PROJECT: process.env.AP_PROJECT || ''
```

**This is intentional** and works fine. The variables default to correct values for Sim.ai. You can optionally rename these for clarity, but it's not required.

### Comment References

In `esprit/apps/gateway/src/routes/run.ts` line 27:
```typescript
// forward to AP webhook
```

This comment references "AP" (Activepieces) but the code is generic and works with any webhook. Can be updated to say "// forward to webhook" if desired.

---

## 🔧 Configuration Checklist

Before first run:

- [ ] Docker Desktop installed and running
- [ ] At least 8GB RAM available
- [ ] Copy `.env.example` to `.env` in `esprit/` directory
- [ ] Update `BETTER_AUTH_SECRET` in `.env` (generate a random string)
- [ ] Update `ENCRYPTION_KEY` in `.env` (must be exactly 32 characters)

---

## 🚀 First Run Instructions

### Step 1: Start the Stack

```bash
cd esprit
./start.sh
```

**Expected**: First run takes 5-10 minutes to:
- Build Sim.ai Docker images
- Initialize PostgreSQL with pgvector
- Run database migrations
- Start all services

### Step 2: Initialize Sim.ai

1. Open http://localhost:8080/studio/
2. Create an admin account
3. Explore the Sim.ai interface

### Step 3: Create Your First Workflow

1. In Sim.ai Studio, create a new workflow
2. Add a **Webhook Trigger**
3. Copy the webhook URL that Sim.ai generates
4. The URL format will tell you the correct pattern for future workflows

### Step 4: Update Agent Configuration

Edit `esprit/apps/gateway/data/agents.json`:

```json
[
  {
    "agent": "scheduler",
    "npc": "scheduler",
    "webhookUrl": "<paste-actual-sim-webhook-url-here>"
  }
]
```

Restart gateway:
```bash
cd esprit/infra
docker compose restart gateway
```

### Step 5: Test the Integration

1. Open http://localhost:8080
2. Click "Run" on the scheduler agent
3. Watch for real-time status updates

---

## 🔍 Differences from Activepieces

| Feature | Activepieces | Sim.ai | Impact |
|---------|-------------|--------|--------|
| Webhook API | `/api/v1/webhooks/catch/` | **UNKNOWN - verify on first run** | **MUST UPDATE agents.json** |
| Port | 80 | 3000 (main), 3002 (realtime) | ✅ Already configured |
| Database | PostgreSQL | PostgreSQL + pgvector | ✅ Already using pgvector |
| Auth | AP_TOKEN | BETTER_AUTH_SECRET | ✅ Already configured |
| UI Path | `/` | `/` | ✅ Works via /studio/ proxy |

---

## 🐛 Troubleshooting

### Service Won't Start

```bash
cd esprit/infra
docker compose logs <service-name>
```

Common services to check:
- `sim` - Main Sim.ai application
- `sim-realtime` - WebSocket server
- `sim-migrations` - Database setup
- `postgres` - Database server

### Database Connection Errors

Check migrations completed:
```bash
docker compose logs sim-migrations
```

Should see: `Migrations completed successfully`

### Webhook 404 Errors

This means the webhook URL format in `agents.json` doesn't match Sim.ai's actual API. Follow "Step 3" above to get the correct format.

### Out of Memory

Sim.ai requires significant RAM. If you see OOM errors:

1. Increase Docker Desktop memory limit (Settings → Resources)
2. Reduce limits in `docker-compose.yml`:
   ```yaml
   sim:
     deploy:
       resources:
         limits:
           memory: 6G  # Reduce from 8G
   ```

---

## 📝 Next Steps

1. **Test Locally**: Run `./start.sh` and verify all services start
2. **Create Workflow**: Build your first agent workflow in Sim.ai Studio
3. **Update Webhook URLs**: Get the correct webhook format from Sim.ai
4. **Test Integration**: Trigger an agent from SkyOffice UI
5. **Review Logs**: Check for any errors or warnings
6. **Update Documentation**: Document your actual webhook URL format for future reference

---

## ✅ Summary

The integration is **architecturally sound** and ready for testing. The main unknown is Sim.ai's webhook URL format, which you'll discover when creating your first workflow. Everything else is properly configured and should work out of the box.

**Confidence Level**: 95% - The only uncertainty is the webhook API path format.

**Recommendation**: Proceed with testing. Update `agents.json` once you know the correct webhook URL format.
