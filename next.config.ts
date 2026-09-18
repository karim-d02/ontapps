import type { NextConfig } from "next"

/**
 * Program ids changed in the new data schema, and program URLs are built from
 * them. The site is live and people have shared links to these pages, so every
 * old program URL redirects permanently to its successor.
 *
 * University slugs did NOT change: the new `university_id` ("mcmaster-university")
 * is byte-identical to the slug the old code generated from the school name, so
 * only the final path segment moves.
 *
 * Each pair below was read out of the old file (git show main:data/programs.json)
 * and matched to the new one on university + program name. Two old ids are
 * deliberately ABSENT because each split into two new programs and picking
 * either successor would be a guess:
 *
 *   uoft-engineering      -> uoft-engineering-trackone AND uoft-engineering-core8-engsci
 *   mcmaster-engineering  -> mcmaster-engineering-i    AND mcmaster-ibiomed
 *
 * Both are written up under "Decisions needed" in MIGRATION-REPORT.md. Until
 * someone decides, those two URLs 404 rather than silently landing a student on
 * the wrong program's deadlines — which is the more expensive of the two errors.
 *
 * waterloo-engineering and queens-commerce kept their ids and need no redirect.
 */
const PROGRAM_ID_REDIRECTS: { school: string; from: string; to: string }[] = [
  { school: "mcmaster-university", from: "mcmaster-health-sci", to: "mcmaster-bhsc" },
  { school: "queens-university", from: "queens-health-sci", to: "queens-health-sciences" },
  { school: "western-university", from: "western-med-sci", to: "western-medical-sciences" },
  { school: "western-university", from: "western-health-sci", to: "western-health-sciences" },
  {
    school: "university-of-toronto",
    from: "uoft-life-sci-stgeorge",
    to: "uoft-life-sciences-st-george",
  },
  { school: "university-of-toronto", from: "uoft-life-sci-utm", to: "utm-life-sciences" },
  { school: "university-of-toronto", from: "rotman-commerce", to: "uoft-rotman-commerce" },
]

const nextConfig: NextConfig = {
  async redirects() {
    return PROGRAM_ID_REDIRECTS.map(({ school, from, to }) => ({
      source: `/programs/${school}/${from}`,
      destination: `/programs/${school}/${to}`,
      permanent: true,
    }))
  },
}

export default nextConfig
