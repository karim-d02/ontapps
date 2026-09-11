// Fallback renderer for one-off fields. Dumps an arbitrary object as nested
// definition lists: null becomes "Not published", missing (undefined) fields
// are dropped entirely, booleans become Yes/No, arrays and nested objects
// recurse. Field labels are derived from camelCase keys.

import { Pill } from "@/components/ui/pill";
import { cn } from "@/lib/utils";

function labelFromKey(key: string): string {
  const spaced = key
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function isEmptyValue(value: unknown): boolean {
  if (value === undefined) return true;
  if (Array.isArray(value)) return value.length === 0;
  if (value !== null && typeof value === "object") {
    return Object.values(value as Record<string, unknown>).every(isEmptyValue);
  }
  return false;
}

function DetailValueView({ value, depth = 0 }: { value: unknown; depth?: number }) {
  if (value === null) {
    return <Pill>Not published</Pill>;
  }
  if (typeof value === "boolean") {
    return <span>{value ? "Yes" : "No"}</span>;
  }
  if (typeof value === "string" || typeof value === "number") {
    return <span>{value}</span>;
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return null;
    return (
      <ul className="space-y-1.5">
        {value.map((item, index) => (
          <li key={index} className="text-body text-foreground">
            <DetailValueView value={item} depth={depth} />
          </li>
        ))}
      </ul>
    );
  }
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).filter(
      ([, v]) => !isEmptyValue(v)
    );
    if (entries.length === 0) return null;
    return (
      <dl className={cn("space-y-2.5", depth > 0 && "mt-1.5 border-l border-border/60 pl-3")}>
        {entries.map(([key, v]) => (
          <div key={key}>
            <dt className="text-small text-muted-foreground">{labelFromKey(key)}</dt>
            <dd className="mt-0.5 text-body text-foreground">
              <DetailValueView value={v} depth={depth + 1} />
            </dd>
          </div>
        ))}
      </dl>
    );
  }
  return null;
}

export function hasDetails(data: Record<string, unknown>): boolean {
  return Object.entries(data).some(([, value]) => !isEmptyValue(value));
}

export function GenericDetails({ data }: { data: Record<string, unknown> }) {
  const entries = Object.entries(data).filter(([, value]) => !isEmptyValue(value));
  if (entries.length === 0) return null;

  return (
    <dl className="space-y-3">
      {entries.map(([key, value]) => (
        <div key={key}>
          <dt className="text-small text-muted-foreground">{labelFromKey(key)}</dt>
          <dd className="mt-0.5 text-body text-foreground">
            <DetailValueView value={value} />
          </dd>
        </div>
      ))}
    </dl>
  );
}
