"use client";

import { useEffect, useRef, useState } from "react";
import { money } from "@/lib/format";

const FORMATS = {
  number: (n: number) => Math.round(n).toLocaleString("en-US"),
  money: (n: number) => money(Math.round(n)),
  percent: (n: number) => `${Math.round(n)}%`,
};

/**
 * Counts up to `value` the first time it scrolls into view (about 1s, easing out). Shows the final number
 * straight away for reduced motion and before JavaScript runs.
 */
export function NumberTicker({ value, format = "number" }: { value: number; format?: keyof typeof FORMATS }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [shown, setShown] = useState(value);

  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let frame = 0;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      observer.disconnect();
      const start = performance.now();
      const tick = (now: number) => {
        const p = Math.min(1, (now - start) / 1000);
        setShown(value * (1 - (1 - p) ** 3));
        if (p < 1) frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    });
    observer.observe(el);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [value]);

  return (
    <span data-ui="NumberTicker" ref={ref} className="tabular-nums">
      {FORMATS[format](shown)}
    </span>
  );
}
