import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { ClusterScatterChart } from "@/components/programs/cluster-scatter-chart";
import { GenericDetails, hasDetails } from "@/components/programs/generic-details";
import { ProgramToc, type TocItem } from "@/components/programs/program-toc";
import { ScrollProgress } from "@/components/scroll-progress";
import { Card } from "@/components/ui/card";
import { CopyCode } from "@/components/ui/copy-code";
import { DataTable } from "@/components/ui/data-table";
import { DateStamp } from "@/components/ui/date-stamp";
import { Pill } from "@/components/ui/pill";
import { Reveal } from "@/components/ui/reveal";
import { SectionHeader } from "@/components/ui/section-header";
import { Stat } from "@/components/ui/stat";
import { formatDate, resolveEntry, todayISO, type DatedItem } from "@/lib/deadlines";
import {
  getAllPrograms,
  getCategoryLabel,
  getGatekeepingDescription,
  getProgramById,
  getSchoolSlug,
} from "@/lib/programs";
import { cn } from "@/lib/utils";
import type {
  AverageEntry,
  Courses,
  GatekeepingModel,
  Program,
  Sources,
  PostSystem,
  SuppAppComponent,
  SuppAppRubric,
  SuppAppWeightingCluster,
  TimelineEntry,
  Trap,
  YearThreeEntry,
} from "@/types/program";

// Day counts are rendered into the static HTML, so the HTML has to be allowed
// to go stale by less than a day. LiveDays corrects any drift on the client;
// this keeps the pre-hydration paint and the crawler's view honest too.
export const revalidate = 3600;

export function generateStaticParams() {
  return getAllPrograms().map((program) => ({
    school: getSchoolSlug(program.school),
    id: program.id,
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ school: string; id: string }>;
}): Promise<Metadata> {
  const { school: schoolSlug, id } = await params;
  const program = getProgramById(id);
  if (!program || getSchoolSlug(program.school) !== schoolSlug) return {};

  const supp = program.suppApp.required
    ? "Supplementary application required"
    : "No supplementary application";
  const title = `${program.name} — ${program.school}`;
  const description = `${supp}. Deadlines, required courses, admission averages and the traps that catch applicants out. Verified ${formatDate(program.verifiedOn)}.`;
  const path = `/programs/${schoolSlug}/${program.id}`;

  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      title,
      description,
      url: path,
      type: "article",
      images: [{ url: `${path}/opengraph-image`, width: 1200, height: 630, alt: title }],
    },
    twitter: { card: "summary_large_image", title, description },
  };
}

const GATEKEEPING_LABELS: Record<GatekeepingModel, string> = {
  atTheDoor: "At the door",
  twoYearsIn: "Two years in",
  hybrid: "Hybrid",
};

export default async function ProgramPage({
  params,
}: {
  params: Promise<{ school: string; id: string }>;
}) {
  const { school: schoolSlug, id } = await params;
  const program = getProgramById(id);

  if (!program || getSchoolSlug(program.school) !== schoolSlug) {
    notFound();
  }

  const today = todayISO();
  const additionalDetails = buildAdditionalDetails(program);

  // Sections are assembled as data first so the contents list and the page
  // itself can't disagree about what's on the page — a TOC entry pointing at a
  // section that a conditional dropped is the classic version of this bug.
  const sections: { id: string; label: string; node: React.ReactNode }[] = [
    {
      id: "timeline",
      label: "Timeline",
      node: <TimelineSection timeline={program.timeline} today={today} />,
    },
    ...(program.yearThreeEntry
      ? [
          {
            id: "year-three",
            label: "Year three entry",
            node: <YearThreeEntrySection yearThreeEntry={program.yearThreeEntry} />,
          },
        ]
      : []),
    ...(program.postSystem
      ? [
          {
            id: "post-system",
            label: program.postSystem.title,
            node: <PostSystemSection postSystem={program.postSystem} />,
          },
        ]
      : []),
    ...(program.rules && program.rules.length > 0
      ? [
          {
            id: "rules",
            label: "Application rules",
            node: <RulesSection rules={program.rules} />,
          },
        ]
      : []),
    {
      id: "supp-app",
      label: "Supplementary application",
      node: <SuppAppSection program={program} today={today} />,
    },
    {
      id: "courses",
      label: "Required courses",
      node: <CoursesSection courses={program.courses} />,
    },
    {
      id: "averages",
      label: "Averages",
      node: <AveragesSection averages={program.averages} />,
    },
    { id: "traps", label: "Traps", node: <TrapsSection traps={program.traps} /> },
    ...(program.prep
      ? [{ id: "prep", label: "Prep", node: <PrepSection prep={program.prep} /> }]
      : []),
    ...(hasDetails(additionalDetails)
      ? [
          {
            id: "details",
            label: "Additional details",
            node: <GenericDetails data={additionalDetails} />,
          },
        ]
      : []),
    {
      id: "sources",
      label: "Sources",
      node: <SourcesSection sources={program.sources} verifiedOn={program.verifiedOn} />,
    },
  ];

  const tocItems: TocItem[] = sections.map(({ id, label }) => ({ id, label }));

  return (
    <>
      <ScrollProgress />
      {/* pt-6, matching every other breadcrumbed page: the trail sits close
          under the nav, and the full section rhythm starts below it. Pages
          without breadcrumbs open at the rhythm instead. */}
      <main className="shell pt-6 pb-[var(--rhythm-section)] motion-safe:animate-fade-rise-sm">
        <Breadcrumbs
          back={{ label: "All programs", href: "/programs" }}
          items={[
            { label: "Programs", href: "/programs" },
            { label: program.school, href: `/programs/${schoolSlug}` },
            { label: program.name },
          ]}
        />

        <ProgramHeader program={program} today={today} />

        <div className="grid-12 mt-[var(--rhythm-section)]">
          <div className="stack-sections col-span-12 lg:col-span-8">
            {sections.map(({ id, label, node }, index) => (
              <Reveal key={id} as="section" id={id} data-anchor>
                {/* A mono row index above the name: it marks the boundary,
                    tells you where you are in the page, and costs one line. */}
                <SectionHeader
                  level={2}
                  label={String(index + 1).padStart(2, "0")}
                  title={label}
                  className="border-t border-line-strong pt-5"
                />
                <div className="mt-6">{node}</div>
              </Reveal>
            ))}
          </div>

          <div className="col-span-12 hidden lg:col-span-3 lg:col-start-10 lg:block">
            <ProgramToc items={tocItems} />
          </div>
        </div>
      </main>

      <ProgramJsonLd program={program} schoolSlug={schoolSlug} />
    </>
  );
}

/* ── Header ──────────────────────────────────────────────────────────────── */

function ProgramHeader({ program, today }: { program: Program; today: string }) {
  const categoryLabel = getCategoryLabel(program.category) ?? program.category;
  const gatekeepingDescription = getGatekeepingDescription(program.gatekeeping);

  // The first screen on a phone has to answer three things: what is this, do I
  // need a supplementary application, when is it due. Everything else — seats,
  // applicant counts, the full OUAC list — waits until below the fold.
  const nextDate = nextDatedEntry(program.timeline, today);

  return (
    <header className="mt-8">
      <div className="grid-12">
        <div className="col-span-12 lg:col-span-8">
          <p className="text-label label-mono text-silver">
            {program.school} · {program.campus}
          </p>
          <h1 className="mt-3 text-h1 uppercase text-metallic">{program.name}</h1>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Pill title={gatekeepingDescription}>
              {GATEKEEPING_LABELS[program.gatekeeping]}
            </Pill>
            <span className="text-small text-muted-foreground">{categoryLabel}</span>
          </div>
        </div>
      </div>

      {/* The answer strip. Bordered top and bottom so it reads as a readout
          rather than as more page. */}
      <dl className="mt-6 grid grid-cols-1 gap-x-[var(--gutter)] gap-y-6 border-y border-line-strong py-6 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <dt className="text-label label-mono text-silver">Supplementary app</dt>
          <dd
            className={cn(
              "data mt-2 text-h3",
              program.suppApp.required
                ? "font-bold text-foreground"
                : "font-medium text-muted-foreground"
            )}
          >
            {program.suppApp.required ? "Required" : "Not required"}
          </dd>
        </div>

        <div>
          <dt className="text-label label-mono text-silver">Next date</dt>
          <dd className="mt-2">
            {nextDate ? (
              <DateStamp item={nextDate} size="sm" />
            ) : (
              <Pill tone="muted">None upcoming</Pill>
            )}
          </dd>
          {/* Second <dd> rather than a <p>: a <dl> may only hold dt/dd pairs. */}
          {nextDate?.label && (
            <dd className="mt-1.5 max-w-[22rem] text-small text-muted-foreground">
              {nextDate.label}
            </dd>
          )}
        </div>

        <div>
          <dt className="text-label label-mono text-silver">Seats</dt>
          <dd className="mt-2">
            {program.seats === null ? (
              <Pill>Not published</Pill>
            ) : (
              <span className="data text-h3 font-semibold text-foreground">
                {program.seats.toLocaleString("en-CA")}
              </span>
            )}
          </dd>
          {program.seatsNote && (
            <dd className="mt-1.5 max-w-[22rem] text-small text-muted-foreground">
              {program.seatsNote}
            </dd>
          )}
        </div>

        {program.applicants ? (
          <div>
            <dt className="text-label label-mono text-silver">Applicants</dt>
            <dd className="data mt-2 text-h3 font-semibold text-foreground">
              {program.applicants.figure}
              {/* Community figures never lose their qualifier. */}
              {program.applicants.source === "community" && (
                <span className="ml-2 align-middle text-label label-mono font-normal text-silver">
                  self-reported
                </span>
              )}
            </dd>
            {program.applicants.note && (
              <dd className="mt-1.5 max-w-[22rem] text-small text-muted-foreground">
                {program.applicants.note}
              </dd>
            )}
          </div>
        ) : (
          <div>
            <dt className="text-label label-mono text-silver">Gatekeeping</dt>
            <dd className="mt-2 max-w-[22rem] text-small text-muted-foreground">
              {gatekeepingDescription}
            </dd>
          </div>
        )}
      </dl>

      {program.applicants && (
        <p className="mt-6 measure text-body text-muted-foreground">
          {gatekeepingDescription}
        </p>
      )}

      <OuacCodes program={program} />

      {/* The protection line. Stated where it will actually be read, not
          buried at the bottom with the sources. */}
      <p className="measure mt-6 border-l-2 border-silver pl-4 text-small text-muted-foreground">
        Verified{" "}
        <time dateTime={program.verifiedOn} className="data text-foreground">
          {formatDate(program.verifiedOn)}
        </time>
        . Official pages change without notice — confirm against{" "}
        <a
          href="#sources"
          className="rounded-sm text-foreground underline decoration-silver underline-offset-4 outline-none transition-colors hover:decoration-silver-light focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none"
        >
          the university&apos;s own page
        </a>{" "}
        before you act on anything here.
      </p>
    </header>
  );
}

function OuacCodes({ program }: { program: Program }) {
  return (
    <div className="mt-8">
      <p className="text-label label-mono text-silver">
        OUAC code{program.ouacCodes.length === 1 ? "" : "s"}
      </p>
      {/* Survives one code and survives ten (U of T Engineering) without
          changing shape — the columns just fill. */}
      <ul className="mt-3 grid grid-cols-1 gap-x-[var(--gutter)] sm:grid-cols-2 lg:grid-cols-3">
        {program.ouacCodes.map((code) => (
          <li
            key={code.code}
            className="flex items-baseline gap-3 border-b border-line py-2.5"
          >
            <CopyCode code={code.code} />
            <span className="text-small text-muted-foreground">{code.label}</span>
          </li>
        ))}
      </ul>
      {program.codeNote && (
        <p className="measure mt-3 text-small text-muted-foreground">{program.codeNote}</p>
      )}
    </div>
  );
}

/* ── Sections ────────────────────────────────────────────────────────────── */

/** The soonest entry that still has a date ahead of it, for the header strip. */
function nextDatedEntry(timeline: TimelineEntry[], today: string): DatedItem | null {
  const dated = timeline
    .map((entry) => resolveEntry(entry, today))
    .filter((item) => item.date !== null)
    .sort((a, b) => a.date!.localeCompare(b.date!));

  return dated.find((item) => item.daysRemaining! >= 0) ?? dated.at(-1) ?? null;
}

function TimelineSection({ timeline, today }: { timeline: TimelineEntry[]; today: string }) {
  const items = timeline.map((entry) => resolveEntry(entry, today));

  return (
    <ol className="border-l border-line">
      {items.map((item, index) => (
        <li
          key={index}
          className={cn(
            "relative pb-8 pl-6 last:pb-0",
            "before:absolute before:top-1.5 before:-left-[4.5px] before:size-2 before:rounded-full before:ring-4 before:ring-background",
            // The marker's weight carries the same urgency the type does.
            item.state === "imminent"
              ? "before:bg-silver-light"
              : item.critical
                ? "before:bg-silver"
                : "before:bg-silver-dark"
          )}
        >
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-2">
            <DateStamp item={item} size="md" />
            {item.critical && <Pill>Critical</Pill>}
          </div>
          <p
            className={cn(
              "measure mt-2 text-body",
              item.critical ? "font-medium text-foreground" : "text-muted-foreground"
            )}
          >
            {item.label}
          </p>
        </li>
      ))}
    </ol>
  );
}

function YearThreeEntrySection({ yearThreeEntry }: { yearThreeEntry: YearThreeEntry }) {
  return (
    <>
      <h3 className="text-h3 text-foreground">{yearThreeEntry.title}</h3>
      <DataTable
        className="mt-5"
        caption="Routes into year three"
        rows={yearThreeEntry.routes}
        rowKey={(_, index) => String(index)}
        columns={[
          { key: "name", header: "Route", render: (r) => <span className="font-medium">{r.name}</span> },
          { key: "requirement", header: "Requirement", render: (r) => r.requirement },
          { key: "outcome", header: "Outcome", render: (r) => r.outcome },
        ]}
      />
      <p className="measure mt-4 text-small text-muted-foreground">
        {yearThreeEntry.moduleFilter}
      </p>
    </>
  );
}

function PostSystemSection({ postSystem }: { postSystem: PostSystem }) {
  return (
    <>
      <p className="measure text-body text-foreground">{postSystem.body}</p>
      {postSystem.types && postSystem.types.length > 0 && (
        <DataTable
          className="mt-6"
          caption="Program types and their requirements"
          rows={postSystem.types}
          rowKey={(_, index) => String(index)}
          columns={[
            { key: "name", header: "Name", render: (t) => <span className="font-medium">{t.name}</span> },
            { key: "requirement", header: "Requirement", render: (t) => t.requirement },
          ]}
        />
      )}
      {postSystem.mechanics && (
        <p className="measure mt-4 text-small text-muted-foreground">{postSystem.mechanics}</p>
      )}
    </>
  );
}

function RulesSection({ rules }: { rules: string[] }) {
  return (
    <ul className="measure flex flex-col gap-3">
      {rules.map((rule, index) => (
        <li key={index} className="flex gap-4 text-body text-foreground">
          <span aria-hidden className="data mt-px shrink-0 text-small text-silver">
            {String(index + 1).padStart(2, "0")}
          </span>
          <span>{rule}</span>
        </li>
      ))}
    </ul>
  );
}

function SuppAppSection({ program, today }: { program: Program; today: string }) {
  const suppApp = program.suppApp;

  if (!suppApp.required) {
    return (
      <>
        <p className="text-h3 font-semibold text-foreground">No supplementary application.</p>
        <p className="measure mt-2 text-body text-muted-foreground">{suppApp.note}</p>
      </>
    );
  }

  const questionGroups: { title: string; items?: SuppAppComponent[] }[] = [
    { title: "Components", items: suppApp.components },
    { title: "Known in advance", items: suppApp.known },
    { title: "Drawn at random", items: suppApp.random },
  ].filter((group) => (group.items?.length ?? 0) > 0);

  const deadlineItem: DatedItem = suppApp.deadline.confirmed && suppApp.deadline.date
    ? {
        ...resolveEntry(
          {
            date: suppApp.deadline.date,
            label: suppApp.deadline.text,
            critical: true,
            confirmed: true,
          },
          today
        ),
      }
    : {
        state: "unpublished",
        date: null,
        daysRemaining: null,
        label: suppApp.deadline.text,
        critical: true,
      };

  return (
    <>
      {/* The deadline leads. It is the single thing most readers came for, and
          it used to sit two thirds of the way down this section. */}
      <div className="border-y border-line-strong py-6">
        <p className="text-label label-mono text-silver">Deadline</p>
        <div className="mt-3">
          <DateStamp item={deadlineItem} size="lg" />
        </div>
        <p className="measure mt-3 text-body text-muted-foreground">
          {suppApp.deadline.text}
        </p>
        {suppApp.deadline.estimate && (
          <p className="measure mt-4 border-l-2 border-silver-dark pl-4 text-small text-muted-foreground">
            <span className="text-label label-mono text-silver">Estimate, not a date </span>
            <br />
            {suppApp.deadline.estimate}
          </p>
        )}
      </div>

      {(suppApp.formatUnconfirmed || suppApp.formatWarning) && (
        <div className="mt-6 surface-lit rounded-lg border border-silver/60 bg-card p-4">
          <p className="text-label label-mono text-silver-light">Format not yet confirmed</p>
          {suppApp.formatWarning && (
            <p className="measure mt-2 text-small text-foreground">{suppApp.formatWarning}</p>
          )}
        </div>
      )}

      <p className="measure mt-6 text-body text-foreground">{suppApp.format}</p>
      {suppApp.note && (
        <p className="measure mt-3 text-small text-muted-foreground">{suppApp.note}</p>
      )}
      {suppApp.sitting && (
        <p className="measure mt-2 text-small text-muted-foreground">{suppApp.sitting}</p>
      )}

      <dl className="mt-6 grid grid-cols-1 gap-x-[var(--gutter)] gap-y-4 sm:grid-cols-3">
        <Field label="Platform" value={suppApp.platform} />
        {suppApp.limit && <Field label="Limit" value={suppApp.limit} mono />}
        {suppApp.evaluators && <Field label="Evaluators" value={suppApp.evaluators} />}
        <Field
          label="Fee"
          value={suppApp.fee === null ? <Pill>Not published</Pill> : suppApp.fee}
          mono={suppApp.fee !== null}
          note={suppApp.feeNote}
        />
        <Field
          label="Questions published in advance"
          value={
            suppApp.questionsPublishedInAdvance === "partial"
              ? "Partially"
              : suppApp.questionsPublishedInAdvance
                ? "Yes"
                : "No"
          }
          mono
        />
        <Field
          label="Rubric published"
          value={suppApp.rubricPublished ? "Yes" : "No"}
          mono
          note={suppApp.rubricNote}
        />
      </dl>

      {questionGroups.length > 0 && (
        <div className="mt-10">
          <h3 className="text-h3 text-foreground">Questions</h3>
          <div className="mt-4 flex flex-col gap-6">
            {questionGroups.map((group) => (
              <div key={group.title}>
                {questionGroups.length > 1 && (
                  <p className="text-label label-mono text-silver">{group.title}</p>
                )}
                <ul className="mt-3 flex flex-col gap-3">
                  {group.items!.map((item, index) => (
                    <Card key={index} as="li">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <Pill tone="muted" className="capitalize">
                          {item.type}
                        </Pill>
                        {item.limit && (
                          <span className="data text-small text-silver">{item.limit}</span>
                        )}
                      </div>
                      <p className="mt-3 text-body text-foreground">{item.prompt}</p>
                      {item.time && (
                        <p className="data mt-2 text-small text-silver">{item.time}</p>
                      )}
                    </Card>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          {suppApp.questionsNote && (
            <p className="measure mt-4 text-small text-muted-foreground">
              {suppApp.questionsNote}
            </p>
          )}
          {suppApp.structureNote && (
            <p className="measure mt-2 text-small text-muted-foreground">
              {suppApp.structureNote}
            </p>
          )}
        </div>
      )}

      {suppApp.questions && suppApp.questions.length > 0 && (
        <div className="mt-10">
          <h3 className="text-h3 text-foreground">Published questions</h3>
          <ol className="measure mt-4 flex flex-col gap-3">
            {suppApp.questions.map((question, index) => (
              <li key={index} className="flex gap-4 text-body text-foreground">
                <span aria-hidden className="data mt-px shrink-0 text-small text-silver">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span>{question}</span>
              </li>
            ))}
          </ol>
          {suppApp.questionsNote && (
            <p className="measure mt-4 text-small text-muted-foreground">
              {suppApp.questionsNote}
            </p>
          )}
        </div>
      )}

      {suppApp.competencies && suppApp.competencies.length > 0 && (
        <div className="mt-8">
          <p className="text-label label-mono text-silver">Assessed on</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {suppApp.competencies.map((competency) => (
              <Pill key={competency} tone="muted" wrap>
                {competency}
              </Pill>
            ))}
          </div>
        </div>
      )}

      {suppApp.rubric && <RubricDetail rubric={suppApp.rubric} />}

      {suppApp.invite && (
        <p className="measure mt-6 text-small text-muted-foreground">{suppApp.invite}</p>
      )}

      {suppApp.mismatch && (
        <div className="mt-8 surface-lit rounded-lg border border-silver/60 bg-card p-4">
          <p className="text-label label-mono text-silver-light">Mismatch</p>
          <p className="measure mt-2 text-body text-foreground">{suppApp.mismatch}</p>
        </div>
      )}

      <div className="mt-10">
        <h3 className="text-h3 text-foreground">Weighting</h3>
        <p className="measure mt-3 text-body text-foreground">{suppApp.weighting.summary}</p>

        {suppApp.weighting.keyLine && (
          <p className="measure mt-5 border-l-2 border-silver-light pl-4 text-h3 font-medium text-foreground">
            {suppApp.weighting.keyLine}
          </p>
        )}

        {suppApp.weighting.formula && (
          <p className="data mt-5 w-fit rounded-md border border-line bg-surface-raised px-3 py-2 text-small text-foreground">
            {suppApp.weighting.formula}
          </p>
        )}
        {suppApp.weighting.notPublished && suppApp.weighting.notPublished.length > 0 && (
          <ul className="mt-4 flex flex-col gap-1.5">
            {suppApp.weighting.notPublished.map((item, index) => (
              <li key={index} className="text-small text-muted-foreground">
                <span className="text-label label-mono text-silver">Not published </span>
                {item}
              </li>
            ))}
          </ul>
        )}
        {suppApp.weighting.note && (
          <p className="measure mt-4 text-small text-muted-foreground">
            {suppApp.weighting.note}
          </p>
        )}
        {suppApp.weighting.communityInterpretation && (
          <p className="measure mt-4 text-small text-muted-foreground">
            <span className="text-label label-mono text-silver">
              Community interpretation, unofficial{" "}
            </span>
            <br />
            {suppApp.weighting.communityInterpretation}
          </p>
        )}
        <div className="mt-4">
          {suppApp.weighting.official ? (
            <Pill tone="muted">Officially published</Pill>
          ) : (
            <Pill>Not officially published</Pill>
          )}
        </div>

        {suppApp.weighting.clusters && suppApp.weighting.clusters.length > 0 && (
          <>
            <ClusterScatterChart program={program} />
            <WeightingClusters clusters={suppApp.weighting.clusters} />
            {suppApp.weighting.clustersSource && (
              <p className="mt-3 text-small text-muted-foreground">
                <span className="text-label label-mono text-silver">Source </span>
                {suppApp.weighting.clustersSource}
              </p>
            )}
          </>
        )}
      </div>
    </>
  );
}

function Field({
  label,
  value,
  mono,
  note,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
  note?: string;
}) {
  return (
    <div>
      <dt className="text-label label-mono text-silver">{label}</dt>
      <dd className={cn("mt-2 text-body text-foreground", mono && "data")}>{value}</dd>
      {note && <dd className="mt-1.5 text-small text-muted-foreground">{note}</dd>}
    </div>
  );
}

function RubricDetail({ rubric }: { rubric: SuppAppRubric }) {
  return (
    <div className="mt-10">
      <h3 className="text-h3 text-foreground">Rubric</h3>
      <div className="mt-4 flex flex-wrap gap-2">
        {rubric.bands.map((band) => (
          <Pill key={band} tone="muted" wrap>
            {band}
          </Pill>
        ))}
      </div>
      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        <div>
          <p className="text-label label-mono text-silver">Written criteria</p>
          <ul className="mt-3 flex flex-col gap-2">
            {rubric.written.map((criterion, index) => (
              <li key={index} className="text-small text-muted-foreground">
                {criterion}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-label label-mono text-silver">Video criteria</p>
          <ul className="mt-3 flex flex-col gap-2">
            {rubric.video.map((criterion, index) => (
              <li key={index} className="text-small text-muted-foreground">
                {criterion}
              </li>
            ))}
          </ul>
        </div>
      </div>
      <p className="measure mt-6 border-l-2 border-silver-light pl-4 text-body text-foreground">
        <span className="text-label label-mono text-silver">Key insight</span>
        <br />
        {rubric.keyInsight}
      </p>
      <p className="measure mt-4 text-small text-muted-foreground">
        Not scored: {rubric.notScored}
      </p>
    </div>
  );
}

function WeightingClusters({ clusters }: { clusters: SuppAppWeightingCluster[] }) {
  return (
    <DataTable
      className="mt-8"
      caption="Supplementary application score against GPA against outcome"
      rows={clusters}
      rowKey={(_, index) => String(index)}
      columns={[
        { key: "supp", header: "Supp app score", numeric: true, nowrap: true, render: (c) => c.suppAppScore },
        { key: "gpa", header: "GPA", render: (c) => c.gpa },
        {
          key: "outcome",
          header: "Outcome",
          render: (c) =>
            c.outcome === "Offer" ? (
              <span className="font-semibold text-foreground">{c.outcome}</span>
            ) : (
              <span className="text-muted-foreground">{c.outcome}</span>
            ),
        },
        {
          key: "count",
          header: "Count",
          numeric: true,
          render: (c) => (c.count === null ? <Pill>Not published</Pill> : c.count.toLocaleString("en-CA")),
        },
      ]}
    />
  );
}

function CoursesSection({ courses }: { courses: Courses }) {
  return (
    <>
      <p className="measure text-body text-foreground">{courses.total}</p>
      {courses.required.length > 0 && (
        <div className="mt-6">
          <p className="text-label label-mono text-silver">Required</p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {courses.required.map((course, index) => (
              <CourseChip key={index} course={course} />
            ))}
          </ul>
        </div>
      )}
      {courses.recommended.length > 0 && (
        <div className="mt-6">
          <p className="text-label label-mono text-silver">Recommended</p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {courses.recommended.map((course, index) => (
              <CourseChip key={index} course={course} muted />
            ))}
          </ul>
        </div>
      )}
      {courses.notes && (
        <p className="measure mt-5 text-small text-muted-foreground">{courses.notes}</p>
      )}
    </>
  );
}

function CourseChip({ course, muted }: { course: string; muted?: boolean }) {
  return (
    // Course labels come straight from the dataset and range from "ENG4U" to a
    // full sentence, so they wrap rather than forcing the page wide.
    <li className="max-w-full">
      <Pill wrap tone={muted ? "muted" : "default"} className="normal-case">
        {course}
      </Pill>
    </li>
  );
}

function AveragesSection({ averages }: { averages: AverageEntry[] }) {
  const official = averages.filter((average) => average.type === "official");
  const community = averages.filter((average) => average.type === "community");

  return (
    <>
      {official.length > 0 && (
        <ul className="flex flex-col gap-6">
          {official.map((average, index) => (
            <li key={index}>
              <Stat value={average.figure} label={average.source} size="md" labelPosition="above" />
              {average.note && (
                <p className="measure mt-2 text-small text-muted-foreground">{average.note}</p>
              )}
            </li>
          ))}
        </ul>
      )}
      {/* Community figures stay visually subordinate: smaller, quieter, after
          the official ones, and never without the qualifier. */}
      {community.length > 0 && (
        <div className="mt-8 border-t border-line pt-6">
          <p className="text-label label-mono text-silver">
            Community-reported · self-reported, skews high
          </p>
          <ul className="mt-4 flex flex-col gap-4">
            {community.map((average, index) => (
              <li key={index}>
                <p className="text-small text-muted-foreground">
                  <span className="text-label label-mono text-silver">{average.source}</span>
                  <br />
                  <span className="data text-foreground">{average.figure}</span>
                </p>
                <p className="measure mt-1 text-small text-muted-foreground">
                  {average.note ?? "Self-reported, skews high."}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}

function TrapsSection({ traps }: { traps: Trap[] }) {
  return (
    <ul className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {traps.map((trap, index) => (
        <Card key={index} as="li" className="flex flex-col">
          <p className="data text-label text-silver">{String(index + 1).padStart(2, "0")}</p>
          <p className="mt-3 text-h3 font-semibold text-foreground">{trap.title}</p>
          <p className="mt-2 text-body text-muted-foreground">{trap.body}</p>
        </Card>
      ))}
    </ul>
  );
}

function PrepSection({ prep }: { prep: NonNullable<Program["prep"]> }) {
  return (
    <>
      <dl className="grid grid-cols-1 gap-x-[var(--gutter)] gap-y-4 sm:grid-cols-2">
        <Field label="Shape" value={prep.shape} />
        <Field label="Time" value={prep.time} mono />
      </dl>
      <p className="measure mt-5 text-body text-muted-foreground">{prep.note}</p>
    </>
  );
}

function SourcesSection({ sources, verifiedOn }: { sources: Sources; verifiedOn: string }) {
  return (
    <>
      <div className="grid grid-cols-1 gap-x-[var(--gutter)] gap-y-8 sm:grid-cols-2">
        {sources.official.length > 0 && (
          <div>
            <p className="text-label label-mono text-silver">Official</p>
            <ul className="mt-3 flex flex-col gap-2">
              {sources.official.map((source, index) => (
                <li key={index} className="border-b border-line pb-2 text-small text-foreground">
                  {source}
                </li>
              ))}
            </ul>
          </div>
        )}
        {sources.reported.length > 0 && (
          <div>
            <p className="text-label label-mono text-silver">Reported</p>
            <ul className="mt-3 flex flex-col gap-2">
              {sources.reported.map((source, index) => (
                <li
                  key={index}
                  className="border-b border-line pb-2 text-small text-muted-foreground"
                >
                  {source}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      <p className="mt-8 text-small text-muted-foreground">
        Verified on{" "}
        <time dateTime={verifiedOn} className="data text-foreground">
          {formatDate(verifiedOn)}
        </time>
      </p>
    </>
  );
}

/* ── Structured data ─────────────────────────────────────────────────────── */

function ProgramJsonLd({ program, schoolSlug }: { program: Program; schoolSlug: string }) {
  // Only fields the dataset actually holds. Nothing is inferred, and nothing
  // that isn't published is asserted.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "EducationalOccupationalProgram",
    name: program.name,
    url: `/programs/${schoolSlug}/${program.id}`,
    provider: {
      "@type": "CollegeOrUniversity",
      name: program.school,
      address: { "@type": "PostalAddress", addressLocality: program.campus, addressRegion: "ON", addressCountry: "CA" },
    },
    programPrerequisites: program.courses.required,
    ...(program.timeline.find((entry) => entry.confirmed && entry.date)
      ? {
          applicationDeadline: program.timeline.find(
            (entry) => entry.confirmed && entry.date && entry.critical
          )?.date,
        }
      : {}),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

function buildAdditionalDetails(program: Program): Record<string, unknown> {
  const {
    majors,
    accessChain,
    adjustmentFactor,
    aiScoring,
    alternativeOffer,
    lookingFor,
    howToApply,
    courses,
    suppApp,
  } = program;

  let supplementaryApplication: Record<string, unknown> | undefined;
  let weighting: Record<string, unknown> | undefined;

  if (suppApp.required) {
    const {
      required: _required,
      platform: _platform,
      format: _format,
      limit: _limit,
      evaluators: _evaluators,
      note: _note,
      formatWarning: _formatWarning,
      formatUnconfirmed: _formatUnconfirmed,
      mismatch: _mismatch,
      rubricNote: _rubricNote,
      components: _components,
      known: _known,
      random: _random,
      deadline: _deadline,
      fee: _fee,
      questionsPublishedInAdvance: _questionsPublishedInAdvance,
      rubricPublished: _rubricPublished,
      weighting: suppAppWeighting,
      ...suppAppRest
    } = suppApp;
    supplementaryApplication = suppAppRest;

    const {
      type: _type,
      official: _official,
      summary: _summary,
      note: _weightingNote,
      clusters: _clusters,
      clustersSource: _clustersSource,
      keyLine: _keyLine,
      ...weightingRest
    } = suppAppWeighting;
    weighting = weightingRest;
  }

  return {
    majors,
    accessChain,
    adjustmentFactor,
    aiScoring,
    alternativeOffer,
    lookingFor,
    howToApply,
    requiredIBioMed: courses.requiredIBioMed,
    supplementaryApplication,
    weighting,
  };
}
