import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { PageHeader, Panel } from "@/components/ui";
import { UI_GROUPS, UI_REGISTRY } from "@/components/ui/registry";

// Token names as defined in app/globals.css (@theme). Swatches use the real classes.
const COLORS = [
  { token: "ink", className: "bg-ink" },
  { token: "ink-soft", className: "bg-ink-soft" },
  { token: "muted", className: "bg-muted" },
  { token: "paper", className: "bg-paper" },
  { token: "line", className: "bg-line" },
  { token: "brand", className: "bg-brand" },
  { token: "brand-soft", className: "bg-brand-soft" },
  { token: "info", className: "bg-info" },
  { token: "warn", className: "bg-warn" },
  { token: "risk", className: "bg-risk" },
  { token: "plum", className: "bg-plum" },
];

export default async function DesignSystemPage() {
  const t = await getTranslations("designSystem");

  return (
    <>
      <PageHeader
        title={t("title")}
        description={`${t("description")} ${t("allComponents", { count: UI_REGISTRY.length, groups: UI_GROUPS.length })}`}
      />

      <h2 className="mb-3 font-semibold">{t("foundations")}</h2>
      <div className="mb-10 grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Panel title={t("colors")} description="app/globals.css">
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
            {COLORS.map((c) => (
              <div key={c.token} className="min-w-0">
                <div className={`h-10 rounded-md border border-line ${c.className}`} />
                <p className="mt-1 truncate font-mono text-xs text-ink-soft">{c.token}</p>
              </div>
            ))}
          </div>
        </Panel>
        <Panel title={t("typography")} description="Hanken Grotesk, IBM Plex Sans Arabic, IBM Plex Mono">
          <div className="grid gap-2">
            <p className="text-2xl font-semibold tracking-tight">{t("sampleHeading")}</p>
            <p className="text-sm text-ink-soft">{t("sampleBody")}</p>
            <p lang="ar" dir="rtl" className="text-sm text-ink-soft">
              تغطية شاملة للسيارة مع إصلاح لدى الوكالة
            </p>
            <p className="font-mono text-sm">PD-2026-00034</p>
          </div>
        </Panel>
      </div>

      <div className="grid gap-10">
        {UI_GROUPS.map((group) => {
          const entries = UI_REGISTRY.filter((c) => c.group === group);
          return (
            <section key={group} id={group} className="scroll-mt-6">
              <h2 className="mb-3 flex items-baseline gap-2 font-semibold">
                {group}
                <span className="text-sm font-normal text-muted tabular-nums">{entries.length}</span>
              </h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {entries.map((c) => (
                  <Link
                    key={c.name}
                    href={`/design-system/${c.name}`}
                    className="group min-w-0 rounded-lg border border-line bg-white p-4 transition-colors hover:border-brand/40 hover:shadow-sm"
                  >
                    <p className="font-medium group-hover:text-brand-strong">{c.name}</p>
                    <p className="mt-1 line-clamp-2 text-sm text-muted">{c.description}</p>
                  </Link>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}
