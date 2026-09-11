import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { SpeedInsights } from "@vercel/speed-insights/next"

import "./globals.css"
import type { PaletteEntry } from "@/components/command-palette"
import { LowFxFlag } from "@/components/low-fx-flag"
import { PageTransition } from "@/components/page-transition"
import { PointerLight } from "@/components/pointer-light"
import { SiteFooter } from "@/components/site-footer"
import { SiteHeader } from "@/components/site-header"
import { getAllPrograms, getSchoolSlug } from "@/lib/programs"
import { cn } from "@/lib/utils";

// The variable names deliberately differ from the Tailwind theme keys
// (--font-sans / --font-mono). Binding next/font to the theme key itself makes
// `--font-mono: var(--font-mono)` in @theme inline a self-reference, which is
// invalid at computed-value time — the site rendered every "mono" value in the
// system monospace for as long as that was wired up. See app/globals.css.
const fontSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
  display: "swap",
})

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  display: "swap",
})

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://ontapps.vercel.app"

export const metadata: Metadata = {
  // Without this, every Open Graph image URL resolves against localhost and a
  // link shared into a group chat previews as nothing at all — which for a
  // site that spreads by being pasted between Grade 12s is the whole game.
  metadataBase: new URL(SITE_URL),
  title: {
    default: "OntApps — Ontario university application deadlines and requirements",
    template: "%s · OntApps",
  },
  description:
    "Deadlines, supplementary applications, admission averages and the traps that catch applicants out, for Ontario health, engineering and business programs. Checked by hand and dated.",
  applicationName: "OntApps",
  // No `icons` key on purpose. Declaring one here *overrides* Next's
  // file-based convention, so `app/icon.png` and `app/apple-icon.png` were
  // being generated as routes and then never linked — the head carried a lone
  // `<link rel="icon" href="/logos/logo.png">` with no type and no sizes, and
  // the apple touch icon was orphaned entirely. Letting the convention run
  // emits both links with correct type/sizes and a content hash.
  openGraph: {
    type: "website",
    siteName: "OntApps",
    locale: "en_CA",
    url: SITE_URL,
  },
  twitter: { card: "summary_large_image" },
  robots: { index: true, follow: true },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  // Built on the server so the palette ships with the page and has nothing to
  // fetch when it opens.
  const paletteEntries: PaletteEntry[] = [
    ...getAllPrograms().map((program) => ({
      id: program.id,
      name: program.name,
      school: program.school,
      href: `/programs/${getSchoolSlug(program.school)}/${program.id}`,
      codes: program.ouacCodes.map((code) => code.code),
      kind: "program" as const,
    })),
    { id: "page-programs", name: "All programs", school: "Browse", href: "/programs", codes: [], kind: "page" as const },
    { id: "page-check", name: "Check my courses", school: "Tool", href: "/check", codes: [], kind: "page" as const },
    { id: "page-timeline", name: "My timeline", school: "Tool", href: "/timeline", codes: [], kind: "page" as const },
    { id: "page-data-check", name: "Data check", school: "About", href: "/data-check", codes: [], kind: "page" as const },
  ]

  return (
    // `dark` is hardcoded rather than driven by next-themes: the palette is a
    // single monochrome system tuned for a dark ground, and a light variant
    // that nobody tuned is worse than no light variant at all. The class stays
    // on the element so registry components that scope to `.dark *` still
    // resolve. See the elevation ladder note in app/globals.css.
    <html
      lang="en"
      className={cn("dark antialiased font-sans", fontSans.variable, fontMono.variable)}
    >
      <body className="relative flex min-h-svh flex-col">
        <LowFxFlag />
        <PointerLight />
        <SiteHeader paletteEntries={paletteEntries} />
        {/*
          Target of the skip link. A div, not a <main>: every page renders its
          own <main>, and nesting one inside another would give the document
          two main landmarks. tabIndex={-1} makes it programmatically focusable
          so the jump moves focus and not just the viewport.
        */}
        <div
          id="main-content"
          tabIndex={-1}
          className="flex flex-1 flex-col scroll-mt-[var(--nav-height)] outline-none"
        >
          <PageTransition>{children}</PageTransition>
        </div>
        <SiteFooter />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}
