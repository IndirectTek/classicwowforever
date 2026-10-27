// November 4, 2026, 3:00 PM Pacific. Daylight saving ends November 1, so
// Pacific is on PST (UTC-8) that day. Keep the explicit offset: a bare
// "2026-11-04T15:00" would be parsed in whatever time zone the code runs in.
export const LAUNCH_AT = new Date("2026-11-04T15:00:00-08:00");

export type TimeLeft = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
};

// Returns null once launch has passed.
export function timeLeft(now: number, target: number = LAUNCH_AT.getTime()): TimeLeft | null {
  const ms = target - now;
  if (ms <= 0) return null;

  const totalSeconds = Math.floor(ms / 1000);
  return {
    days: Math.floor(totalSeconds / 86_400),
    hours: Math.floor((totalSeconds % 86_400) / 3_600),
    minutes: Math.floor((totalSeconds % 3_600) / 60),
    seconds: totalSeconds % 60,
  };
}
