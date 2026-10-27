import { cacheLife, cacheTag } from "next/cache";
import { createPublicClient } from "./supabase/public";

export type Zone = {
  id: string;
  name: string;
  min_level: number;
  max_level: number;
  faction: "alliance" | "horde" | "contested";
  kind: "zone" | "city";
};

// Zone data changes only when a data keeper merges an update, so cache it.
// Call revalidateTag("game-zones", "max") after syncing new data.
export async function getZones(): Promise<Zone[]> {
  "use cache";
  cacheTag("game-zones");
  cacheLife("hours");

  const supabase = createPublicClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("game_zones")
    .select("id, name, min_level, max_level, faction, kind")
    .order("min_level")
    .order("name");
  if (error) throw error;
  return data as Zone[];
}
