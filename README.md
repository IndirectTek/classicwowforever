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
- Magic-link sign-in and the Characters pages (Milestone 2)

Next up is the planner (Milestone 3). [docs/plan-changes.md](docs/plan-changes.md) records the decisions made since the original plan.

## Stack

- Next.js (App Router, TypeScript, Tailwind CSS) on Vercel
- Supabase for Postgres and auth
- Claude API for plan generation (from Milestone 3)
- Python for evals (from Milestone 3)

## Run it locally

You need Node.js (latest LTS), pnpm, and Docker.

1. `pnpm install`
2. `pnpm db:start` starts a local Supabase (Postgres, Auth, and a test inbox) in Docker. It applies `supabase/migrations/` and `supabase/seed.sql` automatically. The first run downloads a few images.
3. `pnpm db:env` writes `.env.development.local` with your local Supabase URL and keys.
4. `pnpm dev`, then open http://localhost:3000.

Sign in with any address: the email lands in the local inbox at http://127.0.0.1:54324, not a real mailbox. `pnpm dev` always uses the local database; `.env.local` holds production values for scripts and is never used in development.

| Command         | What it does                                                           |
| --------------- | ---------------------------------------------------------------------- |
| `pnpm dev`      | Dev server, against local Supabase                                     |
| `pnpm test`     | Unit tests (Vitest)                                                    |
| `pnpm lint`     | ESLint                                                                 |
| `pnpm build`    | Production build                                                       |
| `pnpm db:start` | Start local Supabase (Docker)                                          |
| `pnpm db:reset` | Rebuild the local database from migrations and seed                    |
| `pnpm db:stop`  | Stop local Supabase                                                    |
| `pnpm db:env`   | Write `.env.development.local` for the running local stack             |
| `pnpm test:db`  | Security and quota tests on a throwaway Postgres (`TEST_DATABASE_URL`) |

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
