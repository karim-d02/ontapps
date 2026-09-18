import type { Metadata } from "next";

import { MyTimeline } from "@/components/timeline/my-timeline";
import { SectionHeader } from "@/components/ui/section-header";
import { todayISO } from "@/lib/deadlines";
import { getAllPrograms } from "@/lib/data";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "My timeline",
  description:
    "Pick the Ontario programs you're applying to and get every deadline across all of them in one chronological list.",
  alternates: { canonical: "/timeline" },
};

export default function TimelinePage() {
  return (
    <main className="shell pt-[var(--rhythm-section)] pb-[var(--rhythm-section)] motion-safe:animate-fade-rise-sm">
      <SectionHeader level={1} label="My timeline" title="Every date, in order" />
      <p className="measure mt-4 text-body text-muted-foreground">
        Each university only tells you about its own dates. Pick the programs you&apos;re
        applying to and they merge into one list, soonest first.
      </p>

      <div className="mt-12">
        <MyTimeline programs={getAllPrograms()} today={todayISO()} />
      </div>
    </main>
  );
}
