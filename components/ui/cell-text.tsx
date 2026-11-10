import Link from "next/link";

/** Primary text with a muted second line. Both truncate instead of overflowing the cell. */
export function CellText({
  primary,
  secondary,
  href,
}: {
  primary: React.ReactNode;
  secondary?: React.ReactNode;
  href?: string;
}) {
  return (
    <div data-ui="CellText" className="max-w-72 min-w-0">
      {href ? (
        <Link href={href} className="block truncate font-medium text-ink hover:text-brand">
          {primary}
        </Link>
      ) : (
        <span className="block truncate font-medium text-ink">{primary}</span>
      )}
      {secondary && <span className="block truncate text-xs text-muted">{secondary}</span>}
    </div>
  );
}
