import { cn } from "@/lib/cn";
import { Icon } from "./icon";
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
  /** On phones the panel folds to its title (and `summary`) and opens on tap; from lg up it is always open. */
  collapsible?: boolean;
  /** One line after the title while folded on a phone, e.g. "· $1,140 a year". */
  summary?: React.ReactNode;
  children?: React.ReactNode;
};

/** A titled section of a page. The one building block for grouping content. */
export function Panel({
  title,
  description,
  actions,
  footer,
  flush,
  className,
  id,
  collapsible,
  summary,
  children,
}: Props) {
  if (collapsible) {
    // A native <details>: from lg up its content is forced visible and the title stops toggling
    return (
      <details
        data-ui="Panel"
        id={id}
        className={cn(surface, "group lg:[&::details-content]:[content-visibility:visible]", className)}
      >
        <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-5 py-3 outline-none focus-visible:ring-3 focus-visible:ring-brand/25 lg:pointer-events-none lg:cursor-auto lg:border-b lg:border-line lg:py-4 [&::-webkit-details-marker]:hidden">
          <h2 className="min-w-0 font-semibold text-ink">
            {title}
            {summary && <span className="ms-1 font-normal text-muted lg:hidden">{summary}</span>}
          </h2>
          <Icon
            name="chevronDown"
            size={16}
            className="shrink-0 text-muted transition-transform group-open:rotate-180 lg:hidden"
          />
        </summary>
        <div className={cn("border-t border-line lg:border-t-0", !flush && "px-5 py-4")}>{children}</div>
      </details>
    );
  }
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
