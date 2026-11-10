export function EmptyState({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div data-ui="EmptyState" className="px-5 py-10 text-center">
      <p className="font-medium text-ink">{title}</p>
      {children && <div className="mx-auto mt-1 max-w-sm text-sm text-muted">{children}</div>}
    </div>
  );
}
