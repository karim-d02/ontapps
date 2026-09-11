import { Card } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/section-header";
import { getMeta, getStaleOfficialPages } from "@/lib/programs";
import { formatDate } from "@/lib/utils";

export default function DataCheckPage() {
  const meta = getMeta();
  const staleOfficialPages = getStaleOfficialPages();

  return (
    <main className="mx-auto max-w-2xl px-4 pb-16 motion-safe:animate-fade-rise-sm sm:px-6">
      <header className="border-b border-border pt-6 pb-6">
        <SectionHeader level={1} label="Data check" title="What official pages get wrong" />
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
        <SectionHeader level={2} title="Currently stale" />
        {staleOfficialPages.length > 0 ? (
          <ul className="mt-4 space-y-4">
            {staleOfficialPages.map((entry, index) => (
              <Card key={index} as="li">
                <p className="text-body font-semibold text-foreground">{entry.page}</p>
                <p className="mt-1.5 text-body text-muted-foreground">{entry.problem}</p>
                <p className="mt-2 text-small text-muted-foreground">
                  Checked {formatDate(entry.checkedOn)}
                </p>
              </Card>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-body text-muted-foreground">
            No known stale official pages right now.
          </p>
        )}
      </section>

      <section className="py-6">
        <SectionHeader level={2} title="How figures are labelled" />
        <p className="mt-3 text-body text-foreground">{meta.disclaimer}</p>
      </section>
    </main>
  );
}
