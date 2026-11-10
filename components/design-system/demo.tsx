/** One named example on a component's page: a title, a line on when to use it, and the live component. */
export function Demo({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="grid min-w-0 gap-3 border-b border-line px-5 py-5 last:border-b-0">
      <div className="min-w-0">
        <h3 className="text-sm font-semibold">{title}</h3>
        {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
      </div>
      <div className="min-w-0 rounded-lg border border-dashed border-line bg-paper/50 p-4 sm:p-6">{children}</div>
    </section>
  );
}

export type DemoProps = {
  name: string;
  /** The component page's own URL, for demos that link or filter through the query string. */
  path: string;
  params: Record<string, string | undefined>;
};
