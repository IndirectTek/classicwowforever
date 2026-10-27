# Classic WoW Forever

> "I have N minutes tonight. What should this character do?"

A session planner for World of Warcraft: Forever. Route guides tell you the fastest path; this tells a time-poor adult the best use of the time slot they actually have.

**Don't want to self host? Use [classicwowforever.dev](https://classicwowforever.dev).**

## Status

Built so far:

- Launch countdown and waitlist (Milestone 1)
- Rested XP calculator at `/rested`
- An example plan at `/p/example` with a working session timer
- The database schema for Milestones 2 and 3, with tested security rules

Next up are magic-link auth and characters (Milestone 2), then the planner (Milestone 3). [docs/plan-changes.md](docs/plan-changes.md) records the decisions made since the original plan.

## Stack

- Next.js (App Router, TypeScript, Tailwind CSS) on Vercel
- Supabase for Postgres and auth
- Claude API for plan generation (from Milestone 3)
- Python for evals (from Milestone 3)

## Run it locally

1. Install Node.js (latest LTS) and pnpm.
2. `pnpm install`
3. Create a free [Supabase](https://supabase.com) project.
4. Apply the SQL in `supabase/migrations/` in filename order, then `supabase/seed.sql`. Paste each file into the Supabase SQL editor, or use the Supabase CLI (`supabase db push`).
5. `cp .env.example .env.local` and fill in your Supabase URL and keys.
6. `pnpm dev`, then open http://localhost:3000.

| Command        | What it does                                                                                                   |
| -------------- | -------------------------------------------------------------------------------------------------------------- |
| `pnpm dev`     | Dev server                                                                                                     |
| `pnpm test`    | Unit tests (Vitest)                                                                                            |
| `pnpm lint`    | ESLint                                                                                                         |
| `pnpm build`   | Production build                                                                                               |
| `pnpm test:db` | Migrations and security rules against a throwaway Postgres (set `TEST_DATABASE_URL`; see `scripts/test-db.sh`) |

## Project layout

```text
app/                    pages and routes (App Router)
  actions/              Server Actions (form posts)
  p/[shareId]/          shared plan page and its preview image
  rested/               rested XP calculator
components/             React components (planner/ holds the plan card and timer)
lib/
  theme.ts              color tokens, the only place hex values live
  schema.ts             Zod schemas for plans (model output and stored)
  prompts/              the planner's system prompt, shared with the evals
  rested.ts, timer.ts   pure logic behind the calculator and session timer
  supabase/             admin (secret key) and public (anon) clients
supabase/migrations/    SQL migrations
supabase/seed.sql       draft starter zones and inns, to verify in game
supabase/tests/         security and quota tests run by pnpm test:db
docs/                   decisions and setup notes
assets/fonts/           fonts used to render preview images (OFL)
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). You don't need to write code; accurate quest data matters just as much.

## License

The web app is [AGPL 3.0](LICENSE). Cinzel and Inter (in `assets/fonts/`) are under the SIL Open Font License.

Classic WoW Forever is a fan project, not affiliated with Blizzard Entertainment.
