// Builds the per-request JSON the model sees, in the shape described in
// lib/prompts/plan-system.md. Pure, so the evals and tests can use it too.
import type { Goal } from "@/lib/schema";
import type { Dungeon, GroupInfo } from "./group";

export type Candidate = {
  id: string;
  name: string;
  zone_id: string;
  min_level: number;
  max_level: number;
  kind: "quest" | "dungeon";
  est_minutes: number | null;
  notes: string | null;
};

export type RestSpot = { id: string; name: string; zone_id: string; kind: "inn" | "city" };

export type PlanContextInput = {
  character: { class: string; race: string; level: number; faction: string; zoneId: string | null };
  minutes: number;
  goal: Goal;
  candidates: Candidate[];
  restSpots: RestSpot[];
  zoneNames: Map<string, string>;
  // Set for group sessions; `character` is then the player who asked.
  group?: { info: GroupInfo; dungeon: Dungeon | null };
};

export function buildPlanContext(input: PlanContextInput): string {
  const zone = (id: string | null) => (id ? (input.zoneNames.get(id) ?? id) : "unknown");

  return JSON.stringify({
    character: {
      class: input.character.class,
      race: input.character.race,
      level: input.character.level,
      faction: input.character.faction,
      zone: zone(input.character.zoneId),
    },
    minutes: input.minutes,
    goal: input.goal,
    candidates: input.candidates.map((c) => ({
      id: c.id,
      name: c.name,
      zone: zone(c.zone_id),
      levels: [c.min_level, c.max_level],
      ...(c.kind === "dungeon" ? { kind: "dungeon" } : {}),
      ...(c.est_minutes ? { estMinutes: c.est_minutes } : {}),
      ...(c.notes ? { notes: c.notes } : {}),
    })),
    restSpots: input.restSpots.map((s) => ({ id: s.id, name: s.name, zone: zone(s.zone_id) })),
    ...(input.group ? { group: groupContext(input.group, zone) } : {}),
  });
}

function groupContext(
  { info, dungeon }: NonNullable<PlanContextInput["group"]>,
  zone: (id: string | null) => string,
) {
  return {
    members: info.members,
    ...(info.missing.length ? { missing: info.missing } : {}),
    ...(info.openSlots ? { openSlots: info.openSlots } : {}),
    dungeon: dungeon
      ? {
          id: dungeon.id,
          name: dungeon.name,
          zone: zone(dungeon.zone_id),
          estMinutes: dungeon.est_minutes ?? 60,
        }
      : null,
  };
}
