"use client";

import { useEffect } from "react";

/**
 * Sets `data-lowfx="true"` on <html> for devices that should not pay for
 * backdrop-filter. `.surface-frosted` reads that attribute and falls back to
 * an opaque surface (see app/globals.css).
 *
 * The heuristic is deliberately crude — there is no reliable way to ask a
 * browser "are you fast" — but it catches the case that actually matters: a
 * mid-range Android phone, which is a large share of this audience. Being
 * wrong in either direction costs nothing more than a little translucency.
 *
 * Runs after hydration, so a capable device may paint one blurred frame
 * before the flag lands. That's the right trade: doing this before paint
 * means a render-blocking inline script on every page.
 */
export function LowFxFlag() {
  useEffect(() => {
    const nav = navigator as Navigator & { deviceMemory?: number };
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    const fewCores = (nav.hardwareConcurrency ?? 8) <= 4;
    const lowMemory = (nav.deviceMemory ?? 8) <= 4;

    if (coarse && (fewCores || lowMemory)) {
      document.documentElement.dataset.lowfx = "true";
    }
  }, []);

  return null;
}
