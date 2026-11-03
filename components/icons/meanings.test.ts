import { describe, expect, it } from "vitest";
import { classes } from "@/lib/game";
import { gameIcons, iconCredits } from "./gameIcons";
import { classIcons, goalIcons, roleIcons } from "./meanings";

describe("icons", () => {
  it("gives every class its own icon", () => {
    const used = classes.map((c) => classIcons[c]);
    expect(new Set(used).size).toBe(classes.length);
  });

  it("only uses icons that were generated, each with a credited artist", () => {
    for (const name of [
      ...Object.values(classIcons),
      ...Object.values(goalIcons),
      ...Object.values(roleIcons),
    ]) {
      expect(gameIcons[name].length).toBeGreaterThan(0);
      expect(iconCredits[name]).toBeTruthy();
    }
  });
});
