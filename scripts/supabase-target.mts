// Which Supabase project a script talks to, shared by scripts/data.mts and
// scripts/reports.mts:
//
//   --local       .env.development.local (written by `pnpm db:env`)
//   --production  .env.local (production values; never used by `pnpm dev`)
//   neither       the environment (NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY), as in CI
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const ROOT = join(import.meta.dirname, "..");

function readEnvFile(file: string): Record<string, string> {
  const path = join(ROOT, file);
  if (!existsSync(path)) throw new Error(`${file} not found`);
  return Object.fromEntries(
    readFileSync(path, "utf8")
      .split("\n")
      .filter((line) => /^[A-Z0-9_]+=/.test(line))
      .map((line) => {
        const at = line.indexOf("=");
        return [
          line.slice(0, at),
          line
            .slice(at + 1)
            .trim()
            .replace(/^"|"$/g, ""),
        ];
      }),
  );
}

export function supabaseTarget(args: Set<string>): { client: SupabaseClient; label: string } {
  const env = args.has("--local")
    ? readEnvFile(".env.development.local")
    : args.has("--production")
      ? readEnvFile(".env.local")
      : (process.env as Record<string, string>);
  // .env.local from the Vercel integration may only have SUPABASE_URL.
  const url = env.NEXT_PUBLIC_SUPABASE_URL?.startsWith("http")
    ? env.NEXT_PUBLIC_SUPABASE_URL
    : env.SUPABASE_URL;
  const key = env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error("Need the Supabase URL and SUPABASE_SECRET_KEY");
  const label = args.has("--local")
    ? "local"
    : args.has("--production")
      ? "production"
      : "environment";
  return {
    client: createClient(url, key, { auth: { persistSession: false } }),
    label: `${label} (${new URL(url).host})`,
  };
}
