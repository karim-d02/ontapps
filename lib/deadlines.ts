import type { Program, TimelineEntry } from "@/types/program";

/**
 * The deadline urgency system.
 *
 * Every date in the interface resolves to exactly one of these states, and the
 * same state looks the same everywhere it appears — landing page, card,
 * program page, timeline. A student should recognise "not yet published" as
 * the same thing in all four places without being told.
 *
 * Urgency is carried by weight, size and a status word, never by colour: the
 * palette is monochrome, and a departure board tells you "DELAYED" from thirty
 * feet without needing red.
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
  /** No date published yet — `confirmed: false`. Never rendered as a date. */
  | "unpublished"
  /**
   * Confirmed, but the entry is a window rather than a day ("offers issued in
   * rounds from Nov/Dec through May"). Distinct from `unpublished`: the
   * university HAS told us, there simply isn't one date to show.
   */
  | "rolling";

export interface DatedItem {
  state: DateState;
  /** ISO date, present only for past/imminent/soon/later. */
  date: string | null;
  /** Whole calendar days from today. Negative once the date has passed. */
  daysRemaining: number | null;
  label: string;
  critical: boolean;
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

/** Resolves a raw timeline entry into a state. Never guesses a missing date. */
export function resolveEntry(entry: TimelineEntry, today: string): DatedItem {
  if (!entry.date) {
    return {
      // `confirmed` is what separates "they haven't told us" from "they told
      // us it's a window". Collapsing the two would report a published
      // schedule as missing, and a missing one as published.
      state: entry.confirmed ? "rolling" : "unpublished",
      date: null,
      daysRemaining: null,
      label: entry.label,
      critical: entry.critical,
    };
  }

  if (!entry.confirmed) {
    return {
      state: "unpublished",
      date: null,
      daysRemaining: null,
      label: entry.label,
      critical: entry.critical,
    };
  }

  const daysRemaining = daysBetween(today, entry.date);
  return {
    state: stateForDays(daysRemaining),
    date: entry.date,
    daysRemaining,
    label: entry.label,
    critical: entry.critical,
  };
}

export interface ProgramDate extends DatedItem {
  program: Program;
}

/**
 * Every dated, confirmed timeline entry across every program, soonest first.
 *
 * Timeline entries only: every confirmed supplementary-application deadline in
 * the dataset is already mirrored as a timeline entry, so reading both would
 * double-count rather than add anything.
 */
export function allDatedEntries(programs: Program[], today: string): ProgramDate[] {
  return programs
    .flatMap((program) =>
      program.timeline
        .map((entry) => ({ ...resolveEntry(entry, today), program }))
        .filter((item): item is ProgramDate => item.date !== null)
    )
    .sort((a, b) => a.date!.localeCompare(b.date!));
}

/** The soonest date still ahead of us, across all programs. */
export function nextUpcoming(programs: Program[], today: string): ProgramDate | null {
  return allDatedEntries(programs, today).find((item) => item.daysRemaining! >= 0) ?? null;
}

/** The soonest date still ahead of us that the dataset marks `critical`. */
export function nextCritical(programs: Program[], today: string): ProgramDate | null {
  return (
    allDatedEntries(programs, today).find(
      (item) => item.critical && item.daysRemaining! >= 0
    ) ?? null
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
