import type { Metadata } from "next";
import Link from "next/link";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { Button } from "@/components/ui/button";
import { DateStamp } from "@/components/ui/date-stamp";
import { Pill } from "@/components/ui/pill";
import { SectionHeader } from "@/components/ui/section-header";
import { resolveEntry, todayISO, type DatedItem } from "@/lib/deadlines";
import {
  getCategoryLabel,
  getGatekeepingDescription,
  getProgramById,
  getSchoolSlug,
} from "@/lib/programs";
import { cn } from "@/lib/utils";
import type { GatekeepingModel, Program } from "@/types/program";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Compare programs",
  description:
    "Two or three Ontario programs side by side — deadlines, prerequisites, averages, gatekeeping model and supplementary application.",
  alternates: { canonical: "/compare" },
};

const GATEKEEPING_LABELS: Record<GatekeepingModel, string> = {
  atTheDoor: "At the door",
  twoYearsIn: "Two years in",
  hybrid: "Hybrid",
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

/** The soonest confirmed date still ahead, per program. */
function nextDate(program: Program, today: string): DatedItem | null {
  const dated = program.timeline
    .map((entry) => resolveEntry(entry, today))
    .filter((item) => item.date !== null)
    .sort((a, b) => a.date!.localeCompare(b.date!));
  return dated.find((item) => item.daysRemaining! >= 0) ?? null;
}

/** Each gatekeeping model present, explained once. */
function GatekeepingLegend({ programs }: { programs: Program[] }) {
  const models = [...new Set(programs.map((program) => program.gatekeeping))];

  return (
    <dl className="mt-10 hidden gap-x-[var(--gutter)] gap-y-4 border-t border-line pt-6 md:grid md:grid-cols-2">
      {models.map((model) => (
        <div key={model} className="flex gap-4">
          <dt className="shrink-0">
            <Pill>{GATEKEEPING_LABELS[model]}</Pill>
          </dt>
          <dd className="text-small text-muted-foreground">
            {getGatekeepingDescription(model)}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function ComparisonGrid({ programs, today }: { programs: Program[]; today: string }) {
  const rows: { label: string; render: (program: Program) => React.ReactNode }[] = [
    {
      label: "Field",
      render: (program) => (
        <span className="text-small text-foreground">
          {getCategoryLabel(program.category) ?? program.category}
        </span>
      ),
    },
    {
      // Just the badge here. The description belongs to the model, not to the
      // program, so printing the same sentence in all three columns was three
      // copies of one fact eating a third of the screen — it's stated once in
      // the legend under the grid instead.
      label: "Gatekeeping",
      render: (program) => (
        <Pill title={getGatekeepingDescription(program.gatekeeping)}>
          {GATEKEEPING_LABELS[program.gatekeeping]}
        </Pill>
      ),
    },
    {
      label: "Supp app",
      render: (program) => (
        <span
          className={cn(
            "data text-body",
            program.suppApp.required
              ? "font-bold text-foreground"
              : "font-medium text-muted-foreground"
          )}
        >
          {program.suppApp.required ? "Required" : "Not required"}
        </span>
      ),
    },
    {
      label: "Supp app deadline",
      render: (program) => {
        if (!program.suppApp.required) {
          return <span className="text-small text-muted-foreground">—</span>;
        }
        const deadline = program.suppApp.deadline;
        const item: DatedItem =
          deadline.confirmed && deadline.date
            ? resolveEntry(
                { date: deadline.date, label: deadline.text, critical: true, confirmed: true },
                today
              )
            : {
                state: "unpublished",
                date: null,
                daysRemaining: null,
                label: deadline.text,
                critical: true,
              };
        return (
          <>
            <DateStamp item={item} size="sm" />
            <p className="mt-2 text-small text-muted-foreground">{deadline.text}</p>
          </>
        );
      },
    },
    {
      label: "Next date",
      render: (program) => {
        const next = nextDate(program, today);
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
          {program.courses.required.map((course, index) => (
            <li key={index} className="data text-small text-foreground">
              {course}
            </li>
          ))}
        </ul>
      ),
    },
    {
      label: "Averages",
      render: (program) => {
        const official = program.averages.filter((average) => average.type === "official");
        const community = program.averages.filter((average) => average.type === "community");
        return (
          <>
            {official.length > 0 ? (
              <ul className="flex flex-col gap-2">
                {official.map((average, index) => (
                  <li key={index}>
                    <span className="data text-small text-foreground">{average.figure}</span>
                    <span className="block text-label label-mono text-silver">
                      {average.source}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <Pill>Not published</Pill>
            )}
            {/* Community figures stay subordinate here too: smaller, after the
                official ones, and always carrying the qualifier. */}
            {community.length > 0 && (
              <ul className="mt-3 flex flex-col gap-1.5 border-t border-line pt-3">
                {community.map((average, index) => (
                  <li key={index} className="text-small text-muted-foreground">
                    <span className="text-label label-mono text-silver">
                      Self-reported ·{" "}
                    </span>
                    {average.figure}
                  </li>
                ))}
              </ul>
            )}
          </>
        );
      },
    },
    {
      label: "Seats",
      render: (program) =>
        program.seats === null ? (
          <Pill>Not published</Pill>
        ) : (
          <span className="data text-body text-foreground">
            {program.seats.toLocaleString("en-CA")}
          </span>
        ),
    },
    {
      label: "OUAC",
      render: (program) => (
        <span className="data text-small text-foreground">
          {program.ouacCodes.map((code) => code.code).join(" ")}
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
            <p className="text-label label-mono text-silver">{program.school}</p>
            <h2 className="mt-2 text-h3 font-semibold text-foreground">
              <Link
                href={`/programs/${getSchoolSlug(program.school)}/${program.id}`}
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
            <p className="text-label label-mono text-silver">{program.school}</p>
            <h2 className="mt-2 text-h2 text-foreground">
              <Link
                href={`/programs/${getSchoolSlug(program.school)}/${program.id}`}
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
