# CHITHI — Task Backlog & Completion Status

## Phase 0: Workspace & Infrastructure
- [x] Analyze master prompt and full project documentation.
- [x] Create architecture and traceability documentation.
- [x] Initialize PNPM workspace and root config.
- [x] Setup `apps/api` (NestJS modular backend).
- [x] Setup `apps/web` (Next.js 15+ frontend).
- [x] Configure Prisma ORM with PostgreSQL database schema.
- [x] Validate database connection and health endpoints.

## Phase 1: Authentication & Profiles
- [x] Auth DTOs & Argon2id password hashing.
- [x] Register & Login endpoints with JWT rotation.
- [x] JWT authentication guard & strategy.
- [x] User profile and settings endpoints.
- [x] Frontend authentication forms & state (Welcome, Login, Register).

## Phase 2: Friendships
- [x] Exact username search endpoint.
- [x] Send, accept, reject friend request logic.
- [x] Friendship database transactions (`user_low_id`, `user_high_id`).
- [x] Block and unblock logic with communication isolation.
- [x] Frontend Friends tab & management modals.

## Phase 3: Direct Messaging
- [x] Direct conversation pair management.
- [x] Message persistence with outbox events.
- [x] Socket.IO realtime gateway & event handlers.
- [x] Delivery & read receipts with cursor pagination.
- [x] Frontend real-time Chat interface with typing indicators and receipts.

## Phase 4: Moments & Feed
- [x] Media upload intent & validation.
- [x] Post creation (text, photo, video <= 60s).
- [x] Chronological friends-only feed query.
- [x] Post reactions and comments.
- [x] Frontend Moments feed UI.

## Phase 5: Notifications & Polish
- [x] Notification generation & read endpoints.
- [x] Theme toggling (Light / Dark / System).
- [x] Responsive navigation and mobile drawer.
- [x] Integration test suite (38/38 tests passing).

## Phase 3.5: Real-Time Audio & Video Calling
- [x] Prisma Schema `CallSession`, `CallType`, `CallStatus`, `CallEndReason`.
- [x] Short-lived Coturn-compatible TURN credential generator (RFC 5766 HMAC-SHA1).
- [x] NestJS `CallsModule` (invite, accept, reject, cancel, timeout, end, history).
- [x] Socket.IO Signaling Gateway (`call:invite`, `call:ringing`, `call:accept`, `call:reject`, `call:cancel`, `call:offer`, `call:answer`, `call:ice-candidate`, `call:end`).
- [x] Frontend `useWebRTCCall` hook and centralized React `CallProvider`.
- [x] Web Audio API synthesized ringback & incoming ringtones.
- [x] Calling UI components: `IncomingCallModal`, `ActiveCallModal` (Video/Audio, PiP, Mute, Camera), `CallHistoryModal`.
- [x] Chat Header Audio & Video call action buttons.
- [x] Automated backend calling test suite (48/48 tests passed).
- [x] Automated real browser WebRTC test suite with fake media devices (19/19 checks passed).
- [x] Calling system documentation: `AUDIO_VIDEO_CALLING.md`, `WEBRTC_ARCHITECTURE.md`, `TURN_SERVER_SETUP.md`, `CALLING_API.md`, `CALLING_TEST_REPORT.md`.
