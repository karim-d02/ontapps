"use client";

import { Check, ChevronRight, Minus } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Pill } from "@/components/ui/pill";
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

export function PrerequisiteChecker({
  programs,
  courseCodes,
}: {
  programs: Program[];
  courseCodes: string[];
}) {
  const [state, setState] = useState<CourseState>({});

  const ticked = courseCodes.filter((code) => state[code]?.have);

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

  function toggle(code: string) {
    setState((prev) => {
      const held = prev[code];
      return { ...prev, [code]: { have: !held?.have, mark: held?.mark ?? null } };
    });
  }

  function setMark(code: string, raw: string) {
    const value = raw.trim() === "" ? null : Number(raw);
    setState((prev) => ({
      ...prev,
      [code]: {
        have: prev[code]?.have ?? false,
        mark: value === null || Number.isNaN(value) ? null : value,
      },
    }));
  }

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
            <Button variant="ghost" className="mt-5 -ml-2.5" onClick={() => setState({})}>
              Start over
            </Button>
          )}
        </div>
      </div>

      {/* ── Results ──────────────────────────────────────────────────────── */}
      <div className="col-span-12 mt-12 lg:col-span-7 lg:col-start-6 lg:mt-0">
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
    </div>
  );
}

function ResultCard({ result }: { result: ProgramResult }) {
  const { program, verdict, results } = result;

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

      <ul className="mt-5 flex flex-col gap-2 border-t border-line pt-4">
        {results.map((requirement, index) => (
          <RequirementRow key={index} result={requirement} />
        ))}
      </ul>

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
