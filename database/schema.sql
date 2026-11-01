-- Social Messaging Platform - PostgreSQL schema baseline
-- Version: 1.0
-- Notes:
-- 1) Run with a PostgreSQL role allowed to create extensions and types.
-- 2) Authorization rules involving friendship and conversation membership
--    must also be enforced in NestJS services/policies.
-- 3) Cross-row invariants (e.g. exactly two active members in a direct chat)
--    are enforced transactionally by the application.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TYPE account_status AS ENUM (
  'active', 'suspended', 'deactivated', 'pending_deletion'
);
CREATE TYPE friend_request_status AS ENUM (
  'pending', 'accepted', 'rejected', 'cancelled'
);
CREATE TYPE conversation_type AS ENUM ('direct', 'group');
CREATE TYPE conversation_member_role AS ENUM ('member', 'admin', 'owner');
CREATE TYPE message_type AS ENUM ('text', 'image', 'video', 'voice', 'file', 'system');
CREATE TYPE media_processing_status AS ENUM (
  'pending', 'processing', 'ready', 'failed', 'quarantined'
);
CREATE TYPE post_type AS ENUM ('text', 'photo', 'video', 'mixed');
CREATE TYPE post_visibility AS ENUM ('friends_only');
CREATE TYPE notification_type AS ENUM (
  'friend_request_received', 'friend_request_accepted',
  'message_received', 'post_reaction', 'post_comment',
  'group_invitation', 'system'
);
CREATE TYPE device_platform AS ENUM ('web', 'android', 'ios');
CREATE TYPE report_status AS ENUM ('open', 'reviewing', 'actioned', 'dismissed');
CREATE TYPE call_type AS ENUM ('audio', 'video');
CREATE TYPE call_status AS ENUM (
  'initiating', 'ringing', 'accepted', 'rejected', 'cancelled', 'missed', 'busy', 'ended', 'failed'
);
CREATE TYPE call_end_reason AS ENUM (
  'caller_hung_up', 'callee_hung_up', 'rejected', 'cancelled', 'missed_timeout', 'busy', 'connection_failed', 'error'
);

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(30) NOT NULL,
  email VARCHAR(254),
  phone VARCHAR(32),
  password_hash TEXT NOT NULL,
  account_status account_status NOT NULL DEFAULT 'active',
  is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deactivated_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  CONSTRAINT users_username_length CHECK (char_length(username) BETWEEN 3 AND 30)
);
CREATE UNIQUE INDEX uq_users_username_ci ON users (LOWER(username));
CREATE UNIQUE INDEX uq_users_email_ci ON users (LOWER(email)) WHERE email IS NOT NULL;
CREATE UNIQUE INDEX uq_users_phone ON users (phone) WHERE phone IS NOT NULL;
CREATE INDEX idx_users_status_created ON users (account_status, created_at DESC);

CREATE TABLE user_profiles (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  display_name VARCHAR(80) NOT NULL,
  bio VARCHAR(300),
  avatar_media_id UUID,
  cover_media_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE user_settings (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  show_online_status BOOLEAN NOT NULL DEFAULT TRUE,
  show_last_seen BOOLEAN NOT NULL DEFAULT TRUE,
  allow_friend_requests BOOLEAN NOT NULL DEFAULT TRUE,
  push_notifications BOOLEAN NOT NULL DEFAULT TRUE,
  message_notifications BOOLEAN NOT NULL DEFAULT TRUE,
  theme_preference VARCHAR(10) NOT NULL DEFAULT 'system'
    CHECK (theme_preference IN ('light', 'dark', 'system')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE friend_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status friend_request_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  responded_at TIMESTAMPTZ,
  CONSTRAINT friend_request_not_self CHECK (sender_id <> receiver_id)
);
CREATE UNIQUE INDEX uq_friend_requests_pending_pair
  ON friend_requests (LEAST(sender_id, receiver_id), GREATEST(sender_id, receiver_id))
  WHERE status = 'pending';
CREATE INDEX idx_friend_requests_receiver_status
  ON friend_requests (receiver_id, status, created_at DESC);
CREATE INDEX idx_friend_requests_sender_status
  ON friend_requests (sender_id, status, created_at DESC);

CREATE TABLE friendships (
  user_low_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_high_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_low_id, user_high_id),
  CONSTRAINT friendship_canonical_order CHECK (user_low_id < user_high_id)
);
CREATE INDEX idx_friendships_high ON friendships (user_high_id, user_low_id);

CREATE TABLE blocks (
  blocker_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (blocker_id, blocked_id),
  CONSTRAINT block_not_self CHECK (blocker_id <> blocked_id)
);
CREATE INDEX idx_blocks_blocked ON blocks (blocked_id, blocker_id);

CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type conversation_type NOT NULL,
  title VARCHAR(100),
  avatar_media_id UUID,
  created_by UUID NOT NULL REFERENCES users(id),
  last_message_id UUID,
  last_message_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_conversations_updated ON conversations (updated_at DESC);

CREATE TABLE direct_conversation_pairs (
  conversation_id UUID PRIMARY KEY REFERENCES conversations(id) ON DELETE CASCADE,
  user_low_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_high_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT direct_pair_canonical_order CHECK (user_low_id < user_high_id),
  CONSTRAINT direct_pair_unique UNIQUE (user_low_id, user_high_id)
);

CREATE TABLE conversation_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role conversation_member_role NOT NULL DEFAULT 'member',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  left_at TIMESTAMPTZ,
  last_read_message_id UUID,
  muted_until TIMESTAMPTZ,
  UNIQUE (conversation_id, user_id)
);
CREATE INDEX idx_conversation_members_user
  ON conversation_members (user_id, joined_at DESC);
CREATE INDEX idx_conversation_members_active
  ON conversation_members (conversation_id, user_id) WHERE left_at IS NULL;

CREATE TABLE media_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES users(id),
  storage_provider VARCHAR(30) NOT NULL,
  storage_key TEXT NOT NULL UNIQUE,
  mime_type VARCHAR(120) NOT NULL,
  file_size BIGINT NOT NULL CHECK (file_size >= 0),
  checksum_sha256 CHAR(64),
  width INTEGER,
  height INTEGER,
  duration_ms INTEGER,
  processing_status media_processing_status NOT NULL DEFAULT 'pending',
  failure_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ready_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ
);
CREATE INDEX idx_media_owner_created ON media_assets (owner_id, created_at DESC);
CREATE INDEX idx_media_processing ON media_assets (processing_status, created_at);

ALTER TABLE user_profiles
  ADD CONSTRAINT fk_profile_avatar_media
  FOREIGN KEY (avatar_media_id) REFERENCES media_assets(id) ON DELETE SET NULL;
ALTER TABLE user_profiles
  ADD CONSTRAINT fk_profile_cover_media
  FOREIGN KEY (cover_media_id) REFERENCES media_assets(id) ON DELETE SET NULL;
ALTER TABLE conversations
  ADD CONSTRAINT fk_conversation_avatar_media
  FOREIGN KEY (avatar_media_id) REFERENCES media_assets(id) ON DELETE SET NULL;

CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES users(id),
  client_message_id UUID,
  message_type message_type NOT NULL,
  body TEXT,
  reply_to_message_id UUID REFERENCES messages(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  edited_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  CONSTRAINT message_body_or_attachment CHECK (
    body IS NOT NULL OR message_type IN ('image', 'video', 'voice', 'file', 'system')
  ),
  UNIQUE (sender_id, client_message_id)
);
CREATE INDEX idx_messages_conversation_cursor
  ON messages (conversation_id, created_at DESC, id DESC);
CREATE INDEX idx_messages_sender_created
  ON messages (sender_id, created_at DESC);

ALTER TABLE conversations
  ADD CONSTRAINT fk_conversation_last_message
  FOREIGN KEY (last_message_id) REFERENCES messages(id) ON DELETE SET NULL;
ALTER TABLE conversation_members
  ADD CONSTRAINT fk_member_last_read_message
  FOREIGN KEY (last_read_message_id) REFERENCES messages(id) ON DELETE SET NULL;

CREATE TABLE message_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  media_asset_id UUID NOT NULL REFERENCES media_assets(id),
  sort_order SMALLINT NOT NULL DEFAULT 0,
  UNIQUE (message_id, media_asset_id),
  UNIQUE (message_id, sort_order)
);

CREATE TABLE message_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  UNIQUE (message_id, user_id)
);
CREATE INDEX idx_message_receipts_user_read
  ON message_receipts (user_id, read_at);

CREATE TABLE message_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reaction VARCHAR(32) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (message_id, user_id)
);

CREATE TABLE posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL REFERENCES users(id),
  post_type post_type NOT NULL,
  content_text TEXT,
  visibility post_visibility NOT NULL DEFAULT 'friends_only',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  CONSTRAINT post_has_content_or_media CHECK (
    (content_text IS NOT NULL AND length(trim(content_text)) > 0)
    OR post_type IN ('photo', 'video', 'mixed')
  )
);
CREATE INDEX idx_posts_author_cursor
  ON posts (author_id, created_at DESC, id DESC)
  WHERE deleted_at IS NULL;
CREATE INDEX idx_posts_feed_cursor
  ON posts (created_at DESC, id DESC)
  WHERE deleted_at IS NULL;

CREATE TABLE post_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  media_asset_id UUID NOT NULL REFERENCES media_assets(id),
  sort_order SMALLINT NOT NULL DEFAULT 0,
  UNIQUE (post_id, media_asset_id),
  UNIQUE (post_id, sort_order)
);

CREATE TABLE post_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reaction_type VARCHAR(32) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (post_id, user_id)
);
CREATE INDEX idx_post_reactions_post ON post_reactions (post_id, created_at);

CREATE TABLE post_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES users(id),
  parent_comment_id UUID REFERENCES post_comments(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  CONSTRAINT comment_body_not_empty CHECK (length(trim(body)) > 0)
);
CREATE INDEX idx_post_comments_post_cursor
  ON post_comments (post_id, created_at ASC, id ASC)
  WHERE deleted_at IS NULL;

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
  notification_type notification_type NOT NULL,
  entity_type VARCHAR(40),
  entity_id UUID,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  dedupe_key VARCHAR(180) UNIQUE,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_notifications_user_cursor
  ON notifications (user_id, created_at DESC, id DESC);
CREATE INDEX idx_notifications_unread
  ON notifications (user_id, created_at DESC) WHERE read_at IS NULL;

CREATE TABLE devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  device_token TEXT NOT NULL UNIQUE,
  platform device_platform NOT NULL,
  device_name VARCHAR(120),
  last_active_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_devices_user ON devices (user_id);

CREATE TABLE user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  device_id UUID REFERENCES devices(id) ON DELETE SET NULL,
  refresh_token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_sessions_user_active
  ON user_sessions (user_id, expires_at DESC) WHERE revoked_at IS NULL;

CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES users(id),
  target_type VARCHAR(40) NOT NULL,
  target_id UUID NOT NULL,
  reason VARCHAR(80) NOT NULL,
  details TEXT,
  status report_status NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ
);
CREATE INDEX idx_reports_status_created ON reports (status, created_at);

CREATE TABLE call_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  caller_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  call_type call_type NOT NULL,
  status call_status NOT NULL DEFAULT 'initiating',
  end_reason call_end_reason,
  initiated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ringing_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_calls_conversation_created ON call_sessions (conversation_id, created_at DESC);
CREATE INDEX idx_calls_caller_created ON call_sessions (caller_id, created_at DESC);
CREATE INDEX idx_calls_receiver_created ON call_sessions (receiver_id, created_at DESC);
CREATE INDEX idx_calls_status ON call_sessions (status);

CREATE TABLE outbox_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aggregate_type VARCHAR(60) NOT NULL,
  aggregate_id UUID NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT
);
CREATE INDEX idx_outbox_unprocessed
  ON outbox_events (created_at) WHERE processed_at IS NULL;

-- Operational notes:
-- - Keep media objects private; issue short-lived signed URLs only after authorization.
-- - Use transactions for accepting a friend request + creating friendship.
-- - Use transactions for message insert + outbox event insert.
-- - Validate friend/block/member access in application services.
-- - Consider partitioning messages only after real workload measurements justify it.
