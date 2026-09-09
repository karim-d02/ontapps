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

  const suppApp = program.suppApp;
  const keyLine = suppApp.required ? suppApp.weighting.keyLine : undefined;
  const clustersSource = suppApp.required
    ? suppApp.weighting.clustersSource
    : undefined;

  const sortedPoints = [...points].sort((a, b) => a.x - b.x);
  const minY = Math.min(...sortedPoints.map((p) => p.y));
  const yOffset = minY - Y_PAD_BELOW_MIN;

  const data = sortedPoints.map((point, index) => ({
    __x: dateFromScore(point.x),
    [`p${index}`]: point.y - yOffset,
  }));

  return (
    <div className="mt-4">
      {keyLine && (
        <p className="text-body font-medium text-foreground">{keyLine}</p>
      )}
      <ScatterChart
        aspectRatio="4 / 3"
        className="mt-4"
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
      <p className="mt-5 text-small text-muted-foreground">
        Positions are approximate.
        {clustersSource && <> Source: {clustersSource}</>}
      </p>
    </div>
  );
}
