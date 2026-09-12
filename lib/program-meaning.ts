import { formatDate } from "@/lib/deadlines";
import { getGatekeepingDescription } from "@/lib/programs";
import type { Program } from "@/types/program";

/**
 * "What this means" — a fixed set of sentence fragments selected by field
 * values. Nothing here is generated per program and nothing is written about a
 * program that the dataset doesn't state.
 *
 * THE TEST every fragment has to pass: each factual claim maps to a specific
 * field. The gatekeeping line is quoted verbatim from `gatekeepingModels`. The
 * supplementary line reads `suppApp.required`, `suppApp.deadline.confirmed`
 * and `suppApp.deadline.date`. The attempts line reads `gatekeeping` alone.
 * There is no fragment that characterises a program as hard, competitive or
 * a reach, none that predicts an outcome, and none that says what an
 * admissions officer wants — because no field carries any of that.
 *
 * ── THE FULL FRAGMENT LIST ─────────────────────────────────────────────────
 *
 * 1. GATEKEEPING — always first, verbatim from gatekeepingModels[gatekeeping]:
 *      atTheDoor   "A supplementary application decides admission before you
 *                   arrive. High stakes, one shot, but you know where you
 *                   stand by May."
 *      twoYearsIn  "Admission is comparatively easy. You get in on your Grade
 *                   12 average, then compete again on university grades for
 *                   entry to the actual program."
 *      hybrid      "Direct entry to the degree, but with a progression
 *                   requirement after second year."
 *
 * 2. SUPPLEMENTARY APPLICATION — by suppApp.required and deadline.confirmed:
 *      required + confirmed date
 *        "A supplementary application is required, due {date}."
 *      required + unconfirmed
 *        "A supplementary application is required. Its deadline for this
 *         cycle has not been published."
 *      not required
 *        "There is no supplementary application. Admission is decided on your
 *         Grade 12 marks."
 *
 * 3. ATTEMPTS — by gatekeeping:
 *      atTheDoor   "One application, one decision, before you start."
 *      twoYearsIn  "Getting in is not the same as getting the program. That
 *                   decision comes from your university marks."
 *      hybrid      (nothing — see below)
 *
 * The hybrid attempts fragment is specified as "render gatekeepingModels.hybrid
 * verbatim and add nothing", but line 1 already is that string. Emitting it
 * again would print the same sentence twice, so hybrid contributes no third
 * line. Flagged rather than silently resolved.
 */

export interface MeaningLine {
  /** The field path this sentence is built from, for auditing. */
  source: string;
  text: string;
}

export function whatThisMeans(program: Program): MeaningLine[] {
  const lines: MeaningLine[] = [
    {
      source: `gatekeepingModels.${program.gatekeeping}`,
      text: getGatekeepingDescription(program.gatekeeping),
    },
  ];

  const supp = program.suppApp;
  if (!supp.required) {
    lines.push({
      source: "suppApp.required",
      text: "There is no supplementary application. Admission is decided on your Grade 12 marks.",
    });
  } else if (supp.deadline.confirmed && supp.deadline.date) {
    lines.push({
      source: "suppApp.required + suppApp.deadline.date",
      text: `A supplementary application is required, due ${formatDate(supp.deadline.date)}.`,
    });
  } else {
    lines.push({
      source: "suppApp.required + suppApp.deadline.confirmed",
      text: "A supplementary application is required. Its deadline for this cycle has not been published.",
    });
  }

  if (program.gatekeeping === "atTheDoor") {
    lines.push({
      source: "gatekeeping",
      text: "One application, one decision, before you start.",
    });
  } else if (program.gatekeeping === "twoYearsIn") {
    lines.push({
      source: "gatekeeping",
      text: "Getting in is not the same as getting the program. That decision comes from your university marks.",
    });
  }
  // hybrid adds nothing: its attempts fragment is the definition already on
  // line 1, and printing it twice says nothing new.

  return lines;
}
