// Reads a one-line description of tonight's session, like "45 minutes on my
// level 12 dwarf hunter in Loch Modan, want gold", and picks out what the
// planner form needs. Plain pattern matching, no model call: it's free,
// instant, works before sign-in, and anything it misses the player can pick
// on the form. Shared by the home page preview and /plan.
import { classes, races, raceIds, type CharacterClass, type Faction, type Race } from "./game";
import { MINUTES_MAX, MINUTES_MIN, type Goal } from "./schema";

export const PROMPT_MAX = 200;

export type ParsedPrompt = {
  minutes?: number;
  goal?: Goal;
  level?: number;
  race?: Race;
  class?: CharacterClass;
  faction?: Faction;
  zoneId?: string;
  // Playing with other people tonight ("with friends", "our group", "duo").
  withGroup?: boolean;
};

const groupPattern =
  /\b(group|party|friends?|buddies|buddy|duo|trio|guild ?mates?|with (my|our) (wife|husband|partner|kids?|son|daughter|brother|sister|mates?|crew|guild))\b/;

type ZoneName = { id: string; name: string };

const raceWords: Record<Race, string[]> = {
  human: ["human", "humans"],
  dwarf: ["dwarf", "dwarves", "dwarven", "dwarfs"],
  "night-elf": ["night elf", "night-elf", "nightelf", "nelf", "night elves"],
  gnome: ["gnome", "gnomes", "gnomish"],
  orc: ["orc", "orcs", "orcish"],
  undead: ["undead", "forsaken"],
  tauren: ["tauren"],
  troll: ["troll", "trolls"],
};

const classWords: Record<CharacterClass, string[]> = {
  warrior: ["warrior", "warr", "warriors"],
  paladin: ["paladin", "pally", "pali", "paladins"],
  hunter: ["hunter", "hunters"],
  rogue: ["rogue", "rogues"],
  priest: ["priest", "priests"],
  shaman: ["shaman", "shammy", "shamans"],
  mage: ["mage", "mages"],
  warlock: ["warlock", "lock", "warlocks"],
  druid: ["druid", "druids"],
};

// Earliest mention wins when a note names more than one goal.
const goalPatterns: [Goal, RegExp][] = [
  [
    "dungeon",
    /\b(dungeons?|instances?|group|party|deadmines|wailing caverns|ragefire|shadowfang|stockades?|blackfathom|gnomeregan|razorfen|scarlet monastery|uldaman)\b/,
  ],
  ["gear", /\b(gear|upgrades?|loot|items?|weapons?|armou?r)\b/],
  ["gold", /\b(gold|money|cash|coin|farm(ing)?|auction( house)?|ah|profit)\b/],
  [
    "relaxed",
    /\b(relax(ed|ing)?|chill(ing)?|cozy|cosy|easy|lazy|casual|fish(ing)?|explor(e|ing)|unwind|wind down)\b/,
  ],
  [
    "xp",
    /\b(xp|exp|experience|ding|grind(ing)?|lvling|level(l?ing)? up|level(l?ing)\b|to level)\b/,
  ],
];

const numberWords: Record<string, number> = {
  a: 1,
  an: 1,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
};

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function wordsPattern(words: string[]): string {
  return words
    .map(escape)
    .sort((a, b) => b.length - a.length)
    .join("|");
}

function findFirst<K extends string>(
  text: string,
  table: Record<K, string[]>,
): { key: K; index: number } | null {
  let best: { key: K; index: number } | null = null;
  for (const key of Object.keys(table) as K[]) {
    const match = new RegExp(`\\b(${wordsPattern(table[key])})\\b`).exec(text);
    if (match && (!best || match.index < best.index)) best = { key, index: match.index };
  }
  return best;
}

function parseMinutes(text: string): number | undefined {
  // A number before a unit: digits ("2h", "1.5 hrs") or a word ("an hour",
  // "two hours"). Words need a space, so "ah" (auction house) isn't an hour.
  const n = "(?:(\\d+(?:\\.\\d+)?)\\s*|(an?|one|two|three|four|five|six)\\s+)";
  const hours = "(?:h|hr|hrs|hours?)";
  const mins = "(?:m|min|mins|minutes?)";
  const count = (m: RegExpExecArray) => (m[2] ? numberWords[m[2]] : Number(m[1]));

  // "an hour and a half", "1 hour and a half"
  let m = new RegExp(`\\b${n}${hours}\\s*and\\s*a\\s*half\\b`).exec(text);
  if (m) return count(m) * 60 + 30;
  // "half an hour"
  if (/\bhalf\s*(an?\s*)?hour\b/.test(text)) return 30;
  // "1h30", "1 hour 15 minutes", "2 hours and 10 min"
  m = new RegExp(`\\b${n}${hours}\\s*(?:and\\s*)?(\\d+)\\s*${mins}?\\b`).exec(text);
  if (m) return Math.round(count(m) * 60) + Number(m[3]);
  // "2 hours", "1.5 hrs", "an hour"
  m = new RegExp(`\\b${n}${hours}\\b`).exec(text);
  if (m) return Math.round(count(m) * 60);
  // "45 minutes", "45m", "45 min"
  m = new RegExp(`\\b(\\d+)\\s*${mins}\\b`).exec(text);
  if (m) return Number(m[1]);
  return undefined;
}

function parseLevel(text: string, characterWords: string): number | undefined {
  const m =
    /\b(?:level|lvl|lv|lev)\s*(\d{1,2})\b/.exec(text) ??
    /\b(\d{1,2})(?:st|nd|rd|th)?\s*level\b/.exec(text) ??
    // "my 24 rogue", "a 12 night elf hunter"
    new RegExp(`\\b(\\d{1,2})\\s+(?:${characterWords})\\b`).exec(text);
  const level = m ? Number(m[1]) : NaN;
  return level >= 1 && level <= 60 ? level : undefined;
}

// "Elwynn Forest" also matches "elwynn"; "The Barrens" matches "barrens".
export function zoneAliases(name: string): string[] {
  const full = name.toLowerCase();
  const short = full
    .replace(/^the\s+/, "")
    .replace(/\s+(forest|mountains|glades|city|hills|highlands|marsh|vale)$/, "");
  return [...new Set([full, full.replace(/^the\s+/, ""), short])].filter((a) => a.length >= 4);
}

function parseZone(text: string, zones: ZoneName[]): string | undefined {
  let best: { id: string; index: number; length: number } | undefined;
  for (const zone of zones) {
    for (const alias of zoneAliases(zone.name)) {
      const match = new RegExp(`\\b${escape(alias)}\\b`).exec(text);
      // Earliest, then longest ("stormwind city" over "stormwind").
      if (
        match &&
        (!best ||
          match.index < best.index ||
          (match.index === best.index && alias.length > best.length))
      ) {
        best = { id: zone.id, index: match.index, length: alias.length };
      }
    }
  }
  return best?.id;
}

export function parseSessionPrompt(input: string, zones: ZoneName[]): ParsedPrompt {
  const text = input.slice(0, PROMPT_MAX).toLowerCase().replace(/[’]/g, "'");
  const result: ParsedPrompt = {};

  const minutes = parseMinutes(text);
  if (minutes !== undefined && minutes > 0) {
    result.minutes = Math.min(MINUTES_MAX, Math.max(MINUTES_MIN, minutes));
  }

  const race = findFirst(text, raceWords);
  const charClass = findFirst(text, classWords);
  if (race) {
    result.race = race.key;
    result.faction = races[race.key].faction;
  }
  // Only keep a class the race can be ("tauren rogue" is a typo, not a plan).
  if (
    charClass &&
    (!race || (races[race.key].classes as readonly string[]).includes(charClass.key))
  ) {
    result.class = charClass.key;
  }

  const characterWords = wordsPattern([
    ...raceIds.flatMap((r) => raceWords[r]),
    ...classes.flatMap((c) => classWords[c]),
  ]);
  const level = parseLevel(text, characterWords);
  if (level) result.level = level;

  const zoneId = parseZone(text, zones);
  if (zoneId) result.zoneId = zoneId;

  let goal: { goal: Goal; index: number } | undefined;
  for (const [g, pattern] of goalPatterns) {
    const match = pattern.exec(text);
    if (match && (!goal || match.index < goal.index)) goal = { goal: g, index: match.index };
  }
  if (goal) result.goal = goal.goal;
  if (groupPattern.test(text)) result.withGroup = true;

  return result;
}

// Characters as the planner lists them.
type CharacterLike = {
  id: string;
  race: string;
  class: string;
  level: number;
  zone_id: string | null;
};

// The saved character the note is most likely about, or null if it names a
// race or class none of them have (then the player probably means a new one).
export function matchCharacter<C extends CharacterLike>(
  parsed: ParsedPrompt,
  characters: C[],
): C | null {
  const candidates = characters.filter(
    (c) => (!parsed.race || c.race === parsed.race) && (!parsed.class || c.class === parsed.class),
  );
  if (!candidates.length) return null;

  const score = (c: C) =>
    (parsed.zoneId && c.zone_id === parsed.zoneId ? 100 : 0) -
    (parsed.level ? Math.abs(c.level - parsed.level) : 0);
  // Stable: ties keep the given order (most recently updated first).
  return candidates.reduce((best, c) => (score(c) > score(best) ? c : best));
}

// A consistent faction, race and class for "add this character", filling in
// whatever the note left out ("shaman" alone means a Horde race).
export function characterPrefill(parsed: ParsedPrompt): {
  faction: Faction;
  race: Race;
  class: CharacterClass;
  level?: number;
  zone_id?: string;
} {
  const fits = (race: Race) =>
    (!parsed.faction || races[race].faction === parsed.faction) &&
    (!parsed.class || (races[race].classes as readonly string[]).includes(parsed.class));
  const race = parsed.race ?? raceIds.find(fits) ?? "human";
  return {
    faction: races[race].faction,
    race,
    class: parsed.class ?? races[race].classes[0],
    ...(parsed.level ? { level: parsed.level } : {}),
    ...(parsed.zoneId ? { zone_id: parsed.zoneId } : {}),
  };
}
