import { ImageResponse } from "next/og";

import { daysBetween, formatDate, nextDeadlineFor, todayISO } from "@/lib/deadlines";
import { LOGO_DATA_URI } from "@/lib/og-logo";
import { getAllPrograms, getProgramById, getVerificationDate } from "@/lib/data";

export const alt = "Program deadline summary";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export function generateStaticParams() {
  return getAllPrograms().map((program) => ({
    school: program.university_id,
    id: program.id,
  }));
}

/**
 * The share card.
 *
 * When someone drops a McMaster link into a group chat, the preview shows the
 * deadline and how many days are left — which is the single fact the people in
 * that chat want, and the reason a link like this gets forwarded again.
 *
 * Deliberately plain: system fonts, flat type, no gradient. next/og re-renders
 * this on demand, and a card that takes 400ms to generate is a card the
 * scraper gives up on.
 */
export default async function Image({
  params,
}: {
  params: Promise<{ school: string; id: string }>;
}) {
  const { school: schoolSlug, id } = await params;
  const program = getProgramById(id);

  if (!program || program.university_id !== schoolSlug) {
    return new ImageResponse(<Fallback />, size);
  }

  const today = todayISO();
  // Only rows the data marks as real deadlines reach the card.
  const next = nextDeadlineFor(program, today);
  const days = next ? daysBetween(today, next.date!) : null;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          // Same elevated base as the site, not pure black.
          background: "#121212",
          color: "#ffffff",
          padding: 72,
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              fontSize: 22,
              letterSpacing: 4,
              textTransform: "uppercase",
              color: "#b8b8b8",
              fontFamily: "ui-monospace, monospace",
            }}
          >
            {program.university} · {program.campus}
          </div>
          <div
            style={{
              display: "flex",
              marginTop: 20,
              fontSize: 68,
              lineHeight: 1.05,
              fontWeight: 700,
              letterSpacing: -2,
            }}
          >
            {program.name}
          </div>
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
              {next ? "Next date" : "Supplementary application"}
            </div>
            <div
              style={{
                display: "flex",
                marginTop: 14,
                fontSize: 52,
                fontWeight: 600,
                fontFamily: "ui-monospace, monospace",
              }}
            >
              {next
                ? formatDate(next.date!)
                : program.supp_app_required
                  ? "Required"
                  : "Not required"}
            </div>
          </div>

          {days !== null && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
              <div
                style={{
                  display: "flex",
                  fontSize: 96,
                  fontWeight: 700,
                  letterSpacing: -4,
                  fontFamily: "ui-monospace, monospace",
                }}
              >
                {days}
              </div>
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
                {days === 1 ? "Day left" : "Days left"}
              </div>
            </div>
          )}
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 20,
            color: "#8a8a8a",
            fontFamily: "ui-monospace, monospace",
            letterSpacing: 2,
          }}
        >
          {/* Identifier, not a focal point: 18px against a 20px mono line is
              a shade over its cap height, which is enough to read as a mark
              and not enough to compete with the countdown. */}
          <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <img src={LOGO_DATA_URI} width={18} height={18} alt="" style={{ borderRadius: 9 }} />
            ONTAPPS
          </span>
          {/* A range ("2026-09-15/2026-09-17"), printed as given — formatDate
              would turn it into an invalid date. */}
          <span>VERIFIED {getVerificationDate()}</span>
        </div>
      </div>
    ),
    size
  );
}

function Fallback() {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#121212",
        color: "#ffffff",
        fontSize: 64,
        fontWeight: 700,
        fontFamily: "system-ui, sans-serif",
      }}
    >
      OntApps
    </div>
  );
}
