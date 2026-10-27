"use server";

import { cookies } from "next/headers";
import { z } from "zod";
import { AFTER_SIGN_IN_COOKIE, safeNextPath } from "@/lib/safeNext";
import { createClient } from "@/lib/supabase/server";

export type LoginState =
  | { status: "idle" }
  | { status: "sent"; email: string }
  | { status: "error"; message: string; email?: string };

const LoginInput = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .pipe(z.email({ error: "That doesn't look like an email address." }).max(254)),
  next: z.string().optional(),
});

export async function sendMagicLink(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = LoginInput.safeParse({
    email: formData.get("email"),
    next: formData.get("next") ?? undefined,
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0].message,
      email: String(formData.get("email") ?? ""),
    };
  }

  const { email, next } = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true },
  });

  if (error) {
    if (error.status === 429) {
      return {
        status: "error",
        message: "We just sent you a link. Give it a minute, then try again.",
        email,
      };
    }
    console.error("signInWithOtp failed", error);
    return { status: "error", message: "We couldn't send the email. Please try again.", email };
  }

  (await cookies()).set(AFTER_SIGN_IN_COOKIE, safeNextPath(next), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60,
    path: "/",
  });

  return { status: "sent", email };
}
