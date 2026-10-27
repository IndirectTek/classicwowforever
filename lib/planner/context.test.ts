import { describe, expect, it } from "vitest";
import { buildPlanContext } from "./context";

const base = {
  character: { class: "warrior", race: "orc", level: 19, faction: "horde", zoneId: "the-barrens" },
  minutes: 120,
  goal: "dungeon" as const,
  candidates: [],
  restSpots: [],
  zoneNames: new Map([["the-barrens", "The Barrens"]]),
};

describe("buildPlanContext", () => {
  it("leaves group out of solo plans", () => {
    expect(JSON.parse(buildPlanContext(base))).not.toHaveProperty("group");
  });

  // The same shape the group scenarios in evals/scenarios.yaml use.
  it("adds the group's roles, gaps and dungeon", () => {
    const context = JSON.parse(
      buildPlanContext({
        ...base,
        group: {
          info: {
            members: [
              { class: "warrior", level: 19, role: "tank" },
              { class: "mage", level: 18, role: "dps" },
            ],
            missing: ["healer"],
            openSlots: 3,
            dungeon: { id: "d1", name: "A Dungeon" },
            noDungeonReason: null,
          },
          dungeon: {
            id: "d1",
            name: "A Dungeon",
            zone_id: "the-barrens",
            min_level: 17,
            max_level: 24,
            est_minutes: null,
          },
        },
      }),
    );
    expect(context.group).toEqual({
      members: [
        { class: "warrior", level: 19, role: "tank" },
        { class: "mage", level: 18, role: "dps" },
      ],
      missing: ["healer"],
      openSlots: 3,
      dungeon: { id: "d1", name: "A Dungeon", zone: "The Barrens", estMinutes: 60 },
    });
  });
});
