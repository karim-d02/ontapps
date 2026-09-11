"use client";

import { Check, Copy } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

/**
 * An OUAC code you can copy. These get typed into the OUAC portal by hand,
 * character for character, and mistyping one is a real way to apply to the
 * wrong program — "MNS is not MLH" is literally one of the traps in the
 * dataset.
 *
 * The confirmation is the point: the icon becomes a check for 1.5s so the
 * click has an outcome. A copy button with no acknowledgement leaves the
 * reader wondering whether it worked and clicking again.
 */
export function CopyCode({ code, className }: { code: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      // Clipboard access can be denied outright (insecure context, permission
      // policy). Say nothing and change nothing rather than claiming a copy
      // that didn't happen — the code is right there to read either way.
      return;
    }
    setCopied(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCopied(false), 1500);
  }, [code]);

  return (
    <button
      type="button"
      onClick={copy}
      className={cn(
        "group/copy inline-flex shrink-0 items-center gap-1.5 rounded-md border border-line px-2 py-1",
        "data text-small font-semibold text-foreground",
        "transition-[border-color,background-color,translate] duration-150 ease-out outline-none",
        "hover:border-line-strong hover:bg-surface-raised",
        "active:translate-y-px",
        "focus-visible:ring-2 focus-visible:ring-ring",
        "motion-reduce:transition-none motion-reduce:active:translate-y-0",
        className
      )}
    >
      {code}
      {copied ? (
        <Check aria-hidden className="size-3.5 text-silver-light" />
      ) : (
        <Copy aria-hidden className="size-3.5 text-silver opacity-0 transition-opacity duration-150 group-hover/copy:opacity-100 group-focus-visible/copy:opacity-100 motion-reduce:transition-none" />
      )}
      <span className="sr-only">
        {copied ? `Copied OUAC code ${code}` : `Copy OUAC code ${code}`}
      </span>
      {/* Politely announced so a screen-reader user gets the same confirmation
          the sighted check mark gives. */}
      <span aria-live="polite" className="sr-only">
        {copied ? "Copied" : ""}
      </span>
    </button>
  );
}
