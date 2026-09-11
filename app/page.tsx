import Link from "next/link";

import { BentoGrid } from "@/components/kokonutui/bento-grid";
import { Button } from "@/components/ui/button";
import { SectionHeader } from "@/components/ui/section-header";
import { UniversityMarquee } from "@/components/university-marquee";
import { UNIVERSITIES } from "@/components/university-wordmark";
import { getAllPrograms, getCategories } from "@/lib/programs";

export default function Page() {
  const programCount = getAllPrograms().length;
  const categoryCount = getCategories().length;

  return (
    <main className="mx-auto flex min-h-svh max-w-3xl flex-col justify-center px-6 py-section-2xl">
      <SectionHeader
        level={1}
        title="Simplifying Your Uni Applications"
        animateWords
      />
      <p
        className="mt-section-sm max-w-xl text-body text-muted-foreground motion-safe:animate-fade-rise"
        style={{ animationDelay: "60ms" }}
      >
        Ontario&apos;s health, engineering, and business programs each run their own
        deadlines, supplementary applications, and admission averages — and official
        pages are often stale or contradictory. OntApps tracks all of it in one place,
        verified and dated, so you know exactly what&apos;s true right now.
      </p>
      <div
        className="mt-section-lg motion-safe:animate-fade-rise"
        style={{ animationDelay: "120ms" }}
      >
        <Button
          arrow
          size="lg"
          nativeButton={false}
          render={<Link href="/programs" />}
        >
          Browse programs
        </Button>
      </div>

      <div
        className="mt-section-2xl motion-safe:animate-fade-rise"
        style={{ animationDelay: "180ms" }}
      >
        <BentoGrid
          items={[
            { value: UNIVERSITIES.length, label: "Universities" },
            { value: programCount, label: "Programs tracked" },
            { value: categoryCount, label: "Categories" },
          ]}
        />
      </div>

      <div className="mt-section-2xl border-t border-border/60 pt-section-md">
        <SectionHeader level={3} title="Universities we cover" />
        <div className="mt-section-sm">
          <UniversityMarquee />
        </div>
      </div>
    </main>
  );
}
