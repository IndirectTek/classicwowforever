// Reads every data/zones/*.json file, validates each one, then checks the
// rules that span files (unique ids, neighbors that exist). Returns rows
// shaped like the database tables, ready to sync or seed.
import { readdirSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";
import { ZoneFile } from "./schema";

export type GameData = {
  zones: {
    id: string;
    name: string;
    min_level: number;
    max_level: number;
    faction: string;
    kind: string;
    verified: boolean;
    source: string;
  }[];
  links: { zone_a: string; zone_b: string }[];
  restSpots: {
    id: string;
    zone_id: string;
    name: string;
    kind: string;
    faction: string;
    verified: boolean;
    source: string;
  }[];
  quests: {
    id: string;
    name: string;
    zone_id: string;
    min_level: number;
    max_level: number;
    faction: string;
    kind: string;
    est_minutes: number | null;
    notes: string | null;
    verified: boolean;
    source: string;
  }[];
};

export type LoadResult = { data: GameData; errors: string[] };

export function loadGameData(dir: string): LoadResult {
  const errors: string[] = [];
  const files: { file: string; zone: ZoneFile }[] = [];
  // Ids of zones whose files exist, even invalid ones, so one broken file
  // doesn't also make every zone next to it report a missing neighbor.
  const zoneIds = new Set<string>();

  for (const name of readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .sort()) {
    const file = join("data/zones", name);
    let raw: unknown;
    try {
      raw = JSON.parse(readFileSync(join(dir, name), "utf8"));
    } catch (error) {
      errors.push(`${file}: not valid JSON (${(error as Error).message})`);
      continue;
    }
    const rawId = (raw as { id?: unknown })?.id;
    if (typeof rawId === "string") zoneIds.add(rawId);
    const parsed = ZoneFile.safeParse(raw);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        errors.push(`${file}: ${issue.path.join(".") || "(file)"}: ${issue.message}`);
      }
      continue;
    }
    if (basename(name, ".json") !== parsed.data.id) {
      errors.push(`${file}: file name must match the zone id ("${parsed.data.id}.json")`);
    }
    files.push({ file, zone: parsed.data });
  }

  const seen = {
    zone: new Map<string, string>(),
    spot: new Map<string, string>(),
    quest: new Map<string, string>(),
  };
  const unique = (kind: keyof typeof seen, id: string, file: string) => {
    const first = seen[kind].get(id);
    if (first) errors.push(`${file}: ${kind} id "${id}" is already used in ${first}`);
    else seen[kind].set(id, file);
  };

  const data: GameData = { zones: [], links: [], restSpots: [], quests: [] };
  const linkKeys = new Set<string>();

  for (const { file, zone } of files) {
    unique("zone", zone.id, file);
    data.zones.push({
      id: zone.id,
      name: zone.name,
      min_level: zone.levels[0],
      max_level: zone.levels[1],
      faction: zone.faction,
      kind: zone.kind,
      verified: zone.verified,
      source: zone.source,
    });

    for (const neighbor of zone.neighbors) {
      if (neighbor === zone.id) errors.push(`${file}: a zone can't be its own neighbor`);
      else if (!zoneIds.has(neighbor)) errors.push(`${file}: neighbor "${neighbor}" has no file`);
      else {
        // Stored once per pair, alphabetically (zone_links check constraint).
        const [zone_a, zone_b] = [zone.id, neighbor].sort();
        const key = `${zone_a}|${zone_b}`;
        if (!linkKeys.has(key)) {
          linkKeys.add(key);
          data.links.push({ zone_a, zone_b });
        }
      }
    }

    for (const spot of zone.restSpots) {
      unique("spot", spot.id, file);
      data.restSpots.push({
        id: spot.id,
        zone_id: zone.id,
        name: spot.name,
        kind: spot.kind,
        faction: spot.faction,
        verified: spot.verified,
        source: spot.source,
      });
    }

    for (const quest of zone.quests) {
      unique("quest", quest.id, file);
      if (!quest.id.startsWith(`${zone.id}-`)) {
        errors.push(`${file}: quest id "${quest.id}" should start with "${zone.id}-"`);
      }
      data.quests.push({
        id: quest.id,
        name: quest.name,
        zone_id: zone.id,
        min_level: quest.levels[0],
        max_level: quest.levels[1],
        faction: quest.faction,
        kind: quest.kind,
        est_minutes: quest.estMinutes ?? null,
        notes: quest.notes ?? null,
        verified: quest.verified,
        source: quest.source,
      });
    }
  }

  data.links.sort((a, b) => `${a.zone_a}|${a.zone_b}`.localeCompare(`${b.zone_a}|${b.zone_b}`));
  return { data, errors };
}
