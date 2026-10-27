import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { stepBudget } from "./planner/finalize";
import { ModelPlan } from "./schema";

// lib/prompt.ts is server-only, so read the same file directly.
const prompt = readFileSync(join(process.cwd(), "lib/prompts/plan-system.md"), "utf8");

describe("plan system prompt", () => {
  it("mentions every field of the output schema, so prompt and schema can't drift apart", () => {
    for (const key of Object.keys(ModelPlan.shape)) {
      expect(prompt).toContain(key);
    }
    expect(prompt).toContain("questIds");
  });

  it("has an example plan that is valid against the schema", () => {
    const blocks = [...prompt.matchAll(/```json\n([\s\S]*?)```/g)].map((m) => m[1]);
    const examplePlan = JSON.parse(blocks.at(-1)!);
    expect(ModelPlan.safeParse(examplePlan).success).toBe(true);
  });

  it("contains nothing that changes per request, which would defeat prompt caching", () => {
    expect(prompt).not.toMatch(/\{\{|\$\{/);
  });
});

describe("the prompt's example plan follows its own rules", () => {
  it("leaves slack and ends by logging out", () => {
    const blocks = [...prompt.matchAll(/```json\n([\s\S]*?)```/g)].map((m) => m[1]);
    const context = JSON.parse(blocks[0]);
    const plan = JSON.parse(blocks.at(-1)!);
    const total = plan.steps.reduce((s: number, x: { minutes: number }) => s + x.minutes, 0);
    expect(total).toBeLessThanOrEqual(stepBudget(context.minutes));
    expect(plan.steps.at(-1).action).toMatch(/log out/i);
  });
});
