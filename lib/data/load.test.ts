import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { loadGameData } from "./load";

const zone = (overrides: object = {}) => ({
  id: "elwynn-forest",
  name: "Elwynn Forest",
  levels: [1, 10],
  faction: "alliance",
  kind: "zone",
  verified: false,
  source: "draft-2026-10-26",
  neighbors: [],
  restSpots: [],
  quests: [],
  ...overrides,
});

const quest = (overrides: object = {}) => ({
  id: "elwynn-forest-the-lost-satchel",
  name: "The Lost Satchel",
  levels: [5, 7],
  faction: "alliance",
  verified: true,
  source: "play-2026-11-04",
  contributor: "paul",
  ...overrides,
});

function load(files: Record<string, object | string>) {
  const dir = mkdtempSync(join(tmpdir(), "cwf-data-"));
  for (const [name, body] of Object.entries(files)) {
    writeFileSync(join(dir, name), typeof body === "string" ? body : JSON.stringify(body));
  }
  return loadGameData(dir);
}

describe("the real data files", () => {
  it("are all valid", () => {
    const { data, errors } = loadGameData(join(process.cwd(), "data/zones"));
    expect(errors).toEqual([]);
    expect(data.zones.length).toBeGreaterThan(0);
  });
});

describe("loadGameData", () => {
  it("turns files into database rows", () => {
    const { data, errors } = load({
      "elwynn-forest.json": zone({ neighbors: ["westfall"], quests: [quest({ estMinutes: 15 })] }),
      "westfall.json": zone({
        id: "westfall",
        name: "Westfall",
        levels: [10, 20],
        neighbors: ["elwynn-forest"],
      }),
    });
    expect(errors).toEqual([]);
    expect(data.links).toEqual([{ zone_a: "elwynn-forest", zone_b: "westfall" }]);
    expect(data.quests[0]).toMatchObject({
      id: "elwynn-forest-the-lost-satchel",
      zone_id: "elwynn-forest",
      min_level: 5,
      max_level: 7,
      kind: "quest",
      est_minutes: 15,
      notes: null,
    });
  });

  it("reports a broken file once, not again from each of its neighbors", () => {
    const { errors } = load({
      "elwynn-forest.json": zone({ neighbors: ["westfall"], quests: [quest({ levels: [9, 5] })] }),
      "westfall.json": zone({ id: "westfall", name: "Westfall", neighbors: ["elwynn-forest"] }),
    });
    expect(errors).toHaveLength(1);
  });

  it.each([
    ["broken JSON", { "elwynn-forest.json": "{ nope" }, "not valid JSON"],
    ["a file named differently from its id", { "elwynn.json": zone() }, "file name must match"],
    [
      "an unknown neighbor",
      { "elwynn-forest.json": zone({ neighbors: ["atlantis"] }) },
      'neighbor "atlantis" has no file',
    ],
    [
      "levels out of order",
      { "elwynn-forest.json": zone({ quests: [quest({ levels: [9, 5] })] }) },
      "can't be above",
    ],
    [
      "a level above 60",
      { "elwynn-forest.json": zone({ quests: [quest({ levels: [5, 70] })] }) },
      "quests.0.levels.1",
    ],
    [
      "a wiki as a source",
      { "elwynn-forest.json": zone({ quests: [quest({ source: "wiki-2026-11-04" })] }) },
      "play-YYYY-MM-DD",
    ],
    [
      "play data without a contributor",
      { "elwynn-forest.json": zone({ quests: [quest({ contributor: undefined })] }) },
      "need a contributor",
    ],
    [
      "a quest id without the zone prefix",
      { "elwynn-forest.json": zone({ quests: [quest({ id: "the-lost-satchel" })] }) },
      'should start with "elwynn-forest-"',
    ],
    [
      "an unknown field (typo)",
      { "elwynn-forest.json": zone({ quests: [quest({ estMins: 15 })] }) },
      "estMins",
    ],
    [
      "a duplicate quest id",
      { "elwynn-forest.json": zone({ quests: [quest(), quest()] }) },
      'quest id "elwynn-forest-the-lost-satchel" is already used',
    ],
  ])("rejects %s", (_name, files, message) => {
    const { errors } = load(files as Record<string, object | string>);
    expect(errors.join("\n")).toContain(message);
  });
});
