// A preview image for each shared plan: character, session length, and the
// time budget bar, so a link dropped in Discord shows what the plan is.
import { ImageResponse } from "next/og";
import { getPlanView } from "@/lib/plans";
import { ogFonts, ogSize } from "@/lib/og";
import { goalLabels, plannedMinutes } from "@/lib/schema";
import { dark } from "@/lib/theme";

export const alt = "A Classic WoW Forever session plan";
export const size = ogSize;
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ shareId: string }> }) {
  const { shareId } = await params;
  const view = await getPlanView(shareId);
  const fonts = await ogFonts();

  const frame = {
    width: "100%",
    height: "100%",
    display: "flex",
    flexDirection: "column" as const,
    padding: "64px 72px",
    background: dark.background,
    color: dark.text,
    border: `12px solid ${dark.surfaceRaised}`,
    fontFamily: "Inter",
  };

  if (!view) {
    return new ImageResponse(
      <div style={{ ...frame, justifyContent: "center", fontFamily: "Cinzel", fontSize: 72 }}>
        Classic WoW Forever
      </div>,
      { ...size, fonts },
    );
  }

  const { plan } = view;
  const total = Math.max(plannedMinutes(plan), view.minutes);
  const className = view.characterClass.charAt(0).toUpperCase() + view.characterClass.slice(1);

  return new ImageResponse(
    <div style={frame}>
      <div style={{ fontSize: 24, letterSpacing: 6, color: dark.accent, fontFamily: "Cinzel" }}>
        CLASSIC WOW FOREVER
      </div>
      <div style={{ fontSize: 30, marginTop: 36, color: dark.textMuted }}>
        {`${view.characterName} · Level ${view.characterLevel} ${className}`}
      </div>
      <div style={{ fontSize: 76, marginTop: 8, fontFamily: "Cinzel", lineHeight: 1.1 }}>
        {`${view.minutes} minutes · ${goalLabels[view.goal]}`}
      </div>
      <div style={{ fontSize: 32, marginTop: 24, lineHeight: 1.35, display: "flex" }}>
        {plan.summary}
      </div>
      <div style={{ flexGrow: 1 }} />
      <div
        style={{
          display: "flex",
          height: 20,
          gap: 6,
          borderRadius: 10,
          overflow: "hidden",
          background: dark.surfaceRaised,
        }}
      >
        {plan.steps.map((step, i) => (
          <div
            key={i}
            style={{
              width: `${(step.minutes / total) * 100}%`,
              background: dark.accent,
              opacity: i % 2 ? 0.55 : 0.85,
            }}
          />
        ))}
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: 20,
          fontSize: 26,
          color: dark.textMuted,
        }}
      >
        <span>{`${plan.steps.length} steps · ${plannedMinutes(plan)} of ${view.minutes} min`}</span>
        <span
          style={{ color: dark.text, fontWeight: 600 }}
        >{`Log out: ${plan.logoutSpot.name}`}</span>
      </div>
    </div>,
    { ...size, fonts },
  );
}
