import { cn } from "@/lib/cn";

/** A select and a button on one line, wrapping on narrow screens. For one-click server actions. */
export function InlineForm({ className, ...props }: React.FormHTMLAttributes<HTMLFormElement>) {
  return (
    <form
      data-ui="InlineForm"
      className={cn(
        "flex min-w-0 flex-wrap items-center gap-2 [&>[data-ui=Autocomplete]]:flex-1 [&>[data-ui=Autocomplete]]:basis-40",
        className,
      )}
      {...props}
    />
  );
}
