import { cn } from "@/lib/utils";

export interface DataColumn<T> {
  key: string;
  header: string;
  /**
   * Numeric columns align right and set in mono/tabular. Text columns align
   * left. Headers always match their column — a right-aligned figure under a
   * left-aligned header is the most common way a table looks wrong.
   */
  numeric?: boolean;
  /** Keeps a column from wrapping — short codes and figures only. */
  nowrap?: boolean;
  render: (row: T) => React.ReactNode;
}

/**
 * The one table on this site.
 *
 * Rules, applied here so they can't drift between the three places tables
 * appear (cluster weighting, rubric bands, year-three routes):
 *   · horizontal hairlines only — no vertical rules, no zebra striping
 *   · header row distinguished by weight and case, not by a filled background
 *   · generous row height; cramped tables are unreadable
 *   · numbers right, text left, headers matching their column
 *   · on mobile it becomes a stacked definition list rather than scrolling
 *     sideways — horizontal scroll inside a page is a failure state
 */
export function DataTable<T>({
  columns,
  rows,
  caption,
  rowKey,
  className,
}: {
  columns: DataColumn<T>[];
  rows: T[];
  /** Required: a table with no accessible description is a wall of numbers. */
  caption: string;
  rowKey: (row: T, index: number) => string;
  className?: string;
}) {
  if (rows.length === 0) return null;

  return (
    <div className={className}>
      {/* Desktop and tablet: a real table. */}
      <table className="hidden w-full border-collapse text-left sm:table">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="border-b border-line-strong">
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                className={cn(
                  "pb-3 text-label label-mono font-semibold text-silver",
                  column.numeric ? "text-right" : "text-left",
                  "first:pl-0 last:pr-0 px-3"
                )}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {columns.length > 0 &&
            rows.map((row, index) => (
              <tr key={rowKey(row, index)}>
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={cn(
                      // py-4 rather than py-2: a table of admission outcomes is
                      // read slowly, one row at a time.
                      "py-4 align-top text-body text-foreground first:pl-0 last:pr-0 px-3",
                      column.numeric ? "data text-right" : "text-left",
                      column.nowrap && "whitespace-nowrap"
                    )}
                  >
                    {column.render(row)}
                  </td>
                ))}
              </tr>
            ))}
        </tbody>
      </table>

      {/* Phone: the same rows as stacked label/value pairs. */}
      <ul className="flex flex-col gap-4 sm:hidden">
        <li className="sr-only">{caption}</li>
        {rows.map((row, index) => (
          <li
            key={rowKey(row, index)}
            className="surface-lit rounded-lg border border-line bg-card p-4"
          >
            <dl className="flex flex-col gap-2">
              {columns.map((column) => (
                <div
                  key={column.key}
                  className="flex items-baseline justify-between gap-4 border-b border-line pb-2 last:border-0 last:pb-0"
                >
                  <dt className="shrink-0 text-label label-mono text-silver">
                    {column.header}
                  </dt>
                  <dd
                    className={cn(
                      "text-right text-small text-foreground",
                      column.numeric && "data"
                    )}
                  >
                    {column.render(row)}
                  </dd>
                </div>
              ))}
            </dl>
          </li>
        ))}
      </ul>
    </div>
  );
}
