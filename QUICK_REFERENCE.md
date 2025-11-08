# Quick Reference - Esprit-Hub

## 🚀 Start Commands

```bash
# Start everything (first time)
./scripts/start-full-stack-first-time.sh

# Stop everything
cd esprit && docker compose -f infra/docker-compose.yml down
# Then Ctrl+C in terminal running game server

# Restart Docker only
cd esprit && docker compose -f infra/docker-compose.yml restart

# Rebuild Docker
cd esprit && docker compose -f infra/docker-compose.yml down
docker compose -f infra/docker-compose.yml up -d --build
```

---

## 🔗 URLs

| What | URL |
|------|-----|
| **Virtual Office** | http://localhost:5173 |
| **Sim.ai Login** | http://localhost:8080/studio/login |
| **Sim.ai Workspace** | http://localhost:8080/studio/workspace |

**Note:** URLs with `/workspace` (no `/studio/`) redirect automatically.

---

## 🐛 Quick Fixes

### White Screen?
```bash
# Hard refresh browser
Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows/Linux)
```

### 502 Error?
```bash
cd esprit
docker compose -f infra/docker-compose.yml restart reverse-proxy
docker logs sim  # Check for errors
```

### Button Wrong URL?
```bash
# Restart client dev server
cd client
pkill -f vite
npm run dev
# Then hard refresh browser
```

### WebSocket Issues?
```bash
cd esprit
docker compose -f infra/docker-compose.yml restart sim-realtime
```

---

## 📝 Check Status

```bash
# Docker containers
cd esprit && docker compose -f infra/docker-compose.yml ps

# Sim logs
docker logs sim -f

# Realtime logs
docker logs sim-realtime -f

# Health check
./scripts/verify-stack-ready.sh
```

---

## 📚 Full Documentation

- **Complete Guide**: `COMPLETE_SETUP_GUIDE.md`
- **All Fixes**: `FIXES_APPLIED.md`
- **Main README**: `README.md`

