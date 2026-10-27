import { describe, expect, it } from "vitest";
import { applyNewQuestReports, questEntryFromReport, type ReportRow } from "./fromReports";
import { ZoneFile } from "./schema";

const zone = ZoneFile.parse({
  id: "elwynn-forest",
  name: "Elwynn Forest",
  levels: [1, 10],
  faction: "alliance",
  kind: "zone",
  verified: false,
  source: "draft-2026-10-26",
  neighbors: [],
  restSpots: [],
  quests: [
    {
      id: "elwynn-forest-a-quest-we-have",
      name: "A Quest We Have",
      levels: [3, 6],
      faction: "alliance",
      verified: true,
      source: "play-2026-10-20",
      contributor: "Keeper",
    },
  ],
});

let n = 0;
function report(overrides: Partial<ReportRow> = {}): ReportRow {
  n += 1;
  return {
    id: `0000000${n}-0000-0000-0000-000000000000`,
    kind: "new",
    quest_id: null,
    game: "classic-era",
    name: "A Fresh Quest",
    zone_id: "elwynn-forest",
    min_level: 2,
    max_level: 5,
    faction: "alliance",
    est_minutes: null,
    notes: null,
    seen_on: "2026-10-27",
    credit_name: null,
    created_at: `2026-10-27T10:00:0${n % 10}Z`,
    ...overrides,
  };
}

describe("questEntryFromReport", () => {
  it("makes an unverified, credited entry from play", () => {
    const entry = questEntryFromReport(
      report({ est_minutes: 12, notes: "Starts at the abbey.", credit_name: "Aldric" }),
    );
    expect(entry).toEqual({
      id: "elwynn-forest-a-fresh-quest",
      name: "A Fresh Quest",
      levels: [2, 5],
      faction: "alliance",
      kind: "quest",
      estMinutes: 12,
      notes: "Starts at the abbey.",
      verified: false,
      source: "play-2026-10-27",
      contributor: "Aldric",
    });
  });

  it("credits the community when no name is given", () => {
    expect(questEntryFromReport(report()).contributor).toBe("community");
  });
});

describe("applyNewQuestReports", () => {
  const files = new Map([[zone.id, zone]]);

  it("adds new quests in level order and keeps the existing ones", () => {
    const result = applyNewQuestReports(files, [
      report({ name: "Later Quest", min_level: 8, max_level: 10 }),
      report({ name: "Early Quest", min_level: 1, max_level: 3 }),
    ]);
    const quests = result.zones.get("elwynn-forest")!.quests.map((q) => q.id);
    expect(quests).toEqual([
      "elwynn-forest-early-quest",
      "elwynn-forest-a-quest-we-have",
      "elwynn-forest-later-quest",
    ]);
    expect(result.applied).toHaveLength(2);
    // The input map is never changed.
    expect(zone.quests).toHaveLength(1);
  });

  it("treats a second report of the same quest as a duplicate", () => {
    const result = applyNewQuestReports(files, [
      report({ name: "Twice Reported" }),
      report({ name: "twice reported" }),
      report({ name: "A Quest We Have" }),
    ]);
    expect(result.applied).toHaveLength(1);
    expect(result.duplicates.map((d) => d.existingId)).toEqual([
      "elwynn-forest-twice-reported",
      "elwynn-forest-a-quest-we-have",
    ]);
  });

  it("leaves corrections and unknown zones alone", () => {
    const result = applyNewQuestReports(files, [
      report({ kind: "correction", quest_id: "elwynn-forest-a-quest-we-have" }),
      report({ zone_id: "stranglethorn-vale" }),
    ]);
    expect(result.zones.size).toBe(0);
    expect(result.unknownZone).toHaveLength(1);
  });
});
