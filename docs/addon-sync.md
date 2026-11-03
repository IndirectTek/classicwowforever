# Addon sync: getting game state onto the site

Status: design, not started. Owners: Lua (addon), Python (parser), front end (upload and auto-sync).
Target: phase 1 in the November 18 to December 8, 2026 window.

## Goal

After a play session, the site knows what changed (level, rested XP, gold, quest log, gear, what dropped
where) without the player typing anything. That powers better plans, session recaps, group sessions and,
over time, a gear and drop-source knowledge base that we own.

## The constraint everything follows from

**WoW addons have no network access.** The game runs addon Lua in a sandbox with no sockets or HTTP. The
only thing an addon can persist is its **SavedVariables**: Lua tables the game writes to disk, and only
when the player logs out, types `/reload`, or disconnects. Never during play.

So every design below is the same pipe:

```text
addon (in game) --writes on logout--> SavedVariables file on disk --> something outside the game reads it --> our API
```

The phases differ only in what that "something" is.

## Phases

| Phase | Who reads the file                                         | Automatic? | Install? | Build order |
| ----- | ---------------------------------------------------------- | ---------- | -------- | ----------- |
| 1     | The player, choosing the file on the site's import page    | No         | No       | First       |
| 2     | The site itself, watching the folder while the tab is open | Yes        | No       | Second      |
| 3     | A small companion app in the system tray                   | Yes        | Yes      | If wanted   |

Phase 1 settles the data format and the parser, which phases 2 and 3 reuse unchanged.

### Phase 1: addon and manual upload

- The addon records state into its SavedVariables (format below).
- The site gets an import page with a file picker, plus clear instructions for finding the file.
- `POST /api/imports` takes the raw file. The server parses it, matches characters, stores a snapshot, and
  shows the player what it understood.

### Phase 2: browser auto-sync (Chrome and Edge)

The [File System Access API](https://developer.mozilla.org/docs/Web/API/File_System_API) lets a page ask
once for access to a folder.

- The player clicks "Connect my WoW folder" and picks `WTF/Account/<ACCOUNT>/SavedVariables`.
- We keep the directory handle in IndexedDB. On later visits, `queryPermission()` / `requestPermission()`
  restores access; recent Chrome versions can remember the grant between visits.
- While the tab is open, poll the file's `lastModified` every 15 to 30 seconds. When it changes (a logout),
  upload it.
- Firefox and Safari don't support this. They keep the phase 1 upload.

The result: log out at the inn, and within a minute the site shows the session recap.

### Phase 3: companion app (optional)

A tray app for Windows and macOS. Tauri is a good fit: small, Rust core, web UI we already know how to
write.

- It watches the SavedVariables folder and uploads after each logout, with no browser tab needed.
- **Linking:** the app shows a short code; the player enters it at `/link` while signed in; the server
  issues a revocable token that can only create imports. Store it hashed; the player can revoke it from the
  site.
- **Two-way, optional:** the app can write tonight's plan into a separate helper addon's SavedVariables,
  which the game reads at the next login. The plan then shows up as an in-game checklist with no copy and
  paste. (TradeSkillMaster's desktop app uses the same pattern.) Only write that file while the game isn't
  running, because the game overwrites SavedVariables from memory at logout.
- **Costs:** code signing on both platforms, auto-update, and earning players' trust in an installed
  program. Open source helps.

## What the addon records

Keep it small and only about the player's own character. Everything here is readable through the normal
addon API; **volunteers must check each call against the WoW Forever client at launch**, since its API may
differ from Classic Era.

| Data                  | Likely API                                                                      | Used for                              |
| --------------------- | ------------------------------------------------------------------------------- | ------------------------------------- |
| Level, XP, rested XP  | `UnitLevel`, `UnitXP`, `UnitXPMax`, `GetXPExhaustion`                           | Planner context, rested tracking      |
| Gold                  | `GetMoney`                                                                      | Gold goals, recaps                    |
| Zone at logout        | `GetZoneText`, `GetSubZoneText`, `IsResting`                                    | Planner context, "logged out rested?" |
| Quest log             | `GetNumQuestLogEntries`, `GetQuestLogTitle`                                     | Plans built on what's in the log      |
| Equipped gear         | `GetInventoryItemLink("player", slot)` (the link includes the enchant id)       | Upgrade suggestions                   |
| Loot, with its source | `LOOT_OPENED` + `GetLootSourceInfo(slot)` (the GUID gives the NPC or object id) | Drop-source knowledge                 |
| Quests turned in      | `QUEST_TURNED_IN`                                                               | Session recap, quest data             |
| Session start/end     | `PLAYER_LOGIN`, `PLAYER_LOGOUT`, `time()`                                       | Session recap                         |

Not recorded, ever: chat, whispers, other players' names or GUIDs, anything about the player's friends or
guild.

### File format

One SavedVariables table, declared in the TOC as `## SavedVariables: ClassicWoWForeverDB`. Account-wide,
keyed by realm and character, so one file covers all of a player's characters:

```lua
ClassicWoWForeverDB = {
  schemaVersion = 1,
  addonVersion = "0.1.0",
  characters = {
    ["Forever-Realm:Aldric"] = {
      exportedAt = 1793100000,          -- time() at logout
      faction = "Alliance", race = "Human", class = "PALADIN",
      level = 12, xp = 4200, xpMax = 7600, restedXp = 3800,
      money = 18340,                    -- copper
      zone = "Elwynn Forest", subZone = "Goldshire", resting = true,
      quests = { { title = "...", level = 11, header = "Elwynn Forest", complete = false } },
      equipped = { [16] = "item:2488:0:0:0" },   -- slot -> item string (id:enchant:...)
      events = {                        -- ring buffer, newest last, capped (see below)
        { t = 1793096000, kind = "loot", itemId = 2488, source = "npc", sourceId = 1234, zone = "..." },
        { t = 1793097000, kind = "quest_turned_in", title = "..." },
      },
      sessions = { { start = 1793094000, finish = 1793100000 } },
    },
  },
}
```

- **Cap the event buffer** (for example, the last 500 events per character), so the file stays small. The
  server dedupes events it has already seen, so overlapping uploads are harmless.
- **Bump `schemaVersion`** on any breaking change; the parser supports the last two versions.

## Server side

- **Parser:** Python, as planned (`api/parse_import.py` on Vercel's Python runtime, MIT licensed). It turns
  SavedVariables Lua into JSON using a safe, data-only Lua table parser; it must never execute the file.
  Reject files over 2 MB.
- **`POST /api/imports`:** authenticated by the session cookie (phases 1 and 2) or a device token
  (phase 3).
  - Idempotent by a hash of the file content.
  - The raw file goes to Supabase Storage for 30 days, so we can debug and re-parse.
  - The parsed result goes to new tables (sketch):
    - `character_snapshots`: the latest state per character
    - `import_events`: deduped by character, time and kind
    - `loot_reports`: item, source, zone and the reporting account
- **Matching characters:** by name and realm. If there's no match, offer "add this character" rather than
  guessing.
- **The planner** uses the latest snapshot instead of the manually entered level and zone, and shows
  "updated 2 hours ago".

## Community data from loot

This is how drop sources become ours without anyone filing a report.

- **Opt in per character:** "Share my loot to improve drop data." Off until the player turns it on, and
  explained in plain words.
- **Corroboration:** only count each item and source pair once per account. Treat a drop as known once at
  least 3 separate accounts have reported it, and show "seen by N players" on the site.
- **Promotion to `data/`:** a scheduled job opens a pull request adding newly corroborated drops to the
  reviewed data files, with provenance (`source: play-<date>`, contributor "community, N players"). A data
  keeper merges it. Raw reports never skip review.
- **Abuse:** per-account rate limits on imports, events far outside a character's level ignored, and
  outliers flagged for review instead of counted.

## Privacy and policy

- **Blizzard's addon policy:** the addon is free and readable, with no ads, links or donation requests in
  game.
- **Only the addon's own file.** Nothing reads game memory, automates play or injects anything. Companion
  apps that read SavedVariables files are common; anything beyond that risks players' accounts.
- **Players can see and delete it.** The site shows exactly what each import contained, and players can
  delete imports. Deleting a character deletes its snapshots and events.
- **Update the privacy page** before phase 1 ships, to describe imports and loot sharing.
- **Not Blizzard API data.** This pipeline doesn't touch the Blizzard developer APIs, whose terms rule out
  permanent storage, redistribution and paid features (see `docs/plan-changes.md`).

## Open questions

- WoW Forever's install folder name and interface version, for the TOC (check at launch).
- Which Classic Era APIs and events exist unchanged in the Forever client (`GetLootSourceInfo`, quest log
  functions, `ENCOUNTER_END` for boss kills).
- How many corroborating accounts are enough, and whether time estimates for quests (from turn-in times)
  should be inferred the same way.
- Whether to build phase 3 at all. Decide after phase 2 is in players' hands.

## First issues to open

1. `addon`: scaffold the addon with TOC, SavedVariables and level/XP/zone at logout.
2. `addon`: quest log and equipped gear capture.
3. `addon`: loot events with sources, using a capped ring buffer.
4. `python`: SavedVariables parser with fixtures and tests (no Lua execution).
5. `frontend`: import page with a file picker and a "here's what we found" review screen.
6. `backend`: `POST /api/imports`, the tables, and RLS.
7. `frontend`: phase 2 folder connect and auto-sync (Chrome and Edge).
