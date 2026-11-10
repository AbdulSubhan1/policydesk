"use client";

import { useTranslations } from "next-intl";
import { useRef } from "react";
import { cn } from "@/lib/cn";
import { Icon } from "./icon";
import { control } from "./styles";

type Props = Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> & { step?: number };

/** A number with − and + buttons and arrow-key steps. Works with React Hook Form register(). */
export function NumberInput({ step = 1, className, ref, ...props }: Props & { ref?: React.Ref<HTMLInputElement> }) {
  const t = useTranslations("common");
  const inner = useRef<HTMLInputElement | null>(null);

  // stepUp/stepDown respect min, max and step; the input event lets React Hook Form see the change
  function nudge(direction: 1 | -1) {
    const input = inner.current;
    if (!input) return;
    if (direction > 0) input.stepUp();
    else input.stepDown();
    input.dispatchEvent(new Event("input", { bubbles: true }));
  }

  const buttonClass =
    "grid h-full w-9 shrink-0 place-items-center text-muted outline-none hover:bg-paper hover:text-ink focus-visible:bg-paper disabled:opacity-40";

  // The input comes first in the DOM so a wrapping <label> (Field) labels it, not the − button
  return (
    <span data-ui="NumberInput" className="flex min-w-0">
      <input
        ref={(node) => {
          inner.current = node;
          if (typeof ref === "function") ref(node);
          else if (ref) ref.current = node;
        }}
        type="number"
        inputMode="decimal"
        step={step}
        className={cn(
          control,
          "[appearance:textfield] rounded-none text-center tabular-nums [&::-webkit-inner-spin-button]:appearance-none",
          className,
        )}
        {...props}
      />
      <button
        type="button"
        aria-label={t("decrease")}
        onClick={() => nudge(-1)}
        disabled={props.disabled}
        className={cn(buttonClass, "order-first rounded-s-lg border border-e-0 border-line")}
      >
        <Icon name="minus" size={15} />
      </button>
      <button
        type="button"
        aria-label={t("increase")}
        onClick={() => nudge(1)}
        disabled={props.disabled}
        className={cn(buttonClass, "rounded-e-lg border border-s-0 border-line")}
      >
        <Icon name="plus" size={15} />
      </button>
    </span>
  );
}
