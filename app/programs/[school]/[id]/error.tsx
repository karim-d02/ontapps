"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import { useEffect } from "react";

/**
 * Program-level boundary. A single malformed record — an unexpected shape in
 * one program's suppApp, say — takes out that program's page and nothing else.
 * The other ten stay reachable.
 */
export default function ProgramError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Program page error", error.digest ?? "", error);
  }, [error]);

  return (
    <main className="shell pt-[var(--rhythm-section)] pb-[var(--rhythm-section)]">
      <p className="data text-label text-silver">This program&apos;s page</p>
      <h1 className="measure mt-4 text-h1 text-foreground">Couldn&apos;t be shown.</h1>
      <p className="measure mt-4 text-body text-muted-foreground">
        Every other program still works. Do not treat the absence of this page as the
        absence of a deadline — check the university&apos;s own admissions page.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Button onClick={reset} size="lg">
          Try again
        </Button>
        <Button size="lg" variant="secondary" nativeButton={false} render={<Link href="/programs" />}>
          All programs
        </Button>
      </div>
    </main>
  );
}
