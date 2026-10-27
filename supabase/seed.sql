-- GENERATED from data/zones/*.json by `pnpm data:generate`. Do not edit by hand:
-- change the data files and regenerate. Applied by `supabase start` and
-- `supabase db reset` for local development.

insert into public.game_zones (id, name, min_level, max_level, faction, kind, verified, source) values
  ('darkshore', 'Darkshore', 10, 20, 'alliance', 'zone', false, 'draft-2026-10-26'),
  ('darnassus', 'Darnassus', 1, 60, 'alliance', 'city', false, 'draft-2026-10-26'),
  ('dun-morogh', 'Dun Morogh', 1, 10, 'alliance', 'zone', false, 'draft-2026-10-26'),
  ('durotar', 'Durotar', 1, 10, 'horde', 'zone', false, 'draft-2026-10-26'),
  ('duskwood', 'Duskwood', 18, 30, 'alliance', 'zone', false, 'draft-2026-10-26'),
  ('elwynn-forest', 'Elwynn Forest', 1, 10, 'alliance', 'zone', false, 'draft-2026-10-26'),
  ('ironforge', 'Ironforge', 1, 60, 'alliance', 'city', false, 'draft-2026-10-26'),
  ('loch-modan', 'Loch Modan', 10, 20, 'alliance', 'zone', false, 'draft-2026-10-26'),
  ('mulgore', 'Mulgore', 1, 10, 'horde', 'zone', false, 'draft-2026-10-26'),
  ('orgrimmar', 'Orgrimmar', 1, 60, 'horde', 'city', false, 'draft-2026-10-26'),
  ('redridge-mountains', 'Redridge Mountains', 15, 25, 'alliance', 'zone', false, 'draft-2026-10-26'),
  ('silverpine-forest', 'Silverpine Forest', 10, 20, 'horde', 'zone', false, 'draft-2026-10-26'),
  ('stormwind-city', 'Stormwind City', 1, 60, 'alliance', 'city', false, 'draft-2026-10-26'),
  ('teldrassil', 'Teldrassil', 1, 10, 'alliance', 'zone', false, 'draft-2026-10-26'),
  ('the-barrens', 'The Barrens', 10, 25, 'horde', 'zone', false, 'draft-2026-10-26'),
  ('thunder-bluff', 'Thunder Bluff', 1, 60, 'horde', 'city', false, 'draft-2026-10-26'),
  ('tirisfal-glades', 'Tirisfal Glades', 1, 10, 'horde', 'zone', false, 'draft-2026-10-26'),
  ('undercity', 'Undercity', 1, 60, 'horde', 'city', false, 'draft-2026-10-26'),
  ('westfall', 'Westfall', 10, 20, 'alliance', 'zone', false, 'draft-2026-10-26');

insert into public.zone_links (zone_a, zone_b) values
  ('darkshore', 'teldrassil'),
  ('darnassus', 'teldrassil'),
  ('dun-morogh', 'ironforge'),
  ('dun-morogh', 'loch-modan'),
  ('durotar', 'orgrimmar'),
  ('durotar', 'the-barrens'),
  ('duskwood', 'elwynn-forest'),
  ('duskwood', 'redridge-mountains'),
  ('duskwood', 'westfall'),
  ('elwynn-forest', 'redridge-mountains'),
  ('elwynn-forest', 'stormwind-city'),
  ('elwynn-forest', 'westfall'),
  ('mulgore', 'the-barrens'),
  ('mulgore', 'thunder-bluff'),
  ('silverpine-forest', 'tirisfal-glades'),
  ('tirisfal-glades', 'undercity');

insert into public.rest_spots (id, zone_id, name, kind, faction, verified, source) values
  ('auberdine-inn', 'darkshore', 'The inn at Auberdine', 'inn', 'alliance', false, 'draft-2026-10-26'),
  ('darnassus', 'darnassus', 'Darnassus', 'city', 'alliance', false, 'draft-2026-10-26'),
  ('kharanos-inn', 'dun-morogh', 'Thunderbrew Distillery, Kharanos', 'inn', 'alliance', false, 'draft-2026-10-26'),
  ('razor-hill-inn', 'durotar', 'The inn at Razor Hill', 'inn', 'horde', false, 'draft-2026-10-26'),
  ('darkshire-inn', 'duskwood', 'Scarlet Raven Tavern, Darkshire', 'inn', 'alliance', false, 'draft-2026-10-26'),
  ('goldshire-inn', 'elwynn-forest', 'Lion''s Pride Inn, Goldshire', 'inn', 'alliance', false, 'draft-2026-10-26'),
  ('ironforge', 'ironforge', 'Ironforge', 'city', 'alliance', false, 'draft-2026-10-26'),
  ('thelsamar-inn', 'loch-modan', 'Stoutlager Inn, Thelsamar', 'inn', 'alliance', false, 'draft-2026-10-26'),
  ('bloodhoof-inn', 'mulgore', 'The inn at Bloodhoof Village', 'inn', 'horde', false, 'draft-2026-10-26'),
  ('orgrimmar', 'orgrimmar', 'Orgrimmar', 'city', 'horde', false, 'draft-2026-10-26'),
  ('lakeshire-inn', 'redridge-mountains', 'Lakeshire Inn', 'inn', 'alliance', false, 'draft-2026-10-26'),
  ('sepulcher-inn', 'silverpine-forest', 'The inn at the Sepulcher', 'inn', 'horde', false, 'draft-2026-10-26'),
  ('stormwind-city', 'stormwind-city', 'Stormwind City', 'city', 'alliance', false, 'draft-2026-10-26'),
  ('dolanaar-inn', 'teldrassil', 'The inn at Dolanaar', 'inn', 'alliance', false, 'draft-2026-10-26'),
  ('crossroads-inn', 'the-barrens', 'The inn at the Crossroads', 'inn', 'horde', false, 'draft-2026-10-26'),
  ('thunder-bluff', 'thunder-bluff', 'Thunder Bluff', 'city', 'horde', false, 'draft-2026-10-26'),
  ('brill-inn', 'tirisfal-glades', 'Gallows'' End Tavern, Brill', 'inn', 'horde', false, 'draft-2026-10-26'),
  ('undercity', 'undercity', 'Undercity', 'city', 'horde', false, 'draft-2026-10-26');

-- (no rows for game_quests yet)
