-- ============================================================
-- 005_tower_refactor.sql — Tower climb game loop
-- Chores give XP + money + damage
-- Tower: per-player floors with monsters
-- Store: characters, weapons, armor, consumables
-- ============================================================

-- ── profiles: tower + combat fields ──────────────────────────
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS xp            integer     NOT NULL DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS tower_floor   integer     NOT NULL DEFAULT 1;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS player_hp     integer     NOT NULL DEFAULT 100;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS player_max_hp integer     NOT NULL DEFAULT 100;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS monster_hp    integer     NOT NULL DEFAULT 50;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_monster_attack timestamptz NOT NULL DEFAULT now();
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS character_type text        NOT NULL DEFAULT 'survivor';

-- ── chores: add xp and damage rewards ────────────────────────
ALTER TABLE chores ADD COLUMN IF NOT EXISTS xp_reward     integer NOT NULL DEFAULT 10;
ALTER TABLE chores ADD COLUMN IF NOT EXISTS damage_reward  integer NOT NULL DEFAULT 5;

ALTER TABLE chore_templates ADD COLUMN IF NOT EXISTS xp_reward     integer NOT NULL DEFAULT 10;
ALTER TABLE chore_templates ADD COLUMN IF NOT EXISTS damage_reward  integer NOT NULL DEFAULT 5;

-- ── tower_floors: seeded monster catalogue ────────────────────
CREATE TABLE IF NOT EXISTS tower_floors (
  floor                   integer PRIMARY KEY,
  monster_name            text    NOT NULL,
  monster_emoji           text    NOT NULL DEFAULT '👾',
  monster_max_hp          integer NOT NULL,
  monster_attack          integer NOT NULL,
  attack_interval_hours   integer NOT NULL DEFAULT 8,
  money_reward            integer NOT NULL DEFAULT 0,
  xp_reward               integer NOT NULL DEFAULT 0
);

-- ── store_items: global catalogue ────────────────────────────
CREATE TABLE IF NOT EXISTS store_items (
  id           uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  name         text    NOT NULL,
  description  text,
  item_type    text    NOT NULL CHECK (item_type IN ('character','weapon','armor','consumable')),
  emoji        text    NOT NULL DEFAULT '📦',
  cost         integer NOT NULL,
  damage_bonus integer NOT NULL DEFAULT 0,
  hp_bonus     integer NOT NULL DEFAULT 0,
  heal_amount  integer NOT NULL DEFAULT 0,
  is_character boolean NOT NULL DEFAULT false,
  sort_order   integer NOT NULL DEFAULT 0
);

-- ── player_items: per-profile inventory ──────────────────────
CREATE TABLE IF NOT EXISTS player_items (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id   uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  item_id      uuid        NOT NULL REFERENCES store_items(id),
  equipped     boolean     NOT NULL DEFAULT false,
  purchased_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(profile_id, item_id)
);

ALTER TABLE tower_floors  ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_items   ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_items  ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tower_floors_read"    ON tower_floors;
DROP POLICY IF EXISTS "store_items_read"     ON store_items;
DROP POLICY IF EXISTS "player_items_select"  ON player_items;
DROP POLICY IF EXISTS "player_items_insert"  ON player_items;
DROP POLICY IF EXISTS "player_items_update"  ON player_items;

CREATE POLICY "tower_floors_read"   ON tower_floors FOR SELECT TO authenticated USING (true);
CREATE POLICY "store_items_read"    ON store_items  FOR SELECT TO authenticated USING (true);

-- Players see their own items; leaders see all household members for tower view
CREATE POLICY "player_items_select" ON player_items FOR SELECT
  USING (profile_id IN (
    SELECT id FROM profiles WHERE household_id = (SELECT household_id FROM profiles WHERE id = auth.uid())
  ));
CREATE POLICY "player_items_insert" ON player_items FOR INSERT WITH CHECK (profile_id = auth.uid());
CREATE POLICY "player_items_update" ON player_items FOR UPDATE USING (profile_id = auth.uid());

-- ── Seed: tower floors (20 levels) ───────────────────────────
DELETE FROM tower_floors;
INSERT INTO tower_floors (floor, monster_name, monster_emoji, monster_max_hp, monster_attack, attack_interval_hours, money_reward, xp_reward) VALUES
( 1, 'Rabid Rat',       '🐀',  50,    5,  8,  5,   20),
( 2, 'Feral Dog',       '🐕',  100,   8,  8,  10,  40),
( 3, 'Infected Crow',   '🦅',  180,   12, 7,  15,  60),
( 4, 'Bandit Scout',    '🗡️',  280,   16, 7,  25,  80),
( 5, 'Mutant Boar',     '🐗',  420,   22, 6,  35,  120),
( 6, 'Wasteland Witch', '🧙',  600,   28, 6,  50,  160),
( 7, 'Scrap Golem',     '🤖',  850,   36, 6,  70,  200),
( 8, 'Toxic Crawler',   '🕷️', 1150,  45, 5,  90,  260),
( 9, 'Raider Chief',    '💀',  1500,  55, 5,  120, 320),
(10, 'Shadow Wolf',     '🐺',  2000,  70, 5,  160, 400),
(11, 'Plague Bearer',   '☠️',  2600,  85, 4,  200, 500),
(12, 'Iron Sentinel',   '⚔️',  3300,  100,4,  250, 600),
(13, 'Bone Colossus',   '💀',  4200,  120,4,  320, 720),
(14, 'Acid Wyrm',       '🐉',  5200,  145,4,  400, 860),
(15, 'The Overseer',    '👁️', 6500,  175,3,  500, 1000),
(16, 'Soul Harvester',  '💀',  8000,  210,3,  650, 1200),
(17, 'Abyssal Titan',   '👾',  10000, 250,3,  800, 1500),
(18, 'The Architect',   '🏗️', 12500, 300,3,  1000,1800),
(19, 'Void Serpent',    '🐍',  15500, 360,2,  1200,2200),
(20, 'The Warden',      '👑',  20000, 440,2,  1500,2800);

-- ── Seed: store items ─────────────────────────────────────────
DELETE FROM store_items;
INSERT INTO store_items (name, description, item_type, emoji, cost, damage_bonus, hp_bonus, heal_amount, is_character, sort_order) VALUES
-- Characters
('Survivor',      'A hardy wasteland survivor. Your starting character.',    'character', '🧑', 0,    0,   0,   0, true,  1),
('Scavenger',     'Quick hands, quicker feet. +5 damage.',                   'character', '🧤', 100,  5,   0,   0, true,  2),
('Medic',         'Keeps the crew alive. +30 max HP.',                       'character', '🩺', 200,  0,   30,  0, true,  3),
('Soldier',       'Trained for combat. +10 damage, +10 max HP.',             'character', '🪖', 350,  10,  10,  0, true,  4),
('Warlord',       'A fearsome warrior. +20 damage, +20 max HP.',             'character', '⚔️', 750,  20,  20,  0, true,  5),
-- Weapons
('Rusty Pipe',    'Better than bare hands. +5 damage.',                      'weapon',    '🔧', 50,   5,   0,   0, false, 10),
('Hunting Knife', 'Sharp and reliable. +10 damage.',                         'weapon',    '🔪', 120,  10,  0,   0, false, 11),
('Crossbow',      'Ranged and deadly. +20 damage.',                          'weapon',    '🏹', 300,  20,  0,   0, false, 12),
('Shotgun',       'Devastating at close range. +40 damage.',                 'weapon',    '🔫', 700,  40,  0,   0, false, 13),
('Plasma Cutter', 'Cuts through anything. +80 damage.',                      'weapon',    '⚡', 1500, 80,  0,   0, false, 14),
-- Armor
('Leather Vest',  'Basic protection. +20 max HP.',                           'armor',     '🦺', 80,   0,   20,  0, false, 20),
('Chain Mail',    'Heavy but sturdy. +50 max HP.',                           'armor',     '🛡️',200,  0,   50,  0, false, 21),
('Combat Suit',   'Military-grade protection. +100 max HP.',                 'armor',     '🪖', 500,  0,   100, 0, false, 22),
('Power Armor',   'The ultimate protection. +200 max HP.',                   'armor',     '🤖', 1200, 0,   200, 0, false, 23),
-- Consumables (instant-use)
('Health Kit',    'Restores 30 HP instantly.',                               'consumable','💊', 30,   0,   0,   30, false, 30),
('Stim Pack',     'Fully restores HP.',                                      'consumable','💉', 80,   0,   0,   999,false, 31);

-- ── Re-seed chore templates with new rewards ──────────────────
UPDATE chores SET template_id = NULL;
DELETE FROM chore_templates;

INSERT INTO chore_templates
  (title, description, category, recurrence, points_reward, xp_reward, damage_reward)
VALUES
-- MAINTENANCE → damage-focused
('Take Out the Rubbish',      'Clear waste from the settlement.',          'maintenance','daily',  10, 15, 10),
('Fix a Leaking Tap',         'Keep infrastructure running.',              'maintenance','daily',  15, 15, 12),
('Tidy Your Room',            'Order in living quarters.',                 'maintenance','daily',  10, 10, 8),
('Deep Clean the Appliances', 'Prevent breakdowns before they happen.',   'maintenance','weekly', 30, 30, 25),
('Mow / Clear the Yard',      'Keep the perimeter clear.',                'maintenance','weekly', 25, 25, 20),

-- LEARNING → xp-focused
('20 Min Reading',            'Study is survival in the new world.',      'learning',  'daily',   5,  30, 3),
('Practice a Skill',          'Sharpen a practical skill.',               'learning',  'daily',   5,  30, 3),
('Study Session (1 hour)',    'Dedicated learning time.',                  'learning',  'weekly', 15,  80, 8),
('Teach Someone Something',   'Knowledge shared is knowledge kept.',      'learning',  'weekly', 10,  60, 5),

-- FOOD → balanced
('Wash the Dishes',           'Clean prep surfaces prevent illness.',      'food',      'daily',   8,  15, 5),
('Prep and Cook a Meal',      'Food security starts in the kitchen.',     'food',      'daily',  15,  20, 8),
('Grocery / Supply Run',      'Restock the settlement larder.',           'food',      'weekly', 30,  30, 15),

-- WORK → money-focused
('Run an Errand',             'Complete tasks with real-world value.',    'work',      'daily',  20,  10, 5),
('Help with Finances',        'Contribute to the household budget.',      'work',      'daily',  25,  10, 3),
('Fix Something Broken',      'Emergency repair saves money.',            'work',      'weekly', 50,  20, 15),
('Manage Bills / Budget',     'Keep the settlement financially healthy.', 'work',      'weekly', 40,  15, 10),

-- FAMILY → xp + damage balanced
('Family Dinner Together',    'Shared meals build bonds.',                'family',    'daily',  10,  20, 5),
('Check In on Each Other',    'Mental health matters.',                   'family',    'daily',   5,  20, 3),
('Family Council Meeting',    'Discuss priorities and plans together.',   'family',    'weekly', 20,  40, 10),
('Plan a Family Activity',    'Shared experiences strengthen bonds.',     'family',    'weekly', 25,  50, 12);
