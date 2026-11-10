"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { Icon, type IconName } from "./icon";
import { useDismiss } from "./use-dismiss";

export type MenuItem =
  | { type: "separator" }
  | { type: "label"; label: string }
  | {
      type?: "item";
      label: string;
      icon?: IconName;
      shortcut?: string;
      danger?: boolean;
      disabled?: boolean;
      /** Navigate. */
      href?: string;
      /** Submit a <form> on the page by its id, e.g. a server action; name/value are sent with it. */
      form?: string;
      name?: string;
      value?: string;
      /** Run client code. */
      onSelect?: () => void;
      /** Opens a submenu to the side. */
      items?: MenuItem[];
      /** Shows a check mark, for toggles and radio-like choices. */
      checked?: boolean;
    };

const ROW =
  "flex w-full cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-1.5 text-start text-sm outline-none select-none focus-visible:bg-paper hover:bg-paper disabled:pointer-events-none disabled:opacity-50";

/** A list of actions behind a button: icons, shortcuts, checks, separators, labels and submenus. Arrow keys move. */
export function DropdownMenu({
  trigger,
  items,
  align = "start",
  side = "bottom",
  label,
}: {
  trigger: React.ReactNode;
  items: MenuItem[];
  align?: "start" | "end";
  /** "top" opens upwards, e.g. from the ActionBar at the bottom of the screen. */
  side?: "top" | "bottom";
  label: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  useDismiss(ref, open, close);

  return (
    <div data-ui="DropdownMenu" ref={ref} className="relative inline-flex">
      <span className="contents" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        {trigger}
      </span>
      {open && (
        <MenuList
          items={items}
          label={label}
          onDone={close}
          className={cn(
            side === "top" ? "bottom-full mb-1.5" : "top-full mt-1.5",
            align === "end" ? "end-0" : "start-0",
          )}
        />
      )}
    </div>
  );
}

// Internal: one level of the menu. Submenus render another MenuList beside their row.
function MenuList({
  items,
  label,
  onDone,
  className,
}: {
  items: MenuItem[];
  label: string;
  onDone: () => void;
  className: string;
}) {
  const listId = useId();
  const listRef = useRef<HTMLDivElement>(null);
  const [sub, setSub] = useState<number | null>(null);

  // Focus the first row once when the menu opens, so the arrow keys work straight away
  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>("[role^=menuitem]")?.focus({ preventScroll: true });
  }, []);

  function onKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    const rows = [
      ...e.currentTarget.querySelectorAll<HTMLElement>(
        ":scope > [role^=menuitem]:not([aria-disabled=true]), :scope > div > [role=menuitem]",
      ),
    ];
    const i = rows.indexOf(document.activeElement as HTMLElement);
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      rows[(i + (e.key === "ArrowDown" ? 1 : -1) + rows.length) % rows.length]?.focus();
    }
  }

  return (
    <div
      role="menu"
      aria-label={label}
      id={listId}
      onKeyDown={onKeyDown}
      ref={listRef}
      className={cn(
        "absolute z-50 grid w-56 animate-scale-in rounded-xl border border-line bg-white p-1 shadow-lg shadow-ink/10",
        className,
      )}
    >
      {items.map((item, i) => {
        if (item.type === "separator") return <hr key={i} className="my-1 border-line" />;
        if (item.type === "label")
          return (
            <p key={i} className="px-2.5 pt-1.5 pb-1 text-xs font-medium text-muted">
              {item.label}
            </p>
          );

        const content = (
          <>
            <span className="grid w-4 shrink-0 place-items-center">
              {item.checked ? <Icon name="check" size={15} /> : item.icon && <Icon name={item.icon} size={16} />}
            </span>
            <span className="min-w-0 flex-1 truncate">{item.label}</span>
            {item.shortcut && <kbd className="font-mono text-xs text-muted">{item.shortcut}</kbd>}
            {item.items && <Icon name="chevronEnd" size={14} className="text-muted rtl:rotate-180" />}
          </>
        );
        const className = cn(ROW, item.danger ? "text-risk hover:bg-risk-soft focus-visible:bg-risk-soft" : "text-ink");
        const role = item.checked === undefined ? "menuitem" : "menuitemcheckbox";

        if (item.items) {
          return (
            <div key={i} className="relative" onMouseEnter={() => setSub(i)} onMouseLeave={() => setSub(null)}>
              <button
                type="button"
                role="menuitem"
                aria-haspopup="menu"
                aria-expanded={sub === i}
                className={className}
                onClick={() => setSub(sub === i ? null : i)}
                onKeyDown={(e) => e.key === "ArrowRight" && setSub(i)}
              >
                {content}
              </button>
              {sub === i && (
                <MenuList items={item.items} label={item.label} onDone={onDone} className="start-full top-0 -ms-1" />
              )}
            </div>
          );
        }
        if (item.href) {
          return (
            <Link key={i} href={item.href} role={role} className={className} onClick={onDone}>
              {content}
            </Link>
          );
        }
        return (
          <button
            key={i}
            type={item.form ? "submit" : "button"}
            form={item.form}
            name={item.name}
            value={item.value}
            role={role}
            aria-checked={item.checked}
            aria-disabled={item.disabled}
            disabled={item.disabled}
            className={className}
            onClick={() => {
              item.onSelect?.();
              // Close after the click finishes, so a submit button is still in the page when its form submits
              setTimeout(onDone);
            }}
          >
            {content}
          </button>
        );
      })}
    </div>
  );
}
