"use client";

import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { Icon } from "./icon";
import { control } from "./styles";
import { useDismiss } from "./use-dismiss";

type Props = {
  /** Submits the chosen day as YYYY-MM-DD under this name. */
  name?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  /** YYYY-MM-DD bounds; days outside them can't be picked. */
  min?: string;
  max?: string;
  placeholder?: string;
  invalid?: boolean;
  disabled?: boolean;
  label?: string;
};

// Dates are kept as local calendar days ("2026-11-24"), never as UTC instants, so no day shifts by timezone
function toIso(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function fromIso(iso?: string) {
  if (!iso) return undefined;
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const addMonths = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth() + n, Math.min(d.getDate(), 28));

/**
 * A calendar in a popover. Arrow keys move by day and week, Page Up/Down by month, Enter picks.
 * Click the month title to jump between years (handy for dates of birth).
 */
export function DatePicker({
  name,
  value,
  defaultValue,
  onChange,
  min,
  max,
  placeholder,
  invalid,
  disabled,
  label,
}: Props) {
  const t = useTranslations("common");
  const locale = useLocale();
  const ref = useRef<HTMLDivElement>(null);
  const grid = useRef<HTMLDivElement>(null);
  const [inner, setInner] = useState(defaultValue ?? "");
  const current = value ?? inner;
  const [open, setOpen] = useState(false);
  const [years, setYears] = useState(false);
  const [cursor, setCursor] = useState(() => fromIso(current) ?? new Date());
  const close = useCallback(() => setOpen(false), []);
  useDismiss(ref, open, close);

  const intl = locale === "ar" ? "ar-AE" : "en-GB";
  const outOfRange = (iso: string) => (min !== undefined && iso < min) || (max !== undefined && iso > max);

  useEffect(() => {
    if (open && !years) grid.current?.querySelector<HTMLElement>(`[data-day="${toIso(cursor)}"]`)?.focus();
  }, [open, years, cursor]);

  function pick(day: Date) {
    const iso = toIso(day);
    if (outOfRange(iso)) return;
    setInner(iso);
    onChange?.(iso);
    setOpen(false);
  }

  // Monday-first grid: blanks before the 1st, then every day of the month
  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const lead = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => new Date(cursor.getFullYear(), cursor.getMonth(), i + 1));
  const weekdays = Array.from({ length: 7 }, (_, i) =>
    new Intl.DateTimeFormat(intl, { weekday: "narrow" }).format(new Date(2024, 0, 1 + i)),
  );
  const yearStart = cursor.getFullYear() - (cursor.getFullYear() % 12);
  const today = toIso(new Date());
  const chosen = fromIso(current);

  const navButton =
    "grid h-8 w-8 place-items-center rounded-md text-ink-soft outline-none hover:bg-paper focus-visible:ring-3 focus-visible:ring-brand/25";

  return (
    <div data-ui="DatePicker" ref={ref} className="relative min-w-0">
      {name && <input type="hidden" name={name} value={current} />}
      <button
        type="button"
        disabled={disabled}
        aria-label={label}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => {
          setCursor(chosen ?? new Date());
          setYears(false);
          setOpen((o) => !o);
        }}
        className={cn(control, "flex items-center justify-between gap-2 text-start", invalid && "border-risk")}
      >
        <span className={cn("truncate", !chosen && "text-muted/70")}>
          {chosen
            ? new Intl.DateTimeFormat(intl, { day: "numeric", month: "short", year: "numeric" }).format(chosen)
            : (placeholder ?? t("pickDate"))}
        </span>
        <Icon name="calendar" size={16} className="shrink-0 text-muted" />
      </button>

      {open && (
        <div
          role="dialog"
          aria-label={label}
          className="absolute start-0 top-full z-30 mt-1 w-72 animate-scale-in rounded-lg border border-line bg-white p-3 shadow-lg shadow-ink/5"
        >
          <div className="mb-2 flex items-center justify-between gap-2">
            <button
              type="button"
              aria-label={t("previous")}
              onClick={() =>
                setCursor((c) => (years ? new Date(c.getFullYear() - 12, c.getMonth(), 1) : addMonths(c, -1)))
              }
              className={navButton}
            >
              <Icon name="chevronStart" size={16} className="rtl:rotate-180" />
            </button>
            <button
              type="button"
              aria-live="polite"
              onClick={() => setYears((y) => !y)}
              className="rounded-md px-2 py-1 text-sm font-semibold outline-none hover:bg-paper focus-visible:ring-3 focus-visible:ring-brand/25"
            >
              {years
                ? `${yearStart} – ${yearStart + 11}`
                : new Intl.DateTimeFormat(intl, { month: "long", year: "numeric" }).format(cursor)}
            </button>
            <button
              type="button"
              aria-label={t("next")}
              onClick={() =>
                setCursor((c) => (years ? new Date(c.getFullYear() + 12, c.getMonth(), 1) : addMonths(c, 1)))
              }
              className={navButton}
            >
              <Icon name="chevronEnd" size={16} className="rtl:rotate-180" />
            </button>
          </div>

          {years ? (
            <div className="grid grid-cols-3 gap-1">
              {Array.from({ length: 12 }, (_, i) => yearStart + i).map((y) => (
                <button
                  key={y}
                  type="button"
                  onClick={() => {
                    setCursor((c) => new Date(y, c.getMonth(), 1));
                    setYears(false);
                  }}
                  className={cn(
                    "h-9 rounded-md text-sm tabular-nums outline-none hover:bg-paper focus-visible:ring-3 focus-visible:ring-brand/25",
                    y === cursor.getFullYear() && "bg-brand font-semibold text-white hover:bg-brand-strong",
                  )}
                >
                  {y}
                </button>
              ))}
            </div>
          ) : (
            <div
              ref={grid}
              role="grid"
              onKeyDown={(e) => {
                const moves: Record<string, Date> = {
                  ArrowLeft: addDays(cursor, locale === "ar" ? 1 : -1),
                  ArrowRight: addDays(cursor, locale === "ar" ? -1 : 1),
                  ArrowUp: addDays(cursor, -7),
                  ArrowDown: addDays(cursor, 7),
                  PageUp: addMonths(cursor, -1),
                  PageDown: addMonths(cursor, 1),
                };
                if (moves[e.key]) {
                  e.preventDefault();
                  setCursor(moves[e.key]);
                }
              }}
              className="grid grid-cols-7 gap-0.5 text-center"
            >
              {weekdays.map((d, i) => (
                <span key={i} className="py-1 text-xs font-medium text-muted">
                  {d}
                </span>
              ))}
              {Array.from({ length: lead }, (_, i) => (
                <span key={`blank-${i}`} />
              ))}
              {days.map((day) => {
                const iso = toIso(day);
                const isChosen = iso === current;
                return (
                  <button
                    key={iso}
                    type="button"
                    data-day={iso}
                    tabIndex={iso === toIso(cursor) ? 0 : -1}
                    disabled={outOfRange(iso)}
                    aria-pressed={isChosen}
                    aria-current={iso === today ? "date" : undefined}
                    onClick={() => pick(day)}
                    className={cn(
                      "h-9 rounded-md text-sm tabular-nums outline-none hover:bg-paper focus-visible:ring-3 focus-visible:ring-brand/25 disabled:pointer-events-none disabled:text-line",
                      iso === today && "font-semibold text-brand-strong",
                      isChosen && "bg-brand font-semibold text-white hover:bg-brand-strong",
                    )}
                  >
                    {day.getDate()}
                  </button>
                );
              })}
            </div>
          )}

          <div className="mt-2 flex justify-end border-t border-line pt-2">
            <button
              type="button"
              onClick={() => pick(new Date())}
              className="rounded-md px-2 py-1 text-xs font-medium text-brand-strong outline-none hover:bg-brand-soft focus-visible:ring-3 focus-visible:ring-brand/25"
            >
              {t("today")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
