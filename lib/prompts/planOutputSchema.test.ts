// The Python evals send the model the same JSON schema the app does. This
// test keeps lib/prompts/plan-output.schema.json in sync with ModelPlan.
// After changing ModelPlan, run `pnpm schema:export` to regenerate it.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { expect, it } from "vitest";
import { ModelPlan } from "@/lib/schema";

const FILE = join(process.cwd(), "lib/prompts/plan-output.schema.json");

it("plan-output.schema.json matches the schema the app sends to Claude", () => {
  const schema = `${JSON.stringify(zodOutputFormat(ModelPlan).schema, null, 2)}\n`;
  if (process.env.UPDATE_SCHEMA) writeFileSync(FILE, schema);
  expect(readFileSync(FILE, "utf8")).toBe(schema);
});
