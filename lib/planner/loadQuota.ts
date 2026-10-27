import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { countTowardQuota, quotaFor, type Quota } from "@/lib/quota";

// Reads with the user's own client: RLS lets people see only their requests.
export async function loadQuota(supabase: SupabaseClient, userId: string): Promise<Quota> {
  const since = new Date(Date.now() - 7 * 24 * 3600_000).toISOString();
  const [profile, requests] = await Promise.all([
    supabase.from("profiles").select("tier").eq("id", userId).single(),
    supabase.from("plan_requests").select("status, created_at").gte("created_at", since),
  ]);
  if (requests.error) throw requests.error;
  return quotaFor(profile.data?.tier ?? "free", countTowardQuota(requests.data, Date.now()));
}
