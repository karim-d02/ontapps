"use client";

import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";

import { cn } from "@/lib/utils";

export interface PaletteEntry {
  id: string;
  name: string;
  school: string;
  href: string;
  /** OUAC codes, so "MNS" finds McMaster Health Sci. */
  codes: string[];
  kind: "program" | "page";
}

/**
 * Jump to any program from anywhere. ⌘K / Ctrl+K, or the button in the header.
 *
 * Matches on program name, school and OUAC code — a student who has the code
 * in front of them on the OUAC portal can type "MNS" and land on the right
 * page, which is the case this exists for.
 */
export function CommandPalette({
  entries,
  open,
  onClose,
}: {
  entries: PaletteEntry[];
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const listId = useId();

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return entries.slice(0, 8);
    return entries
      .filter(
        (entry) =>
          entry.name.toLowerCase().includes(q) ||
          entry.school.toLowerCase().includes(q) ||
          entry.codes.some((code) => code.toLowerCase().includes(q))
      )
      .slice(0, 8);
  }, [entries, query]);

  const close = useCallback(() => {
    setQuery("");
    setActive(0);
    onClose();
    returnFocus.current?.focus();
  }, [onClose]);

  // Remember where focus came from, and take it, when the dialog opens.
  // Writing to a ref and calling focus() are both external-system updates, so
  // nothing here cascades a render.
  useEffect(() => {
    if (!open) return;
    returnFocus.current = document.activeElement as HTMLElement;
    inputRef.current?.focus();
  }, [open]);

  const go = useCallback(
    (href: string) => {
      close();
      router.push(href);
    },
    [close, router]
  );

  function onInputKeyDown(event: React.KeyboardEvent) {
    if (event.key === "Escape") {
      event.preventDefault();
      close();
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((prev) => (results.length === 0 ? 0 : (prev + 1) % results.length));
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((prev) =>
        results.length === 0 ? 0 : (prev - 1 + results.length) % results.length
      );
      return;
    }
    if (event.key === "Enter") {
      const target = results[Math.min(active, results.length - 1)];
      if (target) {
        event.preventDefault();
        go(target.href);
      }
    }
    if (event.key === "Tab") {
      // The dialog is the whole interaction; Tab has nowhere useful to go.
      event.preventDefault();
    }
  }

  if (!open) return null;

  const activeIndex = Math.min(active, Math.max(results.length - 1, 0));

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center p-4 pt-[12vh]">
      {/* Click-away. A button rather than a bare div so it's reachable and
          announced, and so Escape isn't the only way out. */}
      <button
        type="button"
        aria-label="Close search"
        onClick={close}
        className="absolute inset-0 bg-black/60 motion-safe:animate-[fade-rise_0.15s_ease-out] outline-none"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Search programs"
        className="surface-frosted relative w-full max-w-xl overflow-hidden rounded-xl border border-line-strong shadow-2xl shadow-black/60"
      >
        <div className="flex items-center gap-3 border-b border-line px-4">
          <Search aria-hidden className="size-4 shrink-0 text-silver" />
          <input
            ref={inputRef}
            type="text"
            role="combobox"
            aria-expanded
            aria-controls={listId}
            aria-activedescendant={
              results[activeIndex] ? `${listId}-${results[activeIndex].id}` : undefined
            }
            autoComplete="off"
            placeholder="Program, school or OUAC code"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setActive(0);
            }}
            onKeyDown={onInputKeyDown}
            className="w-full bg-transparent py-4 text-body text-foreground outline-none placeholder:text-silver"
          />
          <kbd className="data hidden shrink-0 rounded border border-line px-1.5 py-0.5 text-label text-silver sm:block">
            ESC
          </kbd>
        </div>

        {results.length === 0 ? (
          <p className="px-4 py-8 text-center text-small text-muted-foreground">
            Nothing matches “{query}”. Try a school name, or an OUAC code like MNS.
          </p>
        ) : (
          <ul ref={listRef} id={listId} role="listbox" className="max-h-80 overflow-y-auto p-2">
            {results.map((entry, index) => (
              <li key={entry.id} id={`${listId}-${entry.id}`} role="option" aria-selected={index === activeIndex}>
                <button
                  type="button"
                  onMouseEnter={() => setActive(index)}
                  onClick={() => go(entry.href)}
                  className={cn(
                    "flex w-full items-baseline justify-between gap-4 rounded-md px-3 py-2.5 text-left outline-none",
                    index === activeIndex ? "bg-line" : "hover:bg-line/60"
                  )}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-small text-foreground">
                      {entry.name}
                    </span>
                    <span className="block text-label label-mono text-silver">
                      {entry.school}
                    </span>
                  </span>
                  {entry.codes.length > 0 && (
                    <span className="data shrink-0 text-label text-silver">
                      {entry.codes.slice(0, 3).join(" ")}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
