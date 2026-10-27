# Changes to the project plan

Decisions made after the original plan (October 26, 2026), before Milestones 2 and 3. Each one fixes a gap the plan had, or adds a feature. The code is already in the repo; this explains what changed and why.

## Data model

### Usage is tracked per account, not per character

**Gap:** `session_plans` linked to an account only through `characters`, with a cascading delete. Deleting a character deleted its plans, which reset the free quota and erased the cost records.

**Change:** a new `plan_requests` table is the usage ledger. It belongs to the profile, holds no plan content, and survives character deletion. Quota and the 10 second rate limit are enforced by one database function, `reserve_plan_request()`. It locks the profile row, so two quick clicks can't both slip under the limit. Failed generations don't count against the quota. Token counts and cost moved from `session_plans` to `plan_requests`.

**For Milestone 3:** `POST /api/plans` calls `reserve_plan_request(profile_id, FREE_PLANS_PER_WEEK)` with the secret key. On success it generates the plan, then marks the request `succeeded` (with tokens and cost) or `failed`. The function raises `rate_limited` or `quota_exceeded`; map those to 429 and 402.

### Zones, neighbors, and inns are real data

**Gap:** candidate selection needed "adjacent zones," and every plan had to end at an inn, but no table held either.

**Change:** `game_zones`, `zone_links` (plus a `zone_neighbors` view that returns both directions) and `rest_spots`. `game_quests.zone` is now `zone_id`, a foreign key. `supabase/seed.sql` drafts the starting zones, their neighbors, the capitals and their inns. Every row is marked `verified = false` until a data keeper confirms it in WoW Forever. No quests are seeded.

**Effect on the model's output:** the model now returns `logoutSpotId`, an id from the rest spots it was given, instead of free text. Code can then check it the same way it checks `questIds`. `lib/schema.ts` has two schemas:

- `ModelPlan`: what the model returns, with ids only.
- `StoredPlan`: what we save and render, after validation, with ids resolved to names.

In Milestone 3, if the model picks an unknown spot, the plan route should swap in the nearest known one rather than fail.

### Shared plans have a safe public read path

**Gap:** `/p/[shareId]` is anonymous, but Row Level Security only lets owners read plans.

**Change:** `get_shared_plan(share_id)` returns only the character's name, class and level, plus the plan itself. The page caches the result for days under the tag `shared-plan-<shareId>`. When a plan or its character is deleted, call `revalidateTag(sharedPlanTag(shareId))` so the link stops working right away.

### Tighter defaults

- Users can update only their `display_name`. `tier` is writable only by the server; otherwise anyone could make themselves a supporter with the public key.
- Only the server creates `session_plans`, so nobody can publish arbitrary text under a share link.
- `pnpm test:db` runs every migration against a throwaway Postgres and checks these rules (`supabase/tests/rls_and_quota.sql`).

## Before Milestone 2: email

Supabase's built-in email sender is limited to a handful of messages per hour and isn't meant for production. On launch week, magic links would quietly stop arriving.

1. Create an account with a transactional email provider (Resend, Postmark, or similar).
2. Verify `classicwowforever.dev` with it (SPF and DKIM records in Vercel DNS).
3. In Supabase, go to **Authentication > Emails > SMTP Settings**, enable custom SMTP, and enter the provider's credentials. Use a sender like `hello@classicwowforever.dev`.
4. In **Authentication > Rate Limits**, raise the email limit to match expected signups.
5. In **Authentication > URL Configuration**, set the Site URL to `https://classicwowforever.dev` and add the Vercel preview URL pattern to the redirect allow list.

The same provider can send the "planner is open" email to the waitlist.

## The prompt and the model

### One prompt file

The system prompt lives in `lib/prompts/plan-system.md`. The app reads it through `lib/prompt.ts`, and the Python evals must read the same file rather than keep a copy. `lib/prompt.test.ts` fails if the prompt stops mentioning a field of the output schema, or if its example plan stops validating. Prettier skips `lib/prompts/` so formatting never changes the prompt by accident.

### Caching and cost

Haiku 5.5 caches prompts of 512 tokens or more, and the system prompt is well over that, so caching works as long as the text is identical on every request. Keep dates and ids out of it. Each plan records `cache_read_input_tokens`; if it stays at zero, something is changing the prompt.

At Haiku 5.5's list price ($0.10 per million input tokens, $0.50 per million output), a plan of roughly 3,000 tokens in and 400 out costs about a twentieth of a cent. That is low enough to consider a more generous free tier at launch. Confirm it with the real cost column before setting the supporter price.

### API notes for Milestone 3

- Use structured outputs (`output_config.format`, or the SDK's `messages.parse()` with a Zod schema) rather than asking for JSON in prose.
- Don't send `temperature`, `top_p` or `top_k`; the API now rejects them. The eval harness shouldn't send them either.

## New features

- **Rested XP calculator** at `/rested`. No AI and no login. It uses classic-era rates, defined as constants in `lib/rested.ts`; confirm them in WoW Forever.
- **Session timer** on every plan. It checks off steps, shows time left on the current step, and nudges you toward your logout spot when 15 minutes remain. It also shows the countdown in the browser tab and can keep a phone screen awake. Progress is saved in the browser.
- **Example plan** at `/p/example`. It's a working demo of the plan card and timer, and the same components will render real plans in Milestone 3.
- **Preview image per shared plan.** A link pasted into Discord shows the character, session length, time budget bar and logout spot.
- **Flavor text** in `lib/flavor.ts`: finished-session lines now, and planning lines for the Milestone 3 loading state.

## Still open

- **Contributor License Agreement.** Decide before the first outside pull request. Without one, relicensing later needs every contributor's permission.
- **Supporter price.** Set it after measuring real cost per plan.
