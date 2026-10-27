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
- Game data comes from the developer's own play and official patch notes. Never scrape fan wikis or databases.

## Commands

- `pnpm dev`: dev server
- `pnpm test`: Vitest
- `pnpm lint`: ESLint
- `pnpm build`: production build
- `pnpm test:db`: migrations plus RLS and quota tests against a throwaway Postgres (needs `TEST_DATABASE_URL`)

## Decisions since the original plan

See `docs/plan-changes.md`. In short: quota lives in `plan_requests` (per profile, enforced by `reserve_plan_request()`); the model returns ids only (`ModelPlan`) and we store resolved names (`StoredPlan`); shared plans are read through `get_shared_plan()`; the system prompt is `lib/prompts/plan-system.md`, shared with the evals.
