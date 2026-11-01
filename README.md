# CHITHI — Social Messaging Platform

> **"Connect with Friends. Chat Freely. Share Your Moments."**

CHITHI is a private, friend-based social messaging platform combining instant one-to-one messaging with permanent friends-only social posts ("Moments").

---

## 🌟 Key Architecture & Product Decisions

1. **Chat-First Priority:** Messaging is the core feature; Moments and social interactions are secondary.
2. **Mutual Friendship Model:**
   - Exact-username search only; no stranger recommendation algorithm or public discover feed.
   - Friend request acceptance establishes a canonical two-party friendship (`user_low_id < user_high_id`).
   - Direct chats and Moments visibility require active mutual friendship.
3. **Real-Time Communication & WebRTC Calling:**
   - WebSocket transport via **Socket.IO** for signaling, messaging, and presence.
   - One-to-one **WebRTC Audio & Video Calling** with DTLS-SRTP peer-to-peer encryption.
   - Coturn-compatible short-lived TURN credentials generated via RFC 5766 HMAC-SHA1.
   - Microphone mute, camera toggle, Picture-in-Picture floating view, and duration tracking.
   - Delivery and read receipts.
   - Typing indicators and presence tracking.
   - Idempotency with client-generated message IDs.
4. **Friends-Only Feed:**
   - Chronological, newest-first feed.
   - Strictly visible only to author and accepted, non-blocked friends.
   - Threaded comments and reactions.
5. **Security & Privacy:**
   - Password hashing with **Argon2id**.
   - Short-lived JWT access tokens and rotating refresh tokens stored in database.
   - Server-enforced authorization guards (deny-by-default).
   - Light, Dark, and System theme preferences with zero theme flash.

---

## 🛠️ Technology Stack

- **Monorepo:** PNPM Workspaces
- **Backend:** NestJS (v10+), TypeScript, Prisma ORM, Socket.IO, Argon2, Passport-JWT
- **Database:** PostgreSQL (Real native embedded cluster for local dev + Docker Compose config)
- **Frontend:** Next.js 15+ (App Router), React 19, TypeScript, Tailwind CSS, Lucide Icons, Zustand, TanStack Query
- **Testing:** Custom automated end-to-end integration test suite verifying all 38 domain rules

---

## 🚀 Quick Start & Development

### 1. Prerequisites
- Node.js (v20+ or v26+)
- PNPM (v10+ / v12+)

### 2. Install Dependencies
```bash
pnpm install
```

### 3. Start Database & Backend
To run native PostgreSQL (automatically initializes `.pgdata` on port 5432):
```bash
node apps/api/scripts/db-daemon.js
```

In another terminal, push database migrations:
```bash
pnpm --filter @chithi/api prisma:push
```

### 4. Run Everything in One Command
```bash
pnpm dev
```
This starts:
- PostgreSQL on `localhost:5432`
- NestJS API on `http://localhost:4000/api/v1` (Swagger Docs: `http://localhost:4000/api/docs`)
- Next.js Web on `http://localhost:3000`

---

## 🧪 Running Integration & WebRTC Calling Tests

### 1. Functional Integration Tests (51 Tests)
```bash
pnpm --filter @chithi/api exec ts-node test/integration-test.ts
```

### 2. Audio & Video Calling Signaling Suite (48 Tests)
```bash
pnpm --filter @chithi/api exec ts-node test/calling-test.ts
```

### 3. Real Headless Browser WebRTC Calling E2E (19 Checks)
```bash
node apps/web/test/browser-calling.test.js
```

---

## 📚 Documentation
- [Media Sharing & Profile Storage Architecture & API](MEDIA_API.md)
- [Media Sharing & Profile Delivery Verification Report](MEDIA_SHARING_AND_PROFILE_DELIVERY_REPORT.md)
- [Audio & Video Calling System (Phase 3.5)](AUDIO_VIDEO_CALLING.md)
- [WebRTC Architecture & Signaling Protocol](WEBRTC_ARCHITECTURE.md)
- [Coturn TURN Server Setup & Deployment](TURN_SERVER_SETUP.md)
- [Calling REST & WebSocket API Specification](CALLING_API.md)
- [Calling Verification & Test Report](CALLING_TEST_REPORT.md)
- [Production Deployment Guide](DEPLOYMENT.md)

---

## 📁 Monorepo Structure

```
D:\CHITHI\
├── apps/
│   ├── api/                    # NestJS REST & WebSocket API
│   │   ├── prisma/schema.prisma # Master Prisma Schema
│   │   ├── src/
│   │   │   ├── modules/        # Domain modules (auth, users, friendships, etc.)
│   │   │   └── main.ts         # Bootstrap entry point
│   │   └── test/               # Integration tests
│   └── web/                    # Next.js 15 App Router Frontend
│       └── src/
│           ├── app/            # Pages & routes
│           ├── components/     # UI components & providers
│           └── stores/         # Zustand state stores
├── database/
│   ├── schema.sql              # Master reference DDL
│   └── erd.mmd                 # Mermaid ER diagram
├── docs/                       # Architecture documents, progress, and logs
├── infra/
│   └── docker/                 # Production Docker Compose configurations
├── pnpm-workspace.yaml
├── package.json
└── README.md
```
