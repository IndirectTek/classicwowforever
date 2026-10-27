// Pick what the model may choose from: quests within 3 levels in the
// character's zone and its neighbors, and nearby inns and capitals.
import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Candidate, RestSpot } from "./context";
import type { Dungeon } from "./group";

const MAX_CANDIDATES = 40;
const LEVEL_WINDOW = 3;

type Character = { level: number; faction: "alliance" | "horde"; zone_id: string | null };

export async function loadCandidates(supabase: SupabaseClient, character: Character) {
  const zoneIds = await nearbyZones(supabase, character);

  const [quests, spots] = await Promise.all([
    supabase
      .from("game_quests")
      .select("id, name, zone_id, min_level, max_level, kind, est_minutes, notes")
      .in("zone_id", zoneIds)
      .lte("min_level", character.level + LEVEL_WINDOW)
      .gte("max_level", character.level - LEVEL_WINDOW)
      .or(`faction.is.null,faction.eq.both,faction.eq.${character.faction}`)
      .order("min_level")
      .limit(MAX_CANDIDATES),
    // Nearby inns plus the faction's capitals, so there's always somewhere to log out.
    supabase
      .from("rest_spots")
      .select("id, name, zone_id, kind")
      .in("faction", [character.faction, "both"])
      .or(`zone_id.in.(${zoneIds.join(",")}),kind.eq.city`),
  ]);
  if (quests.error) throw quests.error;
  if (spots.error) throw spots.error;

  // Nearby spots first, then capitals.
  const restSpots = (spots.data as RestSpot[]).sort(
    (a, b) => Number(!zoneIds.includes(a.zone_id)) - Number(!zoneIds.includes(b.zone_id)),
  );

  return { candidates: quests.data as Candidate[], restSpots };
}

async function nearbyZones(supabase: SupabaseClient, character: Character): Promise<string[]> {
  if (character.zone_id) {
    const { data, error } = await supabase
      .from("zone_neighbors")
      .select("neighbor_id")
      .eq("zone_id", character.zone_id);
    if (error) throw error;
    return [character.zone_id, ...data.map((n) => n.neighbor_id as string)];
  }

  // No zone set: use the zones built for this level on the character's side.
  const { data, error } = await supabase
    .from("game_zones")
    .select("id")
    .eq("kind", "zone")
    .in("faction", [character.faction, "contested"])
    .lte("min_level", character.level)
    .gte("max_level", character.level);
  if (error) throw error;
  return data.map((z) => z.id as string);
}

// Every dungeon open to this faction. Groups travel, so unlike quests these
// aren't limited to nearby zones; pickDungeon() chooses by level and time.
export async function loadDungeons(
  supabase: SupabaseClient,
  faction: Character["faction"],
): Promise<Dungeon[]> {
  const { data, error } = await supabase
    .from("game_quests")
    .select("id, name, zone_id, min_level, max_level, est_minutes")
    .eq("kind", "dungeon")
    .or(`faction.is.null,faction.eq.both,faction.eq.${faction}`)
    .order("min_level");
  if (error) throw error;
  return data as Dungeon[];
}
