import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CountUp } from "@/components/ui/count-up";
import { DateStamp } from "@/components/ui/date-stamp";
import { Reveal } from "@/components/ui/reveal";
import { SectionHeader } from "@/components/ui/section-header";
import { UniversityMarquee } from "@/components/university-marquee";
import { formatDateLong, nextUpcoming, todayISO } from "@/lib/deadlines";
import {
  getAllPrograms,
  getCategories,
  getSchoolSlug,
  getStaleOfficialPages,
} from "@/lib/programs";
import type { Category, Program, Trap } from "@/types/program";

// The hero carries a live day count, so the static HTML is allowed to be at
// most an hour stale. LiveDays corrects the rest on the client.
export const revalidate = 3600;

export default function Page() {
  const programs = getAllPrograms();
  const categories = getCategories();
  const staleOfficialPages = getStaleOfficialPages();
  const today = todayISO();

  const next = nextUpcoming(programs, today);

  // One trap per category, so the three cards span the whole site rather than
  // happening to be three from whichever program sorts first. Deterministic:
  // first program in the category, its first trap.
  const featuredTraps = categories
    .map((category) => {
      const program = programs.find((p) => p.category === category.id);
      const trap = program?.traps[0];
      return program && trap ? { program, trap, category } : null;
    })
    .filter(
      (entry): entry is { program: Program; trap: Trap; category: Category } =>
        entry !== null
    );

  return (
    <main className="shell">
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="grid-12 pt-[var(--rhythm-section)] pb-[var(--rhythm-section)]">
        <div className="col-span-12 lg:col-span-9">
          <SectionHeader
            level={1}
            title="Simplifying Your Uni Applications"
            titleClassName="text-display"
            animateWords
          />
          <p
            className="measure mt-8 text-body text-muted-foreground motion-safe:animate-fade-rise"
            style={{ animationDelay: "60ms" }}
          >
            Ontario&apos;s health, engineering and business programs each run their own
            deadlines, supplementary applications and admission averages — and the
            official pages are often stale or contradict themselves. Everything here is
            checked against the university&apos;s own page and dated, so you know what is
            true right now.
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
                  {next.label} — {next.program.school}.
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
          {/* "Next up" rather than "the next deadline": the soonest dated entry
              in the dataset is sometimes an opening date rather than a
              deadline, and the label under it comes straight from the data. */}
          <SectionHeader level={2} label="01" title="Next up" />
          <div className="grid-12 mt-8">
            <div className="col-span-12 lg:col-span-8">
              <DateStamp item={next} size="lg" />
              <p className="measure mt-6 text-h2 text-foreground">{next.label}</p>
              <p className="data mt-3 text-small text-silver">
                <time dateTime={next.date!}>{formatDateLong(next.date!)}</time>
              </p>
              <Link
                href={`/programs/${getSchoolSlug(next.program.school)}/${next.program.id}`}
                className="group/next mt-8 inline-flex items-center gap-2 rounded-sm text-body font-medium text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4 focus-visible:ring-offset-background"
              >
                <span className="relative after:absolute after:inset-x-0 after:-bottom-1 after:h-px after:origin-left after:scale-x-0 after:bg-current after:transition-transform after:duration-150 after:content-[''] group-hover/next:after:scale-x-100 motion-reduce:after:transition-none">
                  {next.program.name} — {next.program.school}
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
              <p className="text-label label-mono text-silver">{category.label}</p>
              <h3 className="mt-3 text-h3 font-semibold text-foreground">
                <Link
                  href={`/programs/${getSchoolSlug(program.school)}/${program.id}`}
                  className="rounded-sm outline-none after:absolute after:inset-0 after:content-['']"
                >
                  {trap.title}
                </Link>
              </h3>
              <p className="mt-2 text-small text-muted-foreground">{trap.body}</p>
              <p className="mt-auto pt-6 text-small text-silver">
                {program.name} — {program.school}
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
          {categories.map((category) => {
            const inCategory = programs.filter((p) => p.category === category.id);
            const schools = new Set(inCategory.map((p) => p.school)).size;
            return (
              <Card key={category.id} as="li" interactive className="flex flex-col">
                <p className="data text-metric text-foreground">{inCategory.length}</p>
                <h3 className="mt-3 text-h3 font-semibold text-foreground">
                  <Link
                    href={`/programs?category=${category.id}`}
                    className="rounded-sm outline-none after:absolute after:inset-0 after:content-['']"
                  >
                    {category.label}
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
        <div className="mt-8">
          <UniversityMarquee />
        </div>
      </Reveal>
    </main>
  );
}
