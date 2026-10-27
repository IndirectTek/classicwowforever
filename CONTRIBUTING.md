# Contributing

Thanks for helping. This project builds a session planner for World of Warcraft: Forever players: tell it how much time you have tonight, and it plans the best use of it. The code and the game data are open; the hosted version at classicwowforever.dev helps pay for the servers and AI costs.

You don't need to write code to make a big difference here. Good game data matters as much as good code.

## Ways to contribute

| If you like to...      | Start here                                                               |
| ---------------------- | ------------------------------------------------------------------------ |
| Play and notice things | Use [Report a quest](https://classicwowforever.dev/report) on the site   |
| Keep data accurate     | Review and fix quest data in [`data/`](data/README.md)                   |
| Build UI               | Issues labeled `frontend` (Next.js, React, Tailwind)                     |
| Work on AI and quality | Issues labeled `evals` or `prompt` (Python eval harness, prompt changes) |
| Write Lua              | Issues labeled `addon` (arrives in Iteration 2)                          |
| Improve docs           | Anything labeled `docs`, or fix whatever confused you while setting up   |

New here? Look for issues labeled `good first issue`.

## Where we talk

- Discord: [invite link]
  - `#dev` for code
  - `#data` for game data
  - `#feedback` for how plans are working in practice
- GitHub issues for anything that needs tracking

Please say hello in Discord before starting on something large, so two people don't build the same thing.

## Running the app locally

1. Install Node.js (latest LTS), pnpm, Docker, and Python 3.12
2. Fork and clone the repo
3. Install dependencies: `pnpm install`
4. Start a local Supabase: `pnpm db:start`, then `pnpm db:env`
5. Start the dev server: `pnpm dev`. Sign-in emails land in the local inbox at http://127.0.0.1:54324
6. For the planner (Milestone 3), add your own Claude API key to `.env.development.local`; contributors pay their own inference
7. For evals: `pnpm evals:setup` once, then `pnpm evals` (see `evals/README.md`)

Never commit `.env.local` or any key.

## Workflow

1. Pick an issue, or open one describing what you want to change
2. Comment on the issue so others know you're on it
3. Create a branch named after the issue, for example `42_planner_empty_state`
4. Keep pull requests small: one change, one PR
5. Open the PR against `main` and fill in the template
6. One approving review is required before merge; `main` is protected and deploys to production

### Pull request checklist

- Works on a phone sized screen and on desktop, in dark and light mode
- Tests pass (`pnpm test`); new logic has a unit test
- If you changed a color, `lib/theme.test.ts` still passes (WCAG AA contrast)
- If you changed a migration or added a table, `pnpm test:db` passes and the new table has Row Level Security
- If you changed the prompt or model, include the eval results before and after
- No secrets, no Blizzard art or logos
- README or docs updated if behavior changed

## Game data rules

- Data must come from your own play or from official Blizzard patch notes. Until launch, Classic Era play counts too, as unverified entries to confirm in WoW Forever
- Do not copy from fan wikis, databases, or other guide sites
- Every record carries its source; for your own play, the source is `play` plus the date
- When you correct an existing record, explain what you saw in the PR description
- Time estimates are for a typical player, not a speedrunner

How to add or fix a quest, step by step, is in [data/README.md](data/README.md). CI validates every change, and merged data is copied into the database automatically.

Reports submitted through the site wait in a review queue. A data keeper turns them into a data pull request with `pnpm reports apply` and reviews each one before merging (see [data/README.md](data/README.md#reports-from-the-site)).

## Using AI tools

AI assistants (Claude Code included) are welcome. If you use one:

- You are responsible for the change: read it, understand it, and test it
- Mention in the PR description that AI helped and roughly how
- Don't submit code you couldn't explain in review

## Licenses

- Web app: AGPL 3.0
- Exporter addon and Python parser: MIT
- Quest and zone data: CC BY SA 4.0

By submitting a contribution you agree it is released under the license of the part of the project you contributed to.

## Code of conduct

Be kind, assume good intent, and help newcomers. Harassment of any kind isn't tolerated. Maintainers may remove comments or contributors that violate this.

## Fine print

Classic WoW Forever is a fan project, not affiliated with Blizzard Entertainment. We don't sell gold, boosts, carries, or accounts, and we never will.
