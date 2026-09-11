import type { Metadata } from "next";

import { Card } from "@/components/ui/card";
import { Reveal } from "@/components/ui/reveal";
import { SectionHeader } from "@/components/ui/section-header";
import { formatDate } from "@/lib/deadlines";
import { getMeta, getStaleOfficialPages } from "@/lib/programs";

export const metadata: Metadata = {
  title: "What official pages get wrong",
  description:
    "University admissions pages currently publishing stale or contradictory dates, logged with the date we checked each one.",
  alternates: { canonical: "/data-check" },
};

export default function DataCheckPage() {
  const meta = getMeta();
  const staleOfficialPages = getStaleOfficialPages();

  return (
    <main className="shell pt-[var(--rhythm-section)] pb-[var(--rhythm-section)] motion-safe:animate-fade-rise-sm">
      <SectionHeader level={1} label="Data check" title="What official pages get wrong" />
      <p className="measure mt-6 text-body text-muted-foreground">
        Every date on this site is checked against the university&apos;s own admissions
        page. When that page is stale or contradicts itself, we log it here instead of
        quietly working around it.
      </p>

      <dl className="mt-10 flex flex-wrap gap-x-12 gap-y-6 border-y border-line-strong py-6">
        <div>
          <dt className="text-label label-mono text-silver">Currently wrong</dt>
          <dd className="data mt-2 text-metric text-foreground">
            {staleOfficialPages.length}
          </dd>
        </div>
        <div>
          <dt className="text-label label-mono text-silver">Last verified</dt>
          <dd className="data mt-2 text-h3 font-semibold text-foreground">
            <time dateTime={meta.verifiedOn}>{formatDate(meta.verifiedOn)}</time>
          </dd>
        </div>
        <div>
          <dt className="text-label label-mono text-silver">Cycle</dt>
          <dd className="data mt-2 text-h3 font-semibold text-foreground">{meta.cycle}</dd>
        </div>
      </dl>

      <div className="stack-sections mt-[var(--rhythm-section)]">
        <Reveal as="section">
          <SectionHeader
            level={2}
            label="01"
            title="Currently stale"
            className="border-t border-line-strong pt-5"
          />
          {staleOfficialPages.length > 0 ? (
            <ul className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-2">
              {staleOfficialPages.map((entry, index) => (
                <Card key={index} as="li" className="flex flex-col">
                  <p className="data text-label text-silver">
                    {String(index + 1).padStart(2, "0")}
                  </p>
                  <p className="mt-3 text-h3 font-semibold text-foreground">{entry.page}</p>
                  <p className="mt-2 text-body text-muted-foreground">{entry.problem}</p>
                  <p className="data mt-auto pt-6 text-label text-silver">
                    Checked{" "}
                    <time dateTime={entry.checkedOn}>{formatDate(entry.checkedOn)}</time>
                  </p>
                </Card>
              ))}
            </ul>
          ) : (
            <p className="measure mt-6 text-body text-muted-foreground">
              No known stale official pages right now.
            </p>
          )}
        </Reveal>

        <Reveal as="section">
          <SectionHeader
            level={2}
            label="02"
            title="How figures are labelled"
            className="border-t border-line-strong pt-5"
          />
          <p className="measure mt-6 text-body text-foreground">{meta.disclaimer}</p>
          <p className="measure mt-4 text-small text-muted-foreground">{meta.cycleNote}</p>
        </Reveal>
      </div>
    </main>
  );
}
