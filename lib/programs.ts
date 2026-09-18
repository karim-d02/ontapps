import rawData from "@/data/programs.json";
import type {
  Category,
  GatekeepingModel,
  GatekeepingModels,
  Meta,
  Program,
  ProgramCategory,
  ProgramsData,
  StaleOfficialPage,
} from "@/types/program";

// TEMPORARY MIGRATION SHIM — removed in the stubs stage.
// The old schema types no longer describe data/programs.json. This cast keeps
// the not-yet-migrated pages compiling so every stage can commit green; the
// code below is dead-schema and is replaced route by route. See MIGRATION-REPORT.md.
const data = rawData as unknown as ProgramsData;

export function getAllPrograms(): Program[] {
  return data.programs;
}

export function getProgramById(id: string): Program | undefined {
  return data.programs.find((program) => program.id === id);
}

export function getProgramsBySchool(school: string): Program[] {
  return data.programs.filter((program) => program.school === school);
}

export function getSchools(): string[] {
  return Array.from(new Set(data.programs.map((program) => program.school)));
}

export function getCategories(): Category[] {
  return data.categories;
}

export function getCategoryLabel(id: ProgramCategory): string | undefined {
  return data.categories.find((category) => category.id === id)?.label;
}

export function getGatekeepingDescription(model: GatekeepingModel): string {
  return data.gatekeepingModels[model];
}

export function getGatekeepingModels(): GatekeepingModels {
  return data.gatekeepingModels;
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/'/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function getSchoolSlug(school: string): string {
  return slugify(school);
}

// "McMaster University" → "McMaster", "University of Toronto" → "Toronto".
// For page titles only: every school we track is unambiguous without the word,
// and it buys 10–14 characters inside a budget Google cuts at around 60. The
// full name stays everywhere a reader sees it, including the page's own H1.
export function getSchoolShortName(school: string): string {
  return school.replace(/^University of /, "").replace(/ University$/, "");
}

export function getSchoolBySlug(slug: string): string | undefined {
  return getSchools().find((school) => getSchoolSlug(school) === slug);
}

export function getProgramsBySchoolSlug(slug: string): Program[] {
  return data.programs.filter((program) => getSchoolSlug(program.school) === slug);
}

export function getMeta(): Meta {
  return data.meta;
}

export function getStaleOfficialPages(): StaleOfficialPage[] {
  return data.staleOfficialPages;
}
