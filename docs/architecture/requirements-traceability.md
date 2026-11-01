# CHITHI — Requirements Traceability Matrix

**Project:** CHITHI  
**Version:** 1.0  
**Updated:** November 1, 2026  

| Requirement ID | Description | Source Document | Related Module | Implementation Status | Next Action |
|---|---|---|---|---|---|
| **FR-AUTH-01** | Unique username, email/phone registration | `prompt.md` §5.1, PRD §5.1 | `auth`, `users` | Planned | Implement `register` endpoint & DTO with Argon2id |
| **FR-AUTH-02** | Argon2id password hashing | `prompt.md` §5.1, §15, PRD §5.1 | `auth` | Planned | Add argon2 package & hashing service |
| **FR-AUTH-03** | Login, refresh tokens, session revocation | `prompt.md` §5.1, §15, PRD §5.1 | `auth` | Planned | Setup JWT access/refresh token rotation & `user_sessions` |
| **FR-AUTH-04** | Password reset via verified contact | `prompt.md` §5.1, PRD §5.1 | `auth` | Planned | Password reset flow with short-lived tokens |
| **FR-AUTH-05** | Account deactivation and deletion | `prompt.md` §5.1, PRD §5.1 | `users` | Planned | Account status transitions & soft-delete logic |
| **FR-PROF-01** | One profile per account (display_name, bio, avatar, cover) | `prompt.md` §6.7, PRD §5.2 | `profiles` | Planned | Implement `profiles` controller and service |
| **FR-PROF-02** | Profile update (bio, avatar, cover media) | `prompt.md` §6.7, PRD §5.2 | `profiles`, `media` | Planned | PATCH `/profiles/me` with media validation |
| **FR-PROF-03** | Field length and file constraints | `prompt.md` §6.7, PRD §5.2 | `profiles` | Planned | Class-validator rules (display_name <= 80, bio <= 300) |
| **FR-PROF-04** | Non-friends see only minimal preview | `prompt.md` §3.1, PRD §5.2 | `users`, `profiles` | Planned | GET `/users/search` & GET `/users/:id/preview` |
| **FR-FRIEND-01** | Exact username search (no fuzzy/stranger discovery) | `prompt.md` §3.1, PRD §5.3 | `users`, `friendships`| Planned | Exact case-insensitive username query |
| **FR-FRIEND-02** | Single pending request per user pair | `prompt.md` §10, PRD §5.3 | `friendships` | Planned | Enforce via DB partial index & service verification |
| **FR-FRIEND-03** | Accept or reject friend request | `prompt.md` §10, PRD §5.3 | `friendships` | Planned | Implement `/friend-requests/:id/accept` and `/reject` |
| **FR-FRIEND-04** | Canonical friendship creation in single transaction | `prompt.md` §10, PRD §5.3 | `friendships` | Planned | Transactional `friendships` insertion (`user_low_id < user_high_id`) |
| **FR-FRIEND-05** | Cancel outgoing request, unfriend, block, unblock | `prompt.md` §3.1, §10, PRD §5.3 | `friendships` | Planned | Implement unfriend, block/unblock services |
| **FR-FRIEND-06** | Block prevents direct chat and friend requests in both directions | `prompt.md` §3.1, §10, PRD §5.3 | `friendships`, `conversations` | Planned | Centralized bidirectional block check guard |
| **FR-MSG-01** | Only accepted friends can create or message in direct chat | `prompt.md` §3.1, §11, PRD §5.4 | `conversations`, `messages` | Planned | Verify active friendship & non-block prior to sending |
| **FR-MSG-02** | Message types: text, image, video, voice, system | `prompt.md` §11, PRD §5.4 | `messages`, `media` | Planned | Message schema with media attachment linkages |
| **FR-MSG-03** | Persistence before broadcast | `prompt.md` §11, PRD §5.4 | `messages`, `realtime` | Planned | DB transaction with outbox event before socket emit |
| **FR-MSG-04** | Cursor pagination for message history | `prompt.md` §11, PRD §5.4 | `messages` | Planned | Cursor query `(created_at, id)` |
| **FR-MSG-05** | Delivery and read receipts | `prompt.md` §11, PRD §5.4 | `messages`, `realtime` | Planned | `message_receipts` tracking & Socket.IO receipt events |
| **FR-MSG-06** | Reply, edit, and delete messages | `prompt.md` §6.4, PRD §5.4 | `messages` | Planned | Self-referencing FK `reply_to_message_id`, edit time limits |
| **FR-MSG-07** | Client-generated message ID idempotency | `prompt.md` §11, PRD §5.4 | `messages` | Planned | Unique constraint `(sender_id, client_message_id)` |
| **FR-POST-01** | Permanent posts (text, photo, video, mixed) | `prompt.md` §3.2, §13, PRD §5.6 | `posts`, `media` | Planned | Post entity with `post_media` attachments |
| **FR-POST-02** | Friends-only default visibility | `prompt.md` §3.3, §13, PRD §5.6 | `posts` | Planned | Restrict post queries to accepted friends + author |
| **FR-POST-03** | Feed contains own posts + accepted friends only | `prompt.md` §3.3, §13, PRD §5.6 | `posts` | Planned | SQL/Prisma query joining friendships |
| **FR-POST-04** | Chronological feed (newest first, no recommendation algorithm) | `prompt.md` §3.3, §13, PRD §5.6 | `posts` | Planned | Cursor sorting `(created_at DESC, id DESC)` |
| **FR-POST-05** | Author caption editing & post deletion | `prompt.md` §13, PRD §5.6 | `posts` | Planned | Author ownership verification on PATCH & DELETE |
| **FR-POST-06** | Reactions & comments on posts | `prompt.md` §13, PRD §5.6 | `reactions`, `comments`| Planned | Post reaction toggle & threaded comment replies |
| **FR-POST-07** | Unfriending immediately revokes access to friends-only content | `prompt.md` §13, PRD §5.6 | `posts`, `friendships` | Planned | Feed/Post guards check real-time friendship state |
| **FR-NOTIF-01** | In-app notifications for requests, messages, reactions, comments | `prompt.md` §14, PRD §5.7 | `notifications` | Planned | Notifications module and real-time push |
| **FR-NOTIF-02** | Mark as read and notification preferences | `prompt.md` §14, PRD §5.7 | `notifications` | Planned | PATCH `/notifications/:id/read` & bulk read |
| **FR-MEDIA-01** | Short-lived signed upload & download URLs | `prompt.md` §12, PRD §13 | `media` | Planned | S3 / MinIO signed URL service |
| **FR-MEDIA-02** | MIME validation, file signature check, size & duration limits | `prompt.md` §12, PRD §13 | `media` | Planned | Media validation and worker processing |
| **FR-THEME-01** | Centralized Light, Dark, System theme support | `prompt.md` §7, PRD §7.4 | `web/styles` | Planned | Tailwind CSS tokens + next-themes provider |
| **FR-RESP-01** | Responsive layout (desktop dual-pane, mobile navigable views) | `prompt.md` §6.1, PRD §7.3 | `web` | Planned | Adaptive UI layouts |
