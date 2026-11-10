"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import { Icon } from "./icon";

/**
 * Stars from 1 to `count`. With `name` it's an input that submits with a form (arrow keys change it);
 * without `name` it only shows `value`.
 */
export function Rating({
  name,
  value = 0,
  count = 5,
  label,
}: {
  name?: string;
  value?: number;
  count?: number;
  label: string;
}) {
  const [chosen, setChosen] = useState(value);
  const [hover, setHover] = useState(0);
  const shown = hover || chosen;
  const stars = Array.from({ length: count }, (_, i) => i + 1);

  if (!name) {
    return (
      <span data-ui="Rating" role="img" aria-label={`${label}: ${value}/${count}`} className="inline-flex gap-0.5">
        {stars.map((n) => (
          <Icon key={n} name="star" size={18} className={n <= value ? "fill-warn text-warn" : "text-line"} />
        ))}
      </span>
    );
  }

  return (
    <span
      data-ui="Rating"
      role="slider"
      tabIndex={0}
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={count}
      aria-valuenow={chosen}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight" || e.key === "ArrowUp") setChosen((v) => Math.min(count, v + 1));
        if (e.key === "ArrowLeft" || e.key === "ArrowDown") setChosen((v) => Math.max(0, v - 1));
      }}
      onMouseLeave={() => setHover(0)}
      className="inline-flex gap-0.5 rounded-md outline-none focus-visible:ring-3 focus-visible:ring-brand/25"
    >
      <input type="hidden" name={name} value={chosen} />
      {stars.map((n) => (
        <button
          key={n}
          type="button"
          tabIndex={-1}
          aria-label={`${n}/${count}`}
          onMouseEnter={() => setHover(n)}
          onClick={() => setChosen(n)}
          className="p-0.5"
        >
          <Icon
            name="star"
            size={22}
            className={cn("transition-colors", n <= shown ? "fill-warn text-warn" : "text-line")}
          />
        </button>
      ))}
    </span>
  );
}
