// The sign-in email links here. Like a Rails controller action that consumes
// a one-time token: verify it, set the session cookie, redirect onward.
import type { EmailOtpType } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { AFTER_SIGN_IN_COOKIE, safeNextPath } from "@/lib/safeNext";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const cookieStore = await cookies();

  if (tokenHash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });

    if (!error) {
      // Prefer where the visitor was headed when they asked for the link.
      const next = safeNextPath(
        cookieStore.get(AFTER_SIGN_IN_COOKIE)?.value ?? searchParams.get("next"),
      );
      cookieStore.delete(AFTER_SIGN_IN_COOKIE);
      return NextResponse.redirect(new URL(next, request.url));
    }
  }

  // Expired, already used, or mangled by an email client.
  return NextResponse.redirect(new URL("/login?error=link", request.url));
}
