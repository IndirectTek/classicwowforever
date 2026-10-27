"use server";

// Save and withdraw quest reports. Runs as the signed-in user, so RLS makes
// sure reports are only ever added to (or removed from) your own account.
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { QuestReportInput, REPORT_FIELDS, sameQuestName } from "@/lib/reports";
import { createClient } from "@/lib/supabase/server";

export type ReportFormState =
  | { status: "idle" }
  | {
      status: "saved";
      name: string;
      kind: "new" | "correction";
      // Kept for the next report: most people report several in one zone.
      values: Record<string, string>;
    }
  | {
      status: "error";
      message: string;
      fieldErrors?: Record<string, string>;
      // What was submitted, so the form can show it again.
      values?: Record<string, string>;
    };

export async function submitReport(
  _prev: ReportFormState,
  formData: FormData,
): Promise<ReportFormState> {
  const values = Object.fromEntries(REPORT_FIELDS.map((f) => [f, String(formData.get(f) ?? "")]));
  const user = await getCurrentUser();
  if (!user) return { status: "error", message: "Your session ended. Sign in again.", values };

  const parsed = QuestReportInput.safeParse(values);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[String(issue.path[0] ?? "form")] ??= issue.message;
    }
    return { status: "error", message: "Check the highlighted fields.", fieldErrors, values };
  }
  const report = parsed.data;

  // Already in our data? Then this is a correction to that quest.
  const supabase = await createClient();
  const { data: existing, error: lookupError } = await supabase
    .from("game_quests")
    .select("id, name")
    .eq("zone_id", report.zone_id);
  if (lookupError) {
    console.error("looking up quests failed", lookupError);
    return { status: "error", message: "We couldn't save that report. Please try again.", values };
  }
  const match = existing.find((q) => sameQuestName(q.name, report.name));

  const { error } = await supabase.from("quest_reports").insert({
    ...report,
    est_minutes: report.est_minutes ?? null,
    profile_id: user.id,
    kind: match ? "correction" : "new",
    quest_id: match?.id ?? null,
  });

  if (error) {
    if (error.message.includes("report_limit")) {
      return {
        status: "error",
        message: "That's 40 reports today. Thank you! Come back tomorrow for more.",
        values,
      };
    }
    if (error.message.includes("seen_on_in_future") || error.code === "23503") {
      return {
        status: "error",
        message: "Check the zone and the date.",
        values,
      };
    }
    console.error("saving report failed", error);
    return { status: "error", message: "We couldn't save that report. Please try again.", values };
  }

  revalidatePath("/report");
  return { status: "saved", name: report.name, kind: match ? "correction" : "new", values };
}

export async function withdrawReport(reportId: string): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;
  const supabase = await createClient();
  // RLS limits this to your own reports that haven't been reviewed yet.
  const { error } = await supabase.from("quest_reports").delete().eq("id", reportId);
  if (error) console.error("withdrawing report failed", error);
  revalidatePath("/report");
}
