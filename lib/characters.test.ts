import { describe, expect, it } from "vitest";
import { CharacterInput } from "./characters";
import { classesFor, racesFor } from "./game";

const valid = {
  name: "Aldric",
  realm: "",
  faction: "alliance",
  race: "human",
  class: "paladin",
  level: "12",
  zone_id: "",
};

describe("CharacterInput", () => {
  it("accepts a valid character and normalizes form values", () => {
    const c = CharacterInput.parse(valid);
    expect(c.level).toBe(12);
    expect(c.realm).toBeNull();
    expect(c.zone_id).toBeNull();
  });

  it("allows accented names but not spaces or digits", () => {
    expect(CharacterInput.safeParse({ ...valid, name: "Ælfrïc" }).success).toBe(true);
    expect(CharacterInput.safeParse({ ...valid, name: "Al dric" }).success).toBe(false);
    expect(CharacterInput.safeParse({ ...valid, name: "Aldric2" }).success).toBe(false);
    expect(CharacterInput.safeParse({ ...valid, name: "A" }).success).toBe(false);
  });

  it("rejects a race from the other faction", () => {
    const result = CharacterInput.safeParse({ ...valid, race: "orc", class: "warrior" });
    expect(result.error?.issues[0].path).toEqual(["race"]);
  });

  it("rejects a class the race can't be", () => {
    const result = CharacterInput.safeParse({ ...valid, race: "gnome", class: "paladin" });
    expect(result.error?.issues[0].path).toEqual(["class"]);
  });

  it("rejects levels outside 1 to 60", () => {
    expect(CharacterInput.safeParse({ ...valid, level: "0" }).success).toBe(false);
    expect(CharacterInput.safeParse({ ...valid, level: "61" }).success).toBe(false);
  });
});

describe("classic race and class combinations", () => {
  it("keeps paladins Alliance-only and shamans Horde-only", () => {
    const allianceClasses = new Set(racesFor("alliance").flatMap(classesFor));
    const hordeClasses = new Set(racesFor("horde").flatMap(classesFor));
    expect(allianceClasses.has("paladin")).toBe(true);
    expect(allianceClasses.has("shaman")).toBe(false);
    expect(hordeClasses.has("shaman")).toBe(true);
    expect(hordeClasses.has("paladin")).toBe(false);
  });
});
