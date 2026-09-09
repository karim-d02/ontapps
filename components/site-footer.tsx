import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mx-auto max-w-2xl border-t border-border px-4 py-6 sm:px-6">
      <Link
        href="/data-check"
        className="text-small text-muted-foreground underline decoration-silver/50 underline-offset-4 transition-colors hover:text-foreground"
      >
        Data check — what official pages get wrong
      </Link>
    </footer>
  );
}
