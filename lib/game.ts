// Classic-era races and classes. These are the original game's combinations;
// if WoW Forever adds or changes any, update this file (and the tests).

export const factions = ["alliance", "horde"] as const;
export type Faction = (typeof factions)[number];

export const classes = [
  "warrior",
  "paladin",
  "hunter",
  "rogue",
  "priest",
  "shaman",
  "mage",
  "warlock",
  "druid",
] as const;
export type CharacterClass = (typeof classes)[number];

type RaceInfo = { label: string; faction: Faction; classes: readonly CharacterClass[] };

export const races = {
  human: {
    label: "Human",
    faction: "alliance",
    classes: ["warrior", "paladin", "rogue", "priest", "mage", "warlock"],
  },
  dwarf: {
    label: "Dwarf",
    faction: "alliance",
    classes: ["warrior", "paladin", "hunter", "rogue", "priest"],
  },
  "night-elf": {
    label: "Night Elf",
    faction: "alliance",
    classes: ["warrior", "hunter", "rogue", "priest", "druid"],
  },
  gnome: { label: "Gnome", faction: "alliance", classes: ["warrior", "rogue", "mage", "warlock"] },
  orc: {
    label: "Orc",
    faction: "horde",
    classes: ["warrior", "hunter", "rogue", "shaman", "warlock"],
  },
  undead: {
    label: "Undead",
    faction: "horde",
    classes: ["warrior", "rogue", "priest", "mage", "warlock"],
  },
  tauren: { label: "Tauren", faction: "horde", classes: ["warrior", "hunter", "shaman", "druid"] },
  troll: {
    label: "Troll",
    faction: "horde",
    classes: ["warrior", "hunter", "rogue", "priest", "shaman", "mage"],
  },
} as const satisfies Record<string, RaceInfo>;

export type Race = keyof typeof races;
export const raceIds = Object.keys(races) as Race[];

export function racesFor(faction: Faction): Race[] {
  return raceIds.filter((race) => races[race].faction === faction);
}

export function classesFor(race: Race): readonly CharacterClass[] {
  return races[race].classes;
}

export function label(id: string): string {
  if (id in races) return races[id as Race].label;
  return id.charAt(0).toUpperCase() + id.slice(1);
}
