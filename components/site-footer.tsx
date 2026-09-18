import Link from "next/link";

import { getMeta, getStaleOfficialPages, getVerificationDate } from "@/lib/data";

export function SiteFooter() {
  const meta = getMeta();
  const staleCount = getStaleOfficialPages().length;

  return (
    <footer className="mt-[var(--rhythm-section)] border-t border-line">
      {/* Same shell as the header and every page — the rule used to stop a
          third of the way across a wide screen because the footer capped at
          max-w-2xl while /programs ran to 1800px. */}
      <div className="shell grid-12 py-8">
        <div className="col-span-12 flex flex-col gap-4 sm:col-span-7">
          <Link
            href="/data-check"
            className="group/foot inline-flex w-fit items-baseline gap-2 rounded-sm text-small text-muted-foreground outline-none transition-colors duration-150 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4 focus-visible:ring-offset-background motion-reduce:transition-none"
          >
            <span className="relative after:absolute after:inset-x-0 after:-bottom-0.5 after:h-px after:origin-left after:scale-x-0 after:bg-current after:transition-transform after:duration-150 after:content-[''] group-hover/foot:after:scale-x-100 motion-reduce:after:transition-none">
              Data check
            </span>
            <span className="data text-label text-silver">
              {staleCount} official {staleCount === 1 ? "page" : "pages"} currently wrong
            </span>
          </Link>
          {/* An instruction, not an assertion. The previous wording claimed
              the official page "decides your application", which is a fact
              about university process that the dataset doesn't record. */}
          <p className="measure text-small text-muted-foreground">
            Always confirm against the university&apos;s own page before you act.
          </p>
        </div>

        <dl className="col-span-12 flex flex-wrap gap-x-10 gap-y-4 sm:col-span-5 sm:justify-end">
          <div>
            <dt className="text-label label-mono text-silver">Cycle</dt>
            <dd className="data mt-1 text-small text-foreground">{meta.entry_cycle}</dd>
          </div>
          <div>
            <dt className="text-label label-mono text-silver">Verified</dt>
            {/* The verification value is a RANGE ("2026-09-15/2026-09-17"),
                not a single ISO date, so it is printed as given rather than
                run through formatDate — and it is not wrapped in a <time>,
                whose dateTime attribute this is not a valid value for. */}
            <dd className="data mt-1 text-small text-foreground">
              {getVerificationDate()}
            </dd>
          </div>
        </dl>
      </div>
    </footer>
  );
}
