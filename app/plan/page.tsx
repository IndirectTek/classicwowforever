// The planner. The page shell is static; the part that needs the session
// (your characters and quota) streams in behind Suspense.
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { PlannerForm } from "@/components/planner/PlannerForm";
import { buttonClasses } from "@/components/ui/Button";
import { requireUser } from "@/lib/auth";
import { loadQuota } from "@/lib/planner/loadQuota";
import { createClient } from "@/lib/supabase/server";

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
  const user = await requireUser("/plan");
  const supabase = await createClient();
  const [{ data: characters }, quota, params] = await Promise.all([
    supabase
      .from("characters")
      .select("id, name, level, class")
      .order("updated_at", { ascending: false }),
    loadQuota(supabase, user.id),
    searchParams,
  ]);

  if (!characters?.length) {
    return (
      <div className="rounded-lg border border-dashed border-border p-6">
        <p className="font-medium">Add a character first.</p>
        <p className="mt-2 text-text-muted">The planner needs their level, class and zone.</p>
        <Link href="/characters" className={buttonClasses("primary", "mt-4")}>
          Add a character
        </Link>
      </div>
    );
  }

  // /plan?character=<id> preselects one (the button on a character's page).
  const requested = typeof params.character === "string" ? params.character : null;
  const initialCharacterId = characters.some((c) => c.id === requested)
    ? requested!
    : characters[0].id;

  return (
    <PlannerForm
      characters={characters}
      initialCharacterId={initialCharacterId}
      initialQuota={quota}
    />
  );
}
