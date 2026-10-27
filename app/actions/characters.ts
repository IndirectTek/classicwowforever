"use server";

// Character create, update and delete. Every query runs as the signed-in
// user, so Row Level Security makes it impossible to touch someone else's
// characters even if an id is tampered with.
import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { CharacterInput } from "@/lib/characters";
import { getCurrentUser } from "@/lib/auth";
import { sharedPlanTag } from "@/lib/plans";
import { createClient } from "@/lib/supabase/server";

export type CharacterFormState =
  | { status: "idle" }
  | { status: "saved" }
  | {
      status: "error";
      message: string;
      fieldErrors?: Record<string, string>;
      // What was submitted, so the form can show it again (React resets
      // a form's fields after its action runs).
      values?: Record<string, string>;
    };

const FIELDS = ["name", "realm", "faction", "race", "class", "level", "zone_id"] as const;

export async function saveCharacter(
  _prev: CharacterFormState,
  formData: FormData,
): Promise<CharacterFormState> {
  const user = await getCurrentUser();
  if (!user) return { status: "error", message: "Your session ended. Sign in again." };

  const parsed = CharacterInput.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "form");
      fieldErrors[key] ??= issue.message;
    }
    const values = Object.fromEntries(FIELDS.map((f) => [f, String(formData.get(f) ?? "")]));
    return { status: "error", message: "Check the highlighted fields.", fieldErrors, values };
  }

  const id = formData.get("id");
  const supabase = await createClient();
  const { error } =
    typeof id === "string" && id
      ? await supabase
          .from("characters")
          .update({ ...parsed.data, updated_at: new Date().toISOString() })
          .eq("id", id)
      : await supabase.from("characters").insert({ ...parsed.data, profile_id: user.id });

  if (error) {
    console.error("saving character failed", error);
    return { status: "error", message: "We couldn't save that character. Please try again." };
  }

  revalidatePath("/characters", "layout");
  // The planner lists characters too (and may have sent you here to add one).
  revalidatePath("/plan");
  return { status: "saved" };
}

export async function deleteCharacter(characterId: string): Promise<void> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const supabase = await createClient();

  // Collect share ids first: the delete cascades to plans, and their public
  // links are cached, so drop those caches right away.
  const { data: plans } = await supabase
    .from("session_plans")
    .select("share_id")
    .eq("character_id", characterId);

  const { error } = await supabase.from("characters").delete().eq("id", characterId);
  if (error) {
    console.error("deleting character failed", error);
    throw new Error("We couldn't delete that character. Please try again.");
  }

  for (const plan of plans ?? []) updateTag(sharedPlanTag(plan.share_id));
  revalidatePath("/characters", "layout");
  redirect("/characters");
}
