// Turns players' quest reports into data/zones/*.json entries, for
// `pnpm reports apply`. A keeper reviews the resulting diff in a pull
// request like any other data change. Relative imports only (used by
// scripts/reports.mts outside Next.js).
import { questId } from "../reports";
import { QuestEntry, type ZoneFile } from "./schema";

export type ReportRow = {
  id: string;
  kind: "new" | "correction";
  quest_id: string | null;
  game: "forever" | "classic-era";
  name: string;
  zone_id: string;
  min_level: number;
  max_level: number;
  faction: "alliance" | "horde" | "both";
  est_minutes: number | null;
  notes: string | null;
  seen_on: string;
  credit_name: string | null;
  created_at: string;
};

// Always unverified: "verified" means a keeper confirmed it in WoW Forever.
export function questEntryFromReport(report: ReportRow): QuestEntry {
  return QuestEntry.parse({
    id: questId(report.zone_id, report.name),
    name: report.name.trim(),
    levels: [report.min_level, report.max_level],
    faction: report.faction,
    kind: "quest",
    ...(report.est_minutes ? { estMinutes: report.est_minutes } : {}),
    ...(report.notes ? { notes: report.notes } : {}),
    verified: false,
    source: `play-${report.seen_on}`,
    contributor: report.credit_name?.trim() || "community",
  });
}

export type ApplyResult = {
  // Zone id -> the zone file with the new quests added.
  zones: Map<string, ZoneFile>;
  applied: { report: ReportRow; entry: QuestEntry }[];
  // New-quest reports for a quest that's already in the files (or added
  // earlier in this run). Usually a keeper marks these "duplicate".
  duplicates: { report: ReportRow; existingId: string }[];
  // Reports for a zone with no file.
  unknownZone: ReportRow[];
};

// Adds every "new" report to its zone, oldest first, skipping quests that
// already exist. Corrections are left to a keeper to apply by hand.
export function applyNewQuestReports(
  zoneFiles: Map<string, ZoneFile>,
  reports: ReportRow[],
): ApplyResult {
  const zones = new Map<string, ZoneFile>();
  const known = new Set([...zoneFiles.values()].flatMap((z) => z.quests.map((q) => q.id)));
  const result: ApplyResult = { zones, applied: [], duplicates: [], unknownZone: [] };

  const sorted = reports
    .filter((r) => r.kind === "new")
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
  for (const report of sorted) {
    const zone = zones.get(report.zone_id) ?? zoneFiles.get(report.zone_id);
    if (!zone) {
      result.unknownZone.push(report);
      continue;
    }
    const entry = questEntryFromReport(report);
    if (known.has(entry.id)) {
      result.duplicates.push({ report, existingId: entry.id });
      continue;
    }
    known.add(entry.id);
    const quests = [...zone.quests, entry].sort(
      (a, b) => a.levels[0] - b.levels[0] || a.name.localeCompare(b.name),
    );
    zones.set(zone.id, { ...zone, quests });
    result.applied.push({ report, entry });
  }
  return result;
}
