"use client";

import { useRef, useState } from "react";
import { cn } from "@/lib/cn";

/**
 * A one-time code in separate boxes. Typing moves forward, Backspace moves back, and pasting a whole code fills
 * every box. The joined code submits under `name`.
 */
export function OtpInput({
  name,
  length = 6,
  label,
  onComplete,
}: {
  name: string;
  length?: number;
  label: string;
  onComplete?: (code: string) => void;
}) {
  const [digits, setDigits] = useState<string[]>(Array(length).fill(""));
  const boxes = useRef<(HTMLInputElement | null)[]>([]);

  function set(next: string[]) {
    setDigits(next);
    if (next.every(Boolean)) onComplete?.(next.join(""));
  }

  return (
    <div data-ui="OtpInput" role="group" aria-label={label} className="flex gap-2" dir="ltr">
      <input type="hidden" name={name} value={digits.join("")} />
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(node) => {
            boxes.current[i] = node;
          }}
          value={d}
          inputMode="numeric"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          maxLength={1}
          aria-label={`${label} ${i + 1}`}
          onChange={(e) => {
            const v = e.target.value.replace(/\D/g, "").slice(-1);
            const next = [...digits];
            next[i] = v;
            set(next);
            if (v) boxes.current[i + 1]?.focus();
          }}
          onKeyDown={(e) => {
            if (e.key === "Backspace" && !digits[i]) boxes.current[i - 1]?.focus();
          }}
          onPaste={(e) => {
            const code = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
            if (!code) return;
            e.preventDefault();
            set(Array.from({ length }, (_, k) => code[k] ?? ""));
            boxes.current[Math.min(code.length, length - 1)]?.focus();
          }}
          className={cn(
            "h-12 w-11 rounded-lg border border-line bg-white text-center text-lg font-semibold tabular-nums transition-colors outline-none focus:border-brand focus:ring-3 focus:ring-brand/15",
            d && "border-ink/30",
          )}
        />
      ))}
    </div>
  );
}
