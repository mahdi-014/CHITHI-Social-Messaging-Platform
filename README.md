# CHITHI — Social Messaging Platform

> **Quiet Connection** — A modern, web-first, privacy-focused social messaging platform built for genuine human connection, seamless real-time messaging, end-to-end peer-to-peer audio/video calling, and permanent moments.

---

## 1. Project Title & Introduction

**CHITHI** (চিঠি — meaning *a letter* or *personal message*) is a full-stack social messaging platform designed to foster meaningful, intentional connections without algorithmic noise, invasive tracking, or predatory engagement loops.

The platform is architected as a high-performance monorepo featuring a **Next.js 15** frontend and a modular **NestJS 11** backend, backed by **PostgreSQL 16** with **Prisma ORM**, real-time bidirectional WebSocket signaling via **Socket.IO**, and peer-to-peer DTLS-SRTP encrypted voice and video calling via **WebRTC**.

---

## 2. Product Overview

In contrast to conventional platforms dominated by broadcast feeds, public influencer metrics, and algorithmic amplification, CHITHI focuses on:
- **Friend-Based Privacy**: Content, moments, direct messaging, and active call channels are strictly restricted to mutually accepted friends.
- **Intentional Discovery**: Exact username lookup replaces stranger browsing, protecting user privacy and preventing unsolicited contact.
- **Pure Tactile Design**: An analog-inspired, borderless "Quiet Connection" visual identity with balanced light and dark modes, restrained animations, and zero visual clutter.
- **Data Sovereignty**: Complete user ownership over personal profiles, moments, media uploads, and messaging history with instant deletion and cascade cleanup.

---

## 3. Core Features

### 3.1 Authentication & Session Management
- Registration with unique usernames (`@username`), email validation, display names, and password hashing via **Argon2id**.
- Stateless **JWT Access Tokens** (15-minute lifetime) paired with cryptographically hashed **Refresh Tokens** (7-day lifetime) stored in PostgreSQL.
- Multi-device session tracking with remote session invalidation and sign-out capabilities.

### 3.2 Mutual Friendship & Privacy Boundaries
- Explicit send, cancel, accept, and reject workflows for friend requests.
- Strict database-enforced bilateral symmetry (`user_low_id < user_high_id`) preventing duplicate friendships.
- User blocking with bilateral communication cutoff across search, messages, moments, calls, and notifications.

### 3.3 Real-Time Direct Messaging
- 1-on-1 conversations with instant delivery via Socket.IO WebSocket connections.
- Optimistic UI updates with client-generated UUIDs preventing duplicate dispatch.
- Real-time typing indicators with automatic debounce timeouts.
- Server-acknowledged delivery receipts and peer read receipts.
- Offline message queuing and history pagination using cursor-based ordering.

### 3.4 Media Sharing & Lightbox
- 3-step intent-based upload pipeline: Intent authorization -> Binary upload -> Relation linkage.
- In-flight media previews, file validation (MIME and binary magic bytes), and upload progress tracking.
- Inline photo rendering and HTML5 video playback with byte-range streaming (`RFC 7233`).
- Full-screen high-resolution lightbox modal with zoom and responsive scaling.

### 3.5 Moments (Social Feed)
- Friends-only permanent and ephemeral post sharing.
- Multi-media attachments (images up to 25 MB, videos up to 100 MB).
- Real-time reactions (Heart, Like, Laugh, Care) and threaded comments.
- Real-time caption editing and post deletion with instant feed synchronization.

### 3.6 Profile & Cover Picture Management
- Dynamic user profiles with display names, customizable bios, and social statistics.
- Profile photo and cover photo upload with client-side preview, repositioning, and cropping.
- Seamless fallback rendering when custom media is absent.

### 3.7 WebRTC 1-on-1 Audio & Video Calling
- Direct voice and video calling from any mutual chat thread.
- Real-time Web Audio API synthesized ringing and outgoing tones.
- Full-duplex peer-to-peer encrypted media streams (`DTLS-SRTP`).
- In-call controls: Microphone mute/unmute, Camera toggle, Picture-in-Picture floating view, and duration timer.
- RFC 5766 REST API integration for dynamic ephemeral STUN/TURN relay tokens.
- PostgreSQL-backed call state machine and cursor-paginated call history modal.

---

## 4. Key Architectural Decisions

1. **Monorepo Architecture (PNPM Workspaces)**: Shared TypeScript configurations, isolated dependency trees, and unified development and build workflows across `apps/api` and `apps/web`.
2. **NestJS Modular Backend**: Domain-driven feature modules (`Auth`, `Users`, `Profiles`, `Friendships`, `Conversations`, `Messages`, `Posts`, `Comments`, `Reactions`, `Media`, `Calls`, `Notifications`, `Realtime`) ensuring separation of concerns and dependency injection.
3. **Strict Relational Data Modeling**: Foreign key constraints with explicit cascade and `SET NULL` policies ensure 0 orphan records across 24 database tables.
4. **DTLS-SRTP Encrypted Media Plane**: Audio and video never touch the application backend, ensuring zero media latency, complete end-to-end encryption, and horizontal scalability.
5. **Intent-Based Media Uploads**: Protects storage from unauthenticated file dumps by requiring a signed database intent before accepting binary payloads.
6. **Pure Borderless Visual Language**: Elimination of harsh 1px bounding boxes and dividers in favor of subtle surface tints, organic wave curves, and tactile elevation.

---

## 5. Technology Stack

### Frontend (`apps/web`)
- **Framework**: Next.js 15 (App Router, React 19)
- **State Management**: Zustand (Auth, Chat, Calling stores)
- **Styling**: Tailwind CSS, Next Themes (Light/Dark mode)
- **Icons**: Lucide React
- **Real-Time Client**: Socket.IO Client (`socket.io-client`)
- **WebRTC Client**: Native WebRTC (`RTCPeerConnection`, `navigator.mediaDevices`)

### Backend (`apps/api`)
- **Framework**: NestJS 11 (Express platform)
- **Language**: TypeScript 5.7
- **Database ORM**: Prisma ORM 6
- **Database Engine**: PostgreSQL 16
- **Real-Time Gateway**: Socket.IO (`@nestjs/websockets`, `@nestjs/platform-socket.io`)
- **Authentication**: Passport.js, JWT (`@nestjs/jwt`), Argon2 (`argon2`)
- **Security**: Helmet, CORS, Class Validator, Magic Byte file inspectors
- **Storage Providers**: Local disk storage & AWS S3 / MinIO adapter

### DevOps & Infrastructure
- **Containerization**: Docker, Docker Compose
- **Reverse Proxy**: Nginx (Alpine)
- **Package Manager**: PNPM 9+ with frozen lockfile

---

## 6. System Architecture

```mermaid
flowchart TD
    Client["Web / Mobile Browser Client"]
    Nginx["Nginx Reverse Proxy (:80 / :443)"]
    Web["Next.js Web Frontend (:3000)"]
    API["NestJS API & Socket.IO (:4000)"]
    PG[("PostgreSQL 16 Database (:5432)")]
    MediaStore[("Media Storage (Local / S3)")]
    PeerB["Peer Client (WebRTC)"]
    TurnServer["Coturn TURN/STUN Server (:3478 / :5349)"]

    Client -->|HTTP / HTTPS / WSS| Nginx
    Nginx -->|/api/* & /socket.io/*| API
    Nginx -->|/*| Web
    API -->|Prisma Client Pool| PG
    API -->|Stream / Binary Save| MediaStore
    Client <-->|Socket.IO Signaling| API
    Client <===>|DTLS-SRTP P2P Audio/Video| PeerB
    Client -.->|Relay Fallback when Symmetric NAT| TurnServer
    PeerB -.->|Relay Fallback when Symmetric NAT| TurnServer
```

---

## 7. Project Directory Structure

```
D:\CHITHI
├── .github/
│   └── workflows/
│       └── ci.yml               # Automated CI workflow
├── apps/
│   ├── api/                     # NestJS Backend Application
│   │   ├── prisma/
│   │   │   └── schema.prisma    # Authoritative database models
│   │   ├── scripts/             # Operational, backup, and recovery scripts
│   │   │   ├── backup-db.js
│   │   │   ├── db-daemon.js
│   │   │   ├── restore-db.js
│   │   │   ├── verify-backup-recovery.js
│   │   │   └── verify-db-schema-constraints.js
│   │   ├── src/                 # Backend source modules
│   │   │   ├── common/          # Guards, filters, decorators
│   │   │   ├── config/          # Environment configuration
│   │   │   ├── database/        # Database module & Prisma service
│   │   │   ├── modules/         # Domain feature modules
│   │   │   └── main.ts          # Application entrypoint
│   │   ├── test/                # API integration test suites
│   │   └── Dockerfile           # Multi-stage production container build
│   └── web/                     # Next.js Frontend Application
│       ├── public/              # Static brand assets & icons
│       │   └── brand/           # Logos, monogram, favicons, scenic covers
│       ├── src/
│       │   ├── app/             # Next.js App Router pages
│       │   ├── components/      # UI, Calling, Profile & Chat components
│       │   ├── hooks/           # WebRTC and browser hooks
│       │   ├── lib/             # API client & socket connectors
│       │   ├── stores/          # Zustand application stores
│       │   └── styles/          # Global styles & design system tokens
│       ├── test/                # Automated browser E2E test suites
│       └── Dockerfile           # Multi-stage production container build
├── database/
│   ├── erd.mmd                  # Mermaid Entity-Relationship diagram
│   └── schema.sql               # PostgreSQL initial relational DDL
├── docker/
│   ├── nginx/
│   │   └── nginx.conf           # Production Nginx reverse proxy configuration
│   └── docker-compose.dev.yml   # Local infrastructure services
├── docs/                        # Consolidated architecture documentation
│   ├── api/
│   │   └── openapi.yaml         # OpenAPI 3.1 specification
│   ├── architecture/            # System designs & technical decisions
│   └── diagrams/                # Architectural diagrams
├── packages/
│   └── config/                  # Shared TypeScript configuration
├── scripts/
│   └── dev.js                   # Unified development process orchestrator
├── .env.example                 # Documented environment template
├── .gitignore                   # Hardened Git exclusion rules
├── .npmrc                       # PNPM configuration
├── docker-compose.prod.yml      # Hardened production container deployment
├── package.json                 # Monorepo root configuration
├── pnpm-lock.yaml               # Frozen dependency lockfile
└── pnpm-workspace.yaml          # Monorepo workspace configuration
```

---

## 8. Backend Architecture Overview

The NestJS backend runs on Node.js and adheres to strict modular boundaries:

- **AuthModule**: Handles user registration, Argon2 password verification, JWT issuance, and refresh token rotation.
- **UsersModule**: Handles exact username search, presence tracking, and account settings.
- **ProfilesModule**: Manages user profiles, biographies, and avatar/cover media relationships.
- **FriendshipsModule**: Enforces bilateral friendship invariants, request acceptance, mutual authorization checks, and blocking.
- **ConversationsModule**: Creates and retrieves 1-on-1 direct conversation pairs and group threads.
- **MessagesModule**: Handles message dispatch, attachment linkage, delivery timestamps, and cursor pagination.
- **PostsModule & CommentsModule & ReactionsModule**: Powers the social Moments feed with multimedia support and threaded replies.
- **MediaModule**: Enforces file upload intents, binary magic byte validation, and RFC 7233 partial content streaming.
- **CallsModule**: Orchestrates 1-on-1 voice/video sessions, manages state transitions, and issues short-lived RFC 5766 TURN credentials.
- **RealtimeModule**: Socket.IO gateway routing real-time signaling, typing indicators, read receipts, and online status.

---

## 9. Frontend Architecture Overview

The Next.js 15 client provides an ultra-responsive, four-column desktop experience that adapts smoothly to mobile devices:

- **Column 1 — Navigation Sidebar**: CHITHI brand mark, rounded navigation pills (`Chats`, `Friends`, `Moments`, `Profile`, `Settings`), theme switcher (Light/Dark), and active user card.
- **Column 2 — Conversation List**: Instant search bar (`Search chats...`), call history launcher, new chat composer, and unread badges.
- **Column 3 — Active Chat Canvas**: Contact details, presence badge, calling actions (voice/video), flowing organic wave background, message stream, and rounded pill composer.
- **Column 4 — Contact Profile Details**: Scenic landscape cover banner, overlapping profile picture, bio, social stats (Friends, Moments, Posts), and direct action button.

State is managed cleanly across dedicated Zustand stores (`auth.store.ts`, `chat.store.ts`, `call.store.ts`), avoiding unnecessary re-renders.

---

## 10. Database Architecture Overview

The PostgreSQL database enforces relational integrity across **24 base tables**:

| Table | Purpose | Cascade / Constraints |
|---|---|---|
| `users` | Primary user identity & credentials | Unique usernames and emails |
| `user_profiles` | Display names, bios, custom avatars | Cascades on user deletion |
| `user_settings` | Privacy, notification, and theme preferences | Cascades on user deletion |
| `user_sessions` | Active JWT refresh sessions & device tracking | Cascades on user deletion |
| `friendships` | Bilateral accepted friendship links | Low/High ID constraint prevents duplicates |
| `friend_requests` | Pending, accepted, and rejected friend requests | Unique sender/receiver constraint |
| `blocks` | Bilateral communication blocks | Enforced across search and calls |
| `conversations` | Direct and group conversation metadata | Links last message and timestamps |
| `conversation_members` | Membership records and read markers | Cascades on conversation deletion |
| `direct_conversation_pairs`| Enforces exactly one conversation per pair | Unique pair constraint |
| `messages` | Text, image, and video messages | Indexed for fast cursor pagination |
| `message_attachments` | Connects messages to uploaded media | Ordered by sort index |
| `message_receipts` | Per-user delivery and read receipts | Tracks timestamps |
| `media_assets` | Binary files, MIME types, dimensions, storage keys| Magic byte verified |
| `posts` | Moments feed entries | Author indexed with cursor ordering |
| `post_media` | Media attachments on Moments posts | Cascades on post deletion |
| `post_reactions` | Emoji reactions on Moments | Unique user/post constraint |
| `post_comments` | Threaded comments on Moments | Supports nested parent comments |
| `call_sessions` | WebRTC audio/video call log and status | State machine validated |
| `notifications` | In-app alerts for requests, mentions, missed calls | User indexed |
| `outbox_events` | Transactional outbox event store | Guaranteed delivery |
| `devices` | Device tokens for push notifications | Linked to user sessions |
| `reports` | Abuse reports and moderation queue | Tracks status and reporter |
| `message_reactions` | Emoji reactions on chat messages | Unique user/message constraint |

---

## 11. API Specifications

All endpoints are versioned under `/api/v1`. Full documentation is available in [`docs/api/openapi.yaml`](docs/api/openapi.yaml).

### Summary of Core Endpoints

#### Authentication
- `POST /api/v1/auth/register` — Register a new account.
- `POST /api/v1/auth/login` — Authenticate and receive tokens.
- `POST /api/v1/auth/refresh` — Rotate refresh token and issue new access token.
- `POST /api/v1/auth/logout` — Invalidate session.

#### Users & Profiles
- `GET /api/v1/users/me` — Retrieve active authenticated user.
- `GET /api/v1/users/search?username=...` — Exact username search preview.
- `GET /api/v1/profiles/:userId` — Retrieve public profile and friendship status.
- `PATCH /api/v1/profiles/me` — Update bio, display name, and avatar/cover media IDs.
- `DELETE /api/v1/profiles/me/avatar` — Remove profile avatar (revert to fallback).
- `DELETE /api/v1/profiles/me/cover` — Remove cover photo (revert to fallback).

#### Friendships & Blocks
- `POST /api/v1/friend-requests` — Send a friend request.
- `POST /api/v1/friend-requests/:id/accept` — Accept pending request.
- `POST /api/v1/friend-requests/:id/reject` — Reject pending request.
- `DELETE /api/v1/friendships/:friendId` — Unfriend user.
- `POST /api/v1/blocks/:userId` — Block user.

#### Conversations & Messages
- `GET /api/v1/conversations` — Retrieve user conversations sorted by activity.
- `POST /api/v1/conversations/direct` — Start or get direct chat with an accepted friend.
- `GET /api/v1/conversations/:id/messages` — Cursor-paginated message history.
- `POST /api/v1/conversations/:id/messages` — Dispatch message with optional attachments.

#### Media Management
- `POST /api/v1/media/upload-intents` — Request pre-authorized upload intent.
- `POST /api/v1/media/:id/upload` — Upload multipart binary file.
- `POST /api/v1/media/:id/complete` — Finalize upload and activate asset.
- `GET /api/v1/media/:id/file` — Stream media with RFC 7233 range support.

#### WebRTC Calling
- `GET /api/v1/calls/turn-credentials` — Fetch ephemeral RFC 5766 TURN credentials.
- `POST /api/v1/calls/invite` — Initiate 1-on-1 voice or video call.
- `POST /api/v1/calls/:id/accept` — Callee accepts call.
- `POST /api/v1/calls/:id/reject` — Callee declines call.
- `POST /api/v1/calls/:id/end` — Terminate active call.
- `GET /api/v1/calls/history` — Paginated voice/video call history.

---

## 12. Authentication & Security

- **Argon2id Hashing**: Industry-standard memory-hard hashing protecting user credentials against GPU/ASIC attacks.
- **Short-Lived JWTs**: Access tokens expire in 15 minutes; refresh tokens are stored in the database as SHA-256 hashes and rotated upon use.
- **File Upload Verification**: Files are checked via magic bytes (`FF D8 FF` for JPEG, `89 50 4E 47` for PNG, `52 49 46 46` for WebP, `ftyp` for MP4, EBML header for WebM) to prevent polyglot attacks.
- **Deny-by-Default Authorization**: Chat messages, attachments, and moments require authenticated friendship or membership.
- **Cross-Origin Resource Policy (CORP)**: Explicitly configured headers allow browser media elements to stream audio and video without security exceptions.
- **Zero Insecure Defaults**: Production configurations require explicit environment variables and fail safely if secrets are missing.

---

## 13. Real-Time Communication Architecture

Socket.IO manages bidirectional real-time events over a single persistent WebSocket connection:

| Event | Direction | Payload / Purpose |
|---|---|---|
| `message:send` | Client -> Server | Dispatches new chat message |
| `message:new` | Server -> Client | Broadcasts incoming message to conversation members |
| `message:read` | Client -> Server | Dispatches read receipt |
| `typing:start` / `stop` | Client -> Server | Dispatches typing state indicator |
| `presence:status` | Server -> Client | Broadcasts user online / offline transitions |
| `call:invite` | Server -> Client | Notifies callee of incoming voice or video call |
| `call:webrtc-signal` | Bidirectional | Exchanges SDP offers, answers, and ICE candidates |
| `call:ended` | Server -> Client | Closes call modals on both ends immediately |

---

## 14. Media Storage Architecture

CHITHI provides a modular storage layer supporting both local file storage and cloud object storage (AWS S3, MinIO, Cloudflare R2):

- **Development**: Files reside in `./uploads` with relative paths.
- **Production Containers**: Files persist in a dedicated named Docker volume (`uploads_data:/app/uploads`).
- **Cloud Deployments**: Set `STORAGE_PROVIDER=s3` with standard S3 credentials.
- **Video Seeking**: RFC 7233 byte-range handling ensures videos start playing instantly and users can scrub forward without downloading the entire file.

---

## 15. WebRTC Audio & Video Calling

```
+---------------+                              +---------------+
|   Caller A    |       Socket.IO Signaling    |    Callee B   |
|  (useWebRTC)  | <==========================> |  (useWebRTC)  |
+-------+-------+                              +-------+-------+
        |                                              |
        |          DTLS-SRTP Encrypted P2P Media       |
        +==============================================+
                  (WebRTC RTCPeerConnection)
                             |
                   STUN/TURN Relay Fallback
                  (Coturn / RFC 5766 HMAC-SHA1)
```

1. **Signaling**: SDP Offers, SDP Answers, and Trickle ICE candidates travel through Socket.IO.
2. **P2P Connection**: Direct UDP peer-to-peer connection is established using STUN discovery.
3. **TURN Relay Fallback**: If both peers are behind symmetric NATs or corporate firewalls, traffic is relayed via Coturn using ephemeral HMAC-SHA1 credentials.
4. **Hardware Controls**: In-flight audio track mute, video track enable/disable, and camera stream switching without disconnecting the call.

---

## 16. Prerequisites

Ensure the following tools are installed on your host machine:

- **Node.js**: `20.x` or `22.x` LTS
- **PNPM**: `9.x` or later (`npm install -g pnpm`)
- **PostgreSQL**: `16.x` (or use the included embedded database runner)
- **Docker & Docker Compose**: (Optional, for containerized deployments)
- **Google Chrome / Chromium**: (Required for running headless browser E2E test suites)

---

## 17. Installation Instructions

1. **Clone the repository**:
   ```bash
   git clone https://github.com/mahdi-014/CHITHI-Social-Messaging-Platform.git
   cd CHITHI
   ```

2. **Install dependencies using the frozen lockfile**:
   ```bash
   pnpm install --frozen-lockfile
   ```

3. **Initialize environment configuration**:
   ```bash
   cp .env.example .env
   ```

---

## 18. Environment Configuration

The following table details all configuration keys recognized by CHITHI:

| Variable | Description | Default / Example | Required |
|---|---|---|---|
| `PORT` | NestJS API listening port | `4000` | No |
| `NODE_ENV` | Environment mode (`development` / `production`) | `development` | Yes |
| `DATABASE_URL` | PostgreSQL connection string with pooling parameters | `postgresql://chithi:chithi_secret@localhost:5432/chithi_db?schema=public` | Yes |
| `JWT_ACCESS_SECRET` | 256-bit secret key for signing access tokens | Min 32 characters | Yes |
| `JWT_ACCESS_EXPIRES_IN`| Lifetime of access token | `15m` | No |
| `JWT_REFRESH_SECRET` | 256-bit secret key for signing refresh tokens | Min 32 characters | Yes |
| `JWT_REFRESH_EXPIRES_IN`| Lifetime of refresh token | `7d` | No |
| `STORAGE_PROVIDER` | Media storage provider (`local` or `s3`) | `local` | No |
| `STORAGE_LOCAL_PATH` | Storage directory for local provider | `./uploads` | No |
| `S3_ENDPOINT` | Custom endpoint for S3 / MinIO | `http://localhost:9000` | When S3 |
| `S3_BUCKET_NAME` | Bucket name for media assets | `chithi-media` | When S3 |
| `NEXT_PUBLIC_API_URL` | Frontend REST API base URL | `http://localhost:4000/api/v1` | Yes |
| `NEXT_PUBLIC_SOCKET_URL`| Frontend WebSocket connection URL | `http://localhost:4000` | Yes |
| `STUN_SERVERS` | STUN discovery servers (comma-separated) | `stun:stun.l.google.com:19302` | No |
| `TURN_SERVER_URL` | Coturn TURN relay address | `turn:turn.domain.com:3478` | When TURN |
| `TURN_SECRET` | Shared secret for RFC 5766 HMAC-SHA1 tokens | Min 32 characters | When TURN |

---

## 19. Local Development Instructions

Start the complete development stack (PostgreSQL daemon, NestJS API, and Next.js Web) with a single command:

```bash
pnpm dev
```

Alternatively, run each component in separate terminals:

```bash
# Terminal 1: Start PostgreSQL daemon
node apps/api/scripts/db-daemon.js

# Terminal 2: Start NestJS Backend
pnpm --filter @chithi/api start:dev

# Terminal 3: Start Next.js Frontend
pnpm --filter @chithi/web dev
```

The services will be available at:
- **Frontend Web Application**: [http://localhost:3000](http://localhost:3000)
- **Backend REST API**: [http://localhost:4000/api/v1](http://localhost:4000/api/v1)
- **API Health Check**: [http://localhost:4000/health](http://localhost:4000/health)

---

## 20. Available Development Commands

| Command | Description |
|---|---|
| `pnpm dev` | Starts all services in development mode |
| `pnpm build` | Compiles both API and Web for production |
| `pnpm build:api` | Compiles NestJS backend into `apps/api/dist` |
| `pnpm build:web` | Compiles Next.js frontend into `apps/web/.next` |
| `pnpm test` | Executes automated test suites across all packages |
| `pnpm lint` | Runs linter checks across all packages |
| `node apps/api/scripts/backup-db.js` | Generates a full transactional database backup with SHA-256 |
| `node apps/api/scripts/verify-db-schema-constraints.js` | Audits all 24 tables, constraints, foreign keys, and indexes |
| `node apps/api/scripts/verify-backup-recovery.js` | Runs an isolated backup and restore cycle validation |

---

## 21. Automated Testing Instructions

CHITHI includes a comprehensive suite of automated tests verifying backend contracts, security invariants, WebRTC calling, and real headless browser interactions:

```bash
# 1. Real Browser End-to-End Test Suite (Registration, Search, Chat, Moments, Feed)
node apps/web/test/browser-e2e.test.js

# 2. WebRTC Voice & Video Calling E2E (Signaling, Media Exchange, Mute, PiP, Call History)
node apps/web/test/browser-calling.test.js

# 3. Media Sharing & Profile Image Storage Test Suite (Magic bytes, Range requests, Lightbox)
node apps/web/test/media-sharing-and-profile.test.js

# 4. Profile & Settings Browser Suite (Bio editing, Theme toggle, Privacy switches)
node apps/web/test/browser-profile-settings.test.js

# 5. Cover Photo Repair & Cropper Verification (Pointer events, Persistence across login)
node apps/web/test/verify-cover-repair.js

# 6. Database Schema Constraints & Orphan Records Audit
node apps/api/scripts/verify-db-schema-constraints.js

# 7. Database Backup & Disaster Recovery Cycle
node apps/api/scripts/verify-backup-recovery.js
```

---

## 22. Production Deployment Guide

### Deployment Checklist
1. Provision a Linux VM (Ubuntu 22.04 LTS / 24.04 LTS recommended) with Docker and Docker Compose installed.
2. Point your DNS records:
   - `chithi.yourdomain.com` -> VM Public IP (A Record)
3. Ensure inbound ports are open:
   - `80/tcp` (HTTP) & `443/tcp` (HTTPS)
   - `3478/udp`, `3478/tcp`, `5349/tcp`, `49152:65535/udp` (if running Coturn on the same host)

---

## 23. Docker Deployment Instructions

Deploy the complete production stack (PostgreSQL, NestJS API, Next.js Web, and Nginx reverse proxy):

```bash
# 1. Create a production environment file with secure random secrets
cp .env.example .env.prod

# Generate production secrets
openssl rand -hex 32 # Set as JWT_ACCESS_SECRET
openssl rand -hex 32 # Set as JWT_REFRESH_SECRET
openssl rand -hex 24 # Set as POSTGRES_PASSWORD

# 2. Build and launch containers in detached mode
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build

# 3. Run database migrations inside the API container
docker compose -f docker-compose.prod.yml exec api pnpm prisma:push

# 4. Confirm container health
docker compose -f docker-compose.prod.yml ps
```

---

## 24. Database Migration & Initialization Instructions

- **Prisma Schema Location**: [`apps/api/prisma/schema.prisma`](apps/api/prisma/schema.prisma)
- **Pushing Schema Changes to Database**:
  ```bash
  cd apps/api
  npx prisma db push
  ```
- **Generating Prisma Client**:
  ```bash
  cd apps/api
  npx prisma generate
  ```
- **Auditing Schema Constraints**:
  ```bash
  node apps/api/scripts/verify-db-schema-constraints.js
  ```

---

## 25. TURN Server (Coturn) Configuration Requirements

For production voice and video calling across restrictive cellular networks and corporate firewalls:

1. Install Coturn:
   ```bash
   sudo apt-get update && sudo apt-get install -y coturn
   ```

2. Configure `/etc/turnserver.conf`:
   ```ini
   listening-port=3478
   tls-listening-port=5349
   fingerprint
   lt-cred-mech
   use-auth-secret
   static-auth-secret=YOUR_SECURE_32_CHAR_TURN_SECRET
   realm=turn.yourdomain.com
   external-ip=YOUR_PUBLIC_SERVER_IP
   min-port=49152
   max-port=65535
   ```

3. Configure CHITHI environment variables:
   ```env
   TURN_SECRET=YOUR_SECURE_32_CHAR_TURN_SECRET
   TURN_URLS=turn:turn.yourdomain.com:3478?transport=udp,turn:turn.yourdomain.com:3478?transport=tcp
   STUN_URLS=stun:stun.l.google.com:19302,stun:stun1.l.google.com:19302
   ```

---

## 26. Backup & Recovery Instructions

CHITHI includes built-in transactional backup and restoration utilities:

### Creating a Backup
```bash
node apps/api/scripts/backup-db.js
```
- Creates a timestamped JSON dump containing table metadata, row counts, and data rows under `apps/api/backups/`.
- Computes and logs a SHA-256 cryptographic checksum for tamper verification.

### Restoring a Backup
```bash
node apps/api/scripts/restore-db.js apps/api/backups/backup-<timestamp>.json
```
- Verifies the file's SHA-256 checksum before touching the database.
- Executes within an isolated transaction; automatically rolls back if any foreign key constraint is violated.

---

## 27. Health Checks & Troubleshooting

### Health Check Endpoints
- **Liveness Probe**: `GET /health` -> Returns `200 OK` `{ "status": "ok" }`.
- **Readiness Probe**: `GET /ready` -> Validates PostgreSQL database connectivity and returns `200 OK`.

### Troubleshooting Common Issues
- **`502 Bad Gateway` on Nginx**: Verify that the `api` and `web` containers are healthy (`docker compose -f docker-compose.prod.yml ps`).
- **WebRTC Calls fail to connect**: Ensure UDP ports `49152-65535` and `3478` are open on the firewall and the `TURN_SECRET` matches the Coturn configuration.
- **Media Upload rejected with 400**: Check that the file MIME type matches its binary magic bytes and does not exceed category size limits (100 MB for video).

---

## 28. Security Considerations

- **Secrets Management**: Never commit `.env` or `.env.prod` files. Always pass secrets via secure environment variables.
- **Database Isolation**: The production PostgreSQL container does not expose port 5432 to the host network; it is strictly accessible within the internal Docker bridge network.
- **Rate Limiting**: Nginx configuration limits request rates on sensitive endpoints (`/auth/login`, `/auth/register`).
- **Sanitization**: All client inputs are validated via `class-validator` DTOs with whitelist rejection.

---

## 29. Production Readiness Limitations

- **Horizontal Scaling**: Socket.IO currently operates with the in-memory adapter. For multi-node API clusters, configure the `@socket.io/redis-adapter` using the provided Redis environment variables.
- **Physical Mobile Camera/Mic**: WebRTC calling has been verified in real Chromium browser contexts with virtual media devices. Production deployment requires valid SSL/TLS certificates (HTTPS/WSS) because browsers enforce secure contexts for `getUserMedia`.

---

## 30. License & Maintenance Information

CHITHI is maintained as a clean, modular, and privacy-respecting messaging platform.

Copyright (c) 2026 CHITHI Social Messaging Platform. All rights reserved.
