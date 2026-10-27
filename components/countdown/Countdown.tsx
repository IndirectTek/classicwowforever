"use client";

// Client Component: the browser owns the clock. Think of it as the one bit of
// Stimulus on an otherwise server-rendered page.
import Link from "next/link";
import { buttonClasses } from "@/components/ui/Button";
import { useNow } from "@/lib/hooks/useNow";
import { LAUNCH_AT, timeLeft } from "@/lib/launch";

const units = ["days", "hours", "minutes", "seconds"] as const;

export function Countdown() {
  // null on the server: it shows "--" placeholders until the browser takes over.
  const now = useNow(1000);
  const left = now === null ? null : timeLeft(now);

  if (now !== null && left === null) {
    return (
      <div>
        <p className="font-display text-3xl text-accent sm:text-5xl">The realms are open.</p>
        <Link href="/plan" className={buttonClasses("primary", "mt-6")}>
          Plan tonight&apos;s session
        </Link>
      </div>
    );
  }

  return (
    <div>
      <dl
        className="grid grid-cols-4 gap-2 sm:gap-4"
        aria-label="Time until WoW Forever launches"
        // Screen readers shouldn't hear a number every second.
        aria-live="off"
      >
        {units.map((unit) => (
          <div
            key={unit}
            className="flex flex-col-reverse rounded-lg border border-border bg-surface px-2 py-3 text-center sm:px-4 sm:py-5"
          >
            {/* dt comes first for screen readers; flex-col-reverse shows the number on top. */}
            <dt className="mt-2 text-xs uppercase tracking-widest text-text-muted sm:text-sm">
              {unit}
            </dt>
            <dd className="font-mono text-3xl tabular-nums sm:text-[64px] sm:leading-none">
              {left ? String(left[unit]).padStart(2, "0") : "--"}
            </dd>
          </div>
        ))}
      </dl>
      <p className="mt-4 text-sm text-text-muted">
        November 4 at 3:00 PM Pacific
        {now !== null && <> &middot; {localLaunchTime()} your time</>}
      </p>
    </div>
  );
}

function localLaunchTime() {
  return LAUNCH_AT.toLocaleString(undefined, {
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
}
