import type { SupplementaryApplication } from "@/types/schema";

export interface ClusterPoint {
  /** Numeric x position — midpoint of the supp app score band. */
  x: number;
  /** Numeric y position. Approximate: McMaster publishes ranges, not figures. */
  y: number;
  /** Bubble radius, scaled by sqrt of count so area is proportional. */
  r: number;
  /** Axis label in McMaster's own wording. Never a number we invented. */
  scoreLabel: string;
  gpaLabel: string;
  outcome: string;
  /** null when McMaster has not published a count. Never coerce to 0. */
  count: number | null;
  /** True when count is null — render outlined/dashed, not filled. */
  unpublished: boolean;
}

/**
 * Maps McMaster's published GPA wording to approximate y positions.
 *
 * These positions exist only to order the points vertically. They are NOT
 * data. The axis renders `gpaLabel`, never these numbers, and the chart
 * must carry a caption saying positions are approximate.
 */
const GPA_POSITIONS: Record<string, number> = {
  "90% and above": 90,
  "Low 90s and above": 91.6,
  "Mid 90s and above": 95,
  "High 90s and above": 98,
};

/** Midpoint of each supp app score band, for horizontal placement. */
const SCORE_POSITIONS: Record<string, number> = {
  "80–84": 82,
  "85–89": 87,
  "90–94": 92,
  ">95": 97,
};

const MIN_RADIUS = 12;
const RADIUS_SCALE = 2.1;

/**
 * Clusters now live on the supplementary application rather than the program:
 * supp.weighting.value.clusters, present only on mcmaster-bhsc-supp.
 */
export function toClusterPoints(
  supp: SupplementaryApplication,
): ClusterPoint[] | null {
  const clusters = supp.required ? supp.weighting?.value?.clusters : undefined;
  if (!clusters?.length) return null;

  const points = clusters.map((c) => {
    const y = GPA_POSITIONS[c.gpa ?? ""];
    const x = SCORE_POSITIONS[c.supp_app_score ?? ""];
    if (y === undefined || x === undefined) return null;

    const count = typeof c.count === "number" ? c.count : null;

    return {
      x,
      y,
      r: count === null ? MIN_RADIUS : Math.sqrt(count) * RADIUS_SCALE,
      scoreLabel: c.supp_app_score ?? "",
      gpaLabel: c.gpa ?? "",
      outcome: c.outcome ?? "",
      count,
      unpublished: count === null,
    } satisfies ClusterPoint;
  });

  const resolved = points.filter((p): p is ClusterPoint => p !== null);

  // If any cluster failed to map, the data has wording we don't recognise.
  // Render nothing rather than a chart that silently drops a row.
  return resolved.length === clusters.length ? resolved : null;
}

/** Axis ticks, in McMaster's wording. Feed these to the y axis, not numbers. */
export function gpaTicks(points: ClusterPoint[]) {
  return points
    .map((p) => ({ value: p.y, label: p.gpaLabel.replace(" and above", "") }))
    .sort((a, b) => a.value - b.value);
}

export function scoreTicks(points: ClusterPoint[]) {
  return points
    .map((p) => ({ value: p.x, label: p.scoreLabel }))
    .sort((a, b) => a.value - b.value);
}
