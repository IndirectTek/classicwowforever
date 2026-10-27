// Rested XP math, using classic-era rules. These are the original game's
// values; confirm them in WoW Forever and update the constants if they change.
//
// The XP bar is split into 20 "bubbles" (5% of a level each). Logged out in an
// inn or a capital city, a character earns one bubble every 8 hours; logged
// out anywhere else, a quarter of that. Rested XP caps at 1.5 levels (30
// bubbles), and while it lasts, kills give double XP.

export const BUBBLES_PER_LEVEL = 20;
export const MAX_BUBBLES = 30;
export const HOURS_PER_BUBBLE_RESTING = 8;
export const HOURS_PER_BUBBLE_ELSEWHERE = 32;
export const MAX_LEVEL = 60;

export type RestedInput = {
  currentBubbles: number;
  hoursAway: number;
  inRestArea: boolean;
};

export type RestedResult = {
  bubbles: number;
  gainedBubbles: number;
  percentOfLevel: number;
  capped: boolean;
  // Hours from logout until the cap, or 0 if already capped.
  hoursToCap: number;
};

export function restedAfter({ currentBubbles, hoursAway, inRestArea }: RestedInput): RestedResult {
  const start = clamp(currentBubbles, 0, MAX_BUBBLES);
  const hoursPerBubble = inRestArea ? HOURS_PER_BUBBLE_RESTING : HOURS_PER_BUBBLE_ELSEWHERE;
  const earned = Math.max(0, hoursAway) / hoursPerBubble;
  const bubbles = Math.min(MAX_BUBBLES, start + earned);

  return {
    bubbles,
    gainedBubbles: bubbles - start,
    percentOfLevel: (bubbles / BUBBLES_PER_LEVEL) * 100,
    capped: bubbles >= MAX_BUBBLES,
    hoursToCap: (MAX_BUBBLES - start) * hoursPerBubble,
  };
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}
