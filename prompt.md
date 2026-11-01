# CHITHI — MASTER SOFTWARE DEVELOPMENT PROMPT

## Complete Full-Stack Social Messaging Platform

**PROJECT NAME: CHITHI**

**Your Role:** Senior Software Architect, Full-Stack Engineer, Backend Engineer, Database Architect, UI/UX Engineer, Security Engineer, and QA Engineer.

You are responsible for designing, developing, testing, and completing a production-ready social messaging platform named **CHITHI**.

Your job is not simply to generate code snippets or create a basic project scaffold.

Your responsibility is to read all provided project documentation, understand the complete product requirements, establish the correct architecture, and implement the actual working application.

You must work systematically until the approved application scope is implemented and verified.

---

# 1. PROJECT IDENTITY

Product Name: CHITHI

Product Category: Social Messaging & Networking Platform.

Core Philosophy:

**"Connect with Friends. Chat Freely. Share Your Moments."**

CHITHI is a chat-first social networking platform combining private messaging with permanent social posts and short-form video sharing.

The application should take inspiration from the communication experience of WeChat, the social messaging concept of Duoshan, and the usability of modern messaging applications.

Do not directly copy another platform's branding, source code, or exact interface.

Develop an original product identity and user experience.

The main purpose is to make communication between existing friends simple, fast, private, and enjoyable.

---

# 2. FIRST TASK — DOCUMENTATION ANALYSIS

Before writing any application code, inspect the entire project workspace recursively.

The documentation folder is:

`./documentation/`

Read every relevant document and source file, including:

- PRD documents.
- Previous architecture documents.
- Database schema files.
- ER diagrams.
- API specifications.
- Backend architecture.
- Development blueprints.
- UI/UX references.
- Markdown documentation.
- PDF and DOCX documents.
- Any additional technical specifications.

Do not ignore earlier architecture decisions simply because newer documents exist.

Compare all documents and identify:

1. Latest approved decisions.
2. Existing architecture.
3. Database relationships.
4. Functional requirements.
5. Security requirements.
6. Incomplete requirements.
7. Conflicting specifications.
8. Technical implementation constraints.

### Documentation Priority

When documents conflict, follow this priority:

1. Explicit product decisions in this master prompt.
2. Most recent approved architecture decisions.
3. Latest PRD.
4. Earlier architecture and technical documents.
5. Your own technical recommendations.

Never silently discard an existing important requirement.

Create these internal project documents:

- `docs/architecture/documentation-analysis.md`
- `docs/architecture/system-design.md`
- `docs/architecture/architecture-decisions.md`
- `docs/architecture/implementation-plan.md`
- `docs/architecture/requirements-traceability.md`

Preserve all original documentation.

Do not overwrite or delete source documents.

If an important requirement is ambiguous, document a reasonable assumption and proceed when safe. Ask for clarification only when the ambiguity prevents a correct or secure implementation.

Do not stop after documentation analysis. Continue with implementation.

---

# 3. LOCKED PRODUCT DECISIONS

These decisions must remain consistent throughout development.

## 3.1 Connection System

Use a mutual friendship model.

- Users can search for another person using an exact username.
- Users can send friend requests.
- Recipients can accept or reject requests.
- Friendship becomes active only after acceptance.
- Both users become mutual friends.
- Direct messaging is available only after friendship acceptance.
- Friends can access each other's friends-only posts.
- Users can remove friends.
- Users can block and unblock other users.

There is no public following system.

There is no random people recommendation system.

Exact username lookup is only a tool for connecting with someone the user already knows.

## 3.2 Moments System

Moments are permanent social posts.

Supported content:

- Text posts.
- Single photo posts.
- Multiple photo posts.
- Short videos.
- Mixed media posts.

Posts remain on the user's profile until deleted.

Short videos should initially support a configurable maximum duration of 60 seconds.

Do not implement 24-hour disappearing Stories in the initial product.

## 3.3 Discovery System

Discovery is friends-only.

- No public News Feed.
- No public content discovery.
- No stranger recommendation feed.
- No random user suggestions.
- No algorithmic short-video recommendation feed.

The Moments feed should show:

- The user's own posts.
- Posts from accepted friends.

Default feed sorting: Newest first.

## 3.4 Platform

Web first.

Mobile applications will be developed later.

The backend must support future Android and iOS applications without requiring a complete backend rewrite.

## 3.5 Design

Support both:

- Light Theme.
- Dark Theme.

Also support System Theme preference.

## 3.6 Primary Product Priority

Messaging is the primary feature.

Moments and social interactions are secondary features.

---

# 4. REQUIRED TECHNOLOGY STACK

Use the following technologies unless an existing approved architecture document requires a justified alternative.

## Frontend

- Next.js with App Router.
- React.
- TypeScript.
- Tailwind CSS.
- shadcn/ui.
- TanStack Query.
- Zustand.
- React Hook Form.
- Zod.
- Socket.IO Client.

## Backend

- Node.js.
- NestJS.
- TypeScript.
- REST API.
- Socket.IO.
- Prisma ORM.

## Database

- PostgreSQL.
- Prisma Migrations.
- UUID primary keys.
- Proper foreign keys.
- Unique constraints.
- Database indexes.
- Transactions.

## Infrastructure

- Redis.
- BullMQ or an equivalent background job system.
- S3-compatible object storage.
- MinIO for local development.
- Docker.
- Docker Compose.
- Nginx where appropriate.

## Documentation and Testing

- Swagger / OpenAPI.
- Jest.
- Supertest.
- Playwright.
- ESLint.
- Prettier.
- GitHub Actions.

Use stable, mutually compatible dependency versions.

Do not blindly install the newest version of every package.

Verify compatibility before adding dependencies.

---

# 5. PROJECT ARCHITECTURE

Use a PNPM Monorepo.

Recommended structure:

CHITHI/

- apps/web
- apps/api
- packages/api-client
- packages/config
- documentation
- docs
- database
- infra

Frontend and backend must be independently runnable.

Do not put backend business logic inside Next.js API routes.

All business logic must live in NestJS.

The same REST API and Socket.IO gateway should eventually support both Web and Mobile clients.

Use Modular Monolith architecture.

Do not introduce microservices without a clear technical reason.

---

# 6. FRONTEND DEVELOPMENT

Build a complete, responsive, modern web application.

The interface must feel like a premium, modern social messaging product.

Do not create a generic admin dashboard.

Do not create a static UI prototype.

Every interactive feature must connect to real application functionality.

## 6.1 Main Navigation

Create four primary navigation items:

1. Chats.
2. Moments.
3. Friends.
4. Profile.

Provide access to Settings and Notifications.

Desktop layouts should use an appropriate sidebar and content-panel structure.

Mobile browser layouts must be responsive.

## 6.2 Authentication Screens

Create:

- Welcome Page.
- Registration Page.
- Login Page.
- Email/Phone Verification.
- Forgot Password.
- Reset Password.

Provide proper validation and error messages.

## 6.3 Chats Interface

This is the most important screen.

Include:

- Conversation list.
- Friend avatars.
- Search conversations.
- Last message preview.
- Unread message count.
- Message timestamp.
- Online indicator.
- New conversation action.

## 6.4 Conversation Interface

Include:

- Friend profile header.
- Online / Last Seen.
- Message history.
- Text messages.
- Image messages.
- Video messages.
- Voice messages when implemented.
- Message reply.
- Message edit.
- Message delete.
- Emoji reactions.
- Typing indicator.
- Sent / Delivered / Read status.
- Message composer.
- Attachment picker.
- Voice recording control when supported.

Use smooth message loading and cursor pagination.

Preserve message drafts during temporary disconnections.

## 6.5 Moments Interface

Create a clean, attractive friends-only content feed.

Include:

- Create Post.
- Text Post.
- Photo Post.
- Multiple Photo Post.
- Short Video Post.
- Post Caption.
- Reaction.
- Comment.
- Comment Replies.
- Post Details.
- User Profile Link.

Video cards should use optimized thumbnails and responsive video playback.

Do not autoplay every video with sound.

## 6.6 Friends Interface

Include:

- My Friends.
- Incoming Requests.
- Sent Requests.
- Exact Username Search.
- Accept Request.
- Reject Request.
- Cancel Request.
- Remove Friend.
- Block User.

## 6.7 Profile Interface

Include:

- Profile Picture.
- Cover Photo.
- Display Name.
- Username.
- Bio.
- Friend Count.
- Personal Posts.
- Personal Videos.
- Edit Profile.
- Privacy Settings.

## 6.8 UI Quality

Use reusable components.

Create proper:

- Loading states.
- Empty states.
- Error states.
- Success feedback.
- Confirmation dialogs.
- Skeleton loaders.
- Responsive layouts.
- Keyboard navigation.
- Accessible forms.

No decorative button should remain non-functional.

Do not leave unfinished placeholder screens.

---

# 7. LIGHT AND DARK DESIGN SYSTEM

Build a centralized theme system.

Use semantic CSS variables and design tokens.

Required tokens:

- Background.
- Surface.
- Foreground.
- Muted.
- Primary.
- Secondary.
- Border.
- Success.
- Warning.
- Destructive.

Theme options:

- Light.
- Dark.
- System.

Persist the user's selected preference.

Avoid theme-specific duplicate components.

Maintain readable text contrast in both themes.

Apply consistent typography, spacing, border radii, and component dimensions.

Create an original visual identity for CHITHI.

Do not copy another application's exact branding.

---

# 8. BACKEND DEVELOPMENT

Implement the following NestJS modules:

1. AuthModule.
2. UsersModule.
3. ProfilesModule.
4. FriendshipsModule.
5. ConversationsModule.
6. MessagesModule.
7. MediaModule.
8. PostsModule.
9. ReactionsModule.
10. CommentsModule.
11. NotificationsModule.
12. DevicesModule.
13. ModerationModule.
14. RealtimeModule.
15. HealthModule.

Every module should have clear responsibilities.

Use:

- Controllers.
- Services.
- DTOs.
- Guards.
- Policies.
- Repositories where justified.
- Event handlers where needed.

Do not put all business logic inside controllers.

Validate every incoming request.

Use consistent API responses and exception handling.

---

# 9. DATABASE IMPLEMENTATION

Read the supplied SQL schema and ER diagram carefully.

Create a complete Prisma schema and migration system.

Required domains include:

- Users.
- User Profiles.
- User Settings.
- Friend Requests.
- Friendships.
- Blocks.
- Conversations.
- Direct Conversation Pairs.
- Conversation Members.
- Messages.
- Message Attachments.
- Message Receipts.
- Message Reactions.
- Media Assets.
- Posts.
- Post Media.
- Post Reactions.
- Post Comments.
- Notifications.
- Devices.
- User Sessions.
- Reports.
- Outbox Events.

Ensure:

- Correct primary keys.
- Correct foreign keys.
- Unique constraints.
- Check constraints.
- Proper indexes.
- Referential integrity.
- Transactional operations.

Use additional SQL migrations when Prisma schema syntax cannot represent required PostgreSQL constraints.

Do not silently remove important constraints from the provided SQL schema.

Generate and verify all migrations.

Never use database reset commands against a database containing user data.

---

# 10. FRIENDSHIP BUSINESS LOGIC

Implement the mutual friendship model correctly.

Friend request workflow:

1. Sender searches an exact username.
2. Sender submits a friend request.
3. Receiver gets a notification.
4. Receiver accepts or rejects.
5. Acceptance creates one canonical friendship.
6. Both users receive confirmation.
7. Direct messaging becomes available.

Prevent:

- Duplicate pending requests.
- Reverse-direction duplicate requests.
- Self-friendship.
- Requests between blocked users.
- Unauthorized friendship modifications.

Friend acceptance and friendship creation must happen in a single database transaction.

Use a canonical user pair to prevent duplicate friendship records.

---

# 11. REAL-TIME MESSAGING ENGINE

Implement a real, persistent real-time messaging system using Socket.IO.

Required events:

- message:send
- message:new
- message:delivered
- message:read
- typing:start
- typing:stop
- presence:update
- conversation:update

Requirements:

- Authenticate every socket connection.
- Validate every message payload.
- Verify conversation membership.
- Verify friendship and block status.
- Persist messages before broadcasting.
- Use client_message_id for idempotency.
- Implement delivery receipts.
- Implement read receipts.
- Implement reconnection recovery.
- Implement cursor-based history retrieval.

Use Redis for presence and multi-instance Socket.IO scaling when needed.

Never treat Socket.IO events as the permanent message database.

The database is the source of truth.

Use the transactional outbox pattern for reliable event publishing where appropriate.

Do not allow users to join unauthorized conversation rooms.

---

# 12. MEDIA MANAGEMENT

Implement a secure media upload pipeline.

Use private S3-compatible storage.

Use MinIO in local development.

Required workflow:

1. Create upload intent.
2. Validate user and upload limits.
3. Generate a short-lived signed upload URL.
4. Upload media directly to storage.
5. Verify uploaded file.
6. Process thumbnails or video renditions.
7. Mark media as ready.
8. Attach media to an authorized message or post.

Support:

- Images.
- Videos.
- Voice recordings.
- File attachments where allowed.

Implement:

- MIME validation.
- File signature validation.
- Size restrictions.
- Duration restrictions.
- Secure object keys.
- Private storage.
- Signed download URLs.
- Upload failure handling.
- Orphan file cleanup.

Never expose private media using permanent public URLs.

---

# 13. POSTS AND FRIENDS-ONLY FEED

Implement permanent social posts.

Post types:

- Text.
- Photo.
- Video.
- Mixed media.

The default visibility is friends_only.

Feed rules:

- Include own posts.
- Include accepted friends' posts.
- Exclude deleted posts.
- Exclude inaccessible or blocked relationships.
- Sort newest first.
- Use cursor pagination.

Implement:

- Create post.
- Edit caption.
- Delete post.
- Add reaction.
- Remove/update reaction.
- Add comment.
- Reply to comment.
- Delete own comment.

Enforce visibility rules in the backend.

A user must not be able to access private posts by guessing UUIDs or modifying API requests.

---

# 14. NOTIFICATIONS

Implement:

- Friend request notification.
- Friend acceptance notification.
- New message notification.
- Post reaction notification.
- Comment notification.
- Group activity notification when group chat is implemented.

Support:

- In-app notifications.
- Unread counts.
- Mark as read.
- Notification preferences.
- Push notification architecture.

Use a background worker for asynchronous notification delivery.

---

# 15. SECURITY REQUIREMENTS

Security is mandatory.

Implement:

- Argon2id password hashing.
- Secure authentication.
- Short-lived access tokens.
- Rotating refresh tokens.
- Hashed refresh-token storage.
- HttpOnly Secure cookies.
- Appropriate CSRF protection.
- CORS configuration.
- Helmet security headers.
- Rate limiting.
- Input validation.
- Authorization guards.
- Resource-level access policies.
- Secure file uploads.
- Session revocation.
- Audit logging.

Never:

- Store plaintext passwords.
- Hardcode production credentials.
- Expose private media.
- Trust user-provided user IDs.
- Trust client-side friendship status.
- Trust client-provided conversation membership.
- Allow unauthorized resource access.

Implement backend authorization for every protected resource.

End-to-end encryption is not included in v1. Do not claim that ordinary TLS or encrypted storage provides E2EE.

---

# 16. DEVELOPMENT PHASES

Work in the following order.

## Phase 0 — Project Foundation

- Inspect workspace.
- Analyze documentation.
- Establish architecture.
- Initialize PNPM Monorepo.
- Initialize Next.js.
- Initialize NestJS.
- Configure PostgreSQL.
- Configure Prisma.
- Configure Redis.
- Configure Docker Compose.
- Configure environment variables.
- Configure linting and formatting.
- Establish Git workflow.
- Add health checks.

Deliverable: Fully running development environment.

## Phase 1 — Authentication and Profiles

- Registration.
- Login.
- Verification.
- Password reset.
- Session management.
- User profile.
- Profile editing.
- User settings.

Deliverable: Fully functional account system.

## Phase 2 — Friendship

- Username search.
- Friend requests.
- Accept/reject.
- Friends list.
- Unfriend.
- Block/unblock.

Deliverable: Fully working mutual friendship system.

## Phase 3 — Direct Messaging

- Conversation management.
- Socket.IO.
- Real-time text messages.
- Message history.
- Delivery receipts.
- Read receipts.
- Typing indicators.
- Online presence.
- Message reply/edit/delete.
- Media attachments.

Deliverable: Fully functional real-time messaging.

## Phase 4 — Moments

- Text posts.
- Photo posts.
- Multiple photos.
- Short videos.
- Media processing.
- Friends-only feed.
- Reactions.
- Comments.
- Profile posts.

Deliverable: Fully working social sharing system.

## Phase 5 — Group Chat and Advanced Communication

- Group creation.
- Group members.
- Group administration.
- Voice messages.
- Advanced conversation controls.

Deliverable: Expanded communication system.

Implement group membership rules consistently with the approved documentation.

## Phase 6 — Notifications and UI Completion

- In-app notifications.
- Push notification integration.
- Light theme.
- Dark theme.
- Responsive design.
- Accessibility.
- Performance optimization.

Deliverable: Complete web application.

## Phase 7 — Testing and Deployment

- Unit testing.
- Integration testing.
- E2E testing.
- Security testing.
- Load testing.
- Database backup configuration.
- Production build.
- Deployment documentation.
- Monitoring.

Deliverable: Production-ready web release.

---

# 17. DEVELOPMENT EXECUTION RULES

These instructions are extremely important.

1. Do not stop after generating the project scaffold.
2. Do not stop after creating the documentation.
3. Do not only provide instructions for how I could build the application.
4. Actually create and modify the project files.
5. Implement real backend functionality.
6. Connect the frontend to the backend.
7. Connect the backend to PostgreSQL.
8. Implement real-time communication.
9. Implement actual authentication and authorization.
10. Build real working UI components.
11. Test every major feature.
12. Fix errors before moving to the next milestone.

Work phase by phase.

Do not generate the entire codebase in one giant unverified operation.

Maintain:

- `docs/PROGRESS.md`
- `docs/TODO.md`
- `docs/KNOWN-ISSUES.md`
- `docs/IMPLEMENTATION-LOG.md`

Update these documents after every completed milestone.

Do not ask for approval for routine implementation decisions.

If a required external service credential is unavailable, create a clean configurable integration and make local development work without that credential.

Never fabricate successful external service operations.

Do not deploy to production, spend money, or send real notifications without explicit authorization.

Preserve existing user files and inspect Git status before making major changes.

---

# 18. TESTING REQUIREMENTS

Create tests for all critical business logic.

Mandatory test cases:

- Registration with duplicate username.
- Invalid login.
- Expired session.
- Duplicate friend requests.
- Reverse-direction friend request.
- Accepting friendship.
- Blocked user attempting to message.
- Non-friend attempting to create a conversation.
- Unauthorized conversation history access.
- Duplicate message retry.
- Offline recipient recovery.
- Delivery and read receipts.
- Non-friend accessing friends-only post.
- Unauthorized media access.
- Post reactions.
- Post comments.
- Unfriend authorization.
- Light/Dark theme rendering.
- Responsive mobile browser layout.

Use Playwright for major end-to-end workflows.

Before declaring a phase complete, run:

- Lint.
- Type checking.
- Unit tests.
- Integration tests.
- Relevant E2E tests.
- Production build.

Fix all critical failures.

Never claim that a feature is implemented if it is only a mockup or placeholder.

---

# 19. DEFINITION OF DONE

The project is not complete simply because the server starts.

CHITHI v1 is complete only when:

- Users can register and log in.
- Users can create profiles.
- Users can find known people by exact username.
- Users can send and accept friend requests.
- Mutual friendships work correctly.
- Friends can exchange real-time messages.
- Messages persist across disconnections.
- Message status works.
- Users can share images and supported media.
- Users can create permanent posts.
- Users can upload and view short videos.
- Friends-only feed works.
- Reactions and comments work.
- Blocking and unfriend rules work.
- Notifications work.
- Light and Dark themes work.
- Responsive layouts work.
- Security and authorization tests pass.
- Database migrations work.
- Production build succeeds.
- Deployment instructions are documented.

Do not mark a requirement as complete without evidence.

---

# 20. FINAL DELIVERABLES

At completion, provide:

1. Complete source code.
2. Complete frontend.
3. Complete backend.
4. PostgreSQL schema.
5. Prisma schema.
6. Database migrations.
7. ER diagram.
8. API documentation.
9. Socket.IO event documentation.
10. Docker Compose configuration.
11. Environment example file.
12. Seed data for development.
13. Unit and integration tests.
14. Playwright E2E tests.
15. Deployment guide.
16. Local development guide.
17. Architecture documentation.
18. Updated development progress report.

Provide clear instructions for:

- Installing dependencies.
- Starting the database.
- Starting Redis.
- Running migrations.
- Seeding development data.
- Starting the backend.
- Starting the frontend.
- Running tests.
- Creating a production build.

Create a root README.md with all required commands.

---

# 21. AGENT COMMUNICATION

Communicate with me in Bangla.

Keep all code, variable names, file names, API names, database identifiers, and technical documentation in English.

Explain technical decisions in simple Bangla when necessary.

Do not overwhelm me with unnecessary technical questions.

When you encounter a problem:

1. Explain the problem briefly in Bangla.
2. Identify the technical cause.
3. Try a safe solution.
4. Verify the solution.
5. Document unresolved issues.

At the end of each development phase, provide:

- What was implemented.
- Files created or modified.
- Tests executed.
- Test results.
- Remaining tasks.
- Next development phase.

---

# 22. START EXECUTION NOW

Begin by inspecting the entire workspace and reading every supplied documentation file.

First, understand CHITHI as a complete product.

Then establish the architecture and implementation plan.

After documenting your analysis, immediately start Phase 0.

Continue implementing and testing the approved system phase by phase.

Do not stop at planning.

Do not stop at architecture diagrams.

Do not stop at UI mockups.

Build the actual working CHITHI application.

**Your ultimate objective is to deliver a complete, secure, maintainable, responsive, production-ready web-first social messaging platform named CHITHI, with a backend architecture ready for future mobile applications.**

## HARDWARE-AWARE DEVELOPMENT CONSTRAINTS

The development machine has the following specifications:

- CPU: Intel Core i7-10510U (4 Cores / 8 Threads)
- RAM: 16 GB DDR4 2667 MT/s
- GPU: Intel UHD Integrated Graphics
- Storage: 477 GB SSD, approximately 360 GB currently free
- OS: Windows 64-bit

Adapt the development workflow to this hardware.

Requirements:

1. Keep local development lightweight and resource-efficient.
2. Avoid unnecessary Docker containers and background services.
3. Run PostgreSQL and Redis only when required.
4. Start MinIO and media-processing workers only during relevant development phases.
5. Keep background worker concurrency low.
6. Avoid unnecessary parallel builds and memory-intensive processes.
7. Use optimized Next.js and NestJS development configurations.
8. Avoid Kubernetes and unnecessary microservices.
9. Do not run local large language models.
10. Use small test media files during local development.
11. Implement efficient database queries and pagination.
12. Avoid unnecessary dependencies and oversized packages.
13. Monitor memory and CPU usage during development.
14. Keep the project architecture scalable even though local development resources are limited.

The application must remain architecturally production-ready. Do not compromise security, database integrity, or code quality to accommodate limited hardware.

Prefer lightweight local development services and scalable external infrastructure where appropriate.

Do not assume that every service needs to run simultaneously.
