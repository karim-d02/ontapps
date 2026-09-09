import { ProgramsBrowser } from "@/components/programs/programs-browser";
import {
  getAllPrograms,
  getCategories,
  getGatekeepingModels,
  getSchools,
} from "@/lib/programs";

export default function ProgramsIndexPage() {
  const programs = getAllPrograms();
  const schools = getSchools();
  const categories = getCategories();
  const gatekeepingModels = getGatekeepingModels();

  return (
    <main className="mx-auto max-w-5xl p-6">
      <h1>Programs</h1>
      <ProgramsBrowser
        programs={programs}
        schools={schools}
        categories={categories}
        gatekeepingModels={gatekeepingModels}
      />
    </main>
  );
}
