# CHITHI — System Design Specification

**System:** CHITHI Social Messaging Platform  
**Architecture Style:** Modular Monolith in a PNPM Monorepo  
**Target Runtime:** Node.js (v26+ LTS), Next.js (App Router), NestJS, PostgreSQL, Redis, Socket.IO  

---

## 1. High-Level Architecture Overview

CHITHI is organized into a modular monolith to keep local and production operations maintainable while providing clean boundaries:

```
[ Browser Client (Next.js 15+ App Router) ]
       │                      ▲
  HTTPS REST              WSS Socket.IO
  (/api/v1/*)             (Events & Push)
       ▼                      │
┌─────────────────────────────┴─────────────────────────────┐
│                 NestJS Backend Application                │
│                                                           │
│  [ Auth ]        [ Users ]       [ Profiles ]             │
│  [ Friendships ] [ Conversations][ Messages ]             │
│  [ Posts ]       [ Reactions ]   [ Comments ]             │
│  [ Media ]       [ Notifications][ Moderation ]           │
│  [ Realtime Gateway ]            [ Health Check ]         │
└──────────────┬────────────────────────────┬───────────────┘
               │                            │
               ▼                            ▼
   [ PostgreSQL Database ]          [ Redis Cache / Broker ]
   - Source of truth                - Presence state
   - Transactional outbox           - Socket.IO adapter
   - UUID PKs & constraints         - Job queue (BullMQ)
               │
               ▼
   [ S3 / MinIO Object Storage ]
   - Private media assets
   - Signed pre-signed PUT / GET URLs
```

---

## 2. Monorepo Structure

```
D:\CHITHI\
├── apps/
│   ├── web/                    # Next.js 15+ frontend application
│   │   ├── src/
│   │   │   ├── app/            # App router pages & layouts
│   │   │   ├── components/     # UI components (shadcn/ui style)
│   │   │   ├── features/       # Chat, Friends, Moments, Profile
│   │   │   ├── hooks/          # React hooks & custom integrations
│   │   │   ├── stores/         # Zustand state stores
│   │   │   ├── lib/            # Socket client, API client, utils
│   │   │   └── styles/         # Tailwind CSS & theme tokens
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── api/                    # NestJS backend application
│       ├── src/
│       │   ├── common/         # Auth guards, decorators, filters
│       │   ├── config/         # Environment configuration
│       │   ├── database/       # Prisma service & schema
│       │   ├── infrastructure/ # Redis, storage, outbox publisher
│       │   ├── modules/        # Modular domain feature modules
│       │   │   ├── auth/
│       │   │   ├── users/
│       │   │   ├── profiles/
│       │   │   ├── friendships/
│       │   │   ├── conversations/
│       │   │   ├── messages/
│       │   │   ├── media/
│       │   │   ├── posts/
│       │   │   ├── reactions/
│       │   │   ├── comments/
│       │   │   ├── notifications/
│       │   │   ├── moderation/
│       │   │   ├── realtime/
│       │   │   └── health/
│       │   ├── app.module.ts
│       │   └── main.ts
│       ├── package.json
│       └── tsconfig.json
├── database/
│   ├── schema.sql              # Master reference PostgreSQL DDL
│   └── erd.mmd                 # Mermaid ERD
├── packages/
│   └── config/                 # Shared TypeScript/ESLint configs
├── docs/                       # Project documentation & logs
├── pnpm-workspace.yaml
├── package.json
└── README.md
```

---

## 3. Communication Patterns

### 3.1 REST API (`/api/v1`)
- Standardized request/response JSON envelope.
- Global exception filter catching errors with consistent structure:
  ```json
  {
    "statusCode": 400,
    "code": "VALIDATION_FAILED",
    "message": "Username must be between 3 and 30 characters.",
    "requestId": "req_abc123",
    "details": null
  }
  ```
- Strict DTO validation with `class-validator` and `class-transformer`.
- JWT access tokens (short-lived, 15m) and rotating refresh tokens (7d).

### 3.2 Real-Time Gateway (Socket.IO)
- Socket handshake verifies Bearer JWT token from query or `auth` payload.
- Clients automatically join room `user:{userId}` upon connection.
- After verifying membership in conversation `C`, client joins `conversation:{conversationId}`.
- Outbox worker or direct domain event publishers dispatch to authorized rooms.
- Client reconnection replays messages after cursor timestamp.

---

## 4. Security & Privacy Architecture
1. **Deny-by-Default Authorization:** Every private endpoint requires active authentication and resource-level authorization.
2. **Password Security:** Argon2id with 64MB memory cost, 3 iterations, and 4 parallelism lanes.
3. **Friendship Invariant:** Direct conversations can only be created between mutual, non-blocked friends.
4. **Media Isolation:** Storage buckets are private; downloads are protected by 15-minute presigned URLs verified against friendship or conversation membership.
