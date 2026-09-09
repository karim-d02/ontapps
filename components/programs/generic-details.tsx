// Fallback renderer for one-off fields. Dumps an arbitrary object as nested
// definition lists: null becomes "Not published", missing (undefined) fields
// are dropped entirely, booleans become Yes/No, arrays and nested objects
// recurse. Field labels are derived from camelCase keys.

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

function DetailValueView({ value }: { value: unknown }) {
  if (value === null) {
    return <>Not published</>;
  }
  if (typeof value === "boolean") {
    return <>{value ? "Yes" : "No"}</>;
  }
  if (typeof value === "string" || typeof value === "number") {
    return <>{value}</>;
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return null;
    return (
      <ul>
        {value.map((item, index) => (
          <li key={index}>
            <DetailValueView value={item} />
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
      <dl>
        {entries.map(([key, v]) => (
          <div key={key}>
            <dt>{labelFromKey(key)}</dt>
            <dd>
              <DetailValueView value={v} />
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
    <dl>
      {entries.map(([key, value]) => (
        <div key={key}>
          <dt>{labelFromKey(key)}</dt>
          <dd>
            <DetailValueView value={value} />
          </dd>
        </div>
      ))}
    </dl>
  );
}
