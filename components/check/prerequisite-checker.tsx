"use client";

import { Check, ChevronRight, Minus } from "lucide-react";
import Link from "next/link";
import { useCallback, useMemo, useState } from "react";

import { AveragePanel } from "@/components/check/average-panel";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Pill } from "@/components/ui/pill";
import { useStoredState } from "@/hooks/use-stored-state";
import {
  evaluateProgram,
  type CourseState,
  type ProgramResult,
  type RequirementResult,
} from "@/lib/prerequisites";
import { getSchoolSlug } from "@/lib/programs";
import { cn } from "@/lib/utils";
import type { Program } from "@/types/program";

const VERDICT_LABEL = {
  meets: "Meets the course requirements",
  incomplete: "Can't fully check",
  missing: "Missing something",
} as const;

const VERDICT_ORDER = { meets: 0, incomplete: 1, missing: 2 } as const;

const STORAGE_KEY = "ontapps:my-courses";

/**
 * Anything that doesn't match the current shape is discarded rather than fed
 * into the eligibility logic — this reads data an older build may have
 * written, and a malformed mark must never reach a threshold comparison.
 */
function isCourseState(value: unknown): value is CourseState {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  return Object.values(value).every((held) => {
    if (typeof held !== "object" || held === null) return false;
    const entry = held as { have?: unknown; mark?: unknown };
    return (
      typeof entry.have === "boolean" &&
      (entry.mark === null || typeof entry.mark === "number")
    );
  });
}

const EMPTY_STATE: CourseState = {};

export function PrerequisiteChecker({
  programs,
  courseCodes,
}: {
  programs: Program[];
  courseCodes: string[];
}) {
  // Persisted: a student who ticks eleven courses and comes back tomorrow
  // should not have to do it again.
  const [state, setState] = useStoredState(STORAGE_KEY, EMPTY_STATE, isCourseState);
  const [tab, setTab] = useState<"courses" | "average">("courses");

  const ticked = courseCodes.filter((code) => state[code]?.have);
  const markCount = ticked.filter((code) => typeof state[code]?.mark === "number").length;

  const results = useMemo(
    () =>
      programs
        .map((program) => evaluateProgram(program, state))
        .sort(
          (a, b) =>
            VERDICT_ORDER[a.verdict] - VERDICT_ORDER[b.verdict] ||
            a.program.name.localeCompare(b.program.name)
        ),
    [programs, state]
  );

  const counts = {
    meets: results.filter((r) => r.verdict === "meets").length,
    incomplete: results.filter((r) => r.verdict === "incomplete").length,
    missing: results.filter((r) => r.verdict === "missing").length,
  };

  const toggle = useCallback(
    (code: string) => {
      const held = state[code];
      setState({ ...state, [code]: { have: !held?.have, mark: held?.mark ?? null } });
    },
    [state, setState]
  );

  const setMark = useCallback(
    (code: string, raw: string) => {
      const value = raw.trim() === "" ? null : Number(raw);
      setState({
        ...state,
        [code]: {
          have: state[code]?.have ?? false,
          mark: value === null || Number.isNaN(value) ? null : value,
        },
      });
    },
    [state, setState]
  );

  return (
    <div className="grid-12">
      {/* ── Your courses ─────────────────────────────────────────────────── */}
      <div className="col-span-12 lg:col-span-4">
        <div className="lg:sticky lg:top-[calc(var(--nav-height)+2rem)]">
          <h2 className="text-h2 text-foreground">Your courses</h2>
          <p className="measure mt-2 text-small text-muted-foreground">
            Tick the 4U courses you have or are taking. Add a mark where a program sets a
            hard minimum — without it we&apos;ll say we can&apos;t check rather than guess.
          </p>

          <ul className="mt-6 flex flex-col">
            {courseCodes.map((code) => {
              const held = state[code];
              return (
                <li key={code} className="border-b border-line">
                  <div className="flex items-center gap-3 py-2.5">
                    <label className="group/course flex flex-1 cursor-pointer items-center gap-3">
                      <input
                        type="checkbox"
                        checked={held?.have ?? false}
                        onChange={() => toggle(code)}
                        className="peer sr-only"
                      />
                      <span
                        aria-hidden
                        className={cn(
                          "inline-flex size-5 shrink-0 items-center justify-center rounded border transition-colors duration-150",
                          "peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-background",
                          held?.have
                            ? "border-silver-light bg-silver-light text-surface-page"
                            : "border-line-strong group-hover/course:border-silver",
                          "motion-reduce:transition-none"
                        )}
                      >
                        {held?.have && <Check className="size-3.5" strokeWidth={3} />}
                      </span>
                      <span
                        className={cn(
                          "data text-body",
                          held?.have ? "text-foreground" : "text-muted-foreground"
                        )}
                      >
                        {code}
                      </span>
                    </label>

                    {held?.have && (
                      <label className="flex shrink-0 items-center gap-1.5">
                        <span className="sr-only">{code} mark, percent</span>
                        <input
                          type="number"
                          min={0}
                          max={100}
                          inputMode="numeric"
                          placeholder="--"
                          value={held.mark ?? ""}
                          onChange={(event) => setMark(code, event.target.value)}
                          className="data w-16 rounded-md border border-line bg-surface-raised px-2 py-1 text-right text-small text-foreground outline-none transition-colors duration-150 placeholder:text-silver focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 motion-reduce:transition-none"
                        />
                        <span aria-hidden className="data text-small text-silver">
                          %
                        </span>
                      </label>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>

          {ticked.length > 0 && (
            <Button
              variant="ghost"
              className="mt-5 -ml-2.5"
              onClick={() => setState(EMPTY_STATE)}
            >
              Clear all
            </Button>
          )}
        </div>
      </div>

      {/* ── Results ──────────────────────────────────────────────────────── */}
      <div className="col-span-12 mt-12 lg:col-span-7 lg:col-start-6 lg:mt-0">
        {/*
          Courses is the default and works on its own. The average tab is
          opt-in: it's early in the year, most students don't have final marks,
          and most of these programs publish no average requirement to apply.
        */}
        <div role="tablist" aria-label="What to check" className="flex border-b border-line-strong">
          {(
            [
              ["courses", "Course requirements", null],
              ["average", "Average", "optional"],
            ] as const
          ).map(([id, label, tag]) => (
            <button
              key={id}
              type="button"
              role="tab"
              id={`tab-${id}`}
              aria-selected={tab === id}
              aria-controls={`panel-${id}`}
              onClick={() => setTab(id)}
              className={cn(
                "-mb-px flex items-baseline gap-2 border-b px-1 py-3 text-small outline-none transition-colors duration-150 first:pl-0 focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none",
                "mr-8 last:mr-0",
                tab === id
                  ? "border-silver-light font-medium text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {label}
              {/* Once marks are in, the count replaces the "optional" hint —
                  "Average optional 7" read as one confusing label. */}
              {id === "average" && markCount > 0 ? (
                <span className="data text-label text-silver">{markCount} marks</span>
              ) : (
                tag && <span className="text-label label-mono text-silver">{tag}</span>
              )}
            </button>
          ))}
        </div>

        {/* Courses first in the DOM as well as in the tablist — a screen
            reader or keyboard user moves through panels in source order, and
            having the optional panel come first inverted that. */}
        <div
          role="tabpanel"
          id="panel-courses"
          aria-labelledby="tab-courses"
          hidden={tab !== "courses"}
          className="pt-8"
        >
        {ticked.length === 0 ? (
          <div className="surface-lit rounded-xl border border-line bg-card p-10">
            <p className="data text-label text-silver">Nothing ticked yet</p>
            <p className="measure mt-4 text-h3 text-foreground">
              Tick a course to see which of the {programs.length} programs you meet the
              requirements for.
            </p>
            <p className="measure mt-2 text-small text-muted-foreground">
              Nothing you enter leaves your browser.
            </p>
          </div>
        ) : (
          <>
            <dl className="grid grid-cols-3 gap-[var(--gutter)] border-b border-line-strong pb-6">
              {(["meets", "incomplete", "missing"] as const).map((verdict) => (
                <div key={verdict}>
                  <dd className="data text-metric text-foreground">{counts[verdict]}</dd>
                  <dt className="mt-2 text-label label-mono text-silver">
                    {VERDICT_LABEL[verdict]}
                  </dt>
                </div>
              ))}
            </dl>

            <p className="measure mt-6 text-small text-muted-foreground">
              This checks course requirements only. Meeting them is not an offer —
              averages, supplementary applications and the size of the applicant pool all
              still apply.
            </p>

            <ul className="mt-8 flex flex-col gap-4" aria-live="polite">
              {results.map((result) => (
                <ResultCard key={result.program.id} result={result} />
              ))}
            </ul>
          </>
        )}
        </div>

        <div
          role="tabpanel"
          id="panel-average"
          aria-labelledby="tab-average"
          hidden={tab !== "average"}
          className="pt-8"
        >
          <AveragePanel programs={programs} state={state} />
        </div>
      </div>
    </div>
  );
}

function ResultCard({ result }: { result: ProgramResult }) {
  const { program, verdict, results, floor, streamMissing } = result;

  return (
    <Card as="li" interactive className="flex flex-col">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-h3 font-semibold text-foreground">
            <Link
              href={`/programs/${getSchoolSlug(program.school)}/${program.id}`}
              className="rounded-sm outline-none after:absolute after:inset-0 after:content-['']"
            >
              {program.name}
            </Link>
          </h3>
          <p className="mt-1 text-small text-muted-foreground">{program.school}</p>
        </div>
        {/* Weight, not colour: the verdict that matters most is the one set
            bold, and "meets" never shouts louder than the caveat under it. */}
        <Pill
          tone={verdict === "meets" ? "default" : "muted"}
          className={cn(verdict === "meets" && "font-bold")}
        >
          {VERDICT_LABEL[verdict]}
        </Pill>
      </div>

      {/* A minimum the program applies to every required course, stated at
          program level rather than on the individual requirements. Western
          Health Sci's 70% lives in courses.notes and was being ignored. */}
      {floor && (
        <p className="mt-4 text-small text-muted-foreground">
          <span className="text-label label-mono text-silver">Every required course </span>
          needs at least{" "}
          <span className="data font-semibold text-foreground">{floor.min}%</span>
        </p>
      )}

      <ul className="mt-5 flex flex-col gap-2 border-t border-line pt-4">
        {results.map((requirement, index) => (
          <RequirementRow key={index} result={requirement} />
        ))}
      </ul>

      {/* The dataset's own note about this list — "MCV4U specifically. Med Sci
          does not accept MHF4U or MDM4U in its place" is exactly the kind of
          thing a student needs and the checker used to drop on the floor. */}
      {program.courses.notes && (
        <p className="measure mt-4 border-l-2 border-silver pl-4 text-small text-muted-foreground">
          {program.courses.notes}
        </p>
      )}

      {/* McMaster's page covers two applications with two different lists. */}
      {streamMissing.length > 0 && (
        <p className="measure mt-4 text-small text-muted-foreground">
          <span className="text-label label-mono text-silver">iBioMed stream </span>
          also needs {streamMissing.join(", ")} — it&apos;s a separate application with
          its own list.
        </p>
      )}

      <p className="mt-5 flex items-center gap-1 text-small text-silver">
        Full requirements, deadlines and traps
        <ChevronRight aria-hidden className="size-3.5" />
      </p>
    </Card>
  );
}

function RequirementRow({ result }: { result: RequirementResult }) {
  const met = result.status === "met";

  return (
    <li className="flex items-baseline gap-3">
      <span
        aria-hidden
        className={cn(
          "mt-1 inline-flex size-3.5 shrink-0 items-center justify-center",
          met ? "text-silver-light" : "text-silver"
        )}
      >
        {met ? <Check className="size-3.5" strokeWidth={3} /> : <Minus className="size-3.5" />}
      </span>
      <span className="min-w-0">
        <span
          className={cn(
            "text-small",
            met ? "text-muted-foreground" : "font-medium text-foreground"
          )}
        >
          {result.requirement.raw}
        </span>
        {!met && (
          <span className="block text-small text-silver">{result.detail}</span>
        )}
      </span>
    </li>
  );
}
