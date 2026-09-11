import { cn } from "@/lib/utils";

export interface CardProps extends Omit<React.HTMLAttributes<HTMLElement>, "className"> {
  /** Renders an `<li>` instead of a `<div>` — for cards inside a `<ul>` grid. */
  as?: "div" | "li";
  /**
   * For cards whose whole surface is a link. Adds the pointer cursor, the
   * hover lift + border brighten, and a focus ring driven by the link inside
   * it — see ProgramCard for the overlay-link pattern this pairs with.
   */
  interactive?: boolean;
  className?: string;
}

export function Card({ as: Tag = "div", interactive, className, children, ...props }: CardProps) {
  return (
    <Tag
      data-slot="card"
      className={cn(
        // surface-lit is the material: a 1px top edge, lit from above. It's
        // what separates a raised surface from a grey rectangle.
        "surface-lit rounded-xl border border-border bg-card p-5",
        "transition-[translate,border-color] duration-150 ease-out motion-reduce:transition-none",
        interactive && [
          // card-glow is the cursor-tracked highlight; see PointerLight.
          "group/card card-glow cursor-pointer",
          "hover:-translate-y-0.5 hover:border-line-strong motion-reduce:hover:translate-y-0",
          // The focus ring belongs to the card, not the 1px-tall overlay link
          // inside it, or keyboard users get a ring around nothing.
          "has-[a:focus-visible]:ring-2 has-[a:focus-visible]:ring-ring has-[a:focus-visible]:ring-offset-2 has-[a:focus-visible]:ring-offset-background has-[a:focus-visible]:outline-none",
        ],
        className
      )}
      {...props}
    >
      {children}
    </Tag>
  );
}
