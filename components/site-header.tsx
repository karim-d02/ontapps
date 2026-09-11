"use client";

import { Menu, Search, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { CommandPalette, type PaletteEntry } from "@/components/command-palette";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "/programs", label: "Programs" },
  { href: "/check", label: "Course check" },
  { href: "/timeline", label: "My timeline" },
  { href: "/data-check", label: "Data check" },
];

const FOCUSABLE = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function SiteHeader({ paletteEntries }: { paletteEntries: PaletteEntry[] }) {
  const pathname = usePathname();
  const scrolled = useScrolledPastHero();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);

  // The drawer remembers which route it was opened on, so a navigation closes
  // it by derivation rather than by a setState in an effect — no cascading
  // render, and no frame where the drawer is still open over the new page.
  const [menu, setMenu] = useState({ open: false, path: pathname });
  const menuOpen = menu.open && menu.path === pathname;

  const closeMenu = useCallback(() => setMenu({ open: false, path: pathname }), [pathname]);
  const toggleMenu = useCallback(
    () => setMenu((prev) => ({ open: !(prev.open && prev.path === pathname), path: pathname })),
    [pathname]
  );

  // ⌘K / Ctrl+K from anywhere. Lives here rather than inside the palette so
  // the header button and the shortcut drive the same piece of state.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletteOpen((prev) => !prev);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  useFocusTrap({ active: menuOpen, containerRef: drawerRef, returnRef: toggleRef, onEscape: closeMenu });

  return (
    <>
      {/*
        The scroll sentinel. It occupies the first --nav-height of the document
        and is watched by an IntersectionObserver — once it has scrolled out of
        view, the header's bottom rule fades in. No scroll listener, so nothing
        runs on the main thread per frame, and nothing measures layout.
      */}
      <div data-nav-sentinel aria-hidden className="pointer-events-none absolute top-0 left-0 h-[var(--nav-height)] w-px" />

      <header
        className={cn(
          // Sticky, never fixed: the header holds its own space in the flow,
          // so nothing under it jumps when it engages. Height is a constant —
          // only the rule's opacity changes on scroll.
          "surface-frosted-page sticky top-0 z-50 h-[var(--nav-height)]"
        )}
      >
        <a
          href="#main-content"
          className="absolute top-2 left-2 z-10 -translate-y-[200%] rounded-md border border-line-strong bg-surface-overlay px-3 py-2 text-small font-medium text-foreground transition-transform duration-150 focus-visible:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none"
        >
          Skip to content
        </a>

        {/* Same shell as every page, so the wordmark sits on the same left
            edge as the page heading below it rather than near it. */}
        <div className="shell flex h-full items-center justify-between">
          <Link
            href="/"
            className="group/brand flex items-center gap-2.5 rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4 focus-visible:ring-offset-background"
          >
            {/* The source art has a pure-black plate baked in and no alpha, so
                on a #121212 header it would otherwise read as a slightly
                darker square floating behind the mark. Framing it as a tile
                makes that deliberate instead of accidental. */}
            <Image
              src="/logos/logo.png"
              alt=""
              width={64}
              height={64}
              priority
              className="size-7 rounded-md border border-line bg-black"
            />
            <span className="text-body font-bold tracking-tight text-foreground uppercase">
              OntApps
            </span>
          </Link>

          <nav aria-label="Main" className="hidden items-center gap-1 sm:flex">
            {NAV_LINKS.map((link) => {
              const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "relative rounded-md px-3 py-2 text-small transition-colors duration-150 outline-none",
                    "focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none",
                    // The active marker is a rule under the label, aligned
                    // with the header's own bottom rule — a status board tells
                    // you where you are with position, not with a colour.
                    "after:absolute after:inset-x-3 after:-bottom-px after:h-px after:origin-left after:bg-silver-light after:transition-transform after:duration-150 after:content-[''] motion-reduce:after:transition-none",
                    active
                      ? "text-foreground after:scale-x-100"
                      : "text-muted-foreground after:scale-x-0 hover:text-foreground hover:after:scale-x-100"
                  )}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setPaletteOpen(true)}
              aria-label="Search programs"
              className="group/search inline-flex items-center gap-2 rounded-md border border-line px-2.5 py-1.5 text-small text-muted-foreground outline-none transition-colors duration-150 hover:border-line-strong hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none"
            >
              <Search aria-hidden className="size-4" />
              <span className="hidden sm:inline">Search</span>
              <kbd className="data hidden rounded border border-line px-1 text-label text-silver md:inline">
                &#8984;K
              </kbd>
            </button>

            <button
            ref={toggleRef}
            type="button"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            aria-controls="mobile-nav"
            className="-mr-2 inline-flex size-10 items-center justify-center rounded-md text-foreground outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-ring active:bg-surface-raised motion-reduce:transition-none sm:hidden"
            onClick={toggleMenu}
          >
              {menuOpen ? (
                <X aria-hidden className="size-5" />
              ) : (
                <Menu aria-hidden className="size-5" />
              )}
            </button>
          </div>
        </div>

        {/*
          The bottom rule is its own element so only its opacity animates.
          Transitioning border-color on the header would repaint the whole bar.
        */}
        <div
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-x-0 bottom-0 h-px bg-line-strong transition-opacity duration-200 motion-reduce:transition-none",
            scrolled ? "opacity-100" : "opacity-0"
          )}
        />
      </header>

      {/*
        Mobile drawer. Full height below the header, frosted, animated purely
        in CSS (opacity + a 6px rise — never transform: translateX, which would
        hang a full-viewport element off the right edge and create a horizontal
        scrollbar). `inert` when closed keeps its links out of the tab order
        and the accessibility tree without needing to unmount it, which is what
        lets the transition run in both directions.
      */}
      <div
        id="mobile-nav"
        ref={drawerRef}
        inert={!menuOpen}
        data-state={menuOpen ? "open" : "closed"}
        className={cn(
          "surface-frosted fixed inset-x-0 bottom-0 z-40 top-[var(--nav-height)] sm:hidden",
          "border-t border-line",
          "transition-[opacity,translate] duration-200 ease-out motion-reduce:transition-none",
          menuOpen
            ? "translate-y-0 opacity-100"
            : "pointer-events-none -translate-y-1.5 opacity-0"
        )}
      >
        <nav aria-label="Main" className="shell flex flex-col py-2">
          {NAV_LINKS.map((link) => {
            const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                onClick={closeMenu}
                className={cn(
                  // -mx-2/px-2 pulls the hit area (and the focus ring with it)
                  // into the drawer's own padding, so the ring has breathing
                  // room instead of jamming against the viewport edge.
                  "-mx-2 flex items-center justify-between rounded-md border-b border-line px-2 py-4 text-h2 outline-none",
                  "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
                  active ? "text-foreground" : "text-muted-foreground"
                )}
              >
                {link.label}
                {active && (
                  <span aria-hidden className="text-label label-mono text-silver">
                    Current
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      <CommandPalette
        entries={paletteEntries}
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
      />
    </>
  );
}

/**
 * True once the document has scrolled past the top --nav-height — i.e. once
 * the header is overlapping content rather than sitting on the hero's own
 * ground. Uses an IntersectionObserver on a sentinel rather than a scroll
 * listener so nothing runs per scroll frame.
 */
function useScrolledPastHero() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const sentinel = document.querySelector("[data-nav-sentinel]");
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      ([entry]) => setScrolled(!entry.isIntersecting),
      { threshold: 0 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  return scrolled;
}

/**
 * Keeps Tab inside the open drawer, moves focus into it on open, closes on
 * Escape, and returns focus to the trigger — otherwise a keyboard user tabs
 * from an open menu straight into the page behind it.
 */
function useFocusTrap({
  active,
  containerRef,
  returnRef,
  onEscape,
}: {
  active: boolean;
  containerRef: React.RefObject<HTMLElement | null>;
  returnRef: React.RefObject<HTMLElement | null>;
  onEscape: () => void;
}) {
  const wasActive = useRef(false);

  useEffect(() => {
    if (!active) {
      // Only pull focus back if we were the ones who took it, so an unrelated
      // re-render doesn't yank focus out of whatever the user is using.
      if (wasActive.current) {
        returnRef.current?.focus();
        wasActive.current = false;
      }
      return;
    }

    wasActive.current = true;
    const container = containerRef.current;
    container?.querySelector<HTMLElement>(FOCUSABLE)?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onEscape();
        return;
      }
      if (event.key !== "Tab") return;

      // The trigger doubles as the close button, so it belongs in the cycle —
      // first, because that's where it sits in the DOM.
      const items = [
        returnRef.current,
        ...Array.from(container?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []),
      ].filter((item): item is HTMLElement => Boolean(item));
      if (items.length === 0) return;

      // Every Tab is handled here, not just the ones at the ends. Letting the
      // browser move focus natively between the trigger and the drawer walks
      // straight through the page controls that sit between them in the DOM —
      // which is exactly the leak this trap exists to close.
      event.preventDefault();

      const current = document.activeElement;
      const index = current instanceof HTMLElement ? items.indexOf(current) : -1;
      const step = event.shiftKey ? -1 : 1;
      const next = index === -1 ? 0 : (index + step + items.length) % items.length;
      items[next].focus();
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [active, containerRef, returnRef, onEscape]);
}
