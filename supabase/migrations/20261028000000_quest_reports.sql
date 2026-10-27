-- Quest reports (Milestone 5, pulled forward for launch): players tell us
-- about quests they've played, and a data keeper reviews each one before it
-- reaches data/zones/*.json (`pnpm reports`). Reports never feed the planner
-- directly.
--
-- * kind is set by the server: 'correction' when the zone already has a
--   quest with that name (quest_id points at it), otherwise 'new'.
-- * game records where it was seen. Classic Era reports are useful drafts,
--   but WoW Forever may differ, so keepers confirm them there.
-- * credit_name is how the reporter wants to be credited in data/, which is
--   public (CC BY-SA). Never an email address.

create table public.quest_reports (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles on delete cascade,
  status text not null default 'new' check (status in ('new', 'applied', 'rejected', 'duplicate')),
  kind text not null check (kind in ('new', 'correction')),
  quest_id text references public.game_quests on delete set null,
  game text not null check (game in ('forever', 'classic-era')),
  name text not null check (length(name) between 2 and 100),
  zone_id text not null references public.game_zones,
  min_level int not null check (min_level between 1 and 60),
  max_level int not null check (max_level between 1 and 60),
  faction text not null check (faction in ('alliance', 'horde', 'both')),
  est_minutes int check (est_minutes between 1 and 240),
  notes text check (length(notes) <= 300),
  seen_on date not null,
  credit_name text check (length(credit_name) between 1 and 40),
  created_at timestamptz not null default now(),
  check (min_level <= max_level),
  check (kind = 'new' or quest_id is not null)
);

create index quest_reports_status_created_idx on public.quest_reports (status, created_at);
create index quest_reports_profile_created_idx on public.quest_reports (profile_id, created_at desc);

alter table public.quest_reports enable row level security;

-- Reporters see, add and withdraw their own reports. Only keepers (with the
-- secret key) change a report's status.
create policy "read own reports" on public.quest_reports
  for select to authenticated using (profile_id = (select auth.uid()));
create policy "add own reports" on public.quest_reports
  for insert to authenticated with check (profile_id = (select auth.uid()) and status = 'new');
create policy "withdraw own new reports" on public.quest_reports
  for delete to authenticated using (profile_id = (select auth.uid()) and status = 'new');
revoke update on public.quest_reports from anon, authenticated;

-- At most 40 reports a day per account, so a script can't flood the queue.
-- Raises 'report_limit' (SQLSTATE P0001). Like a Rails before_create
-- validation, but enforced by the database for every client.
create function public.limit_quest_reports()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform pg_advisory_xact_lock(hashtext(new.profile_id::text));
  if (
    select count(*) from public.quest_reports
    where profile_id = new.profile_id and created_at > now() - interval '1 day'
  ) >= 40 then
    raise exception 'report_limit';
  end if;
  if new.seen_on > current_date + 1 then
    raise exception 'seen_on_in_future';
  end if;
  return new;
end;
$$;

create trigger quest_reports_limit
  before insert on public.quest_reports
  for each row execute function public.limit_quest_reports();
