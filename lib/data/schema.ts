// The format of data/zones/*.json, the reviewed source of truth for game
// data. Relative imports only: this file is also used by scripts/data.ts,
// which runs outside Next.js.
import { z } from "zod";

const slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
  error: "Use lowercase letters, numbers and single hyphens (like goldshire-inn).",
});

const levels = z
  .tuple([z.number().int().min(1).max(60), z.number().int().min(1).max(60)])
  .refine(([min, max]) => min <= max, { error: "The first level can't be above the second." })
  .describe("[lowest, highest] level, 1 to 60");

// Where a fact came from. Our own play, official patch notes, or a draft a
// data keeper hasn't confirmed yet. Never wikis or other databases.
const source = z
  .string()
  .regex(/^(play|patch-notes|draft)-\d{4}-\d{2}-\d{2}$/, {
    error: 'Use "play-YYYY-MM-DD", "patch-notes-YYYY-MM-DD" or "draft-YYYY-MM-DD".',
  })
  .describe("play-YYYY-MM-DD for your own play, patch-notes-YYYY-MM-DD, or draft-YYYY-MM-DD");

const provenance = {
  verified: z.boolean().describe("true once someone has confirmed it in WoW Forever"),
  source,
  contributor: z
    .string()
    .trim()
    .min(1)
    .max(40)
    .optional()
    .describe("Who added or last confirmed it (your display name)"),
};

// Entries seen in play must say who saw them.
function requireContributor<T extends { source: string; contributor?: string }>(
  entry: T,
  ctx: z.RefinementCtx,
) {
  if (entry.source.startsWith("play-") && !entry.contributor) {
    ctx.addIssue({
      code: "custom",
      path: ["contributor"],
      message: "Entries from play need a contributor.",
    });
  }
}

export const RestSpotEntry = z
  .object({
    id: slug,
    name: z.string().trim().min(2).max(80),
    kind: z.enum(["inn", "city"]),
    faction: z.enum(["alliance", "horde", "both"]),
    ...provenance,
  })
  .strict()
  .superRefine(requireContributor);

export const QuestEntry = z
  .object({
    id: slug.describe("<zone id>-<quest name>, e.g. elwynn-forest-the-lost-satchel"),
    name: z.string().trim().min(2).max(100),
    levels,
    faction: z.enum(["alliance", "horde", "both"]),
    kind: z.enum(["quest", "dungeon"]).default("quest"),
    estMinutes: z
      .number()
      .int()
      .min(1)
      .max(240)
      .optional()
      .describe("Typical time for an average player, not a speedrunner"),
    notes: z.string().trim().max(300).optional().describe("Short, useful facts for planning"),
    ...provenance,
  })
  .strict()
  .superRefine(requireContributor);

export const ZoneFile = z
  .object({
    $schema: z.string().optional(),
    id: slug,
    name: z.string().trim().min(2).max(60),
    levels,
    faction: z.enum(["alliance", "horde", "contested"]),
    kind: z.enum(["zone", "city"]),
    neighbors: z.array(slug).describe("Ids of zones you can walk or ride to directly"),
    restSpots: z.array(RestSpotEntry),
    quests: z.array(QuestEntry),
    ...provenance,
  })
  .strict()
  .superRefine(requireContributor);

export type ZoneFile = z.infer<typeof ZoneFile>;
export type QuestEntry = z.infer<typeof QuestEntry>;
export type RestSpotEntry = z.infer<typeof RestSpotEntry>;
