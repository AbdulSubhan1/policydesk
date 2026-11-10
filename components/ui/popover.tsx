"use client";

import { useCallback, useId, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { useDismiss } from "./use-dismiss";

type Props = {
  trigger: React.ReactNode;
  children: React.ReactNode;
  align?: "start" | "end";
  /** Accessible name of the panel. */
  label: string;
  className?: string;
};

/** A small panel attached to a trigger, for extra details or a short form. Closes on outside click and Escape. */
export function Popover({ trigger, children, align = "start", label, className }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const id = useId();
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  useDismiss(ref, open, close);

  return (
    <div data-ui="Popover" ref={ref} className="relative inline-flex">
      <span className="contents" aria-expanded={open} aria-controls={id} onClick={() => setOpen((o) => !o)}>
        {trigger}
      </span>
      {open && (
        <div
          id={id}
          role="dialog"
          aria-label={label}
          className={cn(
            "absolute top-full z-40 mt-2 w-72 max-w-[calc(100vw-2rem)] animate-scale-in rounded-xl border border-line bg-white p-4 text-sm shadow-lg shadow-ink/10",
            align === "end" ? "end-0" : "start-0",
            className,
          )}
        >
          {children}
        </div>
      )}
    </div>
  );
}
