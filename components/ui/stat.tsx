import Link from "next/link";
import { cn } from "@/lib/cn";
import { surface } from "./styles";

/** A headline number with its label; becomes a link when `href` is set. */
export function Stat({ label, value, href }: { label: string; value: React.ReactNode; href?: string }) {
  const className = cn(surface, "block px-4 py-3.5", href && "hover:border-ink/30");
  const body = (
    <>
      <span className="block truncate text-sm text-muted">{label}</span>
      <span className="mt-1 block truncate text-2xl font-semibold tracking-tight text-ink">{value}</span>
    </>
  );
  return href ? (
    <Link data-ui="Stat" href={href} className={className}>
      {body}
    </Link>
  ) : (
    <div data-ui="Stat" className={className}>
      {body}
    </div>
  );
}
