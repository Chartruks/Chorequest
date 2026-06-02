-- 007_family_profiles_no_pin.sql
-- Family members log in with just the household code (no email, no PIN) and pick
-- or create a hero. Member profiles are standalone rows (not tied to an auth user),
-- so the same hero is reachable from any device.

-- Member profiles get an auto-generated id.
ALTER TABLE profiles ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- Family-trust RLS: any authenticated session (incl. anonymous device sessions)
-- can read/write household data. The active identity is the chosen profile,
-- not auth.uid().

-- profiles
DROP POLICY IF EXISTS "profiles: own read"       ON profiles;
DROP POLICY IF EXISTS "profiles: household read" ON profiles;
DROP POLICY IF EXISTS "profiles: own update"     ON profiles;
CREATE POLICY "profiles_auth_select" ON profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_auth_insert" ON profiles FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "profiles_auth_update" ON profiles FOR UPDATE TO authenticated USING (true);

-- chores
DROP POLICY IF EXISTS "chores: household access" ON chores;
CREATE POLICY "chores_auth_all" ON chores FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- chore_log
DROP POLICY IF EXISTS "chore_log_select" ON chore_log;
DROP POLICY IF EXISTS "chore_log_insert" ON chore_log;
CREATE POLICY "chore_log_auth_select" ON chore_log FOR SELECT TO authenticated USING (true);
CREATE POLICY "chore_log_auth_insert" ON chore_log FOR INSERT TO authenticated WITH CHECK (true);

-- rewards
DROP POLICY IF EXISTS "rewards: household access" ON rewards;
CREATE POLICY "rewards_auth_all" ON rewards FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- player_items
DROP POLICY IF EXISTS "player_items_select" ON player_items;
DROP POLICY IF EXISTS "player_items_insert" ON player_items;
DROP POLICY IF EXISTS "player_items_update" ON player_items;
CREATE POLICY "player_items_auth_all" ON player_items FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- households: any authenticated user can create one (leaders create on mobile now)
DROP POLICY IF EXISTS "households: creator insert" ON households;
CREATE POLICY "households_auth_insert" ON households FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "households_auth_update" ON households FOR UPDATE TO authenticated USING (true);
