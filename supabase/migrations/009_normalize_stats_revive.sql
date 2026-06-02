-- 009_normalize_stats_revive.sql
-- Normalize the progression curve, reseed 10 monsters + a grounded low-cost store,
-- and add a death/revive mechanic (2 chores to revive).

-- profiles: revive tracking + renormalized starting stats
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS revive_progress integer NOT NULL DEFAULT 0;
ALTER TABLE profiles ALTER COLUMN level         SET DEFAULT 1;
ALTER TABLE profiles ALTER COLUMN xp            SET DEFAULT 0;
ALTER TABLE profiles ALTER COLUMN points        SET DEFAULT 0;
ALTER TABLE profiles ALTER COLUMN tower_floor   SET DEFAULT 1;
ALTER TABLE profiles ALTER COLUMN player_hp     SET DEFAULT 5;
ALTER TABLE profiles ALTER COLUMN player_max_hp SET DEFAULT 5;
ALTER TABLE profiles ALTER COLUMN monster_hp    SET DEFAULT 1;

-- monsters: 10 floors, easy → tough
DELETE FROM tower_floors;
INSERT INTO tower_floors (floor, monster_name, monster_emoji, monster_max_hp, monster_attack, attack_interval_hours, money_reward, xp_reward) VALUES
(1,'Forest Slime',   '🟢',  1,  2, 8, 1, 1),
(2,'Cave Rat',       '🐀',  2,  3, 8, 2, 2),
(3,'Dusk Bat',       '🦇',  4,  4, 8, 3, 3),
(4,'Goblin Scout',   '👺',  6,  5, 7, 4, 4),
(5,'Gray Wolf',      '🐺',  9,  6, 7, 5, 6),
(6,'Risen Skeleton', '💀', 13,  8, 6, 7, 8),
(7,'Orc Brute',      '👹', 18, 10, 6, 9, 10),
(8,'Cave Troll',     '🧌', 24, 12, 5, 12, 13),
(9,'Wraith',         '👻', 32, 15, 5, 15, 16),
(10,'Ember Dragon',  '🐉', 42, 18, 4, 20, 20);

-- store: low, grounded values (weapons +atk, armor +hp, consumables heal)
DELETE FROM player_items;
DELETE FROM store_items;
INSERT INTO store_items (name, description, item_type, emoji, cost, damage_bonus, hp_bonus, heal_amount, is_character, sort_order) VALUES
('Survivor',       'Your starting hero.',          'character',  '🧑',  0, 0, 0, 0,   true,  1),
('Wooden Sword',   'A sturdy starter blade. +1 attack.', 'weapon', '🗡️',  5, 1, 0, 0, false, 10),
('Lucky Charm',    'A little luck. +1 attack.',    'weapon',     '🍀',  8, 1, 0, 0,   false, 11),
('Stone Axe',      'Heavy and reliable. +2 attack.','weapon',    '🪓', 12, 2, 0, 0,   false, 12),
('Rune Stone',     'Etched with power. +2 attack.','weapon',     '🔮', 18, 2, 0, 0,   false, 13),
('Iron Sword',     'A forged steel edge. +3 attack.','weapon',   '⚔️', 25, 3, 0, 0,   false, 14),
('Steel Blade',    'A warrior''s weapon. +4 attack.','weapon',   '🪒', 45, 4, 0, 0,   false, 15),
('Knight''s Blade','Gleaming and deadly. +6 attack.','weapon',   '🗡️', 80, 6, 0, 0,   false, 16),
('Cloth Tunic',    'Simple padding. +2 HP.',       'armor',      '🧥',  6, 0, 2, 0,   false, 20),
('Leather Armor',  'Tough hide. +4 HP.',           'armor',      '🦺', 15, 0, 4, 0,   false, 21),
('Chainmail',      'Linked rings. +7 HP.',         'armor',      '🛡️', 35, 0, 7, 0,   false, 22),
('Plate Armor',    'Full protection. +12 HP.',     'armor',      '🪖', 70, 0, 12, 0,  false, 23),
('Bread',          'A quick bite. Heals 3 HP.',    'consumable', '🍞',  3, 0, 0, 3,   false, 30),
('Health Potion',  'Restores 10 HP.',              'consumable', '🧪', 10, 0, 0, 10,  false, 31),
('Elixir',         'Fully restores HP.',           'consumable', '💉', 25, 0, 0, 999, false, 32);

-- renormalize every existing hero to the new baseline
UPDATE profiles SET level=1, xp=0, points=0, tower_floor=1, player_hp=5, player_max_hp=5, monster_hp=1, revive_progress=0;
