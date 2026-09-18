// The single data-access module. Every page, component and route imports the
// data from here — nothing reaches into the raw JSON.
//
// data/document.json is NOT imported here and must never be imported anywhere
// (AGENTS.md). Only these two files are read.

import rawPrograms from "@/data/programs.json";
import rawGatekeeping from "@/data/gatekeeping.json";
import type {
  Claim,
  ClaimEnvelope,
  Contradiction,
  GatekeepingData,
  GatekeepingModelId,
  GatekeepingModelInfo,
  GatekeepingRecord,
  Legend,
  Program,
  ProgramCategory,
  ProgramsData,
  ProgramsMeta,
  Source,
  SupplementaryApplication,
  University,
} from "@/types/schema";

// --- internal_note is filtered here, at the data layer --------------------
//
// AGENTS.md: claim_type "internal_note" is a note to the site team and must
// never reach a page — and must be filtered in the data layer, not in a
// component. So it is stripped once, on load, and no downstream code has to
// remember. Any array element that is an internal_note is dropped; any object
// property holding one is nulled.
//
// As of this migration the data contains zero internal_note claims, so this is
// currently a no-op guard. It stays because the contract is about what may
// reach a page, not about what happens to be in the file today.

function isInternalNote(value: unknown): boolean {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    (value as { claim_type?: unknown }).claim_type === "internal_note"
  );
}

function stripInternalNotes<T>(input: T): T {
  if (Array.isArray(input)) {
    return input
      .filter((entry) => !isInternalNote(entry))
      .map((entry) => stripInternalNotes(entry)) as unknown as T;
  }
  if (typeof input === "object" && input !== null) {
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(input)) {
      out[key] = isInternalNote(value) ? null : stripInternalNotes(value);
    }
    return out as T;
  }
  return input;
}

const data: ProgramsData = stripInternalNotes(
  rawPrograms as unknown as ProgramsData,
);

const gatekeeping: GatekeepingData = stripInternalNotes(
  rawGatekeeping as unknown as GatekeepingData,
);

// --- Integrity ------------------------------------------------------------
//
// AGENTS.md pins these two numbers: "If either differs from what you read, you
// are looking at the wrong file." Checked once at load so a swapped or
// truncated data file fails loudly at build time rather than rendering a
// half-empty site.

if (data.meta.counts.programs !== 16 || data.meta.prepared.changes !== 87) {
  throw new Error(
    `data/programs.json integrity check failed: expected 16 programs and 87 ` +
      `changes, read ${data.meta.counts.programs} and ${data.meta.prepared.changes}. ` +
      `This is the wrong file — do not regenerate the checksum.`,
  );
}

// --- Meta and legend ------------------------------------------------------

export function getMeta(): ProgramsMeta {
  return data.meta;
}

/** Program-level verification date. Individual claims carry their own. */
export function getVerificationDate(): string {
  return data.meta.verification.dates_and_codes_checked;
}

/**
 * The last ISO date in the verification value.
 *
 * `dates_and_codes_checked` is a RANGE ("2026-09-15/2026-09-17"), not a single
 * date, so it cannot be passed to `new Date()` or to formatDate. Callers that
 * genuinely need one date — sitemap lastModified, for instance — take the end
 * of the range, which is the last day the data was checked. Callers that are
 * displaying it should print getVerificationDate() as given instead.
 */
export function getVerificationEndDate(): string {
  const parts = data.meta.verification.dates_and_codes_checked.split("/");
  return parts[parts.length - 1];
}

export function getVerificationStatement(): string {
  return data.meta.verification.statement;
}

export function getLegend(): Legend {
  return data.legend;
}

/** Human wording for an enum value, straight from `legend`. Never hardcoded. */
export function getClaimTypeLabel(claimType: string): string | undefined {
  return data.legend.claim_types[claimType];
}

export function getVerificationStatusLabel(status: string): string | undefined {
  return data.legend.verification_statuses[status];
}

export function getDeadlineKindLabel(kind: string): string | undefined {
  return data.legend.deadline_kinds[kind];
}

export function getContradictionTypeLabel(type: string): string | undefined {
  return data.legend.contradiction_types[type];
}

// --- Programs -------------------------------------------------------------

export function getAllPrograms(): Program[] {
  return data.programs;
}

export function getProgramById(id: string): Program | undefined {
  return data.programs.find((program) => program.id === id);
}

export const CATEGORIES: ProgramCategory[] = [
  "engineering",
  "business",
  "health_sciences",
  "kinesiology",
];

/**
 * Display label for a category.
 *
 * The new data has no `categories` array and the legend does not cover them,
 * so these are derived mechanically from the id (underscores to spaces, first
 * letter capitalised). Nothing is invented: no wording is introduced that the
 * id does not already carry.
 */
export function getCategoryLabel(category: string): string {
  const spaced = category.replace(/_/g, " ");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

export function getProgramsByCategory(category: ProgramCategory): Program[] {
  return data.programs.filter((program) => program.category === category);
}

// --- Universities ---------------------------------------------------------

export function getUniversities(): University[] {
  return data.universities;
}

/**
 * `university_id` is already URL-slug shaped ("mcmaster-university"), and it
 * matches the slug the old site generated from the school name — so university
 * URLs are unchanged by this migration. Only program ids changed.
 */
export function getUniversitySlug(program: Program): string {
  return program.university_id;
}

export function getUniversityById(id: string): University | undefined {
  return data.universities.find((university) => university.id === id);
}

export function getUniversitySlugs(): string[] {
  return data.universities.map((university) => university.id);
}

export function getProgramsByUniversity(universityId: string): Program[] {
  return data.programs.filter(
    (program) => program.university_id === universityId,
  );
}

export function getUniversityName(universityId: string): string | undefined {
  return getUniversityById(universityId)?.name;
}

// "McMaster University" -> "McMaster", "University of Toronto" -> "Toronto".
// Page titles only: buys 10-14 characters inside a budget Google cuts around
// 60. The full name stays everywhere a reader sees it.
export function getUniversityShortName(name: string): string {
  return name.replace(/^University of /, "").replace(/ University$/, "");
}

// --- Sources --------------------------------------------------------------
//
// `sources` is an OBJECT keyed by id, not an array. Never .find() over it.

export function getSource(id: string): Source | undefined {
  return data.sources[id];
}

/** Resolve a claim's source ids, dropping ids with no record. */
export function getSourcesFor(envelope: ClaimEnvelope): Array<{
  id: string;
  source: Source;
}> {
  return envelope.sources
    .map((id) => ({ id, source: data.sources[id] }))
    .filter((entry): entry is { id: string; source: Source } =>
      Boolean(entry.source),
    );
}

export function getAllSources(): Record<string, Source> {
  return data.sources;
}

// --- Contradictions -------------------------------------------------------

export function getContradictions(): Contradiction[] {
  return data.contradictions;
}

export function getContradictionById(id: string): Contradiction | undefined {
  return data.contradictions.find((entry) => entry.id === id);
}

export function getContradictionsFor(envelope: ClaimEnvelope): Contradiction[] {
  return envelope.contradiction_ids
    .map((id) => getContradictionById(id))
    .filter((entry): entry is Contradiction => Boolean(entry));
}

/**
 * Replaces the old `staleOfficialPages` top-level array: it is now
 * `contradictions` filtered to type "official_stale_page" (7 records).
 */
export function getStaleOfficialPages(): Contradiction[] {
  return data.contradictions.filter(
    (entry) => entry.type === "official_stale_page",
  );
}

// --- Supplementary applications -------------------------------------------

export function getSupplementaryApplications(): SupplementaryApplication[] {
  return data.supplementary_applications;
}

export function getSupplementaryApplicationById(
  id: string,
): SupplementaryApplication | undefined {
  return data.supplementary_applications.find((entry) => entry.id === id);
}

export function getSupplementaryApplicationsForProgram(
  program: Program,
): SupplementaryApplication[] {
  return program.supplementary_application_ids
    .map((id) => getSupplementaryApplicationById(id))
    .filter((entry): entry is SupplementaryApplication => Boolean(entry));
}

// --- Inheritance ----------------------------------------------------------

/**
 * When a field is listed in `inherited_from`, it was copied from another
 * program and must be attributed ("same as <program>") rather than presented
 * as independently sourced.
 */
export function getInheritedSource(
  program: Program,
  field: string,
): { programId: string; programName: string } | null {
  const sourceId = program.inherited_from?.[field];
  if (!sourceId) return null;
  const source = getProgramById(sourceId);
  return {
    programId: sourceId,
    programName: source?.name ?? sourceId,
  };
}

// --- Gatekeeping ----------------------------------------------------------

export function getGatekeepingModels(): Record<
  GatekeepingModelId,
  GatekeepingModelInfo
> {
  return gatekeeping.models;
}

export function getGatekeepingModel(
  model: GatekeepingModelId,
): GatekeepingModelInfo | undefined {
  return gatekeeping.models[model];
}

export function getGatekeepingFraming() {
  return gatekeeping.framing;
}

export function getGatekeepingFor(
  programId: string,
): GatekeepingRecord | undefined {
  return gatekeeping.programs[programId];
}

export function getAllGatekeeping(): Record<string, GatekeepingRecord> {
  return gatekeeping.programs;
}

/**
 * Filter options for the browse page.
 *
 * "undetermined" is its own option and is never grouped with "at_the_door".
 * The data does not establish whether a gate exists for those two programs,
 * and defaulting an unknown to a reassuring answer is the one error a student
 * would actually act on.
 */
export const GATEKEEPING_FILTER_ORDER: GatekeepingModelId[] = [
  "at_the_door",
  "hybrid",
  "two_years_in",
  "undetermined",
];

/** A "derived" classification is inferred and must be marked as such. */
export function isDerivedClassification(record: GatekeepingRecord): boolean {
  return record.confidence === "derived";
}
