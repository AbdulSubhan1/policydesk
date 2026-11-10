import { cn } from "@/lib/cn";

/** A padded block inside a flush Panel, e.g. one tab's content. `muted` marks an action area such as a form. */
export function PanelSection({
  muted,
  className,
  children,
}: {
  muted?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div data-ui="PanelSection" className={cn("px-5 py-4", muted && "border-t border-line bg-paper/50", className)}>
      {children}
    </div>
  );
}
