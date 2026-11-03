// Quest reports from players. The form posts here first; the database checks
// the basics again. Limits match QuestEntry in lib/data/schema.ts, so an
// accepted report always fits in data/zones/*.json. Relative imports only:
// scripts/reports.mts uses this file too.
import { z } from "zod";

export const reportGames = ["forever", "classic-era"] as const;
export type ReportGame = (typeof reportGames)[number];

export const reportGameLabels: Record<ReportGame, string> = {
  forever: "WoW Forever",
  "classic-era": "Classic Era",
};

const level = z.coerce
  .number({ error: "Enter a level from 1 to 60." })
  .int({ error: "Enter a whole level." })
  .min(1, { error: "Levels start at 1." })
  .max(60, { error: "Levels stop at 60." });

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, { error: `Keep it under ${max} characters.` })
    .transform((s) => s || null);

export const QuestReportInput = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, { error: "Enter the quest's name as the game shows it." })
      .max(100, { error: "Keep the name under 100 characters." }),
    zone_id: z.string().regex(/^[a-z0-9-]+$/, { error: "Pick a zone." }),
    min_level: level,
    max_level: level,
    faction: z.enum(["alliance", "horde", "both"], { error: "Pick who can do it." }),
    // Blank means "didn't time it".
    est_minutes: z.preprocess(
      (v) => (v === "" || v === null ? undefined : v),
      z.coerce
        .number({ error: "Enter minutes as a number." })
        .int({ error: "Enter whole minutes." })
        .min(1, { error: "At least 1 minute." })
        .max(240, { error: "Longer than 4 hours? Split it into parts." })
        .optional(),
    ),
    notes: optionalText(300),
    game: z.enum(reportGames, { error: "Pick where you played it." }),
    seen_on: z.iso.date({ error: "Pick the day you played it." }),
    credit_name: optionalText(40).refine((s) => !s?.includes("@"), {
      error: "Use a name, not an email address. This is shown publicly.",
    }),
  })
  .refine((r) => r.min_level <= r.max_level, {
    path: ["max_level"],
    error: "The second level can't be below the first.",
  });

export type QuestReportInput = z.infer<typeof QuestReportInput>;

export const REPORT_FIELDS = [
  "name",
  "zone_id",
  "min_level",
  "max_level",
  "faction",
  "est_minutes",
  "notes",
  "game",
  "seen_on",
  "credit_name",
] as const;

// The data/ id for a quest: "<zone id>-<quest name as a slug>", like
// "elwynn-forest-the-lost-satchel".
export function questId(zoneId: string, name: string): string {
  const slug = name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${zoneId}-${slug}`;
}

// Quest names compared the way players type them: case, spacing and
// apostrophes don't matter.
export function sameQuestName(a: string, b: string): boolean {
  const norm = (s: string) => s.toLowerCase().replace(/['’]/g, "").replace(/\s+/g, " ").trim();
  return norm(a) === norm(b);
}
