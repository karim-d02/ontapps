import { Card } from "@/components/ui/card";
import { Pill } from "@/components/ui/pill";
import {
  adjustmentWarning,
  calculateAverage,
  eligibility,
  type MinimumKind,
} from "@/lib/averages";
import type { CourseState } from "@/lib/prerequisites";
import { cn } from "@/lib/utils";
import Link from "next/link";
import type { Program } from "@/types/schema";

/**
 * The optional average view.
 *
 * This is an eligibility gate and nothing else: it answers "am I allowed to
 * apply", never "will I get in". Nothing here ranks programs, scores the
 * student, or turns a competitiveness range into a pass/fail — most of the
 * figures universities publish are explicitly not cutoffs, and treating them
 * as such would invent rules that don't exist and talk students out of
 * applications they're entitled to make.
 */

const KIND_LABEL: Record<MinimumKind, string> = {
  averageFloor: "Published minimum",
  courseFloor: "Per-course minimum",
  unstructured: "Published figure, not a single cutoff",
  none: "No cutoff published",
};

export function AveragePanel({
  programs,
  state,
}: {
  programs: Program[];
  state: CourseState;
}) {
  const marks = Object.fromEntries(
    Object.entries(state)
      .filter(([, held]) => held.have)
      .map(([code, held]) => [code, held.mark])
  );
  const entered = Object.values(marks).filter((mark) => typeof mark === "number").length;

  if (entered === 0) {
    return (
      <div className="surface-lit rounded-xl border border-line bg-card p-10">
        <p className="data text-label text-silver">No marks yet</p>
        <p className="measure mt-4 text-h3 text-foreground">
          Add marks to your ticked courses and this works out whether you clear each
          program&apos;s published minimum to apply.
        </p>
        <p className="measure mt-2 text-small text-muted-foreground">
          Optional, and most programs don&apos;t publish a minimum at all. The course
          check on the other tab works without any of this.
        </p>
      </div>
    );
  }

  return (
    <>
      <p className="measure text-small text-muted-foreground">
        Eligibility only — whether you clear the minimum a university publishes for
        applying. It is not a prediction, and a published minimum is a floor, not a
        competitive average. Each figure below is labelled with what it actually is.
      </p>

      <ul className="mt-8 flex flex-col gap-4">
        {programs.map((program) => (
          <ProgramAverage key={program.id} program={program} marks={marks} />
        ))}
      </ul>
    </>
  );
}

function ProgramAverage({
  program,
  marks,
}: {
  program: Program;
  marks: Record<string, number | null>;
}) {
  const result = calculateAverage(program, marks);
  const verdict = eligibility(program, result.average);
  const adjustment = adjustmentWarning(program);

  return (
    <Card as="li" className="flex flex-col">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-h3 font-semibold text-foreground">
            <Link
              href={`/programs/${program.university_id}/${program.id}`}
              className="rounded-sm outline-none transition-colors duration-150 hover:text-silver-light focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4 focus-visible:ring-offset-background motion-reduce:transition-none"
            >
              {program.name}
            </Link>
          </h3>
          <p className="mt-1 text-small text-muted-foreground">{program.university}</p>
        </div>

        {/* The only place a verdict is ever rendered, and only against a
            published numeric floor. */}
        {verdict.status === "met" && (
          <Pill className="font-bold">Meets the published minimum</Pill>
        )}
        {verdict.status === "below" && (
          <Pill tone="muted">Below the published minimum</Pill>
        )}
        {verdict.status === "noFloor" && <Pill tone="muted">No minimum published</Pill>}
        {verdict.status === "unknown" && <Pill tone="muted">Not enough marks yet</Pill>}
      </div>

      {/* Your average, and exactly how it was worked out. */}
      <div className="mt-5 border-t border-line pt-4">
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-2">
          <span className="text-label label-mono text-silver">Your average</span>
          {result.average === null ? (
            <span className="data text-body text-muted-foreground">
              {result.shortBy} more {result.shortBy === 1 ? "mark" : "marks"} needed
            </span>
          ) : (
            <>
              <span className="data text-h3 font-semibold text-foreground">
                {result.average}%
              </span>
              <span className="data text-label text-silver">
                {result.used.map((entry) => entry.code).join(" · ")}
              </span>
            </>
          )}
        </div>

        <p className="measure mt-2 text-small text-muted-foreground">
          <span className="text-label label-mono text-silver">Rule </span>
          {result.rule.source}
          {result.rule.approximate && (
            <span className="ml-1 text-foreground">Approximate.</span>
          )}
        </p>

        {result.rule.caveats.map((caveat) => (
          <p key={caveat} className="measure mt-1.5 text-small text-muted-foreground">
            {caveat}
          </p>
        ))}

        {result.average !== null && (
          <p className="measure mt-1.5 text-small text-muted-foreground">
            {/* Built as one string rather than text-around-an-expression: the
                JSX form rendered as "the 6marks you entered". */}
            {`Worked out from the ${result.used.length} ${
              result.used.length === 1 ? "mark" : "marks"
            } you entered.`}{" "}
            Your real six best 4U/M courses may include ones that aren&apos;t on this
            list.
          </p>
        )}
      </div>

      {/* Waterloo recalculates every average against the applicant's school.
          Any number computed here is not the number Waterloo will use, and
          that has to be said wherever Waterloo appears with marks entered. */}
      {adjustment && (
        <div className="mt-5 border-l-2 border-silver-light pl-4">
          <p className="text-label label-mono text-silver-light">
            Your calculated average is not your Waterloo average
          </p>
          <p className="measure mt-2 text-small text-foreground">{adjustment}</p>
        </div>
      )}

      {/* The published minimum, labelled with what kind of number it is, then
          the competitiveness ranges as prose. The two are never merged. */}
      <ul className="mt-5 flex flex-col gap-3 border-t border-line pt-4">
        <li className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <span className="min-w-0">
            <span className="data text-small text-foreground">
              {verdict.minimum.claim.text}
            </span>
            <span className="block text-label label-mono text-silver">
              {KIND_LABEL[verdict.minimum.kind]}
            </span>
          </span>
          {verdict.status === "met" || verdict.status === "below" ? (
            <span
              className={cn(
                "data shrink-0 text-label uppercase",
                verdict.status === "met"
                  ? "font-bold text-silver-light"
                  : "text-silver",
              )}
            >
              {verdict.status === "met" ? "Met" : "Not met"}
            </span>
          ) : null}
        </li>

        {/* Prose ranges, exactly as written — never parsed into a number and
            never turned into a pass/fail. */}
        {verdict.ranges.map((range, index) => (
          <li key={index} className="flex flex-col">
            <span className="data text-small text-foreground">
              {range.scope}: {range.range}
            </span>
            <span className="text-label label-mono text-silver">
              {range.sourceLabel ? `${range.sourceLabel} · ` : ""}
              competitiveness range, not a cutoff
            </span>
          </li>
        ))}
      </ul>

      {verdict.rangeNote && (
        <p className="measure mt-3 text-small text-muted-foreground">
          {verdict.rangeNote.text}
        </p>
      )}

      {verdict.status === "noFloor" && result.average !== null && (
        <p className="measure mt-4 text-small text-foreground">
          No minimum published — your average is {result.average}%.
        </p>
      )}

      {/* Community figures are never a threshold. Collapsed, and labelled. */}
      {verdict.community.length > 0 && (
        <details className="mt-4">
          <summary className="cursor-pointer text-label label-mono text-silver outline-none focus-visible:ring-2 focus-visible:ring-ring">
            Self-reported figures ({verdict.community.length})
          </summary>
          <ul className="mt-3 flex flex-col gap-2">
            {verdict.community.map((item, index) => (
              <li key={index} className="text-small text-muted-foreground">
                <span className="data text-foreground">{item.text}</span>
                <span className="block text-label label-mono text-silver">
                  never used as a threshold here
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </Card>
  );
}

