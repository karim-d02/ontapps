import {
  getGatekeepingFor,
  getGatekeepingModel,
} from "@/lib/data";
import { Pill } from "@/components/ui/pill";
import { cn } from "@/lib/utils";
import type { GatekeepingRecord } from "@/types/schema";

/**
 * The gatekeeping badge: when does this program evaluate you?
 *
 * No university publishes this framing. Every record in gatekeeping.json is
 * `claim_type: "editorial"` — author analysis — so it is labelled as analysis
 * wherever it appears and never styled to look like a university statement.
 *
 * Three rules are enforced here rather than at the call sites:
 *
 *  - Wording comes from `models[...]`, never hardcoded.
 *  - `confidence: "derived"` (9 of 16) carries a visible "inferred" marker.
 *  - `model: "undetermined"` (2 of 16) never renders as "no gate", "gated at
 *    the door", or anything reassuring. The data does not establish whether a
 *    gate exists, and defaulting an unknown to "you're safe" is the one error
 *    a student would actually act on.
 */

export function GatekeepingBadge({
  programId,
  className,
}: {
  programId: string;
  className?: string;
}) {
  const record = getGatekeepingFor(programId);
  if (!record) return null;

  const model = getGatekeepingModel(record.model);
  if (!model) return null;

  const undetermined = record.model === "undetermined";
  const derived = record.confidence === "derived";

  return (
    <span className={cn("inline-flex flex-wrap items-center gap-2", className)}>
      <Pill
        tone={undetermined ? "muted" : "default"}
        wrap
        title={`${model.summary} — editorial analysis, not a university statement.`}
      >
        {model.label}
      </Pill>
      {derived && (
        <span
          className="text-label label-mono text-silver"
          title="Not stated by the source document — inferred from structural facts about the program."
        >
          inferred
        </span>
      )}
      <span
        className="text-label label-mono text-silver"
        title="Author analysis, not a university statement."
      >
        analysis
      </span>
    </span>
  );
}

/**
 * The evidence behind the badge, reachable on every program page.
 *
 * AGENTS.md: "A student who doubts the badge should be able to open it and see
 * exactly what it rests on." So this is a plain <details> — keyboard
 * reachable, no motion, no scroll trickery.
 */
export function GatekeepingPanel({ programId }: { programId: string }) {
  const record = getGatekeepingFor(programId);
  if (!record) return null;

  const model = getGatekeepingModel(record.model);
  const undetermined = record.model === "undetermined";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <GatekeepingBadge programId={programId} />
      </div>

      <p className="measure text-body text-foreground">{record.headline}</p>

      {/* For an undetermined record the open question IS the content, and the
          note is load-bearing rather than decoration. */}
      {record.what_happens_after_admission && (
        <p
          className={cn(
            "measure text-body",
            undetermined ? "text-muted-foreground" : "text-foreground",
          )}
        >
          {record.what_happens_after_admission}
        </p>
      )}

      {record.note && (
        <p className="measure border-l-2 border-silver pl-4 text-small text-muted-foreground">
          {record.note}
        </p>
      )}

      {model && !undetermined && (
        <p className="measure text-small text-muted-foreground">{model.detail}</p>
      )}

      {record.evidence.length > 0 && (
        <details className="group border-t border-line pt-4">
          <summary className="cursor-pointer list-none text-label label-mono text-silver outline-none transition-colors duration-150 hover:text-silver-light focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none">
            What this rests on ({record.evidence.length})
          </summary>
          <ul className="mt-4 flex flex-col gap-4">
            {record.evidence.map((evidence, index) => (
              <li key={index} className="border-l-2 border-line pl-4">
                <p className="measure text-small text-foreground">{evidence.quote}</p>
                <p className="mt-1.5 text-label label-mono text-silver">
                  {evidence.from}
                </p>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

/** Short model label for cards and filters. Wording from the data. */
export function gatekeepingLabel(record: GatekeepingRecord): string | null {
  return getGatekeepingModel(record.model)?.label ?? null;
}
