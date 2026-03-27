-- Add missing indexes identified during query audit
-- Focus: admin analytics, tag/genre search, notification dedup, billing analytics, user tracking

-- Song: cross-user analytics by status + date (admin stats, trending without userId)
CREATE INDEX "Song_generationStatus_createdAt_idx" ON "Song"("generationStatus", "createdAt");

-- Notification: filter by type (e.g. low_credits dedup check)
CREATE INDEX "Notification_userId_type_createdAt_idx" ON "Notification"("userId", "type", "createdAt");

-- Subscription: billing analytics filter by status + tier
CREATE INDEX "Subscription_status_tier_idx" ON "Subscription"("status", "tier");

-- CreditUsage: admin cross-user date range scans
CREATE INDEX "CreditUsage_createdAt_idx" ON "CreditUsage"("createdAt");

-- PlayEvent: analytics queries without startedAt range (unique listener counts)
CREATE INDEX "PlayEvent_listenerId_idx" ON "PlayEvent"("listenerId");

-- User: active user tracking by lastLoginAt, admin list queries
CREATE INDEX "User_lastLoginAt_idx" ON "User"("lastLoginAt");
CREATE INDEX "User_createdAt_idx" ON "User"("createdAt");
CREATE INDEX "User_isAdmin_idx" ON "User"("isAdmin");
CREATE INDEX "User_isDisabled_idx" ON "User"("isDisabled");

-- GIN trigram index for Song.tags text search (covers ILIKE %genre% queries)
-- Requires pg_trgm extension (available on all modern PostgreSQL installations)
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX "Song_tags_trgm_idx" ON "Song" USING GIN ("tags" gin_trgm_ops);
