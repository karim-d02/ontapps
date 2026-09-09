import rawData from "@/data/programs.json";
import type {
  Category,
  GatekeepingModel,
  GatekeepingModels,
  Program,
  ProgramCategory,
  ProgramsData,
} from "@/types/program";

const data = rawData as ProgramsData;

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

export function getSchoolBySlug(slug: string): string | undefined {
  return getSchools().find((school) => getSchoolSlug(school) === slug);
}

export function getProgramsBySchoolSlug(slug: string): Program[] {
  return data.programs.filter((program) => getSchoolSlug(program.school) === slug);
}
