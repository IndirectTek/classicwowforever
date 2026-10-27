import { cacheLife, cacheTag } from "next/cache";
import { EXAMPLE_SHARE_ID, examplePlan } from "./examplePlan";
import { goals, StoredPlan, type Goal, type PlanView } from "./schema";
import { createPublicClient } from "./supabase/public";

// Share ids are long random strings; anything else can't be a real plan.
const SHARE_ID = /^[A-Za-z0-9_-]{16,64}$/;

export function sharedPlanTag(shareId: string) {
  return `shared-plan-${shareId}`;
}

// A shared plan never changes after it's created, so cache it for days, like
// Rails.cache.fetch with a long expiry. When a plan or its character is
// deleted, call revalidateTag(sharedPlanTag(shareId)) to drop it right away.
export async function getPlanView(shareId: string): Promise<PlanView | null> {
  "use cache";
  cacheTag(sharedPlanTag(shareId));
  cacheLife("days");

  if (shareId === EXAMPLE_SHARE_ID) return examplePlan;
  if (!SHARE_ID.test(shareId)) return null;

  const supabase = createPublicClient();
  if (!supabase) return null;

  const { data, error } = await supabase.rpc("get_shared_plan", { p_share_id: shareId });
  if (error) throw error;

  const row = Array.isArray(data) ? data[0] : null;
  if (!row) return null;

  const plan = StoredPlan.safeParse(row.plan);
  if (!plan.success || !goals.includes(row.goal)) return null;

  return {
    shareId,
    characterName: row.character_name,
    characterClass: row.character_class,
    characterLevel: row.character_level,
    minutes: row.minutes,
    goal: row.goal as Goal,
    plan: plan.data,
  };
}
