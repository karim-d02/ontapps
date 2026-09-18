import type { Metadata } from "next";
import Link from "next/link";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { Button } from "@/components/ui/button";
import { DateStamp } from "@/components/ui/date-stamp";
import { Pill } from "@/components/ui/pill";
import { SectionHeader } from "@/components/ui/section-header";
import { GatekeepingBadge } from "@/components/programs/gatekeeping-badge";
import { nextDeadlineFor, resolveDeadline, todayISO } from "@/lib/deadlines";
import { classifyOfficialMinimum, gradeRanges } from "@/lib/averages";
import {
  getCategoryLabel,
  getGatekeepingFor,
  getGatekeepingModel,
  getProgramById,
} from "@/lib/data";
import { cn } from "@/lib/utils";
import type { GatekeepingModelId, Program } from "@/types/schema";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Compare programs",
  description:
    "Two or three Ontario programs side by side — deadlines, prerequisites, averages, gatekeeping model and supplementary application.",
  alternates: { canonical: "/compare" },
};

const MAX_COMPARE = 3;

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<{ programs?: string }>;
}) {
  const { programs: raw } = await searchParams;
  const today = todayISO();

  const selected = (raw ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean)
    .slice(0, MAX_COMPARE)
    .map((id) => getProgramById(id))
    .filter((program): program is Program => Boolean(program));

  return (
    <main className="shell pt-6 pb-[var(--rhythm-section)] motion-safe:animate-fade-rise-sm">
      <Breadcrumbs
        back={{ label: "All programs", href: "/programs" }}
        items={[{ label: "Programs", href: "/programs" }, { label: "Compare" }]}
      />

      <div className="mt-8">
        <SectionHeader
          level={1}
          label={
            selected.length > 0
              ? `${selected.length} of ${MAX_COMPARE} selected`
              : "Nothing selected"
          }
          title="Compare"
        />
      </div>

      {selected.length < 2 ? (
        <div className="surface-lit mt-10 rounded-xl border border-line bg-card p-10">
          <p className="data text-label text-silver">Needs two</p>
          <p className="measure mt-4 text-h3 text-foreground">
            Pick two or three programs on the browse page and they&apos;ll line up here.
          </p>
          <p className="measure mt-2 text-small text-muted-foreground">
            The comparison lives in the address bar, so you can send the link to someone
            else and they&apos;ll see the same three.
          </p>
          <Button
            arrow
            size="lg"
            className="mt-6"
            nativeButton={false}
            render={<Link href="/programs" />}
          >
            Choose programs
          </Button>
        </div>
      ) : (
        <ComparisonGrid programs={selected} today={today} />
      )}
    </main>
  );
}

/** Each gatekeeping model present, explained once. Wording from the data. */
function GatekeepingLegend({ programs }: { programs: Program[] }) {
  const models = [
    ...new Set(
      programs
        .map((program) => getGatekeepingFor(program.id)?.model)
        .filter((model): model is GatekeepingModelId => Boolean(model)),
    ),
  ];

  return (
    <dl className="mt-10 hidden gap-x-[var(--gutter)] gap-y-4 border-t border-line pt-6 md:grid md:grid-cols-2">
      {models.map((model) => {
        const info = getGatekeepingModel(model);
        if (!info) return null;
        return (
          <div key={model} className="flex gap-4">
            <dt className="shrink-0">
              <Pill tone={model === "undetermined" ? "muted" : "default"}>
                {info.label}
              </Pill>
            </dt>
            <dd className="text-small text-muted-foreground">
              {info.summary}
              <span className="ml-2 text-label label-mono text-silver">analysis</span>
            </dd>
          </div>
        );
      })}
    </dl>
  );
}

function ComparisonGrid({ programs, today }: { programs: Program[]; today: string }) {
  const rows: { label: string; render: (program: Program) => React.ReactNode }[] = [
    {
      label: "Field",
      render: (program) => (
        <span className="text-small text-foreground">
          {getCategoryLabel(program.category)}
        </span>
      ),
    },
    {
      // Just the badge here. The description belongs to the model, not to the
      // program, so printing the same sentence in all three columns was three
      // copies of one fact eating a third of the screen — it's stated once in
      // the legend under the grid instead.
      label: "Gatekeeping",
      render: (program) => <GatekeepingBadge programId={program.id} />,
    },
    {
      label: "Supp app",
      render: (program) => (
        <span
          className={cn(
            "data text-body",
            program.supp_app_required
              ? "font-bold text-foreground"
              : "font-medium text-muted-foreground"
          )}
        >
          {program.supp_app_required ? "Required" : "Not required"}
        </span>
      ),
    },
    {
      label: "Supp app deadline",
      render: (program) => {
        if (!program.supp_app_required) {
          return <span className="text-small text-muted-foreground">—</span>;
        }
        // Only a row the data marks `is_deadline` may show a countdown. A row
        // whose date is not published shows its own date_text instead.
        const row = program.deadlines.find((entry) => /supp/i.test(entry.key));
        if (!row) {
          return <Pill>Not published</Pill>;
        }
        const item = resolveDeadline(row, today);
        return (
          <>
            <DateStamp item={item} size="sm" />
            {item.dateText && (
              <p className="mt-2 text-small text-muted-foreground">{item.dateText}</p>
            )}
          </>
        );
      },
    },
    {
      label: "Next date",
      render: (program) => {
        const next = nextDeadlineFor(program, today);
        return next ? (
          <>
            <DateStamp item={next} size="sm" />
            <p className="mt-2 text-small text-muted-foreground">{next.label}</p>
          </>
        ) : (
          <span className="text-small text-muted-foreground">No date ahead</span>
        );
      },
    },
    {
      label: "Required courses",
      render: (program) => (
        <ul className="flex flex-col gap-1.5">
          {(program.required_courses.value ?? []).map((course, index) => (
            <li key={index} className="data text-small text-foreground">
              {course.course}
              {course.minimum_grade !== null && (
                <span className="ml-2 text-label label-mono text-silver">
                  min {course.minimum_grade}%
                </span>
              )}
            </li>
          ))}
        </ul>
      ),
    },
    {
      label: "Averages",
      render: (program) => {
        const minimum = classifyOfficialMinimum(program);
        const ranges = gradeRanges(program);
        const community = program.community_competitiveness;
        return (
          <>
            {minimum.kind === "none" ? (
              <Pill>No published cutoff</Pill>
            ) : (
              <span className="data text-small text-foreground">
                {minimum.claim.text}
              </span>
            )}

            {/* Prose ranges, never merged with the published minimum and never
                parsed into numbers. */}
            {ranges.length > 0 && (
              <ul className="mt-3 flex flex-col gap-1.5 border-t border-line pt-3">
                {ranges.map((range, index) => (
                  <li key={index} className="text-small text-muted-foreground">
                    <span className="text-label label-mono text-silver">
                      {range.scope} ·{" "}
                    </span>
                    {range.range}
                  </li>
                ))}
              </ul>
            )}

            {/* Community figures stay subordinate here too: smaller, after the
                official ones, and always carrying the qualifier. */}
            {community.length > 0 && (
              <ul className="mt-3 flex flex-col gap-1.5 border-t border-line pt-3">
                {community.map((figure, index) => (
                  <li key={index} className="text-small text-muted-foreground">
                    <span className="text-label label-mono text-silver">
                      Applicant-reported ·{" "}
                    </span>
                    {figure.text}
                  </li>
                ))}
              </ul>
            )}
          </>
        );
      },
    },
    {
      label: "Enrolment",
      render: (program) =>
        program.enrollment === null ? (
          <Pill>Not published</Pill>
        ) : (
          <span className="data text-body text-foreground">
            {program.enrollment.text}
          </span>
        ),
    },
    {
      label: "OUAC",
      render: (program) => (
        <span className="data text-small text-foreground">
          {program.ouac_codes.map((code) => code.code).join(" ")}
        </span>
      ),
    },
  ];

  return (
    <div className="mt-10">
      {/* Columns are the programs, rows are the attributes — the only shape in
          which two numbers can actually be compared by eye. On a phone the
          same content stacks per program rather than scrolling sideways. */}
      <div
        className="hidden gap-x-[var(--gutter)] md:grid"
        style={{ gridTemplateColumns: `10rem repeat(${programs.length}, minmax(0, 1fr))` }}
      >
        <div />
        {programs.map((program) => (
          <div key={program.id} className="border-b border-line-strong pb-4">
            <p className="text-label label-mono text-silver">{program.university}</p>
            <h2 className="mt-2 text-h3 font-semibold text-foreground">
              <Link
                href={`/programs/${program.university_id}/${program.id}`}
                className="rounded-sm outline-none transition-colors duration-150 hover:text-silver-light focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4 focus-visible:ring-offset-background motion-reduce:transition-none"
              >
                {program.name}
              </Link>
            </h2>
          </div>
        ))}

        {rows.map((row) => (
          <div key={row.label} className="contents">
            <div className="border-b border-line py-5">
              <p className="text-label label-mono text-silver">{row.label}</p>
            </div>
            {programs.map((program) => (
              <div key={program.id} className="border-b border-line py-5">
                {row.render(program)}
              </div>
            ))}
          </div>
        ))}
      </div>

      <GatekeepingLegend programs={programs} />

      <div className="flex flex-col gap-10 md:hidden">
        {programs.map((program) => (
          <section key={program.id}>
            <p className="text-label label-mono text-silver">{program.university}</p>
            <h2 className="mt-2 text-h2 text-foreground">
              <Link
                href={`/programs/${program.university_id}/${program.id}`}
                className="rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {program.name}
              </Link>
            </h2>
            <dl className="mt-5">
              {rows.map((row) => (
                <div key={row.label} className="border-b border-line py-4">
                  <dt className="text-label label-mono text-silver">{row.label}</dt>
                  <dd className="mt-2">{row.render(program)}</dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>
    </div>
  );
}
