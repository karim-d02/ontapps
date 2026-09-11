import Link from "next/link";
import { notFound } from "next/navigation";

import { SectionHeader } from "@/components/ui/section-header";
import {
  getProgramsBySchoolSlug,
  getSchoolBySlug,
  getSchools,
  getSchoolSlug,
} from "@/lib/programs";

export function generateStaticParams() {
  return getSchools().map((school) => ({ school: getSchoolSlug(school) }));
}

export default async function SchoolProgramsPage({
  params,
}: {
  params: Promise<{ school: string }>;
}) {
  const { school: schoolSlug } = await params;
  const school = getSchoolBySlug(schoolSlug);
  const programs = getProgramsBySchoolSlug(schoolSlug);

  if (!school || programs.length === 0) {
    notFound();
  }

  return (
    <main className="mx-auto max-w-2xl p-6 motion-safe:animate-fade-rise-sm">
      <SectionHeader level={1} title={school} className="mb-section-md" />
      <ul>
        {programs.map((program) => (
          <li key={program.id}>
            <Link href={`/programs/${schoolSlug}/${program.id}`}>{program.name}</Link>{" "}
            — {program.campus}
          </li>
        ))}
      </ul>
    </main>
  );
}
