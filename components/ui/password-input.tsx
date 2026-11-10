"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { cn } from "@/lib/cn";
import { Icon } from "./icon";
import { control } from "./styles";

/** A password field with a button to show what was typed. Works with React Hook Form register(). */
export function PasswordInput({ className, ...props }: Omit<React.InputHTMLAttributes<HTMLInputElement>, "type">) {
  const t = useTranslations("common");
  const [visible, setVisible] = useState(false);
  return (
    <span data-ui="PasswordInput" className="relative block min-w-0">
      <input type={visible ? "text" : "password"} className={cn(control, "pe-10", className)} {...props} />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? t("hide") : t("show")}
        aria-pressed={visible}
        className="absolute end-1 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-md text-muted outline-none hover:text-ink focus-visible:ring-3 focus-visible:ring-brand/25"
      >
        <Icon name={visible ? "eyeOff" : "eye"} size={17} />
      </button>
    </span>
  );
}
