// Character list. Like a Rails `index` action scoped to current_user: the
// query runs as the signed-in user, and RLS returns only their characters.
import type { Metadata } from "next";
import { Suspense } from "react";
import { CharacterCard } from "@/components/characters/CharacterCard";
import { CharacterDialog } from "@/components/characters/CharacterDialog";
import { requireUser } from "@/lib/auth";
import type { Character } from "@/lib/characters";
import { createClient } from "@/lib/supabase/server";
import { getZones } from "@/lib/zones";

export const metadata: Metadata = {
  title: "Characters",
  robots: { index: false },
};

export default function CharactersPage() {
  return (
    <div className="mx-auto max-w-[1120px] px-4 py-12 sm:py-16">
      <h1 className="font-display text-4xl font-bold">Characters</h1>
      <p className="mt-3 text-text-muted">
        Add the characters you play. The planner uses their level, class and zone.
      </p>
      <Suspense fallback={<GridSkeleton />}>
        <CharacterGrid />
      </Suspense>
    </div>
  );
}

async function CharacterGrid() {
  await requireUser("/characters");
  const supabase = await createClient();
  const [{ data, error }, zones] = await Promise.all([
    supabase
      .from("characters")
      .select(
        "id, name, realm, faction, race, class, level, zone_id, updated_at, session_plans(created_at)",
      )
      .order("updated_at", { ascending: false })
      .order("created_at", { referencedTable: "session_plans", ascending: false })
      .limit(1, { referencedTable: "session_plans" }),
    getZones(),
  ]);
  if (error) throw error;

  const zoneNames = new Map(zones.map((z) => [z.id, z.name]));
  const characters: Character[] = (data ?? []).map(({ session_plans, ...c }) => ({
    ...(c as Omit<Character, "last_plan_at">),
    last_plan_at: session_plans?.[0]?.created_at ?? null,
  }));

  return (
    <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {characters.map((c) => (
        <CharacterCard
          key={c.id}
          character={c}
          zoneName={c.zone_id ? zoneNames.get(c.zone_id) : undefined}
        />
      ))}
      <CharacterDialog zones={zones} trigger="card" />
    </div>
  );
}

function GridSkeleton() {
  return (
    <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-hidden="true">
      {[0, 1].map((i) => (
        <div
          key={i}
          className="min-h-40 animate-pulse rounded-lg border border-border bg-surface"
        />
      ))}
    </div>
  );
}
