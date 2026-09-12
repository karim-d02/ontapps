"use client";

import { ScatterChart, Scatter } from "@/components/charts/scatter-chart";
import { chartCssVars, useChartStable, useYScale } from "@/components/charts/chart-context";
import { ChartTooltip } from "@/components/charts/tooltip/chart-tooltip";
import {
  type ClusterPoint,
  gpaTicks,
  scoreTicks,
  toClusterPoints,
} from "@/lib/cluster-chart-data";
import type { Program } from "@/types/program";

// Bklit's ScatterChart is a time-series chart: its x-scale only accepts Dates
// and its y-domain is forced to start at 0. Neither fits a score-vs-GPA
// bubble chart, so score values are mapped onto a synthetic, never-rendered
// Date axis (linear in ms, so spacing stays correct), and GPA values are
// shifted down by Y_PAD_BELOW_MIN before Y_OFFSET is applied so the chart
// keeps its scale.
function dateFromScore(x: number): Date {
  return new Date(2000, 0, x);
}

const Y_PAD_BELOW_MIN = 3;

function ClusterAxes({
  points,
  yOffset,
}: {
  points: ClusterPoint[];
  yOffset: number;
}) {
  const { innerHeight, innerWidth, xScale } = useChartStable();
  const yScale = useYScale();
  const xTicks = scoreTicks(points);
  const yTicks = gpaTicks(points);

  return (
    <g aria-hidden="true">
      {yTicks.map((tick) => {
        const cy = yScale(tick.value - yOffset) ?? 0;
        return (
          <g key={tick.value}>
            <line
              stroke={chartCssVars.grid}
              strokeDasharray="4,4"
              x1={0}
              x2={innerWidth}
              y1={cy}
              y2={cy}
            />
            <text
              dominantBaseline="middle"
              fill={chartCssVars.label}
              fontSize={11}
              textAnchor="end"
              x={-10}
              y={cy}
            >
              {tick.label}
            </text>
          </g>
        );
      })}
      {xTicks.map((tick) => {
        const cx = xScale(dateFromScore(tick.value)) ?? 0;
        return (
          <text
            fill={chartCssVars.label}
            fontSize={11}
            key={tick.value}
            textAnchor="middle"
            x={cx}
            y={innerHeight + 20}
          >
            {tick.label}
          </text>
        );
      })}
    </g>
  );
}

export function ClusterScatterChart({ program }: { program: Program }) {
  const points = toClusterPoints(program);
  if (!points || points.length === 0) {
    return null;
  }

  const sortedPoints = [...points].sort((a, b) => a.x - b.x);
  const minY = Math.min(...sortedPoints.map((p) => p.y));
  const yOffset = minY - Y_PAD_BELOW_MIN;

  const data = sortedPoints.map((point, index) => ({
    __x: dateFromScore(point.x),
    [`p${index}`]: point.y - yOffset,
  }));

  // The finding, stated in words. A scatter plot is invisible to a screen
  // reader no matter how well it's built, and "chart" as alt text tells a
  // reader nothing. This describes what the shape of the data means, and the
  // cluster table immediately below it carries the same figures row by row as
  // the accessible equivalent.
  const description = [
    `Scatter chart plotting supplementary application score against GPA for ${sortedPoints.length} outcome ${sortedPoints.length === 1 ? "cluster" : "clusters"}.`,
    ...sortedPoints.map(
      (point) =>
        `Supp app score ${point.scoreLabel} with GPA ${point.gpaLabel}: ${point.outcome}${
          point.count !== null ? `, ${point.count} offers` : ", count not published"
        }.`
    ),
    "The same figures are listed in the table below this chart.",
  ].join(" ");

  return (
    <figure className="mt-8">
      <div
        role="img"
        aria-label={description}
        // The SVG's own text (axis ticks) would otherwise be read out as a
        // meaningless run of numbers on top of the description.
        className="[&_svg]:pointer-events-auto"
      >
      <ScatterChart
        aspectRatio="4 / 3"
        data={data}
        margin={{ top: 16, right: 20, bottom: 32, left: 56 }}
        xDataKey="__x"
      >
        <ClusterAxes points={sortedPoints} yOffset={yOffset} />
        {sortedPoints.map((point, index) => (
          <Scatter
            dataKey={`p${index}`}
            fill={point.unpublished ? "none" : chartCssVars.markerForeground}
            key={`p${index}`}
            radius={point.r}
            ringGap={3}
            stroke={chartCssVars.markerForeground}
            strokeDasharray={point.unpublished ? "4 3" : undefined}
            strokeWidth={2}
          />
        ))}
        <ChartTooltip
          content={({ index }) => {
            const point = sortedPoints[index];
            if (!point) {
              return null;
            }
            return (
              <div className="px-3 py-2.5">
                <p className="font-medium text-chart-tooltip-foreground text-xs">
                  {point.scoreLabel} supp app · {point.gpaLabel}
                </p>
                <p className="mt-1 text-chart-tooltip-muted text-sm">
                  {point.outcome}
                </p>
                <p className="mt-1 text-chart-tooltip-foreground text-sm">
                  {point.count !== null
                    ? `${point.count} offers`
                    : "Count not published"}
                </p>
              </div>
            );
          }}
          showDatePill={false}
          showDots={false}
        />
      </ScatterChart>
      </div>
      <figcaption className="mt-5 text-small text-muted-foreground">
        Positions on this chart are approximate.
      </figcaption>
    </figure>
  );
}
