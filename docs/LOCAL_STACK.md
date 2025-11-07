# Local Full-Stack Setup (No Docker)

Use this guide when you want everything to run from this repo on localhost without Docker. You'll spin up Sim.ai, the Gateway, optional NPC dashboard, and the main Esprit-Hub game as separate processes.

## 1. Prerequisites

```bash
brew install bun postgresql@16
brew services start postgresql@16

# Create database with pgvector extension
createdb simstudio
psql simstudio -c "CREATE EXTENSION IF NOT EXISTS vector;"
```

Remember your Postgres username/password (default user is your macOS username).

## 2. Sim.ai (Studio + realtime server)

```bash
cd /Users/dekai/Documents/Esprit-Hub/esprit/external/sim

# Install dependencies
bun install

# Set up database package
cd packages/db
cp .env.example .env
# Edit .env and set: DATABASE_URL="postgresql://$USER:password@localhost:5432/simstudio"

# Run migrations
bunx drizzle-kit migrate --config=./drizzle.config.ts

# Set up main app
cd ../../apps/sim
cp .env.example .env
# Edit .env and configure:
# - DATABASE_URL="postgresql://$USER:password@localhost:5432/simstudio"
# - BETTER_AUTH_SECRET="<generate with: openssl rand -hex 32>"
# - BETTER_AUTH_URL="http://localhost:3000"
# - NEXT_PUBLIC_APP_URL="http://localhost:3000"
# - ENCRYPTION_KEY="<generate with: openssl rand -hex 32>"

# Start both servers (from repo root)
cd /Users/dekai/Documents/Esprit-Hub/esprit/external/sim
bun run dev:full
```

- Main app: `http://localhost:3000`
- Realtime server: `http://localhost:3002`

Update the Vite client so the in-game button opens this Studio:

```bash
cat >/Users/dekai/Documents/Esprit-Hub/client/.env.local <<'EOF'
VITE_STUDIO_URL=http://localhost:3000/
EOF
```

Restart the client dev server whenever you change this file.

## 3. Gateway API

```bash
cd /Users/dekai/Documents/Esprit-Hub/esprit/apps/gateway
npm install

# Set SIM_BASE environment variable
export SIM_BASE=http://localhost:3000

npm run dev   # http://localhost:3001
```

Populate `esprit/apps/gateway/data/agents.json` with the webhook URLs from the workflows you create in Sim.ai.

## 4. Optional SkyOffice dashboard (NPC panels)

```bash
cd /Users/dekai/Documents/Esprit-Hub/esprit/apps/skyoffice
npm install
npm run dev   # default http://localhost:5173 (Vite prints exact URL)
```

## 5. Main Esprit-Hub game

```bash
cd /Users/dekai/Documents/Esprit-Hub
./scripts/run-all.sh
```

- Installs dependencies (falls back to npm if yarn fails).
- Starts the Colyseus server (port 2567).
- Starts the game client (Vite, port 5173).
- Ensures `client/.env.local` exists, but keeps your `VITE_STUDIO_URL` setting.

Visit `http://localhost:5173`, click the wrench button to open the Studio (`http://localhost:3000/`), and trigger agents once the Gateway/Sim.ai mapping is configured.

## 6. Overview table

| Service                        | Command/location                                         | Port(s)          |
|--------------------------------|----------------------------------------------------------|------------------|
| Sim.ai Studio + Realtime       | `bun run dev:full` in `esprit/external/sim`              | 3000 (UI), 3002 (Realtime) |
| Gateway API                    | `npm run dev` in `esprit/apps/gateway`                   | 3001             |
| SkyOffice dashboard (optional) | `npm run dev` in `esprit/apps/skyoffice`                 | Vite default     |
| Esprit-Hub game                | `./scripts/run-all.sh` from repo root                    | 2567 + 5173      |
| Postgres (with pgvector)       | `brew services start postgresql@16` + `createdb simstudio` | 5432        |

With these processes running, the entire AI-native office stack lives in a single repo, entirely on localhost, no Docker required.
