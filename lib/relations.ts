import { getAllPrograms, getGatekeepingFor, getSupplementaryApplicationsForProgram } from "@/lib/data";
import type { Program } from "@/types/schema";

/**
 * Computed relationships between programs, and the list of things a
 * university hasn't published.
 *
 * Everything here is derived from fields that already exist. Nothing is
 * inferred about difficulty, competitiveness or likelihood, and no date is
 * used unless the data marks it `is_deadline` — which is the new schema's own
 * flag for "a real, parseable deadline", and the only rows safe for date math.
 */

const COLLISION_WINDOW_DAYS = 14;

export interface DatedPoint {
  date: string;
  label: string;
}

/**
 * Every date a program has actually committed to.
 *
 * `is_deadline === true` and nothing else. That flag already excludes decision
 * windows, opening dates, recommended dates and prior-cycle rows, and it
 * excludes deadlines whose date has not been published — McMaster BHSc's
 * supplementary deadline is null with "early February 2027" beside it, and an
 * expectation is not a date. A student told two programs clash on a date one
 * of them hasn't published is being handed a fiction.
 */
export function confirmedDates(program: Program): DatedPoint[] {
  return program.deadlines
    .filter((deadline) => deadline.is_deadline && deadline.date)
    .map((deadline) => ({ date: deadline.date!, label: deadline.label }))
    .sort((a, b) => a.date.localeCompare(b.date));
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

export function programHref(program: Program): string {
  return `/programs/${program.university_id}/${program.id}`;
}

const linkTo = (program: Program): ProgramLink => ({
  program,
  href: programHref(program),
});

/**
 * Other programs using the same gatekeeping model.
 *
 * "undetermined" is deliberately excluded from grouping: two programs whose
 * model the data does not establish are not thereby similar to each other, and
 * presenting them as a peer group would imply a shared classification that
 * does not exist.
 */
export function sameGatekeeping(program: Program): ProgramLink[] {
  const mine = getGatekeepingFor(program.id);
  if (!mine || mine.model === "undetermined") return [];

  return getAllPrograms()
    .filter((other) => {
      if (other.id === program.id) return false;
      const theirs = getGatekeepingFor(other.id);
      return theirs?.model === mine.model;
    })
    .map(linkTo);
}

/** Other programs in the same category, at a different university. */
export function sameCategoryElsewhere(program: Program): ProgramLink[] {
  return getAllPrograms()
    .filter(
      (other) =>
        other.id !== program.id &&
        other.category === program.category &&
        other.university_id !== program.university_id,
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
    (a, b) => a.other.date.localeCompare(b.other.date) || a.daysApart - b.daysApart,
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
 * Fixed labels, read off null / false fields. It never explains why something
 * is missing and never says what the absence implies, because the dataset
 * records the absence and nothing more.
 */
export function notPublished(program: Program): string[] {
  const out: string[] = [];

  if (program.enrollment === null) out.push("Enrolment: not published");
  if (program.official_minimum.value === null) {
    out.push("Minimum average: no published cutoff");
  }
  if (program.grade_ranges.length === 0) out.push("Grade ranges: not published");

  for (const supp of getSupplementaryApplicationsForProgram(program)) {
    if (!supp.required) continue;
    const fee = supp.fee;
    if (fee && (fee.value === null || fee.value?.amount === null)) {
      out.push("Supp app fee: not published");
    }
    if (supp.weighting === null) out.push("Weighting: not published");
  }

  // A deadline row the university has flagged as not yet published for this
  // cycle. Read off the verification status rather than off the missing date,
  // because the two are different statements.
  const unpublished = program.deadlines.some(
    (deadline) => deadline.verification?.status === "not_yet_published",
  );
  if (unpublished) out.push("Some dates: not yet published for this cycle");

  return out;
}
