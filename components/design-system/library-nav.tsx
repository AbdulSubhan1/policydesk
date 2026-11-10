"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Icon, Input, MotionHighlight } from "@/components/ui";
import { UI_GROUPS, UI_REGISTRY } from "@/components/ui/registry";

const ROOT = "/design-system";

/** The library's side navigation: search, then every component under its category with a count. */
export function LibraryNav() {
  const t = useTranslations("designSystem");
  const pathname = usePathname();
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const groups = UI_GROUPS.map((group) => ({
    group,
    entries: UI_REGISTRY.filter((c) => c.group === group && (!q || c.name.toLowerCase().includes(q))),
  })).filter((g) => g.entries.length > 0);

  return (
    <nav aria-label={t("title")} className="grid gap-4">
      <div className="relative">
        <Icon
          name="search"
          size={15}
          className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-muted"
        />
        <Input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("searchComponents")}
          aria-label={t("searchComponents")}
          className="ps-8"
        />
      </div>
      <Link
        href={ROOT}
        aria-current={pathname === ROOT ? "page" : undefined}
        className="rounded-md px-3 py-1.5 text-sm font-medium text-ink-soft hover:text-ink aria-[current]:bg-white aria-[current]:text-ink"
      >
        {t("overview")}
      </Link>
      {groups.length === 0 && <p className="px-3 text-sm text-muted">{t("noResults")}</p>}
      {groups.map(({ group, entries }) => (
        <div key={group} className="grid gap-0.5">
          <p className="flex items-center justify-between px-3 pb-1 text-xs font-medium text-muted">
            {group}
            <span className="tabular-nums">{entries.length}</span>
          </p>
          <MotionHighlight tone="white" className="grid gap-0.5">
            {entries.map((c) => {
              const href = `${ROOT}/${c.name}`;
              return (
                <Link
                  key={c.name}
                  href={href}
                  aria-current={pathname === href ? "page" : undefined}
                  className="truncate rounded-md px-3 py-1.5 text-sm text-ink-soft hover:text-ink aria-[current]:font-medium aria-[current]:text-brand-strong"
                >
                  {c.name}
                </Link>
              );
            })}
          </MotionHighlight>
        </div>
      ))}
    </nav>
  );
}
