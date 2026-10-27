// Pure session timer logic, kept out of the component so it's easy to test.
// Times are epoch milliseconds.

export type TimerState = {
  startedAt: number | null;
  pausedAt: number | null;
  pausedMs: number;
};

export const idleTimer: TimerState = { startedAt: null, pausedAt: null, pausedMs: 0 };

// When this many minutes remain, the timer nudges you toward your logout spot.
export const WRAP_UP_MINUTES = 15;

export type TimerPhase = "idle" | "running" | "paused" | "wrap-up" | "over";

export function start(now: number): TimerState {
  return { startedAt: now, pausedAt: null, pausedMs: 0 };
}

export function pause(state: TimerState, now: number): TimerState {
  return state.startedAt !== null && state.pausedAt === null ? { ...state, pausedAt: now } : state;
}

export function resume(state: TimerState, now: number): TimerState {
  if (state.pausedAt === null) return state;
  return { ...state, pausedAt: null, pausedMs: state.pausedMs + (now - state.pausedAt) };
}

export function elapsedMs(state: TimerState, now: number): number {
  if (state.startedAt === null) return 0;
  const end = state.pausedAt ?? now;
  return Math.max(0, end - state.startedAt - state.pausedMs);
}

export function timerStatus(state: TimerState, now: number, totalMinutes: number) {
  const elapsed = elapsedMs(state, now);
  const remainingMs = totalMinutes * 60_000 - elapsed;

  let phase: TimerPhase;
  if (state.startedAt === null) phase = "idle";
  else if (remainingMs <= 0) phase = "over";
  else if (state.pausedAt !== null) phase = "paused";
  else if (remainingMs <= WRAP_UP_MINUTES * 60_000) phase = "wrap-up";
  else phase = "running";

  return { elapsedMs: elapsed, remainingMs, phase };
}

// Minutes left in the current step's budget: positive means time to spare,
// negative means you're over. `currentIndex` is the first unchecked step.
export function stepMinutesLeft(
  stepMinutes: number[],
  currentIndex: number,
  elapsed: number,
): number {
  const budgetThroughCurrent = stepMinutes
    .slice(0, currentIndex + 1)
    .reduce((sum, minutes) => sum + minutes, 0);
  return Math.round(budgetThroughCurrent - elapsed / 60_000);
}

// "1:05:09" or "42:07"
export function formatClock(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = String(m).padStart(h ? 2 : 1, "0");
  const ss = String(s).padStart(2, "0");
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}
