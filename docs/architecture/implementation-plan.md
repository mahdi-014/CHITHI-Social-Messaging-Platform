# CHITHI — Implementation Plan & Roadmap

## Phase 0: Foundation & Environment Setup
- [ ] Initialize PNPM workspace (`pnpm-workspace.yaml`, root `package.json`, `tsconfig.json`).
- [ ] Set up `packages/config` for shared tooling.
- [ ] Initialize NestJS backend in `apps/api` with TypeScript, ConfigModule, Prisma ORM, and Health module.
- [ ] Initialize Next.js 15+ frontend in `apps/web` with TypeScript, Tailwind CSS, Lucide icons, and theme provider.
- [ ] Configure PostgreSQL database connection and generate Prisma schema matching `database/schema.sql`.
- [ ] Verify local database connectivity, baseline migrations, and health check endpoint (`/health`).

## Phase 1: Authentication, Users & Profiles
- [ ] Implement `UsersModule`: user registration, exact username lookup, preview profiles.
- [ ] Implement `AuthModule`: Argon2id hashing, JWT access token, refresh token rotation, login/logout, session tracking in `user_sessions`.
- [ ] Implement `ProfilesModule`: profile retrieval, display name, bio, avatar/cover media linkage.
- [ ] Build Frontend Auth UI: Welcome, Register, Login, Profile setup with validation and toast notifications.

## Phase 2: Mutual Friendships & Privacy
- [ ] Implement `FriendshipsModule`:
  - Search user by exact username.
  - Send friend request (prevent self, duplicates, reverse duplicates, blocked).
  - List incoming/outgoing requests.
  - Accept friend request (transactional canonical friendship creation).
  - Reject/Cancel friend request.
  - Unfriend (removes friendship, retains message history, blocks new messages).
  - Block/Unblock user (bidirectional communication prevention).
- [ ] Build Frontend Friends UI: Friend list, pending requests tab, exact username search modal, unfriend/block actions.

## Phase 3: Direct Messaging & Real-Time Engine
- [ ] Implement `ConversationsModule`:
  - Idempotent direct conversation pair retrieval/creation between accepted friends.
  - List user conversations with last message preview and unread counts.
- [ ] Implement `MessagesModule`:
  - Cursor-based message history retrieval.
  - Send message with clientMessageId deduplication.
  - Transactional persistence + Outbox event generation.
  - Delivery and read receipts tracking.
  - Edit and delete message actions.
- [ ] Implement `RealtimeModule` (Socket.IO):
  - Authenticated socket gateway.
  - Rooms: `user:{userId}`, `conversation:{conversationId}`.
  - Events: `message:send`, `message:new`, `message:delivered`, `message:read`, `typing:start`, `typing:stop`, `presence:update`.
- [ ] Build Frontend Chat UI:
  - Sidebar with conversation list, unread badges, online indicator.
  - Active conversation panel, message bubbles, status indicators (sent/delivered/read), typing indicator, message composer.

## Phase 4: Media Uploads, Moments & Friends-Only Feed
- [ ] Implement `MediaModule`:
  - Upload intent endpoint (`POST /media/upload-intents`).
  - Pre-signed storage URL generator (MinIO/S3 or local static fallback).
  - Upload completion & media validation (`processing_status`).
- [ ] Implement `PostsModule`:
  - Create post (text, single/multi photo, video <= 60s).
  - Friends-only feed query (user's posts + accepted friends' posts only, chronological cursor pagination).
  - Post details, update caption, delete post.
- [ ] Implement `ReactionsModule` & `CommentsModule`:
  - Post reactions (like, love, etc.).
  - Threaded post comments and replies.
- [ ] Build Frontend Moments UI:
  - Feed view with post cards, media gallery, responsive video player.
  - Create Post dialog with image/video preview and caption editor.
  - Comments section and reaction button.

## Phase 5: Notifications & User Settings
- [ ] Implement `NotificationsModule`:
  - In-app notification generation on friend request, acceptance, message, reaction, comment.
  - Notification list and mark-as-read endpoints.
- [ ] Implement User Settings:
  - Theme preference (light/dark/system).
  - Privacy toggles (online status, last seen).
- [ ] Build Frontend Notifications & Settings UI.

## Phase 6: System Polish, Verification & Evidence
- [ ] End-to-end flow verification: Register -> Connect -> Chat in real-time -> Post Moment -> Verify feed privacy.
- [ ] Security checks: verify non-friend cannot message, non-friend cannot view private post, SQL injection prevention.
- [ ] Responsive layout verification (mobile & desktop).
- [ ] Comprehensive documentation and runnable startup scripts.
