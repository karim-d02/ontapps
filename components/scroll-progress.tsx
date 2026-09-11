/**
 * Reading progress for long pages. Answers "how much more of this is there".
 *
 * Driven entirely by CSS `animation-timeline: scroll()` — no scroll listener,
 * no JavaScript on the main thread per frame, and only `transform` animates.
 * Browsers without scroll-driven animations don't get a bar at all rather than
 * a dead one: it's a nicety, and paying for it with a JS scroll handler on a
 * mid-range phone is a bad trade. See `.scroll-progress` in app/globals.css.
 */
export function ScrollProgress() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-x-0 top-0 z-[60] h-px"
    >
      <div className="scroll-progress h-full origin-left bg-silver-light" />
    </div>
  );
}
