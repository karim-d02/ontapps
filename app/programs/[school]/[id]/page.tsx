import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { Claim, ClaimList, ClaimSources } from "@/components/claim";
import { GenericDetails, LabelledDetail, LabelledDetailList } from "@/components/labelled-detail";
import { GatekeepingBadge, GatekeepingPanel } from "@/components/programs/gatekeeping-badge";
import { ProgramToc, type TocItem } from "@/components/programs/program-toc";
import { ScrollProgress } from "@/components/scroll-progress";
import { CopyCode } from "@/components/ui/copy-code";
import { DateStamp } from "@/components/ui/date-stamp";
import { Pill } from "@/components/ui/pill";
import { Reveal } from "@/components/ui/reveal";
import { SectionHeader } from "@/components/ui/section-header";
import {
  formatDate,
  formatDateRange,
  nextDeadlineFor,
  resolveDeadline,
  todayISO,
  type DatedItem,
} from "@/lib/deadlines";
import { whatThisMeans } from "@/lib/program-meaning";
import {
  dateCollisions,
  internalProximity,
  notPublished,
  programHref,
  sameCategoryElsewhere,
  sameGatekeeping,
} from "@/lib/relations";
import { classifyOfficialMinimum, gradeRanges } from "@/lib/averages";
import {
  getAllPrograms,
  getCategoryLabel,
  getContradictionById,
  getInheritedSource,
  getProgramById,
  getSupplementaryApplicationsForProgram,
  getUniversityShortName,
  getVerificationDate,
} from "@/lib/data";
import { cn } from "@/lib/utils";
import type {
  Contradiction,
  Program,
  SupplementaryApplication,
} from "@/types/schema";

// Day counts are rendered into the static HTML, so the HTML has to be allowed
// to go stale by less than a day. LiveDays corrects any drift on the client;
// this keeps the pre-hydration paint and the crawler's view honest too.
export const revalidate = 3600;

export function generateStaticParams() {
  return getAllPrograms().map((program) => ({
    school: program.university_id,
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
  if (!program || program.university_id !== schoolSlug) return {};

  const supp = program.supp_app_required
    ? "Supplementary application required"
    : "No supplementary application";
  // Both halves are shortened: `short_name` and the university without the
  // word "University", to stay inside the ~60 characters Google renders.
  const title = `${program.short_name} — ${getUniversityShortName(program.university)}`;
  const verified = getVerificationDate();
  const description = `${supp}. Deadlines, required courses, admission averages and the traps that catch applicants out. Verified ${verified}.`;
  // Shorter than the description above, which is written for a search result.
  const cardDescription = `${supp}. Deadlines, required courses, averages and the traps to avoid. Verified ${verified}.`;
  const path = `/programs/${schoolSlug}/${program.id}`;

  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      title,
      description: cardDescription,
      url: path,
      type: "article",
      siteName: "OntApps",
      locale: "en_CA",
      images: [
        {
          url: `${path}/opengraph-image`,
          width: 1200,
          height: 630,
          type: "image/png",
          alt: title,
        },
      ],
    },
    twitter: { card: "summary_large_image", title, description: cardDescription },
  };
}

export default async function ProgramPage({
  params,
}: {
  params: Promise<{ school: string; id: string }>;
}) {
  const { school: schoolSlug, id } = await params;
  const program = getProgramById(id);

  if (!program || program.university_id !== schoolSlug) {
    notFound();
  }

  const today = todayISO();
  const tightDates = internalProximity(program);
  const supps = getSupplementaryApplicationsForProgram(program);
  const contradictions = collectContradictions(program, supps);

  // Sections are assembled as data first so the contents list and the page
  // itself can't disagree about what's on the page — a TOC entry pointing at a
  // section that a conditional dropped is the classic version of this bug.
  const sections: { id: string; label: string; node: React.ReactNode }[] = [
    {
      id: "gatekeeping",
      label: "When you're evaluated",
      node: <GatekeepingPanel programId={program.id} />,
    },
    {
      id: "timeline",
      label: "Timeline and deadlines",
      node: <TimelineSection program={program} today={today} tightDates={tightDates} />,
    },
    {
      id: "supp-app",
      label: "Supplementary application",
      node: <SuppAppSection program={program} supps={supps} />,
    },
    {
      id: "courses",
      label: "Required courses",
      node: <CoursesSection program={program} />,
    },
    {
      id: "averages",
      label: "Averages",
      node: <AveragesSection program={program} />,
    },
    {
      id: "traps",
      label: "Traps",
      node: <TrapsSection program={program} supps={supps} />,
    },
    ...(hasAdditionalDetails(program)
      ? [
          {
            id: "details",
            label: "Additional details",
            node: <AdditionalDetailsSection program={program} />,
          },
        ]
      : []),
    {
      id: "related",
      label: "Related programs",
      node: <RelatedSection program={program} />,
    },
    ...(notPublished(program).length > 0
      ? [
          {
            id: "not-published",
            label: "What the university hasn't published",
            node: <NotPublishedSection items={notPublished(program)} />,
          },
        ]
      : []),
    ...(contradictions.length > 0
      ? [
          {
            id: "contradictions",
            label: "Where sources disagree",
            node: <ContradictionsSection contradictions={contradictions} />,
          },
        ]
      : []),
    {
      id: "sources",
      label: "Sources",
      node: <SourcesSection program={program} />,
    },
  ];

  const tocItems: TocItem[] = sections.map(({ id, label }) => ({ id, label }));

  return (
    <>
      <ScrollProgress />
      <main className="shell pt-6 pb-[var(--rhythm-section)] motion-safe:animate-fade-rise-sm">
        <Breadcrumbs
          back={{ label: "All programs", href: "/programs" }}
          items={[
            { label: "Programs", href: "/programs" },
            { label: program.university, href: `/programs/${schoolSlug}` },
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
  const categoryLabel = getCategoryLabel(program.category);
  const verified = getVerificationDate();

  // The first screen on a phone has to answer three things: what is this, do I
  // need a supplementary application, when is it due.
  const nextDate = nextDeadlineFor(program, today);
  const enrollment = program.enrollment;

  return (
    <header className="mt-8">
      <div className="grid-12">
        <div className="col-span-12 lg:col-span-8">
          <p className="text-label label-mono text-silver">
            {program.university} · {program.campus}
          </p>
          <h1 className="mt-3 text-h1 uppercase text-metallic">{program.name}</h1>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <GatekeepingBadge programId={program.id} />
            <span className="text-small text-muted-foreground">{categoryLabel}</span>
          </div>

          {/* Sentences selected by field values — see lib/program-meaning.ts
              for the field each line maps to. */}
          <div className="measure mt-5 flex flex-col gap-2">
            {whatThisMeans(program).map((line) => (
              <p
                key={line.source}
                className={cn(
                  "text-body",
                  line.openQuestion ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {line.text}
                {line.inferred && (
                  <span className="ml-2 align-middle text-label label-mono text-silver">
                    inferred
                  </span>
                )}
              </p>
            ))}
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
              program.supp_app_required
                ? "font-bold text-foreground"
                : "font-medium text-muted-foreground",
            )}
          >
            {program.supp_app_required ? "Required" : "Not required"}
          </dd>
        </div>

        <div>
          <dt className="text-label label-mono text-silver">Next deadline</dt>
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
          <dt className="text-label label-mono text-silver">Enrolment</dt>
          <dd className="mt-2">
            {enrollment ? (
              <span className="data text-h3 font-semibold text-foreground">
                {enrollment.text}
              </span>
            ) : (
              <Pill>Not published</Pill>
            )}
          </dd>
        </div>

        <div>
          <dt className="text-label label-mono text-silver">Faculty</dt>
          <dd className="mt-2 text-body text-foreground">{program.faculty}</dd>
        </div>
      </dl>

      <OuacCodes program={program} />

      {/* The protection line. Deliberately an instruction and a date, with no
          assertion about how universities behave. */}
      <p className="measure mt-6 border-l-2 border-silver pl-4 text-small text-muted-foreground">
        Verified <span className="data text-foreground">{verified}</span>. Confirm
        against{" "}
        <a
          href="#sources"
          className="rounded-sm text-foreground underline decoration-silver underline-offset-4 outline-none transition-colors hover:decoration-silver-light focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none"
        >
          the university&apos;s own page
        </a>{" "}
        before you act.
      </p>
    </header>
  );
}

function OuacCodes({ program }: { program: Program }) {
  return (
    <div className="mt-8">
      <p className="text-label label-mono text-silver">
        OUAC code{program.ouac_codes.length === 1 ? "" : "s"}
      </p>
      {/* Survives one code and survives twelve (McMaster Engineering I) without
          changing shape — on a phone it is a single column of rows, so the
          count only makes the list longer, never wider. */}
      <ul className="mt-3 grid grid-cols-1 gap-x-[var(--gutter)] sm:grid-cols-2 lg:grid-cols-3">
        {program.ouac_codes.map((code) => (
          <li
            key={`${code.code}-${code.program}`}
            className="flex items-baseline gap-3 border-b border-line py-2.5"
          >
            <CopyCode code={code.code} />
            <span className="min-w-0 text-small text-muted-foreground">
              {code.program}
            </span>
          </li>
        ))}
      </ul>
      <LabelledDetail label="" claim={program.codes_note} />
    </div>
  );
}

/* ── Timeline ────────────────────────────────────────────────────────────── */

function TimelineSection({
  program,
  today,
  tightDates,
}: {
  program: Program;
  today: string;
  tightDates: Set<string>;
}) {
  const rows = program.deadlines.map((deadline) => ({
    deadline,
    item: resolveDeadline(deadline, today),
  }));

  // Prior-cycle rows are separated out rather than sorted in. They are a
  // previous cycle and must never sit in the same list as this cycle's dates.
  const current = rows.filter(({ item }) => !item.isPriorCycle);
  const prior = rows.filter(({ item }) => item.isPriorCycle);

  return (
    <div className="flex flex-col gap-8">
      <ul className="flex flex-col">
        {current.map(({ deadline, item }, index) => (
          <li
            key={`${deadline.key}-${index}`}
            className="flex flex-col gap-2 border-b border-line py-4 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6"
          >
            <div className="min-w-0">
              <p className="text-body text-foreground">{item.label}</p>
              {/* date_text is display copy from the data — shown, never parsed. */}
              {item.dateText && item.state !== "later" && (
                <p className="mt-1 measure text-small text-muted-foreground">
                  {item.dateText}
                </p>
              )}
              <div className="mt-1.5">
                <Claim claim={deadline}>{null}</Claim>
              </div>
            </div>
            <div className="flex shrink-0 flex-col items-start gap-1 sm:items-end">
              {item.dateRange ? (
                <span className="data text-small text-foreground">
                  {formatDateRange(item.dateRange)}
                </span>
              ) : (
                <DateStamp item={item} size="sm" />
              )}
              {item.date && tightDates.has(item.date) && (
                <span className="text-label label-mono text-silver">
                  close to another date
                </span>
              )}
            </div>
          </li>
        ))}
      </ul>

      {prior.length > 0 && (
        <div className="border-t border-line pt-6">
          <p className="text-label label-mono text-silver">
            Previous cycle — for reference only
          </p>
          <ul className="mt-4 flex flex-col gap-3">
            {prior.map(({ deadline, item }, index) => (
              <li key={`${deadline.key}-prior-${index}`} className="flex flex-col gap-1">
                <p className="text-small text-muted-foreground">{item.label}</p>
                {item.dateText && (
                  <p className="measure text-small text-muted-foreground">
                    {item.dateText}
                  </p>
                )}
                {item.dateRange && (
                  <span className="data text-small text-muted-foreground">
                    {formatDateRange(item.dateRange)}
                  </span>
                )}
                <Pill tone="muted">Last cycle</Pill>
              </li>
            ))}
          </ul>
        </div>
      )}

      <CollisionsNote program={program} />
    </div>
  );
}

function CollisionsNote({ program }: { program: Program }) {
  const collisions = dateCollisions(program);
  if (collisions.length === 0) return null;

  // Both dates and both names, and nothing else — no ranking, no advice about
  // which to do first.
  return (
    <div className="border-t border-line pt-6">
      <p className="text-label label-mono text-silver">Dates close to other programs</p>
      <ul className="mt-4 flex flex-col gap-2">
        {collisions.map((collision, index) => (
          <li key={index} className="text-small text-muted-foreground">
            <Link
              href={collision.href}
              className="text-foreground underline decoration-silver underline-offset-4 transition-colors duration-150 hover:decoration-silver-light motion-reduce:transition-none"
            >
              {collision.program.short_name}
            </Link>{" "}
            — {collision.other.label}, {formatDate(collision.other.date)} (
            {collision.daysApart === 0
              ? "same day as"
              : `${collision.daysApart} days from`}{" "}
            {collision.own.label})
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ── Supplementary application ───────────────────────────────────────────── */

function SuppAppSection({
  program,
  supps,
}: {
  program: Program;
  supps: SupplementaryApplication[];
}) {
  if (supps.length === 0) {
    return (
      <Claim claim={program.supplementary_summary} />
    );
  }

  return (
    <div className="flex flex-col gap-10">
      <Claim claim={program.supplementary_summary} />

      {supps.map((supp) => (
        <div key={supp.id} className="flex flex-col gap-6 border-t border-line pt-6">
          <div>
            <p className="text-label label-mono text-silver">{supp.name}</p>
            {/* When there is no supplementary application, say so plainly
                rather than omitting the section and leaving a gap. */}
            <p className="mt-2 text-body text-foreground">
              {supp.required
                ? "A supplementary application is required."
                : "No supplementary application."}
            </p>
          </div>

          {supp.required && (
            <>
              <LabelledDetail label="Platform" claim={supp.platform} />
              <SuppFee supp={supp} />
              <LabelledDetailList label="Components" claims={supp.components} />
              <LabelledDetail label="Weighting" claim={supp.weighting} showSources />

              {/* The long tail: ~50 subfields, 28 of which appear exactly once.
                  They fall through the generic renderer rather than each
                  getting a bespoke layout. */}
              <GenericDetails
                record={supp as unknown as Record<string, unknown>}
                skip={[
                  "platform",
                  "fee",
                  "components",
                  "weighting",
                  "traps",
                  "required_for",
                ]}
              />
            </>
          )}
        </div>
      ))}
    </div>
  );
}

function SuppFee({ supp }: { supp: SupplementaryApplication }) {
  const fee = supp.fee;
  if (!fee) return null;

  // `fee.value.amount` may be null. null is not zero and not free.
  const amount = fee.value?.amount ?? null;

  return (
    <div>
      <p className="text-label label-mono text-silver">Fee</p>
      <div className="mt-2">
        {amount === null ? (
          <div className="flex flex-col gap-2">
            <Pill>Not published</Pill>
            <Claim claim={fee} />
          </div>
        ) : (
          <Claim claim={fee} />
        )}
      </div>
    </div>
  );
}

/* ── Required courses ────────────────────────────────────────────────────── */

function CoursesSection({ program }: { program: Program }) {
  const required = program.required_courses;
  const recommended = program.recommended_courses;
  const inherited = getInheritedSource(program, "required_courses");

  return (
    <div className="flex flex-col gap-8">
      <div>
        <ul className="flex flex-col">
          {(required.value ?? []).map((course, index) => (
            <li
              key={index}
              className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-line py-2.5"
            >
              <span className="data text-body text-foreground">{course.course}</span>
              {course.minimum_grade !== null && (
                <span className="text-small text-muted-foreground">
                  minimum {course.minimum_grade}%
                </span>
              )}
              {course.evaluable === false && (
                <Pill tone="muted" wrap>
                  not checkable
                </Pill>
              )}
              {course.note && (
                <span className="measure text-small text-muted-foreground">
                  {course.note}
                </span>
              )}
            </li>
          ))}
        </ul>

        {inherited && (
          <p className="mt-3 text-small text-muted-foreground">
            Same as{" "}
            <Link
              href={`/programs/${getProgramById(inherited.programId)?.university_id}/${inherited.programId}`}
              className="text-foreground underline decoration-silver underline-offset-4"
            >
              {inherited.programName}
            </Link>
            .
          </p>
        )}

        <div className="mt-4">
          <Claim claim={required} showSources />
        </div>
      </div>

      {(recommended.value ?? []).length > 0 && (
        <div className="border-t border-line pt-6">
          <p className="text-label label-mono text-silver">Recommended</p>
          <ul className="mt-3 flex flex-col">
            {(recommended.value ?? []).map((course, index) => (
              <li key={index} className="border-b border-line py-2.5">
                <span className="data text-body text-foreground">{course.course}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <LabelledDetail label="Chemistry" claim={program.chemistry_note} />
    </div>
  );
}

/* ── Averages ────────────────────────────────────────────────────────────── */

function AveragesSection({ program }: { program: Program }) {
  const minimum = classifyOfficialMinimum(program);
  const ranges = gradeRanges(program);
  const community = program.community_competitiveness;

  return (
    <div className="flex flex-col gap-8">
      {/* 1. The published minimum. A null value is a real answer — the
             university publishes no cutoff — not a gap to fill. */}
      <div>
        <p className="text-label label-mono text-silver">Published minimum</p>
        <div className="mt-2">
          {minimum.kind === "none" ? (
            <div className="flex flex-col gap-2">
              <Pill>No published cutoff</Pill>
              <Claim claim={minimum.claim} showSources />
            </div>
          ) : (
            <Claim claim={minimum.claim} showSources />
          )}
        </div>
        {minimum.kind === "courseFloor" && (
          <p className="mt-2 measure text-small text-muted-foreground">
            This is a minimum on individual required courses, not on the overall
            average.
          </p>
        )}
      </div>

      {/* 2. Competitiveness ranges. Prose, exactly as written — never parsed
             into numbers, never charted, never averaged. */}
      {ranges.length > 0 && (
        <div className="border-t border-line pt-6">
          <p className="text-label label-mono text-silver">Grade ranges</p>
          <ul className="mt-4 flex flex-col gap-4">
            {ranges.map((range, index) => (
              <li key={index} className="flex flex-col gap-1">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="text-body text-foreground">{range.scope}</span>
                  <span className="data text-body text-foreground">{range.range}</span>
                  {range.sourceLabel && (
                    <span className="text-label label-mono text-silver">
                      {range.sourceLabel}
                    </span>
                  )}
                </div>
                <Claim claim={range.claim}>{null}</Claim>
              </li>
            ))}
          </ul>

          {/* Required context where it exists, not optional decoration. */}
          {program.grade_range_note && (
            <div className="mt-4">
              <Claim claim={program.grade_range_note} />
            </div>
          )}
        </div>
      )}

      {/* 3. Community figures last, visually subordinate, never the headline
             number and never a threshold. */}
      {community.length > 0 && (
        <div className="border-t border-line pt-6">
          <p className="text-label label-mono text-silver">
            Applicant-reported — not official
          </p>
          <div className="mt-4">
            <ClaimList claims={community} quiet />
          </div>
        </div>
      )}

      <LabelledDetailList label="Admissions statistics" claims={program.admissions_statistics} />
    </div>
  );
}

/* ── Traps ───────────────────────────────────────────────────────────────── */

function TrapsSection({
  program,
  supps,
}: {
  program: Program;
  supps: SupplementaryApplication[];
}) {
  const suppTraps = supps.flatMap((supp) =>
    (supp.traps ?? []).map((trap) => ({ trap, supp })),
  );

  return (
    <div className="flex flex-col gap-8">
      {/* stream_traps is present on all 16 programs. Each carries its own
          claim_type and verification status, and renders through <Claim> like
          every other fact, so whatever the data says about its provenance is
          what the page says. */}
      <ClaimList claims={program.stream_traps} showSources />

      {suppTraps.length > 0 && (
        <div className="border-t border-line pt-6">
          <p className="text-label label-mono text-silver">
            Supplementary application — author analysis
          </p>
          <ul className="mt-4 flex flex-col gap-5">
            {suppTraps.map(({ trap, supp }, index) => (
              <li key={`${supp.id}-${index}`}>
                <Claim claim={trap} showSources />
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/* ── Additional details (the generic bin) ────────────────────────────────── */

const FIRST_CLASS_FIELDS = [
  "id",
  "name",
  "short_name",
  "university",
  "university_id",
  "campus",
  "faculty",
  "degree",
  "category",
  "pdf_part",
  "pdf_pages",
  "admission_structure",
  "ouac_codes",
  "required_courses",
  "recommended_courses",
  "official_minimum",
  "grade_ranges",
  "grade_range_note",
  "community_competitiveness",
  "enrollment",
  "supplementary_application_ids",
  "supplementary_summary",
  "supp_app_required",
  "deadlines",
  "stream_traps",
  "admissions_statistics",
  "chemistry_note",
  "codes_note",
  "content_section_ids",
  "contradiction_ids",
  "verification_log_ids",
  "inherited_from",
  "tracked_scope",
];

function hasAdditionalDetails(program: Program): boolean {
  return (
    program.fees.length > 0 ||
    program.other_facts.length > 0 ||
    program.alternate_offer !== null ||
    program.conditional_offer_requirement !== null ||
    program.year3_entry !== null ||
    program.majors !== null ||
    (program.related_codes?.length ?? 0) > 0
  );
}

function AdditionalDetailsSection({ program }: { program: Program }) {
  return (
    <div className="flex flex-col gap-8">
      <LabelledDetail label="Admission structure" claim={program.admission_structure} />
      <LabelledDetail label="Alternate offer" claim={program.alternate_offer} />
      <LabelledDetail
        label="Conditional offer requirement"
        claim={program.conditional_offer_requirement}
      />
      <LabelledDetail label="Year 3 entry" claim={program.year3_entry} />
      <LabelledDetail label="Majors" claim={program.majors} />

      {/* other_facts and fees carry their own label in the data. */}
      {program.other_facts.map((fact, index) => (
        <div key={`fact-${index}`}>
          <p className="text-label label-mono text-silver">
            {typeof fact.value === "string" ? fact.value : fact.label ?? "Detail"}
          </p>
          <div className="mt-2">
            <Claim claim={fact} showSources />
          </div>
        </div>
      ))}

      {program.fees.map((fee, index) => (
        <div key={`fee-${index}`}>
          <p className="text-label label-mono text-silver">{fee.label ?? "Fee"}</p>
          <div className="mt-2">
            <Claim claim={fee} showSources />
          </div>
        </div>
      ))}

      {(program.related_codes?.length ?? 0) > 0 && (
        <div>
          <p className="text-label label-mono text-silver">Related codes</p>
          <ul className="mt-3 flex flex-col">
            {program.related_codes!.map((code, index) => (
              <li
                key={index}
                className="flex items-baseline gap-3 border-b border-line py-2.5"
              >
                <CopyCode code={code.code} />
                <span className="text-small text-muted-foreground">{code.program}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <GenericDetails
        record={program as unknown as Record<string, unknown>}
        skip={[
          ...FIRST_CLASS_FIELDS,
          "fees",
          "other_facts",
          "alternate_offer",
          "conditional_offer_requirement",
          "year3_entry",
          "majors",
          "related_codes",
        ]}
      />
    </div>
  );
}

/* ── Related, not published, contradictions, sources ─────────────────────── */

function RelatedSection({ program }: { program: Program }) {
  const gatekeeping = sameGatekeeping(program);
  const category = sameCategoryElsewhere(program);

  if (gatekeeping.length === 0 && category.length === 0) {
    return (
      <p className="measure text-body text-muted-foreground">
        No related programs in this dataset.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {gatekeeping.length > 0 && (
        <div>
          <p className="text-label label-mono text-silver">Evaluated the same way</p>
          <ul className="mt-3 flex flex-col">
            {gatekeeping.map(({ program: other, href }) => (
              <li key={other.id} className="border-b border-line py-2.5">
                <Link
                  href={href}
                  className="text-body text-foreground underline decoration-silver underline-offset-4 transition-colors duration-150 hover:decoration-silver-light motion-reduce:transition-none"
                >
                  {other.name}
                </Link>
                <span className="ml-2 text-small text-muted-foreground">
                  {other.university}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {category.length > 0 && (
        <div>
          <p className="text-label label-mono text-silver">
            {getCategoryLabel(program.category)} elsewhere
          </p>
          <ul className="mt-3 flex flex-col">
            {category.map(({ program: other, href }) => (
              <li key={other.id} className="border-b border-line py-2.5">
                <Link
                  href={href}
                  className="text-body text-foreground underline decoration-silver underline-offset-4 transition-colors duration-150 hover:decoration-silver-light motion-reduce:transition-none"
                >
                  {other.name}
                </Link>
                <span className="ml-2 text-small text-muted-foreground">
                  {other.university}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function NotPublishedSection({ items }: { items: string[] }) {
  return (
    <ul className="flex flex-col">
      {items.map((item) => (
        <li key={item} className="border-b border-line py-2.5 text-body text-muted-foreground">
          {item}
        </li>
      ))}
    </ul>
  );
}

function collectContradictions(
  program: Program,
  supps: SupplementaryApplication[],
): Contradiction[] {
  const ids = new Set<string>(program.contradiction_ids);

  const walk = (value: unknown) => {
    if (Array.isArray(value)) return value.forEach(walk);
    if (!value || typeof value !== "object") return;
    const record = value as Record<string, unknown>;
    if (Array.isArray(record.contradiction_ids)) {
      for (const id of record.contradiction_ids) {
        if (typeof id === "string") ids.add(id);
      }
    }
    Object.values(record).forEach(walk);
  };
  walk(program);
  supps.forEach(walk);

  return [...ids]
    .map((id) => getContradictionById(id))
    .filter((entry): entry is Contradiction => Boolean(entry));
}

function ContradictionsSection({ contradictions }: { contradictions: Contradiction[] }) {
  return (
    <ul className="flex flex-col gap-8">
      {contradictions.map((contradiction) => (
        <li
          key={contradiction.id}
          id={`contradiction-${contradiction.id}`}
          className="scroll-mt-24 border-b border-line pb-6"
        >
          <p className="text-body text-foreground">{contradiction.title}</p>
          {contradiction.status && (
            <p className="mt-1 text-label label-mono text-silver">
              {contradiction.status}
            </p>
          )}
          <ul className="mt-3 flex flex-col gap-3">
            {contradiction.statements.map((statement, index) => (
              <li key={index} className="border-l-2 border-line pl-4">
                <p className="text-label label-mono text-silver">
                  {statement.stated_by}
                </p>
                <p className="measure mt-1 text-small text-muted-foreground">
                  {statement.statement ?? statement.text}
                </p>
              </li>
            ))}
          </ul>
          {contradiction.note && (
            <p className="measure mt-3 text-small text-muted-foreground">
              {contradiction.note}
            </p>
          )}
        </li>
      ))}
    </ul>
  );
}

function SourcesSection({ program }: { program: Program }) {
  return (
    <div className="flex flex-col gap-6">
      {/* Program-level verification date. Individual claims carry their own
          `verification.checked`, which may be null — those render beside the
          claim itself rather than here. */}
      <p className="measure text-small text-muted-foreground">
        Dates and codes checked{" "}
        <span className="data text-foreground">{getVerificationDate()}</span>.
      </p>

      <div>
        <p className="text-label label-mono text-silver">Cited on this page</p>
        <div className="mt-2">
          <ClaimSources claim={program.admission_structure} />
          <ClaimSources claim={program.required_courses} />
          <ClaimSources claim={program.official_minimum} />
        </div>
      </div>
    </div>
  );
}

/* ── Structured data ─────────────────────────────────────────────────────── */

function ProgramJsonLd({ program, schoolSlug }: { program: Program; schoolSlug: string }) {
  // Only fields the dataset actually holds. Nothing is inferred, and nothing
  // that isn't published is asserted. The deadline is taken only from a row
  // the data marks `is_deadline`.
  const deadline = program.deadlines.find((entry) => entry.is_deadline && entry.date);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "EducationalOccupationalProgram",
    name: program.name,
    url: `/programs/${schoolSlug}/${program.id}`,
    provider: {
      "@type": "CollegeOrUniversity",
      name: program.university,
      address: {
        "@type": "PostalAddress",
        addressLocality: program.campus,
        addressRegion: "ON",
        addressCountry: "CA",
      },
    },
    programPrerequisites: (program.required_courses.value ?? []).map(
      (course) => course.course,
    ),
    ...(deadline?.date ? { applicationDeadline: deadline.date } : {}),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
