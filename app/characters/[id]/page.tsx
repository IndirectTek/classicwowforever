// One character and its plan history. Like a Rails `show` action: if RLS
// hides the row (someone else's character, or a bad id), we 404.
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CharacterDialog } from "@/components/characters/CharacterDialog";
import { formatDate } from "@/components/characters/CharacterCard";
import { requireUser } from "@/lib/auth";
import type { Character } from "@/lib/characters";
import { label } from "@/lib/game";
import { goalLabels, type Goal } from "@/lib/schema";
import { createClient } from "@/lib/supabase/server";
import { getZones } from "@/lib/zones";

export const metadata: Metadata = {
  title: "Character",
  robots: { index: false },
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default function CharacterPage({ params }: PageProps<"/characters/[id]">) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:py-16">
      <Link href="/characters" className="text-sm text-text-muted hover:text-text">
        ← All characters
      </Link>
      <Suspense fallback={<div className="mt-6 h-40 animate-pulse rounded-lg bg-surface" />}>
        <CharacterDetail params={params} />
      </Suspense>
    </div>
  );
}

async function CharacterDetail({ params }: Pick<PageProps<"/characters/[id]">, "params">) {
  const { id } = await params;
  await requireUser(`/characters/${id}`);
  if (!UUID.test(id)) notFound();

  const supabase = await createClient();
  const [{ data: character }, { data: plans }, zones] = await Promise.all([
    supabase
      .from("characters")
      .select("id, name, realm, faction, race, class, level, zone_id, updated_at")
      .eq("id", id)
      .maybeSingle<Character>(),
    supabase
      .from("session_plans")
      .select("id, share_id, minutes, goal, plan, created_at")
      .eq("character_id", id)
      .order("created_at", { ascending: false }),
    getZones(),
  ]);
  if (!character) notFound();

  const zoneName = zones.find((z) => z.id === character.zone_id)?.name;

  return (
    <>
      <header className="mt-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl font-bold">{character.name}</h1>
          <p className="mt-2 text-text-muted">
            Level <span className="font-mono text-text">{character.level}</span>{" "}
            {label(character.race)} {label(character.class)} · {label(character.faction)}
            {character.realm && <> · {character.realm}</>}
          </p>
          <p className="mt-1 text-sm text-text-muted">{zoneName ?? "Zone not set"}</p>
        </div>
        <CharacterDialog zones={zones} character={character} trigger="button" />
      </header>

      <section aria-labelledby="history" className="mt-12">
        <h2 id="history" className="text-2xl font-semibold">
          Plan history
        </h2>
        {plans && plans.length > 0 ? (
          <ol className="mt-4 space-y-3">
            {plans.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/p/${p.share_id}`}
                  className="block rounded-lg border border-border bg-surface p-4 hover:border-accent"
                >
                  <p className="text-sm text-text-muted">
                    {formatDate(p.created_at)} · {p.minutes} min · {goalLabels[p.goal as Goal]}
                  </p>
                  <p className="mt-1">{(p.plan as { summary?: string }).summary}</p>
                </Link>
              </li>
            ))}
          </ol>
        ) : (
          <div className="mt-4 rounded-lg border border-dashed border-border p-6 text-text-muted">
            <p>
              No plans yet. Once the planner opens, every session you plan for {character.name}
              shows up here.
            </p>
            <Link
              href="/p/example"
              className="mt-2 inline-block text-accent underline underline-offset-2"
            >
              See what a plan looks like
            </Link>
          </div>
        )}
      </section>
    </>
  );
}
