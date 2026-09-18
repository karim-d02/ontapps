import type { DateRange, Deadline, Program } from "@/types/schema";

/**
 * The deadline urgency system.
 *
 * Every date in the interface resolves to exactly one of these states, and the
 * same state looks the same everywhere it appears — landing page, card,
 * program page, timeline.
 *
 * Urgency is carried by weight, size and a status word, never by colour: the
 * palette is monochrome, and a departure board tells you "DELAYED" from thirty
 * feet without needing red.
 *
 * The new schema does the date reasoning for us and we do not second-guess it:
 * `is_deadline` marks the only rows safe for date math, `is_prior_cycle` marks
 * a previous cycle, and `date_range` carries a window. Nothing here parses
 * `date_text` — it is display copy, never an input.
 */
export type DateState =
  /** Confirmed date, already gone. */
  | "past"
  /** Confirmed, 0–7 days out. */
  | "imminent"
  /** Confirmed, 8–30 days out. */
  | "soon"
  /** Confirmed, more than 30 days out. */
  | "later"
  /** No date published yet. Never rendered as a date. */
  | "unpublished"
  /**
   * The source gave a window rather than a day. Distinct from `unpublished`:
   * the university HAS told us, there simply isn't one date to show.
   */
  | "rolling"
  /**
   * A PREVIOUS cycle's date, kept for reference. Never upcoming, never in a
   * countdown, and always labelled as last cycle where it is shown at all.
   */
  | "prior_cycle";

export interface DatedItem {
  state: DateState;
  /** ISO date, present only for past/imminent/soon/later. */
  date: string | null;
  /** Set when the source gave a window instead of a single date. */
  dateRange: DateRange | null;
  /** Whole calendar days from today. Negative once the date has passed. */
  daysRemaining: number | null;
  label: string;
  /** Display copy from the data. Never parsed, never sorted on. */
  dateText: string | null;
  kind: Deadline["kind"];
  /** Derived in the data: the only rows safe for countdowns and sorting. */
  isDeadline: boolean;
  isPriorCycle: boolean;
}

/** Today as an ISO date string in the viewer's own local calendar. */
export function todayISO(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Whole calendar days between two ISO dates. Built from UTC midnights of the
 * parsed Y/M/D rather than from Date parsing, so a deadline never shifts by a
 * day for a reader in a different timezone — which for a site whose entire
 * job is deadlines is the difference between right and catastrophically wrong.
 */
export function daysBetween(fromISO: string, toISO: string): number {
  const [fy, fm, fd] = fromISO.split("-").map(Number);
  const [ty, tm, td] = toISO.split("-").map(Number);
  const from = Date.UTC(fy, fm - 1, fd);
  const to = Date.UTC(ty, tm - 1, td);
  return Math.round((to - from) / 86_400_000);
}

export function stateForDays(daysRemaining: number): DateState {
  if (daysRemaining < 0) return "past";
  if (daysRemaining <= 7) return "imminent";
  if (daysRemaining <= 30) return "soon";
  return "later";
}

/**
 * Resolves a deadline row into a state. Never guesses a missing date.
 *
 * Order matters: a prior-cycle row is a prior-cycle row even when it carries a
 * perfectly parseable date range, because presenting last year's date as this
 * year's is the failure mode that actually costs someone a place.
 */
export function resolveDeadline(deadline: Deadline, today: string): DatedItem {
  const base = {
    date: null,
    dateRange: deadline.date_range,
    daysRemaining: null,
    label: deadline.label,
    dateText: deadline.date_text,
    kind: deadline.kind,
    isDeadline: deadline.is_deadline,
    isPriorCycle: deadline.is_prior_cycle,
  };

  if (deadline.is_prior_cycle) {
    return { ...base, state: "prior_cycle" };
  }

  if (deadline.date_range) {
    return { ...base, state: "rolling" };
  }

  if (!deadline.date) {
    return { ...base, state: "unpublished" };
  }

  const daysRemaining = daysBetween(today, deadline.date);
  return {
    ...base,
    state: stateForDays(daysRemaining),
    date: deadline.date,
    daysRemaining,
  };
}

export interface ProgramDate extends DatedItem {
  program: Program;
}

/**
 * Every row across every program that is safe for date math, soonest first.
 *
 * `is_deadline` is the whole filter. It already means "kind is deadline AND the
 * date parses", so this excludes decision windows, opening dates, recommended
 * dates, milestones and — critically — prior-cycle rows.
 */
export function allDatedEntries(
  programs: Program[],
  today: string,
): ProgramDate[] {
  return programs
    .flatMap((program) =>
      program.deadlines
        .filter((deadline) => deadline.is_deadline)
        .map((deadline) => ({ ...resolveDeadline(deadline, today), program })),
    )
    .filter((item): item is ProgramDate => item.date !== null)
    .sort((a, b) => a.date!.localeCompare(b.date!));
}

/** The soonest real deadline still ahead of us, across all programs. */
export function nextUpcoming(
  programs: Program[],
  today: string,
): ProgramDate | null {
  return (
    allDatedEntries(programs, today).find(
      (item) => item.daysRemaining !== null && item.daysRemaining >= 0,
    ) ?? null
  );
}

/**
 * Every dated row for one program, for display rather than date math.
 *
 * Prior-cycle rows are kept — a program page may show them — but they arrive
 * carrying `state: "prior_cycle"` so a caller cannot render one as upcoming by
 * accident.
 */
export function programDates(program: Program, today: string): DatedItem[] {
  return program.deadlines.map((deadline) => resolveDeadline(deadline, today));
}

/** The soonest real deadline for one program. */
export function nextDeadlineFor(
  program: Program,
  today: string,
): DatedItem | null {
  return (
    program.deadlines
      .filter((deadline) => deadline.is_deadline)
      .map((deadline) => resolveDeadline(deadline, today))
      .filter((item) => item.date !== null && item.daysRemaining! >= 0)
      .sort((a, b) => a.date!.localeCompare(b.date!))[0] ?? null
  );
}

/**
 * "Jan 15, 2027". Built from the string parts rather than from a parsed Date,
 * for the same timezone reason as daysBetween.
 */
export function formatDate(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString("en-CA", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** "15 January 2027" — the long form, for the one headline date on the landing page. */
export function formatDateLong(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString("en-CA", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** "Feb 2 – Feb 5, 2026" for a window the source gave as a range. */
export function formatDateRange(range: DateRange): string | null {
  if (!range.start && !range.end) return null;
  if (range.start && range.end) {
    return `${formatDate(range.start)} – ${formatDate(range.end)}`;
  }
  return formatDate((range.start ?? range.end)!);
}

/**
 * The status word that sits beside a date. Written the way a person would say
 * it out loud — "Tomorrow", "3 days left" — because "T-3" is a thing an
 * interface says, not a thing a person reads at 1am.
 */
export function daysLabel(daysRemaining: number): string {
  if (daysRemaining < -1) return `${Math.abs(daysRemaining)} days ago`;
  if (daysRemaining === -1) return "Yesterday";
  if (daysRemaining === 0) return "Today";
  if (daysRemaining === 1) return "Tomorrow";
  return `${daysRemaining} days left`;
}
