import { LiveDays } from "@/components/live-days";
import { Pill } from "@/components/ui/pill";
import { formatDate, type DatedItem } from "@/lib/deadlines";
import { cn } from "@/lib/utils";

/**
 * The one way a date is rendered on this site.
 *
 * Every state gets a distinct treatment, and the treatment is identical
 * wherever the state appears — a card, a timeline row, the landing page. The
 * urgency is carried by weight and by the status word next to the figure, not
 * by colour: at a glance, a bold date with "3 days left" beside it separates
 * from a regular-weight date with "126 days left" the same way a departure
 * board separates DELAYED from ON TIME.
 */

export type DateStampSize = "sm" | "md" | "lg";

const DATE_SIZE: Record<DateStampSize, string> = {
  sm: "text-small",
  md: "text-body",
  lg: "text-metric",
};

const STATUS_SIZE: Record<DateStampSize, string> = {
  sm: "text-label",
  md: "text-label",
  lg: "text-h3",
};

/** Weight and colour per state — the whole urgency ladder, in one place. */
const DATE_TONE = {
  imminent: "font-bold text-foreground",
  soon: "font-semibold text-foreground",
  later: "font-medium text-foreground",
  past: "font-normal text-muted-foreground line-through decoration-silver-dark",
} as const;

const STATUS_TONE = {
  imminent: "font-bold text-silver-light",
  soon: "font-semibold text-silver",
  later: "font-normal text-silver",
  past: "font-normal text-silver",
} as const;

export function DateStamp({
  item,
  size = "md",
  className,
}: {
  item: DatedItem;
  size?: DateStampSize;
  className?: string;
}) {
  // Unpublished and rolling are genuinely different facts and must never
  // collapse into each other: one means the university hasn't said, the other
  // means it has said "a window, not a day".
  if (item.state === "unpublished") {
    return (
      <span className={className}>
        <Pill>Not yet published</Pill>
      </span>
    );
  }

  // A previous cycle's date. Shown only with the label that says so — never
  // as an upcoming date, and never in a countdown.
  if (item.state === "prior_cycle") {
    return (
      <span className={className}>
        <Pill tone="muted">Last cycle</Pill>
      </span>
    );
  }

  if (item.state === "rolling") {
    return (
      <span className={className}>
        <Pill tone="muted">No single date</Pill>
      </span>
    );
  }

  const tone = DATE_TONE[item.state];
  const statusTone = STATUS_TONE[item.state];

  return (
    <span className={cn("flex flex-wrap items-baseline gap-x-3 gap-y-1", className)}>
      <time
        dateTime={item.date!}
        className={cn("data whitespace-nowrap", DATE_SIZE[size], tone)}
      >
        {formatDate(item.date!)}
      </time>
      <LiveDays
        iso={item.date!}
        initialDays={item.daysRemaining!}
        className={cn(
          "data whitespace-nowrap uppercase",
          STATUS_SIZE[size],
          statusTone,
          size === "lg" && "tracking-[0.08em]"
        )}
      />
    </span>
  );
}
