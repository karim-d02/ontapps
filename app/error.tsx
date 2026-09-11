"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import { useEffect } from "react";

/**
 * One bad record shouldn't take a page down, and it certainly shouldn't take
 * the site down. This boundary keeps the header, footer and navigation alive
 * and gives the reader somewhere to go — the program list is almost always
 * what they actually wanted.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surfaced in the browser console and in Vercel's logs. Without the digest
    // a production stack trace is unattributable.
    console.error("Page error", error.digest ?? "", error);
  }, [error]);

  return (
    <main className="shell pt-[var(--rhythm-section)] pb-[var(--rhythm-section)]">
      <p className="data text-label text-silver">Something broke</p>
      <h1 className="measure mt-4 text-h1 text-foreground">
        This page didn&apos;t load properly.
      </h1>
      <p className="measure mt-4 text-body text-muted-foreground">
        The data behind it is fine — this is our problem, not yours. Reloading usually
        fixes it. If it doesn&apos;t, the program list still works.
      </p>

      <div className="mt-8 flex flex-wrap gap-3">
        <Button onClick={reset} size="lg">
          Try again
        </Button>
        <Button size="lg" variant="secondary" nativeButton={false} render={<Link href="/programs" />}>
          All programs
        </Button>
      </div>

      {error.digest && (
        <p className="data mt-10 text-label text-silver">Reference {error.digest}</p>
      )}
    </main>
  );
}
