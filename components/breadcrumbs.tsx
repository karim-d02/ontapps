import { ChevronLeft } from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/utils";

export interface Crumb {
  label: string;
  /** Omit on the last crumb — the current page is not a link to itself. */
  href?: string;
}

/**
 * Back link plus trail. Both, not one or the other: the back link is the
 * one-tap escape a phone reader wants, the trail is the orientation a reader
 * who arrived from a shared link or a search result wants.
 */
export function Breadcrumbs({
  items,
  back,
  className,
}: {
  items: Crumb[];
  /** The one-tap escape. Stated explicitly rather than derived from the trail,
   *  because the useful destination is usually the list two levels up, not the
   *  immediate parent. */
  back?: { label: string; href: string };
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {back && (
        <Link
          href={back.href}
          className="group/back inline-flex w-fit items-center gap-1 rounded-sm text-small text-muted-foreground outline-none transition-colors duration-150 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4 focus-visible:ring-offset-background motion-reduce:transition-none"
        >
          <ChevronLeft
            aria-hidden
            // -ml pulls the glyph's side bearing back so the label, not the
            // chevron, aligns with the column edge above and below it.
            className="-ml-1 size-4 transition-transform duration-150 group-hover/back:-translate-x-0.5 motion-reduce:transition-none"
          />
          {back.label}
        </Link>
      )}

      <nav aria-label="Breadcrumb">
        <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-label label-mono">
          {items.map((item, index) => {
            const last = index === items.length - 1;
            return (
              <li key={`${item.label}-${index}`} className="flex items-center gap-x-2">
                {index > 0 && (
                  <span aria-hidden className="text-silver">
                    /
                  </span>
                )}
                {item.href && !last ? (
                  <Link
                    href={item.href}
                    className="rounded-sm text-silver outline-none transition-colors duration-150 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4 focus-visible:ring-offset-background motion-reduce:transition-none"
                  >
                    {item.label}
                  </Link>
                ) : (
                  <span aria-current={last ? "page" : undefined} className="text-foreground">
                    {item.label}
                  </span>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
    </div>
  );
}
