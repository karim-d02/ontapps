import type {
  Claim,
  CourseRequirement,
  GradeRange,
  Program,
} from "@/types/schema";

/**
 * The average side of the eligibility check.
 *
 * This answers one question — "am I allowed to apply" — and deliberately
 * refuses to answer the other one. There is no scoring, no ranking, no
 * likelihood.
 *
 * REBUILT for the new schema. There is no `averages` array any more, and the
 * three fields that replaced it are not interchangeable:
 *
 *   official_minimum          (16/16) the published floor, or an explicit null
 *   grade_ranges              (13/16) prose competitiveness ranges
 *   community_competitiveness (13/16) applicant-reported
 *
 * They are kept apart here on purpose. The old implementation had to classify
 * prose figures with regular expressions to work out whether a number was a
 * gate or a guide; the new data answers that structurally via
 * `official_minimum.value.type`, so none of that guesswork survives. Grade
 * ranges are never parsed into numbers and community figures are never a
 * threshold under any circumstances.
 */

/* ── What the published minimum actually is ──────────────────────────────── */

export type MinimumKind =
  /** A published average floor with a number. May be checked against. */
  | "averageFloor"
  /** A minimum on individual required courses, not on the average. */
  | "courseFloor"
  /** A published figure whose shape the data does not structure. Shown, never checked. */
  | "unstructured"
  /** The university publishes no cutoff. A real answer, not a gap. */
  | "none";

export interface CourseMinimum {
  course: string;
  percent: number;
}

export interface OfficialMinimumView {
  /** The envelope, so it renders through <Claim> like everything else. */
  claim: Claim;
  kind: MinimumKind;
  /** Present only for `averageFloor` — the number that may be compared against. */
  percent: number | null;
  /** Per-course minimums the data states alongside the average. */
  courseMinimums: CourseMinimum[];
  /**
   * True when the claim is contradicted. A contradicted figure is never turned
   * into a pass/fail — that would be silently picking a side.
   */
  contested: boolean;
}

function readCourseMinimums(value: Record<string, unknown>): CourseMinimum[] {
  const out: CourseMinimum[] = [];
  // The data names these explicitly (e.g. `eng4u_minimum: 70`). Only keys the
  // data actually carries are read; nothing is derived from a course list.
  for (const [key, raw] of Object.entries(value)) {
    const match = /^([a-z]{3}4[um])_minimum$/i.exec(key);
    if (match && typeof raw === "number") {
      out.push({ course: match[1].toUpperCase(), percent: raw });
    }
  }
  return out;
}

/**
 * Classifies the published minimum from its structured `value`.
 *
 * `value.type` is the whole decision. Western's 70% is
 * `required_course_minimum` — a per-course gate that must never be compared
 * against a calculated average — and Queen's Commerce carries two disagreeing
 * official figures with no `type` at all, which is exactly the case that must
 * not become a verdict.
 */
export function classifyOfficialMinimum(program: Program): OfficialMinimumView {
  const claim = program.official_minimum;
  const contested = claim.verification.status === "contradiction";
  const value = claim.value;

  if (value === null || typeof value !== "object") {
    return { claim, kind: "none", percent: null, courseMinimums: [], contested };
  }

  const record = value as Record<string, unknown>;
  const courseMinimums = readCourseMinimums(record);
  const type = typeof record.type === "string" ? record.type : null;
  const percent = typeof record.percent === "number" ? record.percent : null;

  if (type === "minimum_average" && percent !== null) {
    return {
      claim,
      kind: "averageFloor",
      // A contradicted figure is shown but never checked against.
      percent: contested ? null : percent,
      courseMinimums,
      contested,
    };
  }

  if (type === "required_course_minimum") {
    return {
      claim,
      kind: "courseFloor",
      percent: null,
      courseMinimums:
        percent !== null
          ? [...courseMinimums, { course: "required courses", percent }]
          : courseMinimums,
      contested,
    };
  }

  return { claim, kind: "unstructured", percent: null, courseMinimums, contested };
}

/* ── Grade ranges and community figures ──────────────────────────────────── */

export interface GradeRangeView {
  claim: GradeRange;
  scope: string;
  /** Prose, e.g. "high 80s to low 90s". Never parsed, never charted. */
  range: string;
  sourceLabel: string | null;
}

/**
 * Competitiveness ranges, exactly as written.
 *
 * AGENTS.md: "Ranges are prose, not numbers. Do not parse them into numbers,
 * do not chart them, do not average them." So this reshapes for rendering and
 * does nothing else.
 */
export function gradeRanges(program: Program): GradeRangeView[] {
  return program.grade_ranges.map((claim) => ({
    claim,
    scope: claim.value?.scope ?? "",
    range: claim.value?.range ?? "",
    sourceLabel: claim.source_label ?? null,
  }));
}

/** Required context where it exists — not optional decoration. */
export function gradeRangeNote(program: Program): Claim | null {
  return program.grade_range_note;
}

/**
 * Applicant-reported figures. These skew high, are kept visually distinct, and
 * are never the headline number or a threshold.
 */
export function communityFigures(program: Program): Claim[] {
  return program.community_competitiveness;
}

/* ── How each program calculates the average ─────────────────────────────── */

export interface AverageRule {
  /** How many 4U/M courses go into the calculation. */
  count: number;
  /** Whether ENG4U must be one of them rather than merely eligible to be. */
  englishRequired: boolean;
  /** Where in the dataset this rule came from, shown to the student. */
  source: string;
  /** Conditions the calculator can't enforce — stated, not silently ignored. */
  caveats: string[];
  /** True when the rule had to be assumed rather than read. */
  approximate: boolean;
}

function requiresEnglish(courses: CourseRequirement[]): boolean {
  return courses.some(
    (course) =>
      course.requirement_level === "required" &&
      /\bENG4U\b/.test(course.course),
  );
}

/**
 * Derives the calculation rule from the program's own fields.
 *
 * `required_courses.total_courses` carries the count as a number on 14 of 16
 * programs, so this reads it directly instead of pulling it out of prose. The
 * two UofT Engineering entries do not state one; rather than assume a number
 * and present it as the university's, that case is flagged approximate.
 */
export function averageRule(program: Program): AverageRule {
  const required = program.required_courses;
  const total = required.total_courses;
  const caveats: string[] = [];

  // Requirements the data itself marks as not evaluable — prose constraints
  // like "one non-math, non-science, non-technology 4U/M credit". Surfaced
  // rather than quietly dropped, because seven checkboxes cannot enforce them.
  for (const course of required.value ?? []) {
    if (course.evaluable === false) {
      caveats.push(`${course.course} — stated as ${course.requirement}, and not something this check can verify.`);
    }
  }

  const count = typeof total === "number" ? total : Number(total);

  if (Number.isFinite(count) && count > 0) {
    return {
      count,
      englishRequired: requiresEnglish(required.value ?? []),
      source: required.text,
      caveats,
      approximate: false,
    };
  }

  // Nothing in the data says how this one is calculated. Say so rather than
  // presenting a made-up number as though it were the program's own.
  return {
    count: 6,
    englishRequired: requiresEnglish(required.value ?? []),
    source: "No calculation rule published for this program",
    caveats: [
      ...caveats,
      "This program doesn't publish how many courses go into the average. Six 4U/M courses is the Ontario norm and is what's used here — treat the result as approximate.",
    ],
    approximate: true,
  };
}

/* ── Calculating it ──────────────────────────────────────────────────────── */

export interface AverageResult {
  rule: AverageRule;
  /** Null when too few marks have been entered to apply the rule. */
  average: number | null;
  /** The courses that actually went into it, best-first. */
  used: { code: string; mark: number }[];
  /** How many more marks are needed before the rule can be applied. */
  shortBy: number;
}

export function calculateAverage(
  program: Program,
  marks: Record<string, number | null>,
): AverageResult {
  const rule = averageRule(program);
  const entered = Object.entries(marks)
    .filter((entry): entry is [string, number] => typeof entry[1] === "number")
    .map(([code, mark]) => ({ code, mark }))
    .sort((a, b) => b.mark - a.mark);

  const chosen: { code: string; mark: number }[] = [];

  // English is pinned first where the rule requires it, so a weak ENG4U can't
  // be quietly dropped in favour of a stronger elective.
  if (rule.englishRequired) {
    const english = entered.find((entry) => entry.code.startsWith("ENG"));
    if (english) chosen.push(english);
  }
  for (const entry of entered) {
    if (chosen.length >= rule.count) break;
    if (chosen.some((c) => c.code === entry.code)) continue;
    chosen.push(entry);
  }

  if (chosen.length < rule.count) {
    return { rule, average: null, used: chosen, shortBy: rule.count - chosen.length };
  }

  const sum = chosen.reduce((total, entry) => total + entry.mark, 0);
  return {
    rule,
    average: Math.round((sum / chosen.length) * 10) / 10,
    used: chosen,
    shortBy: 0,
  };
}

/* ── The verdict ─────────────────────────────────────────────────────────── */

export interface EligibilityVerdict {
  minimum: OfficialMinimumView;
  ranges: GradeRangeView[];
  rangeNote: Claim | null;
  community: Claim[];
  /**
   * `met` / `below` only ever reflect a published numeric average floor.
   * `noFloor` means the university publishes none — which is a fact about the
   * university, not a verdict about the student.
   * `unknown` means not enough marks have been entered yet.
   */
  status: "met" | "below" | "noFloor" | "unknown";
  /** The floor that applies, for the summary line. */
  floor: number | null;
}

export function eligibility(
  program: Program,
  average: number | null,
): EligibilityVerdict {
  const minimum = classifyOfficialMinimum(program);

  // Only a structured, uncontradicted average floor can produce a verdict.
  // A per-course minimum is checked against courses, not against an average,
  // and a contradicted figure is never resolved here.
  const floor = minimum.kind === "averageFloor" ? minimum.percent : null;

  let status: EligibilityVerdict["status"];
  if (floor === null) status = "noFloor";
  else if (average === null) status = "unknown";
  else status = average >= floor ? "met" : "below";

  return {
    minimum,
    ranges: gradeRanges(program),
    rangeNote: gradeRangeNote(program),
    community: communityFigures(program),
    status,
    floor,
  };
}

/**
 * Waterloo recalculates every applicant's average against how their school's
 * graduates have actually performed at Waterloo. A number computed here is
 * therefore not the number Waterloo will use, and saying so is the whole
 * point. Read from `other_facts` by its key rather than matched on prose.
 */
export function adjustmentWarning(program: Program): string | null {
  const fact = program.other_facts.find(
    (entry) => entry.key === "adjustment_factor",
  );
  return fact?.text ?? null;
}
