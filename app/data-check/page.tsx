import type { Metadata } from "next";

import { SectionHeader } from "@/components/ui/section-header";

export const metadata: Metadata = {
  title: "What official pages get wrong",
  description:
    "University admissions pages currently publishing stale or contradictory dates, logged with the date we checked each one.",
  alternates: { canonical: "/data-check" },
};

/**
 * STUBBED DURING THE SCHEMA MIGRATION — see MIGRATION-REPORT.md.
 *
 * The previous version of this page was written against the old top-level
 * `staleOfficialPages` array, whose records had `page`, `problem` and
 * `checkedOn`. That array no longer exists. The replacement is
 * `contradictions` filtered to type "official_stale_page" (7 records), and
 * those records have a completely different shape — `title`, `status` and
 * `statements[]`, each statement carrying `stated_by` and `sources`.
 *
 * That is not a field rename, it is a different page: one stale page is now a
 * set of attributed statements that disagree, rather than a single problem
 * sentence. How that should be laid out is a design decision, and this
 * migration does not make those.
 *
 * The data layer is ready — lib/data.ts exports getStaleOfficialPages() — so
 * rebuilding this is a page-level job with no data work left in front of it.
 *
 * The route is kept (and still linked from the footer) rather than deleted, so
 * the URL does not start 404ing for anyone who has it.
 */
export default function DataCheckPage() {
  return (
    <main className="shell pt-[var(--rhythm-section)] pb-[var(--rhythm-section)] motion-safe:animate-fade-rise-sm">
      <SectionHeader level={1} label="Data check" title="What official pages get wrong" />
      <p className="measure mt-6 text-body text-muted-foreground">
        This page is being rewritten.
      </p>
      <p className="measure mt-4 text-body text-muted-foreground">
        The underlying data changed shape and this view has not been rebuilt against
        it yet. Every program page still shows its own sources and flags where
        official sources disagree.
      </p>
    </main>
  );
}
