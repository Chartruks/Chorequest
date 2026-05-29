-- ============================================================
-- 004_economy_v2.sql — Production-chain economy
-- Base resources: energy, knowledge, food, money, population
-- Advanced resources: weapons, medicine, science, army
-- Buildings consume base → produce advanced
-- ============================================================

-- ── game_state: new resource columns ─────────────────────────
ALTER TABLE game_state ADD COLUMN IF NOT EXISTS population integer NOT NULL DEFAULT 5;
ALTER TABLE game_state ADD COLUMN IF NOT EXISTS army       integer NOT NULL DEFAULT 0;

-- Rename stub columns to their real names
ALTER TABLE game_state RENAME COLUMN ammo  TO weapons;
ALTER TABLE game_state RENAME COLUMN intel TO science;

-- Drop unused stubs
ALTER TABLE game_state DROP COLUMN IF EXISTS steel;
ALTER TABLE game_state DROP COLUMN IF EXISTS fuel;

-- ── chores: add population_reward, rename categories ─────────
ALTER TABLE chores ADD COLUMN IF NOT EXISTS population_reward integer NOT NULL DEFAULT 0;

-- Rename categories (cleanliness → food, special → work)
UPDATE chores SET category = 'food' WHERE category = 'cleanliness';
UPDATE chores SET category = 'work' WHERE category = 'special';

-- Family chores now produce population, not food
UPDATE chores
  SET population_reward = food_reward, food_reward = 0
  WHERE category = 'family' AND food_reward > 0;

-- ── chore_templates: same changes ────────────────────────────
ALTER TABLE chore_templates ADD COLUMN IF NOT EXISTS population_reward integer NOT NULL DEFAULT 0;

UPDATE chore_templates SET category = 'food' WHERE category = 'cleanliness';
UPDATE chore_templates SET category = 'work' WHERE category = 'special';

UPDATE chore_templates
  SET population_reward = food_reward, food_reward = 0
  WHERE category = 'family' AND food_reward > 0;

-- ── base_modules: clear (economy completely changed) ─────────
DELETE FROM base_modules;

-- ── advancements table ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS advancements (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id  uuid        REFERENCES households(id) ON DELETE CASCADE,
  advancement_key text      NOT NULL,
  unlocked_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE(household_id, advancement_key)
);

ALTER TABLE advancements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "advancements_select" ON advancements;
DROP POLICY IF EXISTS "advancements_insert" ON advancements;

CREATE POLICY "advancements_select" ON advancements FOR SELECT
  USING (household_id = (SELECT household_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "advancements_insert" ON advancements FOR INSERT
  WITH CHECK (household_id = (SELECT household_id FROM profiles WHERE id = auth.uid()));

-- ── chore_templates: re-seed ──────────────────────────────────
UPDATE chores SET template_id = NULL;
DELETE FROM chore_templates;

INSERT INTO chore_templates
  (title, description, category, recurrence, points_reward,
   energy_reward, knowledge_reward, money_reward, food_reward, population_reward, morale_reward)
VALUES

-- MAINTENANCE → ⚡ Energy
('Fix a Leaking Tap',         'Keep infrastructure running.',             'maintenance','daily',  10,  8, 0,  0,  0, 0, 0),
('Take Out the Rubbish',      'Clear waste from the settlement.',         'maintenance','daily',  15, 10, 0,  0,  0, 0, 0),
('Check the Generator',       'Run diagnostics on power systems.',        'maintenance','daily',  20, 12, 0,  0,  0, 0, 0),
('Deep Clean the Appliances', 'Prevent breakdowns before they happen.',   'maintenance','weekly', 40, 25, 0,  0,  0, 0, 0),
('Mow / Clear the Yard',      'Keep perimeter clear for visibility.',     'maintenance','weekly', 35, 20, 0,  0,  0, 0, 0),

-- LEARNING → 📚 Knowledge
('20 Min Reading',            'Study is survival in the new world.',      'learning',  'daily',  15,  0, 10, 0,  0, 0, 0),
('Practice a Skill',          'Sharpen a practical skill.',               'learning',  'daily',  15,  0, 10, 0,  0, 0, 0),
('Study Session (1 hour)',    'Dedicated learning time.',                 'learning',  'weekly', 50,  0, 30, 0,  0, 0, 0),
('Teach Someone Something',   'Knowledge shared is knowledge kept.',      'learning',  'weekly', 40,  0, 25, 0,  0, 0, 0),

-- FOOD → 🥫 Food
('Wash the Dishes',           'Clean prep surfaces prevent illness.',     'food',      'daily',  10,  0,  0, 0,  8, 0, 0),
('Prep and Cook a Meal',      'Food security starts in the kitchen.',     'food',      'daily',  20,  0,  0, 0, 15, 0, 0),
('Grocery / Supply Run',      'Restock the settlement larder.',           'food',      'weekly', 35,  0,  0, 0, 25, 0, 0),
('Organise the Pantry',       'Inventory and organise food supplies.',    'food',      'weekly', 25,  0,  0, 0, 20, 0, 0),

-- WORK → 💵 Money
('Run an Errand',             'Complete tasks with real-world value.',    'work',      'daily',  20,  0,  0, 15, 0, 0, 0),
('Help with Finances',        'Contribute to the household budget.',      'work',      'daily',  25,  0,  0, 20, 0, 0, 0),
('Fix Something Broken',      'Emergency repair saves money.',            'work',      'weekly', 50,  0,  0, 30, 0, 0, 0),
('Manage Bills / Budget',     'Keep the settlement financially healthy.', 'work',      'weekly', 45,  0,  0, 35, 0, 0, 0),
('Build or Repair Something', 'Practical construction.',                  'work',      'special',70,  0,  0, 40, 0, 0, 0),

-- FAMILY → 👥 Population
('Family Dinner Together',    'Shared meals build community bonds.',      'family',    'daily',  10,  0,  0, 0,  0, 8, 0),
('Check In on Each Other',    'Mental health matters in the field.',      'family',    'daily',  10,  0,  0, 0,  0, 8, 0),
('Family Council Meeting',    'Discuss priorities and plans together.',   'family',    'weekly', 25,  0,  0, 0,  0,15, 0),
('Plan a Family Activity',    'Shared experiences strengthen bonds.',     'family',    'weekly', 30,  0,  0, 0,  0,20, 0),
('Volunteer / Help Others',   'Grow the community through service.',      'family',    'special',50,  0,  0, 0,  0,30, 0);
