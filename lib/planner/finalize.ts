// Post-validation: turns what the model returned into a plan we're willing
// to show. The model is good but not trusted; every rule from the prompt that
// code can check is checked here, and fixed rather than failed where possible.
import { LIMITS, type ModelPlan, type StoredPlan } from "@/lib/schema";
import type { Candidate, RestSpot } from "./context";

type Context = {
  minutes: number;
  candidates: Pick<Candidate, "id" | "name">[];
  restSpots: Pick<RestSpot, "id" | "name" | "zone_id">[];
  characterZoneId: string | null;
};

export function finalizePlan(model: ModelPlan, ctx: Context): StoredPlan {
  const questNames = new Map(ctx.candidates.map((c) => [c.id, c.name]));

  const steps = model.steps.slice(0, LIMITS.steps).map((step) => ({
    action: trim(step.action, LIMITS.action),
    minutes: Math.max(1, Math.round(step.minutes)),
    // Drop ids that weren't offered (the model invented or misspelled them).
    quests: [...new Set(step.questIds)]
      .filter((id) => questNames.has(id))
      .map((id) => ({ id, name: questNames.get(id)! })),
  }));

  return {
    summary: trim(model.summary, LIMITS.summary),
    steps: fitMinutes(steps, stepBudget(ctx.minutes)),
    logoutSpot: pickLogoutSpot(model.logoutSpotId, ctx),
    why: trim(model.why, LIMITS.why),
  };
}

// Minutes the steps may use: the session minus slack for travel and logging
// out (about 10%, at least 3 minutes). The prompt asks for this too; this
// makes it a guarantee.
export function stepBudget(minutes: number): number {
  return minutes - Math.max(3, Math.round(minutes * 0.1));
}

// Scale step budgets down so they never add up to more than `available`.
export function fitMinutes<T extends { minutes: number }>(steps: T[], available: number): T[] {
  const total = steps.reduce((sum, s) => sum + s.minutes, 0);
  if (total <= available) return steps;

  const scaled = steps.map((s) => ({
    ...s,
    minutes: Math.max(1, Math.floor((s.minutes * available) / total)),
  }));
  // Rounding up to the 1-minute floor can still overshoot; trim the longest.
  let over = scaled.reduce((sum, s) => sum + s.minutes, 0) - available;
  while (over > 0) {
    const longest = scaled.reduce((a, b) => (b.minutes > a.minutes ? b : a));
    if (longest.minutes <= 1) break;
    longest.minutes -= 1;
    over -= 1;
  }
  return scaled;
}

function pickLogoutSpot(id: string, ctx: Context): StoredPlan["logoutSpot"] {
  const chosen = ctx.restSpots.find((s) => s.id === id);
  if (chosen) return { id: chosen.id, name: chosen.name };

  // Unknown id: fall back to a spot in the character's zone, then any offered spot.
  const fallback = ctx.restSpots.find((s) => s.zone_id === ctx.characterZoneId) ?? ctx.restSpots[0];
  return fallback
    ? { id: fallback.id, name: fallback.name }
    : { id: null, name: "the nearest inn or city" };
}

// Shorten to a limit at a word boundary.
export function trim(text: string, max: number): string {
  const clean = text.trim().replace(/\s+/g, " ");
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  const atWord = cut.slice(0, cut.lastIndexOf(" ")) || cut;
  return `${atWord.replace(/[\s,;:.-]+$/, "")}…`;
}
