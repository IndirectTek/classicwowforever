// Read-only shared plan. Like a Rails `show` action with a public, unguessable
// token instead of an id: params come from the URL segment [shareId].
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PlanCard, planTitle } from "@/components/planner/PlanCard";
import { buttonClasses } from "@/components/ui/Button";
import { EXAMPLE_SHARE_ID } from "@/lib/examplePlan";
import { getPlanView } from "@/lib/plans";

// Prerender the example at build time. Real share ids render on first visit
// and are then cached (see lib/plans.ts).
export function generateStaticParams() {
  return [{ shareId: EXAMPLE_SHARE_ID }];
}

export async function generateMetadata({ params }: PageProps<"/p/[shareId]">): Promise<Metadata> {
  const { shareId } = await params;
  const view = await getPlanView(shareId);
  if (!view) return { title: "Plan not found" };

  return {
    title: planTitle(view),
    description: view.plan.summary,
    // Shared plans are personal; keep them out of search results.
    robots: shareId === EXAMPLE_SHARE_ID ? undefined : { index: false },
  };
}

export default async function SharedPlanPage({ params }: PageProps<"/p/[shareId]">) {
  const { shareId } = await params;
  const view = await getPlanView(shareId);
  if (!view) notFound();

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:py-14">
      {shareId === EXAMPLE_SHARE_ID && (
        <p className="mb-4 text-sm text-text-muted">
          This is an example plan. Try the timer and check off steps; your progress stays in this
          browser.
        </p>
      )}
      <PlanCard view={view} />
      <div className="mt-8 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
        <Link href="/#waitlist" className={buttonClasses("primary")}>
          Plan your own session
        </Link>
        <p className="text-sm text-text-muted">The planner opens shortly after launch.</p>
      </div>
    </div>
  );
}
