import { cn } from "@/lib/utils";

export interface SectionHeaderProps {
  /** Small mono eyebrow shown above the heading. */
  label?: string;
  title: string;
  /** 1 = page title (uppercase, metallic gradient), 2 = section, 3 = subsection. */
  level?: 1 | 2 | 3;
  className?: string;
  titleClassName?: string;
  /**
   * Word-by-word entrance stagger (40ms/word) instead of the whole line
   * arriving at once. Landing-page hero only — content pages get a single
   * whole-page fade+rise, not per-element animation (see app/page.tsx vs.
   * the content pages for the reasoning).
   */
  animateWords?: boolean;
}

const LEVEL_TAG = { 1: "h1", 2: "h2", 3: "h3" } as const;

const LEVEL_CLASS = {
  1: "text-h1 uppercase text-metallic",
  2: "text-h2 text-foreground",
  // Level 3 is a real subsection heading now, not a 13px uppercase caption.
  // The mono-uppercase eyebrow role it used to play is what `label` is for.
  3: "text-h3 text-foreground",
} as const;

export function SectionHeader({
  label,
  title,
  level = 2,
  className,
  titleClassName,
  animateWords,
}: SectionHeaderProps) {
  const Tag = LEVEL_TAG[level];
  const words = animateWords ? title.split(" ") : null;
  // background-clip: text doesn't inherit to child elements, so once the
  // heading's direct text is split into word spans for the stagger, each
  // span needs its own copy of the gradient clip — otherwise the parent's
  // gradient has no text left to clip to and the whole heading goes blank.
  const isMetallic = level === 1;

  return (
    <div className={className}>
      {label && <p className="text-label label-mono text-silver">{label}</p>}
      <Tag className={cn(LEVEL_CLASS[level], label && "mt-1", titleClassName)}>
        {words
          ? words.map((word, index) => (
              <span
                key={index}
                className={cn(
                  "inline-block motion-safe:animate-fade-rise",
                  isMetallic && "text-metallic"
                )}
                style={{ animationDelay: `${index * 40}ms` }}
              >
                {word}
                {index < words.length - 1 ? " " : ""}
              </span>
            ))
          : title}
      </Tag>
    </div>
  );
}
