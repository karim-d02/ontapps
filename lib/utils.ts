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
      "font-size": [
        { text: ["display", "h1", "h2", "h3", "metric", "body", "small", "label"] },
      ],
    },
  },
});

// formatDate now lives in lib/deadlines.ts alongside the rest of the date
// system. The version that used to live here built a Date from local Y/M/D,
// which drifts by a day across timezones — not something a deadline site can
// afford two implementations of.
