// Report a quest. Like a Rails `new` action with the user's own past reports
// listed underneath. Reports wait for a data keeper; nothing here changes
// what the planner knows until a keeper merges it into data/.
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { withdrawReport } from "@/app/actions/reports";
import { formatDate } from "@/components/characters/CharacterCard";
import { QuestReportForm, type ReportDefaults } from "@/components/reports/QuestReportForm";
import { requireUser } from "@/lib/auth";
import { hasLaunched } from "@/lib/launch";
import { reportGameLabels, type ReportGame } from "@/lib/reports";
import { createClient } from "@/lib/supabase/server";
import { getZones } from "@/lib/zones";

export const metadata: Metadata = {
  title: "Report a quest",
  robots: { index: false },
};

export default function ReportPage({ searchParams }: PageProps<"/report">) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:py-16">
      <h1 className="font-display text-4xl font-bold">Report a quest</h1>
      <p className="mt-3 text-text-muted">
        Played a quest? Tell us about it. A data keeper checks every report before the planner uses
        it, and you&apos;re credited in our{" "}
        <Link href="/open-source" className="text-accent underline underline-offset-2">
          open data
        </Link>
        . If we already have the quest, your report counts as a correction.
      </p>
      <Suspense fallback={<div className="mt-8 h-[36rem] animate-pulse rounded-lg bg-surface" />}>
        <ReportBody searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

const statusLabels: Record<string, string> = {
  new: "Waiting for review",
  applied: "Added to the data",
  rejected: "Not used",
  duplicate: "Already reported",
};

async function ReportBody({ searchParams }: Pick<PageProps<"/report">, "searchParams">) {
  const params = await searchParams;
  const zoneParam = typeof params.zone === "string" ? params.zone : null;
  await requireUser(zoneParam ? `/report?zone=${encodeURIComponent(zoneParam)}` : "/report");

  const supabase = await createClient();
  const [zones, { data: character }, { data: reports }] = await Promise.all([
    getZones(),
    supabase
      .from("characters")
      .select("faction, zone_id")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("quest_reports")
      .select("id, name, zone_id, kind, game, status, created_at")
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  const zoneNames = new Map(zones.map((z) => [z.id, z.name]));
  // Before launch, the only place to play is Classic Era.
  const game: ReportGame = hasLaunched() ? "forever" : "classic-era";
  const defaults: ReportDefaults = {
    zone_id: (zoneParam && zoneNames.has(zoneParam) ? zoneParam : character?.zone_id) ?? "",
    faction: character?.faction ?? "both",
    game,
    // The server's date; the form swaps in the visitor's own.
    seen_on: new Date().toISOString().slice(0, 10),
  };

  return (
    <>
      <div className="mt-8">
        <QuestReportForm zones={zones} defaults={defaults} />
      </div>

      <section aria-labelledby="your-reports" className="mt-12">
        <h2 id="your-reports" className="text-2xl font-semibold">
          Your reports
        </h2>
        {reports && reports.length > 0 ? (
          <ul className="mt-4 space-y-3">
            {reports.map((r) => (
              <li
                key={r.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-surface p-4"
              >
                <div>
                  <p className="font-medium">{r.name}</p>
                  <p className="text-sm text-text-muted">
                    {zoneNames.get(r.zone_id) ?? r.zone_id} ·{" "}
                    {r.kind === "correction" ? "Correction" : "New quest"} ·{" "}
                    {reportGameLabels[r.game as ReportGame]} · {formatDate(r.created_at)}
                  </p>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <span className={r.status === "applied" ? "text-success" : "text-text-muted"}>
                    {statusLabels[r.status] ?? r.status}
                  </span>
                  {r.status === "new" && (
                    <form action={withdrawReport.bind(null, r.id)}>
                      <button
                        type="submit"
                        className="text-text-muted underline underline-offset-2 hover:text-text"
                      >
                        Withdraw
                      </button>
                    </form>
                  )}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 rounded-lg border border-dashed border-border p-6 text-text-muted">
            Nothing yet. Your reports and their review status show up here.
          </p>
        )}
      </section>
    </>
  );
}
