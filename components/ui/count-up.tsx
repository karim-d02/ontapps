"use client";

import { useEffect, useRef } from "react";

/**
 * Counts from 0 to `value` over 800ms, once, the first time it scrolls into
 * view. Nothing else on the site counts up — it earns its place on the landing
 * stats because those three figures are the argument for the site existing,
 * and it draws the eye to them exactly once.
 *
 * Deliberately a plain numeric ramp, not a rolling-digit odometer: a
 * split-flap effect would be the retro skeuomorphism this design explicitly
 * isn't doing.
 *
 * The real value is in the server-rendered HTML and is only replaced once the
 * animation starts, so the figure is correct with JS off and correct for a
 * crawler.
 */
export function CountUp({
  value,
  className,
}: {
  value: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const format = (n: number) => n.toLocaleString("en-CA");
    let frame = 0;

    const run = () => {
      const start = performance.now();
      const tick = (now: number) => {
        const t = Math.min((now - start) / 800, 1);
        // easeOutCubic — fast off the mark, settling rather than stopping.
        const eased = 1 - (1 - t) ** 3;
        el.textContent = format(Math.round(eased * value));
        if (t < 1) frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    };

    if (el.getBoundingClientRect().top < window.innerHeight) {
      el.textContent = format(0);
      run();
      return () => cancelAnimationFrame(frame);
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        el.textContent = format(0);
        run();
      },
      { threshold: 0.4 }
    );
    observer.observe(el);

    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [value]);

  return (
    <span ref={ref} className={className}>
      {value.toLocaleString("en-CA")}
    </span>
  );
}
