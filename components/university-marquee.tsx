import { cn } from "@/lib/utils";
import { UNIVERSITIES, UniversityWordmark } from "@/components/university-wordmark";

function UniversitySet({ duplicate }: { duplicate?: boolean }) {
  return (
    <ul
      aria-hidden={duplicate || undefined}
      className={cn(
        "flex shrink-0 items-center gap-x-section-lg pr-section-lg",
        duplicate && "motion-reduce:hidden"
      )}
    >
      {UNIVERSITIES.map((university) => (
        <li key={university.name}>
          <UniversityWordmark name={university.name} mark={university.mark} />
        </li>
      ))}
    </ul>
  );
}

/**
 * Duplicates the list once so the track can translate by exactly -50% and
 * loop seamlessly; the duplicate is aria-hidden and, under
 * prefers-reduced-motion, hidden entirely so only one static row remains.
 */
export function UniversityMarquee() {
  return (
    <div className="overflow-hidden motion-safe:[mask-image:linear-gradient(to_right,transparent,black_2rem,black_calc(100%-2rem),transparent)]">
      <div className="flex w-max motion-safe:animate-marquee motion-safe:hover:[animation-play-state:paused]">
        <UniversitySet />
        <UniversitySet duplicate />
      </div>
    </div>
  );
}
