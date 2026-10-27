"use client";

import { ChipGroup } from "@/components/ui/ChipGroup";
import { useNow } from "@/lib/hooks/useNow";
import { useStoredState } from "@/lib/hooks/useStoredState";
import { BUBBLES_PER_LEVEL, MAX_BUBBLES, MAX_LEVEL, restedAfter } from "@/lib/rested";

type Inputs = { level: number; currentBubbles: number; inRestArea: boolean; hoursAway: number };

const awayOptions = [
  { value: 8, label: "8 hours" },
  { value: 24, label: "Tomorrow" },
  { value: 48, label: "2 days" },
  { value: 72, label: "3 days" },
  { value: 168, label: "A week" },
];

const placeOptions = [
  { value: "rest", label: "An inn or a city" },
  { value: "world", label: "Out in the world" },
];

export function RestedCalculator() {
  const [inputs, setInputs] = useStoredState<Inputs>("cwf:rested", {
    level: 20,
    currentBubbles: 0,
    inRestArea: true,
    hoursAway: 24,
  });
  const now = useNow(60_000);
  const result = restedAfter(inputs);
  const update = (changes: Partial<Inputs>) => setInputs({ ...inputs, ...changes });

  return (
    <div className="grid gap-6 lg:grid-cols-[2fr_3fr]">
      <form
        className="space-y-6 rounded-lg border border-border bg-surface p-6"
        onSubmit={(e) => e.preventDefault()}
      >
        <div className="grid grid-cols-2 gap-4">
          <NumberField
            label="Level"
            value={inputs.level}
            min={1}
            max={MAX_LEVEL}
            onChange={(level) => update({ level })}
          />
          <NumberField
            label="Rested bubbles now"
            hint="0 to 30"
            value={inputs.currentBubbles}
            min={0}
            max={MAX_BUBBLES}
            onChange={(currentBubbles) => update({ currentBubbles })}
          />
        </div>
        <ChipGroup
          legend="Logging out in"
          options={placeOptions}
          value={inputs.inRestArea ? "rest" : "world"}
          onChange={(place) => update({ inRestArea: place === "rest" })}
        />
        <ChipGroup
          legend="Back in"
          options={awayOptions}
          value={inputs.hoursAway}
          onChange={(hoursAway) => update({ hoursAway })}
        />
      </form>

      <section aria-live="polite" className="rounded-lg border border-border bg-surface p-6">
        {inputs.level >= MAX_LEVEL ? (
          <p className="text-lg">
            At level {MAX_LEVEL}, rested XP has nothing left to do. Log out wherever you like.
          </p>
        ) : (
          <>
            <p className="text-sm text-text-muted">When you log back in</p>
            <p className="font-display mt-1 text-4xl font-bold">
              <span className="font-mono">{round(result.bubbles)}</span> bubbles
            </p>
            <p className="mt-1 text-text-muted">
              <span className="font-mono text-text">{Math.round(result.percentOfLevel)}%</span> of a
              level of double XP from kills
            </p>

            <BubbleBar
              current={Math.min(inputs.currentBubbles, MAX_BUBBLES)}
              total={result.bubbles}
            />

            <ul className="mt-6 space-y-2 text-text-muted">
              <li>
                You&apos;ll earn{" "}
                <span className="font-mono text-text">{round(result.gainedBubbles)}</span> bubbles
                while you&apos;re away.
              </li>
              {result.capped ? (
                <li className="text-success">
                  That&apos;s the cap. Any longer away earns nothing more.
                </li>
              ) : (
                result.hoursToCap > 0 && (
                  <li>
                    Fully rested after {formatHours(result.hoursToCap)}
                    {now !== null && <> ({fullBy(now, result.hoursToCap)})</>}.
                  </li>
                )
              )}
              {!inputs.inRestArea && (
                <li className="text-warning">
                  Logging out in the open earns a quarter as much. Hearth to an inn first.
                </li>
              )}
            </ul>
          </>
        )}
      </section>
    </div>
  );
}

// 30 bubbles: one full level (20) plus half of the next (10).
function BubbleBar({ current, total }: { current: number; total: number }) {
  return (
    <div className="mt-6">
      <div
        className="flex gap-0.5"
        role="img"
        aria-label={`${round(total)} of ${MAX_BUBBLES} bubbles`}
      >
        {Array.from({ length: MAX_BUBBLES }, (_, i) => {
          const fill = Math.min(1, Math.max(0, total - i));
          return (
            <div
              key={i}
              className={`h-4 flex-1 overflow-hidden rounded-sm bg-surface-raised ${
                i === BUBBLES_PER_LEVEL ? "ml-1.5" : ""
              }`}
            >
              <div
                style={{ width: `${fill * 100}%` }}
                className={`h-full ${i < current ? "bg-accent" : "bg-accent/50"}`}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-1 flex text-xs text-text-muted">
        <span style={{ width: `${(BUBBLES_PER_LEVEL / MAX_BUBBLES) * 100}%` }}>One level</span>
        <span>Half the next</span>
      </div>
    </div>
  );
}

function NumberField({
  label,
  hint,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  hint?: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm text-text-muted">
        {label}
        {hint && <span className="sr-only"> ({hint})</span>}
      </span>
      <input
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        value={value}
        onChange={(e) => {
          const n = Number(e.target.value);
          if (Number.isFinite(n)) onChange(Math.min(max, Math.max(min, Math.round(n))));
        }}
        className="h-11 w-full rounded-lg border border-border bg-background px-3 font-mono text-text focus-visible:outline-2 focus-visible:outline-accent sm:h-10"
      />
    </label>
  );
}

function round(n: number) {
  return Math.round(n * 10) / 10;
}

function formatHours(hours: number) {
  if (hours < 48) return `${Math.round(hours)} hours`;
  return `${Math.round((hours / 24) * 10) / 10} days`;
}

function fullBy(now: number, hours: number) {
  return new Date(now + hours * 3_600_000).toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
