import { describe, expect, it } from "vitest";
import { characterPrefill, matchCharacter, parseSessionPrompt, zoneAliases } from "./sessionPrompt";

const zones = [
  { id: "elwynn-forest", name: "Elwynn Forest" },
  { id: "loch-modan", name: "Loch Modan" },
  { id: "the-barrens", name: "The Barrens" },
  { id: "stormwind-city", name: "Stormwind City" },
  { id: "redridge-mountains", name: "Redridge Mountains" },
];
const parse = (text: string) => parseSessionPrompt(text, zones);

describe("parseSessionPrompt", () => {
  it("reads a full note", () => {
    expect(parse("45 minutes on my level 12 dwarf hunter in Loch Modan, want gold")).toEqual({
      minutes: 45,
      level: 12,
      race: "dwarf",
      faction: "alliance",
      class: "hunter",
      zoneId: "loch-modan",
      goal: "gold",
    });
  });

  it.each([
    ["an hour", 60],
    ["about 1 hour", 60],
    ["2 hours", 120],
    ["1.5 hrs", 90],
    ["an hour and a half", 90],
    ["half an hour", 30],
    ["1h30", 90],
    ["1 hour 15 minutes", 75],
    ["two hours", 120],
    ["90 min", 90],
    ["20m", 20],
    ["5 minutes", 10],
    ["12 hours", 480],
  ])("reads %j as %i minutes", (text, minutes) => {
    expect(parse(text).minutes).toBe(minutes);
  });

  it("doesn't read levels or the auction house as time", () => {
    expect(parse("level 12 mage, check the ah").minutes).toBeUndefined();
    expect(parse("my 24 rogue").minutes).toBeUndefined();
  });

  it.each([
    ["level 12 rogue", 12],
    ["lvl 30", 30],
    ["my 24 rogue", 24],
    ["a 7 night elf druid", 7],
    ["20th level priest", 20],
    ["level 75 mage", undefined],
  ])("reads the level in %j", (text, level) => {
    expect(parse(text).level).toBe(level);
  });

  it("knows nicknames and multi-word races", () => {
    expect(parse("my nelf lock")).toMatchObject({ race: "night-elf" });
    expect(parse("my nelf lock").class).toBeUndefined(); // night elves can't be warlocks
    expect(parse("undead lock")).toMatchObject({
      race: "undead",
      class: "warlock",
      faction: "horde",
    });
    expect(parse("pally tank")).toMatchObject({ class: "paladin" });
  });

  it("matches zones by short names", () => {
    expect(parse("questing in elwynn").zoneId).toBe("elwynn-forest");
    expect(parse("barrens chat").zoneId).toBe("the-barrens");
    expect(parse("in Stormwind City").zoneId).toBe("stormwind-city");
    expect(parse("redridge").zoneId).toBe("redridge-mountains");
  });

  it.each([
    ["want some upgrades", "gear"],
    ["farming for my mount", "gold"],
    ["running deadmines with friends", "dungeon"],
    ["just want to relax and fish", "relaxed"],
    ["need to level up", "xp"],
    ["ding 20 tonight", "xp"],
    ["gold first, then maybe a dungeon", "gold"],
  ])("reads the goal in %j", (text, goal) => {
    expect(parse(text).goal).toBe(goal);
  });

  it.each([
    ["running deadmines with friends", true],
    ["duo with my wife, 2 hours", true],
    ["quests with my brother", true],
    ["solo hunter, an hour", undefined],
  ])("notices a group in %j", (text, withGroup) => {
    expect(parse(text).withGroup).toBe(withGroup);
  });

  it("returns nothing for a note it can't read", () => {
    expect(parse("hello there")).toEqual({});
  });
});

describe("zoneAliases", () => {
  it("drops 'The' and generic endings", () => {
    expect(zoneAliases("The Barrens")).toEqual(["the barrens", "barrens"]);
    expect(zoneAliases("Elwynn Forest")).toEqual(["elwynn forest", "elwynn"]);
    expect(zoneAliases("Durotar")).toEqual(["durotar"]);
  });
});

describe("matchCharacter", () => {
  const characters = [
    { id: "a", race: "human", class: "warrior", level: 10, zone_id: "elwynn-forest" },
    { id: "b", race: "dwarf", class: "hunter", level: 14, zone_id: "loch-modan" },
    { id: "c", race: "dwarf", class: "hunter", level: 30, zone_id: null },
  ];

  it("filters by race and class, then prefers zone and level", () => {
    expect(matchCharacter({ class: "hunter", level: 29 }, characters)?.id).toBe("c");
    expect(matchCharacter({ race: "dwarf", zoneId: "loch-modan" }, characters)?.id).toBe("b");
  });

  it("keeps the most recent character when nothing distinguishes them", () => {
    expect(matchCharacter({ minutes: 60 }, characters)?.id).toBe("a");
  });

  it("returns null when no saved character fits", () => {
    expect(matchCharacter({ class: "mage" }, characters)).toBeNull();
  });
});

describe("characterPrefill", () => {
  it("picks a race that can be the class", () => {
    expect(characterPrefill({ class: "shaman" })).toMatchObject({ faction: "horde", race: "orc" });
    expect(characterPrefill({ class: "druid" })).toMatchObject({ race: "night-elf" });
  });

  it("keeps what the note said", () => {
    expect(characterPrefill({ race: "troll", level: 14, zoneId: "the-barrens" })).toEqual({
      faction: "horde",
      race: "troll",
      class: "warrior",
      level: 14,
      zone_id: "the-barrens",
    });
  });
});
