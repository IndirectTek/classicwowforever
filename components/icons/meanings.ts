// Which icon stands for what, so every page uses the same one for a class,
// role or goal. Generic fantasy icons, never the game's own art.
import type { CharacterClass } from "@/lib/game";
import type { Goal, Role } from "@/lib/schema";
import type { GameIconName } from "./gameIcons";

export const roleIcons: Record<Role, GameIconName> = {
  tank: "templar-shield",
  healer: "heart-plus",
  dps: "crossed-swords",
};

export const goalIcons: Record<Goal, GameIconName> = {
  xp: "upgrade",
  gold: "two-coins",
  gear: "breastplate",
  dungeon: "dungeon-gate",
  relaxed: "campfire",
};

export const classIcons: Record<CharacterClass, GameIconName> = {
  warrior: "battle-axe",
  paladin: "warhammer",
  hunter: "high-shot",
  rogue: "hood",
  priest: "angel-wings",
  shaman: "totem",
  mage: "pointy-hat",
  warlock: "burning-skull",
  druid: "paw",
};

// Characters are stored with a plain string class; unknown ones get none.
export function classIcon(characterClass: string): GameIconName | null {
  return classIcons[characterClass as CharacterClass] ?? null;
}
