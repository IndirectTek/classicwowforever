"use client";

// The interactive half of a plan: checklist, time budget bar, and a session
// timer that nudges you toward your logout spot. Progress is remembered in
// this browser, so a reload (or a phone screen lock) doesn't lose your place.
import { useEffect } from "react";
import { finishedLines, pick } from "@/lib/flavor";
import { useNow } from "@/lib/hooks/useNow";
import { useStoredState } from "@/lib/hooks/useStoredState";
import type { StoredPlan } from "@/lib/schema";
import {
  formatClock,
  idleTimer,
  pause,
  resume,
  start,
  stepMinutesLeft,
  timerStatus,
  type TimerState,
} from "@/lib/timer";
import { Button } from "@/components/ui/Button";
import { QuestStep } from "./QuestStep";
import { TimeBudgetBar } from "./TimeBudgetBar";

type Props = {
  shareId: string;
  plan: StoredPlan;
  minutes: number;
};

type Progress = { timer: TimerState; done: boolean[]; keepAwake: boolean };

export function PlanSession({ shareId, plan, minutes }: Props) {
  const fresh: Progress = {
    timer: idleTimer,
    done: plan.steps.map(() => false),
    keepAwake: false,
  };
  const [progress, setProgress] = useStoredState<Progress>(`cwf:session:${shareId}`, fresh);
  const now = useNow(1000);

  const { timer, done, keepAwake } = progress;
  const status = timerStatus(timer, now ?? 0, minutes);
  const active = status.phase === "running" || status.phase === "wrap-up";
  const currentStep = done.findIndex((d) => !d);
  const allDone = currentStep === -1;
  const spot = plan.logoutSpot.name;

  useDocumentTitle(active ? `${formatClock(status.remainingMs)} left` : null);
  useWakeLock(active && keepAwake);

  function update(changes: Partial<Progress>) {
    setProgress({ ...progress, ...changes });
  }

  function toggleStep(index: number) {
    update({ done: done.map((d, i) => (i === index ? !d : d)) });
  }

  const message = allDone
    ? `${pick(finishedLines, shareId)} Log out at ${spot}.`
    : {
        idle: "Start the timer when you log in.",
        running: `On step ${currentStep + 1} of ${plan.steps.length}.`,
        paused: "Paused.",
        "wrap-up": `${Math.ceil(status.remainingMs / 60_000)} minutes left. Start heading to ${spot}.`,
        over: `Time's up. Log out at ${spot}.`,
      }[status.phase];

  const stepLeft =
    active && !allDone
      ? stepMinutesLeft(
          plan.steps.map((s) => s.minutes),
          currentStep,
          status.elapsedMs,
        )
      : null;

  return (
    <div className="space-y-6">
      <section
        aria-label="Session timer"
        className={`rounded-lg border p-4 ${
          status.phase === "wrap-up" || status.phase === "over" ? "border-warning" : "border-border"
        } bg-surface`}
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="font-mono text-4xl tabular-nums" aria-label="Time remaining">
              {now === null ? "--:--" : formatClock(status.remainingMs)}
            </p>
            <p
              aria-live="polite"
              className={`mt-1 text-sm ${
                status.phase === "wrap-up" || status.phase === "over"
                  ? "text-warning"
                  : allDone
                    ? "text-success"
                    : "text-text-muted"
              }`}
            >
              {message}
            </p>
          </div>
          <div className="flex gap-2">
            {status.phase === "idle" && (
              <Button onClick={() => update({ timer: start(Date.now()) })}>Start session</Button>
            )}
            {active && (
              <Button
                variant="secondary"
                onClick={() => update({ timer: pause(timer, Date.now()) })}
              >
                Pause
              </Button>
            )}
            {status.phase === "paused" && (
              <Button onClick={() => update({ timer: resume(timer, Date.now()) })}>Resume</Button>
            )}
            {status.phase !== "idle" && (
              <Button variant="ghost" onClick={() => setProgress({ ...fresh, keepAwake })}>
                Reset
              </Button>
            )}
          </div>
        </div>
        {now !== null && "wakeLock" in navigator && (
          <label className="mt-3 flex items-center gap-2 text-sm text-text-muted">
            <input
              type="checkbox"
              checked={keepAwake}
              onChange={(e) => update({ keepAwake: e.target.checked })}
              className="size-4 accent-accent"
            />
            Keep this screen on during the session
          </label>
        )}
      </section>

      <TimeBudgetBar
        stepMinutes={plan.steps.map((s) => s.minutes)}
        availableMinutes={minutes}
        doneSteps={done}
        currentStep={active ? currentStep : undefined}
      />

      <ol className="space-y-1">
        {plan.steps.map((step, i) => (
          <QuestStep
            key={i}
            step={step}
            index={i}
            done={done[i] ?? false}
            current={active && i === currentStep}
            onToggle={() => toggleStep(i)}
            status={
              i === currentStep && stepLeft !== null
                ? stepLeft >= 0
                  ? `${stepLeft} min left on this step`
                  : `${-stepLeft} min over on this step`
                : undefined
            }
          />
        ))}
      </ol>

      <div className="flex items-start gap-3 rounded-lg border border-border bg-surface p-4">
        <InnIcon />
        <div>
          <p className="font-medium">Log out at {spot}</p>
          <p className="text-sm text-text-muted">
            Logging out in an inn or a city earns rested XP for your next session.
          </p>
        </div>
      </div>
    </div>
  );
}

// Shows the countdown in the browser tab, so it's visible from the game screen.
function useDocumentTitle(prefix: string | null) {
  useEffect(() => {
    if (!prefix) return;
    const original = document.title;
    document.title = `${prefix} · ${original}`;
    return () => {
      document.title = original;
    };
  }, [prefix]);
}

// Keeps a phone screen from sleeping mid-session, where supported.
function useWakeLock(enabled: boolean) {
  useEffect(() => {
    if (!enabled || !("wakeLock" in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    const acquire = () => {
      if (document.visibilityState === "visible") {
        navigator.wakeLock
          .request("screen")
          .then((l) => (lock = l))
          .catch(() => {});
      }
    };
    acquire();
    // The browser drops the lock when the tab is hidden; take it back on return.
    document.addEventListener("visibilitychange", acquire);
    return () => {
      document.removeEventListener("visibilitychange", acquire);
      lock?.release().catch(() => {});
    };
  }, [enabled]);
}

function InnIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="mt-0.5 size-6 shrink-0 text-accent"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 11 12 4l9 7" />
      <path d="M5 10v10h14V10" />
      <path d="M10 20v-5h4v5" />
      <path d="M17 4v3" />
    </svg>
  );
}
