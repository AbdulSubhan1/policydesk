import { cn } from "@/lib/cn";
import { surface } from "./styles";

type Props = {
  title?: string;
  description?: React.ReactNode;
  /** Buttons or a badge at the end of the title row. */
  actions?: React.ReactNode;
  /** A muted area under the content, e.g. an "add" form below a list. */
  footer?: React.ReactNode;
  /** No padding around the content, for lists, tabs and tables that run edge to edge. */
  flush?: boolean;
  className?: string;
  id?: string;
  children?: React.ReactNode;
};

/** A titled section of a page. The one building block for grouping content. */
export function Panel({ title, description, actions, footer, flush, className, id, children }: Props) {
  return (
    <section data-ui="Panel" id={id} className={cn(surface, className)}>
      {(title || actions) && (
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-4">
          <div className="min-w-0">
            {title && <h2 className="font-semibold text-ink">{title}</h2>}
            {description && <div className="mt-0.5 text-sm text-muted">{description}</div>}
          </div>
          {actions}
        </header>
      )}
      {children !== undefined && <div className={flush ? undefined : "px-5 py-4"}>{children}</div>}
      {footer && <div className="border-t border-line bg-paper/50 px-5 py-4">{footer}</div>}
    </section>
  );
}
