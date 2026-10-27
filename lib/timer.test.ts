import { describe, expect, it } from "vitest";
import {
  elapsedMs,
  formatClock,
  idleTimer,
  pause,
  resume,
  start,
  stepMinutesLeft,
  timerStatus,
} from "./timer";

const MIN = 60_000;

describe("session timer", () => {
  it("is idle before starting", () => {
    expect(timerStatus(idleTimer, 0, 60).phase).toBe("idle");
  });

  it("runs, enters wrap-up with 15 minutes left, then ends", () => {
    const t = start(0);
    expect(timerStatus(t, 10 * MIN, 60).phase).toBe("running");
    expect(timerStatus(t, 45 * MIN, 60).phase).toBe("wrap-up");
    expect(timerStatus(t, 60 * MIN, 60).phase).toBe("over");
  });

  it("doesn't count paused time", () => {
    let t = start(0);
    t = pause(t, 10 * MIN);
    expect(timerStatus(t, 30 * MIN, 60).phase).toBe("paused");
    expect(elapsedMs(t, 30 * MIN)).toBe(10 * MIN);
    t = resume(t, 30 * MIN);
    expect(elapsedMs(t, 35 * MIN)).toBe(15 * MIN);
  });

  it("tracks the current step's remaining budget", () => {
    // Steps of 10, 20, 15 minutes; on step 2 (index 1) after 25 minutes.
    expect(stepMinutesLeft([10, 20, 15], 1, 25 * MIN)).toBe(5);
    expect(stepMinutesLeft([10, 20, 15], 1, 34 * MIN)).toBe(-4);
  });

  it("formats clocks", () => {
    expect(formatClock(42 * MIN + 7000)).toBe("42:07");
    expect(formatClock(65 * MIN + 9000)).toBe("1:05:09");
    expect(formatClock(-5)).toBe("0:00");
  });
});
