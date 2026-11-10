/** Title row of a card, with an optional action at the end. */
export function CardHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div
      data-ui="CardHeader"
      className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-4"
    >
      <div className="min-w-0">
        <h2 className="font-semibold text-ink">{title}</h2>
        {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}
