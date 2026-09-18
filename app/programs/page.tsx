import type { Metadata } from "next";
import { Suspense } from "react";

import { ProgramsBrowser } from "@/components/programs/programs-browser";
import { ProgramGridSkeleton } from "@/components/programs/program-grid-skeleton";
import { SectionHeader } from "@/components/ui/section-header";
import { todayISO } from "@/lib/deadlines";
import {
  CATEGORIES,
  getAllPrograms,
  getUniversities,
} from "@/lib/data";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "All programs",
  description:
    "Every program we track, with its OUAC codes, deadlines, required courses — and when each one actually evaluates you.",
  alternates: { canonical: "/programs" },
};

export default function ProgramsIndexPage() {
  const programs = getAllPrograms();
  const universities = getUniversities();
  const today = todayISO();

  return (
    <main className="shell pt-[var(--rhythm-section)] pb-[var(--rhythm-section)] motion-safe:animate-fade-rise-sm">
      <SectionHeader
        level={1}
        label={`${programs.length} programs · ${universities.length} universities`}
        title="Programs"
      />
      <p className="measure mt-4 text-body text-muted-foreground">
        Filter by school, field or gatekeeping model. Select up to three to compare side
        by side — the filtered view is in the address bar, so you can send it to someone.
      </p>

      <div className="mt-10">
        {/*
          useSearchParams needs a Suspense boundary to keep the rest of this
          page statically rendered. The fallback is the real grid shape, not a
          spinner, so nothing shifts when the filters resolve.
        */}
        <Suspense fallback={<ProgramGridSkeleton count={programs.length} />}>
          <ProgramsBrowser
            programs={programs}
            universities={universities}
            categories={CATEGORIES}
            today={today}
          />
        </Suspense>
      </div>
    </main>
  );
}
