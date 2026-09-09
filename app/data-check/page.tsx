import { getMeta, getStaleOfficialPages } from "@/lib/programs";
import { formatDate } from "@/lib/utils";

export default function DataCheckPage() {
  const meta = getMeta();
  const staleOfficialPages = getStaleOfficialPages();

  return (
    <main className="mx-auto max-w-2xl px-4 pb-16 sm:px-6">
      <header className="border-b border-border pt-6 pb-6">
        <p className="text-small font-medium tracking-[0.08em] text-muted-foreground uppercase">
          Data check
        </p>
        <h1 className="mt-1 text-2xl leading-tight font-semibold tracking-tight text-foreground sm:text-h2">
          What official pages get wrong
        </h1>
        <p className="mt-3 text-body text-muted-foreground">
          Every date on this site is checked against the university&apos;s own admissions
          page. When that page is stale or contradicts itself, we log it here instead of
          quietly working around it.
        </p>
        <p className="mt-3 text-small text-muted-foreground">
          Last verified {formatDate(meta.verifiedOn)}
        </p>
      </header>

      <section className="border-b border-border py-6">
        <h2 className="text-h3 font-semibold tracking-tight text-foreground">
          Currently stale
        </h2>
        {staleOfficialPages.length > 0 ? (
          <ul className="mt-4 space-y-4">
            {staleOfficialPages.map((entry, index) => (
              <li key={index} className="rounded-lg border border-silver-light/40 p-4">
                <p className="text-body font-semibold text-foreground">{entry.page}</p>
                <p className="mt-1.5 text-body text-muted-foreground">{entry.problem}</p>
                <p className="mt-2 text-small text-silver-dark">
                  Checked {formatDate(entry.checkedOn)}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-body text-muted-foreground">
            No known stale official pages right now.
          </p>
        )}
      </section>

      <section className="py-6">
        <h2 className="text-h3 font-semibold tracking-tight text-foreground">
          How figures are labelled
        </h2>
        <p className="mt-3 text-body text-foreground">{meta.disclaimer}</p>
      </section>
    </main>
  );
}
