// A little personality. Keep lines short, friendly, and free of Blizzard
// trademarks and quotes.

// For the planner's loading state (Milestone 3).
export const planningLines = [
  "Consulting the quest giver…",
  "Checking the flight paths…",
  "Counting your bag slots…",
  "Asking the innkeeper about tonight…",
  "Unrolling the map…",
];

export const finishedLines = [
  "Rested and ready.",
  "Another good session in the books.",
  "Hearth home, log out, sleep well.",
];

// Deterministic pick so server and client render the same line.
export function pick(lines: readonly string[], seed: string): string {
  let hash = 0;
  for (const char of seed) hash = (hash * 31 + char.charCodeAt(0)) | 0;
  return lines[Math.abs(hash) % lines.length];
}
