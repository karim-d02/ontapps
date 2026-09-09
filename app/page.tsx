import Link from "next/link";

import { Button } from "@/components/ui/button";
import { UNIVERSITIES, UniversityWordmark } from "@/components/university-wordmark";

export default function Page() {
  return (
    <main className="mx-auto flex min-h-svh max-w-3xl flex-col justify-center px-6 py-section-2xl">
      <h1 className="text-h1 font-semibold tracking-tight text-foreground">
        Simplifying Your Uni Applications
      </h1>
      <p className="mt-section-sm max-w-xl text-body text-muted-foreground">
        Ontario&apos;s health, engineering, and business programs each run their own
        deadlines, supplementary applications, and admission averages — and official
        pages are often stale or contradictory. OntApps tracks all of it in one place,
        verified and dated, so you know exactly what&apos;s true right now.
      </p>
      <div className="mt-section-lg">
        <Button
          size="lg"
          nativeButton={false}
          render={<Link href="/programs">Browse programs</Link>}
        />
      </div>

      <div className="mt-section-2xl border-t border-border/60 pt-section-md">
        <p className="text-small font-medium tracking-[0.08em] text-muted-foreground uppercase">
          Universities we cover
        </p>
        <ul className="mt-section-sm flex flex-wrap gap-x-section-lg gap-y-section-xs">
          {UNIVERSITIES.map((university) => (
            <li key={university.name}>
              <UniversityWordmark name={university.name} mark={university.mark} />
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
