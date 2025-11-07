# Running the Esprit-Hub App Locally and in Production

This document walks through everything you need in order to run the complete Esprit-Hub experience (Colyseus realtime server + React/Phaser client) on your machine, as well as the commands that get you ready for deployment.

## 0. Overview

- **`server/`** — Node/TypeScript Colyseus server (WebSocket + REST endpoints and Colyseus monitor).
- **`client/`** — Vite + React + Phaser front-end. Talks to the server on port `2567` via WebSocket and WebRTC (PeerJS).
- **`types/`** — Shared game schemas that are consumed by both the server and client. No build step is required during development.

Running the app locally means keeping *two* processes alive: one for the server (`yarn start` from the repo root) and one for the client (`yarn dev` from `client/`). The client connects to the server at `ws://localhost:2567` while in development.

## 1. Prerequisites

| Requirement | Notes |
| --- | --- |
| Node.js ≥ 18.x LTS | Earlier versions of Node may fail with Vite 3+ and modern TLS defaults. |
| Yarn Classic (1.x) | This repo uses `yarn` scripts everywhere. Install via `npm install -g yarn` if needed. |
| Git | Optional but recommended for cloning and version control. |
| Modern Chromium-based browser | Required for WebRTC audio/video. Chrome, Edge, or Brave on desktop work best. |
| Camera + microphone | Needed to test video chat, screen sharing, and WebRTC flows. Browsers treat `localhost` as a secure origin so HTTPS is not required when running locally. |

> **Tip:** If you need to use npm instead of yarn, convert each command by replacing `yarn <script>` with `npm run <script>`. The repo was tested with yarn, so stick with it when possible.

## 2. Clone and install dependencies

```bash
git clone https://github.com/improdead/Esprit-Hub.git
cd Esprit-Hub

# Install server-level dependencies (runs from repo root)
yarn install

# Install client dependencies
cd client && yarn install && cd ..
```

What the commands do:

- Root `yarn install` pulls everything required by the Colyseus server (including dev helpers like `ts-node-dev`).
- `client/yarn install` brings in the React/Vite/Phaser toolchain and UI libraries.
- No additional install step is needed inside `types/` because the server build already brings in `@colyseus/schema`.

## 3. Run the Colyseus realtime server

```bash
# From the repository root
yarn start
```

- This launches `ts-node-dev` with live reload using `server/index.ts`.
- Default port is `2567`. Override by setting `PORT=XXXX yarn start`.
- You should see `Listening on ws://localhost:2567` in the terminal once the server is ready.
- Visit [http://localhost:2567/colyseus](http://localhost:2567/colyseus) to open the built-in Colyseus monitor dashboard for inspecting rooms, players, and messages.

Keep this terminal open; the process needs to keep running while you use the app.

## 4. Run the Vite client

```bash
cd client
yarn dev
```

- Vite's default dev server port is `5173`. Override it with `yarn dev --port 3000` if you prefer.
- Open the URL printed by Vite (usually [http://localhost:5173](http://localhost:5173)).
- Vite reloads automatically when you save client-side files (`client/src/**`).
- When `process.env.NODE_ENV !== 'production'`, the client automatically targets `ws://localhost:2567`, so no `.env` is required for local work.

> **Testing tip:** To simulate multiple users, open a private/incognito window or a different browser and connect to the same URL.

## 5. Quick workflow recap

1. `yarn start` in the project root → starts the Colyseus server on port `2567`.
2. `cd client && yarn dev` → starts the UI on port `5173`.
3. Open `http://localhost:5173` → log in, pick an avatar, and walk around.
4. (Optional) Open `http://localhost:2567/colyseus` to inspect rooms and active sessions.
5. Commit your changes or iterate further; both processes hot-reload automatically.

## 6. Environment configuration

| Variable | Location | Purpose |
| --- | --- | --- |
| `PORT` | Server (`yarn start`) | Overrides the WebSocket/HTTP port. Defaults to `2567`. |
| `VITE_SERVER_URL` | Client build time (`client/.env`, `.env.local`, or CI variables) | Used **only** when `NODE_ENV === 'production'`. Set it to the public WebSocket endpoint, e.g. `wss://your-domain.com`. |

Example `client/.env.local` when deploying the client separately from the server:

```bash
VITE_SERVER_URL=wss://api.your-domain.com
```

## 7. Production builds and deployment

### Build & run the server (Node)

```bash
# From repo root
yarn install
cd types && yarn install && cd ..
cd server && tsc --project tsconfig.server.json
node lib/index.js   # or set PORT=80 node lib/index.js
```

- The `cd types && yarn` step mirrors the existing deploy script and guarantees `@colyseus/schema` stays installed even in environments that install each package separately. If your deployment installs dependencies only once at the repo root, you can skip it.
- The provided `heroku-postbuild` script automates the TypeScript compile for Heroku-style deployments (`yarn heroku-postbuild`).
- A Heroku-style `Procfile` is already present. Double-check that its `web` command points at the compiled entry point (by default `node server/lib/index.js`).

### Build & serve the client (static)

```bash
cd client
VITE_SERVER_URL=wss://api.your-domain.com yarn build
npx serve dist   # or deploy the dist/ folder to Netlify, Vercel, S3, etc.
```

- The Netlify configuration (`netlify.toml`) runs `yarn` in `types/` and `client/` before building and publishes `client/dist`. Ensure the Netlify UI has a `VITE_SERVER_URL` environment variable pointing to your production Colyseus server.
- To preview the production build locally, run `yarn preview` inside `client/`.

### Putting it together

1. Deploy the Node server (Heroku, Render, Fly.io, your own VM, etc.) using `yarn heroku-postbuild` → `node server/lib/index.js`.
2. Deploy the static client (`client/dist`) to Netlify/Vercel/S3.
3. Set `VITE_SERVER_URL` in the client environment so the browser talks to your server's public WebSocket endpoint.

## 8. Troubleshooting

- **Client hangs on “Connecting to lobby”** → The WebSocket handshake likely failed. Confirm the server is running on `PORT` 2567, no firewall blocks it, and the client points to the right host (set `VITE_SERVER_URL` when not on localhost).
- **`EADDRINUSE` errors when starting the server** → Another process is occupying port `2567`. Either stop it or run `PORT=3001 yarn start` and update `VITE_SERVER_URL` (for production builds) to match.
- **Camera/mic not detected** → Make sure you granted permission in the browser. Chrome treats each origin separately; re-allow permissions after switching between `localhost` and deployed URLs.
- **Screen sharing fails on Firefox/Safari** → PeerJS works best on Chromium-based browsers. Use Chrome for local development to avoid browser-specific WebRTC quirks.
- **Vite serves on `http://127.0.0.1` but other devices cannot connect** → Run `yarn dev --host 0.0.0.0 --port 5173` and make sure your OS firewall allows inbound traffic.
- **Production client connects to the wrong server** → Remember that `VITE_SERVER_URL` is resolved at *build time*. Rebuild the client whenever you change the backend endpoint.

You are now ready to run the full Esprit-Hub experience locally or ship it to production. Happy hacking!
