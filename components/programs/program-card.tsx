import Link from "next/link";

import { Card } from "@/components/ui/card";
import { Pill } from "@/components/ui/pill";
import { getSchoolSlug } from "@/lib/programs";
import type { GatekeepingModel, GatekeepingModels, Program } from "@/types/program";

const GATEKEEPING_LABELS: Record<GatekeepingModel, string> = {
  atTheDoor: "At the door",
  twoYearsIn: "Two years in",
  hybrid: "Hybrid",
};

export function ProgramCard({
  program,
  categoryLabel,
  gatekeepingModels,
  as = "li",
}: {
  program: Program;
  categoryLabel: string;
  gatekeepingModels: GatekeepingModels;
  /** Pass "div" when a parent (e.g. a motion.li) already provides the list item. */
  as?: "li" | "div";
}) {
  return (
    <Card as={as} interactive>
      <Link href={`/programs/${getSchoolSlug(program.school)}/${program.id}`}>
        <h3 className="text-body font-medium text-foreground">{program.name}</h3>
      </Link>
      <p className="mt-1 text-small text-muted-foreground">
        {program.school}, {program.campus}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Pill title={gatekeepingModels[program.gatekeeping]}>
          {GATEKEEPING_LABELS[program.gatekeeping]}
        </Pill>
        <span className="text-small text-muted-foreground">{categoryLabel}</span>
      </div>
      <p className="mt-3 text-small text-muted-foreground">
        Supplementary application: {program.suppApp.required ? "Required" : "Not required"}
      </p>
      <p className="mt-1 text-small break-words text-muted-foreground">
        OUAC code{program.ouacCodes.length === 1 ? "" : "s"}:{" "}
        {program.ouacCodes.map((code) => code.code).join(", ")}
      </p>
    </Card>
  );
}
