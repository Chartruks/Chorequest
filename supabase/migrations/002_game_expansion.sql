-- =====================================================
-- Phase 1: Alter existing tables
-- =====================================================

alter table chores
  add column if not exists category text not null default 'maintenance'
    check (category in ('maintenance','learning','cleanliness','family','special')),
  add column if not exists template_id uuid,
  add column if not exists energy_reward integer not null default 0,
  add column if not exists research_reward integer not null default 0,
  add column if not exists materials_reward integer not null default 0,
  add column if not exists morale_reward integer not null default 0;

alter table rewards
  add column if not exists reward_type text not null default 'real_world'
    check (reward_type in ('real_world','in_game_boost')),
  add column if not exists in_game_bonus jsonb;

-- =====================================================
-- Phase 2: New tables
-- =====================================================

-- Global sector catalogue (read-only for all authenticated users)
create table if not exists sectors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  biome text not null check (biome in ('nebula','asteroid_field','deep_space','alien_world','anomaly')),
  threat_level integer not null default 1 check (threat_level between 1 and 5),
  unlock_chapter integer not null default 1,
  description text,
  lore text
);

-- Pre-built chore templates (read-only for all authenticated users)
create table if not exists chore_templates (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  category text not null check (category in ('maintenance','learning','cleanliness','family','special')),
  recurrence text not null check (recurrence in ('daily','weekly','special')),
  points_reward integer not null,
  energy_reward integer not null default 0,
  research_reward integer not null default 0,
  materials_reward integer not null default 0,
  morale_reward integer not null default 0,
  story_chapter integer
);

-- Add template FK now that chore_templates exists
alter table chores
  add constraint if not exists chores_template_id_fkey
    foreign key (template_id) references chore_templates(id) on delete set null;

-- Household-level resource pool and idle engine
create table if not exists game_state (
  id uuid primary key default gen_random_uuid(),
  household_id uuid unique references households(id) on delete cascade,
  energy integer not null default 0,
  research integer not null default 0,
  materials integer not null default 0,
  morale integer not null default 75,
  last_idle_tick timestamptz not null default now(),
  current_chapter integer not null default 1,
  created_at timestamptz not null default now()
);

-- Station modules (idle generators)
create table if not exists base_modules (
  id uuid primary key default gen_random_uuid(),
  household_id uuid references households(id) on delete cascade,
  module_type text not null
    check (module_type in ('reactor','lab','fabricator','medbay','bridge','hangar')),
  level integer not null default 1 check (level between 1 and 5),
  built_at timestamptz not null default now()
);

-- Per-household real-time exploration missions
create table if not exists discovered_sectors (
  id uuid primary key default gen_random_uuid(),
  household_id uuid references households(id) on delete cascade,
  sector_id uuid references sectors(id),
  explorer_id uuid references profiles(id) on delete set null,
  departs_at timestamptz not null,
  arrives_at timestamptz not null,
  status text not null default 'traveling'
    check (status in ('traveling','arrived','combat','discovered')),
  combat_outcome jsonb,
  resource_yield jsonb
);

-- Story events log per household
create table if not exists story_events (
  id uuid primary key default gen_random_uuid(),
  household_id uuid references households(id) on delete cascade,
  chapter integer not null,
  event_key text not null,
  triggered_at timestamptz not null default now(),
  read_by uuid[] not null default '{}'
);

-- Crew specializations (one per profile)
create table if not exists crew_specializations (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid unique references profiles(id) on delete cascade,
  spec text not null
    check (spec in ('engineer','scientist','navigator','medic','combat','admiral','strategist','diplomat')),
  chosen_at timestamptz not null default now()
);

-- Achievements
create table if not exists achievements (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles(id) on delete cascade,
  achievement_key text not null,
  unlocked_at timestamptz not null default now(),
  unique (profile_id, achievement_key)
);

-- =====================================================
-- Phase 3: Auto-init game_state on household creation
-- =====================================================

create or replace function handle_new_household()
returns trigger language plpgsql security definer as $$
begin
  insert into game_state (household_id) values (new.id);
  return new;
end;
$$;

create or replace trigger on_household_created
  after insert on households
  for each row execute function handle_new_household();

-- =====================================================
-- Phase 4: RLS
-- =====================================================

alter table sectors enable row level security;
alter table chore_templates enable row level security;
alter table game_state enable row level security;
alter table base_modules enable row level security;
alter table discovered_sectors enable row level security;
alter table story_events enable row level security;
alter table crew_specializations enable row level security;
alter table achievements enable row level security;

-- Sectors: any authenticated user can read (global catalogue)
create policy "sectors: authenticated read" on sectors
  for select using (auth.uid() is not null);

-- Chore templates: any authenticated user can read
create policy "chore_templates: authenticated read" on chore_templates
  for select using (auth.uid() is not null);

-- Game state: household members can read/update
create policy "game_state: household read" on game_state
  for select using (
    household_id in (select household_id from profiles where id = auth.uid())
  );
create policy "game_state: household update" on game_state
  for update using (
    household_id in (select household_id from profiles where id = auth.uid())
  );

-- Base modules: household members can read/insert/update
create policy "base_modules: household access" on base_modules
  for all using (
    household_id in (select household_id from profiles where id = auth.uid())
  );

-- Discovered sectors: household members can read/insert/update
create policy "discovered_sectors: household access" on discovered_sectors
  for all using (
    household_id in (select household_id from profiles where id = auth.uid())
  );

-- Story events: household members can read/insert/update
create policy "story_events: household access" on story_events
  for all using (
    household_id in (select household_id from profiles where id = auth.uid())
  );

-- Crew specializations: own profile
create policy "crew_specializations: own read" on crew_specializations
  for select using (
    profile_id in (
      select id from profiles
      where household_id in (select household_id from profiles where id = auth.uid())
    )
  );
create policy "crew_specializations: own insert" on crew_specializations
  for insert with check (profile_id = auth.uid());
create policy "crew_specializations: own update" on crew_specializations
  for update using (profile_id = auth.uid());

-- Achievements: own + household read
create policy "achievements: household read" on achievements
  for select using (
    profile_id in (
      select id from profiles
      where household_id in (select household_id from profiles where id = auth.uid())
    )
  );
create policy "achievements: own insert" on achievements
  for insert with check (profile_id = auth.uid());

-- =====================================================
-- Phase 5: Seed sectors (20 sectors, 5 biomes × 4)
-- =====================================================

insert into sectors (name, biome, threat_level, unlock_chapter, description, lore) values
  -- Nebula (ch1-2)
  ('Aurora Veil', 'nebula', 1, 1,
    'A shimmering cloud of ionised gas on the edge of known space.',
    'The nebula pulses with faint bioluminescence. Something lives here.'),
  ('Crimson Shroud', 'nebula', 2, 1,
    'Dense ruby-red gases interfere with long-range sensors.',
    'Ancient star charts mark this region as forbidden. Nobody recorded why.'),
  ('Whispering Mist', 'nebula', 3, 2,
    'Strange carrier signals echo through the plasma clouds.',
    'The signals repeat every 47 seconds. They did not originate from any known civilisation.'),
  ('The Vortex Bloom', 'nebula', 4, 3,
    'A rotating nebula that traps ships in its outer bands.',
    'Three vessels were lost here. Their logs all end mid-sentence.'),

  -- Asteroid Field (ch1-3)
  ('Ironstone Belt', 'asteroid_field', 1, 1,
    'Rich mineral deposits scattered across a quiet debris field.',
    'Mining guilds once operated here. Their abandoned rigs still drift in the dark.'),
  ('Shatter Reach', 'asteroid_field', 2, 1,
    'A volatile field from a planet torn apart by gravitational stress.',
    'Scans suggest the planet shattered from the inside. No natural cause fits.'),
  ('The Anvil', 'asteroid_field', 3, 2,
    'Massive metallic rocks threaten hull integrity at every turn.',
    'Salvagers call it the Graveyard. Profitable, if you survive.'),
  ('Remnant Drift', 'asteroid_field', 4, 3,
    'Debris from an ancient space battle, still radioactive.',
    'The battle happened two thousand years ago. The war it started never ended.'),

  -- Deep Space (ch2-4)
  ('The Hollow', 'deep_space', 1, 2,
    'A vast emptiness between star systems — almost nothing here.',
    'Navigation logs show ships drifting off course here with no explanation.'),
  ('Starfall Corridor', 'deep_space', 2, 2,
    'A lane of dying stars that once served as a trade route.',
    'The last merchant convoy through here reported a presence following them.'),
  ('Void''s Edge', 'deep_space', 3, 3,
    'The boundary of charted space. Nothing is certain beyond this point.',
    'Your instruments disagree with each other. Pick the reading that feels right.'),
  ('The Long Dark', 'deep_space', 5, 4,
    'Deep intergalactic space. No star within reach. No rescue possible.',
    'Only one crew has ventured this far and returned. They refused to speak of it.'),

  -- Alien World (ch2-4)
  ('Verdant Prime', 'alien_world', 2, 2,
    'A lush planet teeming with exotic flora and cautious fauna.',
    'The plants move on their own. The locals say they''re listening.'),
  ('Ashfall', 'alien_world', 3, 2,
    'A scorched world recovering from a catastrophic impact event.',
    'Survivors built underground. They emerged changed.'),
  ('Crystalline Depths', 'alien_world', 3, 3,
    'A world of towering crystal formations that emit harmonic frequencies.',
    'The frequencies spell out a repeating message in a language not yet deciphered.'),
  ('The Hive', 'alien_world', 4, 4,
    'A world-spanning organism that regards visiting ships as food.',
    'Do not attempt communication. It already knows you''re there.'),

  -- Anomaly (ch3-5)
  ('Mirror Point', 'anomaly', 2, 3,
    'A region where sensor returns show a perfect duplicate of your ship.',
    'The duplicate does not always make the same choices.'),
  ('Temporal Eddy', 'anomaly', 3, 3,
    'Spacetime folds on itself, causing localized time dilation.',
    'A mission here that takes two hours may feel like two days inside.'),
  ('The Wound', 'anomaly', 4, 4,
    'A fracture in normal space leaking energy from somewhere else.',
    'What lies on the other side is not hostile. It is simply incomprehensible.'),
  ('Event Horizon Gate', 'anomaly', 5, 5,
    'A stable aperture near a black hole. Passage is theoretically possible.',
    'The crew that enters will not be the same crew that returns. All records confirm this.');

-- =====================================================
-- Phase 6: Seed chore templates (24 templates)
-- =====================================================

insert into chore_templates
  (title, description, category, recurrence, points_reward,
   energy_reward, research_reward, materials_reward, morale_reward, story_chapter)
values
  -- Daily: Cleanliness
  ('Make Your Bed', 'Start the day right — tidy your sleeping quarters.', 'cleanliness', 'daily', 10, 0, 0, 5, 0, null),
  ('Wash the Dishes', 'Clean all dishes, dry and put them away.', 'cleanliness', 'daily', 15, 0, 0, 8, 0, null),
  ('Tidy Your Room', 'Clear the floor, make surfaces clean, organise belongings.', 'cleanliness', 'daily', 10, 0, 0, 5, 0, null),

  -- Daily: Maintenance
  ('Take Out Trash', 'Empty all bins and replace bags.', 'maintenance', 'daily', 15, 8, 0, 0, 0, null),

  -- Daily: Learning
  ('20 Min Reading', 'Read any book, article, or educational material for 20 minutes.', 'learning', 'daily', 20, 0, 10, 0, 0, null),
  ('Practice Instrument', 'Practice your instrument for at least 20 minutes.', 'learning', 'daily', 20, 0, 10, 0, 0, null),

  -- Daily: Family
  ('Feed the Pets', 'Feed and check water for all household pets.', 'family', 'daily', 15, 0, 0, 0, 8, null),
  ('Family Dinner', 'Sit and eat dinner together as a crew — no screens.', 'family', 'daily', 10, 0, 0, 0, 10, null),

  -- Weekly: Cleanliness
  ('Vacuum All Rooms', 'Vacuum every room in the house.', 'cleanliness', 'weekly', 40, 0, 0, 20, 0, null),
  ('Clean Bathroom', 'Scrub sink, toilet, bath/shower and mop floor.', 'cleanliness', 'weekly', 35, 0, 0, 18, 0, null),
  ('Organise a Shared Space', 'Declutter and reorganise a common area.', 'cleanliness', 'weekly', 35, 0, 0, 18, 0, null),

  -- Weekly: Maintenance
  ('Mow the Lawn', 'Cut the grass and tidy garden edges.', 'maintenance', 'weekly', 40, 20, 0, 0, 0, null),
  ('Do the Laundry', 'Wash, dry and fold one full load of laundry.', 'maintenance', 'weekly', 30, 15, 0, 0, 0, null),

  -- Weekly: Learning
  ('Study Session', 'Complete a focused 1-hour study or homework session.', 'learning', 'weekly', 50, 0, 25, 0, 0, null),

  -- Weekly: Family
  ('Grocery Run', 'Plan and complete the weekly grocery shop.', 'family', 'weekly', 30, 0, 0, 0, 15, null),
  ('Family Game or Movie Night', 'Organise and host a family activity night.', 'family', 'weekly', 25, 0, 0, 0, 20, null),

  -- Special: Cleanliness
  ('Deep Clean the Kitchen', 'Clean oven, fridge, surfaces and floor top to bottom.', 'cleanliness', 'special', 60, 0, 0, 30, 0, null),

  -- Special: Maintenance
  ('Fix Something Broken', 'Repair a broken item around the house.', 'maintenance', 'special', 60, 30, 0, 0, 0, null),
  ('Build or Repair Garden', 'Build a garden bed, plant something, or major tidy.', 'maintenance', 'special', 70, 35, 0, 0, 0, null),

  -- Special: Learning
  ('Science Fair Project', 'Complete a science or creative project from start to finish.', 'learning', 'special', 80, 0, 40, 0, 0, null),
  ('Research Report', 'Write or present a research report on any topic.', 'learning', 'special', 80, 0, 40, 0, 0, null),

  -- Special: Family
  ('Plan a Family Outing', 'Research, plan and execute a full family day out.', 'family', 'special', 50, 0, 0, 0, 30, null),
  ('Holiday Decorating', 'Decorate the home for a seasonal occasion.', 'family', 'special', 40, 0, 0, 0, 25, null),
  ('Help a Neighbour', 'Complete a helpful task for a neighbour or community member.', 'family', 'special', 50, 0, 0, 0, 30, null);
