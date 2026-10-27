@AGENTS.md

# Classic WoW Forever

A session planner for World of Warcraft: Forever: "I have N minutes tonight, what should this character do?"

## About the developer

A longtime Ruby on Rails engineer learning Next.js, React, and Python. When you introduce a Next.js or React pattern that has a Rails equivalent, add a one line comment relating them (for example: "Server Action: like a controller action called directly from the form"). Prefer clear, conventional code over clever code. Explain non-obvious decisions in the commit message.

## Conventions

- Colors come from `lib/theme.ts` only, used through Tailwind names (`bg-surface`, `text-text-muted`, `text-accent`). Never hard code hex values in components. `lib/theme.test.ts` enforces WCAG AA contrast; run it after changing a color.
- Fonts: `font-display` (Cinzel, 28px and up only), `font-sans` (Inter), `font-mono` (JetBrains Mono, for numbers).
- Server Components by default; Client Components only for interactivity.
- Zod validates all input and all model output.
- `lib/supabase/admin.ts` uses the secret key and bypasses RLS. Use it only for tables with no user owner (like `waitlist`). User-owned data goes through the user's own session client so RLS applies.
- Never commit secrets. Never add Blizzard art, logos, screenshots, or game fonts.
- Game data comes from the team's own play and official patch notes. Never scrape fan wikis or databases, and never invent quests in `data/`.
- `data/zones/*.json` is the source of truth for zones, inns and quests (format in `lib/data/schema.ts`). After editing data or that schema, run `pnpm data:generate` (rewrites `supabase/seed.sql` and `data/zone.schema.json`). Don't edit `seed.sql` by hand.

## Commands

- `pnpm dev`: dev server, against local Supabase (`pnpm db:start`, then `pnpm db:env`); sign-in emails go to Mailpit at http://127.0.0.1:54324
- `pnpm test`: Vitest
- `pnpm lint`: ESLint
- `pnpm build`: production build
- `pnpm test:db`: migrations plus RLS and quota tests against a throwaway Postgres (needs `TEST_DATABASE_URL`)

## Auth

- `lib/auth.ts`: `getCurrentUser()` (verified claims) and `requireUser(returnTo)`. Anything reading the session must sit behind a `<Suspense>` boundary (Cache Components).
- Sign-in emails link to `/auth/confirm?token_hash=...` (see `supabase/templates/magic-link.html`). Production Auth settings are applied with `scripts/configure-supabase-auth.sh`; local ones live in `supabase/config.toml`.
- User-owned queries use `lib/supabase/server.ts` so RLS applies.

## Planner

- `POST /api/plans` (`app/api/plans/route.ts`): auth, `reserve_plan_request()` for quota and rate limit, `loadCandidates()`, `buildPlanContext()`, `generatePlan()` (Claude, structured output, one retry), `finalizePlan()` (post-validation), save with the admin client.
- Model and effort live in `lib/config.ts` (Haiku 5.5, effort `medium`, chosen by the evals). Prices for the cost column are in `lib/pricing.ts`.
- `finalizePlan()` enforces what code can check: candidate-only quest ids, a known logout spot, about 10% time slack, length limits. Change prompt rules in `lib/prompts/plan-system.md` and keep its example plan valid (`lib/prompt.test.ts`).

## Group sessions

- `POST /api/plans` with `party` (up to 4 others: class, level, preferred role) makes a group plan. `lib/planner/group.ts` decides roles (`assignRoles`) and the dungeon (`pickDungeon`: level fit, time, travel) in code; the model only plans the evening around them. The result is stored as `plan.group` (`GroupInfo` in `lib/schema.ts`), with classes and levels but never other players' names.
- Dungeons are `kind: "dungeon"` entries in `data/zones/*.json`. The five low-level ones are drafts (`draft-2026-10-28`) until a keeper confirms them.
- The group scenarios in `evals/scenarios.yaml` use the same `group` context shape as `buildPlanContext()` (see `lib/planner/context.test.ts`).

## Reports and the home prompt

- `/report` saves to `quest_reports` with the user's session client (RLS: own rows, status `new` only). The `limit_quest_reports` trigger caps 40 a day. Limits in `lib/reports.ts` match `QuestEntry`, so accepted reports always fit in `data/`.
- Keepers use `pnpm reports` (`scripts/reports.mts`; conversion in `lib/data/fromReports.ts`). Reports never reach the planner without a reviewed data PR.
- The home prompt posts to `/plan?q=`; `lib/sessionPrompt.ts` parses it with patterns (no model call). Add phrasings there with a test.

## Evals

- `evals/run_evals.py` uses the app's prompt and `lib/prompts/plan-output.schema.json`. After changing `ModelPlan`, run `pnpm schema:export`.
- Run `pnpm evals` before and after any prompt, schema, model or effort change; keep `evals/run_evals.py` defaults in sync with `lib/config.ts`.

## Decisions since the original plan

See `docs/plan-changes.md`. In short: quota lives in `plan_requests` (per profile, enforced by `reserve_plan_request()`); the model returns ids only (`ModelPlan`) and we store resolved names (`StoredPlan`); shared plans are read through `get_shared_plan()`; the system prompt is `lib/prompts/plan-system.md`, shared with the evals.
