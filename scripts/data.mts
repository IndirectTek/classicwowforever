// Game data commands.
//
//   pnpm data:check                      validate data/zones/*.json
//   pnpm data:sync -- --local            sync into local Supabase (dry run)
//   pnpm data:sync -- --local --yes      ...and write it
//   pnpm data:sync -- --production       dry run against production
//   pnpm data:sync -- --production --yes ...and write it
//   add --prune to also delete quests and rest spots no longer in the files
//
// Without --local or --production, credentials come from the environment
// (NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY), which is how CI runs it.
// Zones are never deleted by a sync: characters point at them.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { loadGameData, type GameData } from "../lib/data/load";

const ROOT = join(import.meta.dirname, "..");
const args = new Set(process.argv.slice(2));
const command = process.argv[2];

function check(): GameData {
  const { data, errors } = loadGameData(join(ROOT, "data/zones"));
  if (errors.length) {
    console.error(`✗ ${errors.length} problem(s) in data/zones:\n`);
    for (const e of errors) console.error(`  ${e}`);
    process.exit(1);
  }
  const verified = data.quests.filter((q) => q.verified).length;
  console.log(
    `✓ ${data.zones.length} zones, ${data.links.length} links, ${data.restSpots.length} rest spots, ` +
      `${data.quests.length} quests (${verified} verified)`,
  );
  return data;
}

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

function target(): { client: SupabaseClient; label: string } {
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

type Table = "game_zones" | "zone_links" | "rest_spots" | "game_quests";
type Row = Record<string, unknown>;

const keyOf = (table: Table, row: Row) =>
  table === "zone_links" ? `${row.zone_a}|${row.zone_b}` : String(row.id);

async function diff(client: SupabaseClient, table: Table, wanted: Row[]) {
  const columns = Object.keys(wanted[0] ?? { id: 1 });
  const { data, error } = await client.from(table).select(columns.join(", "));
  if (error) throw error;
  const existing = new Map((data as unknown as Row[]).map((r) => [keyOf(table, r), r]));
  const wantedKeys = new Set(wanted.map((r) => keyOf(table, r)));

  const add = wanted.filter((r) => !existing.has(keyOf(table, r)));
  const change = wanted.filter((r) => {
    const current = existing.get(keyOf(table, r));
    return current && columns.some((c) => (current[c] ?? null) !== (r[c] ?? null));
  });
  const remove = [...existing.values()].filter((r) => !wantedKeys.has(keyOf(table, r)));
  return { add, change, remove };
}

async function sync() {
  const data = check();
  const { client, label } = target();
  const write = args.has("--yes");
  const prune = args.has("--prune");
  console.log(`\nSyncing into ${label}${write ? "" : " (dry run)"}\n`);

  // Parents before children, so foreign keys always resolve.
  const plan: [Table, Row[]][] = [
    ["game_zones", data.zones],
    ["zone_links", data.links],
    ["rest_spots", data.restSpots],
    ["game_quests", data.quests],
  ];

  let changes = 0;
  for (const [table, rows] of plan) {
    const { add, change, remove } = await diff(client, table, rows);
    const prunable = table !== "game_zones";
    console.log(
      `${table.padEnd(12)} +${add.length} added  ~${change.length} changed  ` +
        (prunable ? `-${prune ? remove.length : 0} removed` : "") +
        (remove.length && (!prune || !prunable) ? `  (${remove.length} only in the database)` : ""),
    );
    for (const r of [...add, ...change].slice(0, 10)) console.log(`    ${keyOf(table, r)}`);
    changes += add.length + change.length + (prune && prunable ? remove.length : 0);

    if (!write) continue;
    const upserts = [...add, ...change];
    if (upserts.length) {
      const onConflict = table === "zone_links" ? "zone_a,zone_b" : "id";
      const { error } = await client.from(table).upsert(upserts, { onConflict });
      if (error) throw error;
    }
    if (prune && prunable && remove.length) {
      if (table === "zone_links") {
        for (const r of remove) {
          const { error } = await client
            .from(table)
            .delete()
            .match({ zone_a: r.zone_a, zone_b: r.zone_b });
          if (error) throw error;
        }
      } else {
        const { error } = await client
          .from(table)
          .delete()
          .in(
            "id",
            remove.map((r) => r.id),
          );
        if (error) throw error;
      }
    }
  }

  if (!changes) console.log("\nAlready in sync.");
  else if (!write) console.log(`\n${changes} change(s). Re-run with --yes to apply.`);
  else console.log(`\nApplied ${changes} change(s).`);
}

try {
  if (command === "check") check();
  else if (command === "sync") await sync();
  else {
    console.error(
      "Usage: tsx scripts/data.mts check | sync [--local | --production] [--yes] [--prune]",
    );
    process.exit(1);
  }
} catch (error) {
  console.error(`✗ ${(error as Error).message}`);
  process.exit(1);
}
