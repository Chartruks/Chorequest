-- 006_push_notifications.sql — Push token storage for native notifications
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS push_token text;
