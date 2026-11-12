import Link from "next/link";
import { Icon } from "./icon";

export function PageHeader({
  title,
  badges,
  description,
  action,
  back,
}: {
  title: string;
  /** Status pills beside the title, e.g. a lead's stage. */
  badges?: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  back?: { href: string; label: string };
}) {
  return (
    <header data-ui="PageHeader" className="mb-6">
      {back && (
        <Link href={back.href} className="mb-2 inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
          <Icon name="chevronStart" size={14} className="rtl:rotate-180" />
          {back.label}
        </Link>
      )}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          {badges ? (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
              <h1 className="text-2xl font-semibold tracking-tight [overflow-wrap:anywhere] text-ink">{title}</h1>
              {badges}
            </div>
          ) : (
            <h1 className="text-2xl font-semibold tracking-tight [overflow-wrap:anywhere] text-ink">{title}</h1>
          )}
          {description && <p className="mt-1 max-w-2xl text-sm text-muted">{description}</p>}
        </div>
        {action}
      </div>
    </header>
  );
}
