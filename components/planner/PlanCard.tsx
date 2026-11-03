import { goalLabels, type PlanView } from "@/lib/schema";
import { GroupPanel } from "./GroupPanel";
import { PlanSession } from "./PlanSession";
import { ShareButton } from "./ShareButton";

export function planTitle(view: PlanView) {
  return `${view.characterName}'s ${view.minutes}-minute ${goalLabels[view.goal]} session`;
}

// A Server Component shell around the interactive PlanSession, like an ERB
// view that renders a partial with a Stimulus controller inside.
export function PlanCard({ view }: { view: PlanView }) {
  const { plan } = view;

  return (
    <article className="rounded-lg border border-border bg-surface p-4 sm:p-6">
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-text-muted">
            {view.characterName} · Level {view.characterLevel} {capitalize(view.characterClass)}
            {plan.group && ` and ${plan.group.members.length - 1} more`}
          </p>
          <h1 className="font-display mt-1 text-3xl font-bold">
            {view.minutes} minutes · {goalLabels[view.goal]}
          </h1>
          <p className="mt-2 text-lg">{plan.summary}</p>
        </div>
        <ShareButton path={`/p/${view.shareId}`} title={planTitle(view)} />
      </header>

      {plan.group && <GroupPanel group={plan.group} leaderName={view.characterName} />}

      <PlanSession shareId={view.shareId} plan={plan} minutes={view.minutes} />

      <p className="mt-6 text-text-muted italic">Why: {plan.why}</p>
    </article>
  );
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
