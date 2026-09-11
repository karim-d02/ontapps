import { cn } from "@/lib/utils";

export interface PillProps extends React.ComponentProps<"span"> {
  /**
   * `default` matches the gatekeeping/"not yet published" weight (bright
   * silver-light text, silver border). `muted` matches the quieter
   * rubric-band/question-type weight (muted-foreground text, border color).
   */
  tone?: "default" | "muted";
}

export function Pill({ tone = "default", className, children, ...props }: PillProps) {
  return (
    <span
      data-slot="pill"
      className={cn(
        "inline-flex w-fit shrink-0 items-center rounded-full border px-2.5 py-0.5 text-small font-mono uppercase whitespace-nowrap transition-colors duration-150 motion-reduce:transition-none",
        tone === "default"
          ? "border-silver/50 text-silver-light"
          : "border-border text-muted-foreground",
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
