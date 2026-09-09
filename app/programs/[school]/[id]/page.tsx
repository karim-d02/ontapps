import { notFound } from "next/navigation";

import { ClusterScatterChart } from "@/components/programs/cluster-scatter-chart";
import { GenericDetails, hasDetails } from "@/components/programs/generic-details";
import { Badge } from "@/components/ui/badge";
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

export function generateStaticParams() {
  return getAllPrograms().map((program) => ({
    school: getSchoolSlug(program.school),
    id: program.id,
  }));
}

const GATEKEEPING_LABELS: Record<GatekeepingModel, string> = {
  atTheDoor: "At the door",
  twoYearsIn: "Two years in",
  hybrid: "Hybrid",
};

function formatDate(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

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

  const additionalDetails = buildAdditionalDetails(program);

  return (
    <main className="mx-auto max-w-2xl px-4 pb-16 sm:px-6">
      <ProgramHeader program={program} />
      <TimelineSection timeline={program.timeline} />
      {program.yearThreeEntry && (
        <YearThreeEntrySection yearThreeEntry={program.yearThreeEntry} />
      )}
      {program.postSystem && <PostSystemSection postSystem={program.postSystem} />}
      {program.rules && program.rules.length > 0 && (
        <RulesSection rules={program.rules} />
      )}
      <SuppAppSection program={program} />
      <CoursesSection courses={program.courses} />
      <AveragesSection averages={program.averages} />
      <TrapsSection traps={program.traps} />
      {program.prep && (
        <section className="border-b border-border py-6">
          <h2 className="text-h3 font-semibold tracking-tight text-foreground">Prep</h2>
          <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3">
            <div>
              <dt className="text-small text-muted-foreground">Shape</dt>
              <dd className="text-body text-foreground">{program.prep.shape}</dd>
            </div>
            <div>
              <dt className="text-small text-muted-foreground">Time</dt>
              <dd className="text-body text-foreground">{program.prep.time}</dd>
            </div>
          </dl>
          <p className="mt-3 text-body text-muted-foreground">{program.prep.note}</p>
        </section>
      )}
      {hasDetails(additionalDetails) && (
        <section className="border-b border-border py-6">
          <h2 className="text-h3 font-semibold tracking-tight text-foreground">
            Additional details
          </h2>
          <div className="mt-3">
            <GenericDetails data={additionalDetails} />
          </div>
        </section>
      )}
      <SourcesSection sources={program.sources} verifiedOn={program.verifiedOn} />
    </main>
  );
}

function ProgramHeader({ program }: { program: Program }) {
  const categoryLabel = getCategoryLabel(program.category) ?? program.category;
  const gatekeepingDescription = getGatekeepingDescription(program.gatekeeping);

  return (
    <header className="border-b border-border pt-6 pb-6">
      <p className="text-small font-medium tracking-[0.08em] text-muted-foreground uppercase">
        {program.school} · {program.campus}
      </p>
      <h1 className="mt-1 text-2xl leading-tight font-semibold tracking-tight text-foreground sm:text-h2">
        {program.name}
      </h1>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Badge
          variant="outline"
          className="border-silver-light/60 text-foreground"
          title={gatekeepingDescription}
        >
          {GATEKEEPING_LABELS[program.gatekeeping]}
        </Badge>
        <span className="text-small text-muted-foreground">{categoryLabel}</span>
      </div>
      <p className="mt-1.5 text-small text-muted-foreground">{gatekeepingDescription}</p>

      <dl className="mt-5 flex flex-wrap gap-x-8 gap-y-4">
        <div>
          <dt className="text-small text-muted-foreground">Seats</dt>
          <dd
            className={cn(
              "text-lg font-semibold tabular-nums",
              program.seats === null ? "text-muted-foreground" : "text-foreground"
            )}
          >
            {program.seats === null ? "Not published" : program.seats}
          </dd>
          {program.seatsNote && (
            <p className="mt-0.5 max-w-[14rem] text-small text-muted-foreground">
              {program.seatsNote}
            </p>
          )}
        </div>
        <div>
          <dt className="text-small text-muted-foreground">Supplementary app</dt>
          <dd className="text-lg font-semibold text-foreground">
            {program.suppApp.required ? "Required" : "Not required"}
          </dd>
        </div>
        {program.applicants && (
          <div className="max-w-[16rem]">
            <dt className="text-small text-muted-foreground">Applicants</dt>
            <dd className="text-lg font-semibold text-foreground">
              {program.applicants.figure}
              {program.applicants.source === "community" && (
                <span className="ml-1.5 align-middle text-small font-normal text-silver-dark">
                  self-reported
                </span>
              )}
            </dd>
            {program.applicants.note && (
              <p className="mt-0.5 text-small text-muted-foreground">{program.applicants.note}</p>
            )}
          </div>
        )}
      </dl>

      <div className="mt-5">
        {program.ouacCodes.length === 1 ? (
          <p className="text-small text-muted-foreground">
            OUAC code{" "}
            <span className="font-mono text-foreground">{program.ouacCodes[0].code}</span>
            {" — "}
            {program.ouacCodes[0].label}
          </p>
        ) : (
          <details className="text-small text-muted-foreground">
            <summary className="cursor-pointer font-medium text-foreground select-none">
              {program.ouacCodes.length} OUAC codes
            </summary>
            <ul className="mt-2 space-y-1.5">
              {program.ouacCodes.map((code) => (
                <li
                  key={code.code}
                  className="flex items-baseline justify-between gap-3 border-t border-border/60 pt-1.5"
                >
                  <span className="shrink-0 font-mono text-foreground">{code.code}</span>
                  <span className="text-right">{code.label}</span>
                </li>
              ))}
            </ul>
          </details>
        )}
        {program.codeNote && (
          <p className="mt-1.5 text-small text-muted-foreground">{program.codeNote}</p>
        )}
      </div>
    </header>
  );
}

function TimelineSection({ timeline }: { timeline: TimelineEntry[] }) {
  return (
    <section className="border-b border-border py-6">
      <h2 className="text-h3 font-semibold tracking-tight text-foreground">
        Timeline &amp; deadlines
      </h2>
      <ol className="mt-5 border-l border-border pl-5">
        {timeline.map((entry, index) => (
          <li
            key={index}
            className={cn("relative pb-5 last:pb-0", "before:absolute before:-left-[1.5rem] before:top-1 before:size-2.5 before:rounded-full before:ring-4 before:ring-background", entry.critical ? "before:bg-silver-light" : "before:bg-silver-dark")}
          >
            <div className="flex flex-wrap items-center gap-2">
              {entry.confirmed && entry.date ? (
                <span className="font-mono text-body font-semibold tabular-nums text-foreground">
                  {formatDate(entry.date)}
                </span>
              ) : (
                <span className="rounded-full border border-silver/50 px-2 py-0.5 text-small font-medium text-silver-light">
                  Not yet published
                </span>
              )}
              {entry.critical && (
                <span className="text-small font-semibold tracking-wide text-silver-light uppercase">
                  Critical
                </span>
              )}
            </div>
            <p
              className={cn(
                "mt-1 text-body",
                entry.critical ? "font-medium text-foreground" : "text-muted-foreground"
              )}
            >
              {entry.label}
            </p>
          </li>
        ))}
      </ol>
    </section>
  );
}

function YearThreeEntrySection({ yearThreeEntry }: { yearThreeEntry: YearThreeEntry }) {
  return (
    <section className="border-b border-border py-6">
      <h2 className="text-h3 font-semibold tracking-tight text-foreground">
        {yearThreeEntry.title}
      </h2>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[480px] border-collapse text-left">
          <caption className="sr-only">Routes into year three</caption>
          <thead>
            <tr className="border-b border-border">
              <th scope="col" className="py-2 pr-4 text-small font-medium text-muted-foreground">
                Route
              </th>
              <th scope="col" className="py-2 pr-4 text-small font-medium text-muted-foreground">
                Requirement
              </th>
              <th scope="col" className="py-2 text-small font-medium text-muted-foreground">
                Outcome
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {yearThreeEntry.routes.map((route, index) => (
              <tr key={index}>
                <td className="py-2.5 pr-4 align-top text-body font-medium text-foreground">
                  {route.name}
                </td>
                <td className="py-2.5 pr-4 align-top text-body text-foreground">
                  {route.requirement}
                </td>
                <td className="py-2.5 align-top text-body text-foreground">{route.outcome}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-small text-muted-foreground">{yearThreeEntry.moduleFilter}</p>
    </section>
  );
}

function PostSystemSection({ postSystem }: { postSystem: PostSystem }) {
  return (
    <section className="border-b border-border py-6">
      <h2 className="text-h3 font-semibold tracking-tight text-foreground">{postSystem.title}</h2>
      <p className="mt-3 text-body text-foreground">{postSystem.body}</p>
      {postSystem.types && postSystem.types.length > 0 && (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[360px] border-collapse text-left">
            <caption className="sr-only">Program types</caption>
            <thead>
              <tr className="border-b border-border">
                <th scope="col" className="py-2 pr-4 text-small font-medium text-muted-foreground">
                  Name
                </th>
                <th scope="col" className="py-2 text-small font-medium text-muted-foreground">
                  Requirement
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {postSystem.types.map((type, index) => (
                <tr key={index}>
                  <td className="py-2.5 pr-4 align-top text-body font-medium text-foreground">
                    {type.name}
                  </td>
                  <td className="py-2.5 align-top text-body text-foreground">
                    {type.requirement}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {postSystem.mechanics && (
        <p className="mt-3 text-small text-muted-foreground">{postSystem.mechanics}</p>
      )}
    </section>
  );
}

function RulesSection({ rules }: { rules: string[] }) {
  return (
    <section className="border-b border-border py-6">
      <h2 className="text-h3 font-semibold tracking-tight text-foreground">
        Application rules
      </h2>
      <ul className="mt-3 space-y-2">
        {rules.map((rule, index) => (
          <li key={index} className="flex gap-2.5 text-body text-foreground">
            <span aria-hidden className="mt-2.5 size-1 shrink-0 rounded-full bg-silver" />
            <span>{rule}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function SuppAppSection({ program }: { program: Program }) {
  const suppApp = program.suppApp;
  if (!suppApp.required) {
    return (
      <section className="border-b border-border py-6">
        <h2 className="text-h3 font-semibold tracking-tight text-foreground">
          Supplementary application
        </h2>
        <p className="mt-3 text-body font-medium text-foreground">No supplementary application.</p>
        <p className="mt-1 text-small text-muted-foreground">{suppApp.note}</p>
      </section>
    );
  }

  const questionGroups: { title: string; items?: SuppAppComponent[] }[] = [
    { title: "Components", items: suppApp.components },
    { title: "Known in advance", items: suppApp.known },
    { title: "Drawn at random", items: suppApp.random },
  ].filter((group) => (group.items?.length ?? 0) > 0);

  return (
    <section className="border-b border-border py-6">
      <h2 className="text-h3 font-semibold tracking-tight text-foreground">
        Supplementary application
      </h2>

      {(suppApp.formatUnconfirmed || suppApp.formatWarning) && (
        <div className="mt-3 rounded-md border border-silver-light/50 px-3 py-2.5">
          <p className="text-small font-semibold tracking-wide text-silver-light uppercase">
            Format not yet confirmed
          </p>
          {suppApp.formatWarning && (
            <p className="mt-1 text-small text-foreground">{suppApp.formatWarning}</p>
          )}
        </div>
      )}

      <p className="mt-3 text-body text-foreground">{suppApp.format}</p>
      {suppApp.note && <p className="mt-2 text-small text-muted-foreground">{suppApp.note}</p>}
      {suppApp.sitting && (
        <p className="mt-1 text-small text-muted-foreground">{suppApp.sitting}</p>
      )}

      <dl className="mt-4 space-y-3">
        <div className="sm:flex sm:gap-4">
          <dt className="text-small text-muted-foreground sm:w-28 sm:shrink-0">Platform</dt>
          <dd className="text-body text-foreground">{suppApp.platform}</dd>
        </div>
        {suppApp.limit && (
          <div className="sm:flex sm:gap-4">
            <dt className="text-small text-muted-foreground sm:w-28 sm:shrink-0">Limit</dt>
            <dd className="text-body text-foreground">{suppApp.limit}</dd>
          </div>
        )}
        {suppApp.evaluators && (
          <div className="sm:flex sm:gap-4">
            <dt className="text-small text-muted-foreground sm:w-28 sm:shrink-0">Evaluators</dt>
            <dd className="text-body text-foreground">{suppApp.evaluators}</dd>
          </div>
        )}
      </dl>

      {questionGroups.length > 0 && (
        <div className="mt-5">
          <h3 className="text-small font-semibold tracking-wide text-muted-foreground uppercase">
            Questions
          </h3>
          <div className="mt-3 space-y-4">
            {questionGroups.map((group) => (
              <div key={group.title}>
                {questionGroups.length > 1 && (
                  <p className="mb-2 text-small font-medium text-foreground">{group.title}</p>
                )}
                <ul className="space-y-2">
                  {group.items!.map((item, index) => (
                    <li key={index} className="rounded-md border border-border/60 p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <Badge
                          variant="outline"
                          className="border-silver/50 text-muted-foreground capitalize"
                        >
                          {item.type}
                        </Badge>
                        {item.limit && (
                          <span className="text-small text-muted-foreground">{item.limit}</span>
                        )}
                      </div>
                      <p className="mt-2 text-body text-foreground">{item.prompt}</p>
                      {item.time && (
                        <p className="mt-1 text-small text-muted-foreground">{item.time}</p>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          {suppApp.questionsNote && (
            <p className="mt-3 text-small text-muted-foreground">{suppApp.questionsNote}</p>
          )}
          {suppApp.structureNote && (
            <p className="mt-2 text-small text-muted-foreground">{suppApp.structureNote}</p>
          )}
        </div>
      )}

      {suppApp.questions && suppApp.questions.length > 0 && (
        <div className="mt-5">
          <h3 className="text-small font-semibold tracking-wide text-muted-foreground uppercase">
            Published questions
          </h3>
          <ol className="mt-3 list-decimal space-y-2 pl-5 marker:text-muted-foreground">
            {suppApp.questions.map((question, index) => (
              <li key={index} className="text-body text-foreground">
                {question}
              </li>
            ))}
          </ol>
          {suppApp.questionsNote && (
            <p className="mt-3 text-small text-muted-foreground">{suppApp.questionsNote}</p>
          )}
        </div>
      )}

      {suppApp.competencies && suppApp.competencies.length > 0 && (
        <div className="mt-4">
          <p className="text-small text-muted-foreground">Assessed on</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {suppApp.competencies.map((competency) => (
              <Badge key={competency} variant="secondary">
                {competency}
              </Badge>
            ))}
          </div>
        </div>
      )}

      <div className="mt-5 border-t border-border pt-4">
        <h3 className="text-small font-semibold tracking-wide text-muted-foreground uppercase">
          Deadline
        </h3>
        {suppApp.deadline.confirmed && suppApp.deadline.date ? (
          <span className="mt-2 inline-block font-mono text-body font-semibold text-foreground">
            {formatDate(suppApp.deadline.date)}
          </span>
        ) : (
          <span className="mt-2 inline-block rounded-full border border-silver/50 px-2 py-0.5 text-small font-medium text-silver-light">
            Not yet published
          </span>
        )}
        <p className="mt-1 text-small text-muted-foreground">{suppApp.deadline.text}</p>
        {suppApp.deadline.estimate && (
          <p className="mt-2 rounded-md border border-border/60 px-2.5 py-1.5 text-small text-muted-foreground">
            <span className="font-medium text-foreground">Estimate: </span>
            {suppApp.deadline.estimate}
          </p>
        )}
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3">
        <div>
          <dt className="text-small text-muted-foreground">Fee</dt>
          <dd
            className={cn(
              "text-body font-medium",
              suppApp.fee === null ? "text-muted-foreground" : "text-foreground"
            )}
          >
            {suppApp.fee === null ? "Not published" : suppApp.fee}
          </dd>
          {suppApp.feeNote && (
            <p className="mt-0.5 text-small text-muted-foreground">{suppApp.feeNote}</p>
          )}
        </div>
        <div>
          <dt className="text-small text-muted-foreground">Questions published in advance</dt>
          <dd className="text-body font-medium text-foreground">
            {suppApp.questionsPublishedInAdvance === "partial"
              ? "Partially"
              : suppApp.questionsPublishedInAdvance
                ? "Yes"
                : "No"}
          </dd>
        </div>
      </dl>

      <div className="mt-4">
        <dt className="text-small text-muted-foreground">Rubric published</dt>
        <dd className="mt-0.5 text-body font-medium text-foreground">
          {suppApp.rubricPublished ? "Yes" : "No"}
        </dd>
        {suppApp.rubricNote && (
          <p className="mt-1 text-small text-muted-foreground">{suppApp.rubricNote}</p>
        )}
      </div>

      {suppApp.rubric && <RubricDetail rubric={suppApp.rubric} />}

      {suppApp.invite && (
        <p className="mt-4 text-small text-muted-foreground">{suppApp.invite}</p>
      )}

      {suppApp.mismatch && (
        <div className="mt-5 rounded-md border border-silver-light/50 px-3 py-2.5">
          <p className="text-small font-semibold tracking-wide text-silver-light uppercase">
            Mismatch
          </p>
          <p className="mt-1 text-body text-foreground">{suppApp.mismatch}</p>
        </div>
      )}

      <div className="mt-5 border-t border-border pt-4">
        <h3 className="text-small font-semibold tracking-wide text-muted-foreground uppercase">
          Weighting
        </h3>
        <p className="mt-2 text-body text-foreground">{suppApp.weighting.summary}</p>
        {suppApp.weighting.formula && (
          <p className="mt-2 rounded-md border border-border/60 px-2.5 py-1.5 font-mono text-small text-foreground">
            {suppApp.weighting.formula}
          </p>
        )}
        {suppApp.weighting.notPublished && suppApp.weighting.notPublished.length > 0 && (
          <ul className="mt-2 space-y-1">
            {suppApp.weighting.notPublished.map((item, index) => (
              <li key={index} className="text-small text-muted-foreground">
                Not published: {item}
              </li>
            ))}
          </ul>
        )}
        {suppApp.weighting.note && (
          <p className="mt-2 text-small text-muted-foreground">{suppApp.weighting.note}</p>
        )}
        {suppApp.weighting.communityInterpretation && (
          <p className="mt-2 text-small text-muted-foreground">
            <span className="font-medium text-silver-dark">
              Community interpretation, unofficial:{" "}
            </span>
            {suppApp.weighting.communityInterpretation}
          </p>
        )}
        {suppApp.weighting.official ? (
          <p className="mt-2 text-small text-muted-foreground">Officially published.</p>
        ) : (
          <span className="mt-2 inline-block rounded-full border border-silver/50 px-2 py-0.5 text-small font-medium text-silver-light">
            Not officially published
          </span>
        )}
        {suppApp.weighting.clusters && suppApp.weighting.clusters.length > 0 && (
          <>
            <ClusterScatterChart program={program} />
            <WeightingClusters clusters={suppApp.weighting.clusters} />
          </>
        )}
      </div>
    </section>
  );
}

function RubricDetail({ rubric }: { rubric: SuppAppRubric }) {
  return (
    <div className="mt-5 border-t border-border pt-4">
      <h3 className="text-small font-semibold tracking-wide text-muted-foreground uppercase">
        Rubric
      </h3>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {rubric.bands.map((band) => (
          <Badge key={band} variant="outline" className="border-border text-muted-foreground">
            {band}
          </Badge>
        ))}
      </div>
      <div className="mt-3 grid gap-4 sm:grid-cols-2">
        <div>
          <p className="text-small font-medium text-foreground">Written criteria</p>
          <ul className="mt-1.5 space-y-1.5">
            {rubric.written.map((criterion, index) => (
              <li key={index} className="text-small text-muted-foreground">
                {criterion}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-small font-medium text-foreground">Video criteria</p>
          <ul className="mt-1.5 space-y-1.5">
            {rubric.video.map((criterion, index) => (
              <li key={index} className="text-small text-muted-foreground">
                {criterion}
              </li>
            ))}
          </ul>
        </div>
      </div>
      <p className="mt-3 rounded-md border border-silver-light/40 px-3 py-2 text-small text-foreground">
        <span className="font-medium">Key insight: </span>
        {rubric.keyInsight}
      </p>
      <p className="mt-2 text-small text-muted-foreground">Not scored: {rubric.notScored}</p>
    </div>
  );
}

function WeightingClusters({ clusters }: { clusters: SuppAppWeightingCluster[] }) {
  return (
    <div className="mt-4">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[420px] border-collapse text-left">
          <caption className="sr-only">Supp app score against GPA against outcome</caption>
          <thead>
            <tr className="border-b border-border">
              <th scope="col" className="py-2 pr-3 text-small font-medium text-muted-foreground">
                Supp app score
              </th>
              <th scope="col" className="py-2 pr-3 text-small font-medium text-muted-foreground">
                GPA
              </th>
              <th scope="col" className="py-2 pr-3 text-small font-medium text-muted-foreground">
                Outcome
              </th>
              <th scope="col" className="py-2 text-small font-medium text-muted-foreground">
                Count
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {clusters.map((cluster, index) => (
              <tr key={index}>
                <td className="py-2 pr-3 font-mono text-small text-foreground">
                  {cluster.suppAppScore}
                </td>
                <td className="py-2 pr-3 text-small text-foreground">{cluster.gpa}</td>
                <td className="py-2 pr-3 text-small">
                  {cluster.outcome === "Offer" ? (
                    <span className="font-semibold text-foreground">{cluster.outcome}</span>
                  ) : (
                    <span className="text-muted-foreground">{cluster.outcome}</span>
                  )}
                </td>
                <td className="py-2 text-small text-foreground">
                  {cluster.count === null ? (
                    <span className="text-muted-foreground">Not published</span>
                  ) : (
                    cluster.count
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CourseChip({ course, muted }: { course: string; muted?: boolean }) {
  return (
    <li
      className={cn(
        "rounded-md border px-2.5 py-1 text-small",
        course.length <= 10 && "font-mono",
        muted ? "border-border/60 text-muted-foreground" : "border-border text-foreground"
      )}
    >
      {course}
    </li>
  );
}

function CoursesSection({ courses }: { courses: Courses }) {
  return (
    <section className="border-b border-border py-6">
      <h2 className="text-h3 font-semibold tracking-tight text-foreground">Required courses</h2>
      <p className="mt-2 text-small text-muted-foreground">{courses.total}</p>
      {courses.required.length > 0 && (
        <div className="mt-4">
          <p className="text-small font-medium text-foreground">Required</p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {courses.required.map((course, index) => (
              <CourseChip key={index} course={course} />
            ))}
          </ul>
        </div>
      )}
      {courses.recommended.length > 0 && (
        <div className="mt-4">
          <p className="text-small font-medium text-foreground">Recommended</p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {courses.recommended.map((course, index) => (
              <CourseChip key={index} course={course} muted />
            ))}
          </ul>
        </div>
      )}
      {courses.notes && <p className="mt-3 text-small text-muted-foreground">{courses.notes}</p>}
    </section>
  );
}

function AveragesSection({ averages }: { averages: AverageEntry[] }) {
  const official = averages.filter((average) => average.type === "official");
  const community = averages.filter((average) => average.type === "community");

  return (
    <section className="border-b border-border py-6">
      <h2 className="text-h3 font-semibold tracking-tight text-foreground">Averages</h2>
      {official.length > 0 && (
        <ul className="mt-4 space-y-4">
          {official.map((average, index) => (
            <li key={index}>
              <p className="text-small text-muted-foreground">{average.source}</p>
              <p className="text-xl font-semibold tracking-tight text-foreground">
                {average.figure}
              </p>
              {average.note && (
                <p className="mt-0.5 text-small text-muted-foreground">{average.note}</p>
              )}
            </li>
          ))}
        </ul>
      )}
      {community.length > 0 && (
        <div className="mt-5 border-t border-border/60 pt-4">
          <p className="text-small font-medium tracking-wide text-silver-dark uppercase">
            Community-reported
          </p>
          <ul className="mt-2 space-y-3">
            {community.map((average, index) => (
              <li key={index}>
                <p className="text-small text-muted-foreground">
                  <span className="text-foreground">{average.source}:</span> {average.figure}
                </p>
                <p className="mt-0.5 text-small text-silver-dark">
                  {average.note ?? "Self-reported, skews high."}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function TrapsSection({ traps }: { traps: Trap[] }) {
  return (
    <section className="border-b border-border py-6">
      <h2 className="text-h3 font-semibold tracking-tight text-foreground">Traps</h2>
      <ul className="mt-4 space-y-4">
        {traps.map((trap, index) => (
          <li key={index} className="rounded-lg border border-silver-light/40 p-4">
            <p className="text-body font-semibold text-foreground">{trap.title}</p>
            <p className="mt-1.5 text-body text-muted-foreground">{trap.body}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

function SourcesSection({ sources, verifiedOn }: { sources: Sources; verifiedOn: string }) {
  return (
    <section className="py-6">
      <h2 className="text-h3 font-semibold tracking-tight text-foreground">Sources</h2>
      {sources.official.length > 0 && (
        <div className="mt-3">
          <p className="text-small font-medium text-muted-foreground">Official</p>
          <ul className="mt-1.5 space-y-1">
            {sources.official.map((source, index) => (
              <li key={index} className="text-small text-muted-foreground">
                {source}
              </li>
            ))}
          </ul>
        </div>
      )}
      {sources.reported.length > 0 && (
        <div className="mt-3">
          <p className="text-small font-medium text-muted-foreground">Reported</p>
          <ul className="mt-1.5 space-y-1">
            {sources.reported.map((source, index) => (
              <li key={index} className="text-small text-muted-foreground">
                {source}
              </li>
            ))}
          </ul>
        </div>
      )}
      <p className="mt-4 text-small text-silver-dark">Verified on {verifiedOn}</p>
    </section>
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
