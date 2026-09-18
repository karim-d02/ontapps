import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { ProgramCard } from "@/components/programs/program-card";
import { SectionHeader } from "@/components/ui/section-header";
import { todayISO } from "@/lib/deadlines";
import {
  getCategoryLabel,
  getProgramsByUniversity,
  getUniversityName,
  getUniversitySlugs,
} from "@/lib/data";

export const revalidate = 3600;

export function generateStaticParams() {
  return getUniversitySlugs().map((slug) => ({ school: slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ school: string }>;
}): Promise<Metadata> {
  const { school: schoolSlug } = await params;
  const school = getUniversityName(schoolSlug);
  if (!school) return {};

  const programs = getProgramsByUniversity(schoolSlug);
  return {
    title: school,
    description: `Every ${school} program we track — ${programs
      .map((program) => program.name)
      .join(", ")} — with deadlines, supplementary applications and admission averages.`,
    alternates: { canonical: `/programs/${schoolSlug}` },
  };
}

export default async function SchoolProgramsPage({
  params,
}: {
  params: Promise<{ school: string }>;
}) {
  const { school: schoolSlug } = await params;
  const school = getUniversityName(schoolSlug);
  const programs = getProgramsByUniversity(schoolSlug);

  if (!school || programs.length === 0) {
    notFound();
  }

  const today = todayISO();

  return (
    <main className="shell pt-6 pb-[var(--rhythm-section)] motion-safe:animate-fade-rise-sm">
      <Breadcrumbs
        back={{ label: "All programs", href: "/programs" }}
        items={[{ label: "Programs", href: "/programs" }, { label: school }]}
      />

      <div className="mt-8">
        <SectionHeader
          level={1}
          label={`${programs.length} ${programs.length === 1 ? "program" : "programs"}`}
          title={school}
        />
      </div>

      {/* The same card as the browse grid, rather than the bare bulleted list
          this page used to be — a page that shows less than the page it came
          from is a dead end. */}
      <ul className="mt-12 grid grid-cols-1 gap-[var(--gutter)] sm:grid-cols-2 xl:grid-cols-3">
        {programs.map((program) => (
          <ProgramCard
            key={program.id}
            program={program}
            today={today}
            categoryLabel={getCategoryLabel(program.category)}
          />
        ))}
      </ul>
    </main>
  );
}
