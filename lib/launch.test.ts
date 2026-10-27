import { describe, expect, it } from "vitest";
import { LAUNCH_AT, timeLeft } from "./launch";

describe("LAUNCH_AT", () => {
  it("is 3:00 PM PST, which is 23:00 UTC", () => {
    expect(LAUNCH_AT.toISOString()).toBe("2026-11-04T23:00:00.000Z");
  });
});

describe("timeLeft", () => {
  const launch = LAUNCH_AT.getTime();

  it("splits the remaining time into days, hours, minutes, seconds", () => {
    const now = launch - ((2 * 24 + 3) * 3600 + 4 * 60 + 5) * 1000;
    expect(timeLeft(now)).toEqual({ days: 2, hours: 3, minutes: 4, seconds: 5 });
  });

  it("rounds partial seconds down", () => {
    expect(timeLeft(launch - 1500)).toEqual({ days: 0, hours: 0, minutes: 0, seconds: 1 });
  });

  it("returns null at and after launch", () => {
    expect(timeLeft(launch)).toBeNull();
    expect(timeLeft(launch + 1)).toBeNull();
  });
});
