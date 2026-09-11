import type { Program } from "@/types/program";

/**
 * Reads `courses.required` back out of the dataset.
 *
 * The strings in there follow a small number of consistent shapes:
 *
 *   "ENG4U"                                          a specific course
 *   "ENG4U: minimum 80%"                             …with a hard minimum
 *   "MHF4U: Advanced Functions, not Calculus"        …with a note
 *   "One of MCV4U / MHF4U / MDM4U"                   a choice between courses
 *   "One other 4U mathematics course: minimum 80%"   a choice from a subject
 *   "Three additional 4U/M courses"                  unspecified extras
 *   "One non-math, non-science, non-technology 4U/M credit"
 *
 * The first five are checkable. The last two are not — nothing a student can
 * tick tells us whether their sixth credit was a non-science one — and the
 * checker says so rather than quietly assuming either way. A prerequisite
 * checker that silently treats "can't tell" as "fine" is worse than no checker.
 */

const COURSE_CODE = /^[A-Z]{3}4[UM]$/;

/**
 * Ontario 4U mathematics course codes.
 *
 * This is the one thing the app knows that data/programs.json doesn't, and it
 * is here only because "One other 4U mathematics course" can't be resolved
 * without knowing which codes are maths. These are curriculum codes, not
 * program details, and every one of them already appears in the dataset — but
 * the right long-term fix is a `subject` field on the dataset's course
 * entries, at which point this constant goes away.
 */
const MATH_4U = ["MCV4U", "MHF4U", "MDM4U"];

export type Requirement =
  | { kind: "course"; raw: string; code: string; min: number | null; note: string | null }
  | { kind: "oneOf"; raw: string; codes: string[]; min: number | null; note: string | null }
  | { kind: "unverifiable"; raw: string; note: string | null };

export function parseRequirement(raw: string): Requirement {
  const separator = raw.indexOf(": ");
  const head = separator === -1 ? raw : raw.slice(0, separator);
  const tail = separator === -1 ? null : raw.slice(separator + 2);

  const minMatch = /minimum\s+(\d{2,3})\s*%/i.exec(tail ?? "");
  const min = minMatch ? Number(minMatch[1]) : null;
  // If the tail was only ever "minimum 80%", it's a constraint, not a note.
  const note = tail && !/^minimum\s+\d{2,3}\s*%$/i.test(tail.trim()) ? tail : null;

  if (COURSE_CODE.test(head)) {
    return { kind: "course", raw, code: head, min, note };
  }

  const oneOf = /^One of (.+)$/i.exec(head);
  if (oneOf) {
    const codes = oneOf[1]
      .split("/")
      .map((part) => part.trim())
      .filter((part) => COURSE_CODE.test(part));
    if (codes.length > 0) return { kind: "oneOf", raw, codes, min, note };
  }

  // "One other 4U mathematics course" — a choice from a subject rather than
  // from a listed set. Resolved against the maths in MATH_4U.
  if (/\bmathematics\b/i.test(head) && /^(one|a|another|an)\b/i.test(head)) {
    return { kind: "oneOf", raw, codes: [...MATH_4U], min, note };
  }

  return { kind: "unverifiable", raw, note };
}

/** Every distinct 4U/M course code the dataset mentions, for the checkbox list. */
export function collectCourseCodes(programs: Program[]): string[] {
  const codes = new Set<string>();

  for (const program of programs) {
    const lists = [
      program.courses.required,
      program.courses.recommended,
      program.courses.requiredIBioMed ?? [],
    ];
    for (const list of lists) {
      for (const entry of list) {
        const requirement = parseRequirement(entry);
        if (requirement.kind === "course") codes.add(requirement.code);
        if (requirement.kind === "oneOf") requirement.codes.forEach((code) => codes.add(code));
      }
    }
  }

  // English first (every program needs it), then maths, then sciences — the
  // order a student actually thinks in, rather than alphabetical.
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
  const requirements = program.courses.required.map(parseRequirement);
  const consumed = new Set<string>();
  const results = new Array<RequirementResult>(requirements.length);

  requirements.forEach((requirement, index) => {
    if (requirement.kind !== "course") return;
    const status = checkCourse(requirement.code, requirement.min, state);
    if (status === "met" || status === "unknown-mark" || status === "below-minimum") {
      consumed.add(requirement.code);
    }
    results[index] = {
      requirement,
      status,
      detail: courseDetail(requirement.code, requirement.min, status, state),
    };
  });

  requirements.forEach((requirement, index) => {
    if (requirement.kind !== "unverifiable") return;
    results[index] = {
      requirement,
      status: "unverifiable",
      detail: "Not something these checkboxes can confirm — check it yourself.",
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
    const available = requirement.codes.filter((code) => !consumed.has(code));
    const statuses = available.map((code) => ({
      code,
      status: checkCourse(code, requirement.min, state),
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
        detail: courseDetail(pick.code, requirement.min, pick.status, state),
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

  return {
    program,
    results,
    verdict: hasFailure ? "missing" : hasUnknown ? "incomplete" : "meets",
  };
}
