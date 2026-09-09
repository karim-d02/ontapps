"use client";

import { useMemo, useState } from "react";

import { ProgramCard } from "@/components/programs/program-card";
import type { Category, GatekeepingModel, GatekeepingModels, Program } from "@/types/program";

const GATEKEEPING_LABELS: Record<GatekeepingModel, string> = {
  atTheDoor: "At the door",
  twoYearsIn: "Two years in",
  hybrid: "Hybrid",
};

const GATEKEEPING_OPTIONS = Object.keys(GATEKEEPING_LABELS) as GatekeepingModel[];

export function ProgramsBrowser({
  programs,
  schools,
  categories,
  gatekeepingModels,
}: {
  programs: Program[];
  schools: string[];
  categories: Category[];
  gatekeepingModels: GatekeepingModels;
}) {
  const [school, setSchool] = useState("");
  const [category, setCategory] = useState("");
  const [gatekeeping, setGatekeeping] = useState("");

  const categoryLabelById = useMemo(
    () => new Map(categories.map((c) => [c.id, c.label])),
    [categories]
  );

  const filtered = programs.filter(
    (program) =>
      (school === "" || program.school === school) &&
      (category === "" || program.category === category) &&
      (gatekeeping === "" || program.gatekeeping === gatekeeping)
  );

  const hasActiveFilters = school !== "" || category !== "" || gatekeeping !== "";

  function clearFilters() {
    setSchool("");
    setCategory("");
    setGatekeeping("");
  }

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <label>
          School{" "}
          <select value={school} onChange={(e) => setSchool(e.target.value)}>
            <option value="">All</option>
            {schools.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>

        <label>
          Category{" "}
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">All</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </label>

        <label>
          Gatekeeping model{" "}
          <select value={gatekeeping} onChange={(e) => setGatekeeping(e.target.value)}>
            <option value="">All</option>
            {GATEKEEPING_OPTIONS.map((g) => (
              <option key={g} value={g}>
                {GATEKEEPING_LABELS[g]}
              </option>
            ))}
          </select>
        </label>

        {hasActiveFilters && (
          <button type="button" onClick={clearFilters}>
            Clear all filters
          </button>
        )}
      </div>

      <p className="mb-4 text-sm text-muted-foreground">
        {filtered.length} program{filtered.length === 1 ? "" : "s"} match
        {hasActiveFilters ? "ing filters" : ""}
      </p>

      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((program) => (
          <ProgramCard
            key={program.id}
            program={program}
            categoryLabel={categoryLabelById.get(program.category) ?? program.category}
            gatekeepingModels={gatekeepingModels}
          />
        ))}
      </ul>
    </>
  );
}
