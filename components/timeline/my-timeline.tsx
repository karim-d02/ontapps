"use client";

import { Check, Plus } from "lucide-react";
import Link from "next/link";
import { useCallback, useMemo } from "react";

import { useStoredIds } from "@/hooks/use-stored-ids";

import { DateStamp } from "@/components/ui/date-stamp";
import { Pill } from "@/components/ui/pill";
import { resolveDeadline, type DatedItem } from "@/lib/deadlines";
import { cn } from "@/lib/utils";
import type { Program } from "@/types/schema";

const STORAGE_KEY = "ontapps:my-programs";

/**
 * One merged, chronological list of every date across the programs a student
 * is actually applying to — the thing they currently build by hand in Notes,
 * and the thing no faculty page can give them because each one only knows
 * about itself.
 *
 * Selection persists in localStorage. No account, nothing sent anywhere.
 */
export function MyTimeline({ programs, today }: { programs: Program[]; today: string }) {
  // The server snapshot is an empty list, so the server-rendered HTML and the
  // first client render agree; the saved selection arrives on the very next
  // commit. See hooks/use-stored-ids.ts.
  const [selected, setSelected] = useStoredIds(STORAGE_KEY);

  const toggle = useCallback(
    (id: string) => {
      setSelected(
        selected.includes(id) ? selected.filter((item) => item !== id) : [...selected, id]
      );
    },
    [selected, setSelected]
  );

  const entries = useMemo(() => {
    const chosen = programs.filter((program) => selected.includes(program.id));
    return chosen
      .flatMap((program) =>
        // Prior-cycle rows resolve with a null date and are dropped by the
        // filter below, so a previous cycle can never appear on this timeline.
        program.deadlines.map((entry) => ({ ...resolveDeadline(entry, today), program }))
      )
      .filter((entry): entry is DatedItem & { program: Program } => entry.date !== null)
      .sort((a, b) => a.date!.localeCompare(b.date!));
  }, [programs, selected, today]);

  const upcoming = entries.filter((entry) => entry.daysRemaining! >= 0);
  const past = entries.filter((entry) => entry.daysRemaining! < 0);

  return (
    <div className="grid-12">
      <div className="col-span-12 lg:col-span-4">
        <div className="lg:sticky lg:top-[calc(var(--nav-height)+2rem)]">
          <h2 className="text-h2 text-foreground">Your programs</h2>
          <p className="measure mt-2 text-small text-muted-foreground">
            Saved in this browser only. Nothing is sent anywhere and there&apos;s no
            account.
          </p>
          <ul className="mt-6 flex flex-col">
            {programs.map((program) => {
              const on = selected.includes(program.id);
              return (
                <li key={program.id} className="border-b border-line">
                  <button
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggle(program.id)}
                    className="group/pick flex w-full items-start gap-3 py-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <span
                      aria-hidden
                      className={cn(
                        "mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded border transition-colors duration-150 motion-reduce:transition-none",
                        on
                          ? "border-silver-light bg-silver-light text-surface-page"
                          : "border-line-strong group-hover/pick:border-silver"
                      )}
                    >
                      {on ? (
                        <Check className="size-3.5" strokeWidth={3} />
                      ) : (
                        <Plus className="size-3 text-silver" />
                      )}
                    </span>
                    <span className="min-w-0">
                      <span
                        className={cn(
                          "block text-small",
                          on ? "font-medium text-foreground" : "text-muted-foreground"
                        )}
                      >
                        {program.name}
                      </span>
                      <span className="block text-label label-mono text-silver">
                        {program.university}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      <div className="col-span-12 mt-12 lg:col-span-7 lg:col-start-6 lg:mt-0">
        {selected.length === 0 ? (
          <div className="surface-lit rounded-xl border border-line bg-card p-10">
            <p className="data text-label text-silver">Empty</p>
            <p className="measure mt-4 text-h3 text-foreground">
              Pick the programs you&apos;re actually applying to and every date lines up
              in one list.
            </p>
            <p className="measure mt-2 text-small text-muted-foreground">
              Queen&apos;s Commerce alone has eight dates. Across five applications
              that&apos;s the list people usually keep on a scrap of paper.
            </p>
          </div>
        ) : (
          <>
            <dl className="flex flex-wrap gap-x-12 gap-y-4 border-b border-line-strong pb-6">
              <div>
                <dd className="data text-metric text-foreground">{upcoming.length}</dd>
                <dt className="mt-2 text-label label-mono text-silver">Dates ahead</dt>
              </div>
              <div>
                <dd className="data text-metric text-foreground">{selected.length}</dd>
                <dt className="mt-2 text-label label-mono text-silver">Programs</dt>
              </div>
            </dl>

            {upcoming.length > 0 && (
              <ol className="mt-8 border-l border-line">
                {upcoming.map((entry, index) => (
                  <TimelineRow key={`${entry.program.id}-${index}`} entry={entry} />
                ))}
              </ol>
            )}

            {past.length > 0 && (
              <details className="mt-10">
                <summary className="cursor-pointer text-label label-mono text-silver outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  {past.length} already passed
                </summary>
                <ol className="mt-6 border-l border-line">
                  {past.map((entry, index) => (
                    <TimelineRow key={`${entry.program.id}-past-${index}`} entry={entry} />
                  ))}
                </ol>
              </details>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function TimelineRow({ entry }: { entry: DatedItem & { program: Program } }) {
  return (
    <li
      className={cn(
        "relative pb-8 pl-6 last:pb-0",
        "before:absolute before:top-1.5 before:-left-[4.5px] before:size-2 before:rounded-full before:ring-4 before:ring-background",
        entry.state === "imminent"
          ? "before:bg-silver-light"
          : entry.isDeadline
            ? "before:bg-silver"
            : "before:bg-silver-dark"
      )}
    >
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-2">
        <DateStamp item={entry} size="md" />
        {entry.isDeadline && <Pill>Deadline</Pill>}
      </div>
      <p
        className={cn(
          "measure mt-2 text-body",
          entry.isDeadline ? "font-medium text-foreground" : "text-muted-foreground"
        )}
      >
        {entry.label}
      </p>
      <Link
        href={`/programs/${entry.program.university_id}/${entry.program.id}`}
        className="mt-1.5 inline-block rounded-sm text-label label-mono text-silver outline-none transition-colors duration-150 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none"
      >
        {entry.program.name} — {entry.program.university}
      </Link>
    </li>
  );
}
