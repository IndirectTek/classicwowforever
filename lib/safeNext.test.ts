import { describe, expect, it } from "vitest";
import { DEFAULT_AFTER_SIGN_IN, safeNextPath } from "./safeNext";

describe("safeNextPath", () => {
  it("keeps paths on this site", () => {
    expect(safeNextPath("/characters/abc")).toBe("/characters/abc");
    expect(safeNextPath("/plan?minutes=60")).toBe("/plan?minutes=60");
  });

  it("falls back for anything that could leave the site", () => {
    for (const next of [
      null,
      undefined,
      "",
      "https://evil.example",
      "//evil.example",
      "/\\evil.example",
      "evil",
    ]) {
      expect(safeNextPath(next)).toBe(DEFAULT_AFTER_SIGN_IN);
    }
  });
});
