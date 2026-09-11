"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useMemo, useState } from "react";

import { ProgramCard } from "@/components/programs/program-card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  Category,
  GatekeepingModel,
  GatekeepingModels,
  Program,
  ProgramCategory,
} from "@/types/program";

const GATEKEEPING_LABELS: Record<GatekeepingModel, string> = {
  atTheDoor: "At the door",
  twoYearsIn: "Two years in",
  hybrid: "Hybrid",
};

const GATEKEEPING_OPTIONS = Object.keys(GATEKEEPING_LABELS) as GatekeepingModel[];

const ALL = "all";

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
  const [school, setSchool] = useState(ALL);
  const [category, setCategory] = useState(ALL);
  const [gatekeeping, setGatekeeping] = useState(ALL);
  const prefersReducedMotion = useReducedMotion();

  const categoryLabelById = useMemo(
    () => new Map(categories.map((c) => [c.id, c.label])),
    [categories]
  );

  const filtered = programs.filter(
    (program) =>
      (school === ALL || program.school === school) &&
      (category === ALL || program.category === category) &&
      (gatekeeping === ALL || program.gatekeeping === gatekeeping)
  );

  const hasActiveFilters = school !== ALL || category !== ALL || gatekeeping !== ALL;

  function clearFilters() {
    setSchool(ALL);
    setCategory(ALL);
    setGatekeeping(ALL);
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Select value={school} onValueChange={(value) => setSchool(value ?? ALL)}>
          <SelectTrigger className="w-48" aria-label="School">
            <SelectValue placeholder="School">
              {(value: string) => (value === ALL ? "All schools" : value)}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All schools</SelectItem>
            {schools.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={category} onValueChange={(value) => setCategory(value ?? ALL)}>
          <SelectTrigger className="w-44" aria-label="Category">
            <SelectValue placeholder="Category">
              {(value: string) =>
                value === ALL
                  ? "All categories"
                  : (categoryLabelById.get(value as ProgramCategory) ?? value)
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All categories</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={gatekeeping} onValueChange={(value) => setGatekeeping(value ?? ALL)}>
          <SelectTrigger className="w-48" aria-label="Gatekeeping model">
            <SelectValue placeholder="Gatekeeping model">
              {(value: string) =>
                value === ALL ? "All gatekeeping models" : GATEKEEPING_LABELS[value as GatekeepingModel]
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All gatekeeping models</SelectItem>
            {GATEKEEPING_OPTIONS.map((g) => (
              <SelectItem key={g} value={g}>
                {GATEKEEPING_LABELS[g]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasActiveFilters && (
          <Button variant="secondary" size="sm" onClick={clearFilters}>
            Clear all filters
          </Button>
        )}
      </div>

      <p className="mt-section-sm text-small text-muted-foreground">
        {filtered.length} program{filtered.length === 1 ? "" : "s"} match
        {hasActiveFilters ? "ing filters" : ""}
      </p>

      <ul className="mt-section-sm grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
        <AnimatePresence mode="popLayout" initial={false}>
          {filtered.map((program) => (
            <motion.li
              key={program.id}
              layout={!prefersReducedMotion}
              initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={prefersReducedMotion ? undefined : { opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
            >
              <ProgramCard
                as="div"
                program={program}
                categoryLabel={categoryLabelById.get(program.category) ?? program.category}
                gatekeepingModels={gatekeepingModels}
              />
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
    </>
  );
}
