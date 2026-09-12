import type { MetadataRoute } from "next";

import { getAllPrograms, getMeta, getSchools, getSchoolSlug } from "@/lib/programs";

// Sitemap entries must be absolute. metadataBase resolves the canonical and
// Open Graph URLs in generateMetadata, but it does not apply here — relative
// <loc> values make the whole sitemap invalid and search engines drop it.
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://ontapps.ca";
const abs = (path: string) => new URL(path, SITE_URL).toString();

/**
 * Every route, so "McMaster health sci requirements" can find the page that
 * answers it. Built from the dataset rather than hand-listed, so adding a
 * program to programs.json adds it here.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date(getMeta().verifiedOn);

  const staticRoutes: MetadataRoute.Sitemap = (
    [
      { url: "/", changeFrequency: "weekly", priority: 1 },
      { url: "/programs", changeFrequency: "weekly", priority: 0.9 },
      { url: "/check", changeFrequency: "monthly", priority: 0.8 },
      { url: "/timeline", changeFrequency: "monthly", priority: 0.7 },
      { url: "/compare", changeFrequency: "monthly", priority: 0.5 },
      { url: "/data-check", changeFrequency: "weekly", priority: 0.6 },
    ] satisfies MetadataRoute.Sitemap
  ).map((route) => ({ ...route, url: abs(route.url), lastModified }));

  const schoolRoutes: MetadataRoute.Sitemap = getSchools().map((school) => ({
    url: abs(`/programs/${getSchoolSlug(school)}`),
    lastModified,
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  const programRoutes: MetadataRoute.Sitemap = getAllPrograms().map((program) => ({
    url: abs(`/programs/${getSchoolSlug(program.school)}/${program.id}`),
    lastModified: new Date(program.verifiedOn),
    changeFrequency: "weekly",
    // The program pages are the reason anyone arrives from a search engine.
    priority: 0.9,
  }));

  return [...staticRoutes, ...schoolRoutes, ...programRoutes];
}
