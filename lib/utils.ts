import { createCn } from "cn/config";

// The stock `cn` engine doesn't know about our custom type-scale tokens
// (text-display/h1/h2/h3/body/small/label, defined in app/globals.css) and
// defaults unrecognized `text-*` classes to the text-color group — which
// means combining e.g. `text-h1` with `text-foreground` in the same cn()
// call silently drops `text-h1` as a "conflicting" color utility. Registering
// them under font-size fixes that for every component in the app.
export const cn = createCn({
  extend: {
    classGroups: {
      "font-size": [{ text: ["display", "h1", "h2", "h3", "body", "small", "label"] }],
    },
  },
});

export function formatDate(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
