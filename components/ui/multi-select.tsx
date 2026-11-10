"use client";

import { useTranslations } from "next-intl";
import { useCallback, useId, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import type { AutocompleteOption } from "./autocomplete";
import { Icon } from "./icon";
import { useDismiss } from "./use-dismiss";

type Props = {
  options: AutocompleteOption[];
  /** Each chosen value is submitted as its own hidden input with this name. */
  name?: string;
  defaultValue?: string[];
  onChange?: (values: string[]) => void;
  placeholder?: string;
  label: string;
};

/** Pick several values from a searchable list; choices show as removable tags. Backspace removes the last one. */
export function MultiSelect({ options, name, defaultValue = [], onChange, placeholder, label }: Props) {
  const t = useTranslations("common");
  const listId = useId();
  const ref = useRef<HTMLDivElement>(null);
  const [values, setValues] = useState(defaultValue);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  useDismiss(ref, open, close);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? options.filter((o) => `${o.label} ${o.group ?? ""}`.toLowerCase().includes(q)) : options;
  }, [options, query]);

  function update(next: string[]) {
    setValues(next);
    onChange?.(next);
  }
  const toggle = (value: string) =>
    update(values.includes(value) ? values.filter((v) => v !== value) : [...values, value]);

  return (
    <div data-ui="MultiSelect" ref={ref} className="relative min-w-0">
      {name && values.map((v) => <input key={v} type="hidden" name={name} value={v} />)}
      <div
        onClick={() => setOpen(true)}
        className="flex min-h-10 w-full flex-wrap items-center gap-1.5 rounded-lg border border-line bg-white px-2 py-1.5 text-sm shadow-xs shadow-ink/5 transition-colors focus-within:border-brand focus-within:ring-3 focus-within:ring-brand/15 hover:border-ink/25"
      >
        {values.map((v) => {
          const text = options.find((o) => o.value === v)?.label ?? v;
          return (
            <span
              key={v}
              className="inline-flex items-center gap-1 rounded-md bg-paper py-0.5 ps-2 pe-1 text-xs font-medium"
            >
              {text}
              <button
                type="button"
                aria-label={`${t("delete")} ${text}`}
                onClick={() => toggle(v)}
                className="rounded text-muted hover:text-ink"
              >
                <Icon name="close" size={12} />
              </button>
            </span>
          );
        })}
        <input
          role="combobox"
          aria-label={label}
          aria-expanded={open}
          aria-controls={listId}
          value={query}
          placeholder={values.length ? "" : (placeholder ?? t("select"))}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Backspace" && !query && values.length) update(values.slice(0, -1));
            if (e.key === "Enter" && matches[0]) {
              e.preventDefault();
              toggle(matches[0].value);
              setQuery("");
            }
          }}
          className="min-w-20 flex-1 bg-transparent px-1 outline-none placeholder:text-muted/70"
        />
      </div>
      {open && (
        <ul
          id={listId}
          role="listbox"
          aria-multiselectable
          className="absolute inset-x-0 top-full z-30 mt-1 max-h-64 animate-scale-in overflow-auto rounded-lg border border-line bg-white p-1 shadow-lg shadow-ink/5"
        >
          {matches.length === 0 && <li className="px-3 py-2 text-sm text-muted">{t("noMatches")}</li>}
          {matches.map((o) => {
            const on = values.includes(o.value);
            return (
              <li
                key={o.value}
                role="option"
                aria-selected={on}
                onMouseDown={(e) => {
                  e.preventDefault();
                  toggle(o.value);
                }}
                className={cn(
                  "flex cursor-pointer items-center justify-between gap-3 rounded-md px-3 py-2 text-sm hover:bg-paper",
                  on && "font-medium text-brand-strong",
                )}
              >
                <span className="min-w-0 truncate">{o.label}</span>
                {on && <Icon name="check" size={16} />}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
