// Types for data/programs.json and data/gatekeeping.json.
//
// Both files are READ-ONLY (see AGENTS.md). These types describe them; they
// never reshape them. Where the data says `null`, the type says `null` — there
// are no optional-with-default fields here on purpose, because "not published"
// is a real answer this site has to render, not a gap to paper over.
//
// Note on presence: every program key is present on all 16 programs. The
// variance AGENTS.md describes ("grade_ranges 13/16") is expressed as `null`
// or `[]`, not as an absent key. So these are required properties with
// nullable types, not optional properties.

// --- Enums ----------------------------------------------------------------

export type ClaimType =
  | "official"
  | "editorial"
  | "third_party"
  | "community"
  | "secondary_press"
  | "vendor"
  | "internal_note"
  | "source_list"
  | "verification_note"
  | "mixed";

export type VerificationStatus =
  | "certified"
  | "contradiction"
  | "unconfirmed"
  | "not_yet_published"
  | "not_individually_verified"
  | "community_unverified";

export type SourceAttribution = "block" | "section" | "none";

export type DeadlineKind =
  | "deadline"
  | "opens"
  | "recommended"
  | "decision"
  | "decision_window"
  | "milestone"
  | "ongoing"
  | "prior_cycle"
  | "none";

export type ContradictionType =
  | "official_vs_official"
  | "official_stale_page"
  | "official_internal"
  | "secondary_vs_official"
  | "official_vs_community"
  | "community_disagreement"
  | "document_internal";

// The four categories, exactly. AGENTS.md pins this list.
export type ProgramCategory =
  | "engineering"
  | "business"
  | "health_sciences"
  | "kinesiology";

// --- The claim envelope ---------------------------------------------------

export interface VerificationCorrection {
  log_id: string;
  was: string;
  now: string;
}

export interface ClaimVerification {
  status: VerificationStatus;
  /** Internal. Never rendered. */
  log_ids: string[];
  corrections: VerificationCorrection[];
  note: string | null;
  /** May be null — the claim was never individually date-checked. */
  checked: string | null;
}

/**
 * The envelope shared by every fact in the file.
 *
 * This is deliberately split from `Claim` because the envelope is a *mixin*,
 * not a fixed record: `ouac_codes`, `deadlines` and `related_codes` carry the
 * envelope but have no `value`/`text` of their own (they carry `code`/`program`
 * or the deadline fields instead). Anything that renders "the chrome" — the
 * verification qualifier, the conflict marker, the citations — only needs this
 * much, which is what lets one <Claim> component serve all of them.
 */
export interface ClaimEnvelope {
  claim_type: ClaimType;
  /**
   * Optional. Four `mixed` claims in `comparisons` carry no verification field
   * at all, so reading `.status` off this unguarded throws the moment anything
   * renders them. When it is absent the provenance is unknown, and unknown is
   * never rendered as certified or as anything reassuring.
   */
  verification?: ClaimVerification;
  /** Keys into the top-level `sources` object. */
  sources: string[];
  contradiction_ids: string[];
  note: string | null;
  /** Internal. Never rendered. */
  pdf_block_ids: string[];
  /** Present on `mixed` blocks: the claim types combined. */
  contains?: ClaimType[] | null;
  source_attribution?: SourceAttribution | null;
}

/** An envelope that also carries a displayable value and sentence. */
export interface Claim<V = unknown> extends ClaimEnvelope {
  value: V;
  text: string;
}

// --- Program subfields ----------------------------------------------------

export interface OuacCode extends ClaimEnvelope {
  code: string;
  program: string;
}

export interface CourseRequirement {
  course: string;
  requirement: string;
  minimum_grade: string | number | null;
  alternatives: string[] | null;
  note: string | null;
  /** Derived. Normalized from the free-text `requirement`. */
  requirement_level: "required" | "recommended" | null;
  /**
   * Derived. False when the entry is a prose constraint rather than a course
   * code — the prerequisite checker must not pass or fail these.
   */
  evaluable: boolean;
}

export interface RequiredCourses extends Claim<CourseRequirement[]> {
  total_courses: number | string | null;
}

export interface GradeRangeValue {
  scope: string;
  /** Prose, e.g. "high 80s to low 90s". Never parse this into a number. */
  range: string;
}

export interface GradeRange extends Claim<GradeRangeValue> {
  source_label?: string | null;
}

export interface DateRange {
  start: string | null;
  end: string | null;
}

export interface Deadline extends ClaimEnvelope {
  key: string;
  label: string;
  kind: DeadlineKind;
  /** ISO date, or null when not published / a range was given instead. */
  date: string | null;
  time: string | null;
  timezone: string | null;
  /** Display text. Never sort or compare on this. */
  date_text: string | null;
  applies_to?: string | null;
  date_range: DateRange | null;
  /** Derived: kind === "deadline" AND date parses. The only rows safe for date math. */
  is_deadline: boolean;
  /** Derived: kind === "prior_cycle". Never present as upcoming. */
  is_prior_cycle: boolean;
  window?: unknown;
  expected?: string | null;
  in_pdf?: boolean | null;
}

export interface RelatedCode extends ClaimEnvelope {
  code: string;
  program: string;
}

export interface LabelledClaim<V = unknown> extends Claim<V> {
  label?: string | null;
  key?: string | null;
}

/** Map of field name -> program id that field was copied from. */
export type InheritedFrom = Record<string, string> | null;

export interface Program {
  id: string;
  name: string;
  short_name: string;
  university: string;
  /** Already URL-slug shaped, e.g. "mcmaster-university". */
  university_id: string;
  campus: string;
  faculty: string;
  degree: string;
  category: ProgramCategory;
  pdf_part: string;
  pdf_pages: number[];

  tracked_scope: string | null;
  admission_structure: Claim;
  ouac_codes: OuacCode[];
  required_courses: RequiredCourses;
  recommended_courses: Claim<CourseRequirement[]>;

  official_minimum: Claim;
  grade_ranges: GradeRange[];
  grade_range_note: Claim | null;
  community_competitiveness: Claim[];

  enrollment: Claim | null;
  supplementary_application_ids: string[];
  supplementary_summary: Claim;
  /** Derived. Render badges and filters from this; do not recompute it. */
  supp_app_required: boolean;

  deadlines: Deadline[];
  fees: LabelledClaim[];
  conditional_offer_requirement: Claim | null;
  alternate_offer: Claim | null;
  other_facts: LabelledClaim[];
  stream_traps: Claim[];

  admissions_statistics: Claim[] | null;
  year3_entry: Claim | null;
  related_codes: RelatedCode[] | null;
  chemistry_note: Claim | null;
  majors: Claim | null;
  codes_note: Claim | null;

  content_section_ids: string[];
  contradiction_ids: string[];
  /** Internal. Never rendered. */
  verification_log_ids: string[];
  inherited_from: InheritedFrom;
}

// --- Universities, sources, contradictions --------------------------------

export interface University {
  id: string;
  name: string;
  program_ids: string[];
}

export interface Source {
  publisher: string | null;
  title: string | null;
  /** May be null — e.g. observed in person. Never fabricate one. */
  url: string | null;
  alternate_urls: string[] | null;
  url_note: string | null;
  source_type: string | null;
  /** false -> not re-checked by us. Say so. */
  verified_by_us: boolean;
  accessed: string | null;
  cited_as: string | null;
}

export interface ContradictionStatement {
  stated_by: string;
  statement?: string | null;
  text?: string | null;
  sources: string[];
}

export interface Contradiction {
  id: string;
  type: ContradictionType;
  title: string;
  status: string | null;
  statements: ContradictionStatement[];
  note?: string | null;
  programs?: string[];
}

// --- Supplementary applications -------------------------------------------

export interface SuppWeightingCluster {
  supp_app_score?: string | null;
  gpa?: string | null;
  outcome?: string | null;
  count: number | null;
  [key: string]: unknown;
}

export interface SuppWeightingValue {
  clusters?: SuppWeightingCluster[] | null;
  key_line?: string | null;
  [key: string]: unknown;
}

export interface SupplementaryApplication {
  id: string;
  name: string;
  university: string;
  program_ids: string[];
  content_section_id: string | null;
  /** Plain boolean. When false, say "No supplementary application" plainly. */
  required: boolean;
  required_for: Claim | null;
  platform: Claim | null;
  /** `fee.value.amount` may be null. null is not zero and not free. */
  fee: Claim<{ amount: number | null; [key: string]: unknown }> | null;
  components: Claim[] | null;
  weighting: Claim<SuppWeightingValue> | null;
  /** Author analysis. claim_type is always "editorial" — never university guidance. */
  traps: Claim[];
  deadline_keys: string[] | null;
  contradiction_ids: string[];
  /**
   * The long tail: ~50 distinct subfields, 28 of which appear exactly once.
   * These fall through to the generic labelled-detail renderer rather than
   * each getting a bespoke layout.
   */
  [key: string]: unknown;
}

// --- Legend ---------------------------------------------------------------

export interface Legend {
  claim_types: Record<string, string>;
  verification_statuses: Record<string, string>;
  source_attribution: Record<string, string>;
  contradiction_types: Record<string, string>;
  verification_log_kinds: Record<string, string>;
  how_to_use: string[];
  deadline_kinds: Record<string, string>;
  derived_fields: Record<string, string>;
}

// --- Top level ------------------------------------------------------------

export interface ProgramsMeta {
  title: string;
  file: string;
  schema_version: string;
  generated: string;
  entry_cycle: string;
  source_document: { name: string; pages: number; note: string };
  verification: { dates_and_codes_checked: string; statement: string };
  counts: Record<string, number>;
  prepared: { changes: number; [key: string]: unknown };
}

export interface ProgramsData {
  meta: ProgramsMeta;
  legend: Legend;
  /** Keyed by source id (S_...). NOT an array — never .find() over it. */
  sources: Record<string, Source>;
  universities: University[];
  programs: Program[];
  supplementary_applications: SupplementaryApplication[];
  comparisons: unknown;
  contradictions: Contradiction[];
  verification: unknown;
}

// --- Gatekeeping ----------------------------------------------------------

export type GatekeepingModelId =
  | "at_the_door"
  | "two_years_in"
  | "hybrid"
  | "undetermined";

export type GatekeepingConfidence = "stated" | "derived" | "unknown";

export interface GatekeepingModelInfo {
  label: string;
  short: string;
  summary: string;
  detail: string;
}

export interface GatekeepingEvidence {
  quote: string;
  from: string;
}

export interface GatekeepingRecord extends ClaimEnvelope {
  model: GatekeepingModelId;
  confidence: GatekeepingConfidence;
  headline: string;
  what_happens_after_admission: string;
  evidence: GatekeepingEvidence[];
  /** Where present this is load-bearing, not decoration. */
  note: string | null;
}

export interface GatekeepingFraming {
  value: unknown;
  text: string;
  /** Which programs the original passage was written about. */
  scope: string;
  verbatim: string[];
  [key: string]: unknown;
}

export interface GatekeepingData {
  meta: unknown;
  models: Record<GatekeepingModelId, GatekeepingModelInfo>;
  framing: GatekeepingFraming;
  programs: Record<string, GatekeepingRecord>;
}
