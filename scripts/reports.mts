// Review players' quest reports.
//
//   pnpm reports -- --production                  list reports waiting for review
//   pnpm reports apply -- --production            add new quests to data/zones/*.json
//   pnpm reports close applied <id...> -- --production
//                                                 mark reports done (also: rejected, duplicate)
//
// `apply` only edits files; open a pull request with the diff as usual, and
// close the reports once it merges. Corrections are listed but never applied
// automatically: compare them with the quest in the file and edit by hand.
// Ids can be shortened to their first 8 characters.
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { format, resolveConfig } from "prettier";
import { applyNewQuestReports, type ReportRow } from "../lib/data/fromReports";
import type { ZoneFile } from "../lib/data/schema";
import { supabaseTarget } from "./supabase-target.mjs";

const ROOT = join(import.meta.dirname, "..");
const ZONES_DIR = join(ROOT, "data/zones");
const argv = process.argv.slice(2).filter((a) => a !== "--");
const flags = new Set(argv.filter((a) => a.startsWith("--")));
const [command = "list", ...rest] = argv.filter((a) => !a.startsWith("--"));
const STATUSES = ["applied", "rejected", "duplicate"];

const short = (id: string) => id.slice(0, 8);

async function pending(): Promise<ReportRow[]> {
  const { client } = supabaseTarget(flags);
  const { data, error } = await client
    .from("quest_reports")
    .select(
      "id, kind, quest_id, game, name, zone_id, min_level, max_level, faction, est_minutes, notes, seen_on, credit_name, created_at",
    )
    .eq("status", "new")
    .order("zone_id")
    .order("created_at");
  if (error) throw error;
  return data as ReportRow[];
}

function describe(r: ReportRow): string {
  const parts = [
    `${r.min_level}-${r.max_level}`,
    r.faction,
    r.est_minutes ? `${r.est_minutes} min` : null,
    r.game === "classic-era" ? "Classic Era" : "Forever",
    r.seen_on,
    r.credit_name ?? "community",
  ].filter(Boolean);
  const note = r.notes ? `\n             "${r.notes}"` : "";
  const target = r.kind === "correction" ? `  (correction to ${r.quest_id})` : "";
  return `  ${short(r.id)}  ${r.name}${target}\n             ${parts.join(" · ")}${note}`;
}

async function list() {
  const reports = await pending();
  const { label } = supabaseTarget(flags);
  if (!reports.length) {
    console.log(`No reports waiting in ${label}.`);
    return;
  }
  console.log(`${reports.length} report(s) waiting in ${label}:\n`);
  let zone = "";
  for (const r of reports) {
    if (r.zone_id !== zone) console.log(`${(zone = r.zone_id)}`);
    console.log(describe(r));
  }
  console.log("\n`pnpm reports apply` adds the new quests to data/zones/.");
}

function readZoneFiles(): Map<string, { file: string; zone: ZoneFile }> {
  // Raw objects, not parsed ones, so writing back keeps each file's key order.
  return new Map(
    readdirSync(ZONES_DIR)
      .filter((f) => f.endsWith(".json"))
      .map((f) => {
        const zone = JSON.parse(readFileSync(join(ZONES_DIR, f), "utf8")) as ZoneFile;
        return [zone.id, { file: join(ZONES_DIR, f), zone }];
      }),
  );
}

async function apply() {
  const reports = await pending();
  const files = readZoneFiles();
  const result = applyNewQuestReports(new Map([...files].map(([id, f]) => [id, f.zone])), reports);

  for (const [id, zone] of result.zones) {
    const file = files.get(id)!.file;
    const options = (await resolveConfig(file)) ?? {};
    writeFileSync(
      file,
      await format(JSON.stringify(zone, null, 2), { ...options, filepath: file }),
    );
  }

  if (result.applied.length) {
    console.log(`Added ${result.applied.length} quest(s):`);
    for (const { report, entry } of result.applied) {
      console.log(`  ${short(report.id)}  ${entry.id}`);
    }
  }
  if (result.duplicates.length) {
    console.log(`\nAlready in the data (probably "duplicate"):`);
    for (const { report, existingId } of result.duplicates) {
      console.log(`  ${short(report.id)}  ${existingId}`);
    }
  }
  if (result.unknownZone.length) {
    console.log(`\nNo zone file for these yet:`);
    for (const r of result.unknownZone) console.log(`  ${short(r.id)}  ${r.zone_id}: ${r.name}`);
  }
  const corrections = reports.filter((r) => r.kind === "correction");
  if (corrections.length) {
    console.log(`\nCorrections to check by hand:`);
    for (const r of corrections) console.log(describe(r));
  }
  if (!reports.length) console.log("No reports waiting.");
  else if (result.applied.length) {
    const ids = result.applied.map(({ report }) => short(report.id)).join(" ");
    console.log(
      `\nNext: review the diff, check names and levels, run \`pnpm data:check\` and open a PR.` +
        `\nOnce it merges: pnpm reports close applied ${ids}`,
    );
  }
}

async function close() {
  const [status, ...prefixes] = rest;
  if (!STATUSES.includes(status) || !prefixes.length) usage();
  const reports = await pending();
  const ids = prefixes.map((p) => {
    const matches = reports.filter((r) => r.id.startsWith(p));
    if (matches.length !== 1) {
      throw new Error(`"${p}" matches ${matches.length} waiting reports; use more of the id`);
    }
    return matches[0].id;
  });
  const { client, label } = supabaseTarget(flags);
  const { error } = await client.from("quest_reports").update({ status }).in("id", ids);
  if (error) throw error;
  console.log(`Marked ${ids.length} report(s) ${status} in ${label}.`);
}

function usage(): never {
  console.error(
    "Usage: tsx scripts/reports.mts [list | apply | close <applied|rejected|duplicate> <id...>] [--local | --production]",
  );
  process.exit(1);
}

try {
  if (command === "list") await list();
  else if (command === "apply") await apply();
  else if (command === "close") await close();
  else usage();
} catch (error) {
  console.error(`✗ ${(error as Error).message}`);
  process.exit(1);
}
