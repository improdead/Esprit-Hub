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

## Controls

- `W, A, S, D, or arrow keys` to move (video chat will start if you are close to someone else)
- `E` to sit down
- `R` to use computer (for screen sharing)
- `Enter` to open chat
- `ESC` to close chat

## Prerequisites

You'll need [Node.js](https://nodejs.org/en/), [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/) installed.

## Getting Started

Clone this repository to your local machine:

```bash
git clone https://github.com/improdead/Esprit-Hub.git
```

To start the server, go into the project folder and install dependencies/run start command:

```bash
cd Esprit-Hub
yarn && yarn start
```

To start the client, go into the client folder and install dependencies/run start command:

```bash
cd Esprit-Hub/client
yarn && yarn dev
```

The client will be available at [http://localhost:3000](http://localhost:3000)

## Credits

- Original project: [SkyOffice](https://github.com/kevinshen56714/SkyOffice) by Kevin Shen
- Pixel art: [LimeZu](https://limezu.itch.io/)
- Whiteboard integration: [WBO](https://github.com/lovasoa/whitebophir)

## License

This project is licensed under MIT - see the LICENSE file for details.

Original SkyOffice project © 2021 Kuan-Hsuan Shen
