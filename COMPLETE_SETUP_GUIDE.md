# Complete Setup Guide - Esprit-Hub with Sim.ai

Last Updated: November 8, 2025

## 🚀 Quick Start

### Start Everything
```bash
cd /Users/dekai/Documents/Esprit-Hub
./scripts/start-full-stack-first-time.sh
```

### Access the Application
- **Virtual Office (Game)**: http://localhost:5173
- **Sim.ai Studio**: http://localhost:8080/studio/
- **Sim.ai Workspace**: http://localhost:8080/studio/workspace
- **Login Page**: http://localhost:8080/studio/login

---

## 📋 Prerequisites

- **Docker Desktop** 4.x+ (running)
- **Node.js** 20.x+
- **Python 3** (for setup scripts)
- **OpenSSL** (for generating secrets)

---

## 🛠 First-Time Setup

### 1. Clone and Configure

```bash
git clone https://github.com/improdead/Esprit-Hub.git
cd Esprit-Hub/esprit
cp .env.example .env
```

### 2. Generate Secrets

```bash
# Generate auth secret
openssl rand -hex 32

# Generate encryption key
openssl rand -hex 32
```

### 3. Edit `.env`

```bash
BETTER_AUTH_SECRET=<paste-first-secret-here>
ENCRYPTION_KEY=<paste-second-secret-here>
```

### 4. Start Everything

```bash
cd /Users/dekai/Documents/Esprit-Hub
./scripts/start-full-stack-first-time.sh
```

This will:
- ✅ Build and start Docker stack (Sim.ai, PostgreSQL, Redis, Nginx)
- ✅ Run database migrations
- ✅ Start Colyseus game server
- ✅ Start Vite dev server for client

### 5. Verify Everything is Ready

```bash
./scripts/verify-stack-ready.sh
```

---

## 🔗 Important URLs

### ✅ Correct URLs (Use These!)

| Service | URL | Description |
|---------|-----|-------------|
| Game Client | http://localhost:5173 | Virtual office game |
| Sim.ai Login | http://localhost:8080/studio/login | Sign in page |
| Sim.ai Signup | http://localhost:8080/studio/signup | Register account |
| Sim.ai Workspace | http://localhost:8080/studio/workspace | Your workspaces |
| Sim.ai Dashboard | http://localhost:8080/studio/workspace/{workspace-id}/w/{workflow-id} | Workflow editor |

### ❌ Wrong URLs (Don't Use These!)

These will automatically redirect to the correct URLs:

| Wrong URL | Redirects To |
|-----------|--------------|
| http://localhost:8080/workspace | → http://localhost:8080/studio/workspace |
| http://localhost:8080/login | → http://localhost:8080/studio/login |
| http://localhost:8080/signup | → http://localhost:8080/studio/signup |
| http://localhost:8080/verify | → http://localhost:8080/studio/verify |

---

## 🎮 Using the Application

### 1. Create Your Account

1. Go to http://localhost:8080/studio/signup
2. Enter your name, email, and password
3. Click "Sign up"
4. You'll be redirected to your workspace

### 2. Access Your Workspace

After login, you'll automatically be redirected to:
```
http://localhost:8080/studio/workspace/{your-workspace-id}/w/{your-workflow-id}
```

### 3. Open Agent Builder from Game

1. Go to http://localhost:5173 (game client)
2. Look for the **Build/Wrench icon** in the bottom-right corner
3. Click it to open Sim.ai Studio
4. If logged in → Opens workspace
5. If not logged in → Opens login page

---

## 🔧 All Fixes Applied

### Fix 1: WebSocket Timeout Issues
**Added**: Extended WebSocket timeouts in Nginx
```nginx
location /socket.io/ {
  proxy_read_timeout 86400s;  # 24 hours
  proxy_send_timeout 86400s;  # 24 hours
  proxy_connect_timeout 300s; # 5 minutes
}
```

### Fix 2: Workspace Path Redirects
**Added**: Automatic redirects for missing `/studio/` prefix
```nginx
location ~ ^/workspace/(.*)$ {
  return 302 /studio/workspace/$1;
}
```

### Fix 3: Sim.ai API Routes
**Added**: Proper routing for Sim.ai API endpoints
```nginx
location /api/auth/ { proxy_pass http://sim:3000/api/auth/; }
location /api/workspaces { proxy_pass http://sim:3000/api/workspaces; }
location /api/workflows { proxy_pass http://sim:3000/api/workflows; }
location /api/socket-token { proxy_pass http://sim:3000/api/socket-token; }
```

### Fix 4: OpenTelemetry Timeout
**Added**: Disabled telemetry to prevent request timeouts
```yaml
environment:
  - NEXT_TELEMETRY_DISABLED=1
```

### Fix 5: Next.js Chunk Loading
**Added**: Increased timeouts for large JavaScript files
```nginx
location /_next/ {
  proxy_read_timeout 300;
  proxy_buffering off;
}
```

---

## 📝 Common Commands

### Start Everything
```bash
cd /Users/dekai/Documents/Esprit-Hub
./scripts/start-full-stack-first-time.sh
```

### Stop Everything
```bash
# Stop Docker services
cd esprit
docker compose -f infra/docker-compose.yml down

# Stop game server/client (Ctrl+C in terminal)
```

### Restart Docker Stack Only
```bash
cd esprit
docker compose -f infra/docker-compose.yml restart
```

### Rebuild Docker Stack
```bash
cd esprit
docker compose -f infra/docker-compose.yml down
docker compose -f infra/docker-compose.yml up -d --build
```

### View Docker Logs
```bash
cd esprit

# All services
docker compose -f infra/docker-compose.yml logs -f

# Specific service
docker logs sim -f
docker logs sim-realtime -f
docker logs postgres -f
```

### Check Docker Status
```bash
cd esprit
docker compose -f infra/docker-compose.yml ps
```

---

## 🐛 Troubleshooting

### Issue: 502 Bad Gateway on `/studio/`

**Solution:**
```bash
# Restart Nginx
cd esprit
docker compose -f infra/docker-compose.yml restart reverse-proxy

# Check sim logs
docker logs sim

# If still broken, rebuild
docker compose -f infra/docker-compose.yml down
docker compose -f infra/docker-compose.yml up -d --build
```

### Issue: White Screen on Workspace Page

**Solution:**
1. Hard refresh browser: **Cmd+Shift+R** (Mac) or **Ctrl+Shift+R** (Windows/Linux)
2. Clear browser cache:
   - Press **F12** → **Application** tab → **Clear Site Data**
3. Try incognito mode
4. Check Console for errors (F12 → Console)

### Issue: Button Redirects to `/workspace` Instead of `/studio/workspace`

**Solution:**
1. Hard refresh game client at http://localhost:5173
2. Clear browser cache
3. Restart client dev server:
```bash
cd client
pkill -f vite
npm run dev
```

### Issue: "Failed to load resource" Errors

**Solution:**
Check which API endpoint is failing:
```bash
# Test workspaces
curl http://localhost:8080/api/workspaces

# Test workflows  
curl http://localhost:8080/api/workflows

# Test auth
curl http://localhost:8080/api/auth/sso/providers
```

If any return 404, check Nginx configuration.

### Issue: WebSocket Connection Stuck

**Solution:**
```bash
# Restart realtime server
cd esprit
docker compose -f infra/docker-compose.yml restart sim-realtime

# Check logs
docker logs sim-realtime
```

---

## 📦 What's Running

After starting everything, you'll have:

| Service | Port | Container Name | Purpose |
|---------|------|----------------|---------|
| Nginx Proxy | 8080 | skyoffice-proxy | Routes all traffic |
| Sim.ai App | (internal) | sim | Next.js application |
| Sim.ai Realtime | (internal) | sim-realtime | WebSocket server |
| PostgreSQL | (internal) | postgres | Database |
| Redis | (internal) | redis | Cache |
| Colyseus | 2567 | (host) | Game server |
| Vite Client | 5173 | (host) | Game client |

---

## 🔐 Environment Variables

### Required in `esprit/.env`:
```bash
BETTER_AUTH_SECRET=<32-char-hex>    # Auth JWT signing
ENCRYPTION_KEY=<32-char-hex>        # Data encryption
```

### Optional:
```bash
COPILOT_API_KEY=                    # For AI copilot features
SIM_AGENT_API_URL=                  # For AI agent execution
OLLAMA_URL=http://localhost:11434   # For local LLMs
```

---

## 📚 Additional Documentation

- **Main README**: `/README.md`
- **Sim.ai Setup**: `/esprit/README.md`
- **Running Locally**: `/docs/LOCAL_STACK.md`
- **Game Only**: `/docs/RUNNING_THE_APP.md`
- **All Fixes**: `/FIXES_APPLIED.md`
- **Button Changes**: `/BUTTON_REDIRECT_CHANGES.md`

---

## 🎯 Next Steps

1. ✅ Start the stack: `./scripts/start-full-stack-first-time.sh`
2. ✅ Create an account: http://localhost:8080/studio/signup
3. ✅ Build your first workflow in Sim.ai Studio
4. ✅ Join the virtual office game: http://localhost:5173
5. ✅ Click the Build icon to open your workspace from the game

---

## ❓ Getting Help

If you encounter issues:

1. Check the troubleshooting section above
2. Run the verify script: `./scripts/verify-stack-ready.sh`
3. Check Docker logs: `docker logs sim` or `docker logs sim-realtime`
4. Open browser console (F12) and look for errors
5. Review the Network tab (F12 → Network) for failed requests

---

**Everything working?** You're all set! 🎉

Access your workspace at: http://localhost:8080/studio/workspace

