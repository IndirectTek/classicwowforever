import { FREE_PLANS_PER_WEEK } from "./config";

export type Quota =
  { unlimited: true } | { unlimited: false; used: number; limit: number; remaining: number };

// Mirrors the counting rule in reserve_plan_request(): succeeded plans in the
// last 7 days, plus pending ones still plausibly in flight.
export function countTowardQuota(
  requests: { status: string; created_at: string }[],
  now: number,
): number {
  const weekAgo = now - 7 * 24 * 3600_000;
  const fiveMinutesAgo = now - 5 * 60_000;
  return requests.filter((r) => {
    const at = Date.parse(r.created_at);
    if (at <= weekAgo) return false;
    return r.status === "succeeded" || (r.status === "pending" && at > fiveMinutesAgo);
  }).length;
}

export function quotaFor(tier: string, used: number, limit = FREE_PLANS_PER_WEEK): Quota {
  if (tier === "supporter") return { unlimited: true };
  return { unlimited: false, used, limit, remaining: Math.max(0, limit - used) };
}

export function quotaLabel(quota: Quota): string {
  if (quota.unlimited) return "Unlimited plans";
  if (quota.remaining === 0) return "No free plans left this week";
  return `${quota.remaining} of ${quota.limit} free plans left this week`;
}
