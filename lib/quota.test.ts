import { describe, expect, it } from "vitest";
import { countTowardQuota, quotaFor, quotaLabel } from "./quota";

const now = Date.parse("2026-11-10T12:00:00Z");
const ago = (ms: number) => new Date(now - ms).toISOString();
const HOUR = 3600_000;

describe("countTowardQuota", () => {
  it("counts succeeded plans from the last 7 days and in-flight pending ones", () => {
    expect(
      countTowardQuota(
        [
          { status: "succeeded", created_at: ago(HOUR) },
          { status: "succeeded", created_at: ago(8 * 24 * HOUR) }, // too old
          { status: "failed", created_at: ago(HOUR) }, // failures are free
          { status: "pending", created_at: ago(60_000) }, // in flight
          { status: "pending", created_at: ago(HOUR) }, // abandoned
        ],
        now,
      ),
    ).toBe(2);
  });
});

describe("quota", () => {
  it("describes what's left", () => {
    expect(quotaLabel(quotaFor("free", 1, 3))).toBe("2 of 3 free plans left this week");
    expect(quotaLabel(quotaFor("free", 3, 3))).toBe("No free plans left this week");
    expect(quotaLabel(quotaFor("free", 5, 3))).toBe("No free plans left this week");
    expect(quotaLabel(quotaFor("supporter", 99, 3))).toBe("Unlimited plans");
  });
});
