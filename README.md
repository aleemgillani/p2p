# ⚡ P2P Transfer — Peer-to-Peer File Sharing

A real-time, peer-to-peer file transfer application built with **Next.js**, **WebRTC**, and **Socket.IO**. Files are sent directly between browsers — no cloud storage, no file size limits, and fully encrypted in transit.

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![Socket.IO](https://img.shields.io/badge/Socket.IO-4.8-white?logo=socket.io)
![WebRTC](https://img.shields.io/badge/WebRTC-Enabled-blue?logo=webrtc)
![MongoDB](https://img.shields.io/badge/MongoDB-7-green?logo=mongodb)
![License](https://img.shields.io/badge/License-MIT-yellow)

---

## 📖 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [How It Works](#how-it-works)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Architecture Deep Dive](#architecture-deep-dive)
- [API Routes](#api-routes)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

**P2P Transfer** lets two users send files of any size directly to each other through the browser using WebRTC data channels. The server only facilitates the initial connection (signaling) — the actual file data never touches the server.

This makes it:
- **Fast** — files transfer at LAN/network speed, not limited by server bandwidth
- **Private** — data is encrypted end-to-end via DTLS (WebRTC's built-in security)
- **Unlimited** — no file size caps since nothing is stored server-side

---

## Features

| Feature | Description |
|---------|-------------|
| 🔒 **End-to-End Encryption** | Files travel directly between peers over encrypted WebRTC data channels |
| ⚡ **No Size Limits** | Transfer files of any size — 1 MB or 100 GB |
| 🌐 **Browser-Based** | No installation required — works on any modern browser |
| 📂 **Multi-File Support** | Select and send multiple files in a single session |
| 📊 **Real-Time Progress** | Live progress bar with transfer speed and percentage |
| 🔑 **User Authentication** | Register/login system with NextAuth.js and MongoDB |
| 📱 **Responsive UI** | Works on desktop, tablet, and mobile devices |
| 🆓 **Completely Free** | No subscriptions, no hidden fees |

---

## How It Works

```
┌──────────┐                    ┌──────────────┐                    ┌──────────┐
│  SENDER  │                    │   SERVER     │                    │ RECEIVER │
│ (Browser)│                    │ (Socket.IO)  │                    │ (Browser)│
└────┬─────┘                    └──────┬───────┘                    └────┬─────┘
     │                                 │                                 │
     │  1. Create Room (roomId)        │                                 │
     │────────────────────────────────>│                                 │
     │                                 │                                 │
     │  2. Share link with receiver    │                                 │
     │─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─>│
     │                                 │                                 │
     │                                 │  3. Join Room (roomId)          │
     │                                 │<────────────────────────────────│
     │                                 │                                 │
     │  4. WebRTC Signaling (SDP/ICE)  │                                 │
     │<───────────────────────────────>│<───────────────────────────────>│
     │                                 │                                 │
     │  5. Direct P2P Connection Established (WebRTC Data Channel)       │
     │<══════════════════════════════════════════════════════════════════>│
     │                                 │                                 │
     │  6. File chunks sent directly   │                                 │
     │══════════════════════════════════════════════════════════════════>│
     │                                 │                                 │
```

### Step-by-Step Flow

1. **Sender** logs in and goes to the Dashboard
2. **Sender** selects files and clicks "Start Sharing" — this creates a Socket.IO room
3. A unique **Room ID** is generated; the sender shares this link with the receiver
4. **Receiver** opens the link (or enters the Room ID on the `/receive` page)
5. The server facilitates **WebRTC signaling** — exchanging SDP offers/answers and ICE candidates
6. A **direct peer-to-peer connection** is established between the two browsers
7. Files are split into **64 KB chunks** and sent over the WebRTC data channel
8. The receiver's browser **reassembles the chunks** and triggers a download

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | Next.js 16 (App Router) | React-based UI with server-side rendering |
| **Styling** | Tailwind CSS 4 | Utility-first CSS framework |
| **Real-Time** | Socket.IO 4.8 | WebSocket-based signaling for WebRTC |
| **P2P** | WebRTC (RTCPeerConnection) | Direct browser-to-browser file transfer |
| **Auth** | NextAuth.js 4 | Session-based authentication with credentials provider |
| **Database** | MongoDB + Mongoose 7 | User storage and authentication |
| **Server** | Custom Node.js HTTP Server | Combines Next.js + Socket.IO on a single port |

---

## Project Structure

```
├── server.js                  # Custom HTTP server (Next.js + Socket.IO)
├── next.config.mjs            # Next.js configuration
├── package.json               # Dependencies and scripts
├── postcss.config.mjs         # PostCSS config for Tailwind
├── eslint.config.mjs          # ESLint configuration
│
├── src/
│   ├── app/
│   │   ├── layout.js          # Root layout (Inter font, SessionProvider)
│   │   ├── page.js            # Landing page (hero, features, how-it-works)
│   │   ├── providers.js       # NextAuth SessionProvider wrapper
│   │   ├── globals.css        # Tailwind CSS imports
│   │   │
│   │   ├── login/
│   │   │   └── page.js        # Login page (email/password via NextAuth)
│   │   ├── register/
│   │   │   └── page.js        # Registration page (name, email, password)
│   │   │
│   │   ├── dashboard/
│   │   │   └── page.js        # 📤 SENDER — File selection + WebRTC sender logic
│   │   ├── receive/
│   │   │   └── page.js        # 📥 RECEIVER — Join room + WebRTC receiver logic
│   │   │
│   │   ├── about/
│   │   │   └── page.js        # About page
│   │   ├── how-it-works/
│   │   │   └── page.js        # How it works page
│   │   ├── faq/
│   │   │   └── page.js        # FAQ page
│   │   │
│   │   └── api/
│   │       ├── auth/
│   │       │   └── [...nextauth]/
│   │       │       └── route.js  # NextAuth API route (credentials provider)
│   │       └── register/
│   │           └── route.js      # POST /api/register — user registration
│   │
│   ├── lib/
│   │   └── mongodb.js         # Mongoose connection singleton
│   │
│   └── models/
│       └── User.js            # Mongoose User schema
│
└── public/
    ├── file.svg               # Static assets
    ├── globe.svg
    ├── next.svg
    ├── vercel.svg
    └── window.svg
```

---

## Getting Started

### Prerequisites

- **Node.js** 18+ 
- **MongoDB** (local or cloud — e.g., [MongoDB Atlas](https://www.mongodb.com/atlas))
- **Git**

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/aleemgillani/p2p.git
cd p2p

# 2. Install dependencies
npm install

# 3. Create environment file
cp .env.example .env.local
# (or create .env.local manually — see Environment Variables below)

# 4. Start the development server
npm run dev
```

The app will be running at **http://localhost:3000**

### Production

```bash
# Build the Next.js application
npm run build

# Start the production server
npm start
```

---

## Environment Variables

Create a `.env.local` file in the project root with the following:

```env
# MongoDB connection string
MONGODB_URI=mongodb://localhost:27017/p2p-transfer

# NextAuth.js configuration
NEXTAUTH_SECRET=your-secret-key-here
NEXTAUTH_URL=http://localhost:3000
```

| Variable | Description | Required |
|----------|-------------|----------|
| `MONGODB_URI` | MongoDB connection URI (local or Atlas) | ✅ |
| `NEXTAUTH_SECRET` | Random secret string for JWT signing | ✅ |
| `NEXTAUTH_URL` | Base URL of the application | ✅ |

---

## Architecture Deep Dive

### Server (`server.js`)

The application uses a **custom Node.js HTTP server** that serves both the Next.js app and the Socket.IO signaling server on a single port (3000). This avoids CORS issues and simplifies deployment.

```
                    Port 3000
                       │
              ┌────────┴────────┐
              │   HTTP Server   │
              └────────┬────────┘
                       │
          ┌────────────┼────────────┐
          │                         │
   ┌──────┴──────┐          ┌──────┴──────┐
   │   Next.js   │          │  Socket.IO  │
   │  (App/API)  │          │ (Signaling) │
   └─────────────┘          └─────────────┘
```

### Socket.IO Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `create-room` | Client → Server | Sender creates a new room with a unique ID |
| `room-created` | Server → Client | Confirms room creation |
| `join-room` | Client → Server | Receiver joins an existing room |
| `receiver-joined` | Server → Sender | Notifies sender that receiver has connected |
| `joined-as-receiver` | Server → Receiver | Confirms receiver has joined the room |
| `room-full` | Server → Client | Room already has 2 peers |
| `offer` | Peer → Peer (via Server) | WebRTC SDP offer forwarding |
| `answer` | Peer → Peer (via Server) | WebRTC SDP answer forwarding |
| `ice-candidate` | Peer → Peer (via Server) | ICE candidate exchange for NAT traversal |
| `peer-disconnected` | Server → Client | Notifies when the other peer disconnects |

### WebRTC Data Channel

- **Chunk size**: 64 KB per chunk
- **Channel label**: `fileTransfer`
- **Buffered amount threshold**: 1 MB (for flow control)
- Files are serialized as `ArrayBuffer` chunks, with metadata (filename, size, type) sent first as a JSON message

### Authentication Flow

```
Register → POST /api/register → bcrypt hash → MongoDB
Login    → NextAuth credentials → bcrypt compare → JWT session
Dashboard → Protected by useSession() → Redirect if unauthenticated
```

---

## API Routes

### `POST /api/register`

Creates a new user account.

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "securepassword"
}
```

**Responses:**
| Status | Description |
|--------|-------------|
| `201` | User created successfully |
| `400` | User already exists |
| `500` | Server error |

### `POST /api/auth/[...nextauth]`

NextAuth.js credentials authentication endpoint.

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "securepassword"
}
```

---

## Contributing

Contributions are welcome! Here's how you can help:

1. **Fork** the repository
2. **Create** a feature branch: `git checkout -b feature/amazing-feature`
3. **Commit** your changes: `git commit -m 'Add amazing feature'`
4. **Push** to the branch: `git push origin feature/amazing-feature`
5. **Open** a Pull Request

---

## License

This project is open source and available under the [MIT License](LICENSE).

---

<p align="center">
  Built with ❤️ by <a href="https://github.com/aleemgillani">Aleem Gillani</a> — <strong>TechniKnest</strong>
</p>
