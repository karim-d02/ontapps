/**
 * Field coverage audit.
 *
 * Walks every program in data/programs.json, enumerates every non-null leaf
 * field path, and checks whether that value's text actually reaches the
 * rendered program page.
 *
 * Empirical, not static: it fetches the built page and looks for the value in
 * the visible text. A static read of the component would tell you which
 * fields are *referenced*; only this tells you which ones a student can
 * actually see. Roughly a third of the paths in this dataset appear on one or
 * two programs, and those are exactly the ones a component quietly drops.
 *
 * Usage:  npx next start -p 3100 &  node scripts/audit-fields.mjs
 *
 * Read-only. It never writes to data/programs.json.
 *
 * ── STUBBED DURING THE SCHEMA MIGRATION — see MIGRATION-REPORT.md ──────────
 *
 * Everything below the guard is written against the OLD schema. The
 * expectation tables are keyed by old field paths ("suppApp.weighting.type",
 * "averages[].type", "timeline[].critical", "ouacCodes[].code"), and each
 * entry encodes a real judgement about whether a given field is expected to
 * reach the page and in what rendered form. None of those paths exist any
 * more, but the judgements behind them are worth keeping, so the tables are
 * preserved here verbatim rather than deleted — rebuilding this script means
 * re-keying them onto the new paths, not reinventing them.
 *
 * The walk itself also needs rethinking rather than re-keying: in the new
 * schema almost every leaf sits inside a claim envelope, so a naive
 * enumeration reports `verification.log_ids` and `pdf_block_ids` as fields
 * that fail to render — which is correct behaviour, not a bug, since those are
 * internal and must never appear.
 */

import { readFile } from "node:fs/promises";

console.error(
  [
    "scripts/audit-fields.mjs is stubbed.",
    "",
    "It is written against the pre-migration schema and its expectation tables",
    "are keyed by field paths that no longer exist. The tables are preserved in",
    "this file so the judgements in them can be re-keyed rather than reinvented.",
    "See MIGRATION-REPORT.md.",
  ].join("\n"),
);
process.exit(0);

const BASE = process.env.AUDIT_BASE ?? "http://localhost:3100";

const raw = await readFile(new URL("../data/programs.json", import.meta.url), "utf8");
const data = JSON.parse(raw);

const slug = (s) =>
  s.toLowerCase().replace(/'/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

/** Every non-empty leaf path under an object, arrays collapsed to `[]`. */
function walk(value, path, out) {
  if (value === null || value === undefined) return;
  if (Array.isArray(value)) {
    if (value.length === 0) return;
    for (const item of value) walk(item, `${path}[]`, out);
    return;
  }
  if (typeof value === "object") {
    for (const [k, v] of Object.entries(value)) walk(v, path ? `${path}.${k}` : k, out);
    return;
  }
  out.push({ path, value });
}

const strip = (html) =>
  html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&#x27;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&mdash;|&#8212;/g, "—")
    .replace(/&ndash;|&#8211;/g, "–")
    .replace(/&nbsp;/g, " ")
    // Comparison operators matter here: cluster scores are ">95" and "<80".
    .replace(/&gt;/g, ">")
    .replace(/&lt;/g, "<")
    .replace(/&[a-z]+;/gi, " ")
    .replace(/\s+/g, " ");

/**
 * Splits a program page into its <section> anchors and returns the visible
 * text of each, keyed by section id.
 *
 * Presence on the page is not the bar — a field dumped into the generic
 * "Additional details" bin is technically rendered and practically lost. This
 * is what makes "does it reach the right place" answerable.
 */
async function pageSections(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} -> ${res.status}`);
  const html = await res.text();

  const marks = [...html.matchAll(/id="([a-z0-9-]+)"\s+data-anchor/g)].map((m) => ({
    id: m[1],
    at: m.index,
  }));

  const sections = { header: strip(html.slice(0, marks[0]?.at ?? html.length)) };
  marks.forEach((mark, i) => {
    const end = marks[i + 1]?.at ?? html.length;
    sections[mark.id] = strip(html.slice(mark.at, end));
  });
  sections.__all = strip(html);
  return sections;
}

const norm = (s) => String(s).replace(/\s+/g, " ").trim();

/**
 * Booleans and a handful of structural flags have no text of their own — they
 * choose between two renderings. Each is paired with the strings that prove
 * the page acted on it, so "false" can be verified as rigorously as a string.
 */
/**
 * Paths whose stored value is deliberately never printed verbatim.
 * Each needs a reason, so "not rendered" can't hide behind "intentional".
 */
const TRANSFORMED = {
  "applicants.source":
    'rendered as the qualifier "self-reported" rather than the raw enum "community"',
  "suppApp.weighting.type":
    "a discriminator that selects the weighting layout (cluster / unpublished / partial); not content",
  "averages[].type":
    "a discriminator that routes an entry to the official or community group; not content",
};

/** ISO dates are rendered in the reader's format, not as stored. */
function dateForms(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  const utc = new Date(Date.UTC(y, m - 1, d));
  return [
    iso,
    utc.toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }),
    utc.toLocaleDateString("en-CA", { weekday: "long", month: "long", day: "numeric", year: "numeric", timeZone: "UTC" }),
  ];
}

const BOOLEAN_EVIDENCE = {
  "suppApp.required": (v) => (v ? ["Required"] : ["No supplementary application"]),
  "suppApp.rubricPublished": (v) => (v ? ["Rubric published"] : ["Rubric published"]),
  "suppApp.questionsPublishedInAdvance": () => ["Questions published in advance"],
  "suppApp.deadline.confirmed": (v) => (v ? [] : ["Not yet published"]),
  "suppApp.formatUnconfirmed": () => ["Format not yet confirmed"],
  "suppApp.weighting.official": (v) =>
    v ? ["Officially published"] : ["Not officially published"],
  "adjustmentFactor.official": () => [],
  "aiScoring.official": () => [],
  "alternativeOffer.available": () => [],
  "timeline[].confirmed": () => [],
  "timeline[].critical": () => [],
  "averages[].type": () => [],
  "ouacCodes[].code": () => [],
  "suppApp.components[].type": () => [],
  "suppApp.known[].type": () => [],
  "suppApp.random[].type": () => [],
  "id": () => [],
  "category": () => [],
  "gatekeeping": () => [],
};

const results = new Map(); // path -> { programs: [], missing: [] }

for (const program of data.programs) {
  const url = `${BASE}/programs/${slug(program.school)}/${program.id}`;
  const sections = await pageSections(url);
  const text = sections.__all;

  const leaves = [];
  walk(program, "", leaves);

  for (const { path, value } of leaves) {
    if (!results.has(path)) results.set(path, { programs: [], missing: [], where: new Set() });
    const entry = results.get(path);
    entry.programs.push(program.id);

    // Where did it land? Anything whose only home is the generic bin counts
    // as misplaced, not as covered.
    if (typeof value === "string" && value.length > 3 && !TRANSFORMED[path]) {
      const needle = norm(value);
      for (const [id, body] of Object.entries(sections)) {
        if (id === "__all") continue;
        if (body.includes(needle) || body.includes(needle.slice(0, 45))) entry.where.add(id);
      }
    }

    let present;
    if (TRANSFORMED[path]) {
      present = null;
    } else if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      present = dateForms(value).some((form) => text.includes(form));
    } else if (typeof value === "boolean" || BOOLEAN_EVIDENCE[path]) {
      const proof = BOOLEAN_EVIDENCE[path]?.(value) ?? [];
      present = proof.length === 0 ? null : proof.some((p) => text.includes(p));
    } else {
      const needle = norm(value);
      // Long strings can be broken by inline markup; the opening clause is
      // enough to prove the field reached the page.
      present = text.includes(needle) || text.includes(needle.slice(0, 45));
    }

    if (present === false) entry.missing.push(program.id);
  }
}

const rows = [...results.entries()].sort((a, b) => a[0].localeCompare(b[0]));
const missing = rows.filter(([, r]) => r.missing.length > 0);

console.log(`${rows.length} distinct field paths across ${data.programs.length} programs\n`);
console.log("FIELD PATH".padEnd(46), "PROGRAMS".padEnd(9), "RENDERS");
console.log("-".repeat(94));
for (const [path, r] of rows) {
  const state = TRANSFORMED[path]
    ? `transformed — ${TRANSFORMED[path]}`
    : r.missing.length === 0
      ? "yes"
      : `NO on ${r.missing.length}/${r.programs.length}: ${[...new Set(r.missing)].join(", ")}`;
  console.log(path.padEnd(46), String(r.programs.length).padEnd(9), state);
}

console.log(`\n${missing.length} field path(s) not reaching the page:`);
for (const [path, r] of missing)
  console.log(`  ${path}  →  ${[...new Set(r.missing)].join(", ")}`);

const binned = rows.filter(
  ([, r]) => r.where.size > 0 && [...r.where].every((w) => w === "details")
);
console.log(`\n${binned.length} field path(s) reaching ONLY the generic details bin:`);
for (const [path, r] of binned)
  console.log(`  ${path}  (${r.programs.length}: ${[...new Set(r.programs)].join(", ")})`);

console.log("\nsection placement, non-bin fields:");
for (const [path, r] of rows) {
  if (r.where.size === 0) continue;
  console.log(`  ${path.padEnd(44)} ${[...r.where].join(", ")}`);
}
