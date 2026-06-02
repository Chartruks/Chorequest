-- 010_achievement_counters.sql
-- Lifetime counters on profiles that drive the achievements ("Feats") screen.
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS monsters_defeated integer NOT NULL DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS gold_spent        integer NOT NULL DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS deaths            integer NOT NULL DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS revives           integer NOT NULL DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS chores_done       integer NOT NULL DEFAULT 0;
