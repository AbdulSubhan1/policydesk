"use client";

import { useTranslations } from "next-intl";
import { useId, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { Icon } from "./icon";
import { control } from "./styles";

export type AutocompleteOption = { value: string; label: string; group?: string; hint?: string };

type Props = {
  options: AutocompleteOption[];
  /** Submitted with plain forms through a hidden input. */
  name?: string;
  value?: string | number | null;
  defaultValue?: string | number | null;
  onChange?: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  disabled?: boolean;
  invalid?: boolean;
  id?: string;
  /** Lets React Hook Form focus the field when it has an error. */
  ref?: React.Ref<HTMLInputElement>;
  "aria-label"?: string;
  className?: string;
};

/**
 * Searchable dropdown used for every choice in the app. Type to filter, arrows to move, Enter to pick, Esc to close.
 * Works controlled (React Hook Form Controller) or uncontrolled inside a plain server-action form.
 */
export function Autocomplete({
  options,
  name,
  value,
  defaultValue,
  onChange,
  onBlur,
  placeholder,
  disabled,
  invalid,
  id,
  ref,
  className,
  ...aria
}: Props) {
  const t = useTranslations("common");
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [inner, setInner] = useState(defaultValue == null ? "" : String(defaultValue));
  const selected = value === undefined ? inner : value == null ? "" : String(value);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);

  const selectedOption = options.find((o) => o.value === selected);
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? options.filter((o) => `${o.label} ${o.group ?? ""} ${o.hint ?? ""}`.toLowerCase().includes(q)) : options;
  }, [options, query]);

  function openList() {
    if (disabled) return;
    setQuery("");
    setActive(
      Math.max(
        0,
        options.findIndex((o) => o.value === selected),
      ),
    );
    setOpen(true);
  }

  function choose(option: AutocompleteOption) {
    setInner(option.value);
    onChange?.(option.value);
    setOpen(false);
    inputRef.current?.focus();
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open && (e.key === "ArrowDown" || e.key === "Enter")) {
      e.preventDefault();
      openList();
    } else if (open && e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, matches.length - 1));
    } else if (open && e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (open && e.key === "Enter") {
      e.preventDefault();
      if (matches[active]) choose(matches[active]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div data-ui="Autocomplete" className={cn("relative min-w-0", className)}>
      {name && <input type="hidden" name={name} value={selected} />}
      <input
        ref={(node) => {
          inputRef.current = node;
          if (typeof ref === "function") ref(node);
          else if (ref) ref.current = node;
        }}
        id={id}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={open && matches[active] ? `${listId}-${active}` : undefined}
        aria-invalid={invalid || undefined}
        aria-label={aria["aria-label"]}
        autoComplete="off"
        disabled={disabled}
        placeholder={selectedOption?.label ?? placeholder ?? t("select")}
        value={open ? query : (selectedOption?.label ?? "")}
        onChange={(e) => {
          setQuery(e.target.value);
          setActive(0);
          if (!open) setOpen(true);
        }}
        onFocus={openList}
        onClick={() => !open && openList()}
        onKeyDown={onKeyDown}
        onBlur={() => {
          setOpen(false);
          onBlur?.();
        }}
        className={cn(control, "cursor-pointer pe-9", open && "cursor-text", invalid && "border-risk")}
      />
      <Icon
        name="chevronDown"
        size={16}
        className={cn(
          "pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-muted transition-transform",
          open && "rotate-180",
        )}
      />

      {open && (
        <ul
          id={listId}
          role="listbox"
          className="absolute inset-x-0 top-full z-30 mt-1 max-h-64 overflow-auto rounded-lg border border-line bg-white p-1 shadow-lg shadow-ink/5"
        >
          {matches.length === 0 && <li className="px-3 py-2 text-sm text-muted">{t("noMatches")}</li>}
          {matches.map((option, i) => (
            <li key={option.value} className="contents">
              {option.group && option.group !== matches[i - 1]?.group && (
                <span className="block px-3 pt-2 pb-1 text-xs font-medium text-muted">{option.group}</span>
              )}
              <span
                id={`${listId}-${i}`}
                role="option"
                aria-selected={option.value === selected}
                // mousedown keeps focus in the input so blur doesn't close the list before the click lands
                onMouseDown={(e) => {
                  e.preventDefault();
                  choose(option);
                }}
                // Inside a <label> (Field) a click would otherwise re-open the list through the label
                onClick={(e) => e.preventDefault()}
                onMouseEnter={() => setActive(i)}
                className={cn(
                  "flex cursor-pointer items-center justify-between gap-3 rounded-md px-3 py-2 text-sm",
                  i === active ? "bg-paper" : "",
                  option.value === selected ? "font-medium text-brand-strong" : "text-ink",
                )}
              >
                <span className="min-w-0">
                  <span className="block truncate">{option.label}</span>
                  {option.hint && <span className="block truncate text-xs font-normal text-muted">{option.hint}</span>}
                </span>
                {option.value === selected && <Icon name="check" size={16} className="shrink-0" />}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
