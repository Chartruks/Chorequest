-- 008_solo_play.sql
-- A leader can play solo without creating a guild. Chores and chore logs can
-- belong to no household (scoped to the player by created_by / profile_id).
-- When the player later creates a guild, their solo chores/logs are migrated to it.
ALTER TABLE chore_log ALTER COLUMN household_id DROP NOT NULL;
ALTER TABLE chores    ALTER COLUMN household_id DROP NOT NULL;
