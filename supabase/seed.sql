-- Starter game data: the original starting zones, their neighbors, capitals,
-- and the inns where characters log out rested.
--
-- Every row is verified = false. This is a draft of well known geography for
-- a data keeper to confirm in WoW Forever, which may change zones and towns.
-- Flip verified to true (and set source to 'play-YYYY-MM-DD') as you confirm
-- each row in game. No quests are seeded: quest data comes from our own play.

insert into public.game_zones (id, name, min_level, max_level, faction, kind, source) values
  -- Alliance
  ('elwynn-forest',      'Elwynn Forest',      1, 10, 'alliance', 'zone', 'draft-2026-10-26'),
  ('dun-morogh',         'Dun Morogh',         1, 10, 'alliance', 'zone', 'draft-2026-10-26'),
  ('teldrassil',         'Teldrassil',         1, 10, 'alliance', 'zone', 'draft-2026-10-26'),
  ('westfall',           'Westfall',          10, 20, 'alliance', 'zone', 'draft-2026-10-26'),
  ('loch-modan',         'Loch Modan',        10, 20, 'alliance', 'zone', 'draft-2026-10-26'),
  ('darkshore',          'Darkshore',         10, 20, 'alliance', 'zone', 'draft-2026-10-26'),
  ('redridge-mountains', 'Redridge Mountains', 15, 25, 'alliance', 'zone', 'draft-2026-10-26'),
  ('duskwood',           'Duskwood',          18, 30, 'alliance', 'zone', 'draft-2026-10-26'),
  ('stormwind-city',     'Stormwind City',     1, 60, 'alliance', 'city', 'draft-2026-10-26'),
  ('ironforge',          'Ironforge',          1, 60, 'alliance', 'city', 'draft-2026-10-26'),
  ('darnassus',          'Darnassus',          1, 60, 'alliance', 'city', 'draft-2026-10-26'),
  -- Horde
  ('durotar',            'Durotar',            1, 10, 'horde', 'zone', 'draft-2026-10-26'),
  ('mulgore',            'Mulgore',            1, 10, 'horde', 'zone', 'draft-2026-10-26'),
  ('tirisfal-glades',    'Tirisfal Glades',    1, 10, 'horde', 'zone', 'draft-2026-10-26'),
  ('the-barrens',        'The Barrens',       10, 25, 'horde', 'zone', 'draft-2026-10-26'),
  ('silverpine-forest',  'Silverpine Forest', 10, 20, 'horde', 'zone', 'draft-2026-10-26'),
  ('orgrimmar',          'Orgrimmar',          1, 60, 'horde', 'city', 'draft-2026-10-26'),
  ('thunder-bluff',      'Thunder Bluff',      1, 60, 'horde', 'city', 'draft-2026-10-26'),
  ('undercity',          'Undercity',          1, 60, 'horde', 'city', 'draft-2026-10-26');

-- Pairs are stored once, alphabetically (zone_a < zone_b).
insert into public.zone_links (zone_a, zone_b) values
  ('elwynn-forest', 'stormwind-city'),
  ('elwynn-forest', 'westfall'),
  ('elwynn-forest', 'redridge-mountains'),
  ('duskwood', 'elwynn-forest'),
  ('duskwood', 'westfall'),
  ('duskwood', 'redridge-mountains'),
  ('dun-morogh', 'ironforge'),
  ('dun-morogh', 'loch-modan'),
  ('darnassus', 'teldrassil'),
  ('darkshore', 'teldrassil'),
  ('durotar', 'orgrimmar'),
  ('durotar', 'the-barrens'),
  ('mulgore', 'thunder-bluff'),
  ('mulgore', 'the-barrens'),
  ('tirisfal-glades', 'undercity'),
  ('silverpine-forest', 'tirisfal-glades');

insert into public.rest_spots (id, zone_id, name, kind, faction, source) values
  ('goldshire-inn',        'elwynn-forest',      'Lion''s Pride Inn, Goldshire',          'inn',  'alliance', 'draft-2026-10-26'),
  ('kharanos-inn',         'dun-morogh',         'Thunderbrew Distillery, Kharanos',      'inn',  'alliance', 'draft-2026-10-26'),
  ('dolanaar-inn',         'teldrassil',         'The inn at Dolanaar',                   'inn',  'alliance', 'draft-2026-10-26'),
  ('thelsamar-inn',        'loch-modan',         'Stoutlager Inn, Thelsamar',             'inn',  'alliance', 'draft-2026-10-26'),
  ('auberdine-inn',        'darkshore',          'The inn at Auberdine',                  'inn',  'alliance', 'draft-2026-10-26'),
  ('lakeshire-inn',        'redridge-mountains', 'Lakeshire Inn',                         'inn',  'alliance', 'draft-2026-10-26'),
  ('darkshire-inn',        'duskwood',           'Scarlet Raven Tavern, Darkshire',       'inn',  'alliance', 'draft-2026-10-26'),
  ('stormwind-city',       'stormwind-city',     'Stormwind City',                        'city', 'alliance', 'draft-2026-10-26'),
  ('ironforge',            'ironforge',          'Ironforge',                             'city', 'alliance', 'draft-2026-10-26'),
  ('darnassus',            'darnassus',          'Darnassus',                             'city', 'alliance', 'draft-2026-10-26'),
  ('razor-hill-inn',       'durotar',            'The inn at Razor Hill',                 'inn',  'horde',    'draft-2026-10-26'),
  ('bloodhoof-inn',        'mulgore',            'The inn at Bloodhoof Village',          'inn',  'horde',    'draft-2026-10-26'),
  ('brill-inn',            'tirisfal-glades',    'Gallows'' End Tavern, Brill',           'inn',  'horde',    'draft-2026-10-26'),
  ('crossroads-inn',       'the-barrens',        'The inn at the Crossroads',             'inn',  'horde',    'draft-2026-10-26'),
  ('sepulcher-inn',        'silverpine-forest',  'The inn at the Sepulcher',              'inn',  'horde',    'draft-2026-10-26'),
  ('orgrimmar',            'orgrimmar',          'Orgrimmar',                             'city', 'horde',    'draft-2026-10-26'),
  ('thunder-bluff',        'thunder-bluff',      'Thunder Bluff',                         'city', 'horde',    'draft-2026-10-26'),
  ('undercity',            'undercity',          'Undercity',                             'city', 'horde',    'draft-2026-10-26');
