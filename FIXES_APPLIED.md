# Fixes Applied - November 8, 2025

## Issues Fixed

### 1. ✅ **502 Bad Gateway Error on `/studio/`**

**Root Cause:** OpenTelemetry instrumentation was trying to export traces to a non-existent remote endpoint (`https://telemetry.simstudio.ai/v1/traces`), causing 30-second timeouts that blocked all requests.

**Solution:** Disabled OpenTelemetry in the sim service by adding:
```yaml
environment:
  - NEXT_TELEMETRY_DISABLED=1
```

**Files Modified:**
- `esprit/infra/docker-compose.yml` - Added `NEXT_TELEMETRY_DISABLED=1` to sim service environment

**How to Verify:**
```bash
docker logs sim 2>&1 | grep -i "timeout"  # Should show NO timeout errors
curl http://localhost:8080/api/auth/sso/providers  # Should respond instantly
```

---

### 2. ✅ **Missing Authentication API Routes**

**Root Cause:** Nginx was routing all `/api/` requests to the gateway instead of authentication requests to the sim service.

**Solution:** Added a specific nginx location block for `/api/auth/` before the general `/api/` location to prioritize auth requests:

```nginx
location /api/auth/ {
  proxy_pass http://sim:3000/api/auth/;
  proxy_http_version 1.1;
  proxy_set_header Host $host;
  proxy_set_header X-Real-IP $remote_addr;
  proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  proxy_set_header X-Forwarded-Proto $scheme;
  proxy_buffering off;
  add_header Access-Control-Allow-Origin "$http_origin" always;
  add_header Access-Control-Allow-Credentials "true" always;
  add_header Access-Control-Allow-Headers "*" always;
  add_header Access-Control-Allow-Methods "GET,POST,OPTIONS" always;
  if ($request_method = 'OPTIONS') { return 204; }
}
```

**Important:** The correct auth endpoints use hyphens, not underscores:
- ✅ `/api/auth/sign-in/email` (correct)
- ❌ `/api/auth/signin` (wrong)
- ✅ `/api/auth/sign-up/email` (correct)
- ❌ `/api/auth/signup` (wrong)

**Files Modified:**
- `esprit/infra/nginx.conf` - Added `/api/auth/` location block

---

### 3. ✅ **Missing `/verify` Route Redirect**

**Root Cause:** After signup, the app redirects to `/verify` but this wasn't proxied to `/studio/verify`.

**Solution:** Added redirect in nginx:
```nginx
location = /verify { return 302 /studio/verify; }
```

**Files Modified:**
- `esprit/infra/nginx.conf` - Added verify redirect

---

## How to Use These Fixes

### Option 1: Fresh Start (Recommended)

```bash
cd /Users/dekai/Documents/Esprit-Hub
./scripts/start-full-stack-first-time.sh
```

Then verify all services are healthy:
```bash
./scripts/verify-stack-ready.sh
```

### Option 2: Restart Existing Stack

```bash
cd esprit
docker compose -f infra/docker-compose.yml down
docker compose -f infra/docker-compose.yml up -d --build
```

Then verify:
```bash
../../scripts/verify-stack-ready.sh
```

---

## Testing the Fixes

### 1. Test Authentication API
```bash
# Signup
curl -X POST http://localhost:8080/api/auth/sign-up/email \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!","name":"Test User"}'

# Login
curl -X POST http://localhost:8080/api/auth/sign-in/email \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!"}'
```

Expected: Instant response (no timeout errors)

### 2. Test Studio Login
1. Navigate to `http://localhost:8080/studio/login`
2. Enter credentials
3. Click "Sign in"

Expected: Form submits instantly, then redirects to dashboard

### 3. Test Dashboard Loading
1. After login, navigate to `http://localhost:8080/studio/workspace`

Expected: Dashboard loads with UI elements visible

---

## Environment Variables Summary

The following environment variables are now configured in `esprit/infra/docker-compose.yml`:

| Variable | Value | Purpose |
|----------|-------|---------|
| `NEXT_TELEMETRY_DISABLED` | `1` | Disables OpenTelemetry tracing to prevent timeouts |
| `NODE_ENV` | `production` | Production mode for sim service |
| `DATABASE_URL` | `postgresql://...` | PostgreSQL connection string |
| `BETTER_AUTH_URL` | `http://localhost:8080` | Auth service base URL |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:8080` | Client-facing app URL |

---

## Troubleshooting

### Issue: Still getting 502 errors after restart
**Solution:** Force rebuild the Docker image:
```bash
cd esprit
docker compose -f infra/docker-compose.yml down
docker rmi infra-sim  # Remove old image
docker compose -f infra/docker-compose.yml up -d --build
```

### Issue: Blank page on `/studio/workspace`
**Solution:** Hard refresh browser cache:
- Windows/Linux: `Ctrl+Shift+R`
- Mac: `Cmd+Shift+R`

Or clear browser storage:
1. Press `F12` to open DevTools
2. Go to "Application" tab
3. Click "Clear Site Data"
4. Refresh page

### Issue: Timeout errors still appear
**Solution:** Check if `NEXT_TELEMETRY_DISABLED=1` is in docker-compose.yml:
```bash
grep "NEXT_TELEMETRY_DISABLED" esprit/infra/docker-compose.yml
```

If not present, add it and rebuild.

---

## Files Modified

1. ✅ `esprit/infra/docker-compose.yml` - Added telemetry disable flag
2. ✅ `esprit/infra/nginx.conf` - Added all routing fixes:
   - `/api/auth/` location for authentication
   - `/api/workspaces`, `/api/workflows`, `/api/socket-token` for Sim.ai APIs
   - `/verify` redirect
   - `/workspace/*` → `/studio/workspace/*` redirect
   - WebSocket timeout settings for `/socket.io/`
   - Next.js asset timeout optimizations for `/_next/`
3. ✅ `scripts/verify-stack-ready.sh` - New health check script (created)
4. ✅ `client/src/components/HelperButtonGroup.tsx` - Button redirect logic
5. ✅ `COMPLETE_SETUP_GUIDE.md` - Comprehensive setup documentation (created)

---

---

### 4. ✅ **Workspace Path Redirect Missing**

**Root Cause:** Next.js client-side redirects were using `/workspace/` instead of `/studio/workspace/`, causing 404 errors.

**Solution:** Added Nginx redirect rule to catch bare `/workspace/*` paths and redirect to `/studio/workspace/*`:

```nginx
# Redirect /workspace/* to /studio/workspace/* (client-side redirects drop the base path)
location ~ ^/workspace/(.*)$ {
  return 302 /studio/workspace/$1;
}
```

**Files Modified:**
- `esprit/infra/nginx.conf` - Added workspace redirect rule

---

### 5. ✅ **WebSocket Connection Timeout**

**Root Cause:** WebSocket connections to the realtime server were timing out after the default 60 seconds.

**Solution:** Increased WebSocket-specific timeouts in Nginx:

```nginx
location /socket.io/ {
  # WebSocket-specific timeouts (keep connections alive)
  proxy_read_timeout 86400s;   # 24 hours
  proxy_send_timeout 86400s;   # 24 hours
  proxy_connect_timeout 300s;  # 5 minutes
}
```

**Files Modified:**
- `esprit/infra/nginx.conf` - Added WebSocket timeout settings

---

### 6. ✅ **Missing Sim.ai API Routes**

**Root Cause:** Nginx was routing all `/api/` requests to the gateway, but Sim.ai has its own API endpoints for workspaces, workflows, and socket tokens.

**Solution:** Added specific location blocks for Sim.ai API endpoints:

```nginx
location /api/workspaces { proxy_pass http://sim:3000/api/workspaces; }
location /api/workflows { proxy_pass http://sim:3000/api/workflows; }
location /api/socket-token { proxy_pass http://sim:3000/api/socket-token; }
```

**Files Modified:**
- `esprit/infra/nginx.conf` - Added Sim.ai API routes

---

### 7. ✅ **Next.js Large Chunk Loading Errors**

**Root Cause:** Next.js JavaScript bundles were timing out during transfer due to default Nginx proxy timeouts.

**Solution:** Increased timeouts for `/_next/` static assets:

```nginx
location /_next/ {
  proxy_read_timeout 300;
  proxy_buffering off;
  proxy_http_version 1.1;
  proxy_set_header Connection "";
}
```

**Files Modified:**
- `esprit/infra/nginx.conf` - Optimized Next.js asset serving

---

## Next Steps

1. **Run the full stack:** `./scripts/start-full-stack-first-time.sh`
2. **Verify it's ready:** `./scripts/verify-stack-ready.sh`
3. **Access the application:**
   - **Game Client**: http://localhost:5173
   - **Sim.ai Studio**: http://localhost:8080/studio/
   - **Sim.ai Workspace**: http://localhost:8080/studio/workspace
   - **Sim.ai Login**: http://localhost:8080/studio/login
4. **No more issues!** ✨

**Note:** All URLs starting with `/workspace` (without `/studio/`) will automatically redirect to `/studio/workspace`.


