# CHITHI — Complete Documentation & Codebase Analysis

**Project Name:** CHITHI  
**Product Identity:** Web-first, friend-based social messaging platform  
**Core Philosophy:** *"Connect with Friends. Chat Freely. Share Your Moments."*  
**Date of Analysis:** November 1, 2026  
**Status:** Completed Analysis  

---

## 1. Executive Summary & Vision

CHITHI combines private real-time direct messaging with permanent, friends-only social posts ("Moments") and short videos (up to 60s). It is intentionally **not** a public social network. There is no stranger discovery algorithm, no public newsfeed, and no ephemeral 24-hour Stories in v1. 

The primary product priority is **Chat-First**, with Moments acting as a secondary feature to enrich connections among accepted friends.

---

## 2. Inventory of Project Materials

All materials in `D:\CHITHI\` have been fully analyzed line by line:
1. `prompt.md`: Master specification detailing architecture, technology stack, security rules, 8-phase execution roadmap, hardware constraints, and testing criteria.
2. `README.md`: Baseline documentation summary, locked decisions, and implementation cautions.
3. `Social_Messaging_Platform_Complete_Documentation.pdf` (16 pages): Comprehensive PRD, system architecture, database design, API outlines, Socket.IO contracts, security controls, and non-functional requirements.
4. `Social_Messaging_Platform_Complete_Documentation.docx`: Authored source document matching the PDF specification.
5. `architecture/project-folder-structure.txt`: Standard PNPM monorepo folder layout with NestJS API and Next.js Web app.
6. `database/schema.sql`: 362-line PostgreSQL production-grade DDL defining enums, tables, unique constraints, and partial indexes.
7. `database/erd.mmd`: Mermaid ER diagram modeling 20 domain entities and relationships.
8. `api/openapi-outline.yaml`: REST API contract outline covering auth, friendships, conversations, messages, posts, media, notifications, and moderation.
9. `Diagram/High Level System Architechture.png`: System tier diagram (Browser -> Next.js -> REST/Socket.IO -> NestJS -> PostgreSQL/Redis/MinIO).
10. `Diagram/Entity Relationship Diagram.png`: Sequence flow diagram for message sending, persistence, receipts, and delivery.
11. `Diagram/Message Sending Process.png`: Complete ER entity relationship visualization matching `erd.mmd` and `schema.sql`.

---

## 3. Core Product & Technical Decisions

### 3.1 Mutual Friendship & Privacy
- **Exact-Username Lookup:** Discovery is restricted strictly to exact-username queries. Search returns a minimal profile preview (avatar, display name, username).
- **Canonical Friendship:** Stored with `user_low_id < user_high_id` as the composite primary key. Prevents duplicate reciprocal rows.
- **Atomic Acceptance:** Friend request acceptance and friendship record creation must occur in a single database transaction.
- **Direct Messaging Privilege:** Only accepted, non-blocked friends can open a direct conversation or send messages.

### 3.2 Real-Time Messaging Engine
- **Socket.IO + Redis Adapter:** Authenticated handshake via short-lived JWT. Identity is derived strictly on the server; client-provided user IDs are rejected.
- **Message Persistence First:** Messages are persisted to PostgreSQL before broadcasting `message:new`.
- **Idempotency:** Driven by `(sender_id, client_message_id)` unique constraint to prevent duplicate message sends on network retries.
- **Reliable Event Delivery:** Transactional outbox pattern (`outbox_events` table) guarantees asynchronous event publishing.
- **Receipts & Status:** Tracks `delivered_at` and `read_at` timestamps per recipient via `message_receipts`.

### 3.3 Permanent Moments & Friends-Only Feed
- **Supported Formats:** Text, single/multiple photos, short videos (target <= 60 seconds), mixed media.
- **Access Rule:** Strict `friends_only` visibility. Feed queries return the user's own posts plus posts from accepted, non-blocked friends, ordered by `(created_at DESC, id DESC)`.
- **Security Check:** Backend-enforced visibility checks prevent non-friends from fetching posts or signed media URLs by guessing UUIDs.

### 3.4 Media Pipeline
- **Private Storage:** S3-compatible storage (MinIO locally). No public read buckets.
- **Lifecycle:**
  1. Client requests upload intent (`POST /media/upload-intents`).
  2. Server generates pre-signed upload URL with strict content-type and size limits.
  3. Client uploads directly to storage.
  4. Server validates completion, inspects file headers/magic bytes, and marks `ready`.
  5. Content is served via short-lived pre-signed download URLs.

### 3.5 Light & Dark Design System
- Semantic design tokens via Tailwind CSS and CSS variables.
- Options: Light, Dark, System preference.
- Persisted in `user_settings.theme_preference` to avoid theme flash.

---

## 4. Hardware-Aware Constraints & Performance Strategy

Target development machine:
- Intel Core i7-10510U (4 Cores / 8 Threads)
- 16 GB DDR4 RAM
- Windows 64-bit

**Strategy:**
1. Keep local background processes minimal and memory-efficient.
2. In-memory or lightweight standalone Redis / SQLite/Postgres fallbacks if heavy Docker instances saturate resources during development.
3. Keep background worker concurrency low (1-2 concurrent jobs).
4. Low-overhead asset generation and lightweight test media.
