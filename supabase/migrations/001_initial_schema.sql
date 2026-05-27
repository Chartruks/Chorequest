-- Households
create table if not exists households (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  invite_code text not null unique,
  created_by uuid references auth.users(id) on delete cascade,
  created_at timestamptz default now()
);

-- Profiles (extends auth.users)
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text,
  avatar_url text,
  role text not null default 'child' check (role in ('parent', 'child')),
  points integer not null default 0,
  level integer not null default 1,
  household_id uuid references households(id) on delete set null,
  created_at timestamptz default now()
);

-- Chores
create table if not exists chores (
  id uuid primary key default gen_random_uuid(),
  household_id uuid references households(id) on delete cascade,
  title text not null,
  description text,
  points_reward integer not null default 10,
  assigned_to uuid references profiles(id) on delete set null,
  created_by uuid references profiles(id) on delete cascade,
  due_date date,
  status text not null default 'pending' check (status in ('pending', 'in_progress', 'completed', 'approved')),
  recurrence text not null default 'none' check (recurrence in ('none', 'daily', 'weekly', 'monthly')),
  created_at timestamptz default now()
);

-- Rewards
create table if not exists rewards (
  id uuid primary key default gen_random_uuid(),
  household_id uuid references households(id) on delete cascade,
  title text not null,
  description text,
  points_cost integer not null default 50,
  created_by uuid references profiles(id) on delete cascade,
  created_at timestamptz default now()
);

-- Auto-create profile on signup
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into profiles (id) values (new.id);
  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Row Level Security
alter table profiles enable row level security;
alter table households enable row level security;
alter table chores enable row level security;
alter table rewards enable row level security;

-- Profiles: users can read/update their own + household members
create policy "profiles: own read" on profiles for select using (auth.uid() = id);
create policy "profiles: household read" on profiles for select
  using (household_id in (select household_id from profiles where id = auth.uid()));
create policy "profiles: own update" on profiles for update using (auth.uid() = id);

-- Households: members can read, creators can manage
create policy "households: member read" on households for select
  using (id in (select household_id from profiles where id = auth.uid()));
create policy "households: creator insert" on households for insert with check (created_by = auth.uid());
create policy "households: creator update" on households for update using (created_by = auth.uid());

-- Chores: household members can read/write
create policy "chores: household access" on chores for all
  using (household_id in (select household_id from profiles where id = auth.uid()));

-- Rewards: household members can read/write
create policy "rewards: household access" on rewards for all
  using (household_id in (select household_id from profiles where id = auth.uid()));
