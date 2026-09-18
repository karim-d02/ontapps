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

// The two retired URLs from the schema change. They serve a 200 with a choice
// on the page, so they are checked like any other route.
const SPLIT_ROUTES = [
  "/programs/university-of-toronto/uoft-engineering",
  "/programs/mcmaster-university/mcmaster-engineering",
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
  ...SPLIT_ROUTES,
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

/**
 * Claims whose `contains` lists "internal_note" but whose `claim_type` does not.
 *
 * These are NOT filtered by the data layer and NOT a failure here. `contains`
 * records what the original PDF block combined, not what survived into `text`:
 * the preparation pass already separated them, so the remaining text is the
 * official half and is publishable.
 *
 * They are surfaced for review anyway. Today there is exactly one and it has
 * been read and approved. If a data update adds another, this prints it rather
 * than letting it be silently published — or silently dropped, which is what
 * filtering on `contains` would do to content that has already been cleaned.
 */
const containsInternalNote = [];

(function walk(value, path) {
  if (Array.isArray(value)) {
    return value.forEach((entry, index) => walk(entry, `${path}[${index}]`));
  }
  if (!value || typeof value !== "object") return;

  // Matches the data layer exactly: claim_type only.
  if (value.claim_type === "internal_note" && typeof value.text === "string") {
    internalNoteTexts.push(value.text);
  }

  if (
    value.claim_type !== "internal_note" &&
    Array.isArray(value.contains) &&
    value.contains.includes("internal_note")
  ) {
    containsInternalNote.push({
      path,
      claimType: value.claim_type,
      contains: value.contains,
      text: typeof value.text === "string" ? value.text : "(no text field)",
    });
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
  for (const [key, entry] of Object.entries(value)) {
    walk(entry, path ? `${path}.${key}` : key);
  }
})(data, "");

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

/*
 * Review surface. Never a failure — see containsInternalNote above.
 */
if (containsInternalNote.length > 0) {
  console.log(
    `\nREVIEW (${containsInternalNote.length}) — claims whose \`contains\` lists internal_note.`,
  );
  console.log(
    "These are published. `contains` describes the original PDF block, not the",
  );
  console.log(
    "cleaned text. Read each one and confirm it is still safe to publish:",
  );
  for (const entry of containsInternalNote) {
    console.log(`  ${entry.path}`);
    console.log(`    claim_type: ${entry.claimType} · contains: ${entry.contains.join(", ")}`);
    console.log(`    text: ${entry.text}`);
  }
}

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
