import { classifyOfficialMinimum } from "@/lib/averages";
import type { CourseRequirement, Program } from "@/types/schema";

/**
 * Reads the required-course list back out of the dataset.
 *
 * REWRITTEN for the new schema. The old version had to parse strings like
 * "One of MCV4U / MHF4U / MDM4U" and "ENG4U: minimum 80%" because that was all
 * the data gave it. The new data structures every one of those:
 *
 *   course              the code or the prose requirement
 *   minimum_grade       the hard minimum, as a number
 *   alternatives        the choice set, as an array of codes
 *   requirement_level   "required" | "recommended", normalized
 *   evaluable           false when it is a prose constraint, not a course
 *
 * So the parsing is gone. `evaluable: false` is the data telling us directly
 * that nothing a student can tick settles this one — the checker says so
 * rather than quietly assuming either way. A prerequisite checker that
 * silently treats "can't tell" as "fine" is worse than no checker.
 */

const COURSE_CODE = /^[A-Z]{3}4[UM]$/;

export type Requirement =
  | { kind: "course"; raw: string; code: string; min: number | null; note: string | null }
  | { kind: "oneOf"; raw: string; codes: string[]; min: number | null; note: string | null }
  | {
      kind: "unverifiable";
      raw: string;
      note: string | null;
      /**
       * `extraCredits` is a plain count of further courses ("Three additional
       * 4U/M courses") — nothing to fail, you either have six credits or you
       * don't. `constrained` is a real condition on what those credits may be
       * ("One non-math, non-science, non-technology 4U/M credit"), which a
       * student can genuinely miss. Collapsing the two into one "can't check"
       * message buried McMaster BHSc's non-science credit next to Western's
       * "Two electives", and the dataset says in as many words that it is
       * "required, not a suggestion".
       */
      shape: "extraCredits" | "constrained";
    };

/** Builds a Requirement from the dataset's structured course entry. */
export function toRequirement(entry: CourseRequirement): Requirement {
  const raw = entry.course;
  const min =
    typeof entry.minimum_grade === "number"
      ? entry.minimum_grade
      : entry.minimum_grade !== null && entry.minimum_grade !== undefined
        ? Number(entry.minimum_grade) || null
        : null;
  const note = entry.note;

  // `evaluable` is derived in the data specifically so the checker does not
  // have to guess. It is authoritative.
  if (entry.evaluable === false) {
    const shape = /\b(additional|elective)/i.test(raw) ? "extraCredits" : "constrained";
    return { kind: "unverifiable", raw, note, shape };
  }

  const alternatives = (entry.alternatives ?? []).filter((code) => COURSE_CODE.test(code));
  if (alternatives.length > 0) {
    return { kind: "oneOf", raw, codes: alternatives, min, note };
  }

  if (COURSE_CODE.test(raw)) {
    return { kind: "course", raw, code: raw, min, note };
  }

  // Marked evaluable but neither a bare code nor a listed choice set. Reported
  // as something the checkboxes can't settle rather than guessed at.
  return { kind: "unverifiable", raw, note, shape: "constrained" };
}

/**
 * A minimum mark that applies to every required course, stated at program
 * level rather than on the individual entries.
 *
 * In the new schema this is structured: `official_minimum.value.type` is
 * "required_course_minimum" for exactly the two Western programs that state
 * one (70%). No prose is matched. "Unless otherwise noted" is honoured by
 * treating it as a default — an entry that states its own `minimum_grade`
 * keeps it.
 */
export function requiredCourseFloor(
  program: Program,
): { min: number; source: string } | null {
  const minimum = classifyOfficialMinimum(program);
  if (minimum.kind !== "courseFloor") return null;

  const floor = minimum.courseMinimums.find(
    (entry) => entry.course === "required courses",
  );
  if (!floor) return null;

  return { min: floor.percent, source: minimum.claim.text };
}

/** Every distinct 4U/M course code the dataset mentions, for the checkbox list. */
export function collectCourseCodes(programs: Program[]): string[] {
  const codes = new Set<string>();

  for (const program of programs) {
    const entries = [
      ...(program.required_courses.value ?? []),
      ...(program.recommended_courses.value ?? []),
    ];
    for (const entry of entries) {
      const requirement = toRequirement(entry);
      if (requirement.kind === "course") codes.add(requirement.code);
      if (requirement.kind === "oneOf") requirement.codes.forEach((code) => codes.add(code));
    }
  }

  // English first (every program needs it), then maths, then sciences — the
  // order a student actually thinks in, rather than alphabetical.
  const MATH_4U = ["MCV4U", "MHF4U", "MDM4U"];
  const order = (code: string) =>
    code.startsWith("ENG") ? 0 : MATH_4U.includes(code) ? 1 : code.startsWith("S") ? 2 : 3;

  return [...codes].sort((a, b) => order(a) - order(b) || a.localeCompare(b));
}

/** What the student has told us. A mark of null means "ticked, mark not given". */
export type CourseState = Record<string, { have: boolean; mark: number | null }>;

export interface RequirementResult {
  requirement: Requirement;
  status: "met" | "missing" | "below-minimum" | "unknown-mark" | "unverifiable";
  /** Human-readable statement of exactly what is missing or unconfirmed. */
  detail: string;
}

export interface ProgramResult {
  program: Program;
  results: RequirementResult[];
  /** Program-level minimum applied to required courses, if the data states one. */
  floor: { min: number; source: string } | null;
  /**
   * `meets` — every checkable requirement is satisfied.
   * `missing` — at least one requirement is definitely not satisfied.
   * `incomplete` — nothing is failing, but something can't be confirmed.
   *
   * Never "admitted". Meeting the course requirements and getting an offer are
   * different claims, and conflating them is the single most harmful thing
   * this feature could do.
   */
  verdict: "meets" | "missing" | "incomplete";
}

function checkCourse(code: string, min: number | null, state: CourseState): RequirementResult["status"] {
  const held = state[code];
  if (!held?.have) return "missing";
  if (min === null) return "met";
  if (held.mark === null) return "unknown-mark";
  return held.mark >= min ? "met" : "below-minimum";
}

function courseDetail(
  code: string,
  min: number | null,
  status: RequirementResult["status"],
  state: CourseState
): string {
  if (status === "met") return `${code}${min ? ` at ${min}% or above` : ""}`;
  if (status === "missing") return `${code} not ticked`;
  if (status === "below-minimum")
    return `${code} needs ${min}%, you entered ${state[code]?.mark}%`;
  return `${code} needs ${min}% — add your mark to check`;
}

/**
 * Evaluates all of a program's requirements together, allocating each ticked
 * course to at most one of them.
 *
 * This is the part that matters. Queen's Commerce requires MCV4U at 80 *and*
 * "one other 4U mathematics course" at 80 — two maths, not one. Checking each
 * requirement independently let a single MCV4U satisfy both and told a student
 * holding only Calculus that they were fine. That is the precise failure this
 * feature exists to prevent, so courses are consumed as they're used.
 *
 * Explicit course requirements are settled first because they have no choice
 * in the matter; the open-ended "one of …" requirements then pick from
 * whatever is left, most-constrained first so a scarce course isn't spent on
 * a requirement that had other options.
 */
export function evaluateProgram(program: Program, state: CourseState): ProgramResult {
  const requirements = (program.required_courses.value ?? []).map(toRequirement);
  const floor = requiredCourseFloor(program);
  // "unless otherwise noted": a requirement that states its own minimum keeps
  // it; everything else inherits the program-level floor.
  const minFor = (stated: number | null) => stated ?? floor?.min ?? null;

  const consumed = new Set<string>();
  const results = new Array<RequirementResult>(requirements.length);

  requirements.forEach((requirement, index) => {
    if (requirement.kind !== "course") return;
    const min = minFor(requirement.min);
    const status = checkCourse(requirement.code, min, state);
    if (status === "met" || status === "unknown-mark" || status === "below-minimum") {
      consumed.add(requirement.code);
    }
    results[index] = {
      requirement,
      status,
      detail: courseDetail(requirement.code, min, status, state),
    };
  });

  requirements.forEach((requirement, index) => {
    if (requirement.kind !== "unverifiable") return;
    results[index] = {
      requirement,
      status: "unverifiable",
      detail:
        requirement.shape === "extraCredits"
          ? "Counts towards your six credits — not something these checkboxes track."
          : "A real requirement, and not one these checkboxes can confirm. Check it yourself.",
    };
  });

  const oneOfIndexes = requirements
    .map((requirement, index) => ({ requirement, index }))
    .filter(
      (entry): entry is { requirement: Extract<Requirement, { kind: "oneOf" }>; index: number } =>
        entry.requirement.kind === "oneOf"
    )
    .sort((a, b) => a.requirement.codes.length - b.requirement.codes.length);

  for (const { requirement, index } of oneOfIndexes) {
    const min = minFor(requirement.min);
    const available = requirement.codes.filter((code) => !consumed.has(code));
    const statuses = available.map((code) => ({
      code,
      status: checkCourse(code, min, state),
    }));

    // A course held without a mark can't clear a minimum, but it isn't a
    // failure either — that's the difference between "you don't have it" and
    // "we don't know yet", and the two must never be collapsed.
    const pick =
      statuses.find((entry) => entry.status === "met") ??
      statuses.find((entry) => entry.status === "unknown-mark") ??
      statuses.find((entry) => entry.status === "below-minimum");

    if (pick) {
      consumed.add(pick.code);
      results[index] = {
        requirement,
        status: pick.status,
        detail: courseDetail(pick.code, min, pick.status, state),
      };
      continue;
    }

    const spent = requirement.codes.filter((code) => consumed.has(code));
    results[index] = {
      requirement,
      status: "missing",
      detail:
        spent.length > 0
          ? `Needs a further course from ${requirement.codes.join(", ")} — ${spent.join(
              ", "
            )} already counted against another requirement`
          : `Needs one of ${requirement.codes.join(", ")} — none ticked`,
    };
  }

  const hasFailure = results.some(
    (result) => result.status === "missing" || result.status === "below-minimum"
  );
  const hasUnknown = results.some(
    (result) => result.status === "unknown-mark" || result.status === "unverifiable"
  );

  // The old schema had McMaster Engineering as one entry carrying a second,
  // longer course list for its iBioMed stream, which the checker had to handle
  // specially. The new schema splits them into two programs — mcmaster-engineering-i
  // and mcmaster-ibiomed — each with its own required_courses, so the stream
  // case is gone and each is simply evaluated on its own list.

  return {
    program,
    results,
    floor,
    verdict: hasFailure ? "missing" : hasUnknown ? "incomplete" : "meets",
  };
}
