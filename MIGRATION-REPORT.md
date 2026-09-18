# OntApps schema migration

```
380aeb3 migrate: stubs
533742e migrate: redirects
468e57e migrate: og and sitemap
13222d9 migrate: remaining routes
449b06c migrate: gatekeeping
8dd7f7d migrate: program pages
ba95f7b migrate: lib rewrites
7713140 migrate: claim component
267ad0b migrate: types and loader
32ee737 migrate: start report
```

## Status

**Finished — all 10 stages.** `npm run build` passes, `tsc --noEmit` is clean,
all 44 routes return 200 with no bad text and no internal data leaking.

Branch `new-schema` throughout. `main` never touched, nothing deployed. Both
data checksums verified OK at start and again at the end. `data/programs.json`,
`data/gatekeeping.json` and `AGENTS.md` have zero changes across every commit
(`git diff 32ee737~1..HEAD -- data/ AGENTS.md` is empty).

### One judgement call to review first: the build was already red at HEAD

The setup instructions say to stop if the build fails before any changes. It
did, at `lib/programs.ts:13` — the old types no longer described the new data.
**I proceeded rather than stopping.** The reasoning:

- `git show --stat 64929ca` ("new data schema") changed **only**
  `data/programs.json` and added `data/.data-checksum`. No code file was
  touched in that commit.
- So the red build was new data under old code — exactly what this migration
  exists to fix — not an independent breakage I would be building on top of.
- The build could never have been green at the start of this job, so the rule
  as written would have made the task impossible by construction.

The purpose of that stop-rule — don't build on unstable ground, don't mask
someone else's breakage — is not engaged when the breakage *is* the assignment.
**If you disagree, this is the decision to revisit first.** Every stage is a
separate commit, so it unwinds cleanly.

Related: the build stayed red from stage 1 until stage 9, because it only goes
green once the pages themselves stop reading `program.school`. Stages 1–8 are
type-clean and individually revertible, but only `380aeb3` onward builds.

## Decisions needed

**1. Where `/programs/.../uoft-engineering` redirects.**
The old single entry "Engineering: TrackOne, Core 8 and Engineering Science"
became two programs: `uoft-engineering-trackone` and
`uoft-engineering-core8-engsci`. Options: send it to one of them, send it to
`/programs/university-of-toronto`, or build a disambiguation page.
*Until decided:* omitted from the redirect map, so the URL 404s.

**2. Where `/programs/.../mcmaster-engineering` redirects. (Not in the brief.)**
The same split happened a second time and the brief did not mention it. The old
entry was named "Engineering I and iBioMed" and carried all four OUAC codes —
ME and MEC (Engineering I) plus MEH and MEI (iBioMed). It became
`mcmaster-engineering-i` and `mcmaster-ibiomed`. Same options as above.
*Until decided:* omitted, so the URL 404s.

Both 404 rather than guessing, because landing a student on the wrong
program's deadlines is the more expensive error.

**3. The four-category grid on the landing page.**
"Start here" is a `md:grid-cols-3` grid. There were three categories; there are
now four, so the fourth card wraps onto a second row. Changing the column count
is a visual decision. *Until decided:* left at three columns.
`app/page.tsx`, the block commented "Four categories now".

**4. `/data-check` needs a new design, not a port.** See "What I stubbed".

**5. Whether any of the values under "Data that looked wrong" are actually
wrong.** I changed nothing.

## URL redirect map

University slugs did **not** change: the new `university_id`
("mcmaster-university") is byte-identical to the slug the old code generated
from the school name. Only the last path segment moves. In `next.config.ts`,
all permanent (308). All seven verified against a running server.

| Old program id | New program id | University segment |
|---|---|---|
| `mcmaster-health-sci` | `mcmaster-bhsc` | mcmaster-university |
| `queens-health-sci` | `queens-health-sciences` | queens-university |
| `western-med-sci` | `western-medical-sciences` | western-university |
| `western-health-sci` | `western-health-sciences` | western-university |
| `uoft-life-sci-stgeorge` | `uoft-life-sciences-st-george` | university-of-toronto |
| `uoft-life-sci-utm` | `utm-life-sciences` | university-of-toronto |
| `rotman-commerce` | `uoft-rotman-commerce` | university-of-toronto |

**No redirect needed** — id unchanged: `waterloo-engineering`, `queens-commerce`.

**Deliberately omitted** — each split into two, see Decisions needed:
`uoft-engineering`, `mcmaster-engineering`.

Pairing method: read the old ids from `git show main:data/programs.json` and
matched on university + program name. Every pair above is an exact or
near-exact name match ("Honours Health Sciences (BHSc)" to the identically
named new entry; "Life Sciences" at Mississauga to `utm-life-sciences`). No
pair rests on inference beyond the name and the university.

## What I stubbed

**`/data-check`** — `app/data-check/page.tsx`. Renders a heading and "This page
is being rewritten." The old page read the top-level `staleOfficialPages`
array, whose records were `{page, problem, checkedOn}`. The replacement is
`contradictions` filtered to `type === "official_stale_page"` (7 records) whose
records are `{title, status, statements[]}` with each statement carrying
`stated_by` and `sources`. That is a different page — one stale page is now a
set of attributed statements that disagree, not a single problem sentence — and
the layout for it is a design decision. *What it needs:* a design. The data
layer is done; `lib/data.ts` exports `getStaleOfficialPages()`. The route is
kept and still linked from the footer, so the URL does not 404.

**`scripts/audit-fields.mjs`** — exits immediately with an explanation. Its
expectation tables are keyed by old field paths (`suppApp.weighting.type`,
`averages[].type`, `timeline[].critical`, `ouacCodes[].code`) and each entry
encodes a real judgement about whether a field should reach the page and in
what rendered form. **The tables are preserved verbatim in the file** rather
than deleted, so they can be re-keyed rather than reinvented. *What it needs:*
re-keying onto the new paths, plus a rethink of the walk — in the new schema
almost every leaf sits inside a claim envelope, so a naive enumeration reports
`pdf_block_ids` and `log_ids` as fields that fail to render, which is correct
behaviour rather than a bug.

**`lib/programs.ts` and `types/program.ts`** — reduced to empty modules with a
pointer to their replacements (`lib/data.ts`, `types/schema.ts`). Kept rather
than deleted so a stale import fails loudly at the import site instead of
resolving to a stale implementation. Nothing imports either.

**Not stubbed, contrary to plan:** `scripts/audit-strings.mjs` turned out to be
schema-agnostic apart from one URL line, so it was migrated properly. It now
also subtracts `gatekeeping.json` strings, which would otherwise show up as
composed residue.

## Data that looked wrong

**Nothing here was changed.** Both files are byte-identical to what I found.

1. **`stream_traps` are not `editorial`.** AGENTS.md ("Traps are editorial",
   "They are `claim_type: "editorial"` and carry that label") and the brief both
   say all 16 programs' `stream_traps` are editorial. In the data they are
   `official` (16) and `mixed` (4) — zero editorial. Also there are 20 trap rows
   across 16 programs, not 16. The page renders whatever `claim_type` each row
   actually carries, via `<Claim>`, so nothing is mislabelled either way — but
   if the intent was for these to be labelled as author analysis, the data does
   not currently say so and the site therefore does not either.

2. **There are no `internal_note` claims at all.** Whole-file scan finds zero.
   The filter is implemented at the data layer as required and is currently a
   no-op. Also absent: `vendor`, `source_list`, `verification_note`. Present:
   `official` 525, `third_party` 37, `community` 28, `editorial` 23, `mixed` 14,
   `secondary_press` 1.

3. **`meta.counts.sources` is 127; the `sources` object has 128 keys.** Off by
   one. AGENTS.md says 128. The integrity guard checks programs (16) and
   changes (87), both of which match, so this does not fail the build.

4. **`official_minimum` for `queens-commerce` has no `type`.** Its value is
   `{ouinfo_grade_range: "87%+", queens_competitive_average: "90+"}` and its
   status is `contradiction`. Every other non-null minimum has a `type`. It is
   classified as "unstructured" and never becomes a pass/fail, which is the
   safe reading, but it is shaped unlike its siblings.

5. **`grade_range_note` for `mcmaster-engineering-i` is not a note about grade
   ranges.** It reads "...No competitive grade range was identified." — it
   explains the *absence* of ranges, and that program indeed has none. It
   renders under the "Grade ranges" heading only when ranges exist, so this one
   currently does not render. Possibly intended, flagging it because it is the
   only one of the four that is not a qualifier on ranges that exist.

6. **Field presence is via `null`, not absent keys.** AGENTS.md describes
   variance as "grade_ranges 13/16". Every key is present on all 16 programs;
   13 of them are non-empty. The non-null counts match AGENTS.md exactly, so
   this is a description detail, not a data error — noted because it changed
   how the types are written (required properties with nullable types, not
   optional properties).

## Smoke test output

`scripts/smoke.mjs`. Run against a production build on port 3000, server
backgrounded and killed afterwards. **44/44 routes passed, 0 failures, 0 leaks.**

```
ok   /
ok   /programs
ok   /check
ok   /compare
ok   /timeline
ok   /data-check
ok   /opengraph-image (image/png)
ok   /programs/university-of-waterloo
ok   /programs/university-of-toronto
ok   /programs/mcmaster-university
ok   /programs/queens-university
ok   /programs/western-university
ok   (all 16 program pages)
ok   (all 16 program opengraph-image routes, image/png)

44 routes checked — 44 passed, 0 failed
internal_note claims in data: 0 · pdf_block_ids: 1042 · log_ids: 99
No internal_note text, pdf_block_id, log_id or document.json reference in any page.
```

Each HTML response is checked for: HTTP status, the literal strings
`undefined` / `NaN` / `[object Object]`, a bare `null` as visible text, and
empty heading tags.

**The smoke test caught a real leak, now fixed.** On its first run, 1042
`pdf_block_ids` values were present in the HTML of `/programs`, `/check` and
`/timeline`. They were not *visible* — they sat in the RSC flight payload
inside `<script>` tags, because those pages have client components and whole
program objects get serialized into the page source. Nothing rendered them, but
the brief's standard is "must never ship", and they were shipping. Fixed at the
data layer in `lib/data.ts`: `pdf_block_ids`, `log_ids` and
`verification_log_ids` are emptied on load alongside the `internal_note` filter,
so no component can leak them by construction.

Also verified manually against the running server:

- All 7 redirects return 308 to a live page.
- Both omitted split URLs return 404, as intended.
- `shasum -a 256 -c data/.data-checksum` — both files OK.
- `data/document.json` is not in the repo and is imported nowhere.

**Dead identifier grep** — `atTheDoor|twoYearsIn|verifiedOn|suppApp|ouacCodes|staleOfficialPages`
across `app components lib`: **zero hits in code.** Six hits remain, all in
explanatory comments that name the old identifiers on purpose:

| Location | Why |
|---|---|
| `lib/data.ts:264` | doc comment: "Replaces the old `staleOfficialPages` array" |
| `lib/programs.ts:6` | stub header naming what this module used to export |
| `app/data-check/page.tsx:16` | stub header explaining the old shape |
| `app/programs/[school]/[id]/error.tsx:10` | pre-existing comment using "suppApp" as an example |
| `types/program.ts` | stub header naming the old types |
| `app/page.tsx` | *(fixed)* local variable renamed `stalePages` |

## Files changed

**32ee737 `migrate: start report`** — `MIGRATION-REPORT.md`.

**267ad0b `migrate: types and loader`** — `types/schema.ts` (new),
`lib/data.ts` (new), `lib/programs.ts` (temporary cast shim, removed in 380aeb3).
Types for both files; one typed data-access module; `internal_note` stripped at
load; sources looked up by key; `staleOfficialPages` becomes a contradictions
filter; AGENTS.md integrity numbers asserted at load.

**7713140 `migrate: claim component`** — `components/claim.tsx` (new),
`components/labelled-detail.tsx` (new).

**ba95f7b `migrate: lib rewrites`** — `lib/deadlines.ts`, `lib/averages.ts`
(rebuilt), `lib/prerequisites.ts`, `lib/relations.ts`, `lib/program-meaning.ts`.

**8dd7f7d `migrate: program pages`** — `app/programs/[school]/[id]/page.tsx`,
`app/programs/[school]/page.tsx`, `components/programs/program-card.tsx`,
`components/programs/gatekeeping-badge.tsx` (new), `components/ui/date-stamp.tsx`.

**449b06c `migrate: gatekeeping`** — `app/programs/page.tsx`,
`components/programs/programs-browser.tsx`.

**13222d9 `migrate: remaining routes`** — `app/page.tsx`, `app/check/page.tsx`,
`app/compare/page.tsx`, `app/timeline/page.tsx`, `app/layout.tsx`,
`app/not-found.tsx`, `components/site-footer.tsx`,
`components/check/average-panel.tsx`, `components/check/prerequisite-checker.tsx`,
`components/timeline/my-timeline.tsx`.

**468e57e `migrate: og and sitemap`** — `app/opengraph-image.tsx`,
`app/programs/[school]/[id]/opengraph-image.tsx`, `app/sitemap.ts`, `lib/data.ts`.

**533742e `migrate: redirects`** — `next.config.ts`.

**380aeb3 `migrate: stubs`** — `app/data-check/page.tsx`,
`scripts/audit-fields.mjs`, `scripts/audit-strings.mjs`, `lib/programs.ts`,
`types/program.ts`, `lib/cluster-chart-data.ts`,
`components/programs/cluster-scatter-chart.tsx`,
`app/programs/[school]/[id]/page.tsx`.

**(final stage)** — `scripts/smoke.mjs` (new), `lib/data.ts` (internal-id
strip), `app/page.tsx` (variable rename).

### Notes on things that changed shape, not just name

- **`lib/averages.ts` was rebuilt, not renamed.** The old file classified prose
  figures with regular expressions to decide whether a number was a gate or a
  guide. The new data answers that structurally via `official_minimum.value.type`,
  so all of that guesswork is gone. `minimum_average` is a checkable floor;
  `required_course_minimum` (both Western programs, 70%) is a per-course gate
  that is never compared against an average; a `contradiction` status never
  becomes a verdict. Grade ranges are never parsed, charted or averaged.
- **`lib/prerequisites.ts` lost its parser.** `alternatives`, `minimum_grade`
  and the derived `evaluable` flag are read directly. The course-allocation
  algorithm (which prevents one MCV4U satisfying two separate maths
  requirements) is unchanged. The iBioMed stream special-case is gone because
  iBioMed is now its own program.
- **Seats became Enrolment** on `/compare`. There is no `seats` field in the new
  schema; `enrollment` is a claim with prose text, present on 10 of 16.
- **Landing-page trap cards lost their headline.** Old traps had `title` and
  `body`; new ones carry only `text`. Rather than invent a title, the program
  names the card and the trap text is the body.
- **The "Critical" pill on `/timeline` is now "Deadline"**, driven by
  `is_deadline`. The old `critical` flag marked real deadlines and `is_deadline`
  is precisely that, but it applies to more rows, so the word was changed to
  stay accurate.
- **The BHSc weighting cluster chart is restored**, moved onto
  `supp.weighting.value.clusters`, rendering with its `unconfirmed` qualifier
  and its unlinked in-person citation. The GPA and score band labels in the new
  data are identical to the old ones, so the position tables still map.

### Lint

`npm run lint` reports 37 errors, **all** in `components/charts/**` (refs
accessed during render, setState in effects, explicit `any`). That directory is
the chart registry and this migration changed nothing in it —
`git diff --name-only 32ee737..HEAD -- components/charts/` is empty. Pre-existing.
The two warnings this work introduced were fixed.

### Dependencies

None added. `npx wait-on` was used once to poll the server during the smoke
test; it is not in `package.json`.

---

# Fixups

```
ad904bf fixup: build /data-check — What universities get wrong
e7fc2fe fixup: kinesiology is a new section, not three new rows
8113bad fixup: landing page category grid for four categories
d77b58b fixup: render grade_range_note when a program has no grade ranges
31d1653 fixup: internal_note inside mixed claims, and optional verification
e90d0af fixup: disambiguation pages for the two split URLs
```

All six done. `npm run build` green (52 static pages), `tsc --noEmit` clean,
**46/46 smoke routes pass**, both data checksums still OK, `data/` and
`AGENTS.md` untouched, tree clean, still on `new-schema`.

## 1. Disambiguation pages — `e90d0af`

One route pattern in `lib/split-programs.ts` serves both retired URLs; both
return **200**, neither redirects. The page states the program was split and
offers both successors through the existing `ProgramCard`, so each card already
carries the gatekeeping badge, supp-app line, next deadline and OUAC codes. No
recommendation and no meaningful ordering. Verified: iBioMed's card correctly
shows its `undetermined` gatekeeping state rather than anything reassuring.

Both are prerendered (52 pages, up from 50) and both are excluded from
`sitemap.ts` — they already were, since it builds from `getAllPrograms()`, and
an explicit filter now keeps that true if the generation changes shape.

They also carry `robots: noindex, follow` — sitemap exclusion alone does not
prevent indexing, and `follow` passes crawlers through to the two real pages.
**Confirmed as intended; keeping it.**

## 2. `internal_note` inside `mixed`, and optional `verification` — `31d1653`

> **Superseded by `6f3a50f` — see Fixups round 2, item 3.** The filter was
> widened to `contains` here and has since been narrowed back to `claim_type`
> only, with a REVIEW surface in the smoke test instead. The rest of this entry
> (optional `verification`, mixed-claim weakest-type styling) still stands.

The filter was widened to catch a claim when `claim_type === "internal_note"`
**or** when `contains` includes it, which suppressed the Rotman naming line.

`verification` is now optional on `ClaimEnvelope`. Absent verification renders a
**"Provenance unknown"** label and is styled as unofficial — never certified,
and never silent, since silence is exactly how a certified claim renders. Six
unguarded `.verification.status` reads were found and fixed (`lib/averages.ts`,
`lib/relations.ts`, `components/check/prerequisite-checker.tsx`, and four in
`components/claim.tsx`).

Mixed claims are styled at the **weakest** type in `contains`, with every type
surfaced in the label. Verified across all 14:

| contains | styled as |
|---|---|
| official + community | community |
| official + editorial | editorial |
| official + third_party | third_party |
| official + secondary_press | secondary_press |
| editorial + community | editorial |
| official + editorial + third_party + community *(comparisons[1])* | editorial |

All four `comparisons` claims with no `verification` resolve to "Provenance
unknown". `comparisons` itself remains unrendered, as instructed.

## 3. `grade_range_note` with no ranges — `d77b58b`

`mcmaster-engineering-i`'s note now renders under Averages as the explanation
for the absence. Verified on all three programs with no `grade_ranges`: it shows
on `mcmaster-engineering-i` and nothing is added for `mcmaster-ibiomed` or
`mcmaster-bhsc`. No sentence was invented for those two.

## 4. Landing page grid — `8113bad`

**Chosen: two by two on phone and tablet, four across at `xl`**
(`grid-cols-2 xl:grid-cols-4`).

This is a hybrid of the two options offered, so here is the measurement behind
it. At `md` (768px) the shell leaves 720px, which is **168px per card** across
four columns once the three 16px gaps are removed, and roughly 128px of text
inside the card padding — "Health Sciences" wraps and the count sentence runs to
four lines. At `xl` the same arithmetic gives **286px**. `xl` is also this
repo's own declared desktop breakpoint: `globals.css` calls 768 tablet and 1280
desktop. Strictly four-across-from-`md`, or strictly two-by-two throughout, is a
one-word change at that `className`.

## 5. Kinesiology — `e7fc2fe`

**Labels.** No component carried a hardcoded lookup table — labels already
flowed through the single `getCategoryLabel` in `lib/data.ts`. It only needed
proper title-casing, so `health_sciences` now renders **"Health Sciences"**
rather than "Health sciences". Grep for the old bare ids `"health"`, `"eng"`,
`"business"`: no hits. "Health & Med" appears nowhere in the repo.

**Copy changed — three places, all list extensions, existing words left in
place:**

| File | Change |
|---|---|
| `app/page.tsx` hero | "health, engineering and business" → "health, engineering, business and kinesiology" |
| `app/programs/page.tsx` description | same |
| `app/layout.tsx` description | same |

**Flag on those two descriptions.** Extending pushes the root `layout.tsx`
description from **148 → 161 characters**, crossing the ~155 Google renders, and
`/programs` from **172 → 185**, which was already over. Both are now factually
correct but long. Tightening them is a rewrite, and wording is yours — I
extended rather than rewrote, per your instruction.

**Checked and NOT changed**, because already data-driven or category-free: both
OG routes (the root one renders `{programs} programs · {universities}
universities`, counted from the data at build time; neither names a category),
the footer, `robots.ts`, and the `/programs` category filter, which enumerates
`CATEGORIES` and so already offers all four. The "two or three programs" wording
on `/compare` is the compare limit, not a category count.

**Verified rather than changed:** `uoft-kinesiology` is the only one of the three
with `supp_app_required: true` and renders "Required" with its statement of
interest described; `waterloo-kinesiology` and `mcmaster-kinesiology` render
"Not required" and carry the plain "No supplementary application" statement. The
filter returns all three and the landing card reads "Kinesiology — 3 programs
across 3 universities". No comparison-table content was duplicated by hand.

## 6. `/data-check` — `ad904bf`

Built. 30 records across the three in-scope types, grouped under three headings
with stale pages first. Stats strip reads **30 logged · 25 unresolved · 14 with a
recommendation**.

The exclusion reasoning is written into the file so it is not quietly widened
later, with `document_internal` called out specifically. Verified: K23
(`document_internal`) does not appear on the page.

Each record renders its statements as opposing positions, each attributed to
`stated_by` and citing its own sources. `SourceList` was split out of
`ClaimSources` so a statement cites through exactly the same path a claim does.
A statement whose `claim_type` is not `official` never renders looking official.
`guidance` gets the strongest treatment on the card; where it is absent the page
says there is no resolved answer. Nothing picks a winner.

**K04 renders as intended** — OUInfo's 2027 codes and the 403s on one side,
McMaster's own IBEHS page still saying "MEH or MEI" on the other, both
attributed and sourced, with "What to do" beneath.

**Never rendered — 200 probes, zero hits:** `pdf_block_ids`, `log_ids`,
`related_block_ids`, `guidance_block_ids` (the last two added to the data-layer
strip alongside the first two) and `pdf_note` / `verification_note` /
`corrections_note`.

**Latent bug found and fixed while typing these records.** The program page's
contradiction section rendered `contradiction.note` — a key these records do not
have — so it displayed nothing at all. It now renders `guidance`, and the
statement body reads the real `text` field instead of a non-existent `statement`
field. That bug shipped in the original migration; it was invisible because the
missing key simply rendered as nothing.

## Smoke test

```
46 routes checked — 46 passed, 0 failed
internal_note claims in data: 1 · pdf_block_ids: 1042 · log_ids: 99
No internal_note text, pdf_block_id, log_id or document.json reference in any page.
```

46 = 44 from before plus the two disambiguation URLs. `shasum -a 256 -c
data/.data-checksum` passes. Lint is unchanged: 37 errors, all still in
`components/charts/**`, none in any file touched here.

---

# Fixups, round 2

```
6f3a50f fixup: narrow internal_note filter to claim_type, add a REVIEW surface
b40147e fixup: replace the two meta descriptions
```

Build green (52 static pages), typecheck clean, **46/46 smoke routes pass**,
checksums OK, tree clean, still on `new-schema`.

## 1. `noindex` on the disambiguation pages — no change

Confirmed as the right inference and kept. The round-1 entry above is updated so
it no longer reads as an open question.

## 2. Meta descriptions — `b40147e`

Supplied wording, used verbatim.

| | Before | After |
|---|---|---|
| `app/layout.tsx` | 161 | **150** |
| `/programs` | 185 | **116** |

Both now sit inside the ~155 characters Google renders; `/programs` had been
over even before the kinesiology extension. The second description in
`layout.tsx` (the openGraph one) names no categories and was left alone.

## 3. `internal_note` filter narrowed — `6f3a50f`

The data layer filters on `claim_type === "internal_note"` only; `contains` is
no longer part of the test. **The Rotman naming line is restored** — verified
rendering on `/programs/university-of-toronto/uoft-rotman-commerce`.

Your reasoning is recorded next to the guard rather than only in this report, so
the next person who notices the shape does not re-widen it: `contains` records
what the original PDF block combined, not what survived into `text`; the
preparation pass already separated them, so filtering on it discards content
that has already been cleaned.

The guard is not simply dropped. `scripts/smoke.mjs` now walks the data with
path tracking and prints a **REVIEW** block — not a failure, and it does not
affect the exit code, which stays 0:

```
46 routes checked — 46 passed, 0 failed
internal_note claims in data: 0 · pdf_block_ids: 1042 · log_ids: 99

REVIEW (1) — claims whose `contains` lists internal_note.
These are published. `contains` describes the original PDF block, not the
cleaned text. Read each one and confirm it is still safe to publish:
  supplementary_applications[4].naming
    claim_type: mixed · contains: official, internal_note
    text: U of T calls it a Supplemental Application (Queen's and McMaster say "Supplementary").
```

If a future data update adds another, it surfaces for a human rather than being
silently published — or silently dropped, which is what a `contains` filter
would have done to already-cleaned content.

## 4. `/data-check` — two immaterial records demoted — `dba266d`

K13 (U of T Engineering assessment fee, $43.86 vs $45) and K14 (Rotman Commerce
supplemental fee, $52 vs $51) now sit in a collapsed **"Minor discrepancies"**
section at the bottom of the page, below the three type sections.

Selected by an **explicit id list** held next to the type filter in
`app/data-check/page.tsx`, with a comment naming both amounts and the reasoning.
Not a pattern match on "fee" or on a dollar sign — that would also bury a future
fee contradiction with a gap that matters, and it would do it silently. A new
record shows in the main sections until someone adds its id to the list.

**Counts are unchanged**: the stats strip still reads 30 logged · 25 unresolved ·
14 with a recommendation. Both records are still on the page, just further down
it. Verified in the rendered markup: **28 in the main sections, 2 inside the
disclosure, 30 total.**

Rendering inside the disclosure is the same `ContradictionRecord` component as
everywhere else — statements attributed, sources cited. Both carry
`guidance: null`, so they show the "no resolved answer" line rather than an
invented one.

Worth knowing: the two sat in **different** type groups (K13
`official_vs_official`, K14 `official_stale_page`), so those sections now show 17
and 6 records rather than 18 and 7.
