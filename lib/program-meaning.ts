import { formatDate } from "@/lib/deadlines";
import { getGatekeepingFor, getGatekeepingModel } from "@/lib/data";
import type { Program } from "@/types/schema";

/**
 * "What this means" — sentences selected by field values, never generated.
 *
 * REWRITTEN for the new schema. The old version carried a hardcoded fragment
 * list because the old data had only a three-value `gatekeeping` enum to
 * select on. `data/gatekeeping.json` now carries the sentences themselves —
 * `models[...].summary` for the model and `what_happens_after_admission` for
 * the program — so those are used verbatim and nothing is written here about a
 * program that the data doesn't state.
 *
 * THE TEST every line has to pass: each factual claim maps to a specific
 * field. There is no line that characterises a program as hard, competitive or
 * a reach, none that predicts an outcome, and none that says what an
 * admissions officer wants — because no field carries any of that.
 *
 * The `undetermined` model is the case that matters most. The data does not
 * establish whether a gate exists for Rotman Commerce or iBioMed, so this
 * emits the open question and the record's own note, and never a line that
 * could be read as "you're safe". Defaulting an unknown to reassurance is the
 * one error a student would actually act on.
 */

export interface MeaningLine {
  /** The field path this sentence is built from, for auditing. */
  source: string;
  text: string;
  /** True when the line is inferred rather than stated by the source document. */
  inferred?: boolean;
  /** True when the line states an open question rather than a finding. */
  openQuestion?: boolean;
}

export function whatThisMeans(program: Program): MeaningLine[] {
  const lines: MeaningLine[] = [];
  const gate = getGatekeepingFor(program.id);

  if (gate) {
    const model = getGatekeepingModel(gate.model);
    const inferred = gate.confidence === "derived";

    if (gate.model === "undetermined") {
      // Never a reassuring line. The headline for these records is
      // "Not established by the data." and the note is load-bearing.
      lines.push({
        source: `gatekeeping.programs.${program.id}.headline`,
        text: gate.headline,
        openQuestion: true,
      });
      if (gate.note) {
        lines.push({
          source: `gatekeeping.programs.${program.id}.note`,
          text: gate.note,
          openQuestion: true,
        });
      }
    } else {
      if (model) {
        lines.push({
          source: `gatekeeping.models.${gate.model}.summary`,
          text: model.summary,
          inferred,
        });
      }
      lines.push({
        source: `gatekeeping.programs.${program.id}.what_happens_after_admission`,
        text: gate.what_happens_after_admission,
        inferred,
      });
    }
  }

  // The supplementary line reads the derived `supp_app_required` flag and, for
  // the date, only a row the data marks as a real deadline.
  if (!program.supp_app_required) {
    lines.push({
      source: "programs[].supp_app_required",
      text: "There is no supplementary application. Admission is decided on your Grade 12 marks.",
    });
  } else {
    const suppDeadline = program.deadlines.find(
      (deadline) =>
        deadline.is_deadline &&
        deadline.date &&
        /supp/i.test(deadline.key),
    );
    if (suppDeadline?.date) {
      lines.push({
        source: "programs[].supp_app_required + deadlines[].date",
        text: `A supplementary application is required, due ${formatDate(suppDeadline.date)}.`,
      });
    } else {
      lines.push({
        source: "programs[].supp_app_required",
        text: "A supplementary application is required. Its deadline for this cycle has not been published.",
      });
    }
  }

  return lines;
}
