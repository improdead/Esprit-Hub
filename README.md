# Esprit-Hub

Your AI employees

**Based on [SkyOffice](https://github.com/kevinshen56714/SkyOffice) by Kevin Shen**

## About

Esprit-Hub is a virtual office application that allows teams to collaborate in an immersive 2D environment with video chat, screen sharing, and interactive whiteboards.

## Built with

- [Phaser3](https://github.com/photonstorm/phaser) - Game engine
- [Colyseus](https://github.com/colyseus/colyseus) - WebSocket-based server framework
- [React/Redux](https://github.com/facebook/react) - Front-end framework
- [PeerJS](https://github.com/peers/peerjs) - WebRTC for video/screen sharing
- [TypeScript](https://github.com/microsoft/TypeScript) and [ES6](https://github.com/eslint/eslint) - for both client and server sides

## Features

- 🎮 2D virtual office environment built with Phaser3
- 👥 Real-time multiplayer with WebSocket
- 🎥 Video chat when players are close to each other
- 💻 Screen sharing via computer stations
- 📝 Collaborative whiteboards
- 💬 In-game chat system
- 🎨 Multiple character avatars to choose from
- 🪑 Interactive furniture and objects
- 🤖 **AI Agent Integration** with [Sim.ai](https://sim.ai) - Build and deploy AI workflows directly from the virtual office

## Controls

- `W, A, S, D, or arrow keys` to move (video chat will start if you are close to someone else)
- `E` to sit down
- `R` to use computer (for screen sharing)
- `Enter` to open chat
- `ESC` to close chat

## Prerequisites

You'll need [Node.js](https://nodejs.org/en/), [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/) installed.

## Getting Started

There are two ways to run Esprit-Hub:

### Option 1: Quick Start (Game Only)

For just the virtual office game without AI agents:

```bash
git clone https://github.com/improdead/Esprit-Hub.git
cd Esprit-Hub
./scripts/run-all.sh
```

The client will be available at [http://localhost:5173](http://localhost:5173).

👉 For a detailed step-by-step guide, check out `docs/RUNNING_THE_APP.md`.

### Option 2: Full Stack with AI Agents (Docker)

For the complete experience with AI agent integration using Sim.ai:

**Prerequisites:**
- Docker Desktop 4.x+
- Generate secrets: `openssl rand -hex 32` (run twice for auth secret and encryption key)

**Steps:**

1. Clone and configure:
```bash
git clone https://github.com/improdead/Esprit-Hub.git
cd Esprit-Hub/esprit
cp .env.example .env
```

2. Edit `.env` and set your secrets:
```bash
BETTER_AUTH_SECRET=<your-generated-secret>
ENCRYPTION_KEY=<your-generated-key>
```

3. Start everything with Docker:
```bash
docker compose -f infra/docker-compose.yml up -d --build
```

4. Access the application:
- **Main app**: [http://localhost:8080](http://localhost:8080)
- **Sim.ai Studio**: [http://localhost:8080/studio/](http://localhost:8080/studio/)
- **Create AI workflows** in Sim Studio and trigger them from NPCs in the virtual office

👉 For detailed AI agent setup instructions, see `esprit/README.md`.

### Option 3: Local Development (No Docker)

For local development without Docker:

👉 See `docs/LOCAL_STACK.md` for complete instructions on running Sim.ai, Gateway, and the game locally.

## Credits

- Original project: [SkyOffice](https://github.com/kevinshen56714/SkyOffice) by Kevin Shen
- Pixel art: [LimeZu](https://limezu.itch.io/)
- Whiteboard integration: [WBO](https://github.com/lovasoa/whitebophir)

## License

This project is licensed under MIT - see the LICENSE file for details.

Original SkyOffice project © 2021 Kuan-Hsuan Shen
