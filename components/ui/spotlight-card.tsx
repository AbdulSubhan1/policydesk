"use client";

import { useRef } from "react";
import { cn } from "@/lib/cn";
import { surface } from "./styles";

/**
 * A card with a soft glow that follows the pointer. Use sparingly, for one featured block on a page.
 * Sets --mx/--my from JavaScript like every effect (see MotionHighlight).
 */
export function SpotlightCard({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <div
      data-ui="SpotlightCard"
      ref={ref}
      onPointerMove={(e) => {
        const el = ref.current;
        if (!el) return;
        const box = el.getBoundingClientRect();
        el.style.setProperty("--mx", `${e.clientX - box.left}px`);
        el.style.setProperty("--my", `${e.clientY - box.top}px`);
      }}
      className={cn(surface, "group/spot relative overflow-hidden p-5", className)}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(260px_circle_at_var(--mx)_var(--my),rgb(14_124_102/0.12),transparent_70%)] opacity-0 transition-opacity duration-300 group-hover/spot:opacity-100"
      />
      <div className="relative">{children}</div>
    </div>
  );
}
