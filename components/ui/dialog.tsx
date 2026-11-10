"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { Icon } from "./icon";

const SIZES = { sm: "max-w-sm", md: "max-w-lg", lg: "max-w-2xl" } as const;

type Props = {
  /** The element that opens the dialog, e.g. a Button with type="button". */
  trigger: React.ReactNode;
  title: string;
  description?: React.ReactNode;
  children?: React.ReactNode;
  /** Buttons at the bottom. A submit button submits the form the dialog sits in; data-dialog-close closes it. */
  footer?: React.ReactNode;
  size?: keyof typeof SIZES;
  /** "end" slides in from the side as a sheet. */
  side?: "center" | "end";
  closeLabel?: string;
};

/**
 * Modal built on the native <dialog>: focus is trapped, Escape and a backdrop click close it.
 * Placed inside a <form>, a submit button in `footer` submits that form.
 */
export function Dialog({
  trigger,
  title,
  description,
  children,
  footer,
  size = "md",
  side = "center",
  closeLabel = "Close",
}: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <>
      <span data-ui="Dialog" className="contents" onClick={() => setOpen(true)}>
        {trigger}
      </span>
      <dialog
        ref={ref}
        aria-label={title}
        onClose={() => setOpen(false)}
        // A click on the dialog element itself is a click on the backdrop; any [data-dialog-close] button closes too
        onClick={(e) => {
          const target = e.target as HTMLElement;
          if (target === ref.current || target.closest("[data-dialog-close]")) setOpen(false);
          // A confirm button submits the surrounding form; let the submit start, then close
          else if (target.closest("button[type=submit]")) setTimeout(() => setOpen(false));
        }}
        className={cn(
          "m-0 bg-transparent p-0 text-ink open:flex",
          side === "end"
            ? "ms-auto h-dvh max-h-dvh w-full max-w-md"
            : "fixed inset-0 h-full max-h-none w-full max-w-none items-center justify-center p-4",
        )}
      >
        {open && (
          <div
            className={cn(
              "flex w-full flex-col overflow-hidden bg-white shadow-xl shadow-ink/10",
              side === "end"
                ? "h-full animate-slide-in-end rtl:animate-slide-in-start"
                : cn("max-h-[85dvh] animate-scale-in rounded-xl", SIZES[size]),
            )}
          >
            <header className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
              <div className="min-w-0">
                <h2 className="font-semibold">{title}</h2>
                {description && <div className="mt-1 text-sm text-muted">{description}</div>}
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label={closeLabel}
                className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted outline-none hover:bg-paper hover:text-ink focus-visible:ring-3 focus-visible:ring-brand/25"
              >
                <Icon name="close" size={16} />
              </button>
            </header>
            {children && <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 text-sm">{children}</div>}
            {footer && (
              <footer className="flex flex-wrap justify-end gap-2 border-t border-line bg-paper/50 px-5 py-3">
                {footer}
              </footer>
            )}
          </div>
        )}
      </dialog>
    </>
  );
}
