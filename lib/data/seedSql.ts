// Generates supabase/seed.sql from the data files, so local databases start
// with exactly the reviewed data. Run `pnpm data:generate` after editing data/.
import type { GameData } from "./load";

type Row = Record<string, string | number | boolean | null>;

function literal(value: Row[string]): string {
  if (value === null) return "null";
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return `'${value.replaceAll("'", "''")}'`;
}

function insert(table: string, rows: Row[]): string {
  if (rows.length === 0) return `-- (no rows for ${table} yet)\n`;
  const columns = Object.keys(rows[0]);
  const values = rows.map((r) => `  (${columns.map((c) => literal(r[c])).join(", ")})`);
  return `insert into public.${table} (${columns.join(", ")}) values\n${values.join(",\n")};\n`;
}

export function seedSql(data: GameData): string {
  return [
    "-- GENERATED from data/zones/*.json by `pnpm data:generate`. Do not edit by hand:",
    "-- change the data files and regenerate. Applied by `supabase start` and",
    "-- `supabase db reset` for local development.",
    "",
    insert("game_zones", data.zones),
    insert("zone_links", data.links),
    insert("rest_spots", data.restSpots),
    insert("game_quests", data.quests),
  ].join("\n");
}
