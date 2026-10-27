// The planner. The page shell is static; the part that needs the session
// (your characters and quota) streams in behind Suspense.
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { CharacterDialog } from "@/components/characters/CharacterDialog";
import { PlannerForm } from "@/components/planner/PlannerForm";
import { buttonClasses } from "@/components/ui/Button";
import { requireUser } from "@/lib/auth";
import { label } from "@/lib/game";
import { loadQuota } from "@/lib/planner/loadQuota";
import { goalLabels } from "@/lib/schema";
import {
  characterPrefill,
  matchCharacter,
  parseSessionPrompt,
  PROMPT_MAX,
  type ParsedPrompt,
} from "@/lib/sessionPrompt";
import { createClient } from "@/lib/supabase/server";
import { getZones, type Zone } from "@/lib/zones";

export const metadata: Metadata = {
  title: "Planner",
  robots: { index: false },
};

export default function PlanPage({ searchParams }: PageProps<"/plan">) {
  return (
    <div className="mx-auto max-w-[1120px] px-4 py-12 sm:py-16">
      <h1 className="font-display text-4xl font-bold">Plan tonight&apos;s session</h1>
      <p className="mt-3 text-text-muted">
        Pick a character, how long you have, and what you&apos;re after.
      </p>
      <div className="mt-8">
        <Suspense fallback={<div className="h-96 animate-pulse rounded-lg bg-surface" />}>
          <Planner searchParams={searchParams} />
        </Suspense>
      </div>
    </div>
  );
}

async function Planner({ searchParams }: Pick<PageProps<"/plan">, "searchParams">) {
  const params = await searchParams;
  // ?q= is the one-line note from the home page prompt.
  const note = typeof params.q === "string" ? params.q.trim().slice(0, PROMPT_MAX) : "";
  const requested = typeof params.character === "string" ? params.character : null;

  const returnTo = new URLSearchParams();
  if (note) returnTo.set("q", note);
  if (requested) returnTo.set("character", requested);
  const user = await requireUser(returnTo.size ? `/plan?${returnTo}` : "/plan");

  const supabase = await createClient();
  const [{ data: characters }, quota, zones] = await Promise.all([
    supabase
      .from("characters")
      .select("id, name, level, class, race, zone_id")
      .order("updated_at", { ascending: false }),
    loadQuota(supabase, user.id),
    getZones(),
  ]);

  const parsed = note ? parseSessionPrompt(note, zones) : {};
  const describesCharacter = Boolean(parsed.race || parsed.class);
  const match = note ? matchCharacter(parsed, characters ?? []) : null;
  // The note names a race or class that none of your characters are.
  const suggestNew = describesCharacter && !match;

  if (!characters?.length || suggestNew) {
    return (
      <div className="space-y-6">
        {note && <NoteSummary note={note} parsed={parsed} zones={zones} />}
        <div className="rounded-lg border border-dashed border-border p-6">
          <p className="font-medium">
            {suggestNew ? "Add this character first." : "Add a character first."}
          </p>
          <p className="mt-2 text-text-muted">
            The planner needs their level, class and zone
            {suggestNew ? "; we've filled in what your note told us." : "."}
          </p>
          <div className="mt-4">
            {describesCharacter ? (
              <CharacterDialog
                zones={zones}
                prefill={characterPrefill(parsed)}
                trigger="button"
                triggerLabel={`Add your ${describe(parsed)}`}
              />
            ) : (
              <Link href="/characters" className={buttonClasses("primary")}>
                Add a character
              </Link>
            )}
          </div>
        </div>
        {characters?.length ? (
          <p className="text-text-muted">
            Or plan for someone you&apos;ve already added:{" "}
            {characters.map((c, i) => (
              <span key={c.id}>
                {i > 0 && ", "}
                <Link
                  href={`/plan?character=${c.id}`}
                  className="text-accent underline underline-offset-2"
                >
                  {c.name}
                </Link>
              </span>
            ))}
          </p>
        ) : null}
      </div>
    );
  }

  // /plan?character=<id> preselects one (the button on a character's page);
  // otherwise the character the note describes, or the most recent.
  const initial = characters.find((c) => c.id === requested) ?? match ?? characters[0];

  return (
    <div className="space-y-6">
      {note && <NoteSummary note={note} parsed={parsed} zones={zones} character={initial} />}
      <PlannerForm
        characters={characters}
        initialCharacterId={initial.id}
        initialQuota={quota}
        initialMinutes={parsed.minutes}
        initialGoal={parsed.goal}
      />
    </div>
  );
}

function describe(parsed: ParsedPrompt): string {
  return [
    parsed.level && `level ${parsed.level}`,
    parsed.race && label(parsed.race),
    parsed.class ? label(parsed.class) : "character",
  ]
    .filter(Boolean)
    .join(" ");
}

// What we took from the note, and where it disagrees with the saved character
// (the plan uses the saved one, so say so).
function NoteSummary({
  note,
  parsed,
  zones,
  character,
}: {
  note: string;
  parsed: ParsedPrompt;
  zones: Zone[];
  character?: { id: string; name: string; level: number; zone_id: string | null };
}) {
  const zoneName = (id: string | null | undefined) => zones.find((z) => z.id === id)?.name;
  const heard = [
    parsed.minutes && `${parsed.minutes} min`,
    parsed.goal && goalLabels[parsed.goal],
    character?.name,
  ].filter(Boolean);

  const differences: string[] = [];
  if (character && parsed.level && parsed.level !== character.level) {
    differences.push(`level ${character.level}, not ${parsed.level}`);
  }
  if (character && parsed.zoneId && parsed.zoneId !== character.zone_id) {
    differences.push(
      `${character.zone_id ? `in ${zoneName(character.zone_id)}` : "with no zone set"}, not ${zoneName(parsed.zoneId)}`,
    );
  }

  return (
    <div className="rounded-lg border border-border bg-surface p-4 text-sm">
      <p className="text-text-muted">
        From your note: <q className="text-text">{note}</q>
      </p>
      {heard.length > 0 ? (
        <p className="mt-2">
          We set it up for <span className="font-mono text-accent">{heard.join(" · ")}</span>.
          Change anything below.
        </p>
      ) : (
        <p className="mt-2">We couldn&apos;t pick out a time or goal, so choose them below.</p>
      )}
      {character && differences.length > 0 && (
        <p className="mt-2 text-text-muted">
          {character.name} is saved as {differences.join(", and ")}. Plans use the saved details, so{" "}
          <Link
            href={`/characters/${character.id}`}
            className="text-accent underline underline-offset-2"
          >
            update {character.name}
          </Link>{" "}
          if that&apos;s changed.
        </p>
      )}
    </div>
  );
}
