import type { AverageEntry, Program } from "@/types/program";

/**
 * The average side of the eligibility check.
 *
 * This answers one question — "am I allowed to apply" — and deliberately
 * refuses to answer the other one. There is no scoring, no ranking, no
 * likelihood. A student reading this at 1am should come away knowing whether a
 * published floor exists and whether they clear it, and nothing more.
 *
 * The load-bearing idea is that entries in `averages` are not all the same
 * kind of number. Some are eligibility floors. Most are competitiveness
 * guidelines that universities publish precisely because they are *not*
 * cutoffs. Gating on the second kind would invent a rule the university never
 * made, and would tell students they can't apply to programs they can.
 */

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

const WORD_TO_NUMBER: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8,
};

function countFrom(text: string): number | null {
  const digits = /\b(\d+)\s+4U\/M\b/i.exec(text);
  if (digits) return Number(digits[1]);
  const words = /\b(one|two|three|four|five|six|seven|eight)\s+4U\/M\b/i.exec(text);
  if (words) return WORD_TO_NUMBER[words[1].toLowerCase()] ?? null;
  return null;
}

/**
 * Derives the calculation rule from the program's own text.
 *
 * `courses.total` carries it for most programs ("Six 4U/M courses, co-op
 * excluded from the average"). UTM states its rule in an averages note instead
 * ("ENG4U plus the best five 4U/M courses"), which is the same six-course
 * shape with English pinned, so that one is read from there.
 */
export function averageRule(program: Program): AverageRule {
  const total = program.courses.total ?? "";
  const caveats: string[] = [];

  // Conditions stated in the total line that the calculator cannot enforce
  // from seven checkboxes — surfaced rather than quietly dropped.
  if (/co-op excluded/i.test(total)) {
    caveats.push("Co-op courses are excluded from this program's average.");
  }
  const disciplineCap = /No more than (\w+) (4M) courses from the same discipline/i.exec(total);
  if (disciplineCap) {
    caveats.push(
      `No more than ${disciplineCap[1]} ${disciplineCap[2]} courses from the same discipline may count.`
    );
  }

  // UTM publishes its rule alongside the floor rather than in courses.total.
  const utmRule = program.averages.find(
    (entry) => entry.type === "official" && /ENG4U plus the best (\w+) 4U\/M/i.test(entry.note ?? "")
  );
  if (utmRule) {
    const best = /ENG4U plus the best (\w+) 4U\/M/i.exec(utmRule.note ?? "");
    const extra = best ? (WORD_TO_NUMBER[best[1].toLowerCase()] ?? Number(best[1])) : null;
    if (extra && Number.isFinite(extra)) {
      return {
        count: extra + 1,
        englishRequired: true,
        source: `${utmRule.source}: ${utmRule.note}`,
        caveats,
        approximate: false,
      };
    }
  }

  const count = countFrom(total);
  if (count) {
    return {
      count,
      englishRequired: /including ENG4U/i.test(total),
      source: total,
      caveats,
      approximate: false,
    };
  }

  // Nothing in the data says how this one is calculated. Say so rather than
  // presenting a made-up number as though it were the program's own.
  return {
    count: 6,
    englishRequired: false,
    source: "No calculation rule published for this program",
    caveats: [
      "This program doesn't publish how it calculates the average. Six 4U/M courses is the Ontario norm and is what's used here — treat the result as approximate.",
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
  marks: Record<string, number | null>
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

/* ── What each published figure actually is ──────────────────────────────── */

export type ThresholdKind =
  /** A published eligibility floor with a number. May be checked against. */
  | "floor"
  /** Stated as a minimum but not as a precise figure ("Low 90s"). Shown, never checked. */
  | "softFloor"
  /** A minimum on individual required courses, not on the average. */
  | "courseFloor"
  /** A competitiveness guideline or recommendation. Context only, never a gate. */
  | "guideline"
  /** The university states there is no cutoff. */
  | "noCutoff"
  /** Self-reported. Never a threshold under any circumstances. */
  | "community";

export interface ClassifiedAverage {
  entry: AverageEntry;
  kind: ThresholdKind;
  /** Present only for `floor` — the number that may be compared against. */
  minimum: number | null;
  /** Why it was classified this way, in the data's own words. */
  basis: string;
}

const GUIDELINE_LANGUAGE =
  /\b(guideline|recommend|recommendation|competitive|competitiveness|anticipated|not a published minimum|do not quote|not officially published|anecdotal|outlier|interpretation|by discipline)\b/i;

const NO_CUTOFF_LANGUAGE = /\bno (published|single published|officially)?\s*(single )?(published )?cutoff\b|not officially published as a cutoff/i;

const FLOOR_LANGUAGE =
  /\b(minimum|floor|to be considered|for admission consideration|for consideration)\b/i;

/**
 * Floor words used in the negative.
 *
 * Western Med Sci's OUInfo note reads "A competitiveness guideline, not a
 * published minimum. Do not quote as a cutoff" — it contains the word
 * "minimum" and means the exact opposite. Without this, the figure the dataset
 * explicitly warns against quoting as a cutoff became a pass/fail gate.
 */
const NEGATED_FLOOR =
  /\bno[t]?\s+(a\s+)?(published\s+)?(single\s+)?(minimum|cutoff)\b|\bnot officially published\b|\bdo not quote\b|\bno published\b/i;

/**
 * A *precise* published figure — a number carrying a % or a +.
 *
 * "Low 90s" and "High 80s to low 90s" are ranges a human wrote, not
 * thresholds; matching a bare number inside them turned "Low 90s" into a
 * 90% gate. Requiring the unit is what separates "90+" from "90s".
 */
const PRECISE_FIGURE = /(?:^|[^A-Za-z0-9])(\d{2,3})\s*(?:%|\+)/;

/**
 * Decides whether a published figure is a gate or a guide.
 *
 * Reads the `note` first, because that is where the dataset draws the
 * distinction explicitly — Western Med Sci's OUInfo figure carries "A
 * competitiveness guideline, not a published minimum. Do not quote as a
 * cutoff", and it would be actively harmful to render that as a pass/fail.
 */
export function classifyAverage(entry: AverageEntry): ClassifiedAverage {
  if (entry.type === "community") {
    return {
      entry,
      kind: "community",
      minimum: null,
      basis: "Self-reported by applicants. Never used as a threshold here.",
    };
  }

  const note = entry.note ?? "";
  const figure = entry.figure;

  if (NO_CUTOFF_LANGUAGE.test(figure) || NO_CUTOFF_LANGUAGE.test(note)) {
    return { entry, kind: "noCutoff", minimum: null, basis: note || figure };
  }

  // The note wins over the figure: a figure can read like a floor ("Mid to
  // high 80s") while its note says in as many words that it isn't one.
  if (NEGATED_FLOOR.test(note) || NEGATED_FLOOR.test(figure)) {
    return { entry, kind: "guideline", minimum: null, basis: note || figure };
  }
  // The figure is the university's own wording, so when *it* states a minimum
  // that settles it: a note about competitive applicants sitting above the
  // floor describes the field, not the gate. McMaster's iBioMed entry reads
  // "90% published minimum for consideration" with a note about selection
  // being competitive, and it is nonetheless a published minimum.
  const figureIsFloor = FLOOR_LANGUAGE.test(figure);

  if (!figureIsFloor && GUIDELINE_LANGUAGE.test(note) && !FLOOR_LANGUAGE.test(note)) {
    return { entry, kind: "guideline", minimum: null, basis: note };
  }

  // "70% in required courses" is a per-course gate, not an average gate. It is
  // applied by the course checker (see requiredCourseFloor) and must never be
  // compared against a calculated average.
  if (/in required courses/i.test(figure)) {
    return {
      entry,
      kind: "courseFloor",
      minimum: null,
      basis:
        "A minimum on each required course, not on the average — it's checked in the course tab.",
    };
  }

  if (!figureIsFloor && !FLOOR_LANGUAGE.test(note)) {
    return { entry, kind: "guideline", minimum: null, basis: note || figure };
  }

  // A floor is only checkable if it states a number. "Low 90s" is a stated
  // minimum with no precise figure — shown, but never turned into pass/fail.
  //
  // Where a figure carries two clauses ("75% cumulative minimum to be
  // considered; admission average anticipated over 90%"), the floor is in the
  // first and the *anticipated* — i.e. competitive — number is in the second,
  // so only the first is read.
  const floorClause = figure.split(";")[0];
  const numeric = PRECISE_FIGURE.exec(floorClause);
  const value = numeric ? Number(numeric[1]) : null;

  // Plausibility guard. Rotman's "Top 5% of their class; minimum overall
  // average mid-high 80s" would otherwise read 5 as a 5% floor — the actual
  // minimum sits in the second clause and isn't a number at all.
  const minimum = value !== null && value >= 50 && value <= 100 ? value : null;

  if (minimum === null) {
    return { entry, kind: "softFloor", minimum: null, basis: note || figure };
  }

  return { entry, kind: "floor", minimum, basis: note || figure };
}

export interface EligibilityVerdict {
  /** Numeric floors the student can actually be measured against. */
  floors: ClassifiedAverage[];
  /** Everything else, shown as context with no state attached. */
  context: ClassifiedAverage[];
  community: ClassifiedAverage[];
  /**
   * `met` / `below` only ever reflect a published numeric floor.
   * `noFloor` means the university publishes none — which is a fact about the
   * university, not a verdict about the student.
   * `unknown` means not enough marks have been entered yet.
   */
  status: "met" | "below" | "noFloor" | "unknown";
  /** The highest floor that applies, for the summary line. */
  highestFloor: number | null;
}

export function eligibility(
  program: Program,
  average: number | null
): EligibilityVerdict {
  const classified = program.averages.map(classifyAverage);
  const community = classified.filter((c) => c.kind === "community");

  /*
   * A program that publishes a floor AND an official "no cutoff published"
   * cannot be gated on either without picking a side.
   *
   * McMaster's page covers two applications: iBioMed publishes "90% minimum
   * for consideration", Engineering I publishes "No single published cutoff".
   * Gating the page on the iBioMed number would tell an Engineering I
   * applicant with an 88 that they can't apply, which is false. Both figures
   * are shown, each with its own source, and neither becomes a verdict.
   */
  const contested = classified.some((c) => c.kind === "noCutoff");
  const floors = contested ? [] : classified.filter((c) => c.kind === "floor");
  const context = classified.filter(
    (c) => c.kind !== "community" && !floors.includes(c)
  );

  const highestFloor = floors.length
    ? Math.max(...floors.map((f) => f.minimum!))
    : null;

  let status: EligibilityVerdict["status"];
  if (highestFloor === null) status = "noFloor";
  else if (average === null) status = "unknown";
  else status = average >= highestFloor ? "met" : "below";

  return { floors, context, community, status, highestFloor };
}

/**
 * Waterloo recalculates every applicant's average against how their school's
 * graduates have actually performed at Waterloo. A number computed here is
 * therefore not the number Waterloo will use, and saying so is the whole
 * point — this is surfaced wherever Waterloo appears with marks entered.
 */
export function adjustmentWarning(program: Program): string | null {
  return program.adjustmentFactor?.body ?? null;
}
