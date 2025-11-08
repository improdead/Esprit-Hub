# Routing and Redirect Issues

## Issue Summary

**Status**: Active Bug
**Components**: Authentication Flow, URL Routing
**Impact**: Users redirected to incorrect paths after login/signup
**Severity**: Medium - Requires nginx workaround, affects user experience

---

## Problem Overview

### Issue 1: Incorrect Post-Auth Redirect Path

**Expected Behavior**: After authentication, users should be redirected to `/studio/workspace`

**Actual Behavior**: Users are redirected to `/workspace`, requiring nginx rewrite rule as workaround

**Root Cause**: Hardcoded redirect paths in authentication components use `/workspace` instead of `/studio/workspace`

### Issue 2: localhost:3000 Placeholder References

**Observed**: UI shows localhost:3000 in various places

**Cause**: Docker Compose default fallback values and placeholder agent configurations

---

## Architecture Context

### Port Configuration

The Esprit-Hub stack uses the following ports:

- **Port 8080**: Nginx proxy (main entry point for full stack)
  - Routes to `/studio/*` → Sim.ai application
  - Routes to other paths → Skyoffice/Gateway

- **Port 5713** (approx): Skyoffice application

- **Port 3000**: Sim.ai Next.js dev server (standalone mode only)
  - Only used when running Sim.ai independently
  - Should NOT be used in full stack deployment

### URL Structure

In the full stack deployment:
- ✅ Correct: `http://localhost:8080/studio/workspace`
- ❌ Incorrect: `http://localhost:8080/workspace`
- ❌ Wrong: `http://localhost:3000/*` (bypasses nginx)

---

## Issue 1: Authentication Redirect Paths

### Affected Files

All authentication forms hardcode `/workspace` instead of `/studio/workspace`:

#### 1. Signup Form
**File**: `esprit/external/sim/apps/sim/app/(auth)/signup/signup-form.tsx`

**Line 394**: SSO Login Button
```tsx
callbackURL={redirectUrl || '/workspace'}
```

**Line 554**: Social Login Buttons
```tsx
callbackURL={redirectUrl || '/workspace'}
```

**Line 559**: SSO Login Button
```tsx
callbackURL={redirectUrl || '/workspace'}
```

#### 2. Login Form
**File**: `esprit/external/sim/apps/sim/app/(auth)/login/login-form.tsx`

**Line 110**: Default callback URL state
```tsx
const [callbackUrl, setCallbackUrl] = useState('/workspace')
```

**Line 221**: Fallback callback URL
```tsx
const safeCallbackUrl = validateCallbackUrl(callbackUrl) ? callbackUrl : '/workspace'
```

#### 3. Social Login Buttons Component
**File**: `esprit/external/sim/apps/sim/app/(auth)/components/social-login-buttons.tsx`

**Line 20**: Default parameter
```tsx
callbackURL = '/workspace'
```

#### 4. SSO Form
**File**: `esprit/external/sim/apps/sim/app/(auth)/sso/sso-form.tsx`

**Line 61**: Default callback URL state
```tsx
const [callbackUrl, setCallbackUrl] = useState('/workspace')
```

**Line 147**: Fallback callback URL
```tsx
const safeCallbackUrl = validateCallbackUrl(callbackUrl) ? callbackUrl : '/workspace'
```

### Current Workaround

**File**: `esprit/infra/nginx.conf`

**Lines 47-50**: Nginx rewrite rule
```nginx
# Redirect /workspace/* to /studio/workspace/* (client-side redirects drop the base path)
location ~ ^/workspace/(.*)$ {
  return 302 /studio/workspace/$1;
}
```

**Problem with this approach:**
- Band-aid fix that masks the root cause
- Adds unnecessary redirect hop (performance)
- Client receives 302 redirect instead of going directly to correct path
- Confusing for developers debugging routing issues

---

## Issue 2: Placeholder Agents and localhost:3000

### The Two Placeholder Agents

**Scheduler** and **MailOps** are example agents included in the system.

**Definition Locations:**

#### Skyoffice Configuration
**File**: `esprit/apps/skyoffice/src/App.tsx`

**Lines 6-7**:
```typescript
{ id: 'scheduler', name: 'Scheduler' },
{ id: 'mailops', name: 'MailOps' },
```

#### Gateway Data
**File**: `esprit/apps/gateway/data/agents.json`

```json
[
  {
    "agent": "scheduler",
    "npc": "scheduler",
    "webhookUrl": "http://sim/api/v1/webhooks/catch/<replace>"
  },
  {
    "agent": "mailops",
    "npc": "mailops",
    "webhookUrl": "http://sim/api/v1/webhooks/catch/<replace-or-empty-if-cron>"
  }
]
```

**Purpose**: These are placeholder agents with incomplete webhook URLs. Users need to:
1. Create workflows in Sim.ai
2. Get the actual webhook URLs from created workflows
3. Replace the `<replace>` placeholders with real webhook IDs

### localhost:3000 References

#### Docker Compose Defaults
**File**: `esprit/external/sim/docker-compose.local.yml`

**Lines 15-16, 43-44**:
```yaml
- BETTER_AUTH_URL=${NEXT_PUBLIC_APP_URL:-http://localhost:3000}
- NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL:-http://localhost:3000}
```

**File**: `esprit/external/sim/docker-compose.prod.yml`

**Lines 14-15, 48-49**:
```yaml
- BETTER_AUTH_URL=${NEXT_PUBLIC_APP_URL:-http://localhost:3000}
- NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL:-http://localhost:3000}
```

**Why this exists:**
- Fallback default when environment variables not set
- Used when running Sim.ai in standalone mode (without full stack)
- In full stack mode, proper environment variables should override these defaults

#### Documentation References
**File**: `docs/LOCAL_STACK.md`

Contains references to localhost:3000 in setup instructions for standalone Sim.ai development.

---

## Recommended Fixes

### Fix 1: Update All Redirect Paths (RECOMMENDED)

Change all instances of `'/workspace'` to `'/studio/workspace'` in auth components:

**Files to modify:**
1. `esprit/external/sim/apps/sim/app/(auth)/signup/signup-form.tsx` (3 locations)
2. `esprit/external/sim/apps/sim/app/(auth)/login/login-form.tsx` (2 locations)
3. `esprit/external/sim/apps/sim/app/(auth)/components/social-login-buttons.tsx` (1 location)
4. `esprit/external/sim/apps/sim/app/(auth)/sso/sso-form.tsx` (2 locations)

**Total changes**: 8 locations

**Example change:**
```diff
- callbackURL={redirectUrl || '/workspace'}
+ callbackURL={redirectUrl || '/studio/workspace'}
```

### Fix 2: Remove Nginx Workaround (After Fix 1)

Once auth components are fixed, the nginx redirect can be removed:

**File**: `esprit/infra/nginx.conf`

**Remove lines 47-50:**
```nginx
# This can be removed after auth redirect paths are fixed
# location ~ ^/workspace/(.*)$ {
#   return 302 /studio/workspace/$1;
# }
```

### Fix 3: Environment Variable Configuration

Ensure proper environment variables are set for full stack deployment:

**For Sim.ai in full stack mode:**
```bash
NEXT_PUBLIC_APP_URL=http://localhost:8080/studio
BETTER_AUTH_URL=http://localhost:8080/studio
```

**For Skyoffice/Gateway:**
```bash
VITE_STUDIO_URL=http://localhost:8080/studio/
```

### Fix 4: Placeholder Agent Documentation

Consider adding a setup guide explaining:
1. How to create workflows for Scheduler and MailOps agents
2. How to get webhook URLs from workflows
3. How to update agents.json with real webhook URLs
4. Or remove these placeholder agents if not needed

---

## Testing Checklist

After implementing fixes:

### Redirect Path Testing
- [ ] Sign up with email → redirects to `/studio/workspace`
- [ ] Log in with email → redirects to `/studio/workspace`
- [ ] Social login (Google, GitHub) → redirects to `/studio/workspace`
- [ ] SSO login → redirects to `/studio/workspace`
- [ ] No nginx 302 redirects visible in network tab
- [ ] Verify nginx rewrite rule is removed (or commented out)

### Environment Variable Testing
- [ ] Sim.ai running on port 8080 (behind nginx)
- [ ] No components trying to reach localhost:3000 in full stack mode
- [ ] All internal links use relative paths or correct absolute paths
- [ ] Auth callback URLs use correct base path

### Agent Configuration
- [ ] Scheduler and MailOps agents visible in Skyoffice
- [ ] Webhook placeholder instructions clear to users
- [ ] Or agents removed if not needed

---

## Impact Analysis

### Before Fix
1. User signs up/logs in
2. Auth redirects to `/workspace`
3. Browser requests `http://localhost:8080/workspace`
4. Nginx catches and sends 302 redirect to `/studio/workspace`
5. Browser makes second request to `http://localhost:8080/studio/workspace`
6. User sees correct page (after delay)

### After Fix
1. User signs up/logs in
2. Auth redirects to `/studio/workspace`
3. Browser requests `http://localhost:8080/studio/workspace`
4. User sees correct page immediately

**Benefits:**
- ✅ One less HTTP round trip
- ✅ Cleaner network waterfall
- ✅ Correct URL in browser from start
- ✅ Simpler nginx configuration
- ✅ More maintainable codebase

---

## Related Configuration Files

### Nginx Configuration
- `esprit/infra/nginx.conf` - Main proxy configuration

### Docker Compose
- `esprit/external/sim/docker-compose.local.yml` - Local development
- `esprit/external/sim/docker-compose.prod.yml` - Production deployment

### Environment Variables
- `esprit/external/sim/.env.example` - Example environment configuration
- `esprit/.env` - Actual environment (not in git)

### Documentation
- `docs/LOCAL_STACK.md` - Full stack setup guide
- `docs/DEPLOYMENT.md` - Deployment instructions

---

## Notes

- The `/studio` base path is required because multiple applications (Sim.ai, Skyoffice, Gateway) run behind the same nginx proxy
- Standalone Sim.ai development (without full stack) can still use port 3000 directly
- The nginx workaround was likely added when the redirect issue was discovered but the root cause wasn't fixed
- This is a good example of "configuration drift" where quick fixes accumulate instead of addressing root causes

---

**Last Updated**: 2025-11-08
**Reported By**: User testing
**Investigated By**: Claude Code Analysis
