// Generates the 1200x630 preview image shown when someone shares a link.
// It's built once at build time and served as a static file.
import { ImageResponse } from "next/og";
import { ogFonts, ogSize } from "@/lib/og";
import { dark } from "@/lib/theme";

export const alt = "Classic WoW Forever: make tonight's session count";
export const size = ogSize;
export const contentType = "image/png";

export default async function OpengraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "80px",
        background: dark.background,
        color: dark.text,
        border: `12px solid ${dark.surfaceRaised}`,
        fontFamily: "Inter",
      }}
    >
      <div style={{ fontSize: 28, letterSpacing: 6, color: dark.accent, fontFamily: "Cinzel" }}>
        CLASSIC WOW FOREVER
      </div>
      <div style={{ fontSize: 84, lineHeight: 1.1, marginTop: 24, fontFamily: "Cinzel" }}>
        Make tonight&apos;s session count
      </div>
      <div style={{ fontSize: 34, marginTop: 32, color: dark.textMuted }}>
        Tell it your time. Get a plan that fits. Log out rested.
      </div>
      <div style={{ display: "flex", marginTop: 56, height: 8, width: 520, gap: 8 }}>
        {[35, 25, 20, 12].map((w) => (
          <div key={w} style={{ width: `${w}%`, background: dark.accent, borderRadius: 4 }} />
        ))}
      </div>
    </div>,
    { ...size, fonts: await ogFonts() },
  );
}
