import Link from "next/link";
import {
  getClaimTypeLabel,
  getContradictionsFor,
  getSourcesFor,
  getVerificationStatusLabel,
} from "@/lib/data";
import type { ClaimEnvelope, VerificationStatus } from "@/types/schema";
import { cn } from "@/lib/utils";

// The one component that renders the claim envelope. Every fact on this site
// goes through it, so the rules in AGENTS.md are enforced in exactly one place:
//
//  - only verification.status "certified" renders plain, with no qualifier
//  - every other status renders a visible label
//  - community / third_party never look official
//  - contradiction_ids non-empty shows the conflict marker and links to the record
//  - pdf_block_ids and log_ids are internal and never rendered
//
// Wording comes from `legend` in the data. The short badge text is the enum id
// humanised (a mechanical transform, nothing invented); the legend's sentence
// is the title, so the full meaning is always one hover away.

function humanise(id: string): string {
  const spaced = id.replace(/_/g, " ");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/** The only status that may render with no qualifier at all. */
function isCertified(status: VerificationStatus | undefined): boolean {
  // Absent verification is NOT certified. A missing field is unknown
  // provenance, and unknown never renders as though it had been checked.
  return status === "certified";
}

/**
 * Claim types ordered strongest to weakest.
 *
 * "Weakest" means least authoritative, and the order exists for one purpose: a
 * `mixed` claim is rendered at the weakest type it contains, so combining an
 * official statement with a community one can never make the community half
 * look official. Understating is safe here; overstating is not.
 *
 * internal_note is absent because it is filtered at the data layer and never
 * reaches a component.
 */
const CLAIM_TYPE_STRENGTH: string[] = [
  "official",
  "vendor",
  "secondary_press",
  "third_party",
  "community",
  "editorial",
];

/** The types a claim actually speaks with. A mixed claim lists several. */
function claimTypesOf(claim: ClaimEnvelope): string[] {
  if (claim.claim_type === "mixed" && Array.isArray(claim.contains)) {
    const contained = claim.contains.filter(
      (type) => type !== "internal_note",
    );
    if (contained.length > 0) return contained;
  }
  return [claim.claim_type];
}

/** The weakest type present — what the claim is styled as. */
function effectiveClaimType(claim: ClaimEnvelope): string {
  const types = claimTypesOf(claim);
  let weakest = types[0];
  let rank = -1;
  for (const type of types) {
    const index = CLAIM_TYPE_STRENGTH.indexOf(type);
    // An unrecognised type sorts weakest: it is not known to be official.
    const score = index === -1 ? CLAIM_TYPE_STRENGTH.length : index;
    if (score > rank) {
      rank = score;
      weakest = type;
    }
  }
  return weakest;
}

/** Claim types that must never be presented as official. */
function isUnofficialVoice(claimType: string): boolean {
  return claimType !== "official" && claimType !== "vendor";
}

export function ClaimQualifier({ claim }: { claim: ClaimEnvelope }) {
  const status = claim.verification?.status;
  const types = claimTypesOf(claim);

  // Every type in a mixed claim is surfaced, not just the one it is styled as,
  // so a reader can see it is part official and part something else.
  const showTypes = types.filter((type) => type !== "official");
  // No verification field at all: say so rather than saying nothing, because
  // saying nothing is how a certified claim renders.
  const unknownProvenance = claim.verification === undefined;
  const showStatus = !unknownProvenance && !isCertified(status);

  if (showTypes.length === 0 && !showStatus && !unknownProvenance) return null;

  return (
    <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1 align-middle">
      {showTypes.map((type) => (
        <span
          key={type}
          className="text-label label-mono font-normal text-silver"
          title={getClaimTypeLabel(type)}
        >
          {humanise(type)}
        </span>
      ))}
      {showStatus && status && (
        <span
          className="text-label label-mono font-normal text-silver"
          title={getVerificationStatusLabel(status)}
        >
          {humanise(status)}
        </span>
      )}
      {unknownProvenance && (
        <span
          className="text-label label-mono font-normal text-silver"
          title="This claim carries no verification record, so how it was checked is unknown."
        >
          Provenance unknown
        </span>
      )}
    </span>
  );
}

/**
 * Conflict marker. Never resolves the disagreement — it says one exists and
 * points at the record so the reader can see both sides.
 */
export function ClaimConflict({ claim }: { claim: ClaimEnvelope }) {
  const contradictions = getContradictionsFor(claim);
  if (contradictions.length === 0) return null;

  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      {contradictions.map((contradiction) => (
        <Link
          key={contradiction.id}
          href={`#contradiction-${contradiction.id}`}
          className="text-label label-mono text-silver-light underline underline-offset-4 transition-colors duration-150 hover:text-foreground motion-reduce:transition-none"
        >
          Sources disagree
        </Link>
      ))}
    </span>
  );
}

/**
 * Citations. A source with no `url` renders unlinked rather than inventing
 * one, and a source we did not re-check says so.
 */
export function ClaimSources({ claim }: { claim: ClaimEnvelope }) {
  const sources = getSourcesFor(claim);
  if (sources.length === 0) return null;

  return (
    <ul className="mt-2 flex flex-col gap-1">
      {sources.map(({ id, source }) => {
        const label = source.cited_as ?? source.title ?? source.publisher ?? id;
        return (
          <li key={id} className="text-small text-muted-foreground">
            {source.url ? (
              <a
                href={source.url}
                className="underline underline-offset-4 transition-colors duration-150 hover:text-foreground motion-reduce:transition-none"
                rel="noreferrer noopener"
                target="_blank"
              >
                {label}
              </a>
            ) : (
              <span>{label}</span>
            )}
            {source.url === null && source.url_note && (
              <span className="ml-2 text-label label-mono text-silver">
                {source.url_note}
              </span>
            )}
            {source.verified_by_us === false && (
              <span className="ml-2 text-label label-mono text-silver">
                not re-checked by us
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export interface ClaimProps {
  claim: ClaimEnvelope & { text?: string };
  /** Body override. Defaults to the claim's own `text`. */
  children?: React.ReactNode;
  /** Render the citation list beneath the body. */
  showSources?: boolean;
  /** Subordinate weight — used for community figures. */
  quiet?: boolean;
  className?: string;
}

export function Claim({
  claim,
  children,
  showSources = false,
  quiet = false,
  className,
}: ClaimProps) {
  const body = children ?? claim.text;
  if (body === undefined || body === null || body === "") return null;

  // Styled at the WEAKEST type a mixed claim contains, so the official half
  // of a mixed claim can never lend its weight to the rest.
  const unofficial =
    isUnofficialVoice(effectiveClaimType(claim)) ||
    claim.verification === undefined;

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <div
        className={cn(
          "measure text-body",
          quiet || unofficial ? "text-muted-foreground" : "text-foreground",
        )}
      >
        {body}
      </div>

      <ClaimMarkers claim={claim} />

      {/* The claim's own qualifying note, where the data carries one. */}
      {claim.note && (
        <p className="measure text-small text-muted-foreground">{claim.note}</p>
      )}

      {/* A verification note explains why a status is what it is. */}
      {claim.verification?.note && (
        <p className="measure text-small text-muted-foreground">
          {claim.verification.note}
        </p>
      )}

      {showSources && <ClaimSources claim={claim} />}
    </div>
  );
}

/** Qualifier + conflict marker on one row. Useful when the body is bespoke. */
export function ClaimMarkers({ claim }: { claim: ClaimEnvelope }) {
  const hasQualifier =
    claim.verification === undefined ||
    !isCertified(claim.verification.status) ||
    claim.claim_type !== "official";
  const hasConflict = claim.contradiction_ids.length > 0;
  if (!hasQualifier && !hasConflict) return null;

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
      <ClaimQualifier claim={claim} />
      <ClaimConflict claim={claim} />
    </div>
  );
}

/** A list of claims, each through the same envelope. */
export function ClaimList({
  claims,
  showSources = false,
  quiet = false,
}: {
  claims: Array<ClaimEnvelope & { text?: string }>;
  showSources?: boolean;
  quiet?: boolean;
}) {
  if (claims.length === 0) return null;
  return (
    <ul className="flex flex-col gap-5">
      {claims.map((claim, index) => (
        <li key={index}>
          <Claim claim={claim} showSources={showSources} quiet={quiet} />
        </li>
      ))}
    </ul>
  );
}
