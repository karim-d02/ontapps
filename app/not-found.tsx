import Link from "next/link";

import { Card } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/section-header";
import { getAllPrograms } from "@/lib/data";

export const metadata = { title: "Page not found" };

/**
 * A 404 that helps rather than apologises. Most arrivals here are a mistyped
 * or truncated program URL pasted out of a group chat, so the useful response
 * is the list of programs — not a sad face and a back button.
 */
export default function NotFound() {
  const programs = getAllPrograms();

  return (
    <main className="shell pt-[var(--rhythm-section)] pb-[var(--rhythm-section)]">
      <SectionHeader level={1} label="404" title="That page isn't here" />
      <p className="measure mt-4 text-body text-muted-foreground">
        The link may have been truncated on its way into a group chat, or the program may
        not be one of the {programs.length} we track. Everything we do have:
      </p>

      <ul className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {programs.map((program) => (
          <Card key={program.id} as="li" interactive>
            <h2 className="text-h3 font-semibold text-foreground">
              <Link
                href={`/programs/${program.university_id}/${program.id}`}
                className="rounded-sm outline-none after:absolute after:inset-0 after:content-['']"
              >
                {program.name}
              </Link>
            </h2>
            <p className="mt-1 text-small text-muted-foreground">{program.university}</p>
            <p className="data mt-3 text-label text-silver">
              {program.ouac_codes.map((code) => code.code).join(" ")}
            </p>
          </Card>
        ))}
      </ul>

      <p className="mt-10 text-small text-muted-foreground">
        Or press{" "}
        <kbd className="data rounded border border-line px-1.5 py-0.5 text-label text-foreground">
          ⌘K
        </kbd>{" "}
        and search by OUAC code.
      </p>
    </main>
  );
}
