import "server-only";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { safeNextPath } from "./safeNext";
import { createClient } from "./supabase/server";

export type CurrentUser = { id: string; email: string | null };

// The signed-in user, or null. getClaims() verifies the session token rather
// than trusting the cookie, so this is safe to use for authorization.
export async function getCurrentUser(): Promise<CurrentUser | null> {
  // Session checks are per request (and Supabase reads the clock to check
  // token expiry), so tell Next.js up front that this can't be prerendered.
  await connection();
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return null;

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) return null;

  return { id: claims.sub, email: typeof claims.email === "string" ? claims.email : null };
}

// Like a Rails `before_action :authenticate_user!`: sends visitors to sign in,
// then back to `returnTo` afterwards.
export async function requireUser(returnTo: string): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(safeNextPath(returnTo))}`);
  return user;
}
