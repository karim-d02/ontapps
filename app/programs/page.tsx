import { ProgramsBrowser } from "@/components/programs/programs-browser";
import { SectionHeader } from "@/components/ui/section-header";
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
    <main className="mx-auto max-w-[1800px] p-6 motion-safe:animate-fade-rise-sm lg:p-10">
      <SectionHeader level={1} title="Programs" className="mb-section-md" />
      <ProgramsBrowser
        programs={programs}
        schools={schools}
        categories={categories}
        gatekeepingModels={gatekeepingModels}
      />
    </main>
  );
}
