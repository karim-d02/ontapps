import Link from "next/link";

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
}: {
  program: Program;
  categoryLabel: string;
  gatekeepingModels: GatekeepingModels;
}) {
  return (
    <li className="rounded-lg border p-4">
      <Link href={`/programs/${getSchoolSlug(program.school)}/${program.id}`}>
        <h3 className="font-medium">{program.name}</h3>
      </Link>
      <p className="text-sm text-muted-foreground">
        {program.school}, {program.campus}
      </p>
      <p className="text-sm">{categoryLabel}</p>
      <p className="text-sm">
        <span title={gatekeepingModels[program.gatekeeping]}>
          {GATEKEEPING_LABELS[program.gatekeeping]}
        </span>
      </p>
      <p className="text-sm">
        Supplementary application: {program.suppApp.required ? "Required" : "Not required"}
      </p>
      <p className="text-sm break-words">
        OUAC code{program.ouacCodes.length === 1 ? "" : "s"}:{" "}
        {program.ouacCodes.map((code) => code.code).join(", ")}
      </p>
    </li>
  );
}
