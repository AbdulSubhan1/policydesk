import { Icon, type IconName } from "./icon";

/** What to show when there is nothing to list: an icon, what is missing, why, and what to do next. */
export function EmptyState({
  title,
  description,
  icon = "inbox",
  action,
}: {
  title: string;
  description?: React.ReactNode;
  icon?: IconName;
  action?: React.ReactNode;
}) {
  return (
    <div data-ui="EmptyState" className="grid justify-items-center gap-2 px-5 py-12 text-center">
      <span className="grid h-11 w-11 place-items-center rounded-full bg-paper text-muted">
        <Icon name={icon} size={20} />
      </span>
      <p className="font-medium text-ink">{title}</p>
      {description && <div className="max-w-sm text-sm text-muted">{description}</div>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
