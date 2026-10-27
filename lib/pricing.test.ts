import { describe, expect, it } from "vitest";
import { addUsage, costInCents } from "./pricing";

describe("costInCents", () => {
  it("prices Haiku 5.5 input and output", () => {
    // 3,000 in at $0.10/M + 400 out at $0.50/M = $0.0005 = 0.05 cents
    expect(costInCents("claude-haiku-5-5", { input_tokens: 3000, output_tokens: 400 })).toBe(0.05);
  });

  it("bills cache reads at a tenth and writes at 1.25x", () => {
    const usage = {
      input_tokens: 0,
      output_tokens: 0,
      cache_read_input_tokens: 1_000_000,
      cache_creation_input_tokens: 1_000_000,
    };
    // $0.01 + $0.125 = 13.5 cents
    expect(costInCents("claude-haiku-5-5", usage)).toBe(13.5);
  });

  it("returns null for an unknown model", () => {
    expect(costInCents("some-other-model", { input_tokens: 1, output_tokens: 1 })).toBeNull();
  });

  it("adds usage across retries", () => {
    const one = { input_tokens: 10, output_tokens: 5, cache_read_input_tokens: 2 };
    expect(addUsage(one, one)).toEqual({
      input_tokens: 20,
      output_tokens: 10,
      cache_read_input_tokens: 4,
      cache_creation_input_tokens: 0,
    });
  });
});
