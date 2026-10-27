import { describe, expect, it } from "vitest";
import type { ModelPlan } from "@/lib/schema";
import { buildPlanContext } from "./context";
import { finalizePlan, fitMinutes, stepBudget, trim } from "./finalize";

const ctx = {
  minutes: 60,
  candidates: [
    { id: "q-1", name: "Quest One" },
    { id: "q-2", name: "Quest Two" },
  ],
  restSpots: [
    { id: "goldshire-inn", name: "Lion's Pride Inn, Goldshire", zone_id: "elwynn-forest" },
    { id: "stormwind-city", name: "Stormwind City", zone_id: "stormwind-city" },
  ],
  characterZoneId: "elwynn-forest",
};

const model: ModelPlan = {
  summary: "A good hour.",
  steps: [
    { action: "Do quest one", minutes: 20, questIds: ["q-1", "q-1"] },
    { action: "Do a made-up quest", minutes: 20, questIds: ["q-999", "q-2"] },
  ],
  logoutSpotId: "stormwind-city",
  why: "Short travel.",
};

describe("finalizePlan", () => {
  it("resolves quest ids to names, dropping unknown and duplicate ids", () => {
    const plan = finalizePlan(model, ctx);
    expect(plan.steps[0].quests).toEqual([{ id: "q-1", name: "Quest One" }]);
    expect(plan.steps[1].quests).toEqual([{ id: "q-2", name: "Quest Two" }]);
  });

  it("keeps a known logout spot", () => {
    expect(finalizePlan(model, ctx).logoutSpot).toEqual({
      id: "stormwind-city",
      name: "Stormwind City",
    });
  });

  it("replaces an unknown logout spot with one in the character's zone", () => {
    const plan = finalizePlan({ ...model, logoutSpotId: "made-up-inn" }, ctx);
    expect(plan.logoutSpot.id).toBe("goldshire-inn");
  });

  it("says something sensible when there are no rest spots at all", () => {
    const plan = finalizePlan({ ...model, logoutSpotId: "x" }, { ...ctx, restSpots: [] });
    expect(plan.logoutSpot).toEqual({ id: null, name: "the nearest inn or city" });
  });

  it("caps the plan at 8 steps and fits the minutes, with slack", () => {
    const many = Array.from({ length: 12 }, () => ({ action: "x", minutes: 10, questIds: [] }));
    const plan = finalizePlan({ ...model, steps: many }, ctx);
    expect(plan.steps).toHaveLength(8);
    expect(plan.steps.reduce((s, x) => s + x.minutes, 0)).toBeLessThanOrEqual(54);
  });

  it("leaves slack even when the model fills the whole session", () => {
    const full = [
      { action: "a", minutes: 30, questIds: [] },
      { action: "b", minutes: 30, questIds: [] },
    ];
    const plan = finalizePlan({ ...model, steps: full }, ctx);
    expect(plan.steps.reduce((s, x) => s + x.minutes, 0)).toBeLessThanOrEqual(54);
  });
});

describe("stepBudget", () => {
  it("keeps about 10% for travel and logout, at least 3 minutes", () => {
    expect(stepBudget(60)).toBe(54);
    expect(stepBudget(120)).toBe(108);
    expect(stepBudget(20)).toBe(17);
  });
});

describe("fitMinutes", () => {
  it("leaves plans that already fit alone", () => {
    const steps = [{ minutes: 20 }, { minutes: 30 }];
    expect(fitMinutes(steps, 60)).toBe(steps);
  });

  it("scales an over-long plan down to the available time", () => {
    const fitted = fitMinutes([{ minutes: 40 }, { minutes: 40 }, { minutes: 40 }], 90);
    expect(fitted.reduce((s, x) => s + x.minutes, 0)).toBeLessThanOrEqual(90);
    expect(fitted.every((x) => x.minutes >= 1)).toBe(true);
  });
});

describe("trim", () => {
  it("cuts at a word boundary with an ellipsis", () => {
    expect(trim("one two three four", 12)).toBe("one two…");
    expect(trim("  short  ", 20)).toBe("short");
  });
});

describe("buildPlanContext", () => {
  it("matches the shape the system prompt describes", () => {
    const json = JSON.parse(
      buildPlanContext({
        character: {
          class: "warrior",
          race: "human",
          level: 6,
          faction: "alliance",
          zoneId: "elwynn-forest",
        },
        minutes: 60,
        goal: "xp",
        candidates: [
          {
            id: "q-1",
            name: "Quest One",
            zone_id: "elwynn-forest",
            min_level: 5,
            max_level: 7,
            kind: "quest",
            est_minutes: 15,
            notes: null,
          },
        ],
        restSpots: [
          { id: "goldshire-inn", name: "Lion's Pride Inn", zone_id: "elwynn-forest", kind: "inn" },
        ],
        zoneNames: new Map([["elwynn-forest", "Elwynn Forest"]]),
      }),
    );
    expect(json.character.zone).toBe("Elwynn Forest");
    expect(json.candidates[0]).toEqual({
      id: "q-1",
      name: "Quest One",
      zone: "Elwynn Forest",
      levels: [5, 7],
      estMinutes: 15,
    });
    expect(json.restSpots[0]).toEqual({
      id: "goldshire-inn",
      name: "Lion's Pride Inn",
      zone: "Elwynn Forest",
    });
  });
});
