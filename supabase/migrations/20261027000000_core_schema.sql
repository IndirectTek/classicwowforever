-- Core schema for Milestones 2 and 3: profiles, characters, plans, feedback,
-- and the game data the planner reads.
--
-- Changes from the original plan, and why (see docs/plan-changes.md):
-- * plan_requests is a usage ledger that belongs to the profile, not the
--   character, so deleting a character can't reset the free quota or erase
--   cost records. Quota and the 10 second rate limit are enforced atomically
--   by reserve_plan_request().
-- * game_zones, zone_links and rest_spots give "adjacent zones" and "log out
--   at an inn" real data, so the planner can be checked instead of trusted.
-- * get_shared_plan() serves /p/[shareId] to anonymous visitors without
--   opening session_plans to them.
-- * Users can update only their display name, never their tier.

-- ---------------------------------------------------------------------------
-- Profiles
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text check (length(display_name) <= 40),
  tier text not null default 'free' check (tier in ('free', 'supporter')),
  created_at timestamptz not null default now()
);

-- Create a profile row whenever someone signs up (like an after_create callback).
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Game data (readable by everyone, written only with the secret key)
-- ---------------------------------------------------------------------------

create table public.game_zones (
  id text primary key check (id ~ '^[a-z0-9-]+$'),
  name text not null,
  min_level int not null check (min_level between 1 and 60),
  max_level int not null check (max_level between 1 and 60),
  faction text not null check (faction in ('alliance', 'horde', 'contested')),
  kind text not null default 'zone' check (kind in ('zone', 'city')),
  verified boolean not null default false,
  source text not null,
  check (min_level <= max_level)
);

-- Each pair is stored once (zone_a < zone_b); zone_neighbors returns both directions.
create table public.zone_links (
  zone_a text not null references public.game_zones on delete cascade,
  zone_b text not null references public.game_zones on delete cascade,
  primary key (zone_a, zone_b),
  check (zone_a < zone_b)
);

create view public.zone_neighbors
with (security_invoker = true) as
  select zone_a as zone_id, zone_b as neighbor_id from public.zone_links
  union all
  select zone_b, zone_a from public.zone_links;

-- Places a character earns full-rate rested XP: inns and capital cities.
create table public.rest_spots (
  id text primary key check (id ~ '^[a-z0-9-]+$'),
  zone_id text not null references public.game_zones on delete cascade,
  name text not null,
  kind text not null check (kind in ('inn', 'city')),
  faction text not null check (faction in ('alliance', 'horde', 'both')),
  verified boolean not null default false,
  source text not null
);

create index rest_spots_zone_id_idx on public.rest_spots (zone_id);

create table public.game_quests (
  id text primary key,
  name text not null,
  zone_id text not null references public.game_zones,
  min_level int not null check (min_level between 1 and 60),
  max_level int not null check (max_level between 1 and 60),
  faction text check (faction in ('alliance', 'horde', 'both')),
  kind text not null default 'quest' check (kind in ('quest', 'dungeon')),
  est_minutes int check (est_minutes > 0),
  notes text,
  verified boolean not null default false,
  source text not null,
  check (min_level <= max_level)
);

create index game_quests_zone_level_idx on public.game_quests (zone_id, min_level);

-- ---------------------------------------------------------------------------
-- Characters
-- ---------------------------------------------------------------------------

create table public.characters (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles on delete cascade,
  name text not null check (length(name) between 2 and 12),
  realm text check (length(realm) <= 40),
  faction text not null check (faction in ('alliance', 'horde')),
  race text not null,
  class text not null,
  level int not null check (level between 1 and 60),
  zone_id text references public.game_zones on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index characters_profile_id_idx on public.characters (profile_id);

-- ---------------------------------------------------------------------------
-- Plans
-- ---------------------------------------------------------------------------

-- One row per plan request, kept even if the character (and its plans) is
-- deleted. Holds no plan content, only what quota and cost tracking need.
create table public.plan_requests (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'succeeded', 'failed')),
  model text,
  input_tokens int,
  output_tokens int,
  cache_read_input_tokens int,
  cost_usd_cents numeric(10, 4),
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index plan_requests_profile_created_idx on public.plan_requests (profile_id, created_at desc);

create table public.session_plans (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique references public.plan_requests on delete cascade,
  profile_id uuid not null references public.profiles on delete cascade,
  character_id uuid not null references public.characters on delete cascade,
  share_id text not null unique check (length(share_id) >= 16),
  minutes int not null check (minutes between 10 and 480),
  goal text not null check (goal in ('xp', 'gold', 'gear', 'dungeon', 'relaxed')),
  -- A StoredPlan (lib/schema.ts): the model's plan after validation, with
  -- quest and rest spot ids resolved to names.
  plan jsonb not null,
  created_at timestamptz not null default now()
);

create index session_plans_character_created_idx on public.session_plans (character_id, created_at desc);

create table public.plan_feedback (
  id uuid primary key default gen_random_uuid(),
  session_plan_id uuid not null unique references public.session_plans on delete cascade,
  rating int check (rating between 1 and 5),
  finished boolean,
  note text check (length(note) <= 1000),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.game_zones enable row level security;
alter table public.zone_links enable row level security;
alter table public.rest_spots enable row level security;
alter table public.game_quests enable row level security;
alter table public.characters enable row level security;
alter table public.plan_requests enable row level security;
alter table public.session_plans enable row level security;
alter table public.plan_feedback enable row level security;

-- Profiles: read your own; change only your display name.
create policy "read own profile" on public.profiles
  for select to authenticated using (id = (select auth.uid()));
create policy "update own profile" on public.profiles
  for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));
revoke update on public.profiles from anon, authenticated;
grant update (display_name) on public.profiles to authenticated;

-- Game data: public read.
create policy "public read" on public.game_zones for select to anon, authenticated using (true);
create policy "public read" on public.zone_links for select to anon, authenticated using (true);
create policy "public read" on public.rest_spots for select to anon, authenticated using (true);
create policy "public read" on public.game_quests for select to anon, authenticated using (true);

-- Characters: full control of your own.
create policy "manage own characters" on public.characters
  for all to authenticated
  using (profile_id = (select auth.uid()))
  with check (profile_id = (select auth.uid()));

-- Plan requests: read your own (for the quota pill). Only the server writes.
create policy "read own plan requests" on public.plan_requests
  for select to authenticated using (profile_id = (select auth.uid()));

-- Session plans: read and delete your own. Only the server creates them, so
-- nobody can publish arbitrary text under a share link.
create policy "read own plans" on public.session_plans
  for select to authenticated using (profile_id = (select auth.uid()));
create policy "delete own plans" on public.session_plans
  for delete to authenticated using (profile_id = (select auth.uid()));

-- Feedback: manage feedback on your own plans.
create policy "manage own feedback" on public.plan_feedback
  for all to authenticated
  using (exists (
    select 1 from public.session_plans sp
    where sp.id = session_plan_id and sp.profile_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.session_plans sp
    where sp.id = session_plan_id and sp.profile_id = (select auth.uid())
  ));

-- ---------------------------------------------------------------------------
-- Functions
-- ---------------------------------------------------------------------------

-- Atomically check the rate limit and free quota, then record a pending
-- request. Called by the server (secret key) only, so callers can't pass
-- their own limits. Locking the profile row serializes concurrent requests
-- from the same account, so two quick clicks can't both slip under the quota.
--
-- Raises 'rate_limited' or 'quota_exceeded' (SQLSTATE P0001) on refusal.
create function public.reserve_plan_request(
  p_profile_id uuid,
  p_free_limit int,
  p_min_interval interval default interval '10 seconds'
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tier text;
  v_used int;
  v_id uuid;
begin
  select tier into v_tier from public.profiles where id = p_profile_id for update;
  if not found then
    raise exception 'profile_not_found';
  end if;

  if exists (
    select 1 from public.plan_requests
    where profile_id = p_profile_id and created_at > now() - p_min_interval
  ) then
    raise exception 'rate_limited';
  end if;

  if v_tier = 'free' then
    -- Failed requests don't count. Pending ones do while they're plausibly in
    -- flight, so parallel requests can't exceed the limit.
    select count(*) into v_used from public.plan_requests
    where profile_id = p_profile_id
      and created_at > now() - interval '7 days'
      and (status = 'succeeded'
        or (status = 'pending' and created_at > now() - interval '5 minutes'));

    if v_used >= p_free_limit then
      raise exception 'quota_exceeded';
    end if;
  end if;

  insert into public.plan_requests (profile_id) values (p_profile_id) returning id into v_id;
  return v_id;
end;
$$;

revoke execute on function public.reserve_plan_request(uuid, int, interval) from public, anon, authenticated;
grant execute on function public.reserve_plan_request(uuid, int, interval) to service_role;

-- The public, read-only view of a shared plan. Returns only the character's
-- name, class and level alongside the plan itself.
create function public.get_shared_plan(p_share_id text)
returns table (
  character_name text,
  character_class text,
  character_level int,
  minutes int,
  goal text,
  plan jsonb,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select c.name, c.class, c.level, sp.minutes, sp.goal, sp.plan, sp.created_at
  from public.session_plans sp
  join public.characters c on c.id = sp.character_id
  where sp.share_id = p_share_id;
$$;

revoke execute on function public.get_shared_plan(text) from public;
grant execute on function public.get_shared_plan(text) to anon, authenticated;
