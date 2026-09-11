"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { usePathname } from "next/navigation";
import { useCallback, useRef } from "react";

/**
 * Route change: the outgoing page fades and drops 8px while the incoming page
 * rises 8px and fades in, overlapping so there is never a blank frame.
 *
 * `mode="popLayout"` rather than `mode="wait"`: waiting means the old page has
 * fully left before the new one starts, which is exactly the blank frame this
 * is meant to avoid. popLayout takes the exiting page out of layout flow so
 * the two can overlap without the incoming page being pushed down the screen.
 *
 * The header is outside this subtree and never moves — it's the fixed frame
 * the content moves within.
 *
 * `initial={false}` means the first server-rendered paint is never touched, so
 * nothing is hidden before hydration.
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const prefersReducedMotion = useReducedMotion();
  const focusHeading = useIncomingHeadingFocus();

  if (prefersReducedMotion) {
    return (
      <div key={pathname} ref={focusHeading}>
        {children}
      </div>
    );
  }

  return (
    <AnimatePresence initial={false} mode="popLayout">
      <motion.div
        key={pathname}
        ref={focusHeading}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

/**
 * Moves focus to the incoming page's heading after a client-side navigation.
 *
 * Without this a screen-reader or keyboard user stays wherever they were — the
 * URL changed, the whole page changed, and nothing told them.
 *
 * A ref callback on the incoming wrapper rather than an effect that queries
 * the document: during an overlapping transition both pages are mounted at
 * once, so `document.querySelector("main h1")` finds the *outgoing* page's
 * heading, focuses it, and then loses focus to <body> when that page unmounts
 * a quarter-second later. Scoping the query to the node this callback is
 * handed removes the ambiguity entirely.
 *
 * Skipped on the first mount, where the browser's own document-load behaviour
 * is correct and stealing focus would be wrong.
 */
function useIncomingHeadingFocus() {
  const first = useRef(true);

  return useCallback((node: HTMLDivElement | null) => {
    if (!node) return;
    if (first.current) {
      first.current = false;
      return;
    }

    const target = node.querySelector<HTMLElement>("h1") ?? node;
    if (!target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");
    target.focus({ preventScroll: true });
  }, []);
}
