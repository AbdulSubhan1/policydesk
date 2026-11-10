"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Icon } from "./icon";

type Props = {
  /** The form whose checkboxes select rows (DataTable with `select`). */
  form: string;
  /** Name of the row checkboxes. */
  name: string;
  /** Actions for the selection: buttons with form={form}, a DropdownMenu, an AlertDialog… */
  children: React.ReactNode;
};

/** Bulk actions that rise from the bottom while rows are selected and leave when the selection clears. */
// Every input of the form with this name, wherever it sits in the page (form.elements follows form="…")
const boxes = (form: HTMLFormElement, name: string) =>
  [...form.elements].filter((x): x is HTMLInputElement => x instanceof HTMLInputElement && x.name === name);

export function ActionBar({ form, name, children }: Props) {
  const t = useTranslations("common");
  const [count, setCount] = useState(0);

  useEffect(() => {
    const el = document.getElementById(form) as HTMLFormElement | null;
    if (!el) return;
    const update = () => setCount(boxes(el, name).filter((box) => box.checked).length);
    // Row checkboxes usually sit in the table, outside the form, so listen on the document
    const onChange = (e: Event) => {
      if ((e.target as HTMLInputElement).form === el) update();
    };
    const afterReset = () => setTimeout(update);
    update();
    document.addEventListener("change", onChange);
    el.addEventListener("reset", afterReset);
    return () => {
      document.removeEventListener("change", onChange);
      el.removeEventListener("reset", afterReset);
    };
  }, [form, name]);

  if (count === 0) return null;

  function clear() {
    const el = document.getElementById(form) as HTMLFormElement | null;
    if (el) boxes(el, name).forEach((box) => (box.checked = false));
    setCount(0);
  }

  return (
    <div
      data-ui="ActionBar"
      role="toolbar"
      aria-label={t("selected", { count })}
      className="fixed inset-x-0 bottom-4 z-40 mx-auto flex w-max max-w-[calc(100vw-2rem)] animate-slide-up items-center gap-1 rounded-xl border border-line bg-white p-1.5 shadow-xl shadow-ink/15"
    >
      <span
        className="grid h-8 min-w-8 place-items-center rounded-lg bg-paper px-2 text-sm font-semibold tabular-nums"
        aria-live="polite"
      >
        {count}
      </span>
      <span className="mx-1 h-5 w-px bg-line" aria-hidden />
      <div className="flex min-w-0 items-center gap-1">{children}</div>
      <span className="mx-1 h-5 w-px bg-line" aria-hidden />
      <button
        type="button"
        onClick={clear}
        aria-label={t("clearSelection")}
        className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted outline-none hover:bg-paper hover:text-ink focus-visible:ring-3 focus-visible:ring-brand/25"
      >
        <Icon name="close" size={16} />
      </button>
    </div>
  );
}
