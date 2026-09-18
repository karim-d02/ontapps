import { ImageResponse } from "next/og";

import { LOGO_DATA_URI } from "@/lib/og-logo";
import { getAllPrograms, getUniversities, getVerificationDate } from "@/lib/data";

export const alt = "OntApps — Ontario university program deadlines and requirements";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * The share card for the site itself.
 *
 * Same treatment as the per-program cards in
 * app/programs/[school]/[id]/opengraph-image.tsx: the #121212 ground rather
 * than pure black, silver mono labels at 4px tracking, one hairline rule, and
 * the wordmark bottom-left. Pasted into a group chat next to a program link,
 * the two should read as the same object.
 *
 * Every figure is counted from data/programs.json at build time — nothing here
 * is a number someone typed into a design.
 */
export default function Image() {
  const programs = getAllPrograms().length;
  const universities = getUniversities().length;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#121212",
          color: "#ffffff",
          padding: 72,
          fontFamily: "system-ui, sans-serif",
        }}
      >
        {/* Wordmark, set the way the site header sets it. On this card it sits
            top-left rather than bottom-left — the bottom row here is the
            programs/universities count — so the mark follows it up here to
            stay beside the word it identifies. 22px against 26px type. */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            fontSize: 26,
            fontWeight: 700,
            letterSpacing: 2,
            textTransform: "uppercase",
          }}
        >
          <img src={LOGO_DATA_URI} width={22} height={22} alt="" style={{ borderRadius: 11 }} />
          OntApps
        </div>

        <div
          style={{
            display: "flex",
            fontSize: 84,
            lineHeight: 1.02,
            fontWeight: 700,
            letterSpacing: -3,
            textTransform: "uppercase",
            maxWidth: 980,
          }}
        >
          Simplifying Your Uni Applications
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            borderTop: "1px solid rgba(255,255,255,0.22)",
            paddingTop: 36,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div
              style={{
                display: "flex",
                fontSize: 20,
                letterSpacing: 4,
                textTransform: "uppercase",
                color: "#b8b8b8",
                fontFamily: "ui-monospace, monospace",
              }}
            >
              Tracking
            </div>
            <div
              style={{
                display: "flex",
                marginTop: 14,
                fontSize: 40,
                fontWeight: 600,
                fontFamily: "ui-monospace, monospace",
              }}
            >
              {programs} programs · {universities} universities
            </div>
          </div>

          <div
            style={{
              display: "flex",
              fontSize: 20,
              letterSpacing: 2,
              color: "#8a8a8a",
              fontFamily: "ui-monospace, monospace",
            }}
          >
            VERIFIED {getVerificationDate()}
          </div>
        </div>
      </div>
    ),
    size
  );
}

/** Matches the date format on the per-program cards. */
function formatForCard(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day))
    .toLocaleDateString("en-CA", {
      month: "short",
      day: "numeric",
      year: "numeric",
      timeZone: "UTC",
    })
    .toUpperCase();
}
