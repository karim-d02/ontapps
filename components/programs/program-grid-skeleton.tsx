import { cn } from "@/lib/utils";

/**
 * Placeholder cards matching the real ones' dimensions — never a spinner, and
 * never a layout shift when the real content lands. The row heights here are
 * the same rhythm ProgramCard uses (pill, title, school, four readout rows),
 * so the grid doesn't jump by a pixel on swap.
 */
export function ProgramGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        {[52, 48, 56].map((width) => (
          <div
            key={width}
            className="h-8 rounded-lg border border-line bg-surface-raised"
            style={{ width: `${width / 4}rem` }}
          />
        ))}
      </div>
      <div className="mt-6 h-4 w-40 rounded bg-surface-raised" />
      <ul
        aria-hidden
        className="mt-6 grid grid-cols-1 gap-[var(--gutter)] sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4"
      >
        {Array.from({ length: count }, (_, index) => (
          <li
            key={index}
            className="surface-lit rounded-xl border border-line bg-card p-5 motion-safe:animate-pulse"
            // A staggered start keeps the grid from pulsing as one slab, which
            // reads as a broken screen rather than as loading.
            style={{ animationDelay: `${(index % 4) * 120}ms` }}
          >
            <Bar className="h-5 w-24 rounded-full" />
            <Bar className="mt-4 h-5 w-5/6" />
            <Bar className="mt-2 h-3.5 w-2/3" />
            <div className="mt-5 border-t border-line pt-4">
              {[0, 1, 2, 3].map((row) => (
                <div key={row} className="mt-2.5 flex gap-3 first:mt-0">
                  <Bar className="h-3.5 w-[5.5rem] shrink-0" />
                  <Bar className="h-3.5 w-full max-w-28" />
                </div>
              ))}
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}

function Bar({ className }: { className?: string }) {
  return <div className={cn("rounded bg-surface-overlay", className)} />;
}
