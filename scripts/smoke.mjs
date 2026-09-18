/**
 * Post-migration smoke test.
 *
 * Fetches every route against a running build and fails on the things a schema
 * migration actually breaks: a page that 500s, a field rendered as the literal
 * string "undefined", a null that reached the DOM as text, a heading with
 * nothing under it, or internal-only data leaking into the HTML.
 *
 * Usage:
 *   npm run build
 *   (npm run start -p 3000 &)
 *   node scripts/smoke.mjs
 *
 * Read-only. Never writes to either data file.
 */

import { readFile } from "node:fs/promises";

const BASE = process.env.SMOKE_BASE ?? "http://localhost:3000";

const data = JSON.parse(
  await readFile(new URL("../data/programs.json", import.meta.url), "utf8"),
);

const STATIC_ROUTES = [
  "/",
  "/programs",
  "/check",
  "/compare",
  "/timeline",
  "/data-check",
  "/opengraph-image",
];

const universityRoutes = data.universities.map((u) => `/programs/${u.id}`);
const programRoutes = data.programs.map(
  (p) => `/programs/${p.university_id}/${p.id}`,
);
const ogRoutes = data.programs.map(
  (p) => `/programs/${p.university_id}/${p.id}/opengraph-image`,
);

const routes = [
  ...STATIC_ROUTES,
  ...universityRoutes,
  ...programRoutes,
  ...ogRoutes,
];

/** Visible text of a page — scripts, styles and tags removed. */
function visibleText(html) {
  const start = html.indexOf("<body");
  const end = html.lastIndexOf("</body>");
  const body = start === -1 ? html : html.slice(start, end === -1 ? undefined : end);
  return body
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ");
}

/**
 * Strings that must never appear as rendered text.
 *
 * "null" is matched only as a standalone word: "null" inside a sentence a
 * human wrote is fine, a bare one is a bug.
 */
const BAD_TEXT = [
  { label: "undefined", test: (t) => /\bundefined\b/.test(t) },
  { label: "NaN", test: (t) => /\bNaN\b/.test(t) },
  { label: "[object Object]", test: (t) => t.includes("[object Object]") },
  { label: "bare null", test: (t) => /(^|[\s>])null([\s<.,)]|$)/.test(t) },
];

/** Headings with nothing inside them. */
function emptyHeadings(html) {
  const matches = html.match(/<h[1-6][^>]*>\s*<\/h[1-6]>/gi) ?? [];
  return matches.length;
}

/* ── Things that must never ship ─────────────────────────────────────────── */

const internalNoteTexts = [];
const pdfBlockIds = new Set();
const logIds = new Set();

(function walk(value) {
  if (Array.isArray(value)) return value.forEach(walk);
  if (!value || typeof value !== "object") return;
  // Matches the data layer: a claim is an internal note when claim_type says
  // so OR when `contains` lists it inside a `mixed` claim.
  const isInternalNote =
    value.claim_type === "internal_note" ||
    (Array.isArray(value.contains) && value.contains.includes("internal_note"));
  if (isInternalNote && typeof value.text === "string") {
    internalNoteTexts.push(value.text);
  }
  if (Array.isArray(value.pdf_block_ids)) {
    value.pdf_block_ids.forEach((id) => pdfBlockIds.add(id));
  }
  if (value.verification && Array.isArray(value.verification.log_ids)) {
    value.verification.log_ids.forEach((id) => logIds.add(id));
  }
  if (Array.isArray(value.verification_log_ids)) {
    value.verification_log_ids.forEach((id) => logIds.add(id));
  }
  Object.values(value).forEach(walk);
})(data);

const failures = [];
const results = [];
let allHtml = "";

for (const route of routes) {
  let response;
  try {
    response = await fetch(`${BASE}${route}`);
  } catch (error) {
    failures.push(`${route} — fetch failed: ${error.message}`);
    results.push(`FAIL ${route} (no response)`);
    continue;
  }

  if (response.status !== 200) {
    failures.push(`${route} — HTTP ${response.status}`);
    results.push(`FAIL ${route} (HTTP ${response.status})`);
    continue;
  }

  // OG routes return PNGs; status is the whole check for those.
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("text/html")) {
    results.push(`ok   ${route} (${contentType.split(";")[0]})`);
    continue;
  }

  const html = await response.text();
  allHtml += html;
  const text = visibleText(html);

  const problems = [];
  for (const { label, test } of BAD_TEXT) {
    if (test(text)) problems.push(label);
  }
  const empties = emptyHeadings(html);
  if (empties > 0) problems.push(`${empties} empty heading(s)`);

  if (problems.length > 0) {
    failures.push(`${route} — ${problems.join(", ")}`);
    results.push(`FAIL ${route} (${problems.join(", ")})`);
  } else {
    results.push(`ok   ${route}`);
  }
}

/* ── Leak checks across all rendered HTML ────────────────────────────────── */

const leaks = [];

for (const note of internalNoteTexts) {
  const probe = note.slice(0, 60);
  if (probe && allHtml.includes(probe)) leaks.push(`internal_note text: "${probe}…"`);
}
for (const id of pdfBlockIds) {
  if (new RegExp(`\\b${id}\\b`).test(allHtml)) leaks.push(`pdf_block_id: ${id}`);
}
for (const id of logIds) {
  if (new RegExp(`>\\s*${id}\\s*<`).test(allHtml)) leaks.push(`log_id: ${id}`);
}
if (/document\.json/.test(allHtml)) leaks.push("reference to document.json");

/* ── Report ──────────────────────────────────────────────────────────────── */

console.log(results.join("\n"));
console.log(
  `\n${routes.length} routes checked — ${routes.length - failures.length} passed, ${failures.length} failed`,
);
console.log(
  `internal_note claims in data: ${internalNoteTexts.length} · pdf_block_ids: ${pdfBlockIds.size} · log_ids: ${logIds.size}`,
);

if (leaks.length > 0) {
  console.log(`\nLEAKS (${leaks.length}):`);
  console.log(leaks.map((l) => `  ${l}`).join("\n"));
} else {
  console.log("No internal_note text, pdf_block_id, log_id or document.json reference in any page.");
}

if (failures.length > 0) {
  console.log(`\nFAILURES (${failures.length}):`);
  console.log(failures.map((f) => `  ${f}`).join("\n"));
}

process.exit(failures.length + leaks.length > 0 ? 1 : 0);
