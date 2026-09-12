import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * The mark, inlined as a data URI for the Open Graph cards.
 *
 * next/og renders through Satori, which resolves `src` by fetching it — there
 * is no filesystem and no document to resolve "/logos/logo.png" against, so a
 * root-relative path silently renders nothing. A data URI is the one form that
 * needs no network at all, which matters because both cards are generated
 * during `next build`, when there is no deployment to fetch from yet.
 *
 * Read once at module scope rather than per request: the file is 8KB and every
 * card that takes too long to generate is a card the scraper gives up on.
 */
const LOGO_BYTES = readFileSync(join(process.cwd(), "public", "logos", "logo.png"));

export const LOGO_DATA_URI = `data:image/png;base64,${LOGO_BYTES.toString("base64")}`;
