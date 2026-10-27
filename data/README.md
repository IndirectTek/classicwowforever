# Game data

The planner can only suggest quests that are listed here. One file per zone in
`zones/`, each with its neighboring zones, its inns, and its quests. This folder
is the source of truth: merged changes are copied into the database
automatically, and every change is reviewed in a pull request first.

**You don't need to code to help.** If JSON isn't your thing, use
[Report a quest](https://classicwowforever.dev/report) on the site, or open a
[Quest data issue](../../../issues/new?template=quest-data.yml), and a data
keeper will add it for you.

## The rules

- **Only what you saw yourself** in WoW Forever, or what official Blizzard patch
  notes say. Never copy from wikis, databases or other guide sites, even to fill
  a gap. That's what keeps this data ours to share.
- **Before launch, Classic Era play counts** as a `play-` source, but leave it
  `verified: false`: WoW Forever may change it.
- **Say where it came from.** Every entry has a `source`:
  - `play-YYYY-MM-DD`, the day you saw it, plus your display name in `contributor`
  - `patch-notes-YYYY-MM-DD`, the date of the notes
  - `draft-YYYY-MM-DD`, our best guess, waiting for someone to confirm in game
- **Set `verified: true`** once someone has confirmed the entry in game. When you
  confirm a draft, change its source to your `play-` date and add your name.
- **Times are for a typical player**, not a speedrunner. Round to 5 minutes.

Contributions are released under [CC BY-SA 4.0](LICENSE.txt).

## Adding a quest

Open the zone's file (for example `zones/elwynn-forest.json`) and add an entry to
`quests`:

```json
{
  "id": "elwynn-forest-the-lost-satchel",
  "name": "The Lost Satchel",
  "levels": [5, 7],
  "faction": "alliance",
  "estMinutes": 15,
  "notes": "Turn in at the Goldshire inn",
  "verified": true,
  "source": "play-2026-11-04",
  "contributor": "paul"
}
```

| Field        | What to put                                                                              |
| ------------ | ---------------------------------------------------------------------------------------- |
| `id`         | The zone id, a hyphen, then the quest name in lowercase with hyphens                     |
| `name`       | Exactly as the quest log shows it                                                        |
| `levels`     | `[lowest, highest]`: the level in your quest log, and the highest it's still worth doing |
| `faction`    | `alliance`, `horde` or `both`                                                            |
| `kind`       | Leave out for a quest; `"dungeon"` for a dungeon run                                     |
| `estMinutes` | Typical minutes to finish, travel included (optional)                                    |
| `notes`      | Short facts that help planning: rewards, group needed, where to turn in (optional)       |

Editors like VS Code autocomplete these fields and underline mistakes, thanks to
the `$schema` line at the top of each file.

## Checking your change

```sh
pnpm data:check                 # validates every file and lists any problems
pnpm data:sync --local          # shows what would change in your local database
pnpm data:sync --local --yes    # applies it, so you can try plans with it
```

CI runs `pnpm data:check` on every pull request too, so you can also just open the
PR and read the result.

## Reports from the site

Players' reports from `/report` wait in a queue in the database. Data keepers
turn them into a pull request:

```sh
pnpm reports --production                 # list reports waiting for review
pnpm reports apply --production           # add the new quests to zones/*.json
pnpm data:check                           # then review the diff and open a PR
pnpm reports close applied <id...> --production    # once the PR merges
pnpm reports close duplicate <id...> --production  # or rejected
```

`apply` adds each new quest once (later reports of the same quest are listed
as duplicates), always as `verified: false`, crediting the reporter's chosen
name or "community". Reports for a quest we already have are corrections: the
script lists them and you edit the entry by hand. Check names and levels
against your own play before merging; a report is a lead, not a fact.

## After merge

The "Sync game data" workflow copies `main` into the production database:
additions, changes, and quests or inns that were removed from the files. Zones
are never deleted automatically, because characters point at them. Maintainers
can run the same sync by hand with `pnpm data:sync --production`, which is a dry
run until you add `--yes`.

`supabase/seed.sql` is generated from these files (`pnpm data:generate`), so a
fresh local database starts with exactly this data.
