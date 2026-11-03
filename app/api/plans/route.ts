// POST /api/plans: generate a session plan. Like a Rails controller `create`
// action that renders JSON. The steps follow the plan pipeline in the spec:
// validate, check quota, load the character, pick candidates, call Claude,
// post-validate, save. With a `party`, it's a group session: roles and the
// dungeon are decided in code first (lib/planner/group.ts).
import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { CLAUDE_MODEL, FREE_PLANS_PER_WEEK } from "@/lib/config";
import type { CharacterClass } from "@/lib/game";
import { loadCandidates, loadDungeons } from "@/lib/planner/candidates";
import { buildPlanContext } from "@/lib/planner/context";
import { finalizePlan } from "@/lib/planner/finalize";
import { generatePlan, PlanGenerationError } from "@/lib/planner/generate";
import { groupPlanFacts, PARTY_MAX, PartyMember } from "@/lib/planner/group";
import { loadQuota } from "@/lib/planner/loadQuota";
import { costInCents, type Usage } from "@/lib/pricing";
import { goals, MINUTES_MAX, MINUTES_MIN, type PlanView } from "@/lib/schema";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getZones } from "@/lib/zones";

const PlanRequest = z.object({
  characterId: z.uuid(),
  minutes: z.number().int().min(MINUTES_MIN).max(MINUTES_MAX),
  goal: z.enum(goals),
  // Everyone else in the group; leave out for a solo plan.
  party: z.array(PartyMember).min(1).max(PARTY_MAX).optional(),
});

const fail = (status: number, error: string) => NextResponse.json({ error }, { status });

export async function POST(request: Request) {
  // 1. Who's asking, and what for.
  const user = await getCurrentUser();
  if (!user) return fail(401, "Sign in to plan a session.");

  const input = PlanRequest.safeParse(await request.json().catch(() => null));
  if (!input.success) return fail(400, "Pick a character, a time, and a goal.");
  const { characterId, minutes, goal, party } = input.data;

  // 2. Load the character as the user, so RLS guarantees it's theirs.
  const supabase = await createClient();
  const { data: character } = await supabase
    .from("characters")
    .select("id, name, class, race, level, faction, zone_id")
    .eq("id", characterId)
    .maybeSingle();
  if (!character) return fail(404, "We couldn't find that character.");

  // 3. Quota and rate limit, checked and recorded atomically in the database.
  const admin = createAdminClient();
  const { data: requestId, error: reserveError } = await admin.rpc("reserve_plan_request", {
    p_profile_id: user.id,
    p_free_limit: FREE_PLANS_PER_WEEK,
  });
  if (reserveError) {
    if (reserveError.message.includes("rate_limited")) {
      return fail(429, "One plan at a time. Give it a few seconds, then try again.");
    }
    if (reserveError.message.includes("quota_exceeded")) {
      return fail(402, `You've used your ${FREE_PLANS_PER_WEEK} free plans this week.`);
    }
    throw reserveError;
  }

  const markRequest = (status: "succeeded" | "failed", model: string, usage: Usage) =>
    admin
      .from("plan_requests")
      .update({
        status,
        model,
        input_tokens: usage.input_tokens,
        output_tokens: usage.output_tokens,
        cache_read_input_tokens: usage.cache_read_input_tokens ?? 0,
        cost_usd_cents: costInCents(model, usage),
        completed_at: new Date().toISOString(),
      })
      .eq("id", requestId);

  try {
    // 4. What the model may choose from. A group headed to a dungeon gets
    // the quests and inns around that dungeon instead of around the leader.
    const zones = await getZones();
    const group = party
      ? groupPlanFacts(
          { class: character.class as CharacterClass, level: character.level },
          party,
          {
            wantsDungeon: goal === "dungeon",
            dungeons: goal === "dungeon" ? await loadDungeons(supabase, character.faction) : [],
            minutes,
            from: {
              zoneId: character.zone_id,
              faction: character.faction,
              zoneFactions: new Map(zones.map((z) => [z.id, z.faction])),
            },
          },
        )
      : undefined;
    const around = group?.dungeon
      ? { ...character, zone_id: group.dungeon.zone_id }
      : group
        ? { ...character, level: Math.min(...group.info.members.map((m) => m.level)) }
        : character;
    const loaded = await loadCandidates(supabase, around);
    const { restSpots } = loaded;
    // The chosen dungeon is always on offer, even past the candidate limit.
    const candidates =
      group?.dungeon && !loaded.candidates.some((c) => c.id === group.dungeon!.id)
        ? [...loaded.candidates, { ...group.dungeon, kind: "dungeon" as const, notes: null }]
        : loaded.candidates;
    const contextJson = buildPlanContext({
      character: { ...character, zoneId: character.zone_id },
      minutes,
      goal,
      candidates,
      restSpots,
      zoneNames: new Map(zones.map((z) => [z.id, z.name])),
      group,
    });

    // 5. Ask Claude, then check everything it said.
    const generated = await generatePlan(contextJson);
    const plan = {
      ...finalizePlan(generated.plan, {
        minutes,
        candidates,
        restSpots,
        characterZoneId: around.zone_id,
      }),
      ...(group ? { group: group.info } : {}),
    };

    // 6. Save. Only the server writes plans (see the session_plans RLS policy).
    const shareId = randomBytes(16).toString("base64url");
    const { data: saved, error: saveError } = await admin
      .from("session_plans")
      .insert({
        request_id: requestId,
        profile_id: user.id,
        character_id: character.id,
        share_id: shareId,
        minutes,
        goal,
        plan,
      })
      .select("id")
      .single();
    if (saveError) throw saveError;
    await markRequest("succeeded", generated.model, generated.usage);

    const view: PlanView = {
      shareId,
      characterName: character.name,
      characterClass: character.class,
      characterLevel: character.level,
      minutes,
      goal,
      plan,
    };
    return NextResponse.json({
      planId: saved.id,
      view,
      quota: await loadQuota(supabase, user.id),
    });
  } catch (error) {
    // Failed requests don't count against the quota, but their cost is recorded.
    const usage =
      error instanceof PlanGenerationError ? error.usage : { input_tokens: 0, output_tokens: 0 };
    await markRequest("failed", CLAUDE_MODEL, usage);
    console.error("plan generation failed", error);

    if (error instanceof PlanGenerationError && error.reason === "refused") {
      return fail(422, "We couldn't plan that one. Try a different goal or time.");
    }
    return fail(
      502,
      "The planner had trouble just now. Please try again; it didn't count against your plans.",
    );
  }
}
