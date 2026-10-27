"use client";

// The planner: choose a character, time and goal; get a plan. A client
// component because it posts JSON to /api/plans and shows loading and result
// states in place (like a Rails form submitted with Turbo, rendered in a frame).
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Button, buttonClasses } from "@/components/ui/Button";
import { ChipGroup } from "@/components/ui/ChipGroup";
import { planningLines } from "@/lib/flavor";
import { label, type CharacterClass, type Faction } from "@/lib/game";
import type { PartyMember } from "@/lib/planner/group";
import type { Quota } from "@/lib/quota";
import {
  goalLabels,
  goals,
  MINUTES_MAX,
  MINUTES_MIN,
  type Goal,
  type PlanView,
} from "@/lib/schema";
import { examplePlan } from "@/lib/examplePlan";
import { PlanCard } from "./PlanCard";
import { PartyEditor } from "./PartyEditor";
import { PlanFeedback } from "./PlanFeedback";
import { QuotaPill } from "./QuotaPill";

type CharacterOption = {
  id: string;
  name: string;
  level: number;
  class: string;
  faction: Faction;
};

const presets = [30, 60, 90, 120];

type Result = { planId: string; view: PlanView };

export function PlannerForm({
  characters,
  initialCharacterId,
  initialQuota,
  initialMinutes = 60,
  initialGoal = "xp",
  initialWithGroup = false,
}: {
  characters: CharacterOption[];
  initialCharacterId: string;
  initialQuota: Quota;
  // From the home page prompt, when it named a time or goal.
  initialMinutes?: number;
  initialGoal?: Goal;
  initialWithGroup?: boolean;
}) {
  const [characterId, setCharacterId] = useState(initialCharacterId);
  const [preset, setPreset] = useState<number | "custom">(
    presets.includes(initialMinutes) ? initialMinutes : "custom",
  );
  const [custom, setCustom] = useState(
    String(presets.includes(initialMinutes) ? 75 : initialMinutes),
  );
  const [goal, setGoal] = useState<Goal>(initialGoal);
  const leader = characters.find((c) => c.id === characterId) ?? characters[0];
  const [withGroup, setWithGroup] = useState(initialWithGroup);
  const [party, setParty] = useState<PartyMember[]>(
    initialWithGroup ? [firstPartyMember(leader.level)] : [],
  );
  const [quota, setQuota] = useState(initialQuota);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  const minutes = preset === "custom" ? Number(custom) : preset;
  const minutesValid =
    Number.isInteger(minutes) && minutes >= MINUTES_MIN && minutes <= MINUTES_MAX;
  const outOfPlans = !quota.unlimited && quota.remaining === 0;

  async function generate(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError("");
    // On phones the result is below the form; bring it into view.
    resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    try {
      const response = await fetch("/api/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          characterId,
          minutes,
          goal,
          ...(withGroup && party.length ? { party } : {}),
        }),
      });
      const body = await response.json();
      if (!response.ok) {
        setError(body.error ?? "Something went wrong. Please try again.");
      } else {
        setResult({ planId: body.planId, view: body.view });
        setQuota(body.quota);
      }
    } catch {
      setError("We couldn't reach the planner. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[2fr_3fr] lg:items-start">
      <form
        onSubmit={generate}
        className="space-y-6 rounded-lg border border-border bg-surface p-6"
      >
        <label className="block">
          <span className="mb-2 block text-sm text-text-muted">Character</span>
          <select
            value={characterId}
            onChange={(e) => {
              const next = characters.find((c) => c.id === e.target.value);
              // Another faction can't share a group (or some classes).
              if (next?.faction !== leader.faction) setParty([]);
              setCharacterId(e.target.value);
            }}
            className="h-11 w-full rounded-lg border border-border bg-background px-3 text-text focus-visible:outline-2 focus-visible:outline-accent sm:h-10"
          >
            {characters.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} · Level {c.level} {label(c.class)}
              </option>
            ))}
          </select>
        </label>

        <div>
          <ChipGroup
            legend="Who's playing"
            options={[
              { value: "solo", label: "Just me" },
              { value: "group", label: "With a group" },
            ]}
            value={withGroup ? "group" : "solo"}
            onChange={(v) => {
              setWithGroup(v === "group");
              if (v === "group" && !party.length) {
                setParty([firstPartyMember(leader.level)]);
              }
            }}
          />
          {withGroup && (
            <div className="mt-4">
              <PartyEditor
                leader={{ ...leader, class: leader.class as CharacterClass }}
                party={party}
                onChange={setParty}
              />
            </div>
          )}
        </div>

        <div>
          <ChipGroup
            legend="Time tonight"
            options={[
              ...presets.map((m) => ({ value: m as number | "custom", label: `${m} min` })),
              { value: "custom" as const, label: "Custom" },
            ]}
            value={preset}
            onChange={setPreset}
          />
          {preset === "custom" && (
            <label className="mt-3 flex items-center gap-2 text-sm text-text-muted">
              <input
                type="number"
                inputMode="numeric"
                min={MINUTES_MIN}
                max={MINUTES_MAX}
                value={custom}
                onChange={(e) => setCustom(e.target.value)}
                aria-invalid={!minutesValid}
                className="h-11 w-24 rounded-lg border border-border bg-background px-3 font-mono text-text focus-visible:outline-2 focus-visible:outline-accent sm:h-10"
              />
              minutes ({MINUTES_MIN} to {MINUTES_MAX})
            </label>
          )}
        </div>

        <ChipGroup
          legend="Goal"
          options={goals.map((g) => ({ value: g, label: goalLabels[g] }))}
          value={goal}
          onChange={setGoal}
        />

        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="submit"
            disabled={pending || !minutesValid || outOfPlans || (withGroup && !party.length)}
          >
            {pending ? "Planning…" : "Plan my session"}
          </Button>
          <QuotaPill quota={quota} />
        </div>
        <p aria-live="polite" className="min-h-5 text-sm text-danger">
          {error}
        </p>
      </form>

      <div ref={resultRef} className="scroll-mt-4">
        {pending ? (
          <PlanningSkeleton />
        ) : result ? (
          <>
            <PlanCard view={result.view} />
            <PlanFeedback key={result.planId} planId={result.planId} />
          </>
        ) : (
          <EmptyState />
        )}
      </div>
    </div>
  );
}

// A starting row for the party editor; priests are on both sides.
function firstPartyMember(level: number): PartyMember {
  return { class: "priest", level, prefers: "any" };
}

function PlanningSkeleton() {
  const [line, setLine] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setLine((l) => (l + 1) % planningLines.length), 1800);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="rounded-lg border border-border bg-surface p-6" aria-busy="true">
      <p aria-live="polite" className="text-accent">
        {planningLines[line]}
      </p>
      <div className="mt-6 space-y-3" aria-hidden="true">
        <div className="h-8 w-2/3 animate-pulse rounded bg-surface-raised" />
        <div className="h-3 animate-pulse rounded-full bg-surface-raised" />
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-12 animate-pulse rounded-lg bg-surface-raised" />
        ))}
      </div>
    </div>
  );
}

function EmptyState() {
  const sample = examplePlan.plan;
  return (
    <div className="rounded-lg border border-dashed border-border p-6">
      <p className="font-medium">Your plan shows up here.</p>
      <p className="mt-2 text-text-muted">
        A short checklist with a time budget for each step, ending where you&apos;ll log out rested.
        For example:
      </p>
      <ol className="mt-4 space-y-2 text-text-muted">
        {sample.steps.slice(0, 3).map((step, i) => (
          <li key={i} className="flex justify-between gap-4">
            <span>{step.action}</span>
            <span className="shrink-0 font-mono">{step.minutes}m</span>
          </li>
        ))}
      </ol>
      <Link href="/p/example" className={buttonClasses("ghost", "mt-4 -ml-5")}>
        See a full example →
      </Link>
    </div>
  );
}
