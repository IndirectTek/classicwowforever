import { z } from "zod";
import { classes, factions, raceIds, races } from "./game";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((s) => s || null)
    .nullable()
    .optional();

// Validates the character form. Like a Rails model's validations, but run in
// the Server Action before anything reaches the database (which re-checks
// the basics with its own constraints).
export const CharacterInput = z
  .object({
    // WoW names: 2 to 12 letters, accented letters allowed, no spaces or digits.
    name: z
      .string()
      .trim()
      .regex(/^\p{L}{2,12}$/u, { error: "Names are 2 to 12 letters, with no spaces or numbers." }),
    realm: optionalText(40),
    faction: z.enum(factions),
    race: z.enum(raceIds as [string, ...string[]]),
    class: z.enum(classes),
    level: z.coerce.number().int().min(1).max(60, { error: "Level is 1 to 60." }),
    zone_id: optionalText(64),
  })
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
  id: string;
  updated_at: string;
  last_plan_at?: string | null;
};
