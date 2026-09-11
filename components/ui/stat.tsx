import { cn } from "@/lib/utils";

export interface StatProps {
  value: React.ReactNode;
  label: string;
  /** sm = inline header stats, md = section figures, lg = display-scale (landing grid). */
  size?: "sm" | "md" | "lg";
  className?: string;
}

const SIZE_CLASS = {
  sm: "text-lg font-semibold text-foreground",
  md: "text-xl font-semibold tracking-tight text-foreground",
  lg: "text-display uppercase text-metallic",
} as const;

export function Stat({ value, label, size = "sm", className }: StatProps) {
  return (
    <div className={className}>
      <p className={cn(SIZE_CLASS[size], "tabular-nums")}>{value}</p>
      <p className="mt-1 text-label label-mono text-silver">{label}</p>
    </div>
  );
}
