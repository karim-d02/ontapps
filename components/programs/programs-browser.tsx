"use client";

import { Check, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useCallback, useMemo, useRef } from "react";

import { ProgramCard } from "@/components/programs/program-card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  GATEKEEPING_FILTER_ORDER,
  getCategoryLabel,
  getGatekeepingFor,
  getGatekeepingModel,
} from "@/lib/data";
import type {
  GatekeepingModelId,
  Program,
  ProgramCategory,
  University,
} from "@/types/schema";

/**
 * The gatekeeping filter options.
 *
 * "undetermined" is one of them, listed separately and last. It is NOT grouped
 * with "at_the_door": the data does not establish whether those two programs
 * have a gate at all, and folding them into a definite answer would hand a
 * student a classification that does not exist. Labels come from the data.
 */
const GATEKEEPING_OPTIONS: GatekeepingModelId[] = GATEKEEPING_FILTER_ORDER;

function gatekeepingOptionLabel(model: GatekeepingModelId): string {
  return getGatekeepingModel(model)?.label ?? model;
}

const ALL = "all";
const MAX_COMPARE = 3;

export function ProgramsBrowser({
  programs,
  universities,
  categories,
  today,
}: {
  programs: Program[];
  universities: University[];
  categories: ProgramCategory[];
  today: string;
}) {
  const pathname = usePathname();
  const params = useSearchParams();
  const prefersReducedMotion = useReducedMotion();
  const gridRef = useRef<HTMLUListElement>(null);

  // Filter state lives in the URL, not in component state: a filtered view is
  // then shareable ("here's the three at-the-door engineering ones"), survives
  // a refresh, and the browser's own back button undoes a filter change.
  const school = params.get("school") ?? ALL;
  const category = params.get("category") ?? ALL;
  const gatekeeping = params.get("gatekeeping") ?? ALL;
  const compare = useMemo(
    () => (params.get("compare") ?? "").split(",").filter(Boolean),
    [params]
  );

  /**
   * Writes the filter state into the address bar.
   *
   * history.replaceState, not router.replace. On a statically rendered route
   * the App Router deduplicates a soft navigation whose pathname is unchanged,
   * so `router.replace("/programs?category=eng")` from "/programs?category=health"
   * silently did nothing — the handler ran, the call was made, and the URL
   * never moved. (It appeared to work only from a URL with no query at all,
   * which is why it survived the first round of testing.)
   *
   * These filters are pure client state with no server work behind them, so
   * there is nothing to navigate to in the first place. Next patches the
   * history methods and re-runs useSearchParams, so the component still
   * re-renders and Back still undoes a filter change.
   */
  const setSearch = useCallback(
    (mutate: (next: URLSearchParams) => void) => {
      const next = new URLSearchParams(params.toString());
      mutate(next);
      const query = next.toString();
      // No scroll change: altering a filter shouldn't throw the reader back to
      // the top of a list they are part-way down.
      window.history.replaceState(null, "", query ? `${pathname}?${query}` : pathname);
    },
    [params, pathname]
  );

  const setParam = useCallback(
    (key: string, value: string) => {
      setSearch((next) => {
        if (value === ALL || value === "") next.delete(key);
        else next.set(key, value);
      });
    },
    [setSearch]
  );

  const toggleCompare = useCallback(
    (id: string) => {
      const next = compare.includes(id)
        ? compare.filter((item) => item !== id)
        : [...compare, id].slice(0, MAX_COMPARE);
      setParam("compare", next.join(","));
    },
    [compare, setParam]
  );

  const categoryLabelById = useMemo(
    () => new Map(categories.map((c) => [c, getCategoryLabel(c)])),
    [categories]
  );

  const universityNameById = useMemo(
    () => new Map(universities.map((u) => [u.id, u.name])),
    [universities]
  );

  const filtered = programs.filter(
    (program) =>
      (school === ALL || program.university_id === school) &&
      (category === ALL || program.category === category) &&
      (gatekeeping === ALL ||
        getGatekeepingFor(program.id)?.model === gatekeeping)
  );

  const hasActiveFilters = school !== ALL || category !== ALL || gatekeeping !== ALL;

  const clearFilters = useCallback(() => {
    // Clears the three filters but keeps any comparison the reader has built
    // up — losing their selection would be a second, unasked-for undo.
    setSearch((next) => {
      next.delete("school");
      next.delete("category");
      next.delete("gatekeeping");
    });
  }, [setSearch]);

  /**
   * Arrow-key navigation across the grid. Columns are derived from where the
   * cards actually sit (same offsetTop = same row) rather than from a
   * hard-coded breakpoint, so it stays correct at every width and after a
   * filter change reflows the grid.
   */
  const onGridKeyDown = useCallback((event: React.KeyboardEvent<HTMLUListElement>) => {
    const keys = ["ArrowRight", "ArrowLeft", "ArrowDown", "ArrowUp", "Home", "End"];
    if (!keys.includes(event.key)) return;

    const links = Array.from(
      gridRef.current?.querySelectorAll<HTMLAnchorElement>("a[data-card-link]") ?? []
    );
    if (links.length === 0) return;

    const index = links.findIndex((link) => link === document.activeElement);
    if (index === -1) return;

    const tops = links.map((link) => link.closest("li")?.offsetTop ?? 0);
    const columns = Math.max(1, tops.filter((top) => top === tops[0]).length);

    let target = index;
    if (event.key === "ArrowRight") target = index + 1;
    if (event.key === "ArrowLeft") target = index - 1;
    if (event.key === "ArrowDown") target = index + columns;
    if (event.key === "ArrowUp") target = index - columns;
    if (event.key === "Home") target = 0;
    if (event.key === "End") target = links.length - 1;

    if (target < 0 || target >= links.length) return;
    event.preventDefault();
    links[target].focus();
  }, []);

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <Select value={school} onValueChange={(value) => setParam("school", value ?? ALL)}>
          <SelectTrigger className="w-52" aria-label="Filter by school">
            <SelectValue placeholder="School">
              {(value: string) =>
                value === ALL ? "All schools" : (universityNameById.get(value) ?? value)
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All schools</SelectItem>
            {universities.map((u) => (
              <SelectItem key={u.id} value={u.id}>
                {u.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={category} onValueChange={(value) => setParam("category", value ?? ALL)}>
          <SelectTrigger className="w-48" aria-label="Filter by field">
            <SelectValue placeholder="Field">
              {(value: string) =>
                value === ALL
                  ? "All fields"
                  : (categoryLabelById.get(value as ProgramCategory) ?? value)
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All fields</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c} value={c}>
                {getCategoryLabel(c)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={gatekeeping}
          onValueChange={(value) => setParam("gatekeeping", value ?? ALL)}
        >
          <SelectTrigger className="w-56" aria-label="Filter by gatekeeping model">
            <SelectValue placeholder="Gatekeeping model">
              {(value: string) =>
                value === ALL
                  ? "All gatekeeping models"
                  : gatekeepingOptionLabel(value as GatekeepingModelId)
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All gatekeeping models</SelectItem>
            {GATEKEEPING_OPTIONS.map((g) => (
              <SelectItem key={g} value={g}>
                {gatekeepingOptionLabel(g)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasActiveFilters && (
          <Button variant="secondary" onClick={clearFilters}>
            <X aria-hidden />
            Clear filters
          </Button>
        )}
      </div>

      <p className="data mt-6 text-label text-silver" aria-live="polite">
        {filtered.length} of {programs.length} programs
        {hasActiveFilters ? " match these filters" : ""}
      </p>

      {filtered.length === 0 ? (
        <EmptyState onClear={clearFilters} />
      ) : (
        <ul
          ref={gridRef}
          onKeyDown={onGridKeyDown}
          className="mt-6 grid grid-cols-1 gap-[var(--gutter)] sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4"
        >
          <AnimatePresence mode="popLayout" initial={false}>
            {filtered.map((program) => (
              <motion.li
                key={program.id}
                layout={!prefersReducedMotion}
                initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={prefersReducedMotion ? undefined : { opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
              >
                <ProgramCard
                  as="div"
                  program={program}
                  today={today}
                  categoryLabel={categoryLabelById.get(program.category) ?? program.category}
                  selectSlot={
                    <CompareToggle
                      selected={compare.includes(program.id)}
                      disabled={compare.length >= MAX_COMPARE && !compare.includes(program.id)}
                      name={program.name}
                      onToggle={() => toggleCompare(program.id)}
                    />
                  }
                />
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}

      <CompareBar
        ids={compare}
        programs={programs}
        onClear={() => setParam("compare", "")}
      />
    </>
  );
}

function CompareToggle({
  selected,
  disabled,
  name,
  onToggle,
}: {
  selected: boolean;
  disabled: boolean;
  name: string;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      disabled={disabled}
      onClick={onToggle}
      // z-10 lifts it above the card's stretched link, which otherwise covers
      // the whole surface including this control.
      className={cn(
        "relative z-10 inline-flex shrink-0 items-center gap-1.5 rounded-md border px-2 py-1 text-label label-mono outline-none",
        "transition-[border-color,color,background-color] duration-150 focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none",
        selected
          ? "border-silver-light bg-surface-overlay text-foreground"
          : "border-line text-silver hover:border-silver hover:text-foreground",
        disabled && "cursor-not-allowed opacity-40 hover:border-line hover:text-silver"
      )}
    >
      {selected && <Check aria-hidden className="size-3.5" strokeWidth={3} />}
      {selected ? "Comparing" : "Compare"}
      <span className="sr-only"> {name}</span>
    </button>
  );
}

/**
 * Says what to do, not just that nothing happened. "No results" tells a
 * stressed reader they did something wrong; this tells them which filter to
 * drop and gives them the button.
 */
function EmptyState({ onClear }: { onClear: () => void }) {
  return (
    <div className="mt-6 surface-lit rounded-xl border border-line bg-card p-10 text-center">
      <p className="data text-label text-silver">No matches</p>
      <p className="mx-auto mt-4 max-w-md text-h3 text-foreground">
        Nothing matches all three filters at once.
      </p>
      <p className="mx-auto mt-2 max-w-md text-small text-muted-foreground">
        There are only 11 programs in the dataset, so combinations run out quickly —
        two-years-in engineering, for example, doesn&apos;t exist here.
      </p>
      <Button size="lg" className="mt-6" onClick={onClear}>
        Clear all filters
      </Button>
    </div>
  );
}

/** Floating bar that appears once anything is selected for comparison. */
function CompareBar({
  ids,
  programs,
  onClear,
}: {
  ids: string[];
  programs: Program[];
  onClear: () => void;
}) {
  const selected = ids
    .map((id) => programs.find((program) => program.id === id))
    .filter((program): program is Program => Boolean(program));

  const enough = selected.length >= 2;

  return (
    <div
      // `inert`, not `aria-hidden`: aria-hidden on a container whose buttons
      // and links are still in the tab order is worse than doing nothing — a
      // keyboard user tabs into controls a screen reader has been told don't
      // exist. inert removes it from both at once, and still lets the bar
      // transition in and out rather than being unmounted.
      inert={selected.length === 0}
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 transition-[opacity,translate] duration-200 ease-out motion-reduce:transition-none",
        selected.length === 0 && "pointer-events-none translate-y-4 opacity-0"
      )}
    >
      <div className="shell pb-4">
        <div className="surface-frosted mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-4 rounded-xl border border-line-strong p-4 shadow-lg shadow-black/50">
          <div className="min-w-0">
            <p className="data text-label text-silver">
              {selected.length} of {MAX_COMPARE} selected
            </p>
            <p className="mt-1 truncate text-small text-foreground">
              {selected.map((program) => program.name).join("  ·  ")}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button variant="ghost" onClick={onClear}>
              Clear
            </Button>
            <Button
              arrow
              size="lg"
              disabled={!enough}
              nativeButton={false}
              render={<Link href={`/compare?programs=${ids.join(",")}`} />}
            >
              {enough ? "Compare" : "Pick one more"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
