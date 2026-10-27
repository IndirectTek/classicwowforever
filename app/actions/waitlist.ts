"use server";

// Server Action: like a Rails controller action that the form posts to
// directly. It runs only on the server, and the form works without JavaScript.
import { createAdminClient } from "@/lib/supabase/admin";
import { UNIQUE_VIOLATION, WaitlistInput, type WaitlistState } from "@/lib/waitlist";

export async function joinWaitlist(
  _prev: WaitlistState,
  formData: FormData,
): Promise<WaitlistState> {
  const parsed = WaitlistInput.safeParse({
    email: formData.get("email"),
    website: formData.get("website") ?? undefined,
  });

  if (!parsed.success) {
    // A filled honeypot is a bot. Tell it "success" so it moves along.
    if (parsed.error.issues.some((issue) => issue.path[0] === "website")) {
      return { status: "success" };
    }
    return {
      status: "error",
      message: parsed.error.issues[0].message,
      email: String(formData.get("email") ?? ""),
    };
  }

  try {
    const { error } = await createAdminClient()
      .from("waitlist")
      .insert({ email: parsed.data.email, source: "home" });

    // An address already on the list gets the same success message as a new
    // one, so the form can't be used to check who has signed up.
    if (error && error.code !== UNIQUE_VIOLATION) throw error;
  } catch (error) {
    console.error("waitlist insert failed", error);
    return {
      status: "error",
      message: "Something went wrong on our side. Please try again.",
      email: parsed.data.email,
    };
  }

  return { status: "success" };
}
