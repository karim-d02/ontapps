// Generated from data/programs.json. Keep in sync manually — see AGENTS.md.

export type ProgramCategory = "health" | "eng" | "business";

export type GatekeepingModel = "atTheDoor" | "twoYearsIn" | "hybrid";

export type SourceType = "official" | "community";

// --- Top-level document ---------------------------------------------------

export interface Meta {
  cycle: string;
  cycleNote: string;
  verifiedOn: string;
  disclaimer: string;
}

export interface Category {
  id: ProgramCategory;
  label: string;
}

export interface GatekeepingModels {
  atTheDoor: string;
  twoYearsIn: string;
  hybrid: string;
}

export interface StaleOfficialPage {
  page: string;
  problem: string;
  checkedOn: string;
}

export interface ProgramsData {
  meta: Meta;
  categories: Category[];
  gatekeepingModels: GatekeepingModels;
  staleOfficialPages: StaleOfficialPage[];
  programs: Program[];
}

// --- Shared program subfields ----------------------------------------------

export interface OuacCode {
  code: string;
  label: string;
}

export interface Applicants {
  figure: string;
  source: SourceType;
  note: string;
}

export interface Courses {
  required: string[];
  recommended: string[];
  total: string;
  notes: string;
  /** Only present when a program has a distinct required-course list for a sub-stream (e.g. McMaster iBioMed). */
  requiredIBioMed?: string[];
}

export interface AverageEntry {
  source: string;
  type: SourceType;
  figure: string;
  note: string | null;
}

export interface TimelineEntry {
  date: string | null;
  label: string;
  critical: boolean;
  confirmed: boolean;
}

export interface Trap {
  title: string;
  body: string;
}

export interface Sources {
  official: string[];
  reported: string[];
}

export interface Prep {
  shape: string;
  time: string;
  note: string;
}

export interface AccessChain {
  title: string;
  steps: string[];
  worstCase: string;
  advice: string;
}

export interface YearThreeEntryRoute {
  name: string;
  requirement: string;
  outcome: string;
}

export interface YearThreeEntry {
  title: string;
  routes: YearThreeEntryRoute[];
  moduleFilter: string;
}

export interface PostSystemType {
  name: string;
  requirement: string;
}

export interface PostSystem {
  title: string;
  body: string;
  types?: PostSystemType[];
  mechanics?: string;
}

export interface AdjustmentFactor {
  official: boolean;
  body: string;
  note: string;
}

export interface AiScoring {
  official: boolean;
  body: string;
  contrast: string;
  note: string;
}

export interface AlternativeOffer {
  available: boolean;
  body: string;
  note: string;
}

export interface LookingFor {
  verbatim: string;
  contrast: string;
}

// --- suppApp -----------------------------------------------------------
//
// Shape splits sharply on `required`. When false, it's just a note. When
// true, it draws from a long tail of subfields where roughly a dozen occur
// on exactly one program (see AGENTS.md "Field variance").

export interface SuppAppComponent {
  type: "written" | "video";
  prompt: string;
  limit?: string;
  time?: string;
}

export interface SuppAppRubric {
  bands: string[];
  written: string[];
  video: string[];
  keyInsight: string;
  notScored: string;
}

export interface SuppAppDeadline {
  confirmed: boolean;
  /** Absent when `confirmed` is false and the date hasn't been published yet. */
  date?: string;
  text: string;
  /** Only present alongside an unconfirmed deadline. */
  estimate?: string;
}

export interface SuppAppWeightingCluster {
  suppAppScore: string;
  gpa: string;
  outcome: string;
  count: number | null;
}

export interface SuppAppWeighting {
  type: "cluster" | "unpublished" | "partial";
  official: boolean;
  summary: string;
  clusters?: SuppAppWeightingCluster[];
  clustersSource?: string;
  keyLine?: string;
  note?: string;
  formula?: string;
  notPublished?: string[];
  communityInterpretation?: string;
}

export interface SuppAppNotRequired {
  required: false;
  note: string;
}

export interface SuppAppRequired {
  required: true;
  platform: string;
  format: string;
  /** Character/word limit stated directly on suppApp, for programs without a `components` breakdown. */
  limit?: string;
  components?: SuppAppComponent[];
  /** Rotman: questions known in advance. */
  known?: SuppAppComponent[];
  /** Rotman: questions drawn at random. */
  random?: SuppAppComponent[];
  /** Waterloo: full verbatim AIF question set. */
  questions?: string[];
  sitting?: string;
  competencies?: string[];
  questionsPublishedInAdvance: boolean | "partial";
  questionsNote?: string;
  structureNote?: string;
  rubricPublished: boolean;
  rubricNote?: string;
  rubric?: SuppAppRubric;
  evaluators?: string;
  deadline: SuppAppDeadline;
  fee: string | null;
  feeNote?: string;
  invite?: string;
  formatUnconfirmed?: boolean;
  formatWarning?: string;
  mismatch?: string;
  note?: string;
  weighting: SuppAppWeighting;
}

export type SuppApp = SuppAppNotRequired | SuppAppRequired;

// --- Program -------------------------------------------------------------

export interface Program {
  id: string;
  name: string;
  school: string;
  campus: string;
  category: ProgramCategory;
  gatekeeping: GatekeepingModel;
  ouacCodes: OuacCode[];
  seats: number | null;
  seatsNote?: string;
  codeNote?: string;
  applicants?: Applicants;
  suppApp: SuppApp;
  courses: Courses;
  majors?: string[];
  averages: AverageEntry[];
  timeline: TimelineEntry[];
  accessChain?: AccessChain;
  yearThreeEntry?: YearThreeEntry;
  postSystem?: PostSystem;
  adjustmentFactor?: AdjustmentFactor;
  aiScoring?: AiScoring;
  alternativeOffer?: AlternativeOffer;
  lookingFor?: LookingFor;
  traps: Trap[];
  rules?: string[];
  prep?: Prep;
  howToApply?: string;
  sources: Sources;
  verifiedOn: string;
}
