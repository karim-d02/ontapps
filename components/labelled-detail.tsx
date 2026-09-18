import { Claim, ClaimList } from "@/components/claim";
import type { ClaimEnvelope } from "@/types/schema";

// The generic labelled-detail renderer.
//
// AGENTS.md: first-class fields get a designed treatment; everything else —
// the long tail of ~50 supplementary-application subfields, 28 of which occur
// exactly once, plus the one-off program fields — falls through here rather
// than getting a bespoke layout each. Promoting one of these to a first-class
// treatment is a decision for a human, not something to do while migrating.
//
// It renders nothing at all when there is nothing to show, because "never
// render a heading with nothing beneath it" is a rule in the contract.

type MaybeClaim = (ClaimEnvelope & { text?: string }) | null | undefined;

function isRenderableClaim(value: unknown): value is ClaimEnvelope & {
  text?: string;
} {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const candidate = value as { claim_type?: unknown; verification?: unknown };
  return (
    typeof candidate.claim_type === "string" &&
    typeof candidate.verification === "object" &&
    candidate.verification !== null
  );
}

/** Field name -> human label. Mechanical; introduces no new wording. */
export function humaniseFieldName(field: string): string {
  const spaced = field.replace(/_/g, " ");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

export function LabelledDetail({
  label,
  claim,
  showSources = false,
}: {
  label: string;
  claim: MaybeClaim;
  showSources?: boolean;
}) {
  if (!claim) return null;
  // A claim with no displayable body would leave the label stranded.
  if (!claim.text) return null;

  return (
    <div>
      <p className="text-label label-mono text-silver">{label}</p>
      <div className="mt-2">
        <Claim claim={claim} showSources={showSources} />
      </div>
    </div>
  );
}

export function LabelledDetailList({
  label,
  claims,
  showSources = false,
}: {
  label: string;
  claims: Array<ClaimEnvelope & { text?: string }> | null | undefined;
  showSources?: boolean;
}) {
  const renderable = (claims ?? []).filter((claim) => Boolean(claim?.text));
  if (renderable.length === 0) return null;

  return (
    <div>
      <p className="text-label label-mono text-silver">{label}</p>
      <div className="mt-2">
        <ClaimList claims={renderable} showSources={showSources} />
      </div>
    </div>
  );
}

/**
 * The fall-through for a bag of unknown fields (the supplementary-application
 * tail). Anything that is a claim, or an array of claims, renders through the
 * same envelope; anything else is skipped rather than guessed at.
 */
export function GenericDetails({
  record,
  skip = [],
  showSources = false,
}: {
  record: Record<string, unknown>;
  /** Field names already given a first-class treatment above. */
  skip?: string[];
  showSources?: boolean;
}) {
  const skipSet = new Set(skip);
  const entries: React.ReactNode[] = [];

  for (const [field, value] of Object.entries(record)) {
    if (skipSet.has(field)) continue;
    if (value === null || value === undefined) continue;

    if (isRenderableClaim(value)) {
      entries.push(
        <LabelledDetail
          key={field}
          label={humaniseFieldName(field)}
          claim={value}
          showSources={showSources}
        />,
      );
      continue;
    }

    if (Array.isArray(value) && value.length > 0 && value.every(isRenderableClaim)) {
      entries.push(
        <LabelledDetailList
          key={field}
          label={humaniseFieldName(field)}
          claims={value}
          showSources={showSources}
        />,
      );
    }
  }

  if (entries.length === 0) return null;

  return <div className="flex flex-col gap-8">{entries}</div>;
}
