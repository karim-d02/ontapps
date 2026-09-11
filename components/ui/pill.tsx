import { cn } from "@/lib/utils";

export interface PillProps extends React.ComponentProps<"span"> {
  /**
   * `default` matches the gatekeeping/"not yet published" weight (bright
   * silver-light text, silver border). `muted` matches the quieter
   * rubric-band/question-type weight (muted-foreground text, border color).
   */
  tone?: "default" | "muted";
  /**
   * Lets the label wrap instead of forcing one line. For content-derived
   * labels that can be a full clause — "One non-math, non-science,
   * non-technology 4U/M credit" is a real value in the dataset, and as a
   * nowrap chip it ran 408px wide inside a 343px phone column and gave the
   * whole page a horizontal scrollbar.
   */
  wrap?: boolean;
}

export function Pill({ tone = "default", wrap, className, children, ...props }: PillProps) {
  return (
    <span
      data-slot="pill"
      className={cn(
        "inline-flex w-fit shrink-0 items-center rounded-full border px-2.5 py-0.5 text-small font-mono uppercase whitespace-nowrap transition-colors duration-150 motion-reduce:transition-none",
        tone === "default"
          ? "border-silver/50 text-silver-light"
          : "border-border text-muted-foreground",
        wrap && "max-w-full shrink whitespace-normal",
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
