"use client";

import { useCallback, useSyncExternalStore } from "react";

const EMPTY: string[] = [];

/**
 * A list of ids persisted in localStorage, read as an external store.
 *
 * useSyncExternalStore rather than an effect that calls setState: localStorage
 * genuinely *is* an external store, the server snapshot is a stable empty list
 * so hydration matches, and there's no cascading render on mount. It also
 * means two tabs stay in step — a student who opens the site twice sees the
 * same saved programs in both.
 *
 * The parsed value is cached against the raw string because getSnapshot must
 * return a referentially stable result; parsing fresh on every call would spin
 * React forever. The cache lives at module scope rather than in a ref because
 * it describes the external store, not any one component's instance of it —
 * two components watching the same key share it correctly.
 */
const cache = new Map<string, { raw: string | null; parsed: string[] }>();
export function useStoredIds(key: string): [string[], (ids: string[]) => void] {
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
      // Private mode or blocked storage. An empty list is the right fallback.
      return EMPTY;
    }

    const entry = cache.get(key);
    if (entry && entry.raw === raw) return entry.parsed;

    let parsedIds: string[] = EMPTY;
    try {
      const parsed: unknown = raw ? JSON.parse(raw) : [];
      if (Array.isArray(parsed)) {
        parsedIds = parsed.filter((id): id is string => typeof id === "string");
      }
    } catch {
      // Corrupted JSON — treat as empty rather than crashing the page.
    }

    cache.set(key, { raw, parsed: parsedIds });
    return parsedIds;
  }, [key]);

  const ids = useSyncExternalStore(subscribe, getSnapshot, () => EMPTY);

  const setIds = useCallback(
    (next: string[]) => {
      try {
        window.localStorage.setItem(key, JSON.stringify(next));
      } catch {
        // Selection is lost on reload but still works for this session.
      }
      // `storage` only fires in *other* tabs, so this tab needs its own nudge.
      window.dispatchEvent(new Event(LOCAL_EVENT));
    },
    [key]
  );

  return [ids, setIds];
}

const LOCAL_EVENT = "ontapps:storage";
