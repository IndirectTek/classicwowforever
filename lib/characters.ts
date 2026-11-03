import { z } from "zod";
import { classes, factions, raceIds, races, rulesetLabels, rulesets } from "./game";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((s) => s || null)
    .nullable()
    .optional();

// One part of a WoW name: 2 to 12 letters, accented letters allowed, no
// spaces or digits.
const NAME_PART = /^\p{L}{2,12}$/u;

// Validates the character form. Like a Rails model's validations, but run in
// the Server Action before anything reaches the database (which re-checks
// the basics with its own constraints).
export const CharacterInput = z
  .object({
    first_name: z
      .string()
      .trim()
      .regex(NAME_PART, { error: "Names are 2 to 12 letters, with no spaces or numbers." }),
    // WoW Forever characters have a last name too. Optional here, so a
    // character can be added before the player has picked one.
    last_name: z
      .string()
      .trim()
      .refine((s) => s === "" || NAME_PART.test(s), {
        error: "Last names are 2 to 12 letters, with no spaces or numbers.",
      })
      .optional(),
    ruleset: z
      .enum(rulesets)
      .or(z.literal("").transform(() => null))
      .nullable()
      .optional(),
    faction: z.enum(factions),
    race: z.enum(raceIds as [string, ...string[]]),
    class: z.enum(classes),
    level: z.coerce.number().int().min(1).max(60, { error: "Level is 1 to 60." }),
    zone_id: optionalText(64),
  })
  .transform(({ first_name, last_name, ...rest }) => ({
    ...rest,
    // Stored as one name, "First Last" (see the characters migration).
    name: last_name ? `${first_name} ${last_name}` : first_name,
  }))
  .superRefine((c, ctx) => {
    const race = races[c.race as keyof typeof races];
    if (race.faction !== c.faction) {
      ctx.addIssue({
        code: "custom",
        path: ["race"],
        message: `${race.label} isn't ${c.faction}.`,
      });
    } else if (!(race.classes as readonly string[]).includes(c.class)) {
      ctx.addIssue({
        code: "custom",
        path: ["class"],
        message: `${race.label} characters can't be ${c.class}s.`,
      });
    }
  });

export type CharacterInput = z.infer<typeof CharacterInput>;

export type Character = CharacterInput & {
  // Free text from before WoW Forever dropped realms; no longer edited.
  realm?: string | null;
  id: string;
  updated_at: string;
  last_plan_at?: string | null;
};

// "PvP ruleset" for display, or the realm typed in before rulesets existed.
export function rulesetText(c: Pick<Character, "ruleset" | "realm">): string | null {
  if (c.ruleset) return `${rulesetLabels[c.ruleset]} ruleset`;
  return c.realm ?? null;
}
