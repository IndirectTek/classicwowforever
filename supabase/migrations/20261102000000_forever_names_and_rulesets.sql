-- WoW Forever changes two things about characters:
--
-- * Characters have a first and a last name, unique as a pair within a region.
--   `name` holds the full name ("Aldric Stonebrow"): each part is 2 to 12
--   letters, so up to 25 characters with the space. Keeping one column means
--   every page that shows a name (cards, plans, shared links, preview images)
--   keeps working unchanged. The parts are checked in lib/characters.ts.
-- * There are no realms. Players pick a ruleset instead, so `ruleset` replaces
--   the free-text realm. `realm` stays for now because the code deployed before
--   this migration still reads it; drop it in a later migration.

alter table public.characters drop constraint characters_name_check;
alter table public.characters
  add constraint characters_name_check check (length(name) between 2 and 25);

alter table public.characters
  add column ruleset text check (ruleset in ('normal', 'pvp', 'roleplay'));
