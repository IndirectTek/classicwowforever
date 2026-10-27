// The planner's system prompt lives in lib/prompts/plan-system.md so that the
// app and the Python evals (evals/run_evals.py) read exactly the same text.
// Edit the Markdown file, never a copy of it.
import "server-only";
import { readFileSync } from "node:fs";
import { join } from "node:path";

export const PLAN_SYSTEM_PROMPT_PATH = join(process.cwd(), "lib/prompts/plan-system.md");

// Read once per server instance. Keep this text byte-for-byte stable between
// requests (no dates or ids) so prompt caching can reuse it; check
// usage.cache_read_input_tokens, which we record on every plan_requests row.
export const PLAN_SYSTEM_PROMPT = readFileSync(PLAN_SYSTEM_PROMPT_PATH, "utf8");
