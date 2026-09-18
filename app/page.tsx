import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CountUp } from "@/components/ui/count-up";
import { DateStamp } from "@/components/ui/date-stamp";
import { Reveal } from "@/components/ui/reveal";
import { SectionHeader } from "@/components/ui/section-header";
import { Universities, type UniversityEntry } from "@/components/universities";
import { formatDateLong, nextUpcoming, todayISO } from "@/lib/deadlines";
import {
  CATEGORIES,
  getAllPrograms,
  getCategoryLabel,
  getStaleOfficialPages,
  getUniversities,
} from "@/lib/data";
import type { Claim, Program, ProgramCategory } from "@/types/schema";

// The hero carries a live day count, so the static HTML is allowed to be at
// most an hour stale. LiveDays corrects the rest on the client.
export const revalidate = 3600;

export default function Page() {
  const programs = getAllPrograms();
  const staleOfficialPages = getStaleOfficialPages();
  const today = todayISO();

  const next = nextUpcoming(programs, today);

  // The logo filenames are the one thing here that isn't in the dataset — the
  // schools' own asset names don't follow from their titles ("University of
  // Toronto" ships as uoft). Everything else, including the counts, is read.
  const LOGO_FILE: Record<string, string> = {
    "mcmaster-university": "mcmaster",
    "queens-university": "queens",
    "university-of-toronto": "uoft",
    "university-of-waterloo": "waterloo",
    "western-university": "western",
  };

  const universities: UniversityEntry[] = getUniversities().map((university) => ({
    name: university.name,
    href: `/programs/${university.id}`,
    logo: LOGO_FILE[university.id] ?? university.id,
  }));

  // One trap per category, so the three cards span the whole site rather than
  // happening to be three from whichever program sorts first. Deterministic:
  // first program in the category, its first trap.
  const featuredTraps = CATEGORIES.map((category) => {
    const program = programs.find((p) => p.category === category);
    const trap = program?.stream_traps[0];
    return program && trap ? { program, trap, category } : null;
  }).filter(
    (entry): entry is { program: Program; trap: Claim; category: ProgramCategory } =>
      entry !== null,
  );

  return (
    <main className="shell">
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="grid-12 pt-[var(--rhythm-section)] pb-[var(--rhythm-section)]">
        <div className="col-span-12 lg:col-span-9">
          {/* No animateWords: splitting the headline into per-word spans gives
              each word its own gradient (background-clip:text doesn't inherit),
              which both looked stripey and would make the glimmer cross every
              word at once instead of travelling across the line. */}
          <SectionHeader
            level={1}
            title="Simplifying Your Uni Applications"
            titleClassName="text-display headline-glimmer motion-safe:animate-fade-rise"
          />
          <p
            className="measure mt-8 text-body text-muted-foreground motion-safe:animate-fade-rise"
            style={{ animationDelay: "60ms" }}
          >
            {/* Leads with the reader's problem. No em dashes, no semicolons
                doing an em dash's job, and no claim beyond the three the
                brief allows. 34 words. */}
            Every Ontario health, engineering and business program sets its own
            deadlines, supplementary applications and admission averages. The official
            pages are often stale or contradict themselves. Everything here is checked
            against the university&apos;s own page, and dated.
          </p>
          <div
            className="mt-10 flex flex-wrap items-center gap-4 motion-safe:animate-fade-rise"
            style={{ animationDelay: "120ms" }}
          >
            {/* Button labels are verbs describing the outcome, and the count
                comes from the data rather than from a rounded-off adjective. */}
            <Button arrow size="xl" nativeButton={false} render={<Link href="/programs" />}>
              Browse all {programs.length} programs
            </Button>
            <Button
              arrow
              size="xl"
              variant="secondary"
              nativeButton={false}
              render={<Link href="/check" />}
            >
              Check my courses
            </Button>
          </div>
        </div>

        {/* Evidence, not inventory. How many categories exist is not a fact
            anyone needs; how many official pages are currently wrong is the
            entire argument for the site existing. */}
        <dl
          className="col-span-12 mt-16 grid grid-cols-1 gap-x-[var(--gutter)] gap-y-10 border-t border-line-strong pt-10 sm:grid-cols-3 motion-safe:animate-fade-rise"
          style={{ animationDelay: "180ms" }}
        >
          <div>
            <dd className="data text-metric text-foreground">
              <CountUp value={staleOfficialPages.length} />
            </dd>
            <dt className="mt-3 text-label label-mono text-silver">
              Official pages we found wrong
            </dt>
            {/* A second <dd>, not a <p>: a definition list may only contain
                dt/dd pairs, and a stray <p> makes the list invalid. */}
            <dd className="measure mt-2 text-small text-muted-foreground">
              University pages still publishing dates from past cycles.{" "}
              <Link
                href="/data-check"
                className="rounded-sm text-foreground underline decoration-silver underline-offset-4 outline-none transition-colors hover:decoration-silver-light focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none"
              >
                See which
              </Link>
            </dd>
          </div>

          <div>
            <dd className="data text-metric text-foreground">
              <CountUp value={programs.length} />
            </dd>
            <dt className="mt-3 text-label label-mono text-silver">Programs tracked</dt>
            <dd className="measure mt-2 text-small text-muted-foreground">
              Across five universities, every date checked by hand.
            </dd>
          </div>

          <div>
            {next ? (
              <>
                <dd className="data text-metric text-foreground">
                  <CountUp value={next.daysRemaining!} />
                </dd>
                <dt className="mt-3 text-label label-mono text-silver">
                  Days to the next date
                </dt>
                <dd className="measure mt-2 text-small text-muted-foreground">
                  {next.label} — {next.program.university}.
                </dd>
              </>
            ) : (
              <>
                <dd className="data text-metric text-muted-foreground">&mdash;</dd>
                <dt className="mt-3 text-label label-mono text-silver">
                  Days to the next date
                </dt>
                <dd className="measure mt-2 text-small text-muted-foreground">
                  No upcoming dates left in this cycle.
                </dd>
              </>
            )}
          </div>
        </dl>
      </section>

      {/* ── Next up ──────────────────────────────────────────────────────── */}
      {next && (
        <Reveal as="section" className="border-t border-line-strong pt-[var(--rhythm-section)]">
          {/* Only rows the data marks `is_deadline` reach this — opening
              dates, decision windows and prior-cycle rows are excluded — so
              this is genuinely the next deadline. The label comes from the
              data. */}
          <SectionHeader level={2} label="01" title="Next up" />
          <div className="grid-12 mt-8">
            <div className="col-span-12 lg:col-span-8">
              <DateStamp item={next} size="lg" />
              <p className="measure mt-6 text-h2 text-foreground">{next.label}</p>
              <p className="data mt-3 text-small text-silver">
                <time dateTime={next.date!}>{formatDateLong(next.date!)}</time>
              </p>
              <Link
                href={`/programs/${next.program.university_id}/${next.program.id}`}
                className="group/next mt-8 inline-flex items-center gap-2 rounded-sm text-body font-medium text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4 focus-visible:ring-offset-background"
              >
                <span className="relative after:absolute after:inset-x-0 after:-bottom-1 after:h-px after:origin-left after:scale-x-0 after:bg-current after:transition-transform after:duration-150 after:content-[''] group-hover/next:after:scale-x-100 motion-reduce:after:transition-none">
                  {next.program.name} — {next.program.university}
                </span>
                <ArrowRight
                  aria-hidden
                  className="size-4 transition-transform duration-150 group-hover/next:translate-x-0.5 motion-reduce:transition-none"
                />
              </Link>
            </div>
          </div>
        </Reveal>
      )}

      {/* ── Traps ────────────────────────────────────────────────────────── */}
      <Reveal
        as="section"
        className="mt-[var(--rhythm-section)] border-t border-line-strong pt-[var(--rhythm-section)]"
      >
        <SectionHeader level={2} label="02" title="What catches people out" />
        <p className="measure mt-4 text-body text-muted-foreground">
          Every program page lists the specific ways applicants lose a place on a
          technicality. Three of them:
        </p>
        <ul className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
          {featuredTraps.map(({ program, trap, category }) => (
            <Card key={program.id} as="li" interactive className="flex flex-col">
              <p className="text-label label-mono text-silver">
                {getCategoryLabel(category)}
              </p>
              {/* The new schema's traps carry only `text` — there is no title
                  field to head the card with, and inventing one would be
                  writing editorial copy. So the program names the card and the
                  trap itself is the body. */}
              <h3 className="mt-3 text-h3 font-semibold text-foreground">
                <Link
                  href={`/programs/${program.university_id}/${program.id}`}
                  className="rounded-sm outline-none after:absolute after:inset-0 after:content-['']"
                >
                  {program.short_name}
                </Link>
              </h3>
              <p className="mt-2 text-small text-muted-foreground">{trap.text}</p>
              <p className="mt-auto pt-6 text-small text-silver">
                {program.name} — {program.university}
              </p>
            </Card>
          ))}
        </ul>
      </Reveal>

      {/* ── Start here ───────────────────────────────────────────────────── */}
      <Reveal
        as="section"
        className="mt-[var(--rhythm-section)] border-t border-line-strong pt-[var(--rhythm-section)]"
      >
        <SectionHeader level={2} label="03" title="Start here" />
        <ul className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
          {/* Four categories now, in a grid that was written for three. The
              fourth card wraps to a second row. Left as-is deliberately: the
              column count is a visual decision, and this migration does not
              make those. Flagged in MIGRATION-REPORT.md. */}
          {CATEGORIES.map((category) => {
            const inCategory = programs.filter((p) => p.category === category);
            const schools = new Set(inCategory.map((p) => p.university_id)).size;
            return (
              <Card key={category} as="li" interactive className="flex flex-col">
                <p className="data text-metric text-foreground">{inCategory.length}</p>
                <h3 className="mt-3 text-h3 font-semibold text-foreground">
                  <Link
                    href={`/programs?category=${category}`}
                    className="rounded-sm outline-none after:absolute after:inset-0 after:content-['']"
                  >
                    {getCategoryLabel(category)}
                  </Link>
                </h3>
                <p className="mt-2 text-small text-muted-foreground">
                  {inCategory.length === 1 ? "1 program" : `${inCategory.length} programs`}{" "}
                  across {schools === 1 ? "1 university" : `${schools} universities`}.
                </p>
              </Card>
            );
          })}
        </ul>
      </Reveal>

      {/* ── Universities ─────────────────────────────────────────────────── */}
      <Reveal
        as="section"
        className="mt-[var(--rhythm-section)] border-t border-line-strong pt-[var(--rhythm-section)]"
      >
        <SectionHeader level={2} label="04" title="Universities we cover" />

        {/* Generous air either side — a conveyor pressed against its
            neighbours reads as a cramped strip rather than as a band of
            movement. It stays inside the shell like every other section, and
            its own gradient mask is what ends it. */}
        <div className="pt-14 pb-[var(--rhythm-section)]">
          <Universities universities={universities} />
        </div>
      </Reveal>
    </main>
  );
}
