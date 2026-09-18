import { getProgramById } from "@/lib/data";
import type { Program } from "@/types/schema";

/**
 * Programs that split in two when the data schema changed.
 *
 * Both old URLs are live on the internet — people have shared them — and both
 * now name something that no longer exists as a single program. They are NOT
 * redirected: a redirect would pick one successor, and picking is exactly the
 * thing we are avoiding. Each serves a 200 with the choice on the page.
 *
 * This list is deliberately closed. It describes two historical URLs, not a
 * general mechanism; if a third program ever splits, adding it here is a
 * decision someone should make on purpose.
 */
export interface SplitProgram {
  /** University slug, unchanged by the migration. */
  school: string;
  /** The retired program id, as it appears in shared links. */
  id: string;
  /** What it became. Order is the order they are offered on the page. */
  successorIds: string[];
}

export const SPLIT_PROGRAMS: SplitProgram[] = [
  {
    school: "university-of-toronto",
    id: "uoft-engineering",
    successorIds: ["uoft-engineering-trackone", "uoft-engineering-core8-engsci"],
  },
  {
    school: "mcmaster-university",
    id: "mcmaster-engineering",
    successorIds: ["mcmaster-engineering-i", "mcmaster-ibiomed"],
  },
];

export function getSplitProgram(
  school: string,
  id: string,
): SplitProgram | undefined {
  return SPLIT_PROGRAMS.find(
    (split) => split.school === school && split.id === id,
  );
}

/** The successor programs, resolved. Skips any id the data no longer has. */
export function getSuccessors(split: SplitProgram): Program[] {
  return split.successorIds
    .map((id) => getProgramById(id))
    .filter((program): program is Program => Boolean(program));
}

/** Every split URL, for generateStaticParams. */
export function getSplitParams(): { school: string; id: string }[] {
  return SPLIT_PROGRAMS.map(({ school, id }) => ({ school, id }));
}

/** True when this path is a split URL rather than a real program. */
export function isSplitPath(school: string, id: string): boolean {
  return Boolean(getSplitProgram(school, id));
}
