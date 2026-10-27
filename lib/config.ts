// Planner settings. The model and quota can be overridden per environment.
export const CLAUDE_MODEL = process.env.CLAUDE_MODEL || "claude-haiku-5-5";

// How hard the model thinks. "low" is fastest and cheapest; raise it only if
// the evals (evals/) show better plans at a higher level.
export const PLAN_EFFORT = "low" as const;

export const FREE_PLANS_PER_WEEK = Number(process.env.FREE_PLANS_PER_WEEK) || 3;
