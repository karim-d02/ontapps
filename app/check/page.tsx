import type { Metadata } from "next";

import { PrerequisiteChecker } from "@/components/check/prerequisite-checker";
import { SectionHeader } from "@/components/ui/section-header";
import { collectCourseCodes } from "@/lib/prerequisites";
import { getAllPrograms } from "@/lib/data";

export const metadata: Metadata = {
  title: "Check my courses",
  description:
    "Tick the 4U courses you have and see which Ontario programs you meet the course requirements for — including the per-course minimums most lists leave out.",
  alternates: { canonical: "/check" },
};

export default function CheckPage() {
  const programs = getAllPrograms();
  const courseCodes = collectCourseCodes(programs);

  return (
    <main className="shell pt-[var(--rhythm-section)] pb-[var(--rhythm-section)] motion-safe:animate-fade-rise-sm">
      <SectionHeader level={1} label="Course check" title="Do I have the courses" />
      <p className="measure mt-4 text-body text-muted-foreground">
        Every program below sets its own required courses, and some set a minimum mark on
        individual ones. Tick what you have. Nothing is sent anywhere — this runs entirely
        in your browser.
      </p>

      <div className="mt-12">
        <PrerequisiteChecker programs={programs} courseCodes={courseCodes} />
      </div>
    </main>
  );
}
