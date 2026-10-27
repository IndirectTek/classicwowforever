// Planner settings. The model and quota can be overridden per environment.
export const CLAUDE_MODEL = process.env.CLAUDE_MODEL || "claude-haiku-5-5";

// How hard the model thinks. Chosen by the evals (evals/): on Oct 26, 2026,
// "medium" passed 100% of scenarios with no judge vs 86% for "low", for about
// 1.4s more (4.1s median) and $0.00015 more per plan. Re-run before changing.
export const PLAN_EFFORT = "medium" as const;

export const FREE_PLANS_PER_WEEK = Number(process.env.FREE_PLANS_PER_WEEK) || 3;
