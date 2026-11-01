# CHITHI — Architecture Decision Records (ADR)

## ADR-001: Modular Monolith vs. Microservices
- **Decision:** Adopt a Modular Monolith in a PNPM monorepo.
- **Context:** CHITHI is a chat-first application requiring transactional consistency for friendship acceptance and message outbox events.
- **Consequences:** Avoids distributed transactions, simplifies local debugging, keeps resource footprint low on local hardware (Intel i7-10510U, 16GB RAM), and enables straightforward future extraction into microservices if needed.

## ADR-002: Canonical User Pair Ordering for Friendships & Direct Conversations
- **Decision:** All two-party relationships are stored using `user_low_id < user_high_id` as the primary key or unique index.
- **Context:** Prevents duplicate reciprocal rows (e.g., A-B vs B-A) and simplifies friendship lookup queries.
- **Consequences:** Single-row friendship representation; queries simply compute `LEAST(u1, u2)` and `GREATEST(u1, u2)`.

## ADR-003: Transactional Outbox Pattern for Messaging
- **Decision:** Persist message rows and corresponding `outbox_events` in the same database transaction before emitting WebSocket events.
- **Context:** Network disconnects or socket crashes after DB writes could otherwise lead to lost messages or phantom state.
- **Consequences:** Guarantees at-least-once delivery for real-time messages and decoupled background workers.

## ADR-004: Private Object Storage with Presigned Access
- **Decision:** All user media (images, videos, audio) is stored in private S3/MinIO buckets. No media is exposed via public URLs.
- **Context:** Privacy is paramount. Strangers must not access media of friends-only posts or private direct messages.
- **Consequences:** Every media request generates a short-lived (15-minute) signed URL after checking friendship or conversation membership.

## ADR-005: Cursor-Based Pagination
- **Decision:** Use `(created_at, id)` cursor-based pagination for conversations, messages, posts feed, and notifications instead of offset/limit.
- **Context:** High-frequency real-time messaging causes offset-based pagination to skip or duplicate items when new messages arrive.
- **Consequences:** Stable, high-performance pagination that scales effortlessly with table size.

## ADR-006: Light, Dark, and System Theme Architecture
- **Decision:** Use CSS custom properties mapped to Tailwind CSS tokens with `next-themes` and database persistence in `user_settings`.
- **Context:** Avoid flash of unstyled theme (FOUT) while respecting user's explicit preference or OS dark mode.
- **Consequences:** Clean styling code with zero duplicated UI components.
