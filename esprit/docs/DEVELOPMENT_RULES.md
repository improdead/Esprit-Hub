# Development Rules & Guidelines
**How to Develop Safely Without Breaking Things**

**Last Updated**: 2025-11-07

---

## 🎯 Golden Rules

### **Rule #1: Never Modify Sim.ai Code**

**❌ DON'T:**
- Edit files in `esprit/external/sim/`
- Modify Sim.ai's database schema
- Change Sim.ai's environment variables
- Fork or patch Sim.ai source code

**✅ DO:**
- Use Sim.ai's public API
- Subscribe to Sim.ai's webhooks
- Embed Sim.ai's UI via iframe
- Read Sim.ai's database (read-only queries OK for debugging)

**Why?**
- Sim.ai is updated regularly from GitHub
- Our modifications would be overwritten on `git pull`
- We lose the ability to upgrade Sim.ai
- Sim.ai might break our custom changes

**If you need Sim.ai to do something it doesn't:**
1. Check if there's an API endpoint
2. Check if you can use webhooks
3. Open an issue on Sim.ai's GitHub
4. Work around it in the Gateway service

---

### **Rule #2: All Integration Logic Goes in Gateway**

**❌ DON'T:**
- Put Sim.ai API calls in the frontend
- Store Sim.ai credentials in the frontend
- Connect frontend directly to Sim.ai database

**✅ DO:**
- Put all Sim.ai integration in `gateway/src/services/sim-client.ts`
- Use Gateway as the single point of communication with Sim.ai
- Frontend only talks to Gateway, never directly to Sim.ai

**Why?**
- Keeps API keys secure (never exposed to browser)
- Easier to test and debug
- Single source of truth for Sim.ai interactions
- Can add rate limiting, caching, error handling in one place

**Example:**
```typescript
// ❌ BAD - Frontend directly calling Sim.ai
const SimAIWorkflow = () => {
  const triggerWorkflow = async () => {
    await fetch('http://sim:3000/api/workflows/trigger', {
      headers: { 'Authorization': `Bearer ${simApiKey}` } // EXPOSED!
    })
  }
}

// ✅ GOOD - Frontend calls Gateway
const SimAIWorkflow = () => {
  const triggerWorkflow = async () => {
    await fetch('/api/run/my-agent') // Gateway handles auth
  }
}
```

---

### **Rule #3: Use Database Migrations for Schema Changes**

**❌ DON'T:**
- Manually run SQL commands in production
- Edit the database schema directly via psql
- Create tables without migrations

**✅ DO:**
- Create a migration file for every schema change
- Test migrations locally before deploying
- Keep migrations reversible (add DOWN migration)
- Version control all migrations

**How to create a migration:**

```bash
# 1. Create migration file
cd esprit/apps/gateway
touch migrations/001_add_npcs_table.sql

# 2. Write UP migration
cat > migrations/001_add_npcs_table.sql << EOF
-- Migration: Add NPCs table
-- Created: 2025-11-07

CREATE TABLE npcs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  -- ... rest of schema
);

-- Rollback command (if needed):
-- DROP TABLE npcs;
EOF

# 3. Test migration
docker compose exec postgres psql -U postgres -d simstudio -f /migrations/001_add_npcs_table.sql

# 4. Verify
docker compose exec postgres psql -U postgres -d simstudio -c "\d npcs"
```

**Migration Checklist:**
- [ ] Migration has clear comment explaining what it does
- [ ] Tested on local database
- [ ] Includes indexes for foreign keys
- [ ] Includes rollback instructions
- [ ] Doesn't break existing Sim.ai tables
- [ ] Committed to git

---

### **Rule #4: Never Commit Sensitive Data**

**❌ DON'T:**
- Commit `.env` files with real credentials
- Commit API keys in code
- Commit database dumps with user data
- Commit screenshots with sensitive info

**✅ DO:**
- Use `.env.example` with placeholder values
- Store secrets in environment variables
- Use `.gitignore` to exclude sensitive files
- Use placeholders in documentation

**Sensitive data includes:**
- API keys (Sim.ai, OpenAI, etc.)
- Database passwords
- JWT secrets
- OAuth client secrets
- User emails or personal data

**Check before committing:**
```bash
# Search for potential secrets
git diff | grep -i "api.key\|secret\|password"

# Check what's staged
git diff --cached

# Remove file from git if accidentally added
git rm --cached .env
```

---

### **Rule #5: Test Locally Before Pushing**

**❌ DON'T:**
- Push code that doesn't compile
- Push without testing basic functionality
- Push and hope it works in production

**✅ DO:**
- Run `./start.sh` and verify all services start
- Test your changes in the browser
- Check the Gateway logs for errors
- Verify WebSocket connections work
- Test with multiple NPCs

**Pre-push checklist:**
- [ ] Code compiles without errors
- [ ] No TypeScript errors
- [ ] All services start successfully
- [ ] Manual testing completed
- [ ] No console errors in browser
- [ ] WebSocket connects successfully
- [ ] Database migrations applied

**Quick test commands:**
```bash
# Check if services are healthy
cd esprit/infra && docker compose ps

# View logs for errors
docker compose logs gateway | grep -i error
docker compose logs sim | grep -i error

# Test API endpoint
curl http://localhost:8080/api/npcs

# Check database
docker compose exec postgres psql -U postgres -d simstudio -c "SELECT COUNT(*) FROM npcs"
```

---

## 📂 File Organization Rules

### **Where to Put New Code**

**Frontend Code** (`esprit/apps/skyoffice/src/`):
```
components/         # React components
  ├── Office3D/     # 3D rendering components
  ├── NPCManager/   # NPC UI components
  └── shared/       # Reusable UI components

hooks/              # Custom React hooks
  ├── useNPCStore.ts
  └── useWebSocket.ts

types/              # TypeScript types
  ├── npc.ts
  └── api.ts

utils/              # Helper functions
  └── animations.ts
```

**Backend Code** (`esprit/apps/gateway/src/`):
```
routes/             # API endpoints
  ├── npcs.ts       # NPC CRUD
  ├── tasks.ts      # Task management
  └── auth.ts       # Authentication

services/           # Business logic
  ├── npc-state.ts  # NPC state management
  ├── sim-client.ts # Sim.ai integration
  └── animation.ts  # Animation mapping

websocket/          # WebSocket handling
  └── index.ts

types/              # TypeScript types
  └── index.ts

utils/              # Helper functions
  └── logger.ts
```

**Database Code**:
```
migrations/         # SQL migration files
  └── 001_add_npcs_table.sql

seed/               # Seed data for development
  └── demo-npcs.sql
```

---

## 🧪 Testing Guidelines

### **Manual Testing Checklist**

Before marking a feature as "done":

**Basic Functionality:**
- [ ] Feature works as expected
- [ ] No errors in console (browser + server)
- [ ] UI updates correctly
- [ ] Database updates correctly
- [ ] WebSocket events are sent/received

**Edge Cases:**
- [ ] Works with 0 NPCs
- [ ] Works with 10+ NPCs
- [ ] Handles network disconnections
- [ ] Handles Sim.ai errors
- [ ] Handles missing data gracefully

**Performance:**
- [ ] No memory leaks (check Chrome DevTools)
- [ ] 60 FPS with 10+ NPCs
- [ ] No unnecessary re-renders
- [ ] Database queries are fast (< 100ms)

---

## 🔧 Code Quality Rules

### **TypeScript Rules**

```typescript
// ✅ GOOD - Type everything
interface NPC {
  id: string
  name: string
  state: NPCState
}

const createNPC = (data: Partial<NPC>): NPC => {
  return {
    id: crypto.randomUUID(),
    name: data.name || 'Unknown',
    state: data.state || NPCState.IDLE
  }
}

// ❌ BAD - Using 'any'
const createNPC = (data: any): any => {
  return { ...data }
}
```

**TypeScript Checklist:**
- [ ] No `any` types (use `unknown` if truly unknown)
- [ ] All function parameters typed
- [ ] All function return values typed
- [ ] Use `interface` for object shapes
- [ ] Use `enum` for fixed values
- [ ] Use `type` for unions/intersections

### **Naming Conventions**

```typescript
// Components - PascalCase
const NPCStatusBar = () => {}

// Functions - camelCase
const updateNPCState = () => {}

// Constants - UPPER_SNAKE_CASE
const MAX_NPC_COUNT = 50

// Types/Interfaces - PascalCase
interface NPCState {}
type AnimationConfig = {}

// Enums - PascalCase, values UPPER_SNAKE_CASE
enum NPCState {
  IDLE = "idle",
  WALKING = "walking"
}
```

### **Comment Guidelines**

```typescript
// ✅ GOOD - Explain WHY, not WHAT
// Use lerp for smooth camera movement (prevents jarring transitions)
camera.position.lerp(targetPosition, 0.1)

// Map Sim.ai step types to animations (see docs/ARCHITECTURE.md)
const animation = mapStepToAnimation(step.type)

// ❌ BAD - Obvious comments
// Set the position to new position
position = newPosition
```

**When to comment:**
- Complex algorithms or logic
- Non-obvious decisions
- Workarounds for bugs
- References to documentation
- TODO items (with date and name)

**When NOT to comment:**
- Self-explanatory code
- Restating the code in English

---

## 🚨 Common Mistakes & How to Avoid Them

### **Mistake #1: Forgetting to Update Types**

```typescript
// ❌ BAD - Type mismatch
interface NPC {
  id: string
  name: string
}

// Later, someone adds 'state' to database but forgets to update type
const npc: NPC = {
  id: '1',
  name: 'Sarah',
  state: NPCState.IDLE // ❌ TypeScript error!
}
```

**Fix:**
- Update types FIRST, then implement feature
- Run `tsc --noEmit` to check for type errors
- Use a single source of truth for types

### **Mistake #2: Not Cleaning Up Event Listeners**

```typescript
// ❌ BAD - Memory leak!
useEffect(() => {
  socket.on('npc:update', handleUpdate)
  // Missing cleanup!
}, [])

// ✅ GOOD - Clean up
useEffect(() => {
  socket.on('npc:update', handleUpdate)
  return () => {
    socket.off('npc:update', handleUpdate)
  }
}, [])
```

### **Mistake #3: Mutating State Directly**

```typescript
// ❌ BAD - Direct mutation
const updateNPC = (id: string, state: NPCState) => {
  npcs.find(n => n.id === id).state = state // Mutates array!
}

// ✅ GOOD - Immutable update
const updateNPC = (id: string, state: NPCState) => {
  setNPCs(npcs.map(npc =>
    npc.id === id ? { ...npc, state } : npc
  ))
}
```

### **Mistake #4: Not Handling Errors**

```typescript
// ❌ BAD - No error handling
const fetchNPCs = async () => {
  const res = await fetch('/api/npcs')
  const data = await res.json()
  return data
}

// ✅ GOOD - Proper error handling
const fetchNPCs = async () => {
  try {
    const res = await fetch('/api/npcs')
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`)
    }
    const data = await res.json()
    return data
  } catch (error) {
    console.error('Failed to fetch NPCs:', error)
    // Show user-friendly error
    toast.error('Could not load NPCs. Please try again.')
    return []
  }
}
```

---

## 🔐 Security Rules

### **Never Trust User Input**

```typescript
// ❌ BAD - SQL injection risk
const getUserNPCs = (userId: string) => {
  return db.query(`SELECT * FROM npcs WHERE created_by = '${userId}'`)
}

// ✅ GOOD - Parameterized query
const getUserNPCs = (userId: string) => {
  return db.query('SELECT * FROM npcs WHERE created_by = $1', [userId])
}
```

### **Validate All Input**

```typescript
// ✅ GOOD - Validate before using
const createNPC = (data: unknown) => {
  const schema = z.object({
    name: z.string().min(1).max(255),
    type: z.enum(['ai_agent', 'human']),
    workstation_id: z.string().optional()
  })

  const validated = schema.parse(data) // Throws if invalid
  return db.insert(npcs).values(validated)
}
```

### **Sanitize Output**

```typescript
// ✅ GOOD - Escape HTML in user-generated content
const NPCName = ({ name }: { name: string }) => {
  return <div>{name}</div> // React escapes by default
}

// ❌ BAD - XSS vulnerability
const NPCName = ({ name }: { name: string }) => {
  return <div dangerouslySetInnerHTML={{ __html: name }} />
}
```

---

## 📊 Performance Rules

### **Optimize Database Queries**

```sql
-- ❌ BAD - No index, slow query
SELECT * FROM task_executions WHERE npc_id = 'abc123';

-- ✅ GOOD - Add index
CREATE INDEX idx_task_executions_npc_id ON task_executions(npc_id);
```

### **Avoid N+1 Queries**

```typescript
// ❌ BAD - N+1 queries
const npcs = await db.select().from(npcs)
for (const npc of npcs) {
  npc.tasks = await db.select().from(tasks).where(eq(tasks.npcId, npc.id))
}

// ✅ GOOD - Single query with join
const npcsWithTasks = await db
  .select()
  .from(npcs)
  .leftJoin(tasks, eq(tasks.npcId, npcs.id))
```

### **Debounce Frequent Updates**

```typescript
// ❌ BAD - Updates on every mouse move
onMouseMove={(e) => {
  updateCameraPosition(e.clientX, e.clientY)
}}

// ✅ GOOD - Debounce updates
const debouncedUpdate = debounce(updateCameraPosition, 100)
onMouseMove={(e) => {
  debouncedUpdate(e.clientX, e.clientY)
}}
```

---

## 🐛 Debugging Tips

### **Use Descriptive Console Logs**

```typescript
// ❌ BAD - Unclear log
console.log(npc)

// ✅ GOOD - Descriptive log
console.log('[NPCManager] Updated NPC state:', {
  npcId: npc.id,
  oldState: previousState,
  newState: npc.state,
  timestamp: Date.now()
})
```

### **Use Browser DevTools**

- **Console** - View logs and errors
- **Network** - Check API requests
- **Performance** - Profile rendering issues
- **React DevTools** - Inspect component state
- **Redux DevTools** - Inspect Zustand store (with middleware)

### **Use Server Logs**

```bash
# View Gateway logs
docker compose logs -f gateway

# View Sim.ai logs
docker compose logs -f sim

# Search for errors
docker compose logs gateway | grep -i error

# Follow logs in real-time
docker compose logs -f --tail=100 gateway
```

---

## ✅ Definition of Done

Before marking a task as complete:

**Code:**
- [ ] Code compiles without errors
- [ ] No TypeScript errors
- [ ] All new functions have types
- [ ] Code follows naming conventions
- [ ] Complex logic has comments

**Testing:**
- [ ] Tested manually
- [ ] Tested edge cases
- [ ] No console errors
- [ ] No memory leaks
- [ ] Performance is acceptable

**Database:**
- [ ] Migrations created and tested
- [ ] Indexes added where needed
- [ ] No breaking changes to Sim.ai tables

**Documentation:**
- [ ] README updated if needed
- [ ] API endpoints documented
- [ ] Complex features explained

**Git:**
- [ ] Descriptive commit message
- [ ] No sensitive data committed
- [ ] No merge conflicts

---

## 🚀 Deployment Checklist

Before deploying to production:

**Environment:**
- [ ] All environment variables set
- [ ] Secrets rotated (new keys)
- [ ] Database backed up
- [ ] SSL certificates configured

**Performance:**
- [ ] Load tested with expected traffic
- [ ] Database queries optimized
- [ ] Caching configured
- [ ] CDN configured for static assets

**Security:**
- [ ] API endpoints authenticated
- [ ] CORS configured correctly
- [ ] Rate limiting enabled
- [ ] SQL injection prevention verified
- [ ] XSS prevention verified

**Monitoring:**
- [ ] Error tracking configured (Sentry, etc.)
- [ ] Performance monitoring (DataDog, etc.)
- [ ] Uptime monitoring (Pingdom, etc.)
- [ ] Log aggregation (CloudWatch, etc.)

---

## 📞 Getting Help

**Before asking for help:**
1. Check the error message carefully
2. Search the codebase for similar patterns
3. Review these docs
4. Google the error

**When asking for help:**
- Include the full error message
- Share relevant code snippets
- Describe what you've already tried
- Provide steps to reproduce

**Where to ask:**
- GitHub Issues (for bugs)
- Team chat (for quick questions)
- Stack Overflow (for general questions)
- Sim.ai Discord (for Sim.ai-specific questions)

---

## 🎓 Learning Resources

**TypeScript:**
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [TypeScript Deep Dive](https://basarat.gitbook.io/typescript/)

**React:**
- [React Docs](https://react.dev/)
- [React Three Fiber](https://docs.pmnd.rs/react-three-fiber)

**Database:**
- [PostgreSQL Tutorial](https://www.postgresqltutorial.com/)
- [pgvector Guide](https://github.com/pgvector/pgvector)

**Performance:**
- [Web.dev Performance](https://web.dev/performance/)
- [React Performance](https://react.dev/learn/render-and-commit)

---

**Remember:**
> "Code is read more often than it is written."
> Write code that your future self (and teammates) will thank you for!

---

**Next Steps:**
1. Read [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md) to understand the project
2. Read [ARCHITECTURE.md](./ARCHITECTURE.md) to understand how it works
3. Start coding with these rules in mind!
