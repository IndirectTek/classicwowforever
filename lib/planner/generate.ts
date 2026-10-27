// The one place we call Claude. Structured outputs make the reply match
// ModelPlan's JSON schema; Zod re-checks it, and we retry once if not.
import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { CLAUDE_MODEL, PLAN_EFFORT } from "@/lib/config";
import { addUsage, type Usage } from "@/lib/pricing";
import { PLAN_SYSTEM_PROMPT } from "@/lib/prompt";
import { ModelPlan } from "@/lib/schema";

export class PlanGenerationError extends Error {
  constructor(
    message: string,
    readonly usage: Usage,
    readonly reason: "refused" | "invalid" | "api",
  ) {
    super(message);
  }
}

const client = new Anthropic();
const ATTEMPTS = 2;

export async function generatePlan(contextJson: string) {
  let usage: Usage = { input_tokens: 0, output_tokens: 0 };
  let lastError = "";

  for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
    try {
      const response = await client.messages.parse({
        model: CLAUDE_MODEL,
        max_tokens: 4096,
        // Byte-for-byte identical on every request, so it's served from the cache.
        system: [{ type: "text", text: PLAN_SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
        messages: [{ role: "user", content: contextJson }],
        output_config: { format: zodOutputFormat(ModelPlan), effort: PLAN_EFFORT },
      });
      usage = addUsage(usage, response.usage);

      if (response.stop_reason === "refusal") {
        throw new PlanGenerationError("The model declined this request.", usage, "refused");
      }
      if (response.parsed_output) {
        return { plan: response.parsed_output, usage, model: response.model };
      }
      lastError = `no parsed output (stop_reason: ${response.stop_reason})`;
    } catch (error) {
      if (error instanceof PlanGenerationError) throw error;
      // The SDK throws AnthropicError when the reply doesn't match the schema;
      // other API errors (rate limits, outages) are worth one retry too.
      lastError = error instanceof Error ? error.message : String(error);
    }
  }

  throw new PlanGenerationError(`Plan generation failed: ${lastError}`, usage, "invalid");
}
