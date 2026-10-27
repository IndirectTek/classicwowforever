import { z } from "zod";

export const goals = ["xp", "gold", "gear", "dungeon", "relaxed"] as const;
export type Goal = (typeof goals)[number];

export const goalLabels: Record<Goal, string> = {
  xp: "XP",
  gold: "Gold",
  gear: "Gear",
  dungeon: "Dungeon",
  relaxed: "Relaxed",
};

// What the model returns. It names quests and the logout spot only by id, so
// code can check every id against the candidates it was given.
export const ModelPlan = z.object({
  summary: z.string().max(200),
  steps: z
    .array(
      z.object({
        action: z.string().max(140),
        minutes: z.number().int().positive(),
        questIds: z.array(z.string()),
      }),
    )
    .min(1)
    .max(8),
  logoutSpotId: z.string(),
  why: z.string().max(200),
});
export type ModelPlan = z.infer<typeof ModelPlan>;

// What we save in session_plans.plan and render: the model's plan after
// validation, with ids resolved to names. Unknown ids are dropped, and an
// unknown logout spot becomes { id: null, name: <nearest known spot> }.
export const StoredPlan = z.object({
  summary: z.string(),
  steps: z
    .array(
      z.object({
        action: z.string(),
        minutes: z.number().int().positive(),
        quests: z.array(z.object({ id: z.string(), name: z.string() })),
      }),
    )
    .min(1),
  logoutSpot: z.object({ id: z.string().nullable(), name: z.string() }),
  why: z.string(),
});
export type StoredPlan = z.infer<typeof StoredPlan>;

// Everything the read-only plan views need: the plan plus the little bit of
// character info we're willing to show publicly.
export type PlanView = {
  shareId: string;
  characterName: string;
  characterClass: string;
  characterLevel: number;
  minutes: number;
  goal: Goal;
  plan: StoredPlan;
};

export function plannedMinutes(plan: StoredPlan): number {
  return plan.steps.reduce((sum, step) => sum + step.minutes, 0);
}
