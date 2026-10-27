// Server-only Supabase client using the secret key. It bypasses Row Level
// Security, so it must never be imported by a Client Component; the
// "server-only" import makes that a build error instead of a leaked key.
//
// Milestone 2 adds lib/supabase/server.ts and browser.ts, which act as the
// signed-in user and are the right choice for anything user-owned.
import "server-only";
import { createClient } from "@supabase/supabase-js";

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secretKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY must be set");
  }

  return createClient(url, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
