import { cn } from "@/lib/utils";

export interface StatProps {
  value: React.ReactNode;
  label: string;
  /** sm = inline header stats, md = section figures, lg = display-scale (landing grid). */
  size?: "sm" | "md" | "lg";
  /** Renders the label under the value instead of above it. */
  labelPosition?: "above" | "below";
  className?: string;
}

/**
 * A labelled value. Every size is monospaced and tabular, because everything a
 * Stat holds is a fact — a count, an average, a status — and mono is how this
 * site says so. `lg` is the display metric: one figure, set large, nothing
 * else competing with it.
 */
const SIZE_CLASS = {
  sm: "text-body font-semibold text-foreground",
  md: "text-h3 font-semibold text-foreground",
  lg: "text-metric text-foreground",
} as const;

export function Stat({
  value,
  label,
  size = "sm",
  labelPosition = "below",
  className,
}: StatProps) {
  const labelEl = (
    <p
      className={cn(
        "text-label label-mono text-silver select-none",
        labelPosition === "below" ? "mt-2" : "mb-2"
      )}
    >
      {label}
    </p>
  );

  return (
    <div className={className}>
      {labelPosition === "above" && labelEl}
      {/*
        select-none on both halves: display figures are for reading, not for
        copying, and a drag across a card used to leave a half-highlighted
        number behind — which reads as a broken control, not as selected text.
      */}
      <p className={cn("data select-none", SIZE_CLASS[size])}>{value}</p>
      {labelPosition === "below" && labelEl}
    </div>
  );
}
