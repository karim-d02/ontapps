"use client";

import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

export interface TocItem {
  id: string;
  label: string;
}

/**
 * In-page contents for program pages, which run long. A reader who came for
 * the supplementary-application deadline shouldn't have to scroll past courses
 * and averages to find it.
 *
 * Desktop only: on a phone a sticky sidebar would eat the viewport the content
 * needs, and the page is short enough to thumb through.
 */
export function ProgramToc({ items }: { items: TocItem[] }) {
  const activeId = useActiveSection(items);

  return (
    <nav
      aria-label="On this page"
      className="sticky top-[calc(var(--nav-height)+2rem)]"
    >
      <p className="text-label label-mono text-silver">On this page</p>
      <ul className="mt-4 flex flex-col">
        {items.map((item) => {
          const active = item.id === activeId;
          return (
            <li key={item.id}>
              <a
                href={`#${item.id}`}
                aria-current={active ? "true" : undefined}
                className={cn(
                  // The active marker is a rule in the left margin, so the
                  // labels themselves stay on one column edge and the eye can
                  // scan them without the text shifting.
                  "block border-l py-2 pl-4 text-small transition-colors duration-150 outline-none",
                  "focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none",
                  active
                    ? "border-silver-light font-medium text-foreground"
                    : "border-line text-muted-foreground hover:border-silver hover:text-foreground"
                )}
              >
                {item.label}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/**
 * Tracks which section the reader is in. Picks the last heading above the
 * reading line rather than "whatever is intersecting", so a short section
 * sandwiched between two long ones still registers, and the marker never
 * flickers between two entries at a boundary.
 */
function useActiveSection(items: TocItem[]) {
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    const ids = items.map((item) => item.id);

    const observer = new IntersectionObserver(
      () => {
        const line = window.innerHeight * 0.3;
        let current: string | null = null;
        for (const id of ids) {
          const el = document.getElementById(id);
          if (el && el.getBoundingClientRect().top <= line) current = id;
        }
        setActiveId(current ?? ids[0] ?? null);
      },
      // A dense band of thresholds turns the observer into a cheap "something
      // moved" signal without a scroll listener.
      { rootMargin: "-30% 0px -60% 0px", threshold: [0, 0.25, 0.5, 0.75, 1] }
    );

    for (const id of ids) {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [items]);

  return activeId;
}
