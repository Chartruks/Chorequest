-- ============================================================
-- 003_ashen_keep.sql — Post-apocalyptic retheme migrations
-- ============================================================

-- ── profiles: new role system ────────────────────────────────
-- Add is_leader flag (replaces parent/child for permissions)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_leader boolean NOT NULL DEFAULT false;

-- Migrate existing roles to is_leader
UPDATE profiles SET is_leader = true WHERE role = 'parent';

-- Drop old role constraint
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

-- Allow NULL role (means not yet chosen)
ALTER TABLE profiles ALTER COLUMN role DROP NOT NULL;
ALTER TABLE profiles ALTER COLUMN role DROP DEFAULT;

-- Reset all roles so users choose their game role
UPDATE profiles SET role = NULL;

-- New game roles
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IS NULL OR role IN ('engineer', 'scout', 'medic', 'trader', 'sentinel', 'scholar'));

-- ── game_state: rename + add resource columns ─────────────────
ALTER TABLE game_state RENAME COLUMN research  TO knowledge;
ALTER TABLE game_state RENAME COLUMN materials TO money;
ALTER TABLE game_state ADD COLUMN IF NOT EXISTS food      integer NOT NULL DEFAULT 0;
ALTER TABLE game_state ADD COLUMN IF NOT EXISTS medicine  integer NOT NULL DEFAULT 0;
ALTER TABLE game_state ADD COLUMN IF NOT EXISTS steel     integer NOT NULL DEFAULT 0;
ALTER TABLE game_state ADD COLUMN IF NOT EXISTS fuel      integer NOT NULL DEFAULT 0;
ALTER TABLE game_state ADD COLUMN IF NOT EXISTS ammo      integer NOT NULL DEFAULT 0;
ALTER TABLE game_state ADD COLUMN IF NOT EXISTS intel     integer NOT NULL DEFAULT 0;

-- ── base_modules: rename module types ────────────────────────
-- reactor → generator, lab → library, fabricator → workshop,
-- medbay → clinic, bridge → communityHall, hangar → watchtower
UPDATE base_modules SET module_type = 'generator'     WHERE module_type = 'reactor';
UPDATE base_modules SET module_type = 'library'       WHERE module_type = 'lab';
UPDATE base_modules SET module_type = 'workshop'      WHERE module_type = 'fabricator';
UPDATE base_modules SET module_type = 'clinic'        WHERE module_type = 'medbay';
UPDATE base_modules SET module_type = 'communityHall' WHERE module_type = 'bridge';
UPDATE base_modules SET module_type = 'watchtower'    WHERE module_type = 'hangar';

-- ── chores: rename + add resource columns ────────────────────
ALTER TABLE chores RENAME COLUMN research_reward  TO knowledge_reward;
ALTER TABLE chores RENAME COLUMN materials_reward TO money_reward;
ALTER TABLE chores ADD COLUMN IF NOT EXISTS food_reward integer NOT NULL DEFAULT 0;

-- Remap category resource rewards:
-- cleanliness was → materials (now food)
UPDATE chores SET food_reward = money_reward, money_reward = 0 WHERE category = 'cleanliness';
-- family was → morale (now food)
UPDATE chores SET food_reward = morale_reward, morale_reward = 0 WHERE category = 'family';

-- ── chore_templates: rename + add + remap ────────────────────
ALTER TABLE chore_templates RENAME COLUMN research_reward  TO knowledge_reward;
ALTER TABLE chore_templates RENAME COLUMN materials_reward TO money_reward;
ALTER TABLE chore_templates ADD COLUMN IF NOT EXISTS food_reward integer NOT NULL DEFAULT 0;

-- Remap template rewards to match new category→resource rules
UPDATE chore_templates SET food_reward = money_reward,  money_reward  = 0 WHERE category = 'cleanliness';
UPDATE chore_templates SET food_reward = morale_reward, morale_reward = 0 WHERE category = 'family';
UPDATE chore_templates SET money_reward = GREATEST(energy_reward, knowledge_reward, money_reward, morale_reward),
  energy_reward = 0, knowledge_reward = 0, morale_reward = 0
  WHERE category = 'special';

-- ── chore_templates: re-seed with new resource names ─────────
-- (Categories: maintenance→energy, learning→knowledge, cleanliness→food, family→food, special→money)
UPDATE chores SET template_id = NULL;
DELETE FROM chore_templates;

INSERT INTO chore_templates (title, description, category, recurrence, points_reward, energy_reward, knowledge_reward, money_reward, food_reward, morale_reward) VALUES

-- Daily — Maintenance → Energy
('Fix a Leaking Tap',       'Keep infrastructure running.',         'maintenance', 'daily',   10, 8,  0,  0, 0, 0),
('Take Out the Rubbish',    'Clear waste from the settlement.',     'maintenance', 'daily',   15, 10, 0,  0, 0, 0),
('Check the Generator',     'Run diagnostics on power systems.',    'maintenance', 'daily',   20, 12, 0,  0, 0, 0),

-- Daily — Learning → Knowledge
('20 Min Reading',          'Study is survival in the new world.',  'learning',    'daily',   15, 0,  10, 0, 0, 0),
('Practice a Skill',        'Sharpen a practical skill.',           'learning',    'daily',   15, 0,  10, 0, 0, 0),

-- Daily — Cleanliness → Food
('Wash the Dishes',         'Clean prep surfaces prevent illness.', 'cleanliness', 'daily',   10, 0,  0,  0, 8, 0),
('Tidy Your Quarters',      'Order and discipline keep morale up.', 'cleanliness', 'daily',   10, 0,  0,  0, 5, 0),
('Prep and Cook a Meal',    'Food security starts in the kitchen.', 'cleanliness', 'daily',   20, 0,  0,  0, 15, 0),

-- Daily — Family → Food
('Family Dinner Together',  'Shared meals build community bonds.',  'family',      'daily',   10, 0,  0,  0, 10, 0),
('Check In on Each Other',  'Mental health matters in the field.',  'family',      'daily',   10, 0,  0,  0, 8,  0),

-- Weekly — Maintenance → Energy
('Deep Clean the Appliances', 'Prevent breakdowns before they happen.', 'maintenance', 'weekly', 40, 25, 0,  0,  0,  0),
('Mow / Clear the Yard',      'Keep perimeter clear for visibility.',   'maintenance', 'weekly', 35, 20, 0,  0,  0,  0),
('Run Supply Inventory',      'Audit and organise settlement stores.',   'maintenance', 'weekly', 30, 20, 0,  0,  0,  0),

-- Weekly — Learning → Knowledge
('Study Session (1 hour)',    'Dedicated learning time.',            'learning',    'weekly',   50, 0,  30, 0, 0, 0),
('Teach Someone Something',  'Knowledge shared is knowledge kept.', 'learning',    'weekly',   40, 0,  25, 0, 0, 0),

-- Weekly — Cleanliness → Food
('Grocery / Supply Run',      'Restock the settlement larder.',       'cleanliness', 'weekly',  35, 0,  0,  0, 25, 0),
('Deep Clean a Common Area',  'Hygiene is the first line of defence.','cleanliness', 'weekly',  40, 0,  0,  0, 20, 0),
('Do the Laundry',            'Clean kit keeps the crew ready.',       'cleanliness', 'weekly',  30, 0,  0,  0, 15, 0),

-- Weekly — Family → Food
('Family Council Meeting',    'Discuss priorities and plans.',         'family',      'weekly',  25, 0,  0,  0, 20, 0),
('Plan a Family Activity',    'Shared experiences build bonds.',       'family',      'weekly',  30, 0,  0,  0, 25, 0),

-- Special — → Money
('Fix Something Broken',      'Emergency repair of critical systems.', 'special',     'special', 60, 0,  0, 35, 0, 0),
('Science or Research Project','Deep learning and applied knowledge.', 'special',     'special', 80, 0,  0, 45, 0, 0),
('Help a Neighbour',          'Community cooperation has real value.', 'special',     'special', 50, 0,  0, 30, 0, 0),
('Build or Repair Something', 'Practical construction skills.',        'special',     'special', 70, 0,  0, 40, 0, 0);

-- ── crew_specializations: drop (replaced by profiles.role) ───
DROP TABLE IF EXISTS crew_specializations;
