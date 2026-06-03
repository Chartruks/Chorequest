-- 011_player_items_quantity.sql
-- Inventory holds all purchases (weapons, armor, consumables) with a stack count.
ALTER TABLE player_items ADD COLUMN IF NOT EXISTS quantity integer NOT NULL DEFAULT 1;
