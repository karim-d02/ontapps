"use client";

import { useCallback, useSyncExternalStore } from "react";

const LOCAL_EVENT = "ontapps:storage";

/**
 * Cache keyed by storage key, so getSnapshot can return a referentially stable
 * value. Parsing fresh on every call would spin React forever. Module scope
 * rather than a ref because it describes the external store, not any one
 * component's view of it.
 */
const cache = new Map<string, { raw: string | null; parsed: unknown }>();

/**
 * JSON-backed localStorage, read as an external store.
 *
 * useSyncExternalStore rather than an effect that calls setState: localStorage
 * genuinely is an external store, the server snapshot is a stable fallback so
 * hydration matches, and there's no cascading render on mount. Two tabs stay
 * in step, which matters for a student who opens the checker twice.
 *
 * `validate` is not optional by accident. This reads data a previous version
 * of the site wrote, which a user may also have edited by hand; anything that
 * doesn't match the current shape is discarded rather than fed into the
 * eligibility logic.
 */
export function useStoredState<T>(
  key: string,
  fallback: T,
  validate: (value: unknown) => value is T
): [T, (next: T) => void] {
  const subscribe = useCallback(
    (onChange: () => void) => {
      function onStorage(event: StorageEvent) {
        if (event.key === null || event.key === key) onChange();
      }
      window.addEventListener("storage", onStorage);
      window.addEventListener(LOCAL_EVENT, onChange);
      return () => {
        window.removeEventListener("storage", onStorage);
        window.removeEventListener(LOCAL_EVENT, onChange);
      };
    },
    [key]
  );

  const getSnapshot = useCallback(() => {
    let raw: string | null = null;
    try {
      raw = window.localStorage.getItem(key);
    } catch {
      // Private mode or blocked storage. The fallback is the right answer.
      return fallback;
    }

    const entry = cache.get(key);
    if (entry && entry.raw === raw) return entry.parsed as T;

    let parsed: T = fallback;
    try {
      const value: unknown = raw ? JSON.parse(raw) : null;
      if (validate(value)) parsed = value;
    } catch {
      // Corrupted JSON — treat as empty rather than crashing the page.
    }

    cache.set(key, { raw, parsed });
    return parsed;
  }, [fallback, key, validate]);

  const ids = useSyncExternalStore(subscribe, getSnapshot, () => fallback);

  const setValue = useCallback(
    (next: T) => {
      try {
        window.localStorage.setItem(key, JSON.stringify(next));
      } catch {
        // Still works for this session, just won't survive a reload.
      }
      // `storage` only fires in *other* tabs, so this tab needs its own nudge.
      window.dispatchEvent(new Event(LOCAL_EVENT));
    },
    [key]
  );

  return [ids, setValue];
}
