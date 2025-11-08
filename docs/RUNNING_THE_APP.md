# Running the Esprit-Hub App

This guide explains how to boot the **entire** stack—Sim.ai (Studio + realtime), Gateway, Nginx proxy, Colyseus server, and the React/Phaser client—from this repository. Two scripts cover both scenarios:

1. **`scripts/start-full-stack-first-time.sh`** — one-shot setup. Installs Node deps, generates secrets, and builds the Docker stack.
2. **`scripts/start-full-stack.sh`** — daily driver. Reuses installed deps and simply launches everything.

Both scripts keep the game server/client in your foreground terminal so you can stop them with `Ctrl+C`.

---

## 1. Prerequisites

| Requirement | Why |
| --- | --- |
| **Docker Desktop 4.x+** | Runs Sim.ai, Postgres (pgvector), Redis, Gateway, and the reverse proxy. Make sure Docker Desktop is *running* (whale icon in the macOS menu bar) and bump its Resources → Memory to **at least 12 GB (16 GB recommended) with ~2 GB swap** for the first build. You can lower it afterwards. |
| **Node.js 18+** | Required by the Colyseus server, scripts, and Vite client. |
| **Yarn or npm** | `scripts/run-all.sh` prefers `yarn` but falls back to `npm install` automatically. |
| **openssl + python3** | Used to generate secrets and edit `.env`. They ship with macOS 12+. |
| **Chromium-based browser, mic, and camera** | Needed to test WebRTC video chat once you spawn multiple avatars. |

> Optional: Install `bun` and `postgresql@16` only if you plan to run the non-Docker local stack described in `docs/LOCAL_STACK.md`.

---

## 2. First-time setup (new machine)

```bash
git clone https://github.com/improdead/Esprit-Hub.git
cd Esprit-Hub
./scripts/start-full-stack-first-time.sh
```

What the script does:

1. Verifies Docker is running and copies `esprit/.env.example` → `esprit/.env`.
2. Generates 32-byte values for `BETTER_AUTH_SECRET` and `ENCRYPTION_KEY` if they are missing or still `change-me`.
3. Runs `docker compose -f esprit/infra/docker-compose.yml up -d --build`, which launches:
   - Sim.ai Studio (`sim`, port 3000 inside Docker)
   - Sim.ai realtime server (`sim-realtime`, 3002)
   - Gateway API (`skyoffice-gateway`, 3001)
   - SkyOffice/NPC dashboard (`skyoffice-ui`)
   - Postgres + pgvector, Redis, and the reverse proxy on `http://localhost:8080`
4. Installs Node dependencies (root + `client/`), ensures `client/.env.local` exists with `VITE_STUDIO_URL=http://localhost:8080/studio/`, and then starts:
   - Colyseus server on `http://localhost:2567`
   - Vite client on `http://localhost:5173`

Leave the terminal running. When everything is ready:

- Open `http://localhost:5173` to enter the virtual office.
- Click the **wrench/build icon** (bottom-right helper bar) to open Sim.ai Studio in a new tab. It reads `VITE_STUDIO_URL`, so it will default to `http://localhost:8080/studio/`.
- Access the proxy and health endpoints:
  - Main UI / proxy root: `http://localhost:8080`
  - Sim.ai Studio: `http://localhost:8080/studio/`
  - Colyseus monitor: `http://localhost:2567/colyseus`

Stop everything with `Ctrl+C` (game processes) and `cd esprit && docker compose -f infra/docker-compose.yml down` when you no longer need the backend containers.  
Optional helpers such as **Nango** (OAuth) and **LiteLLM** stay disabled by default; start them only when needed via `cd esprit && docker compose -f infra/docker-compose.yml --profile optional up -d`.

---

## 3. Daily run (fast restart)

Use this after the first run; it skips `yarn install`/`npm install` but still keeps the Docker stack current.

```bash
cd /path/to/Esprit-Hub
./scripts/start-full-stack.sh
```

- The script re-checks Docker, regenerates secrets only if necessary, and reruns `docker compose up -d --build` so image updates apply automatically.
- It sets `SKIP_INSTALL=1` for `scripts/run-all.sh`, so the Colyseus server and Vite client start using the already-installed dependencies.
- URLs and stop commands are identical to the first-time setup.

If you ever need to force a reinstall (e.g., after deleting `node_modules`), run `SKIP_INSTALL=0 ./scripts/start-full-stack.sh` or just re-run the `*-first-time` script.

---

## 4. Service map

| Service | How it starts | Port(s) | Notes |
| --- | --- | --- | --- |
| Sim.ai Studio UI | Docker (`sim`) | Proxy: `http://localhost:8080/studio/` | First-run login lives here. |
| Sim.ai realtime | Docker (`sim-realtime`) | 3002 internal | Socket server used by Studio. |
| Gateway API | Docker (`skyoffice-gateway`) | 3001 internal | Exposed via proxy `http://localhost:8080/api/`. |
| SkyOffice NPC dashboard | Docker (`skyoffice-ui`) | Served through the proxy | Optional control panel. |
| Colyseus server | `scripts/run-all.sh` | 2567 | Includes `/colyseus` monitor. |
| Game client (React/Phaser) | `scripts/run-all.sh` | 5173 | Dev server with hot reload. |
| Nango / LiteLLM (optional) | `docker compose --profile optional up -d` | 3003 / 4000 | Disabled unless you need OAuth or LLM proxying.

---

## 5. Agent Builder button (Sim.ai link)

- Component: `client/src/components/HelperButtonGroup.tsx`.
- Environment variable: `VITE_STUDIO_URL` (injected by Vite at build time).  
  - `scripts/run-all.sh` ensures `client/.env.local` exists and sets `VITE_STUDIO_URL=http://localhost:8080/studio/` unless you override it.
- Behavior: Clicking the build/wrench Fab opens `VITE_STUDIO_URL` in a new tab, so the in-game “Open Agent Builder” button always matches whatever Studio origin you configure.

If you point Sim.ai somewhere else (e.g., a remote server), edit `client/.env.local`, restart the client dev server, and the button will open the new URL.

---

## 6. Troubleshooting

- **Docker isn’t running** → Scripts exit early with `Error: Docker does not appear to be running`. Launch Docker Desktop and retry.
- **Ports already in use** → Stop previous runs: `cd esprit && docker compose -f infra/docker-compose.yml down` and kill stray Vite/Colyseus processes (`lsof -i :5173`, etc.).
- **Client opens but Sim.ai link fails** → Make sure `docker compose ps` shows the `sim` container as `healthy`, and confirm `client/.env.local` contains the desired `VITE_STUDIO_URL`.
- **Need to reset secrets** → Edit `esprit/.env` manually; the scripts only generate values when keys are missing or still `change-me`. Re-run the first-time script afterward.
- **Fresh start** → Run `docker compose -f infra/docker-compose.yml down -v` inside `esprit` to drop volumes (Postgres/Redis data) and re-run the first-time script.

With these two commands you can now launch the full Esprit-Hub + Sim.ai experience on any machine in minutes.
