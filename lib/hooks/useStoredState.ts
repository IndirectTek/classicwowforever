"use client";

import { useCallback, useSyncExternalStore } from "react";

// Like useState, but remembered in localStorage for this browser, so a page
// reload doesn't lose your place. A convenience only: if storage is blocked
// (private windows), it falls back to memory for the current visit.
//
// Built on useSyncExternalStore so the server render and hydration use
// `initial`, then the stored value appears without a hydration mismatch.

const memory = new Map<string, string>();
const listeners = new Set<() => void>();

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return memory.get(key) ?? null;
  }
}

function write(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    memory.set(key, value);
  }
  listeners.forEach((notify) => notify());
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  window.addEventListener("storage", onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

export function useStoredState<T>(key: string, initial: T): [T, (next: T) => void] {
  const raw = useSyncExternalStore(
    subscribe,
    () => read(key),
    () => null,
  );

  let value = initial;
  if (raw !== null) {
    try {
      value = JSON.parse(raw) as T;
    } catch {
      // Ignore a corrupted entry and start fresh.
    }
  }

  const setValue = useCallback((next: T) => write(key, JSON.stringify(next)), [key]);
  return [value, setValue];
}
