import Link from "next/link";

import { getAllPrograms, getSchoolSlug, getSchools } from "@/lib/programs";

export default function ProgramsIndexPage() {
  const schools = getSchools();
  const programs = getAllPrograms();

  return (
    <main className="mx-auto max-w-2xl p-6">
      <h1>Programs</h1>
      <ul>
        {schools.map((school) => {
          const count = programs.filter((program) => program.school === school).length;
          return (
            <li key={school}>
              <Link href={`/programs/${getSchoolSlug(school)}`}>{school}</Link>{" "}
              ({count} program{count === 1 ? "" : "s"})
            </li>
          );
        })}
      </ul>
    </main>
  );
}
