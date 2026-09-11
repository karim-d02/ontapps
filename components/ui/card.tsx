import { cn } from "@/lib/utils";

export interface CardProps extends Omit<React.HTMLAttributes<HTMLElement>, "className"> {
  /** Renders an `<li>` instead of a `<div>` — for cards inside a `<ul>` grid. */
  as?: "div" | "li";
  /** Adds the hover lift + border brighten used for clickable cards. */
  interactive?: boolean;
  className?: string;
}

export function Card({ as: Tag = "div", interactive, className, children, ...props }: CardProps) {
  return (
    <Tag
      data-slot="card"
      className={cn(
        "rounded-xl border border-border/60 bg-card p-5 transition-[translate,border-color] duration-150 ease-out motion-reduce:transition-none",
        interactive && "hover:-translate-y-0.5 hover:border-silver-light/60 motion-reduce:hover:translate-y-0",
        className
      )}
      {...props}
    >
      {children}
    </Tag>
  );
}
