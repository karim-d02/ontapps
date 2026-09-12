/**
 * Provenance audit.
 *
 * Takes the rendered text of every program page, subtracts every string that
 * traces to data/programs.json (in raw or formatted form), and prints what is
 * left. The residue is, by definition, text this codebase composed — static
 * UI labels, or claims. Anything in the residue that asserts a fact rather
 * than labelling a field is a bug.
 *
 * Usage:  npx next start -p 3100 &  node scripts/audit-strings.mjs
 *
 * Read-only.
 */

import { readFile } from "node:fs/promises";

const BASE = process.env.AUDIT_BASE ?? "http://localhost:3100";
const data = JSON.parse(
  await readFile(new URL("../data/programs.json", import.meta.url), "utf8")
);

const slug = (s) =>
  s.toLowerCase().replace(/'/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

/** Every string value anywhere in the document, plus formatted date forms. */
function stringsIn(value, out) {
  if (value === null || value === undefined) return;
  if (Array.isArray(value)) return value.forEach((v) => stringsIn(v, out));
  if (typeof value === "object") return Object.values(value).forEach((v) => stringsIn(v, out));
  const s = String(value);
  out.add(s);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [y, m, d] = s.split("-").map(Number);
    const utc = new Date(Date.UTC(y, m - 1, d));
    out.add(utc.toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }));
    out.add(utc.toLocaleDateString("en-CA", { weekday: "long", month: "long", day: "numeric", year: "numeric", timeZone: "UTC" }));
  }
  if (typeof value === "number") out.add(value.toLocaleString("en-CA"));
}

const dataStrings = new Set();
stringsIn(data, dataStrings);
// Longest first, so "Honours Health Sciences (BHSc)" is removed before "Health".
const ordered = [...dataStrings].filter((s) => s.length > 1).sort((a, b) => b.length - a.length);

async function visibleText(url) {
  const html = await (await fetch(url)).text();
  const body = html.slice(html.indexOf("<body"), html.lastIndexOf("</body>"));
  return body
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/&#x27;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&mdash;|&#8212;/g, "—")
    .replace(/&ndash;|&#8211;/g, "–")
    .replace(/&gt;/g, ">")
    .replace(/&lt;/g, "<")
    .replace(/&nbsp;/g, " ")
    .replace(/&[a-z]+;/gi, " ");
}

const residue = new Map(); // phrase -> Set(programs)

for (const program of data.programs) {
  const url = `${BASE}/programs/${slug(program.school)}/${program.id}`;
  let text = await visibleText(url);

  for (const s of ordered) {
    if (!s.trim()) continue;
    text = text.split(s).join("");
  }

  for (const raw of text.split("")) {
    const phrase = raw.replace(/\s+/g, " ").trim();
    // Punctuation and connective scraps left behind by the substitution.
    if (phrase.length < 3) continue;
    if (/^[\s·—–,.:;()/|%+&'"-]+$/.test(phrase)) continue;
    if (!residue.has(phrase)) residue.set(phrase, new Set());
    residue.get(phrase).add(program.id);
  }
}

const rows = [...residue.entries()].sort((a, b) => b[1].size - a[1].size || a[0].localeCompare(b[0]));
console.log(`${rows.length} distinct non-data phrases across ${data.programs.length} program pages\n`);
console.log("ON".padEnd(4), "PHRASE");
console.log("-".repeat(88));
for (const [phrase, programs] of rows) {
  console.log(String(programs.size).padEnd(4), phrase.slice(0, 82));
}
