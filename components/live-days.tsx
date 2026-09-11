"use client";

import { useCallback, useSyncExternalStore } from "react";

import { daysBetween, daysLabel, todayISO } from "@/lib/deadlines";

/**
 * "3 days left", kept honest after the page was built.
 *
 * These pages are statically generated, so a day count baked into the HTML
 * goes stale the moment the date rolls over — and a stale count on a deadline
 * site is the failure case, not a cosmetic bug. useSyncExternalStore lets the
 * server snapshot (the build-time count, already in the HTML) hydrate cleanly
 * and then hand over to a live client snapshot, with no mismatch and no
 * setState-in-an-effect.
 *
 * It re-reads on visibilitychange because the common case is a phone left open
 * overnight: the reader comes back in the morning to a count from yesterday.
 */
export function LiveDays({
  iso,
  initialDays,
  className,
}: {
  iso: string;
  /** Day count computed where this was rendered — the hydration baseline. */
  initialDays: number;
  className?: string;
}) {
  const subscribe = useCallback((onChange: () => void) => {
    document.addEventListener("visibilitychange", onChange);
    window.addEventListener("focus", onChange);
    // Belt and braces for a tab that is simply left open and visible.
    const timer = window.setInterval(onChange, 60_000);
    return () => {
      document.removeEventListener("visibilitychange", onChange);
      window.removeEventListener("focus", onChange);
      window.clearInterval(timer);
    };
  }, []);

  const days = useSyncExternalStore(
    subscribe,
    () => daysBetween(todayISO(), iso),
    () => initialDays
  );

  return <span className={className}>{daysLabel(days)}</span>;
}
