"use client";

import { useSyncExternalStore } from "react";

// The current time, refreshed every `intervalMs`. Returns null during server
// rendering and hydration, because the server can't know the visitor's
// clock; render a placeholder for null.
export function useNow(intervalMs = 1000): number | null {
  return useSyncExternalStore(
    (onTick) => {
      const id = setInterval(onTick, intervalMs);
      return () => clearInterval(id);
    },
    // Snap to the interval so React only re-renders when the value changes.
    () => Math.floor(Date.now() / intervalMs) * intervalMs,
    () => null,
  );
}
