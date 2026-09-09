const UNIVERSITIES = [
  { name: "McMaster University", mark: "McMaster" },
  { name: "Queen's University", mark: "Queen's" },
  { name: "University of Toronto", mark: "Toronto" },
  { name: "University of Waterloo", mark: "Waterloo" },
  { name: "Western University", mark: "Western" },
] as const;

/**
 * No official logo assets are available in this project. Real university
 * marks are trademarked and can't be sourced without the actual files, so
 * this renders a monochrome typographic stand-in in the same style as the
 * others. Swap for real SVGs (dropped into /public) if licensed assets
 * become available.
 */
function UniversityWordmark({ name, mark }: { name: string; mark: string }) {
  return (
    <span
      title={name}
      className="text-body font-medium tracking-wide text-silver transition-colors hover:text-silver-light"
    >
      {mark}
    </span>
  );
}

export { UniversityWordmark, UNIVERSITIES };
