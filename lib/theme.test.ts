import { describe, expect, it } from "vitest";
import { contrastRatio, dark, light, type Palette, type TokenName } from "./theme";

// Every text color we put on every surface it can appear on, at WCAG AA (4.5:1).
const textOn: [TokenName, TokenName[]][] = [
  ["text", ["background", "surface", "surfaceRaised"]],
  ["textMuted", ["background", "surface", "surfaceRaised"]],
  ["accent", ["background", "surface", "surfaceRaised"]],
  ["success", ["background", "surface"]],
  ["warning", ["background", "surface"]],
  ["danger", ["background", "surface"]],
];

describe.each([
  ["dark", dark],
  ["light", light],
] as [string, Palette][])("%s palette", (_name, palette) => {
  for (const [fg, backgrounds] of textOn) {
    for (const bg of backgrounds) {
      it(`${fg} on ${bg} meets 4.5:1`, () => {
        expect(contrastRatio(palette[fg], palette[bg])).toBeGreaterThanOrEqual(4.5);
      });
    }
  }

  it("accentText on accent meets 4.5:1", () => {
    expect(contrastRatio(palette.accentText, palette.accent)).toBeGreaterThanOrEqual(4.5);
  });

  it("accentText on danger meets 4.5:1 (destructive buttons)", () => {
    expect(contrastRatio(palette.accentText, palette.danger)).toBeGreaterThanOrEqual(4.5);
  });
});
