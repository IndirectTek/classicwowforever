import { describe, expect, it } from "vitest";
import { assignRoles, groupPlanFacts, pickDungeon, type Dungeon } from "./group";

describe("assignRoles", () => {
  it("finds a tank and a healer when the classes allow it", () => {
    const { roles, missing } = assignRoles([
      { class: "mage", level: 20 },
      { class: "warrior", level: 20 },
      { class: "priest", level: 20 },
      { class: "rogue", level: 20 },
      { class: "hunter", level: 20 },
    ]);
    expect(roles).toEqual(["dps", "tank", "healer", "dps", "dps"]);
    expect(missing).toEqual([]);
  });

  it("uses hybrids to fill gaps", () => {
    // Two druids: one tanks, one heals.
    expect(
      assignRoles([
        { class: "druid", level: 20 },
        { class: "druid", level: 20 },
        { class: "mage", level: 20 },
      ]).roles.sort(),
    ).toEqual(["dps", "healer", "tank"]);
  });

  it("respects preferences when it can", () => {
    const { roles } = assignRoles([
      { class: "paladin", level: 20, prefers: "tank" },
      { class: "shaman", level: 20 },
      { class: "rogue", level: 20 },
    ]);
    expect(roles).toEqual(["tank", "healer", "dps"]);
  });

  it("reports what nobody can cover", () => {
    expect(
      assignRoles([
        { class: "mage", level: 20 },
        { class: "rogue", level: 20 },
        { class: "warrior", level: 20 },
      ]).missing,
    ).toEqual(["healer"]);
    expect(assignRoles([{ class: "hunter", level: 20 }]).missing).toEqual(["tank", "healer"]);
  });
});

const dungeons: Dungeon[] = [
  { id: "rfc", name: "Low Dungeon", zone_id: "a", min_level: 13, max_level: 18, est_minutes: 30 },
  { id: "dm", name: "Mid Dungeon", zone_id: "b", min_level: 17, max_level: 26, est_minutes: 60 },
  { id: "sfk", name: "High Dungeon", zone_id: "c", min_level: 22, max_level: 30, est_minutes: 50 },
];

describe("pickDungeon", () => {
  it("picks the dungeon closest to the group's level", () => {
    expect(pickDungeon(dungeons, [15, 16, 14], 120).dungeon?.id).toBe("rfc");
    expect(pickDungeon(dungeons, [20, 22, 21], 120).dungeon?.id).toBe("dm");
    expect(pickDungeon(dungeons, [26, 27, 25], 120).dungeon?.id).toBe("sfk");
  });

  it("prefers a nearby dungeon over a slightly better fit far away", () => {
    const from = {
      zoneId: "westfall",
      faction: "alliance" as const,
      zoneFactions: new Map([
        ["westfall", "alliance"],
        ["the-barrens", "horde"],
      ]),
    };
    const choices: Dungeon[] = [
      { ...dungeons[1], id: "wc", zone_id: "the-barrens", min_level: 17, max_level: 24 },
      { ...dungeons[1], id: "dm", zone_id: "westfall", min_level: 17, max_level: 26 },
    ];
    // Level 20 sits closer to the middle of 17-24, but that's Horde land.
    expect(pickDungeon(choices, [20, 21, 19], 120).dungeon?.id).toBe("wc");
    expect(pickDungeon(choices, [20, 21, 19], 120, from).dungeon?.id).toBe("dm");
  });

  it("leaves out dungeons someone is too low for", () => {
    // The level 12 can't keep up in the level 22 dungeon.
    expect(pickDungeon(dungeons.slice(2), [12, 25, 25], 120)).toEqual({
      dungeon: null,
      reason: "levels",
    });
  });

  it("needs time for the run plus forming up", () => {
    expect(pickDungeon(dungeons.slice(0, 2), [20, 21], 75)).toEqual({
      dungeon: null,
      reason: "time",
    });
    expect(pickDungeon(dungeons.slice(0, 2), [20, 21], 85)).toEqual({
      dungeon: null,
      reason: "time",
    });
    // 90 minutes leaves an 81 minute budget: 60 for the run, 20 around it.
    expect(pickDungeon(dungeons.slice(0, 2), [20, 21], 90).dungeon?.id).toBe("dm");
  });

  it("says when there's nothing to pick from", () => {
    expect(pickDungeon([], [20], 120).reason).toBe("no-dungeons");
  });
});

describe("groupPlanFacts", () => {
  it("adds the dungeon, roles, gaps and open slots", () => {
    const { info, dungeon } = groupPlanFacts(
      { class: "warrior", level: 20 },
      [
        { class: "mage", level: 21 },
        { class: "rogue", level: 19 },
      ],
      { wantsDungeon: true, dungeons, minutes: 120 },
    );
    expect(dungeon?.id).toBe("dm");
    expect(info).toEqual({
      members: [
        { class: "warrior", level: 20, role: "tank" },
        { class: "mage", level: 21, role: "dps" },
        { class: "rogue", level: 19, role: "dps" },
      ],
      missing: ["healer"],
      openSlots: 2,
      dungeon: { id: "dm", name: "Mid Dungeon" },
      noDungeonReason: null,
    });
  });

  it("doesn't nag a questing duo about tanks and healers", () => {
    const { info } = groupPlanFacts(
      { class: "hunter", level: 12 },
      [{ class: "mage", level: 12 }],
      { wantsDungeon: false, dungeons, minutes: 60 },
    );
    expect(info.missing).toEqual([]);
    expect(info.noDungeonReason).toBeNull();
  });

  it("explains when a wanted dungeon doesn't fit", () => {
    const { info } = groupPlanFacts({ class: "priest", level: 8 }, [{ class: "rogue", level: 8 }], {
      wantsDungeon: true,
      dungeons,
      minutes: 120,
    });
    expect(info.dungeon).toBeNull();
    expect(info.noDungeonReason).toBe("levels");
  });
});
