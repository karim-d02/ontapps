"use client";

import { useEffect } from "react";

/**
 * A soft light source that follows the cursor across interactive cards.
 *
 * This is the detail that makes a flat card feel like a physical object: the
 * highlight moves with the pointer, so the surface reads as being lit rather
 * than painted.
 *
 * One delegated listener for the whole document rather than one per card —
 * a browse page has up to eleven cards, and eleven mousemove handlers writing
 * style on every frame is a real cost for an effect that's meant to be free.
 *
 * Pointer-only. On touch there is no cursor to follow, `:hover` sticks after a
 * tap, and the whole thing becomes a smudge that won't go away.
 */
export function PointerLight() {
  useEffect(() => {
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

    let frame = 0;
    let pending: { card: HTMLElement; x: number; y: number } | null = null;

    function onPointerMove(event: PointerEvent) {
      if (event.pointerType !== "mouse") return;
      const target = event.target as HTMLElement | null;
      const card = target?.closest<HTMLElement>(".card-glow");
      if (!card) return;

      const rect = card.getBoundingClientRect();
      pending = {
        card,
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      };

      // Coalesced to one style write per frame. Writing on every pointermove
      // event invalidates layout far more often than the screen can show.
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        if (!pending) return;
        pending.card.style.setProperty("--mx", `${pending.x}px`);
        pending.card.style.setProperty("--my", `${pending.y}px`);
      });
    }

    document.addEventListener("pointermove", onPointerMove, { passive: true });
    return () => {
      document.removeEventListener("pointermove", onPointerMove);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return null;
}
