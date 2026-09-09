import { notFound } from "next/navigation";

import { GenericDetails, hasDetails } from "@/components/programs/generic-details";
import {
  getAllPrograms,
  getCategoryLabel,
  getGatekeepingDescription,
  getProgramById,
  getSchoolSlug,
} from "@/lib/programs";
import type {
  AverageEntry,
  Courses,
  GatekeepingModel,
  Program,
  Sources,
  SuppApp,
  PostSystem,
  SuppAppComponent,
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
    <main className="mx-auto max-w-2xl p-6">
      <ProgramHeader program={program} />
      <TimelineSection timeline={program.timeline} />
      {program.yearThreeEntry && (
        <YearThreeEntrySection yearThreeEntry={program.yearThreeEntry} />
      )}
      {program.postSystem && <PostSystemSection postSystem={program.postSystem} />}
      {program.rules && program.rules.length > 0 && (
        <RulesSection rules={program.rules} />
      )}
      <SuppAppSection suppApp={program.suppApp} />
      <CoursesSection courses={program.courses} />
      <AveragesSection averages={program.averages} />
      <TrapsSection traps={program.traps} />
      {program.prep && (
        <section className="mb-6">
          <h2>Prep</h2>
          <p>Shape: {program.prep.shape}</p>
          <p>Time: {program.prep.time}</p>
          <p>{program.prep.note}</p>
        </section>
      )}
      {hasDetails(additionalDetails) && (
        <section className="mb-6">
          <h2>Additional details</h2>
          <GenericDetails data={additionalDetails} />
        </section>
      )}
      <SourcesSection sources={program.sources} verifiedOn={program.verifiedOn} />
    </main>
  );
}

function ProgramHeader({ program }: { program: Program }) {
  return (
    <header className="mb-6">
      <h1>{program.name}</h1>
      <p>
        {program.school}, {program.campus}
      </p>
      <p>Category: {getCategoryLabel(program.category) ?? program.category}</p>
      <p>
        Gatekeeping model: {GATEKEEPING_LABELS[program.gatekeeping]} —{" "}
        {getGatekeepingDescription(program.gatekeeping)}
      </p>
      <p>
        Seats: {program.seats === null ? "Not published" : program.seats}
        {program.seatsNote && <> — {program.seatsNote}</>}
      </p>
      {program.applicants && (
        <p>
          Applicants: {program.applicants.figure} (
          {program.applicants.source === "community"
            ? "community-reported, skews high"
            : "official"}
          ){program.applicants.note && <> — {program.applicants.note}</>}
        </p>
      )}
      {program.ouacCodes.length === 1 ? (
        <p>OUAC code: {program.ouacCodes[0].code}</p>
      ) : (
        <>
          <p>OUAC codes:</p>
          <ul>
            {program.ouacCodes.map((code) => (
              <li key={code.code}>
                {code.code} — {code.label}
              </li>
            ))}
          </ul>
        </>
      )}
      {program.codeNote && <p>{program.codeNote}</p>}
    </header>
  );
}

function TimelineSection({ timeline }: { timeline: TimelineEntry[] }) {
  return (
    <section className="mb-6">
      <h2>Timeline and deadlines</h2>
      <ul>
        {timeline.map((entry, index) => (
          <li key={index}>
            <p>{entry.label}</p>
            <p>{entry.confirmed && entry.date ? entry.date : "Not yet published"}</p>
            {entry.critical && <p>Critical deadline</p>}
          </li>
        ))}
      </ul>
    </section>
  );
}

function YearThreeEntrySection({ yearThreeEntry }: { yearThreeEntry: YearThreeEntry }) {
  return (
    <section className="mb-6">
      <h2>{yearThreeEntry.title}</h2>
      <table>
        <caption>Routes into year three</caption>
        <thead>
          <tr>
            <th scope="col">Route</th>
            <th scope="col">Requirement</th>
            <th scope="col">Outcome</th>
          </tr>
        </thead>
        <tbody>
          {yearThreeEntry.routes.map((route, index) => (
            <tr key={index}>
              <td>{route.name}</td>
              <td>{route.requirement}</td>
              <td>{route.outcome}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p>{yearThreeEntry.moduleFilter}</p>
    </section>
  );
}

function PostSystemSection({ postSystem }: { postSystem: PostSystem }) {
  return (
    <section className="mb-6">
      <h2>{postSystem.title}</h2>
      <p>{postSystem.body}</p>
      {postSystem.types && postSystem.types.length > 0 && (
        <table>
          <caption>Program types</caption>
          <thead>
            <tr>
              <th scope="col">Name</th>
              <th scope="col">Requirement</th>
            </tr>
          </thead>
          <tbody>
            {postSystem.types.map((type, index) => (
              <tr key={index}>
                <td>{type.name}</td>
                <td>{type.requirement}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {postSystem.mechanics && <p>{postSystem.mechanics}</p>}
    </section>
  );
}

function RulesSection({ rules }: { rules: string[] }) {
  return (
    <section className="mb-6">
      <h2>Application rules</h2>
      <ul>
        {rules.map((rule, index) => (
          <li key={index}>{rule}</li>
        ))}
      </ul>
    </section>
  );
}

function SuppAppSection({ suppApp }: { suppApp: SuppApp }) {
  if (!suppApp.required) {
    return (
      <section className="mb-6">
        <h2>Supplementary application</h2>
        <p>No supplementary application.</p>
        <p>{suppApp.note}</p>
      </section>
    );
  }

  const questionGroups: { title: string; items?: SuppAppComponent[] }[] = [
    { title: "Components", items: suppApp.components },
    { title: "Known in advance", items: suppApp.known },
    { title: "Drawn at random", items: suppApp.random },
  ];

  return (
    <section className="mb-6">
      <h2>Supplementary application</h2>
      {suppApp.formatWarning && <p>{suppApp.formatWarning}</p>}
      {suppApp.formatUnconfirmed && <p>Unconfirmed for this cycle.</p>}
      <p>A supplementary application is required.</p>
      <p>Platform: {suppApp.platform}</p>
      <p>Format: {suppApp.format}</p>
      {suppApp.note && <p>{suppApp.note}</p>}
      {suppApp.limit && <p>Limit: {suppApp.limit}</p>}
      {suppApp.evaluators && <p>Evaluators: {suppApp.evaluators}</p>}

      {questionGroups.some((group) => (group.items?.length ?? 0) > 0) && (
        <div>
          <h3>Questions</h3>
          {questionGroups.map(
            (group) =>
              group.items &&
              group.items.length > 0 && (
                <div key={group.title}>
                  <h4>{group.title}</h4>
                  <ul>
                    {group.items.map((item, index) => (
                      <li key={index}>
                        <p>Type: {item.type}</p>
                        <p>{item.prompt}</p>
                        {item.limit && <p>Limit: {item.limit}</p>}
                        {item.time && <p>Time: {item.time}</p>}
                      </li>
                    ))}
                  </ul>
                </div>
              )
          )}
        </div>
      )}

      <div>
        <h3>Deadline</h3>
        <p>
          {suppApp.deadline.confirmed ? `Date: ${suppApp.deadline.date}` : "Not yet published"}
        </p>
        <p>{suppApp.deadline.text}</p>
        {suppApp.deadline.estimate && <p>Estimate: {suppApp.deadline.estimate}</p>}
      </div>

      <p>Fee: {suppApp.fee === null ? "Not published" : suppApp.fee}</p>

      <p>
        Questions published in advance:{" "}
        {suppApp.questionsPublishedInAdvance === "partial"
          ? "Partially"
          : suppApp.questionsPublishedInAdvance
            ? "Yes"
            : "No"}
      </p>

      <p>Rubric published: {suppApp.rubricPublished ? "Yes" : "No"}</p>
      {suppApp.rubricNote && <p>{suppApp.rubricNote}</p>}

      {suppApp.mismatch && (
        <div>
          <h3>Mismatch</h3>
          <p>{suppApp.mismatch}</p>
        </div>
      )}

      <div>
        <h3>Weighting</h3>
        <p>{suppApp.weighting.summary}</p>
        {suppApp.weighting.note && <p>{suppApp.weighting.note}</p>}
        {suppApp.weighting.official && <p>Officially published.</p>}
        {suppApp.weighting.clusters && suppApp.weighting.clusters.length > 0 && (
          <WeightingClusters
            keyLine={suppApp.weighting.keyLine}
            clusters={suppApp.weighting.clusters}
            clustersSource={suppApp.weighting.clustersSource}
          />
        )}
      </div>
    </section>
  );
}

function WeightingClusters({
  keyLine,
  clusters,
  clustersSource,
}: {
  keyLine?: string;
  clusters: SuppAppWeightingCluster[];
  clustersSource?: string;
}) {
  return (
    <div>
      {keyLine && (
        <p>
          <strong>{keyLine}</strong>
        </p>
      )}
      <table>
        <caption>Supp app score against GPA against outcome</caption>
        <thead>
          <tr>
            <th scope="col">Supp app score</th>
            <th scope="col">GPA</th>
            <th scope="col">Outcome</th>
            <th scope="col">Count</th>
          </tr>
        </thead>
        <tbody>
          {clusters.map((cluster, index) => (
            <tr key={index}>
              <td>{cluster.suppAppScore}</td>
              <td>{cluster.gpa}</td>
              <td>
                {cluster.outcome === "Offer" ? <strong>{cluster.outcome}</strong> : cluster.outcome}
              </td>
              <td>{cluster.count === null ? "Not published" : cluster.count}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {clustersSource && <p>Source: {clustersSource}</p>}
    </div>
  );
}

function CoursesSection({ courses }: { courses: Courses }) {
  return (
    <section className="mb-6">
      <h2>Required courses</h2>
      <p>Total: {courses.total}</p>
      {courses.required.length > 0 && (
        <div>
          <h3>Required</h3>
          <ul>
            {courses.required.map((course, index) => (
              <li key={index}>{course}</li>
            ))}
          </ul>
        </div>
      )}
      {courses.recommended.length > 0 && (
        <div>
          <h3>Recommended</h3>
          <ul>
            {courses.recommended.map((course, index) => (
              <li key={index}>{course}</li>
            ))}
          </ul>
        </div>
      )}
      {courses.notes && <p>{courses.notes}</p>}
    </section>
  );
}

function AveragesSection({ averages }: { averages: AverageEntry[] }) {
  const official = averages.filter((average) => average.type === "official");
  const community = averages.filter((average) => average.type === "community");

  return (
    <section className="mb-6">
      <h2>Averages</h2>
      {official.length > 0 && (
        <div>
          <h3>Official</h3>
          <ul>
            {official.map((average, index) => (
              <li key={index}>
                <p>
                  {average.source}: {average.figure}
                </p>
                {average.note && <p>{average.note}</p>}
              </li>
            ))}
          </ul>
        </div>
      )}
      {community.length > 0 && (
        <div>
          <h3>Community-reported (self-reported, skews high)</h3>
          <ul>
            {community.map((average, index) => (
              <li key={index}>
                <p>
                  {average.source}: {average.figure}
                </p>
                {average.note && <p>{average.note}</p>}
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
    <section className="mb-6">
      <h2>Traps</h2>
      <ul>
        {traps.map((trap, index) => (
          <li key={index}>
            <p>
              <strong>{trap.title}</strong>
            </p>
            <p>{trap.body}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

function SourcesSection({ sources, verifiedOn }: { sources: Sources; verifiedOn: string }) {
  return (
    <section className="mb-6">
      <h2>Sources</h2>
      {sources.official.length > 0 && (
        <div>
          <h3>Official</h3>
          <ul>
            {sources.official.map((source, index) => (
              <li key={index}>{source}</li>
            ))}
          </ul>
        </div>
      )}
      {sources.reported.length > 0 && (
        <div>
          <h3>Reported</h3>
          <ul>
            {sources.reported.map((source, index) => (
              <li key={index}>{source}</li>
            ))}
          </ul>
        </div>
      )}
      <p>Verified on: {verifiedOn}</p>
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
