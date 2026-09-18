import type { Metadata } from "next";
import Link from "next/link";

import { SourceList } from "@/components/claim";
import { Card } from "@/components/ui/card";
import { Pill } from "@/components/ui/pill";
import { Reveal } from "@/components/ui/reveal";
import { SectionHeader } from "@/components/ui/section-header";
import {
  getContradictions,
  getContradictionTypeLabel,
  getProgramById,
  getVerificationDate,
} from "@/lib/data";
import { cn } from "@/lib/utils";
import type { Contradiction, ContradictionType } from "@/types/schema";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "What universities get wrong",
  description:
    "Official Ontario admissions pages that contradict each other or still show an earlier cycle — each disagreement attributed to its source, with what to do about it.",
  alternates: { canonical: "/data-check" },
};

/**
 * The page that justifies the site.
 *
 * SCOPE: three contradiction types, 30 records. This is deliberately narrower
 * than the 46 in the data, and it should not be widened without a reason:
 *
 *   official_stale_page   (7)  an official page still shows an earlier cycle
 *   official_vs_official  (18) two live official sources disagree
 *   official_internal     (5)  one official page disagrees with itself
 *
 * Excluded on purpose. official_vs_community (8) and community_disagreement
 * (2) are community figures being unreliable, which the claim labels already
 * handle, and secondary_vs_official (1) is press. None of those are a
 * university getting something wrong.
 *
 * document_internal (5) is the important exclusion: those are the source
 * document contradicting itself — the project's own PDF saying one thing on
 * page 117 and another on page 126. Listing them under a heading that says
 * "what universities get wrong" would blame universities for this project's
 * inconsistency.
 *
 * NEVER RESOLVED HERE. status "unresolved" means nobody knows which source is
 * right. Both sides are shown and attributed, and where the data carries no
 * `guidance` the page says so rather than inventing an answer.
 *
 * NEVER RENDERED: pdf_block_ids, log_ids, related_block_ids, guidance_block_ids
 * (all emptied at the data layer), and pdf_note / verification_note /
 * corrections_note, which are notes about the source document and the
 * verification pass rather than anything a student should read.
 */
const IN_SCOPE: ContradictionType[] = [
  "official_stale_page",
  "official_vs_official",
  "official_internal",
];

/**
 * Records demoted to the collapsed "Minor discrepancies" section at the bottom.
 *
 * Both are fee amounts that differ by about a dollar:
 *
 *   K13  U of T Engineering assessment fee — $43.86 (U of T) vs $45 (OUAC)
 *   K14  Rotman Commerce supplemental fee — $52 (Rotman, OUAC) vs $51 (OUInfo)
 *
 * They are real disagreements between official sources and they stay on the
 * page and in the counts. They are moved out of the main sections because the
 * other 28 entries are wrong OUAC codes, wrong deadlines and
 * required-versus-recommended courses — things that change what a student does
 * — and a dollar does not. Sitting alongside those, these two dilute the page.
 *
 * This is an explicit id list ON PURPOSE. Matching on "fee" or on a dollar sign
 * would also bury a future fee contradiction with a gap that actually matters,
 * silently and with nothing to notice. A new record is shown in the main
 * sections until a human decides otherwise and adds its id here.
 */
const DEMOTED_AS_IMMATERIAL = ["K13", "K14"];

/** Headings in the order they are shown. Stale pages lead: they are the clearest case. */
const GROUPS: { type: ContradictionType; title: string }[] = [
  { type: "official_stale_page", title: "Pages still showing an earlier cycle" },
  { type: "official_vs_official", title: "Two official sources disagree" },
  { type: "official_internal", title: "One page disagrees with itself" },
];

export default function DataCheckPage() {
  const all = getContradictions().filter((entry) => IN_SCOPE.includes(entry.type));
  const unresolved = all.filter((entry) => entry.status === "unresolved").length;
  const withGuidance = all.filter((entry) => entry.guidance).length;

  // The counts above cover every in-scope record, demoted ones included: they
  // are still on the page, just further down it.
  const demoted = all.filter((entry) => DEMOTED_AS_IMMATERIAL.includes(entry.id));
  const primary = all.filter((entry) => !DEMOTED_AS_IMMATERIAL.includes(entry.id));

  const groups = GROUPS.map((group) => ({
    ...group,
    records: primary.filter((entry) => entry.type === group.type),
  })).filter((group) => group.records.length > 0);

  return (
    <main className="shell pt-[var(--rhythm-section)] pb-[var(--rhythm-section)] motion-safe:animate-fade-rise-sm">
      <SectionHeader level={1} label="Data check" title="What universities get wrong" />
      <p className="measure mt-6 text-body text-muted-foreground">
        Every date and code on this site is checked against the university&apos;s own
        admissions page. When two official pages disagree, or one still shows last
        year&apos;s cycle, it is logged here rather than quietly worked around.
      </p>
      <p className="measure mt-4 text-body text-muted-foreground">
        Both sides of each disagreement are shown and attributed. Where nobody can
        say which source is right, the page says that instead of picking one.
      </p>

      <dl className="mt-10 flex flex-wrap gap-x-12 gap-y-6 border-y border-line-strong py-6">
        <div>
          <dt className="text-label label-mono text-silver">Disagreements logged</dt>
          <dd className="data mt-2 text-metric text-foreground">{all.length}</dd>
        </div>
        <div>
          <dt className="text-label label-mono text-silver">Still unresolved</dt>
          <dd className="data mt-2 text-h3 font-semibold text-foreground">{unresolved}</dd>
        </div>
        <div>
          <dt className="text-label label-mono text-silver">With a recommendation</dt>
          <dd className="data mt-2 text-h3 font-semibold text-foreground">{withGuidance}</dd>
        </div>
        <div>
          <dt className="text-label label-mono text-silver">Checked</dt>
          <dd className="data mt-2 text-h3 font-semibold text-foreground">
            {getVerificationDate()}
          </dd>
        </div>
      </dl>

      <div className="stack-sections mt-[var(--rhythm-section)]">
        {groups.map((group, index) => (
          <Reveal key={group.type} as="section" id={group.type} data-anchor>
            <SectionHeader
              level={2}
              label={String(index + 1).padStart(2, "0")}
              title={group.title}
              className="border-t border-line-strong pt-5"
            />
            <p className="measure mt-3 text-small text-muted-foreground">
              {getContradictionTypeLabel(group.type)}
            </p>
            <ul className="mt-8 flex flex-col gap-[var(--gutter)]">
              {group.records.map((record) => (
                <ContradictionRecord key={record.id} record={record} />
              ))}
            </ul>
          </Reveal>
        ))}

        {demoted.length > 0 && (
          <Reveal as="section" id="minor" data-anchor>
            <SectionHeader
              level={2}
              label={String(groups.length + 1).padStart(2, "0")}
              title="Minor discrepancies"
              className="border-t border-line-strong pt-5"
            />
            <p className="measure mt-3 text-small text-muted-foreground">
              Official sources that disagree by an amount too small to change a
              decision. Still logged, still unresolved — just not worth leading with.
            </p>

            {/* Collapsed by default. A plain <details>: keyboard reachable, no
                motion, and it holds exactly the same rendering as every record
                above once it is opened. */}
            <details className="group mt-6 border-t border-line pt-4">
              <summary className="cursor-pointer list-none text-label label-mono text-silver outline-none transition-colors duration-150 hover:text-silver-light focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none">
                Show {demoted.length} minor{" "}
                {demoted.length === 1 ? "discrepancy" : "discrepancies"}
              </summary>
              <ul className="mt-6 flex flex-col gap-[var(--gutter)]">
                {demoted.map((record) => (
                  <ContradictionRecord key={record.id} record={record} />
                ))}
              </ul>
            </details>
          </Reveal>
        )}
      </div>
    </main>
  );
}

function ContradictionRecord({ record }: { record: Contradiction }) {
  const programs = (record.program_ids ?? [])
    .map((id) => getProgramById(id))
    .filter((program): program is NonNullable<typeof program> => Boolean(program));

  const explained = record.status === "explained";

  return (
    <Card as="li" id={record.id} className="scroll-mt-24 flex flex-col">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h3 className="measure text-h3 font-semibold text-foreground">{record.title}</h3>
        {record.status && (
          <Pill tone={explained ? "muted" : "default"}>{record.status}</Pill>
        )}
      </div>

      {/* The opposing positions. Each attributed, each citing its own sources
          through the same path every other citation on the site uses. Neither
          is presented as the correct one. */}
      <ul className="mt-6 flex flex-col gap-5 border-t border-line pt-5">
        {record.statements.map((statement, index) => (
          <li key={index} className="border-l-2 border-line pl-4">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <p className="text-label label-mono text-silver-light">
                {statement.stated_by}
              </p>
              {/* A statement that is not an official voice never looks like one. */}
              {statement.claim_type !== "official" && (
                <span className="text-label label-mono text-silver">
                  {statement.claim_type.replace(/_/g, " ")}
                </span>
              )}
            </div>
            <p
              className={cn(
                "measure mt-2 text-body",
                statement.claim_type === "official"
                  ? "text-foreground"
                  : "text-muted-foreground",
              )}
            >
              {statement.text}
            </p>
            <SourceList sourceIds={statement.sources} />
          </li>
        ))}
      </ul>

      {/* The payoff: the only part that tells a student what to actually do.
          Given the strongest treatment on the card. */}
      {record.guidance ? (
        <div className="mt-6 border-l-2 border-silver-light pl-4">
          <p className="text-label label-mono text-silver-light">What to do</p>
          <p className="measure mt-2 text-body text-foreground">{record.guidance}</p>
        </div>
      ) : (
        <p className="measure mt-6 border-l-2 border-line pl-4 text-small text-muted-foreground">
          There is no resolved answer here. Both sources are live and they disagree —
          check with the university before you rely on either.
        </p>
      )}

      {programs.length > 0 && (
        <div className="mt-6 border-t border-line pt-4">
          <p className="text-label label-mono text-silver">Affects</p>
          <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
            {programs.map((program) => (
              <li key={program.id}>
                <Link
                  href={`/programs/${program.university_id}/${program.id}`}
                  className="text-small text-foreground underline decoration-silver underline-offset-4 transition-colors duration-150 hover:decoration-silver-light motion-reduce:transition-none"
                >
                  {program.short_name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
