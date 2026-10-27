// List prices in US dollars per million tokens, for the cost column on every
// plan. Check https://claude.com/pricing when changing models.
const PRICES: Record<string, { input: number; output: number }> = {
  // Prompts up to 100K tokens; ours are a few thousand.
  "claude-haiku-5-5": { input: 0.1, output: 0.5 },
  "claude-sonnet-5-5": { input: 2, output: 10 },
  "claude-opus-5-5": { input: 4, output: 20 },
};

export type Usage = {
  input_tokens: number;
  output_tokens: number;
  cache_read_input_tokens?: number | null;
  cache_creation_input_tokens?: number | null;
};

// Cost in US cents, or null for a model we have no price for. Cache reads
// bill at 0.1x input and 5-minute cache writes at 1.25x.
export function costInCents(model: string, usage: Usage): number | null {
  const price = PRICES[model];
  if (!price) return null;
  const inputEquivalent =
    usage.input_tokens +
    (usage.cache_read_input_tokens ?? 0) * 0.1 +
    (usage.cache_creation_input_tokens ?? 0) * 1.25;
  const dollars = (inputEquivalent * price.input + usage.output_tokens * price.output) / 1_000_000;
  return Math.round(dollars * 100 * 10_000) / 10_000; // numeric(10,4) cents
}

export function addUsage(a: Usage, b: Usage): Usage {
  return {
    input_tokens: a.input_tokens + b.input_tokens,
    output_tokens: a.output_tokens + b.output_tokens,
    cache_read_input_tokens: (a.cache_read_input_tokens ?? 0) + (b.cache_read_input_tokens ?? 0),
    cache_creation_input_tokens:
      (a.cache_creation_input_tokens ?? 0) + (b.cache_creation_input_tokens ?? 0),
  };
}
