"use server";

import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const Feedback = z.object({
  sessionPlanId: z.uuid(),
  rating: z.number().int().min(1).max(5).nullable(),
  finished: z.boolean().nullable(),
  note: z.string().trim().max(1000).nullable(),
});

export type FeedbackInput = z.infer<typeof Feedback>;

// One feedback row per plan; saving again updates it. RLS only allows
// feedback on your own plans.
export async function saveFeedback(input: FeedbackInput): Promise<{ ok: boolean }> {
  const user = await getCurrentUser();
  const parsed = Feedback.safeParse(input);
  if (!user || !parsed.success) return { ok: false };

  const { sessionPlanId, ...rest } = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.from("plan_feedback").upsert(
    { session_plan_id: sessionPlanId, ...rest, note: rest.note || null },
    {
      onConflict: "session_plan_id",
    },
  );
  if (error) console.error("saving feedback failed", error);
  return { ok: !error };
}
