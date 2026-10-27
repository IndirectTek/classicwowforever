import type { Metadata } from "next";
import { RestedCalculator } from "@/components/rested/RestedCalculator";
import { HOURS_PER_BUBBLE_RESTING, MAX_BUBBLES } from "@/lib/rested";

export const metadata: Metadata = {
  title: "Rested XP calculator",
  description:
    "If you log out at an inn now, how much rested XP will you have when you're back? Work it out in seconds.",
};

export default function RestedPage() {
  return (
    <div className="mx-auto max-w-[1120px] px-4 py-12 sm:py-16">
      <h1 className="font-display text-4xl font-bold">Rested XP calculator</h1>
      <p className="mt-4 max-w-2xl text-lg text-text-muted">
        If you log out now, how much rested XP will you have when you&apos;re back?
      </p>

      <div className="mt-10">
        <RestedCalculator />
      </div>

      <section className="mt-12 max-w-2xl space-y-3 text-text-muted">
        <h2 className="text-2xl font-semibold text-text">How rested XP works</h2>
        <p>
          Your XP bar is split into 20 bubbles. Logged out in an inn or a capital city, you earn one
          bubble every {HOURS_PER_BUBBLE_RESTING} hours, up to {MAX_BUBBLES} bubbles (one and a half
          levels). Logged out anywhere else, you earn a quarter as much.
        </p>
        <p>
          While you have rested XP, monsters give double experience. Quest rewards don&apos;t use it
          up, so a rested session is a good one for grinding between quest hubs.
        </p>
        <p className="text-sm">
          These are the classic-era rules. We&apos;ll update the calculator if WoW Forever changes
          them.
        </p>
      </section>
    </div>
  );
}
