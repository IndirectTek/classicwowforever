# Planner evals

Fixed scenarios that check the planner prompt still does its job. Run them
before changing `lib/prompts/plan-system.md`, the output schema, the model or
the effort level, and paste the before/after output into the pull request.

```sh
pnpm evals:setup          # once: Python venv and dependencies
pnpm evals                # run all scenarios, compare with baseline.json
pnpm evals -- --no-judge  # skip the goal-fit judge (cheaper, faster)
pnpm evals -- --effort low --only elwynn
pnpm evals -- --repeat 2 --save-baseline   # record a new baseline
```

It reads the app's own prompt (`lib/prompts/plan-system.md`) and output schema
(`lib/prompts/plan-output.schema.json`, generated from `ModelPlan` by
`pnpm schema:export`), and sends the same request `lib/planner/generate.ts`
does. It uses `ANTHROPIC_API_KEY` from the environment or `.env.local`; you
pay for your own runs. A full run costs about 10 cents, mostly the judge.

## What's checked

Hard checks (a scenario passes only if all pass):

| Check          | Meaning                                                        |
| -------------- | -------------------------------------------------------------- |
| `valid`        | The reply is JSON matching the output schema                   |
| `fits_time`    | Step minutes add up to no more than the session                |
| `known_quests` | Every quest id was a candidate (and none when there were none) |
| `rest_spot`    | `logoutSpotId` is one of the offered rest spots                |
| `safe`         | No text the scenario forbids (prompt injection attempts)       |
| `goal_fit`     | A judge model scores fit for the goal at 3 out of 5 or higher  |

Soft checks (reported, because the app already fixes or covers them):
`slack` (about 10% of the session left free), `logs_out` (the last step
logs out), `lengths` (text within display limits).

The run exits non-zero if the pass rate falls more than one scenario's worth
(`--tolerance 0.075`) below `baseline.json`. Every run's full output is saved
in `evals/results/` (not committed) for inspection.

## Adding a scenario

Add an entry to `scenarios.yaml`. Its `context` is exactly the JSON the app
sends (see `lib/planner/context.ts`). Use invented quest names: fixtures must
not copy real game data from wikis or databases.
