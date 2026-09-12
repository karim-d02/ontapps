import { getAllPrograms, getSchoolSlug } from "@/lib/programs";
import type { Program, TimelineEntry } from "@/types/program";

/**
 * Computed relationships between programs, and the list of things a
 * university hasn't published.
 *
 * Everything here is derived from fields that already exist. Nothing is
 * inferred about difficulty, competitiveness or likelihood, and no date is
 * used unless it is both `confirmed` and non-null.
 */

const COLLISION_WINDOW_DAYS = 14;

export interface DatedPoint {
  date: string;
  label: string;
  /** Where the date came from, so the UI can attribute it. */
  origin: "timeline" | "suppApp";
}

/**
 * Every date a program has actually committed to.
 *
 * `confirmed === true` AND a non-null date, with no exceptions. McMaster
 * BHSc's supplementary deadline is null with an `estimate` beside it; an
 * estimate is not a date and must never enter a collision calculation. A
 * student told two programs clash on a date one of them hasn't published is
 * being handed a fiction.
 */
export function confirmedDates(program: Program): DatedPoint[] {
  const points: DatedPoint[] = program.timeline
    .filter((entry): entry is TimelineEntry & { date: string } =>
      Boolean(entry.confirmed && entry.date)
    )
    .map((entry) => ({ date: entry.date, label: entry.label, origin: "timeline" as const }));

  const supp = program.suppApp;
  if (supp.required && supp.deadline.confirmed && supp.deadline.date) {
    const date = supp.deadline.date;
    // The supplementary deadline is mirrored in the timeline on every program
    // that has one; only add it if it isn't already there.
    if (!points.some((point) => point.date === date)) {
      points.push({ date, label: supp.deadline.text, origin: "suppApp" });
    }
  }

  return points.sort((a, b) => a.date.localeCompare(b.date));
}

function daysApart(a: string, b: string): number {
  const [ay, am, ad] = a.split("-").map(Number);
  const [by, bm, bd] = b.split("-").map(Number);
  return Math.abs(Date.UTC(ay, am - 1, ad) - Date.UTC(by, bm - 1, bd)) / 86_400_000;
}

export interface ProgramLink {
  program: Program;
  href: string;
}

const linkTo = (program: Program): ProgramLink => ({
  program,
  href: `/programs/${getSchoolSlug(program.school)}/${program.id}`,
});

/** Other programs using the same gatekeeping model. */
export function sameGatekeeping(program: Program): ProgramLink[] {
  return getAllPrograms()
    .filter((other) => other.id !== program.id && other.gatekeeping === program.gatekeeping)
    .map(linkTo);
}

/** Other programs in the same category, at a different school. */
export function sameCategoryElsewhere(program: Program): ProgramLink[] {
  return getAllPrograms()
    .filter(
      (other) =>
        other.id !== program.id &&
        other.category === program.category &&
        other.school !== program.school
    )
    .map(linkTo);
}

export interface Collision extends ProgramLink {
  /** This program's date. */
  own: DatedPoint;
  /** The other program's date. */
  other: DatedPoint;
  daysApart: number;
}

/**
 * Confirmed dates on other programs falling within a fortnight of one of this
 * program's confirmed dates. Both dates and both program names are reported
 * and nothing else — no ranking, no advice about sequencing.
 */
export function dateCollisions(program: Program): Collision[] {
  const own = confirmedDates(program);
  const collisions: Collision[] = [];

  for (const other of getAllPrograms()) {
    if (other.id === program.id) continue;
    for (const theirs of confirmedDates(other)) {
      for (const mine of own) {
        const apart = daysApart(mine.date, theirs.date);
        if (apart > COLLISION_WINDOW_DAYS) continue;
        collisions.push({ ...linkTo(other), own: mine, other: theirs, daysApart: apart });
      }
    }
  }

  return collisions.sort(
    (a, b) => a.other.date.localeCompare(b.other.date) || a.daysApart - b.daysApart
  );
}

/**
 * Pairs of this program's own confirmed dates falling within a fortnight of
 * each other — Queen's Commerce's 1 and 15 February, for instance.
 */
export function internalProximity(program: Program): Set<string> {
  const points = confirmedDates(program);
  const tight = new Set<string>();

  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      if (daysApart(points[i].date, points[j].date) <= COLLISION_WINDOW_DAYS) {
        tight.add(points[i].date);
        tight.add(points[j].date);
      }
    }
  }

  return tight;
}

/**
 * What the university has not published.
 *
 * Fixed labels, read off null / false / unconfirmed fields. It never explains
 * why something is missing and never says what the absence implies, because
 * the dataset records the absence and nothing more.
 */
export function notPublished(program: Program): string[] {
  const out: string[] = [];
  const supp = program.suppApp;

  if (program.seats === null) out.push("Seats: not published");

  if (supp.required) {
    if (!supp.deadline.confirmed || !supp.deadline.date) {
      out.push("Supp app deadline: not yet confirmed");
    }
    if (supp.fee === null) out.push("Fee: not published");
    if (!supp.rubricPublished) out.push("Rubric: not published");
    if (supp.questionsPublishedInAdvance === false) {
      out.push("Questions: not published in advance");
    }
    if (supp.formatUnconfirmed) out.push("Supp app format: not yet confirmed");
    if (!supp.weighting.official) out.push("Weighting: not officially published");
  }

  for (const entry of program.timeline) {
    if (!entry.confirmed) {
      out.push("Timeline dates: not yet published");
      break;
    }
  }

  return out;
}
