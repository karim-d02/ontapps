"use client";

import { useEffect, useRef } from "react";

import { cn } from "@/lib/utils";

/**
 * Fade-and-rise on first scroll into view. Once, never repeating — a section
 * that re-animates every time you scroll back past it is a section you can't
 * re-read.
 *
 * The trigger line is pulled up from the bottom of the viewport so content is
 * already settled by the time the reader's eye arrives, rather than popping in
 * after they're looking at it.
 *
 * Two deliberate choices:
 *   · The element renders visible and only *becomes* hidden once JS has
 *     confirmed it can run, so a failed or slow script leaves a readable page
 *     rather than a blank one.
 *   · State lives in a data attribute written directly to the DOM rather than
 *     in React state — this is presentation with no bearing on rendering, and
 *     a re-render per section per scroll is a cost with nothing to show for it.
 */
export function Reveal({
  as: Tag = "div",
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLElement> & { as?: "div" | "section" | "li" }) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    // Anything already on screen at mount was never "entering" — animating it
    // would be an entrance for content the reader is already reading.
    if (el.getBoundingClientRect().top < window.innerHeight) return;

    el.dataset.reveal = "hidden";
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        el.dataset.reveal = "shown";
        observer.disconnect();
      },
      { rootMargin: "0px 0px -12% 0px", threshold: 0 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <Tag ref={ref as React.Ref<never>} className={cn("reveal", className)} {...props}>
      {children}
    </Tag>
  );
}
