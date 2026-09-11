"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

/**
 * Restores scroll position on a list page when the reader comes back to it.
 *
 * The browser's own restoration doesn't survive this app: PageTransition holds
 * the incoming route in `mode="wait"`, so at the moment the browser tries to
 * restore, the page it would restore against hasn't rendered and the document
 * is one viewport tall. Scrolling back to the twenty-third card by hand is the
 * kind of small tax that makes a site feel like it doesn't remember you.
 *
 * sessionStorage, not state: it has to survive a full reload and a back
 * navigation from a page that unmounted this tree.
 */
export function useScrollRestoration() {
  const pathname = usePathname();

  useEffect(() => {
    const key = `ontapps:scroll:${pathname}`;
    const stored = sessionStorage.getItem(key);

    if (stored) {
      const y = Number(stored);
      if (Number.isFinite(y) && y > 0) {
        // Two frames: one for this render to commit, one for the list below
        // to lay out, so the document is tall enough to scroll to.
        requestAnimationFrame(() => requestAnimationFrame(() => window.scrollTo(0, y)));
      }
    }

    // rAF-throttled so a fast scroll writes once per frame at most, rather
    // than once per scroll event.
    let frame = 0;
    function onScroll() {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        sessionStorage.setItem(key, String(window.scrollY));
      });
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [pathname]);
}
