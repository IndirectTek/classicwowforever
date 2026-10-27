-- Milestone 1: launch waitlist.
--
-- RLS is on with no policies, so the public (anon/publishable) key can neither
-- read nor write this table. Only the server, using the secret key, inserts
-- rows. That keeps the email list private and forces every signup through the
-- validation in app/actions/waitlist.ts.

create table public.waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null unique check (email = lower(email) and length(email) <= 254),
  source text check (length(source) <= 64),
  created_at timestamptz not null default now()
);

alter table public.waitlist enable row level security;
