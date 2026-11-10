"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/cn";

// The highlight colour for the surface it sits on
const TONES = { paper: "bg-paper", white: "bg-white shadow-xs shadow-ink/5", dark: "bg-white/10" } as const;

/**
 * One soft background that glides to whichever child is hovered or focused, and rests on the active child
 * (aria-current, aria-selected or data-active). Wrap a row or column of links, tabs or cards with it.
 *
 * Effects are the one place that sets CSS variables from JavaScript (never a style attribute): the
 * highlight's position, size and radius are --hl-x/--hl-y/--hl-w/--hl-h/--hl-r, read by the classes below.
 */
export function MotionHighlight({
  children,
  tone = "paper",
  className,
}: {
  children: React.ReactNode;
  tone?: keyof typeof TONES;
  className?: string;
}) {
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const childOf = (node: EventTarget | null) => {
      let n = node as HTMLElement | null;
      while (n && n.parentElement !== el) n = n.parentElement;
      return n && n.dataset.highlight === undefined ? n : null;
    };
    const moveTo = (target: HTMLElement | null) => {
      el.dataset.visible = target ? "true" : "false";
      if (!target) return;
      el.style.setProperty("--hl-x", `${target.offsetLeft}px`);
      el.style.setProperty("--hl-y", `${target.offsetTop}px`);
      el.style.setProperty("--hl-w", `${target.offsetWidth}px`);
      el.style.setProperty("--hl-h", `${target.offsetHeight}px`);
      el.style.setProperty("--hl-r", getComputedStyle(target).borderRadius);
    };
    const active = () =>
      el.querySelector<HTMLElement>(":scope > [aria-current], :scope > [aria-selected='true'], :scope > [data-active]");
    const rest = () => moveTo(active());
    const over = (e: Event) => {
      const target = childOf(e.target);
      if (target) moveTo(target);
    };

    // Place it without animating, then animate every later move
    rest();
    const frame = requestAnimationFrame(() => (el.dataset.animate = "true"));
    el.addEventListener("pointerover", over);
    el.addEventListener("focusin", over);
    el.addEventListener("pointerleave", rest);
    el.addEventListener("focusout", rest);
    window.addEventListener("resize", rest);
    return () => {
      cancelAnimationFrame(frame);
      el.removeEventListener("pointerover", over);
      el.removeEventListener("focusin", over);
      el.removeEventListener("pointerleave", rest);
      el.removeEventListener("focusout", rest);
      window.removeEventListener("resize", rest);
    };
  }, [children]);

  return (
    <div
      data-ui="MotionHighlight"
      ref={box}
      data-visible="false"
      className={cn("group/hl relative isolate", className)}
    >
      <span
        aria-hidden
        data-highlight
        className={cn(
          "pointer-events-none absolute top-0 left-0 -z-10 h-(--hl-h) w-(--hl-w) translate-x-(--hl-x) translate-y-(--hl-y) rounded-(--hl-r) opacity-0 duration-300 ease-out group-data-[animate=true]/hl:transition-all group-data-[visible=true]/hl:opacity-100 motion-reduce:transition-none",
          TONES[tone],
        )}
      />
      {children}
    </div>
  );
}
