import Link from "next/link";

import { Card } from "@/components/ui/card";
import { DateStamp } from "@/components/ui/date-stamp";
import { Pill } from "@/components/ui/pill";
import { resolveEntry, type DatedItem } from "@/lib/deadlines";
import { getSchoolSlug } from "@/lib/programs";
import { cn } from "@/lib/utils";
import type { GatekeepingModel, GatekeepingModels, Program } from "@/types/program";

const GATEKEEPING_LABELS: Record<GatekeepingModel, string> = {
  atTheDoor: "At the door",
  twoYearsIn: "Two years in",
  hybrid: "Hybrid",
};

/** The soonest entry still ahead, so the card answers "when" not just "what". */
function nextDate(program: Program, today: string): DatedItem | null {
  const dated = program.timeline
    .map((entry) => resolveEntry(entry, today))
    .filter((item) => item.date !== null)
    .sort((a, b) => a.date!.localeCompare(b.date!));
  return dated.find((item) => item.daysRemaining! >= 0) ?? null;
}

export function ProgramCard({
  program,
  categoryLabel,
  gatekeepingModels,
  today,
  as = "li",
  selectSlot,
  headingLevel = 2,
}: {
  program: Program;
  categoryLabel: string;
  gatekeepingModels: GatekeepingModels;
  today: string;
  /** Pass "div" when a parent (e.g. a motion.li) already provides the list item. */
  as?: "li" | "div";
  /** Compare checkbox, rendered above the stretched link. */
  selectSlot?: React.ReactNode;
  /**
   * Heading level for the program name. Defaults to h2 — on the browse and
   * school pages these cards sit directly under the page's h1 with nothing in
   * between, so h3 skipped a level. Pass 3 where the cards are genuinely
   * nested under a section heading.
   */
  headingLevel?: 2 | 3;
}) {
  const next = nextDate(program, today);
  const Heading = headingLevel === 2 ? "h2" : "h3";

  return (
    <Card as={as} interactive className="flex h-full flex-col">
      {/* The compare toggle sits top-right visually but comes after the title
          in the DOM, so a keyboard user reaches the program — the primary
          action — before the secondary control that happens to be drawn
          above it. */}
      <div className="flex items-start gap-3 pr-24">
        <Pill title={gatekeepingModels[program.gatekeeping]}>
          {GATEKEEPING_LABELS[program.gatekeeping]}
        </Pill>
      </div>

      <Heading className="mt-4 text-h3 font-semibold text-foreground">
        {/*
          The link stretches over the whole card via an absolutely positioned
          ::after, so the entire surface is clickable while the accessible name
          stays just the program title — the alternative (wrapping the card in
          an <a>) reads the school, pills, deadline and OUAC codes aloud as one
          link name. The compare checkbox sits above it on z-10.
        */}
        <Link
          href={`/programs/${getSchoolSlug(program.school)}/${program.id}`}
          // The grid's arrow-key navigation targets this attribute rather than
          // a tag selector, so changing the heading level can't silently break
          // keyboard navigation.
          data-card-link
          className="rounded-sm outline-none after:absolute after:inset-0 after:content-['']"
        >
          {program.name}
        </Link>
      </Heading>
      <p className="mt-1 text-small text-muted-foreground">
        {program.school} · {program.campus}
      </p>

      {selectSlot && <div className="absolute top-5 right-5">{selectSlot}</div>}

      {/* The readout. A fixed label column so every card's values land on the
          same vertical line and the grid can be scanned down a column. */}
      <dl className="mt-5 flex flex-col gap-2.5 border-t border-line pt-4">
        <Row label="Field">
          <span className="text-small text-foreground">{categoryLabel}</span>
        </Row>
        <Row label="Supp app">
          <span
            className={cn(
              "data text-small",
              program.suppApp.required
                ? "font-bold text-foreground"
                : "font-medium text-muted-foreground"
            )}
          >
            {program.suppApp.required ? "Required" : "Not required"}
          </span>
        </Row>
        <Row label="Next">
          {next ? (
            <DateStamp item={next} size="sm" />
          ) : (
            <span className="data text-small text-muted-foreground">No date ahead</span>
          )}
        </Row>
        <Row label={`OUAC ${program.ouacCodes.length > 1 ? `(${program.ouacCodes.length})` : ""}`}>
          <span className="data text-small break-words text-foreground">
            {program.ouacCodes.map((code) => code.code).join(" ")}
          </span>
        </Row>
      </dl>
    </Card>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline gap-3">
      <dt className="w-[5.5rem] shrink-0 text-label label-mono text-silver">{label}</dt>
      <dd className="min-w-0">{children}</dd>
    </div>
  );
}
