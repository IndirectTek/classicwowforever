// Group sessions: who plays which role, and which dungeon fits the group.
// Decided here in code, not by the model, because both are checkable facts:
// a mage can't heal, and a level 14 can't run a level 25 dungeon. The model
// then plans the evening around the result. Pure, so the form can show the
// same answer live and the tests can pin it down.
import { z } from "zod";
import type { CharacterClass } from "@/lib/game";
import { roles, type GroupInfo, type Role } from "@/lib/schema";
import { stepBudget } from "./finalize";

export { roles, type GroupInfo, type Role };

export const roleLabels: Record<Role, string> = { tank: "Tank", healer: "Healer", dps: "Damage" };

// What each class can do in a classic five-player group, best first.
export const classRoles: Record<CharacterClass, readonly Role[]> = {
  warrior: ["tank", "dps"],
  paladin: ["healer", "dps", "tank"],
  hunter: ["dps"],
  rogue: ["dps"],
  priest: ["healer", "dps"],
  shaman: ["healer", "dps"],
  mage: ["dps"],
  warlock: ["dps"],
  druid: ["healer", "tank", "dps"],
};

export const GROUP_SIZE = 5;
export const PARTY_MAX = GROUP_SIZE - 1;

// The other players (the signed-in player's character is the leader).
// No names: these are other people, and plans can be shared publicly.
export const PartyMember = z.object({
  class: z.enum(Object.keys(classRoles) as [CharacterClass, ...CharacterClass[]]),
  level: z.number().int().min(1).max(60),
  prefers: z.enum([...roles, "any"]).default("any"),
});
export type PartyMember = z.infer<typeof PartyMember>;
export type Member = { class: CharacterClass; level: number; prefers?: Role | "any" };

export type RoleAssignment = { roles: Role[]; missing: Role[] };

// Tries every combination (at most 3^5 = 243) and keeps the best: one tank
// and one healer if possible, then players' preferences, then each class's
// strongest role. Ties keep the earlier member's preference.
export function assignRoles(members: Member[]): RoleAssignment {
  let best: { roles: Role[]; score: number } = { roles: [], score: -Infinity };

  const visit = (i: number, chosen: Role[]) => {
    if (i === members.length) {
      const score = scoreRoles(members, chosen);
      if (score > best.score) best = { roles: [...chosen], score };
      return;
    }
    for (const role of classRoles[members[i].class]) visit(i + 1, [...chosen, role]);
  };
  visit(0, []);

  const count = (role: Role) => best.roles.filter((r) => r === role).length;
  // Duos and trios can quest without a tank or healer; flag gaps from four up,
  // and always for dungeons (see groupPlanFacts).
  const missing = (["tank", "healer"] as const).filter((role) => count(role) === 0);
  return { roles: best.roles, missing };
}

function scoreRoles(members: Member[], chosen: Role[]): number {
  const tanks = chosen.filter((r) => r === "tank").length;
  const healers = chosen.filter((r) => r === "healer").length;
  let score = 0;
  score += tanks >= 1 ? 100 : 0;
  score += healers >= 1 ? 100 : 0;
  score -= Math.max(0, tanks - 1) * 60 + Math.max(0, healers - 1) * 40;
  chosen.forEach((role, i) => {
    const { prefers = "any" } = members[i];
    if (prefers !== "any") score += prefers === role ? 30 : -30;
    // Earlier in classRoles = more natural for the class.
    score -= classRoles[members[i].class].indexOf(role) * 5;
  });
  return score;
}

export type Dungeon = {
  id: string;
  name: string;
  zone_id: string;
  min_level: number;
  max_level: number;
  est_minutes: number | null;
};

// Meeting at the entrance and logging out after, on top of the run itself.
// Both must fit in the session's step budget (90%, see finalize.ts).
export const DUNGEON_OVERHEAD_MINUTES = 20;
const DEFAULT_RUN_MINUTES = 60;

export type DungeonPick =
  { dungeon: Dungeon; reason: null } | { dungeon: null; reason: "no-dungeons" | "levels" | "time" };

// Where the group is starting from, so a dungeon across the world (or in the
// other faction's territory) loses to one nearby with a similar fit.
export type Whereabouts = {
  zoneId: string | null;
  faction: "alliance" | "horde";
  zoneFactions: Map<string, string>;
};

// Roughly level-gaps' worth of extra travel: the same zone is free, your
// side's zones are a short trip, enemy territory is a long and risky one.
export function travelCost(dungeon: Dungeon, from?: Whereabouts): number {
  if (!from || dungeon.zone_id === from.zoneId) return 0;
  const side = from.zoneFactions.get(dungeon.zone_id);
  return side === from.faction || side === "contested" || !side ? 1 : 4;
}

// The dungeon whose level range best fits the group and whose run fits the
// time. Everyone should be within 2 levels of the bottom of the range, and
// nobody far past the top (they'd get no XP and little loot).
export function pickDungeon(
  dungeons: Dungeon[],
  levels: number[],
  minutes: number,
  from?: Whereabouts,
): DungeonPick {
  if (!dungeons.length) return { dungeon: null, reason: "no-dungeons" };
  const lowest = Math.min(...levels);
  const highest = Math.max(...levels);
  const average = levels.reduce((a, b) => a + b, 0) / levels.length;

  const levelFits = dungeons.filter(
    (d) => lowest >= d.min_level - 2 && highest <= d.max_level + 3 && average <= d.max_level,
  );
  if (!levelFits.length) return { dungeon: null, reason: "levels" };

  const timeFits = levelFits.filter(
    (d) => (d.est_minutes ?? DEFAULT_RUN_MINUTES) + DUNGEON_OVERHEAD_MINUTES <= stepBudget(minutes),
  );
  if (!timeFits.length) return { dungeon: null, reason: "time" };

  // Closest to the middle of its range and to the group, then the shorter run.
  const distance = (d: Dungeon) =>
    Math.abs(average - (d.min_level + d.max_level) / 2) + travelCost(d, from);
  const dungeon = timeFits.reduce((a, b) =>
    distance(b) < distance(a) ||
    (distance(b) === distance(a) && (b.est_minutes ?? 999) < (a.est_minutes ?? 999))
      ? b
      : a,
  );
  return { dungeon, reason: null };
}

export const noDungeonText: Record<NonNullable<GroupInfo["noDungeonReason"]>, string> = {
  "no-dungeons": "We don't have dungeon data for your side yet, so this plans questing together.",
  levels: "No dungeon fits everyone's levels, so this plans questing together.",
  time: "No dungeon fits in this much time, so this plans questing together.",
};

// The leader plus the party, with roles and the dungeon decided.
export function groupPlanFacts(
  leader: Member,
  party: Member[],
  options: { wantsDungeon: boolean; dungeons: Dungeon[]; minutes: number; from?: Whereabouts },
): { info: GroupInfo; dungeon: Dungeon | null } {
  const members = [leader, ...party];
  const { roles: assigned, missing } = assignRoles(members);
  const pick = options.wantsDungeon
    ? pickDungeon(
        options.dungeons,
        members.map((m) => m.level),
        options.minutes,
        options.from,
      )
    : null;
  const forDungeon = Boolean(pick?.dungeon);

  return {
    dungeon: pick?.dungeon ?? null,
    info: {
      members: members.map((m, i) => ({ class: m.class, level: m.level, role: assigned[i] })),
      // Gaps only matter for a dungeon, or a group big enough to try one.
      missing: forDungeon || members.length >= 4 ? missing : [],
      openSlots: forDungeon ? GROUP_SIZE - members.length : 0,
      dungeon: pick?.dungeon ? { id: pick.dungeon.id, name: pick.dungeon.name } : null,
      noDungeonReason: pick && !pick.dungeon ? pick.reason : null,
    },
  };
}
