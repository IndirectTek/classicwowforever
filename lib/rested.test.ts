import { describe, expect, it } from "vitest";
import { restedAfter } from "./rested";

const base = { currentBubbles: 0, inRestArea: true };

describe("restedAfter", () => {
  it("earns one bubble per 8 hours at an inn", () => {
    const result = restedAfter({ ...base, hoursAway: 24 });
    expect(result.bubbles).toBe(3);
    expect(result.percentOfLevel).toBe(15);
  });

  it("earns a quarter as fast outside a rest area", () => {
    expect(restedAfter({ ...base, hoursAway: 32, inRestArea: false }).bubbles).toBe(1);
  });

  it("caps at 30 bubbles, which is 150% of a level", () => {
    const result = restedAfter({ ...base, currentBubbles: 25, hoursAway: 1000 });
    expect(result.bubbles).toBe(30);
    expect(result.gainedBubbles).toBe(5);
    expect(result.percentOfLevel).toBe(150);
    expect(result.capped).toBe(true);
  });

  it("reports hours until the cap from logout", () => {
    expect(restedAfter({ ...base, hoursAway: 0 }).hoursToCap).toBe(240);
    expect(restedAfter({ ...base, currentBubbles: 30, hoursAway: 0 }).hoursToCap).toBe(0);
  });

  it("ignores negative time away", () => {
    expect(restedAfter({ ...base, hoursAway: -5 }).bubbles).toBe(0);
  });
});
