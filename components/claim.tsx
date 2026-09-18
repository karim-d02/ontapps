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
function isCertified(status: VerificationStatus): boolean {
  return status === "certified";
}

/** Claim types that must never be presented as official. */
function isUnofficialVoice(claimType: string): boolean {
  return (
    claimType === "community" ||
    claimType === "third_party" ||
    claimType === "secondary_press"
  );
}

export function ClaimQualifier({ claim }: { claim: ClaimEnvelope }) {
  const showStatus = !isCertified(claim.verification.status);
  const showType = claim.claim_type !== "official";

  if (!showStatus && !showType) return null;

  return (
    <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1 align-middle">
      {showType && (
        <span
          className="text-label label-mono font-normal text-silver"
          title={getClaimTypeLabel(claim.claim_type)}
        >
          {humanise(claim.claim_type)}
        </span>
      )}
      {showStatus && (
        <span
          className="text-label label-mono font-normal text-silver"
          title={getVerificationStatusLabel(claim.verification.status)}
        >
          {humanise(claim.verification.status)}
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

  const unofficial = isUnofficialVoice(claim.claim_type);

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
      {claim.verification.note && (
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
    !isCertified(claim.verification.status) || claim.claim_type !== "official";
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
