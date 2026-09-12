"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

export interface UniversityEntry {
  /** The school's name exactly as data/programs.json spells it. */
  name: string;
  href: string;
  logo: string;
}

/**
 * Per-logo optical sizing.
 *
 * Matched heights do not produce matched weights. These marks have different
 * lockups: McMaster and U of T stack two lines of type, so at a shared height
 * their cap-height is roughly half that of a single-line mark and they read
 * small; Waterloo is set in a heavy grotesque and reads heaviest at any size.
 *
 * Set by looking at the row, not by calculation — optical weight has no
 * formula.
 */
const OPTICAL_SCALE: Record<string, number> = {
  mcmaster: 1.2, // stacked lockup, small cap-height
  uoft: 1.08, // also stacked, but wider
  queens: 1,
  western: 0.98,
  waterloo: 0.86, // heaviest weight in the set
};

/**
 * Copies of the set laid end to end.
 *
 * The track must be wider than the widest viewport plus one whole set, or the
 * wrap point becomes visible as a gap. One set is roughly 1100px at desktop
 * sizes, so four copies (~4400px) covers a 2560px screen with a full set in
 * hand at the moment it restarts.
 */
const COPIES = 4;

/** Seconds for the track to advance by exactly one set. */
const CYCLE_SECONDS = 45;

/** One glimmer sweep plus a long pause, per logo. */
const GLIMMER_CYCLE = 8;

export function Universities({ universities }: { universities: UniversityEntry[] }) {
  const ref = useRef<HTMLDivElement>(null);

  /*
   * Pause while off-screen. Written straight to a data attribute rather than
   * held in React state: this is presentation with no bearing on what renders,
   * and a re-render of twenty tiles every time the section scrolls in or out
   * would cost more than the animation it is trying to save.
   */
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        el.dataset.visible = entry.isIntersecting ? "true" : "false";
      },
      { threshold: 0 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      data-visible="true"
      className="conveyor conveyor-mask overflow-hidden py-4"
      style={
        {
          "--conveyor-copies": COPIES,
          "--conveyor-duration": `${CYCLE_SECONDS}s`,
        } as React.CSSProperties
      }
    >
      <div className="conveyor-track">
        {Array.from({ length: COPIES }, (_, copy) => (
          <ul
            key={copy}
            className="conveyor-copy flex shrink-0 items-center"
            data-duplicate={copy > 0 ? "true" : undefined}
            /*
             * Every copy after the first exists only to make the loop
             * seamless. `inert` takes them out of the tab order as well as the
             * accessibility tree — aria-hidden alone would leave fifteen
             * focusable links that a screen reader has been told don't exist,
             * and a keyboard user would tab through five universities four
             * times over.
             */
            aria-hidden={copy > 0 || undefined}
            inert={copy > 0}
          >
            {universities.map((university, index) => (
              <li key={university.name} className="px-6 sm:px-10">
                <UniversityTile
                  university={university}
                  index={copy * universities.length + index}
                />
              </li>
            ))}
          </ul>
        ))}
      </div>
    </div>
  );
}

function UniversityTile({
  university,
  index,
}: {
  university: UniversityEntry;
  index: number;
}) {
  const [failed, setFailed] = useState(false);
  const src = `/logos/${university.logo}.png`;

  /*
   * Staggered so no two marks ever catch the light together.
   *
   * The step is 3.6s against an 8s cycle, chosen by searching for the value
   * that maximises the smallest gap across all twenty tiles: it spreads them
   * 0.4s apart with neighbours in the row a full 3.6s apart, and it doesn't
   * read as a travelling wave the way an even 0.4s step would. An earlier 2.7s
   * step put tiles 0 and 3 within 0.1s of each other, which is simultaneous as
   * far as the eye is concerned.
   *
   * Index-based rather than random, so the server and client agree.
   */
  const delay = ((index * 3.6) % GLIMMER_CYCLE).toFixed(2);

  return (
    <Link
      href={university.href}
      aria-label={`${university.name} programs`}
      className={cn(
        "group/uni inline-flex items-center rounded-md outline-none",
        "transition-[translate] duration-150 ease-out hover:-translate-y-0.5",
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-8 focus-visible:ring-offset-background",
        "motion-reduce:transition-none motion-reduce:hover:translate-y-0"
      )}
    >
      {failed ? (
        // The mark is the link's only content, so if the file 404s the name
        // has to take its place or the link becomes an empty target.
        <span className="text-h3 font-semibold whitespace-nowrap text-silver transition-colors duration-150 group-hover/uni:text-foreground motion-reduce:transition-none">
          {university.name}
        </span>
      ) : (
        <span className="relative inline-flex">
          <Image
            src={src}
            alt={university.name}
            width={400}
            height={200}
            onError={() => setFailed(true)}
            /*
             * max-height with width auto, never a set width: these lockups run
             * from about 2:1 to 4.3:1 and squashing them to a common width
             * would distort marks these schools' brand terms say may not be
             * distorted.
             */
            style={{
              maxHeight: `calc(var(--logo-height) * ${
                OPTICAL_SCALE[university.logo] ?? 1
              })`,
            }}
            className={cn(
              "h-auto w-auto max-w-none object-contain",
              "opacity-70 transition-opacity duration-150",
              "group-hover/uni:opacity-100 group-focus-visible/uni:opacity-100",
              "motion-reduce:transition-none"
            )}
          />
          {/* Masked to the logo's own alpha — see .glimmer in globals.css. */}
          <span
            aria-hidden
            className="glimmer"
            style={
              {
                "--logo": `url(${src})`,
                "--glimmer-delay": `${delay}s`,
                "--glimmer-cycle": `${GLIMMER_CYCLE}s`,
              } as React.CSSProperties
            }
          />
        </span>
      )}
    </Link>
  );
}
